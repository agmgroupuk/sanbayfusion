/**
 * AI & ML TOOLS (5 tools)
 * llm_chat, llm_embed, llm_finetune, ml_train, ml_predict
 * 
 * Multi-provider LLM support: OpenAI, Anthropic, Groq, Google
 * All state persisted in PostgreSQL — NO localStorage
 */

import OpenAI from 'openai';

const PROVIDERS = {
    openai: () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    groq: () => new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }),
};

function getClient(provider = 'openai') {
    const factory = PROVIDERS[provider];
    if (!factory) throw new Error(`Unsupported provider: ${provider}. Use: openai, groq`);
    return factory();
}

// ── llm_chat ────────────────────────────────────────────────────
async function llmChat(params) {
    const {
        provider = 'openai',
        model,
        messages = [],
        prompt,
        system,
        temperature = 0.7,
        maxTokens = 2048,
        stream = false,
        json = false,
        ...opts
    } = params;

    try {
        // Build messages array
        const chatMessages = [];
        if (system) chatMessages.push({ role: 'system', content: system });
        if (messages.length > 0) {
            chatMessages.push(...messages);
        } else if (prompt) {
            chatMessages.push({ role: 'user', content: prompt });
        }

        if (chatMessages.length === 0) return { success: false, error: 'messages or prompt required' };

        if (provider === 'anthropic') {
            // Direct Anthropic API call
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) return { success: false, error: 'ANTHROPIC_API_KEY not set' };

            const body = {
                model: model || 'claude-sonnet-4-20250514',
                max_tokens: maxTokens,
                messages: chatMessages.filter(m => m.role !== 'system'),
            };
            if (system || chatMessages.find(m => m.role === 'system')) {
                body.system = system || chatMessages.find(m => m.role === 'system')?.content;
            }

            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.error) return { success: false, error: data.error.message };

            return {
                success: true,
                provider: 'anthropic',
                model: data.model,
                content: data.content?.[0]?.text || '',
                usage: { inputTokens: data.usage?.input_tokens, outputTokens: data.usage?.output_tokens },
                stopReason: data.stop_reason,
            };
        }

        if (provider === 'google') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) return { success: false, error: 'GEMINI_API_KEY not set' };

            const geminiModel = model || 'gemini-2.0-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
            const contents = chatMessages
                .filter(m => m.role !== 'system')
                .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

            const body = { contents };
            if (system) body.systemInstruction = { parts: [{ text: system }] };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.error) return { success: false, error: data.error.message };

            return {
                success: true,
                provider: 'google',
                model: geminiModel,
                content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
                usage: { totalTokens: data.usageMetadata?.totalTokenCount },
            };
        }

        // OpenAI-compatible providers (openai, groq)
        const client = getClient(provider);
        const reqModel = model || (provider === 'groq' ? 'llama-3.1-70b-versatile' : 'gpt-4o-mini');

        const completion = await client.chat.completions.create({
            model: reqModel,
            messages: chatMessages,
            temperature,
            max_tokens: maxTokens,
            ...(json ? { response_format: { type: 'json_object' } } : {}),
        });

        const choice = completion.choices?.[0];
        return {
            success: true,
            provider,
            model: completion.model,
            content: choice?.message?.content || '',
            finishReason: choice?.finish_reason,
            usage: completion.usage ? {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
                totalTokens: completion.usage.total_tokens,
            } : undefined,
        };
    } catch (err) {
        return { success: false, error: err.message, provider };
    }
}

// ── llm_embed ───────────────────────────────────────────────────
async function llmEmbed(params) {
    const { text, texts, model = 'text-embedding-3-small', provider = 'openai' } = params;
    const input = texts || (text ? [text] : null);
    if (!input || input.length === 0) return { success: false, error: 'text or texts required' };

    try {
        const client = getClient(provider);
        const res = await client.embeddings.create({ model, input });
        return {
            success: true,
            embeddings: res.data.map(d => d.embedding),
            model: res.model,
            dimensions: res.data[0]?.embedding?.length || 0,
            usage: res.usage ? { totalTokens: res.usage.total_tokens } : undefined,
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── llm_finetune ────────────────────────────────────────────────
async function llmFinetune(params) {
    const { action = 'create', ...opts } = params;

    try {
        const client = getClient('openai');

        switch (action) {
            case 'create': {
                const { trainingFile, model = 'gpt-4o-mini-2024-07-18', hyperparams = {} } = opts;
                if (!trainingFile) return { success: false, error: 'trainingFile (file ID) required' };
                const job = await client.fineTuning.jobs.create({
                    training_file: trainingFile,
                    model,
                    hyperparameters: hyperparams,
                });
                return { success: true, job: { id: job.id, model: job.model, status: job.status } };
            }

            case 'list': {
                const jobs = await client.fineTuning.jobs.list({ limit: opts.limit || 10 });
                return { success: true, jobs: jobs.data.map(j => ({ id: j.id, model: j.model, status: j.status, fineTunedModel: j.fine_tuned_model })) };
            }

            case 'status': {
                if (!opts.jobId) return { success: false, error: 'jobId required' };
                const job = await client.fineTuning.jobs.retrieve(opts.jobId);
                return { success: true, job: { id: job.id, model: job.model, status: job.status, fineTunedModel: job.fine_tuned_model, trainedTokens: job.trained_tokens } };
            }

            case 'cancel': {
                if (!opts.jobId) return { success: false, error: 'jobId required' };
                const job = await client.fineTuning.jobs.cancel(opts.jobId);
                return { success: true, job: { id: job.id, status: job.status } };
            }

            case 'upload': {
                const { data, purpose = 'fine-tune' } = opts;
                if (!data) return { success: false, error: 'data (JSONL array) required' };
                const jsonl = Array.isArray(data) ? data.map(d => JSON.stringify(d)).join('\n') : data;
                const blob = new Blob([jsonl], { type: 'application/jsonl' });
                const file = await client.files.create({ file: blob, purpose });
                return { success: true, file: { id: file.id, filename: file.filename, bytes: file.bytes } };
            }

            default:
                return { success: false, error: `Unknown llm_finetune action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── ml_train ────────────────────────────────────────────────────
async function mlTrain(params) {
    const { action = 'regression', data, target, features, ...opts } = params;

    try {
        if (!data || !Array.isArray(data)) return { success: false, error: 'data array required' };

        switch (action) {
            case 'regression': {
                // Simple linear regression
                if (!target || !features || features.length === 0) return { success: false, error: 'target and features required' };
                const feature = features[0]; // Simple single-feature regression
                const xs = data.map(d => d[feature]).filter(v => v != null);
                const ys = data.map(d => d[target]).filter(v => v != null);
                const n = Math.min(xs.length, ys.length);
                const sumX = xs.slice(0, n).reduce((a, b) => a + b, 0);
                const sumY = ys.slice(0, n).reduce((a, b) => a + b, 0);
                const sumXY = xs.slice(0, n).reduce((s, x, i) => s + x * ys[i], 0);
                const sumX2 = xs.slice(0, n).reduce((s, x) => s + x * x, 0);
                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
                const intercept = (sumY - slope * sumX) / n;
                // R-squared
                const yMean = sumY / n;
                const ssRes = ys.slice(0, n).reduce((s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2, 0);
                const ssTot = ys.slice(0, n).reduce((s, y) => s + (y - yMean) ** 2, 0);
                const rSquared = 1 - ssRes / (ssTot || 1);
                return {
                    success: true,
                    type: 'linear_regression',
                    coefficients: { slope, intercept },
                    rSquared: Math.round(rSquared * 10000) / 10000,
                    samples: n,
                    feature,
                    target,
                    equation: `${target} = ${slope.toFixed(4)} * ${feature} + ${intercept.toFixed(4)}`,
                };
            }

            case 'classification': {
                // K-nearest neighbors (simple implementation)
                if (!target || !features) return { success: false, error: 'target and features required' };
                const k = opts.k || 3;
                const classes = [...new Set(data.map(d => d[target]))];
                return {
                    success: true,
                    type: 'knn_classifier',
                    k,
                    classes,
                    classDistribution: classes.map(c => ({ class: c, count: data.filter(d => d[target] === c).length })),
                    features,
                    samples: data.length,
                    note: 'Model trained in-memory. Use ml_predict to classify new data points.',
                    model: { type: 'knn', k, features, target, trainingData: data },
                };
            }

            case 'cluster': {
                // Simple K-means
                if (!features) return { success: false, error: 'features required' };
                const numClusters = opts.clusters || 3;
                const points = data.map(d => features.map(f => d[f] || 0));
                // Initialize centroids randomly
                const centroids = [];
                const used = new Set();
                for (let i = 0; i < numClusters && i < points.length; i++) {
                    let idx;
                    do { idx = Math.floor(Math.random() * points.length); } while (used.has(idx));
                    used.add(idx);
                    centroids.push([...points[idx]]);
                }
                // Iterate
                let assignments = new Array(points.length).fill(0);
                for (let iter = 0; iter < 50; iter++) {
                    // Assign points to nearest centroid
                    assignments = points.map(p => {
                        let minDist = Infinity, minIdx = 0;
                        for (let c = 0; c < centroids.length; c++) {
                            const d = Math.sqrt(centroids[c].reduce((s, v, i) => s + (v - p[i]) ** 2, 0));
                            if (d < minDist) { minDist = d; minIdx = c; }
                        }
                        return minIdx;
                    });
                    // Update centroids
                    for (let c = 0; c < centroids.length; c++) {
                        const members = points.filter((_, i) => assignments[i] === c);
                        if (members.length > 0) {
                            centroids[c] = centroids[c].map((_, fi) =>
                                members.reduce((s, m) => s + m[fi], 0) / members.length
                            );
                        }
                    }
                }
                const clusterSizes = Array(numClusters).fill(0);
                assignments.forEach(a => clusterSizes[a]++);
                return {
                    success: true,
                    type: 'kmeans',
                    clusters: numClusters,
                    clusterSizes,
                    centroids: centroids.map((c, i) => ({ cluster: i, centroid: Object.fromEntries(features.map((f, fi) => [f, Math.round(c[fi] * 100) / 100])), size: clusterSizes[i] })),
                    samples: data.length,
                };
            }

            case 'stats': {
                // Descriptive statistics
                const numericFeatures = features || Object.keys(data[0] || {}).filter(k => typeof data[0][k] === 'number');
                const stats = {};
                for (const f of numericFeatures) {
                    const vals = data.map(d => d[f]).filter(v => typeof v === 'number');
                    vals.sort((a, b) => a - b);
                    const sum = vals.reduce((a, b) => a + b, 0);
                    const mean = sum / vals.length;
                    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
                    stats[f] = {
                        count: vals.length,
                        mean: Math.round(mean * 1000) / 1000,
                        median: vals[Math.floor(vals.length / 2)],
                        min: vals[0],
                        max: vals[vals.length - 1],
                        std: Math.round(Math.sqrt(variance) * 1000) / 1000,
                        q25: vals[Math.floor(vals.length * 0.25)],
                        q75: vals[Math.floor(vals.length * 0.75)],
                    };
                }
                return { success: true, type: 'descriptive_stats', features: numericFeatures, stats, samples: data.length };
            }

            default:
                return { success: false, error: `Unknown ml_train action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── ml_predict ──────────────────────────────────────────────────
async function mlPredict(params) {
    const { model, input, ...opts } = params;

    try {
        if (!model) return { success: false, error: 'model object required (from ml_train output)' };
        if (!input) return { success: false, error: 'input required' };

        if (model.type === 'linear_regression' || model.slope !== undefined) {
            const slope = model.slope || model.coefficients?.slope;
            const intercept = model.intercept || model.coefficients?.intercept;
            const feature = model.feature || Object.keys(input)[0];
            const x = input[feature] ?? input;
            const prediction = slope * x + intercept;
            return { success: true, prediction: Math.round(prediction * 10000) / 10000, model: 'linear_regression' };
        }

        if (model.type === 'knn') {
            const { k, features, trainingData, target } = model;
            const point = features.map(f => input[f] || 0);
            // Calculate distances to all training points
            const distances = trainingData.map(d => ({
                label: d[target],
                distance: Math.sqrt(features.reduce((s, f, i) => s + (d[f] - point[i]) ** 2, 0)),
            }));
            distances.sort((a, b) => a.distance - b.distance);
            const neighbors = distances.slice(0, k);
            // Majority vote
            const votes = {};
            for (const n of neighbors) votes[n.label] = (votes[n.label] || 0) + 1;
            const prediction = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
            return { success: true, prediction, confidence: votes[prediction] / k, neighbors: neighbors.map(n => n.label), model: 'knn' };
        }

        return { success: false, error: 'Unsupported model type' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export default {
    llmChat,
    llmEmbed,
    llmFinetune,
    mlTrain,
    mlPredict,
};
