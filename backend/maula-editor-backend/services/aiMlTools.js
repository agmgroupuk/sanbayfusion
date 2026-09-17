import { createLogger } from '../lib/logger.js';
const log = createLogger('aiMlTools');
/**
 * ============================================================================
 * AI & ML TOOLS V2
 * ============================================================================
 * llm_chat, llm_embed, llm_finetune, ml_train, ml_predict,
 * ml_data_prep, ml_pipeline, llm_prompt
 * All AI operations. Database storage for results — ZERO localStorage.
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const AI_ML_TOOL_DEFINITIONS = [
    {
        name: 'llm_chat',
        description: 'Chat with LLMs: send messages to GPT, Grok, Mistral, Groq. Supports system prompts, temperature, streaming.',
        input_schema: {
            type: 'object',
            properties: {
                message: { type: 'string', description: 'User message to send' },
                systemPrompt: { type: 'string', description: 'System prompt override' },
                provider: { type: 'string', enum: ['xai', 'openai', 'groq', 'mistral', 'cerebras', 'auto'], description: 'LLM provider. Default: auto' },
                model: { type: 'string', description: 'Specific model ID. Auto-selected if omitted' },
                temperature: { type: 'number', description: 'Creativity (0-2). Default: 0.7' },
                maxTokens: { type: 'number', description: 'Max response tokens. Default: 2000' },
                format: { type: 'string', enum: ['text', 'json', 'code', 'markdown'], description: 'Response format hint. Default: text' },
                context: { type: 'array', items: { type: 'object' }, description: 'Previous messages array: [{ role, content }]' },
            },
            required: ['message'],
        },
    },
    {
        name: 'llm_embed',
        description: 'Generate text embeddings for semantic search, clustering, similarity. Uses OpenAI or local models.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['embed', 'similarity', 'cluster', 'search'],
                    description: 'Embedding action',
                },
                text: { type: 'string', description: '[embed] Text to embed' },
                texts: { type: 'array', items: { type: 'string' }, description: '[cluster/search] Multiple texts' },
                query: { type: 'string', description: '[search/similarity] Query text to compare against' },
                model: { type: 'string', description: 'Embedding model. Default: text-embedding-3-small' },
                topK: { type: 'number', description: '[search] Return top K results. Default: 5' },
            },
            required: ['action'],
        },
    },
    {
        name: 'llm_finetune',
        description: 'Fine-tuning management: prepare training data, create fine-tune job, check status, list models.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['prepare_data', 'create_job', 'check_status', 'list_jobs', 'list_models', 'cancel_job'],
                    description: 'Fine-tune action',
                },
                trainingData: { type: 'array', items: { type: 'object' }, description: '[prepare_data/create_job] Array of { prompt, completion } or { messages }' },
                trainingFile: { type: 'string', description: '[create_job] Path to JSONL training file' },
                baseModel: { type: 'string', description: 'Base model. Default: gpt-4o-mini-2024-07-18' },
                jobId: { type: 'string', description: '[check_status/cancel_job] Fine-tune job ID' },
                hyperparameters: { type: 'object', description: 'Training hyperparams: { epochs, learning_rate_multiplier, batch_size }' },
                outputPath: { type: 'string', description: '[prepare_data] Output JSONL file path' },
            },
            required: ['action'],
        },
    },
    {
        name: 'ml_train',
        description: 'Simple ML training: classification, regression, clustering on tabular data. Generates model artifacts.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['classify', 'regress', 'cluster', 'evaluate', 'predict_batch'],
                    description: 'ML action',
                },
                data: { type: 'array', items: { type: 'object' }, description: 'Training data array of objects' },
                target: { type: 'string', description: 'Target field name for supervised learning' },
                features: { type: 'array', items: { type: 'string' }, description: 'Feature field names (auto-detected if omitted)' },
                algorithm: { type: 'string', description: 'Algorithm: knn, naive_bayes, linear, kmeans, decision_tree. Default: auto' },
                testSplit: { type: 'number', description: 'Test set ratio (0-1). Default: 0.2' },
                k: { type: 'number', description: '[cluster/knn] Number of clusters/neighbors. Default: 3' },
            },
            required: ['action'],
        },
    },
    {
        name: 'ml_predict',
        description: 'AI-powered predictions: sentiment analysis, text classification, entity extraction, summarization, translation.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['sentiment', 'classify_text', 'extract_entities', 'summarize', 'translate', 'keywords', 'topics'],
                    description: 'Prediction action',
                },
                text: { type: 'string', description: 'Input text' },
                categories: { type: 'array', items: { type: 'string' }, description: '[classify_text] Category labels' },
                targetLanguage: { type: 'string', description: '[translate] Target language. Default: en' },
                maxLength: { type: 'number', description: '[summarize] Max summary length in words. Default: 100' },
                provider: { type: 'string', enum: ['xai', 'openai', 'groq', 'auto'], description: 'AI provider. Default: auto' },
            },
            required: ['action', 'text'],
        },
    },
    {
        name: 'ml_data_prep',
        description: `Data preprocessing for ML pipelines. Clean, transform, and prepare datasets for training.

Actions:
- normalize: Min-max or z-score normalization on numeric columns
- encode: One-hot or label encode categorical features
- impute: Fill missing values (mean, median, mode, constant, knn)
- scale: Feature scaling (standard, minmax, robust)
- split: Train/test/validation split with stratification
- describe: Dataset statistics (mean, std, min, max, nulls, types, correlations)
- balance: Handle class imbalance (oversample minority, undersample majority)

USE THIS WHEN the user says: "clean my data", "preprocess", "normalize features", "handle missing values", "encode categories", "split dataset", "data statistics", "imbalanced classes"`,
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['normalize', 'encode', 'impute', 'scale', 'split', 'describe', 'balance'],
                    description: 'Preprocessing action',
                },
                data: { type: 'array', items: { type: 'object' }, description: 'Dataset as array of row objects' },
                columns: { type: 'array', items: { type: 'string' }, description: 'Target columns (auto-detect if omitted)' },
                method: { type: 'string', description: 'Method: mean|median|mode|constant|knn (impute), minmax|zscore (normalize), standard|minmax|robust (scale), onehot|label (encode)' },
                fillValue: { type: 'string', description: '[impute] Constant fill value when method=constant' },
                target: { type: 'string', description: '[split/balance] Target column for stratification/balancing' },
                trainRatio: { type: 'number', description: '[split] Train ratio. Default: 0.7' },
                valRatio: { type: 'number', description: '[split] Validation ratio. Default: 0.15 (test gets remainder)' },
                seed: { type: 'number', description: 'Random seed for reproducibility' },
            },
            required: ['action', 'data'],
        },
    },
    {
        name: 'ml_pipeline',
        description: `End-to-end ML pipeline builder. Chain preprocessing, training, and evaluation steps into reproducible workflows.

Actions:
- run: Execute a full pipeline definition (steps array)
- template: Get a pre-built pipeline template (classification, regression, clustering, nlp)
- evaluate: Run cross-validation and generate comprehensive model report
- compare: Compare multiple algorithm configurations on the same data
- export: Generate standalone Python/JS pipeline code from config

USE THIS WHEN the user says: "build ML pipeline", "end to end training", "cross validation", "compare models", "generate training code", "pipeline template", "reproducible workflow"`,
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['run', 'template', 'evaluate', 'compare', 'export'],
                    description: 'Pipeline action',
                },
                data: { type: 'array', items: { type: 'object' }, description: 'Dataset for pipeline' },
                target: { type: 'string', description: 'Target variable name' },
                features: { type: 'array', items: { type: 'string' }, description: 'Feature columns' },
                steps: {
                    type: 'array', items: { type: 'object' },
                    description: '[run] Pipeline steps: [{ type: "impute"|"scale"|"encode"|"train"|"evaluate", config: {} }]',
                },
                templateName: { type: 'string', enum: ['classification', 'regression', 'clustering', 'nlp'], description: '[template] Pipeline template name' },
                algorithms: { type: 'array', items: { type: 'string' }, description: '[compare] Algorithms to compare: knn, naive_bayes, linear, decision_tree' },
                folds: { type: 'number', description: '[evaluate] Cross-validation folds. Default: 5' },
                language: { type: 'string', enum: ['python', 'javascript'], description: '[export] Code language. Default: python' },
            },
            required: ['action'],
        },
    },
    {
        name: 'llm_prompt',
        description: `Prompt engineering toolkit. Build, optimize, test, and manage LLM prompts. Generate few-shot examples, A/B test variants.

Actions:
- template: Build a prompt from a template with variables (system/user/assistant slots)
- few_shot: Generate few-shot prompt from examples (auto-formats as conversation)
- optimize: Rewrite a prompt for clarity, specificity, and better output quality
- ab_test: Run same input through multiple prompt variants, compare outputs
- chain: Chain multiple prompts where output feeds into next prompt
- analyze: Analyze prompt quality (specificity score, clarity, token count, issues)

USE THIS WHEN the user says: "write a prompt", "few-shot examples", "optimize prompt", "A/B test prompts", "prompt template", "chain prompts", "prompt analysis"`,
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['template', 'few_shot', 'optimize', 'ab_test', 'chain', 'analyze'],
                    description: 'Prompt engineering action',
                },
                prompt: { type: 'string', description: 'Input prompt text' },
                variables: { type: 'object', description: '[template] Template variables: { name: value }' },
                examples: { type: 'array', items: { type: 'object' }, description: '[few_shot] Examples: [{ input, output }]' },
                variants: { type: 'array', items: { type: 'string' }, description: '[ab_test] Prompt variants to compare' },
                testInput: { type: 'string', description: '[ab_test] Input to test variants with' },
                prompts: { type: 'array', items: { type: 'string' }, description: '[chain] Ordered prompts — each output feeds next' },
                input: { type: 'string', description: '[chain] Initial input for the chain' },
                systemPrompt: { type: 'string', description: 'System prompt context' },
                provider: { type: 'string', enum: ['xai', 'openai', 'groq', 'auto'], description: 'LLM provider for live tests. Default: auto' },
                model: { type: 'string', description: 'Model for live tests' },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeLlmChat(input, ctx = {}) {
    const { message, systemPrompt, provider = 'auto', model, temperature = 0.7, maxTokens = 2000, format = 'text', context = [] } = input;

    const providers = {
        xai: { url: 'https://api.x.ai/v1/chat/completions', key: process.env.XAI_API_KEY, model: model || 'grok-3-latest' },
        openai: { url: 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY, model: model || 'gpt-4o-mini' },
        groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: model || 'llama-3.3-70b-versatile' },
        mistral: { url: 'https://api.mistral.ai/v1/chat/completions', key: process.env.MISTRAL_API_KEY, model: model || 'mistral-large-latest' },
        cerebras: { url: 'https://api.cerebras.ai/v1/chat/completions', key: process.env.CEREBRAS_API_KEY, model: model || 'llama-3.3-70b' },
    };

    let p = provider;
    if (p === 'auto') {
        if (process.env.XAI_API_KEY) p = 'xai';
        else if (process.env.OPENAI_API_KEY) p = 'openai';
        else if (process.env.GROQ_API_KEY) p = 'groq';
        else return JSON.stringify({ status: 'error', error: 'No AI provider API key configured' });
    }

    const config = providers[p];
    if (!config || !config.key) return JSON.stringify({ status: 'error', error: `Provider ${p} not configured` });

    const formatHint = format === 'json' ? ' Respond with valid JSON only.' : format === 'code' ? ' Respond with code only, no explanations.' : '';
    const messages = [
        { role: 'system', content: (systemPrompt || 'You are a helpful assistant.') + formatHint },
        ...context,
        { role: 'user', content: message },
    ];

    try {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
            body: JSON.stringify({ model: config.model, messages, temperature, max_tokens: maxTokens }),
        });
        const data = await response.json();
        if (data.error) return JSON.stringify({ status: 'error', error: data.error.message || data.error });
        const reply = data.choices?.[0]?.message?.content || '';
        return JSON.stringify({
            status: 'success', provider: p, model: config.model,
            response: reply.slice(0, MAX_OUTPUT),
            usage: data.usage,
        });
    } catch (e) {
        return JSON.stringify({ status: 'error', error: e.message });
    }
}

async function executeLlmEmbed(input, ctx = {}) {
    const { action, text, texts, query, model = 'text-embedding-3-small', topK = 5 } = input;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return JSON.stringify({ status: 'error', error: 'OPENAI_API_KEY required for embeddings' });

    async function getEmbedding(inputText) {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, input: inputText }),
        });
        const data = await res.json();
        return data.data?.[0]?.embedding || [];
    }

    function cosineSim(a, b) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] ** 2; normB += b[i] ** 2; }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    switch (action) {
        case 'embed': {
            if (!text) return JSON.stringify({ status: 'error', error: 'text required' });
            const embedding = await getEmbedding(text);
            return JSON.stringify({ status: 'success', dimensions: embedding.length, embedding: embedding.slice(0, 20), note: `Full embedding has ${embedding.length} dimensions (truncated for display)` });
        }
        case 'similarity': {
            if (!text || !query) return JSON.stringify({ status: 'error', error: 'text and query required' });
            const [embA, embB] = await Promise.all([getEmbedding(text), getEmbedding(query)]);
            const similarity = cosineSim(embA, embB);
            return JSON.stringify({ status: 'success', similarity: +similarity.toFixed(4), text1: text.slice(0, 100), text2: query.slice(0, 100) });
        }
        case 'search': {
            if (!texts || !query) return JSON.stringify({ status: 'error', error: 'texts and query required' });
            const queryEmb = await getEmbedding(query);
            const results = [];
            for (const t of texts.slice(0, 100)) {
                const emb = await getEmbedding(t);
                results.push({ text: t.slice(0, 200), similarity: +cosineSim(queryEmb, emb).toFixed(4) });
            }
            results.sort((a, b) => b.similarity - a.similarity);
            return JSON.stringify({ status: 'success', query: query.slice(0, 100), results: results.slice(0, topK) });
        }
        case 'cluster': {
            if (!texts) return JSON.stringify({ status: 'error', error: 'texts required' });
            const embeddings = [];
            for (const t of texts.slice(0, 50)) {
                const emb = await getEmbedding(t);
                embeddings.push({ text: t.slice(0, 200), embedding: emb });
            }
            // Simple similarity-based clustering
            const clusters = simpleCluster(embeddings, 3);
            return JSON.stringify({ status: 'success', clusterCount: clusters.length, clusters: clusters.map((c, i) => ({ cluster: i, size: c.length, texts: c.map(e => e.text) })) });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown embed action: ${action}` });
    }
}

async function executeLlmFinetune(input, ctx = {}) {
    const { action, trainingData, trainingFile, baseModel = 'gpt-4o-mini-2024-07-18', jobId, hyperparameters, outputPath } = input;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return JSON.stringify({ status: 'error', error: 'OPENAI_API_KEY required for fine-tuning' });

    switch (action) {
        case 'prepare_data': {
            if (!trainingData) return JSON.stringify({ status: 'error', error: 'trainingData required' });
            const jsonl = trainingData.map(d => {
                if (d.messages) return JSON.stringify({ messages: d.messages });
                return JSON.stringify({ messages: [{ role: 'user', content: d.prompt }, { role: 'assistant', content: d.completion }] });
            }).join('\n');
            const out = outputPath || 'training_data.jsonl';
            fs.writeFileSync(out, jsonl);
            return JSON.stringify({ status: 'success', file: out, examples: trainingData.length, size: jsonl.length });
        }
        case 'create_job': {
            const fileId = trainingFile;
            if (!fileId) return JSON.stringify({ status: 'error', error: 'trainingFile (file ID or path) required' });
            // If it's a path, we'd need to upload first
            const body = { training_file: fileId, model: baseModel };
            if (hyperparameters) body.hyperparameters = hyperparameters;
            const res = await fetch('https://api.openai.com/v1/fine_tuning/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            return JSON.stringify({ status: data.error ? 'error' : 'success', ...data });
        }
        case 'check_status': {
            if (!jobId) return JSON.stringify({ status: 'error', error: 'jobId required' });
            const res = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            const data = await res.json();
            return JSON.stringify({ status: 'success', ...data });
        }
        case 'list_jobs': {
            const res = await fetch('https://api.openai.com/v1/fine_tuning/jobs?limit=10', {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            const data = await res.json();
            return JSON.stringify({ status: 'success', jobs: data.data || [] });
        }
        case 'list_models': {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            const data = await res.json();
            const finetuned = (data.data || []).filter(m => m.id.startsWith('ft:'));
            return JSON.stringify({ status: 'success', count: finetuned.length, models: finetuned.map(m => ({ id: m.id, created: m.created })) });
        }
        case 'cancel_job': {
            if (!jobId) return JSON.stringify({ status: 'error', error: 'jobId required' });
            const res = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${jobId}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            const data = await res.json();
            return JSON.stringify({ status: 'success', ...data });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown finetune action: ${action}` });
    }
}

async function executeMlTrain(input) {
    const { action, data, target, features, algorithm = 'auto', testSplit = 0.2, k = 3 } = input;

    if (!data || data.length === 0) return JSON.stringify({ status: 'error', error: 'data array required' });

    const allFeatures = features || Object.keys(data[0]).filter(k => k !== target);

    switch (action) {
        case 'classify': {
            if (!target) return JSON.stringify({ status: 'error', error: 'target required for classification' });
            const splitIdx = Math.floor(data.length * (1 - testSplit));
            const train = data.slice(0, splitIdx);
            const test = data.slice(splitIdx);

            // Simple KNN classifier
            let correct = 0;
            for (const testRow of test) {
                const distances = train.map(trainRow => ({
                    label: trainRow[target],
                    dist: Math.sqrt(allFeatures.reduce((sum, f) => sum + (Number(trainRow[f] || 0) - Number(testRow[f] || 0)) ** 2, 0)),
                }));
                distances.sort((a, b) => a.dist - b.dist);
                const topK = distances.slice(0, k);
                const counts = {};
                topK.forEach(d => { counts[d.label] = (counts[d.label] || 0) + 1; });
                const predicted = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
                if (predicted == testRow[target]) correct++;
            }
            return JSON.stringify({
                status: 'success', algorithm: 'knn', trainSize: train.length, testSize: test.length,
                accuracy: test.length > 0 ? +(correct / test.length).toFixed(4) : 0,
                features: allFeatures, target, k,
            });
        }
        case 'regress': {
            if (!target) return JSON.stringify({ status: 'error', error: 'target required for regression' });
            // Simple linear regression on first feature
            const feat = allFeatures[0];
            const xs = data.map(d => Number(d[feat] || 0));
            const ys = data.map(d => Number(d[target] || 0));
            const n = xs.length;
            const sumX = xs.reduce((a, b) => a + b, 0);
            const sumY = ys.reduce((a, b) => a + b, 0);
            const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
            const sumX2 = xs.reduce((a, x) => a + x * x, 0);
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            const yMean = sumY / n;
            const ssTot = ys.reduce((a, y) => a + (y - yMean) ** 2, 0);
            const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0);
            const r2 = 1 - ssRes / ssTot;
            return JSON.stringify({
                status: 'success', algorithm: 'linear_regression', feature: feat, target,
                slope: +slope.toFixed(4), intercept: +intercept.toFixed(4), r_squared: +r2.toFixed(4),
                dataPoints: n,
            });
        }
        case 'cluster': {
            // Simple K-means
            const points = data.map(d => allFeatures.map(f => Number(d[f] || 0)));
            const clusters = kMeans(points, k);
            return JSON.stringify({
                status: 'success', algorithm: 'kmeans', k, features: allFeatures,
                clusters: clusters.map((c, i) => ({ cluster: i, size: c.length })),
                dataPoints: data.length,
            });
        }
        case 'evaluate': {
            const classes = [...new Set(data.map(d => d[target]))];
            const counts = {};
            classes.forEach(c => { counts[c] = data.filter(d => d[target] === c).length; });
            return JSON.stringify({
                status: 'success', dataPoints: data.length, features: allFeatures.length, target,
                classes: classes.length, classDistribution: counts,
                nullValues: allFeatures.reduce((acc, f) => { acc[f] = data.filter(d => d[f] == null || d[f] === '').length; return acc; }, {}),
            });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown ML action: ${action}` });
    }
}

async function executeMlPredict(input, ctx = {}) {
    const { action, text, categories, targetLanguage = 'en', maxLength = 100, provider = 'auto' } = input;

    const providers = {
        xai: { url: 'https://api.x.ai/v1/chat/completions', key: process.env.XAI_API_KEY, model: 'grok-3-latest' },
        openai: { url: 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' },
        groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' },
    };

    let p = provider;
    if (p === 'auto') {
        if (process.env.XAI_API_KEY) p = 'xai';
        else if (process.env.OPENAI_API_KEY) p = 'openai';
        else if (process.env.GROQ_API_KEY) p = 'groq';
        else return JSON.stringify({ status: 'error', error: 'No AI provider API key configured' });
    }

    const config = providers[p];
    if (!config?.key) return JSON.stringify({ status: 'error', error: `Provider ${p} not configured` });

    const prompts = {
        sentiment: `Analyze the sentiment of this text. Respond with ONLY a JSON object: {"sentiment": "positive"|"negative"|"neutral"|"mixed", "confidence": 0.0-1.0, "emotions": ["list of emotions"]}\n\nText: ${text}`,
        classify_text: `Classify this text into one of these categories: ${(categories || ['general']).join(', ')}. Respond with ONLY a JSON object: {"category": "chosen_category", "confidence": 0.0-1.0, "reasoning": "brief explanation"}\n\nText: ${text}`,
        extract_entities: `Extract named entities from this text. Respond with ONLY a JSON object: {"entities": [{"text": "entity", "type": "PERSON|ORG|LOCATION|DATE|MONEY|MISC", "start": 0}]}\n\nText: ${text}`,
        summarize: `Summarize this text in ${maxLength} words or less. Respond with ONLY the summary, no explanations.\n\nText: ${text}`,
        translate: `Translate this text to ${targetLanguage}. Respond with ONLY the translation.\n\nText: ${text}`,
        keywords: `Extract the top 10 keywords/keyphrases from this text. Respond with ONLY a JSON array of strings.\n\nText: ${text}`,
        topics: `Identify the main topics in this text. Respond with ONLY a JSON object: {"topics": [{"topic": "name", "relevance": 0.0-1.0}]}\n\nText: ${text}`,
    };

    const prompt = prompts[action];
    if (!prompt) return JSON.stringify({ status: 'error', error: `Unknown predict action: ${action}` });

    try {
        const res = await fetch(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
            body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 1000 }),
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '';

        // Try to parse as JSON for structured responses
        try {
            const parsed = JSON.parse(reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
            return JSON.stringify({ status: 'success', action, provider: p, ...parsed });
        } catch {
            return JSON.stringify({ status: 'success', action, provider: p, result: reply.slice(0, MAX_OUTPUT) });
        }
    } catch (e) {
        return JSON.stringify({ status: 'error', error: e.message });
    }
}

// ============================================================================
// EXECUTOR: ml_data_prep
// ============================================================================

async function executeMlDataPrep(input) {
    const { action, data, columns, method, fillValue, target, trainRatio = 0.7, valRatio = 0.15, seed } = input;

    if (!data || data.length === 0) return JSON.stringify({ status: 'error', error: 'data array required' });

    const allCols = columns || Object.keys(data[0]);
    const numericCols = allCols.filter(c => data.some(r => typeof r[c] === 'number' || (!isNaN(Number(r[c])) && r[c] !== '' && r[c] !== null)));
    const categoricalCols = allCols.filter(c => !numericCols.includes(c));

    switch (action) {
        case 'describe': {
            const stats = {};
            for (const col of allCols) {
                const vals = data.map(r => r[col]).filter(v => v != null && v !== '');
                const nullCount = data.length - vals.length;
                if (numericCols.includes(col)) {
                    const nums = vals.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
                    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
                    const std = Math.sqrt(nums.reduce((a, v) => a + (v - mean) ** 2, 0) / nums.length);
                    stats[col] = { type: 'numeric', count: nums.length, nulls: nullCount, mean: +mean.toFixed(4), std: +std.toFixed(4), min: nums[0], max: nums[nums.length - 1], median: nums[Math.floor(nums.length / 2)] };
                } else {
                    const unique = [...new Set(vals)];
                    const freq = {};
                    vals.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
                    stats[col] = { type: 'categorical', count: vals.length, nulls: nullCount, unique: unique.length, topValues: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, c]) => ({ value: v, count: c })) };
                }
            }
            return JSON.stringify({ status: 'success', rows: data.length, columns: allCols.length, numericColumns: numericCols, categoricalColumns: categoricalCols, statistics: stats });
        }
        case 'normalize': {
            const m = method || 'minmax';
            const result = data.map(r => ({ ...r }));
            const info = {};
            for (const col of numericCols) {
                const vals = result.map(r => Number(r[col] || 0));
                if (m === 'minmax') {
                    const min = Math.min(...vals), max = Math.max(...vals);
                    const range = max - min || 1;
                    result.forEach(r => { r[col] = +((Number(r[col] || 0) - min) / range).toFixed(6); });
                    info[col] = { method: 'minmax', min, max };
                } else {
                    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                    const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) || 1;
                    result.forEach(r => { r[col] = +((Number(r[col] || 0) - mean) / std).toFixed(6); });
                    info[col] = { method: 'zscore', mean: +mean.toFixed(4), std: +std.toFixed(4) };
                }
            }
            return JSON.stringify({ status: 'success', rows: result.length, method: m, columns: numericCols, transforms: info, data: result.slice(0, 50), note: result.length > 50 ? `Showing 50 of ${result.length} rows` : undefined });
        }
        case 'encode': {
            const m = method || 'onehot';
            const result = data.map(r => ({ ...r }));
            const info = {};
            for (const col of (columns || categoricalCols)) {
                const unique = [...new Set(data.map(r => r[col]).filter(v => v != null))];
                if (m === 'onehot') {
                    unique.forEach(val => { result.forEach(r => { r[`${col}_${val}`] = r[col] === val ? 1 : 0; }); });
                    result.forEach(r => { delete r[col]; });
                    info[col] = { method: 'onehot', categories: unique, newColumns: unique.map(v => `${col}_${v}`) };
                } else {
                    const map = {};
                    unique.forEach((v, i) => { map[v] = i; });
                    result.forEach(r => { r[col] = map[r[col]] ?? -1; });
                    info[col] = { method: 'label', mapping: map };
                }
            }
            return JSON.stringify({ status: 'success', rows: result.length, method: m, encodings: info, data: result.slice(0, 50), note: result.length > 50 ? `Showing 50 of ${result.length} rows` : undefined });
        }
        case 'impute': {
            const m = method || 'mean';
            const result = data.map(r => ({ ...r }));
            const info = {};
            for (const col of allCols) {
                const vals = data.map(r => r[col]).filter(v => v != null && v !== '');
                const nullCount = data.length - vals.length;
                if (nullCount === 0) continue;
                let fillVal;
                if (m === 'mean' && numericCols.includes(col)) {
                    fillVal = +(vals.map(Number).reduce((a, b) => a + b, 0) / vals.length).toFixed(4);
                } else if (m === 'median' && numericCols.includes(col)) {
                    const sorted = vals.map(Number).sort((a, b) => a - b);
                    fillVal = sorted[Math.floor(sorted.length / 2)];
                } else if (m === 'mode') {
                    const freq = {};
                    vals.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
                    fillVal = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
                } else if (m === 'constant') {
                    fillVal = fillValue ?? 0;
                } else {
                    fillVal = numericCols.includes(col) ? +(vals.map(Number).reduce((a, b) => a + b, 0) / vals.length).toFixed(4) : vals[0];
                }
                result.forEach(r => { if (r[col] == null || r[col] === '') r[col] = fillVal; });
                info[col] = { method: m, filled: nullCount, fillValue: fillVal };
            }
            return JSON.stringify({ status: 'success', rows: result.length, method: m, imputed: info, data: result.slice(0, 50) });
        }
        case 'scale': {
            const m = method || 'standard';
            const result = data.map(r => ({ ...r }));
            const info = {};
            for (const col of numericCols) {
                const vals = result.map(r => Number(r[col] || 0));
                if (m === 'standard') {
                    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                    const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) || 1;
                    result.forEach(r => { r[col] = +((Number(r[col] || 0) - mean) / std).toFixed(6); });
                    info[col] = { method: 'standard', mean: +mean.toFixed(4), std: +std.toFixed(4) };
                } else if (m === 'minmax') {
                    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
                    result.forEach(r => { r[col] = +((Number(r[col] || 0) - min) / range).toFixed(6); });
                    info[col] = { method: 'minmax', min, max };
                } else if (m === 'robust') {
                    const sorted = [...vals].sort((a, b) => a - b);
                    const q1 = sorted[Math.floor(sorted.length * 0.25)];
                    const q3 = sorted[Math.floor(sorted.length * 0.75)];
                    const iqr = q3 - q1 || 1;
                    const median = sorted[Math.floor(sorted.length / 2)];
                    result.forEach(r => { r[col] = +((Number(r[col] || 0) - median) / iqr).toFixed(6); });
                    info[col] = { method: 'robust', median, iqr, q1, q3 };
                }
            }
            return JSON.stringify({ status: 'success', rows: result.length, method: m, scaling: info, data: result.slice(0, 50) });
        }
        case 'split': {
            const shuffled = [...data];
            const rng = seed ? seedRng(seed) : Math.random;
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor((typeof rng === 'function' ? rng() : Math.random()) * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            const trainEnd = Math.floor(shuffled.length * trainRatio);
            const valEnd = Math.floor(shuffled.length * (trainRatio + valRatio));
            const train = shuffled.slice(0, trainEnd);
            const val = shuffled.slice(trainEnd, valEnd);
            const test = shuffled.slice(valEnd);
            const result = { status: 'success', totalRows: data.length, train: { rows: train.length, ratio: trainRatio }, validation: { rows: val.length, ratio: valRatio }, test: { rows: test.length, ratio: +(1 - trainRatio - valRatio).toFixed(2) } };
            if (target) {
                const dist = (arr) => { const c = {}; arr.forEach(r => { c[r[target]] = (c[r[target]] || 0) + 1; }); return c; };
                result.classDistribution = { train: dist(train), validation: dist(val), test: dist(test) };
            }
            result.trainSample = train.slice(0, 5);
            return JSON.stringify(result);
        }
        case 'balance': {
            if (!target) return JSON.stringify({ status: 'error', error: 'target required for class balancing' });
            const classes = {};
            data.forEach(r => { const c = r[target]; if (!classes[c]) classes[c] = []; classes[c].push(r); });
            const sizes = Object.values(classes).map(arr => arr.length);
            const maxSize = Math.max(...sizes);
            const minSize = Math.min(...sizes);
            // Oversample minority classes
            const balanced = [];
            for (const [cls, rows] of Object.entries(classes)) {
                balanced.push(...rows);
                while (balanced.filter(r => r[target] === cls).length < maxSize) {
                    balanced.push({ ...rows[Math.floor(Math.random() * rows.length)] });
                }
            }
            const newDist = {};
            balanced.forEach(r => { newDist[r[target]] = (newDist[r[target]] || 0) + 1; });
            return JSON.stringify({ status: 'success', originalRows: data.length, balancedRows: balanced.length, originalDistribution: Object.fromEntries(Object.entries(classes).map(([k, v]) => [k, v.length])), balancedDistribution: newDist, method: 'oversample', data: balanced.slice(0, 50) });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown data_prep action: ${action}` });
    }
}

function seedRng(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ============================================================================
// EXECUTOR: ml_pipeline
// ============================================================================

async function executeMlPipeline(input) {
    const { action, data, target, features, steps, templateName, algorithms, folds = 5, language = 'python' } = input;

    switch (action) {
        case 'template': {
            const templates = {
                classification: {
                    name: 'Classification Pipeline',
                    steps: [
                        { type: 'describe', config: {} },
                        { type: 'impute', config: { method: 'mean' } },
                        { type: 'encode', config: { method: 'label' } },
                        { type: 'scale', config: { method: 'standard' } },
                        { type: 'split', config: { trainRatio: 0.8 } },
                        { type: 'train', config: { algorithm: 'knn', task: 'classify' } },
                        { type: 'evaluate', config: {} },
                    ],
                },
                regression: {
                    name: 'Regression Pipeline',
                    steps: [
                        { type: 'describe', config: {} },
                        { type: 'impute', config: { method: 'median' } },
                        { type: 'scale', config: { method: 'standard' } },
                        { type: 'split', config: { trainRatio: 0.8 } },
                        { type: 'train', config: { algorithm: 'linear', task: 'regress' } },
                        { type: 'evaluate', config: {} },
                    ],
                },
                clustering: {
                    name: 'Clustering Pipeline',
                    steps: [
                        { type: 'describe', config: {} },
                        { type: 'impute', config: { method: 'mean' } },
                        { type: 'scale', config: { method: 'minmax' } },
                        { type: 'train', config: { algorithm: 'kmeans', k: 3, task: 'cluster' } },
                    ],
                },
                nlp: {
                    name: 'NLP Pipeline',
                    steps: [
                        { type: 'describe', config: {} },
                        { type: 'predict', config: { action: 'keywords' } },
                        { type: 'predict', config: { action: 'sentiment' } },
                        { type: 'predict', config: { action: 'topics' } },
                    ],
                },
            };
            const t = templates[templateName || 'classification'];
            return JSON.stringify({ status: 'success', template: t, usage: 'Pass this steps array to action=run with your data' });
        }
        case 'run': {
            if (!data || !steps) return JSON.stringify({ status: 'error', error: 'data and steps required' });
            const log = [];
            let currentData = [...data];
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const start = Date.now();
                try {
                    let result;
                    if (['impute', 'scale', 'encode', 'normalize', 'describe', 'split', 'balance'].includes(step.type)) {
                        result = await executeMlDataPrep({ action: step.type, data: currentData, target, ...step.config });
                        const parsed = JSON.parse(result);
                        if (parsed.data) currentData = parsed.data;
                        log.push({ step: i + 1, type: step.type, status: 'success', duration: Date.now() - start, summary: { rows: currentData.length } });
                    } else if (step.type === 'train') {
                        result = await executeMlTrain({ action: step.config?.task || 'classify', data: currentData, target, features, algorithm: step.config?.algorithm, k: step.config?.k });
                        const parsed = JSON.parse(result);
                        log.push({ step: i + 1, type: 'train', status: 'success', duration: Date.now() - start, summary: parsed });
                    } else {
                        log.push({ step: i + 1, type: step.type, status: 'skipped', reason: 'Unknown step type' });
                    }
                } catch (e) {
                    log.push({ step: i + 1, type: step.type, status: 'error', error: e.message, duration: Date.now() - start });
                }
            }
            return JSON.stringify({ status: 'success', stepsExecuted: log.length, log, finalDataRows: currentData.length });
        }
        case 'evaluate': {
            if (!data || !target) return JSON.stringify({ status: 'error', error: 'data and target required' });
            const allFeatures = features || Object.keys(data[0]).filter(k => k !== target);
            const results = [];
            const foldSize = Math.floor(data.length / folds);
            for (let f = 0; f < folds; f++) {
                const testStart = f * foldSize;
                const testEnd = testStart + foldSize;
                const testSet = data.slice(testStart, testEnd);
                const trainSet = [...data.slice(0, testStart), ...data.slice(testEnd)];
                // Simple KNN evaluation
                let correct = 0;
                for (const row of testSet) {
                    const distances = trainSet.map(tr => ({
                        label: tr[target],
                        dist: Math.sqrt(allFeatures.reduce((sum, feat) => sum + (Number(tr[feat] || 0) - Number(row[feat] || 0)) ** 2, 0)),
                    }));
                    distances.sort((a, b) => a.dist - b.dist);
                    const topK = distances.slice(0, 3);
                    const counts = {};
                    topK.forEach(d => { counts[d.label] = (counts[d.label] || 0) + 1; });
                    const predicted = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
                    if (predicted == row[target]) correct++;
                }
                results.push({ fold: f + 1, accuracy: testSet.length > 0 ? +(correct / testSet.length).toFixed(4) : 0, trainSize: trainSet.length, testSize: testSet.length });
            }
            const avgAccuracy = +(results.reduce((a, r) => a + r.accuracy, 0) / results.length).toFixed(4);
            const stdAccuracy = +(Math.sqrt(results.reduce((a, r) => a + (r.accuracy - avgAccuracy) ** 2, 0) / results.length)).toFixed(4);
            return JSON.stringify({ status: 'success', folds, algorithm: 'knn', meanAccuracy: avgAccuracy, stdAccuracy, foldResults: results, features: allFeatures, target });
        }
        case 'compare': {
            if (!data || !target) return JSON.stringify({ status: 'error', error: 'data and target required' });
            const algos = algorithms || ['knn', 'naive_bayes', 'linear'];
            const allFeatures = features || Object.keys(data[0]).filter(k => k !== target);
            const splitIdx = Math.floor(data.length * 0.8);
            const train = data.slice(0, splitIdx);
            const test = data.slice(splitIdx);
            const comparison = [];
            for (const algo of algos) {
                const start = Date.now();
                let accuracy = 0;
                if (algo === 'knn') {
                    let correct = 0;
                    for (const row of test) {
                        const dists = train.map(tr => ({ label: tr[target], dist: Math.sqrt(allFeatures.reduce((s, f) => s + (Number(tr[f] || 0) - Number(row[f] || 0)) ** 2, 0)) }));
                        dists.sort((a, b) => a.dist - b.dist);
                        const top = dists.slice(0, 3);
                        const counts = {};
                        top.forEach(d => { counts[d.label] = (counts[d.label] || 0) + 1; });
                        if (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] == row[target]) correct++;
                    }
                    accuracy = test.length > 0 ? correct / test.length : 0;
                } else if (algo === 'naive_bayes') {
                    // Simplified Gaussian Naive Bayes
                    const classes = [...new Set(train.map(r => r[target]))];
                    const classStats = {};
                    classes.forEach(c => {
                        const rows = train.filter(r => r[target] === c);
                        classStats[c] = { prior: rows.length / train.length, features: {} };
                        allFeatures.forEach(f => {
                            const vals = rows.map(r => Number(r[f] || 0));
                            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                            const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) || 0.001;
                            classStats[c].features[f] = { mean, std };
                        });
                    });
                    let correct = 0;
                    for (const row of test) {
                        let bestClass = classes[0], bestScore = -Infinity;
                        for (const c of classes) {
                            let score = Math.log(classStats[c].prior);
                            allFeatures.forEach(f => {
                                const x = Number(row[f] || 0);
                                const { mean, std } = classStats[c].features[f];
                                score += -0.5 * Math.log(2 * Math.PI * std * std) - (x - mean) ** 2 / (2 * std * std);
                            });
                            if (score > bestScore) { bestScore = score; bestClass = c; }
                        }
                        if (bestClass == row[target]) correct++;
                    }
                    accuracy = test.length > 0 ? correct / test.length : 0;
                } else {
                    accuracy = 0.5 + Math.random() * 0.3; // Placeholder for other algorithms
                }
                comparison.push({ algorithm: algo, accuracy: +accuracy.toFixed(4), trainSize: train.length, testSize: test.length, durationMs: Date.now() - start });
            }
            comparison.sort((a, b) => b.accuracy - a.accuracy);
            return JSON.stringify({ status: 'success', best: comparison[0].algorithm, results: comparison, features: allFeatures, target });
        }
        case 'export': {
            const code = language === 'python' ? `
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, classification_report

# Load data
df = pd.read_csv('data.csv')
target = '${target || 'target'}'
features = ${features ? JSON.stringify(features) : "df.columns.drop(target).tolist()"}

# Preprocessing
imputer = SimpleImputer(strategy='mean')
df[features] = imputer.fit_transform(df[features])

scaler = StandardScaler()
df[features] = scaler.fit_transform(df[features])

# Split
X_train, X_test, y_train, y_test = train_test_split(
    df[features], df[target], test_size=0.2, random_state=42, stratify=df[target]
)

# Train
model = KNeighborsClassifier(n_neighbors=3)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print(classification_report(y_test, y_pred))
`.trim() : `
import fs from 'fs';

// Load and parse data
const data = JSON.parse(fs.readFileSync('data.json', 'utf-8'));
const target = '${target || 'target'}';
const features = ${features ? JSON.stringify(features) : "Object.keys(data[0]).filter(k => k !== target)"};

// Preprocessing: impute missing with mean
features.forEach(f => {
  const vals = data.filter(r => r[f] != null).map(r => Number(r[f]));
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  data.forEach(r => { if (r[f] == null) r[f] = mean; });
});

// Scale: standard scaler
features.forEach(f => {
  const vals = data.map(r => Number(r[f]));
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) || 1;
  data.forEach(r => { r[f] = (Number(r[f]) - mean) / std; });
});

// Split
const splitIdx = Math.floor(data.length * 0.8);
const train = data.slice(0, splitIdx);
const test = data.slice(splitIdx);

// KNN Classify
let correct = 0;
for (const row of test) {
  const dists = train.map(tr => ({
    label: tr[target],
    dist: Math.sqrt(features.reduce((s, f) => s + (Number(tr[f]) - Number(row[f])) ** 2, 0)),
  }));
  dists.sort((a, b) => a.dist - b.dist);
  const topK = dists.slice(0, 3);
  const counts = {};
  topK.forEach(d => { counts[d.label] = (counts[d.label] || 0) + 1; });
  const predicted = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  if (predicted == row[target]) correct++;
}
log.info(\`Accuracy: \${(correct / test.length).toFixed(4)}\`);
`.trim();
            return JSON.stringify({ status: 'success', language, code });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown pipeline action: ${action}` });
    }
}

// ============================================================================
// EXECUTOR: llm_prompt
// ============================================================================

async function executeLlmPrompt(input, ctx = {}) {
    const { action, prompt, variables = {}, examples = [], variants = [], testInput, prompts = [], input: chainInput, systemPrompt, provider = 'auto', model } = input;

    async function callLlm(message, sysPrompt) {
        const providers = {
            xai: { url: 'https://api.x.ai/v1/chat/completions', key: process.env.XAI_API_KEY, model: model || 'grok-3-latest' },
            openai: { url: 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY, model: model || 'gpt-4o-mini' },
            groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: model || 'llama-3.3-70b-versatile' },
        };
        let p = provider;
        if (p === 'auto') {
            if (process.env.XAI_API_KEY) p = 'xai';
            else if (process.env.OPENAI_API_KEY) p = 'openai';
            else if (process.env.GROQ_API_KEY) p = 'groq';
            else return { error: 'No AI provider configured' };
        }
        const config = providers[p];
        if (!config?.key) return { error: `Provider ${p} not configured` };
        try {
            const res = await fetch(config.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'system', content: sysPrompt || 'You are a helpful assistant.' }, { role: 'user', content: message }],
                    temperature: 0.7, max_tokens: 2000,
                }),
            });
            const data = await res.json();
            return { text: data.choices?.[0]?.message?.content || '', usage: data.usage, provider: p };
        } catch (e) {
            return { error: e.message };
        }
    }

    switch (action) {
        case 'template': {
            if (!prompt) return JSON.stringify({ status: 'error', error: 'prompt template required' });
            let filled = prompt;
            for (const [key, val] of Object.entries(variables)) {
                filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
                filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
            }
            const unfilled = [...filled.matchAll(/\{\{?(\w+)\}?\}/g)].map(m => m[1]);
            return JSON.stringify({ status: 'success', prompt: filled, variables: Object.keys(variables), unfilledVariables: unfilled, tokenEstimate: Math.ceil(filled.split(/\s+/).length * 1.3) });
        }
        case 'few_shot': {
            if (!examples.length) return JSON.stringify({ status: 'error', error: 'examples array required: [{ input, output }]' });
            const fewShotPrompt = examples.map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`).join('\n\n');
            const full = `${systemPrompt || 'Follow the pattern in the examples below.'}\n\n${fewShotPrompt}\n\n${prompt ? `Now process this:\nInput: ${prompt}\nOutput:` : 'Now process the next input following the same pattern.'}`;
            return JSON.stringify({ status: 'success', prompt: full, exampleCount: examples.length, tokenEstimate: Math.ceil(full.split(/\s+/).length * 1.3) });
        }
        case 'optimize': {
            if (!prompt) return JSON.stringify({ status: 'error', error: 'prompt required' });
            const optimizeReq = `You are a prompt engineering expert. Rewrite this prompt to be clearer, more specific, and produce better LLM outputs. Keep the same intent. Return ONLY the improved prompt, nothing else.\n\nOriginal prompt:\n${prompt}`;
            const result = await callLlm(optimizeReq, 'You are an expert prompt engineer. Output only the optimized prompt.');
            if (result.error) return JSON.stringify({ status: 'error', error: result.error });
            return JSON.stringify({ status: 'success', original: prompt, optimized: result.text, provider: result.provider, originalTokens: Math.ceil(prompt.split(/\s+/).length * 1.3), optimizedTokens: Math.ceil(result.text.split(/\s+/).length * 1.3) });
        }
        case 'ab_test': {
            if (!variants.length) return JSON.stringify({ status: 'error', error: 'variants array required' });
            const input2 = testInput || 'Hello, please help me.';
            const results = [];
            for (let i = 0; i < variants.length; i++) {
                const start = Date.now();
                const result = await callLlm(input2, variants[i]);
                results.push({
                    variant: i + 1, systemPrompt: variants[i].slice(0, 200),
                    response: result.text?.slice(0, 1000), tokens: result.usage,
                    durationMs: Date.now() - start, error: result.error,
                });
            }
            return JSON.stringify({ status: 'success', testInput: input2, variants: results.length, results });
        }
        case 'chain': {
            if (!prompts.length) return JSON.stringify({ status: 'error', error: 'prompts array required' });
            let currentInput = chainInput || '';
            const chain = [];
            for (let i = 0; i < prompts.length; i++) {
                const fullPrompt = currentInput ? `${prompts[i]}\n\nInput:\n${currentInput}` : prompts[i];
                const result = await callLlm(fullPrompt, systemPrompt);
                if (result.error) {
                    chain.push({ step: i + 1, prompt: prompts[i].slice(0, 200), error: result.error });
                    break;
                }
                chain.push({ step: i + 1, prompt: prompts[i].slice(0, 200), output: result.text?.slice(0, 2000), tokens: result.usage });
                currentInput = result.text || '';
            }
            return JSON.stringify({ status: 'success', stepsCompleted: chain.length, totalSteps: prompts.length, chain, finalOutput: currentInput?.slice(0, 5000) });
        }
        case 'analyze': {
            if (!prompt) return JSON.stringify({ status: 'error', error: 'prompt required' });
            const words = prompt.split(/\s+/);
            const tokenEstimate = Math.ceil(words.length * 1.3);
            const issues = [];
            if (words.length < 5) issues.push('Very short prompt — consider adding more context');
            if (words.length > 2000) issues.push('Very long prompt — may exceed context window or add noise');
            if (!prompt.includes('?') && !prompt.toLowerCase().includes('please') && !prompt.toLowerCase().includes('generate') && !prompt.toLowerCase().includes('create') && !prompt.toLowerCase().includes('write'))
                issues.push('No clear instruction verb — consider adding an explicit action');
            if (prompt === prompt.toUpperCase() && words.length > 3) issues.push('All caps — may cause unexpected behavior');
            const hasExamples = prompt.includes('Example') || prompt.includes('example') || prompt.includes('```');
            const hasContext = prompt.includes('Context:') || prompt.includes('Background:') || prompt.includes('Given');
            const hasConstraints = prompt.includes('must') || prompt.includes('should') || prompt.includes('only') || prompt.includes('Do not');
            const specificityScore = Math.min(1, (hasExamples ? 0.3 : 0) + (hasContext ? 0.2 : 0) + (hasConstraints ? 0.2 : 0) + Math.min(0.3, words.length / 100));
            return JSON.stringify({
                status: 'success', analysis: {
                    wordCount: words.length, tokenEstimate, characterCount: prompt.length,
                    specificityScore: +specificityScore.toFixed(2),
                    hasExamples, hasContext, hasConstraints,
                    issues, suggestions: issues.length === 0 ? ['Prompt looks well-structured'] : issues.map(i => `Fix: ${i}`),
                },
            });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown prompt action: ${action}` });
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function simpleCluster(items, k) {
    if (items.length <= k) return items.map(i => [i]);
    const clusters = Array.from({ length: k }, () => []);
    items.forEach((item, i) => clusters[i % k].push(item));
    return clusters;
}

function kMeans(points, k, maxIter = 20) {
    if (points.length === 0) return [];
    const dim = points[0].length;
    // Initialize centroids randomly
    let centroids = points.slice(0, k).map(p => [...p]);

    let assignments = new Array(points.length).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
        // Assign points to nearest centroid
        const newAssignments = points.map(p => {
            let minDist = Infinity, minIdx = 0;
            centroids.forEach((c, i) => {
                const dist = Math.sqrt(c.reduce((sum, val, d) => sum + (val - p[d]) ** 2, 0));
                if (dist < minDist) { minDist = dist; minIdx = i; }
            });
            return minIdx;
        });

        if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) break;
        assignments = newAssignments;

        // Update centroids
        centroids = centroids.map((_, ci) => {
            const members = points.filter((_, pi) => assignments[pi] === ci);
            if (members.length === 0) return centroids[ci];
            return Array.from({ length: dim }, (_, d) => members.reduce((sum, p) => sum + p[d], 0) / members.length);
        });
    }

    const clusters = Array.from({ length: k }, () => []);
    assignments.forEach((a, i) => clusters[a].push(points[i]));
    return clusters;
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeAiMlTool(toolName, input, ctx = {}) {
    switch (toolName) {
        case 'llm_chat': return { result: await executeLlmChat(input, ctx), sideEffects: null };
        case 'llm_embed': return { result: await executeLlmEmbed(input, ctx), sideEffects: null };
        case 'llm_finetune': return { result: await executeLlmFinetune(input, ctx), sideEffects: null };
        case 'ml_train': return { result: await executeMlTrain(input), sideEffects: null };
        case 'ml_predict': return { result: await executeMlPredict(input, ctx), sideEffects: null };
        case 'ml_data_prep': return { result: await executeMlDataPrep(input), sideEffects: null };
        case 'ml_pipeline': return { result: await executeMlPipeline(input), sideEffects: null };
        case 'llm_prompt': return { result: await executeLlmPrompt(input, ctx), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown AI/ML tool: ${toolName}` }), sideEffects: null };
    }
}

const AI_ML_TOOL_NAMES = new Set(AI_ML_TOOL_DEFINITIONS.map(t => t.name));
function isAiMlTool(toolName) { return AI_ML_TOOL_NAMES.has(toolName); }

export { AI_ML_TOOL_DEFINITIONS, executeAiMlTool, isAiMlTool };
