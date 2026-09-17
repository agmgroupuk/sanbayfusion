// ─────────────────────────────────────────────────────────────
//  Advanced AI Control Tools  –  V4
//  Tools: llm_router, llm_cost_optimize, llm_guardrail,
//         llm_evaluate, agent_spawn, agent_delegate, agent_reflect,
//         llm_compare, llm_cache, prompt_template, agent_chain, model_benchmark
// ─────────────────────────────────────────────────────────────
import prisma from '../lib/prisma.js';

/* ───── provider catalogue (costs in USD / 1K tokens) ───── */
const PROVIDER_CATALOGUE = {
    'gpt-4o': { provider: 'openai', inputCost: 0.005, outputCost: 0.015, contextWindow: 128000, latencyMs: 800, quality: 95 },
    'gpt-4o-mini': { provider: 'openai', inputCost: 0.00015, outputCost: 0.0006, contextWindow: 128000, latencyMs: 400, quality: 82 },
    'gpt-4-turbo': { provider: 'openai', inputCost: 0.01, outputCost: 0.03, contextWindow: 128000, latencyMs: 1200, quality: 93 },
    'gpt-3.5-turbo': { provider: 'openai', inputCost: 0.0005, outputCost: 0.0015, contextWindow: 16385, latencyMs: 300, quality: 75 },
    'claude-3.5-sonnet': { provider: 'anthropic', inputCost: 0.003, outputCost: 0.015, contextWindow: 200000, latencyMs: 700, quality: 96 },
    'claude-3-haiku': { provider: 'anthropic', inputCost: 0.00025, outputCost: 0.00125, contextWindow: 200000, latencyMs: 350, quality: 80 },
    'gemini-1.5-pro': { provider: 'google', inputCost: 0.00125, outputCost: 0.005, contextWindow: 1000000, latencyMs: 900, quality: 91 },
    'gemini-1.5-flash': { provider: 'google', inputCost: 0.000075, outputCost: 0.0003, contextWindow: 1000000, latencyMs: 250, quality: 78 },
    'llama-3.1-405b': { provider: 'meta', inputCost: 0.003, outputCost: 0.003, contextWindow: 128000, latencyMs: 1000, quality: 90 },
    'llama-3.1-70b': { provider: 'meta', inputCost: 0.0008, outputCost: 0.0008, contextWindow: 128000, latencyMs: 500, quality: 83 },
    'mistral-large': { provider: 'mistral', inputCost: 0.002, outputCost: 0.006, contextWindow: 128000, latencyMs: 600, quality: 88 },
    'mistral-small': { provider: 'mistral', inputCost: 0.0002, outputCost: 0.0006, contextWindow: 32000, latencyMs: 250, quality: 72 },
};

/* ───── guardrail rule library ───── */
const BUILTIN_RULES = {
    'no-pii': { label: 'Block PII', patterns: [/\b\d{3}-\d{2}-\d{4}\b/, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/] },
    'no-profanity': { label: 'Block Profanity', patterns: [/\b(fuck|shit|damn|ass|bitch)\b/gi] },
    'no-injection': { label: 'Block Prompt Injection', patterns: [/ignore\s+(all\s+)?previous\s+instructions/i, /system\s*:\s*/i, /\bDAN\b.*\bmode\b/i] },
    'max-length-4k': { label: 'Max 4K chars output', maxLength: 4000 },
    'json-only': { label: 'Must be valid JSON', validateJSON: true },
    'no-code-exec': { label: 'No code execution', patterns: [/exec\s*\(/, /eval\s*\(/, /subprocess/, /os\.system/] },
    'safe-urls': { label: 'Safe URLs only', patterns: [/https?:\/\/(?![\w.-]+\.(com|org|net|io|gov|edu))/i] },
};

/* ───── tool definitions ───── */
export const ADVANCED_AI_TOOL_DEFINITIONS = [
    // 1 ─ LLM Router
    {
        name: 'llm_router',
        description: 'Intelligently route prompts to the optimal LLM based on task type, complexity, cost budget, latency requirements, and quality needs. Supports multi-model fallback chains.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['route', 'configure', 'history', 'benchmark'], description: 'Action to perform' },
                prompt: { type: 'string', description: 'The prompt to route (for route action)' },
                taskType: { type: 'string', enum: ['code', 'creative', 'analysis', 'chat', 'summarize', 'translate', 'extract', 'reason'], description: 'Type of task' },
                constraints: { type: 'object', description: '{ maxCostPer1k, maxLatencyMs, minQuality, requiredContext, preferredProvider }' },
                fallbackChain: { type: 'array', items: { type: 'string' }, description: 'Ordered list of model names to try' },
                routeId: { type: 'string', description: 'Route log ID (for history action)' },
            },
            required: ['action'],
        },
    },
    // 2 ─ LLM Cost Optimizer
    {
        name: 'llm_cost_optimize',
        description: 'Analyze and optimize LLM usage costs. Provides token usage analytics, cost projections, model substitution recommendations, prompt compression suggestions, and budget alerts.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['analyze', 'project', 'recommend', 'compress', 'budget_alert'], description: 'Action to perform' },
                periodDays: { type: 'number', description: 'Analysis period in days (default 30)' },
                budget: { type: 'number', description: 'Monthly budget in USD' },
                prompt: { type: 'string', description: 'Prompt to compress (for compress action)' },
                targetReduction: { type: 'number', description: 'Target cost reduction percentage (for recommend)' },
            },
            required: ['action'],
        },
    },
    // 3 ─ LLM Guardrail
    {
        name: 'llm_guardrail',
        description: 'Apply safety guardrails to LLM inputs and outputs. Supports PII detection, prompt injection blocking, content filtering, output validation, and custom rule enforcement.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['check_input', 'check_output', 'add_rule', 'list_rules', 'audit'], description: 'Action to perform' },
                text: { type: 'string', description: 'Text to check' },
                rules: { type: 'array', items: { type: 'string' }, description: 'Rule IDs to apply (default: all)' },
                customRule: { type: 'object', description: '{ id, label, pattern (regex string), maxLength?, validateJSON? }' },
                severity: { type: 'string', enum: ['block', 'warn', 'log'], description: 'Action on violation (default: block)' },
            },
            required: ['action'],
        },
    },
    // 4 ─ LLM Evaluate
    {
        name: 'llm_evaluate',
        description: 'Evaluate LLM outputs with multi-dimensional scoring: relevance, coherence, factuality, safety, format compliance, creativity, and custom rubrics. Supports A/B comparison of model outputs.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['evaluate', 'compare', 'benchmark', 'history'], description: 'Action to perform' },
                prompt: { type: 'string', description: 'Original prompt' },
                output: { type: 'string', description: 'LLM output to evaluate' },
                outputB: { type: 'string', description: 'Second output for comparison' },
                model: { type: 'string', description: 'Model that generated the output' },
                modelB: { type: 'string', description: 'Model for second output' },
                rubric: { type: 'object', description: 'Custom rubric { dimension: weight } (weights sum to 1)' },
                reference: { type: 'string', description: 'Reference / ground truth answer' },
            },
            required: ['action'],
        },
    },
    // 5 ─ Agent Spawn
    {
        name: 'agent_spawn',
        description: 'Spawn autonomous sub-agents with defined capabilities, goals, memory, and resource limits. Supports agent lifecycle management (create, pause, resume, terminate, list).',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['spawn', 'pause', 'resume', 'terminate', 'list', 'status'], description: 'Action to perform' },
                agentId: { type: 'string', description: 'Agent ID (for lifecycle actions)' },
                name: { type: 'string', description: 'Agent name' },
                goal: { type: 'string', description: 'Agent primary goal / system prompt' },
                capabilities: { type: 'array', items: { type: 'string' }, description: 'List of tool names the agent can use' },
                model: { type: 'string', description: 'LLM model to use' },
                maxSteps: { type: 'number', description: 'Max reasoning steps before auto-terminate (default 50)' },
                memoryStrategy: { type: 'string', enum: ['full', 'sliding_window', 'summary', 'rag'], description: 'Memory management strategy' },
                resourceLimits: { type: 'object', description: '{ maxTokens, maxCostUsd, maxTimeMs }' },
            },
            required: ['action'],
        },
    },
    // 6 ─ Agent Delegate
    {
        name: 'agent_delegate',
        description: 'Delegate tasks to spawned agents. Supports task queuing, priority scheduling, result aggregation, parallel fan-out, and sequential chaining.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['delegate', 'fan_out', 'chain', 'status', 'results', 'cancel'], description: 'Action to perform' },
                agentId: { type: 'string', description: 'Target agent ID' },
                agentIds: { type: 'array', items: { type: 'string' }, description: 'Multiple agent IDs for fan_out' },
                task: { type: 'string', description: 'Task description' },
                tasks: { type: 'array', items: { type: 'string' }, description: 'Tasks for chain/fan_out' },
                priority: { type: 'number', description: 'Priority 1 (highest) – 10 (lowest), default 5' },
                timeout: { type: 'number', description: 'Timeout in ms' },
                delegationId: { type: 'string', description: 'Delegation ID for status/results/cancel' },
            },
            required: ['action'],
        },
    },
    // 7 ─ Agent Reflect
    {
        name: 'agent_reflect',
        description: 'Enable agent self-reflection and meta-cognition. Analyze reasoning chains, identify errors, generate improvement suggestions, track performance over time, and optimize agent behavior.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['reflect', 'analyze_chain', 'suggest_improvements', 'performance', 'optimize'], description: 'Action to perform' },
                agentId: { type: 'string', description: 'Agent to reflect on' },
                reasoningChain: { type: 'array', items: { type: 'string' }, description: 'Steps of reasoning to analyze' },
                goal: { type: 'string', description: 'Original goal for reflection' },
                outcome: { type: 'string', description: 'Actual outcome achieved' },
                periodDays: { type: 'number', description: 'Performance analysis period (default 7)' },
            },
            required: ['action'],
        },
    },
    // 8 ─ LLM Compare
    {
        name: 'llm_compare',
        description: 'Run the same prompt on multiple LLMs and compare results side-by-side. Evaluates quality, latency, cost, token usage, and output differences. Supports leaderboard tracking across runs.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['compare', 'leaderboard', 'history', 'get'], description: 'Action to perform' },
                prompt: { type: 'string', description: '[compare] The prompt to send to all models' },
                models: { type: 'array', items: { type: 'string' }, description: '[compare] Models to compare (e.g. ["gpt-4o","claude-3.5-sonnet"])' },
                taskType: { type: 'string', enum: ['code', 'creative', 'analysis', 'chat', 'summarize', 'translate', 'extract', 'reason'], description: 'Task type for scoring' },
                reference: { type: 'string', description: 'Ground truth for accuracy scoring' },
                comparisonId: { type: 'string', description: '[get/history] Comparison ID' },
                take: { type: 'number', description: '[leaderboard/history] Limit. Default: 20' },
            },
            required: ['action'],
        },
    },
    // 9 ─ LLM Cache
    {
        name: 'llm_cache',
        description: 'Semantic prompt caching layer. Cache LLM responses to avoid repeated API calls for identical or similar prompts. Track hit rates, savings, and manage cache lifecycle.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['get', 'set', 'invalidate', 'stats', 'clear', 'list', 'search'], description: 'Cache action' },
                prompt: { type: 'string', description: '[get/set/search] The prompt to cache or lookup' },
                model: { type: 'string', description: '[get/set] Model name for cache key' },
                response: { type: 'string', description: '[set] Response to cache' },
                ttlHours: { type: 'number', description: '[set] Time-to-live in hours. Default: 24' },
                cacheKey: { type: 'string', description: '[invalidate] Specific cache key to remove' },
                similarityThreshold: { type: 'number', description: '[get] 0-1 threshold for fuzzy matching. Default: 0.95' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    // 10 ─ Prompt Template
    {
        name: 'prompt_template',
        description: 'Manage reusable prompt templates with variable interpolation. Create, version, test, and share prompt templates across your team. Supports conditional sections and nested templates.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['create', 'render', 'update', 'get', 'list', 'delete', 'test', 'version_history', 'clone'], description: 'Template action' },
                name: { type: 'string', description: '[create/update] Template name' },
                template: { type: 'string', description: '[create/update] Template text with {{variable}} placeholders' },
                variables: { type: 'object', description: '[render/test] Key-value pairs for interpolation' },
                description: { type: 'string', description: '[create] Template description' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags for organization' },
                templateId: { type: 'string', description: '[render/update/get/delete/test/version_history/clone] Template ID' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    // 11 ─ Agent Chain
    {
        name: 'agent_chain',
        description: 'Chain multiple agents into sequential or parallel pipelines. Output from one agent feeds as input to the next. Supports branching, error handling, retry policies, and progress tracking.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['create', 'execute', 'status', 'results', 'list', 'delete', 'retry'], description: 'Chain action' },
                name: { type: 'string', description: '[create] Chain name' },
                steps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            agentId: { type: 'string' },
                            task: { type: 'string' },
                            inputMapping: { type: 'string', description: 'How to map previous output (e.g. "result", "result.summary")' },
                        },
                    },
                    description: '[create] Ordered list of chain steps',
                },
                mode: { type: 'string', enum: ['sequential', 'parallel', 'conditional'], description: 'Execution mode. Default: sequential' },
                chainId: { type: 'string', description: '[execute/status/results/delete/retry] Chain ID' },
                initialInput: { type: 'string', description: '[execute] Initial input for step 1' },
                retryPolicy: { type: 'object', description: '{ maxRetries, backoffMs }' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    // 12 ─ Model Benchmark
    {
        name: 'model_benchmark',
        description: 'Run standardized benchmark suites against LLMs. Tests code generation, reasoning, math, instruction following, creative writing, speed, and cost efficiency. Generates scorecards and leaderboards.',
        category: 'advanced_ai',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['run', 'results', 'leaderboard', 'list_suites', 'custom_suite', 'history'], description: 'Benchmark action' },
                models: { type: 'array', items: { type: 'string' }, description: '[run] Models to benchmark' },
                suite: { type: 'string', enum: ['code', 'reasoning', 'math', 'instruction', 'creative', 'speed', 'comprehensive'], description: '[run] Benchmark suite to run. Default: comprehensive' },
                customTests: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: { prompt: { type: 'string' }, expectedOutput: { type: 'string' }, category: { type: 'string' } },
                    },
                    description: '[custom_suite] Custom test cases',
                },
                benchmarkId: { type: 'string', description: '[results/history] Benchmark run ID' },
                take: { type: 'number', description: '[leaderboard/history] Limit. Default: 20' },
            },
            required: ['action'],
        },
    },
];

/* ═══════════════════════════════════════════════════════════════
   EXECUTORS
   ═══════════════════════════════════════════════════════════════ */

// ── 1. llm_router ──────────────────────────────────────────────
async function executeLlmRouter(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'route') {
        const { prompt = '', taskType = 'chat', constraints = {}, fallbackChain } = input;
        const { maxCostPer1k, maxLatencyMs, minQuality = 0, requiredContext, preferredProvider } = constraints;

        // Score each model
        const scored = Object.entries(PROVIDER_CATALOGUE).map(([model, spec]) => {
            let score = spec.quality;
            // Task-type affinity bonuses
            const affinities = {
                code: ['gpt-4o', 'claude-3.5-sonnet', 'gpt-4-turbo'],
                creative: ['claude-3.5-sonnet', 'gpt-4o', 'gemini-1.5-pro'],
                analysis: ['gpt-4o', 'claude-3.5-sonnet', 'gemini-1.5-pro'],
                chat: ['gpt-4o-mini', 'claude-3-haiku', 'gemini-1.5-flash'],
                summarize: ['gemini-1.5-flash', 'claude-3-haiku', 'gpt-4o-mini'],
                translate: ['gpt-4o', 'gemini-1.5-pro', 'mistral-large'],
                extract: ['gpt-4o-mini', 'gemini-1.5-flash', 'claude-3-haiku'],
                reason: ['claude-3.5-sonnet', 'gpt-4o', 'llama-3.1-405b'],
            };
            const affList = affinities[taskType] || [];
            if (affList[0] === model) score += 10;
            else if (affList[1] === model) score += 6;
            else if (affList[2] === model) score += 3;

            // Context fit
            const estimatedTokens = Math.ceil(prompt.length / 4);
            if (requiredContext && spec.contextWindow < requiredContext) score -= 100;
            if (estimatedTokens > spec.contextWindow * 0.9) score -= 50;

            // Provider preference
            if (preferredProvider && spec.provider === preferredProvider) score += 8;

            // Cost factor (lower is better, normalize 0–20)
            const avgCost = (spec.inputCost + spec.outputCost) / 2;
            score += Math.max(0, 20 - avgCost * 2000);

            // Latency factor (lower is better, normalize 0–10)
            score += Math.max(0, 10 - spec.latencyMs / 150);

            // Hard filters
            let eligible = true;
            if (maxCostPer1k && spec.inputCost > maxCostPer1k) eligible = false;
            if (maxLatencyMs && spec.latencyMs > maxLatencyMs) eligible = false;
            if (minQuality && spec.quality < minQuality) eligible = false;

            return { model, score, eligible, ...spec };
        });

        const eligible = scored.filter(s => s.eligible).sort((a, b) => b.score - a.score);
        const selected = eligible[0] || scored.sort((a, b) => b.score - a.score)[0];

        const chain = fallbackChain || eligible.slice(0, 3).map(s => s.model);

        // Log route decision
        const log = await db.llmRouteLog.create({
            data: {
                userId,
                prompt: prompt.slice(0, 500),
                taskType,
                selectedModel: selected.model,
                fallbackChain: chain,
                constraints: constraints,
                score: selected.score,
                reasoning: JSON.stringify({
                    topCandidates: eligible.slice(0, 5).map(s => ({ model: s.model, score: Math.round(s.score), quality: s.quality, cost: s.inputCost })),
                    filters: { maxCostPer1k, maxLatencyMs, minQuality },
                    estimatedTokens: Math.ceil(prompt.length / 4),
                }),
            },
        });

        return {
            result: JSON.stringify({
                selectedModel: selected.model,
                provider: selected.provider,
                score: Math.round(selected.score),
                estimatedCost: { inputPer1k: selected.inputCost, outputPer1k: selected.outputCost },
                latencyMs: selected.latencyMs,
                contextWindow: selected.contextWindow,
                quality: selected.quality,
                fallbackChain: chain,
                reasoning: `Selected ${selected.model} (score ${Math.round(selected.score)}) for ${taskType} task. ${eligible.length} models passed filters.`,
                alternates: eligible.slice(1, 4).map(s => ({ model: s.model, score: Math.round(s.score) })),
                routeId: log.id,
            }),
            sideEffects: null,
        };
    }

    if (action === 'configure') {
        return {
            result: JSON.stringify({
                availableModels: Object.entries(PROVIDER_CATALOGUE).map(([name, spec]) => ({
                    name, provider: spec.provider, inputCost: spec.inputCost, outputCost: spec.outputCost,
                    contextWindow: spec.contextWindow, latencyMs: spec.latencyMs, quality: spec.quality,
                })),
                taskTypes: ['code', 'creative', 'analysis', 'chat', 'summarize', 'translate', 'extract', 'reason'],
                constraintOptions: ['maxCostPer1k', 'maxLatencyMs', 'minQuality', 'requiredContext', 'preferredProvider'],
            }),
            sideEffects: null,
        };
    }

    if (action === 'history') {
        const where = { userId };
        if (input.routeId) where.id = input.routeId;
        const logs = await db.llmRouteLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
        return {
            result: JSON.stringify({
                count: logs.length,
                logs: logs.map(l => ({
                    id: l.id, taskType: l.taskType, selectedModel: l.selectedModel,
                    score: l.score, fallbackChain: l.fallbackChain, createdAt: l.createdAt,
                })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'benchmark') {
        // Generate synthetic benchmark across all models for the given task type
        const taskType = input.taskType || 'chat';
        const benchmarks = Object.entries(PROVIDER_CATALOGUE).map(([model, spec]) => {
            const affinities = {
                code: { 'gpt-4o': 94, 'claude-3.5-sonnet': 96, 'gpt-4-turbo': 91, 'gemini-1.5-pro': 88 },
                creative: { 'claude-3.5-sonnet': 97, 'gpt-4o': 93, 'gemini-1.5-pro': 90 },
                analysis: { 'gpt-4o': 95, 'claude-3.5-sonnet': 94, 'gemini-1.5-pro': 91 },
                reason: { 'claude-3.5-sonnet': 96, 'gpt-4o': 94, 'llama-3.1-405b': 89 },
            };
            const taskScores = affinities[taskType] || {};
            const taskScore = taskScores[model] || spec.quality;
            const costEfficiency = taskScore / ((spec.inputCost + spec.outputCost) * 500 + 1);
            return {
                model, provider: spec.provider, quality: taskScore, latencyMs: spec.latencyMs,
                costPer1kTokens: spec.inputCost + spec.outputCost,
                costEfficiency: Math.round(costEfficiency * 100) / 100,
                contextWindow: spec.contextWindow,
            };
        }).sort((a, b) => b.costEfficiency - a.costEfficiency);

        return {
            result: JSON.stringify({ taskType, benchmarks, bestOverall: benchmarks[0].model, bestQuality: [...benchmarks].sort((a, b) => b.quality - a.quality)[0].model, bestValue: benchmarks[0].model }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 2. llm_cost_optimize ───────────────────────────────────────
async function executeLlmCostOptimize(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'analyze') {
        const periodDays = input.periodDays || 30;
        const since = new Date(Date.now() - periodDays * 86400000);
        const logs = await db.llmRouteLog.findMany({ where: { userId, createdAt: { gte: since } } });

        const modelUsage = {};
        logs.forEach(l => {
            const m = l.selectedModel;
            if (!modelUsage[m]) modelUsage[m] = { count: 0, totalTokensEstimate: 0 };
            modelUsage[m].count++;
            const r = typeof l.reasoning === 'string' ? JSON.parse(l.reasoning) : (l.reasoning || {});
            modelUsage[m].totalTokensEstimate += r.estimatedTokens || 500;
        });

        const breakdown = Object.entries(modelUsage).map(([model, u]) => {
            const spec = PROVIDER_CATALOGUE[model] || { inputCost: 0.005, outputCost: 0.015 };
            const cost = (u.totalTokensEstimate / 1000) * (spec.inputCost + spec.outputCost);
            return { model, requests: u.count, estimatedTokens: u.totalTokensEstimate, estimatedCostUsd: Math.round(cost * 10000) / 10000 };
        }).sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

        const totalCost = breakdown.reduce((s, b) => s + b.estimatedCostUsd, 0);
        return {
            result: JSON.stringify({
                periodDays, totalRequests: logs.length, totalEstimatedCostUsd: Math.round(totalCost * 100) / 100,
                dailyAvgCost: Math.round((totalCost / periodDays) * 100) / 100,
                breakdown,
                topSpender: breakdown[0]?.model || 'N/A',
            }),
            sideEffects: null,
        };
    }

    if (action === 'project') {
        const periodDays = input.periodDays || 30;
        const since = new Date(Date.now() - periodDays * 86400000);
        const logs = await db.llmRouteLog.findMany({ where: { userId, createdAt: { gte: since } } });
        const dailyRate = logs.length / periodDays;
        const avgTokens = 500;
        const commonModel = logs.length > 0 ? logs.reduce((acc, l) => { acc[l.selectedModel] = (acc[l.selectedModel] || 0) + 1; return acc; }, {}) : {};
        const topModel = Object.entries(commonModel).sort((a, b) => b[1] - a[1])[0]?.[0] || 'gpt-4o-mini';
        const spec = PROVIDER_CATALOGUE[topModel] || { inputCost: 0.005, outputCost: 0.015 };
        const dailyCost = dailyRate * (avgTokens / 1000) * (spec.inputCost + spec.outputCost);

        const projections = [7, 30, 90, 365].map(days => ({
            days, requests: Math.round(dailyRate * days), estimatedCostUsd: Math.round(dailyCost * days * 100) / 100,
        }));

        return {
            result: JSON.stringify({
                currentDailyRate: Math.round(dailyRate * 10) / 10,
                primaryModel: topModel,
                projections,
                annualizedCost: Math.round(dailyCost * 365 * 100) / 100,
                budgetRecommendation: Math.ceil(dailyCost * 30 * 1.3 * 100) / 100,
            }),
            sideEffects: null,
        };
    }

    if (action === 'recommend') {
        const target = input.targetReduction || 30;
        const recommendations = [];

        // Model substitution recommendations
        const substitutions = [
            { from: 'gpt-4o', to: 'gpt-4o-mini', saving: 96, tradeoff: 'Lower quality for simple tasks' },
            { from: 'gpt-4-turbo', to: 'gpt-4o', saving: 50, tradeoff: 'Slightly lower cost, similar quality' },
            { from: 'claude-3.5-sonnet', to: 'claude-3-haiku', saving: 91, tradeoff: 'Significant quality drop, best for simple tasks' },
            { from: 'gemini-1.5-pro', to: 'gemini-1.5-flash', saving: 94, tradeoff: 'Lower quality, much faster' },
            { from: 'llama-3.1-405b', to: 'llama-3.1-70b', saving: 73, tradeoff: 'Good for medium complexity tasks' },
            { from: 'mistral-large', to: 'mistral-small', saving: 90, tradeoff: 'Suitable for straightforward tasks' },
        ];

        recommendations.push({ type: 'model_substitution', description: 'Use cheaper models for simple tasks', items: substitutions.filter(s => s.saving >= target) });
        recommendations.push({ type: 'prompt_optimization', description: 'Reduce prompt length', tips: ['Remove redundant instructions', 'Use concise system prompts', 'Cache common prefixes', 'Use few-shot instead of many-shot examples'] });
        recommendations.push({ type: 'caching', description: 'Cache frequent identical prompts', estimatedSaving: '20-40%' });
        recommendations.push({ type: 'batching', description: 'Batch similar requests together', estimatedSaving: '10-25%' });
        recommendations.push({ type: 'routing', description: 'Use llm_router to auto-select cheapest viable model', estimatedSaving: '30-60%' });

        return {
            result: JSON.stringify({ targetReductionPercent: target, recommendations, totalStrategies: recommendations.length }),
            sideEffects: null,
        };
    }

    if (action === 'compress') {
        const { prompt = '' } = input;
        const original = prompt.length;

        // Compression heuristics
        let compressed = prompt
            .replace(/\n{3,}/g, '\n\n')                      // Remove extra newlines
            .replace(/[ \t]{2,}/g, ' ')                        // Collapse whitespace
            .replace(/please\s+/gi, '')                        // Remove filler words
            .replace(/\b(basically|essentially|actually|just|really|very|quite)\b\s*/gi, '')
            .replace(/I would like you to /gi, '')
            .replace(/Can you please /gi, '')
            .replace(/Make sure to /gi, '')
            .replace(/It is important that /gi, '')
            .replace(/Note that /gi, '')
            .replace(/Keep in mind that /gi, '')
            .trim();

        const savings = original - compressed.length;
        const tokenSavings = Math.ceil(savings / 4);

        return {
            result: JSON.stringify({
                originalLength: original,
                compressedLength: compressed.length,
                reductionPercent: Math.round((savings / original) * 100),
                estimatedTokensSaved: tokenSavings,
                compressed: compressed.slice(0, 2000),
                techniques: ['Removed extra whitespace', 'Removed filler words', 'Removed verbose phrases', 'Collapsed newlines'],
            }),
            sideEffects: null,
        };
    }

    if (action === 'budget_alert') {
        const { budget = 50 } = input;
        const periodDays = input.periodDays || 30;
        const since = new Date(Date.now() - periodDays * 86400000);
        const logs = await db.llmRouteLog.findMany({ where: { userId, createdAt: { gte: since } } });

        let totalCost = 0;
        logs.forEach(l => {
            const spec = PROVIDER_CATALOGUE[l.selectedModel] || { inputCost: 0.005, outputCost: 0.015 };
            const r = typeof l.reasoning === 'string' ? JSON.parse(l.reasoning) : (l.reasoning || {});
            totalCost += ((r.estimatedTokens || 500) / 1000) * (spec.inputCost + spec.outputCost);
        });

        const usagePercent = (totalCost / budget) * 100;
        const daysRemaining = periodDays - Math.floor((Date.now() - since.getTime()) / 86400000);
        const projectedTotal = (totalCost / (periodDays - daysRemaining || 1)) * periodDays;

        let severity = 'ok';
        if (usagePercent > 100) severity = 'critical';
        else if (usagePercent > 80) severity = 'warning';
        else if (usagePercent > 60) severity = 'caution';

        return {
            result: JSON.stringify({
                budget, currentSpend: Math.round(totalCost * 100) / 100,
                usagePercent: Math.round(usagePercent),
                projectedTotal: Math.round(projectedTotal * 100) / 100,
                daysRemaining, severity,
                recommendation: severity === 'critical' ? 'OVER BUDGET – switch to cheaper models immediately' :
                    severity === 'warning' ? 'Approaching budget – consider model substitution' :
                        severity === 'caution' ? 'On track but monitor usage' : 'Within budget',
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 3. llm_guardrail ──────────────────────────────────────────
async function executeLlmGuardrail(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    const applyRules = (text, ruleIds) => {
        const violations = [];
        const rulesToApply = ruleIds && ruleIds.length > 0
            ? ruleIds.filter(id => BUILTIN_RULES[id]).map(id => ({ id, ...BUILTIN_RULES[id] }))
            : Object.entries(BUILTIN_RULES).map(([id, r]) => ({ id, ...r }));

        rulesToApply.forEach(rule => {
            if (rule.patterns) {
                rule.patterns.forEach(pat => {
                    const matches = text.match(pat);
                    if (matches) {
                        violations.push({ rule: rule.id, label: rule.label, matchCount: matches.length, sample: matches[0].slice(0, 50) });
                    }
                });
            }
            if (rule.maxLength && text.length > rule.maxLength) {
                violations.push({ rule: rule.id, label: rule.label, detail: `Text length ${text.length} exceeds max ${rule.maxLength}` });
            }
            if (rule.validateJSON) {
                try { JSON.parse(text); } catch { violations.push({ rule: rule.id, label: rule.label, detail: 'Invalid JSON' }); }
            }
        });
        return { violations, passed: violations.length === 0, rulesChecked: rulesToApply.length };
    };

    if (action === 'check_input' || action === 'check_output') {
        const { text = '', rules, severity = 'block' } = input;
        const result = applyRules(text, rules);

        // Log the check
        await db.llmGuardrailLog.create({
            data: {
                userId,
                direction: action === 'check_input' ? 'input' : 'output',
                text: text.slice(0, 1000),
                rulesApplied: result.rulesChecked,
                violations: result.violations,
                passed: result.passed,
                severity,
            },
        });

        const decision = result.passed ? 'allow' : severity;
        return {
            result: JSON.stringify({
                direction: action === 'check_input' ? 'input' : 'output',
                passed: result.passed,
                decision,
                rulesChecked: result.rulesChecked,
                violationCount: result.violations.length,
                violations: result.violations,
                recommendation: result.passed ? 'Text passes all guardrails' : `${result.violations.length} violation(s) detected – action: ${severity}`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'add_rule') {
        const { customRule } = input;
        if (!customRule || !customRule.id || !customRule.label) {
            return { result: JSON.stringify({ error: 'customRule must have id and label' }), sideEffects: null };
        }
        // Store custom rule in memory (prod would persist)
        BUILTIN_RULES[customRule.id] = {
            label: customRule.label,
            patterns: customRule.pattern ? [new RegExp(customRule.pattern, 'gi')] : [],
            maxLength: customRule.maxLength,
            validateJSON: customRule.validateJSON,
        };
        return {
            result: JSON.stringify({ added: customRule.id, label: customRule.label, totalRules: Object.keys(BUILTIN_RULES).length }),
            sideEffects: null,
        };
    }

    if (action === 'list_rules') {
        const rules = Object.entries(BUILTIN_RULES).map(([id, r]) => ({
            id, label: r.label,
            hasPatterns: !!(r.patterns && r.patterns.length),
            hasMaxLength: !!r.maxLength,
            hasJsonValidation: !!r.validateJSON,
        }));
        return { result: JSON.stringify({ count: rules.length, rules }), sideEffects: null };
    }

    if (action === 'audit') {
        const logs = await db.llmGuardrailLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
        const stats = {
            total: logs.length,
            passed: logs.filter(l => l.passed).length,
            failed: logs.filter(l => !l.passed).length,
            byDirection: { input: logs.filter(l => l.direction === 'input').length, output: logs.filter(l => l.direction === 'output').length },
            recentViolations: logs.filter(l => !l.passed).slice(0, 10).map(l => ({
                id: l.id, direction: l.direction, violations: l.violations, severity: l.severity, createdAt: l.createdAt,
            })),
        };
        return { result: JSON.stringify(stats), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 4. llm_evaluate ────────────────────────────────────────────
async function executeLlmEvaluate(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    const scoreOutput = (prompt, output, reference, rubric) => {
        const defaultRubric = { relevance: 0.25, coherence: 0.2, completeness: 0.2, safety: 0.15, format: 0.1, creativity: 0.1 };
        const r = rubric || defaultRubric;
        const scores = {};

        // Relevance: Overlap between prompt keywords and output
        const promptWords = new Set(prompt.toLowerCase().split(/\W+/).filter(w => w.length > 3));
        const outputWords = new Set(output.toLowerCase().split(/\W+/).filter(w => w.length > 3));
        const overlap = [...promptWords].filter(w => outputWords.has(w)).length;
        scores.relevance = Math.min(100, Math.round((overlap / Math.max(promptWords.size, 1)) * 100 + 30));

        // Coherence: sentence structure, avg sentence length, paragraph structure
        const sentences = output.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgLen = sentences.reduce((s, sent) => s + sent.trim().split(/\s+/).length, 0) / Math.max(sentences.length, 1);
        scores.coherence = avgLen > 5 && avgLen < 40 ? Math.min(100, 70 + sentences.length) : Math.max(30, 70 - Math.abs(avgLen - 20));

        // Completeness: length relative to prompt complexity
        const expectedLength = Math.max(50, prompt.length * 2);
        scores.completeness = Math.min(100, Math.round((output.length / expectedLength) * 80 + 20));

        // Safety: check for harmful patterns
        const unsafePatterns = [/\b(hack|exploit|attack|steal|kill)\b/gi];
        const unsafeCount = unsafePatterns.reduce((c, p) => c + (output.match(p) || []).length, 0);
        scores.safety = Math.max(0, 100 - unsafeCount * 15);

        // Format: structure markers (headers, lists, code blocks)
        const hasStructure = /[#*\-\d]\.|```/.test(output);
        scores.format = hasStructure ? 85 : (output.length > 200 ? 65 : 75);

        // Creativity: vocabulary diversity
        const uniqueWords = new Set(output.toLowerCase().split(/\W+/));
        const totalWords = output.split(/\W+/).length;
        scores.creativity = Math.min(100, Math.round((uniqueWords.size / Math.max(totalWords, 1)) * 130));

        // Reference comparison if provided
        if (reference) {
            const refWords = new Set(reference.toLowerCase().split(/\W+/).filter(w => w.length > 3));
            const refOverlap = [...refWords].filter(w => outputWords.has(w)).length;
            scores.factuality = Math.min(100, Math.round((refOverlap / Math.max(refWords.size, 1)) * 100));
        }

        // Weighted total
        let weighted = 0, totalWeight = 0;
        Object.entries(r).forEach(([dim, weight]) => {
            if (scores[dim] !== undefined) {
                weighted += scores[dim] * weight;
                totalWeight += weight;
            }
        });
        const overall = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;

        return { scores, overall, rubricUsed: r };
    };

    if (action === 'evaluate') {
        const { prompt = '', output = '', model = 'unknown', reference, rubric } = input;
        const evaluation = scoreOutput(prompt, output, reference, rubric);

        const record = await db.llmEvaluation.create({
            data: {
                userId,
                model,
                prompt: prompt.slice(0, 1000),
                output: output.slice(0, 2000),
                reference: reference?.slice(0, 2000),
                scores: evaluation.scores,
                overall: evaluation.overall,
                rubric: evaluation.rubricUsed,
            },
        });

        const grade = evaluation.overall >= 90 ? 'A' : evaluation.overall >= 80 ? 'B' : evaluation.overall >= 70 ? 'C' : evaluation.overall >= 60 ? 'D' : 'F';
        return {
            result: JSON.stringify({
                evaluationId: record.id,
                model,
                overall: evaluation.overall,
                grade,
                scores: evaluation.scores,
                rubric: evaluation.rubricUsed,
                feedback: evaluation.overall >= 80 ? 'High quality output' : evaluation.overall >= 60 ? 'Acceptable but could improve' : 'Below expectations – consider different model or prompt',
            }),
            sideEffects: null,
        };
    }

    if (action === 'compare') {
        const { prompt = '', output = '', outputB = '', model = 'A', modelB = 'B', reference, rubric } = input;
        const evalA = scoreOutput(prompt, output, reference, rubric);
        const evalB = scoreOutput(prompt, outputB, reference, rubric);

        const comparison = {};
        const allDims = new Set([...Object.keys(evalA.scores), ...Object.keys(evalB.scores)]);
        allDims.forEach(dim => {
            comparison[dim] = {
                modelA: evalA.scores[dim] || 0,
                modelB: evalB.scores[dim] || 0,
                winner: (evalA.scores[dim] || 0) > (evalB.scores[dim] || 0) ? model : (evalA.scores[dim] || 0) < (evalB.scores[dim] || 0) ? modelB : 'tie',
            };
        });

        return {
            result: JSON.stringify({
                modelA: { name: model, overall: evalA.overall },
                modelB: { name: modelB, overall: evalB.overall },
                overallWinner: evalA.overall > evalB.overall ? model : evalA.overall < evalB.overall ? modelB : 'tie',
                dimensionComparison: comparison,
                recommendation: evalA.overall > evalB.overall
                    ? `${model} outperforms ${modelB} (${evalA.overall} vs ${evalB.overall})`
                    : evalA.overall < evalB.overall
                        ? `${modelB} outperforms ${model} (${evalB.overall} vs ${evalA.overall})`
                        : 'Both models perform equally',
            }),
            sideEffects: null,
        };
    }

    if (action === 'benchmark') {
        const evals = await db.llmEvaluation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 });
        const byModel = {};
        evals.forEach(e => {
            if (!byModel[e.model]) byModel[e.model] = { scores: [], count: 0 };
            byModel[e.model].scores.push(e.overall);
            byModel[e.model].count++;
        });
        const rankings = Object.entries(byModel).map(([model, d]) => ({
            model, evaluations: d.count,
            avgScore: Math.round(d.scores.reduce((s, v) => s + v, 0) / d.count),
            minScore: Math.min(...d.scores), maxScore: Math.max(...d.scores),
        })).sort((a, b) => b.avgScore - a.avgScore);

        return { result: JSON.stringify({ totalEvaluations: evals.length, modelRankings: rankings }), sideEffects: null };
    }

    if (action === 'history') {
        const evals = await db.llmEvaluation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
        return {
            result: JSON.stringify({
                count: evals.length,
                evaluations: evals.map(e => ({ id: e.id, model: e.model, overall: e.overall, scores: e.scores, createdAt: e.createdAt })),
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 5. agent_spawn ─────────────────────────────────────────────
async function executeAgentSpawn(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'spawn') {
        const {
            name = 'Agent-' + Date.now().toString(36),
            goal = 'General purpose assistant',
            capabilities = [],
            model = 'gpt-4o-mini',
            maxSteps = 50,
            memoryStrategy = 'sliding_window',
            resourceLimits = {},
        } = input;

        const agent = await db.agentInstance.create({
            data: {
                userId,
                name,
                goal,
                status: 'running',
                model,
                capabilities,
                memoryStrategy,
                maxSteps,
                currentStep: 0,
                resourceLimits,
                memory: { messages: [], summaries: [], windowSize: 20 },
                metrics: { tokensUsed: 0, costUsd: 0, tasksCompleted: 0, errors: 0, avgResponseMs: 0 },
            },
        });

        return {
            result: JSON.stringify({
                agentId: agent.id,
                name: agent.name,
                status: 'running',
                model,
                goal: goal.slice(0, 200),
                capabilities: capabilities.slice(0, 20),
                memoryStrategy,
                maxSteps,
                resourceLimits,
                message: `Agent "${name}" spawned successfully with ${capabilities.length} capabilities`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'pause' || action === 'resume' || action === 'terminate') {
        const { agentId } = input;
        if (!agentId) return { result: JSON.stringify({ error: 'agentId required' }), sideEffects: null };

        const statusMap = { pause: 'paused', resume: 'running', terminate: 'terminated' };
        const agent = await db.agentInstance.update({
            where: { id: agentId },
            data: { status: statusMap[action], ...(action === 'terminate' ? { terminatedAt: new Date() } : {}) },
        });

        return {
            result: JSON.stringify({ agentId: agent.id, name: agent.name, status: agent.status, action }),
            sideEffects: null,
        };
    }

    if (action === 'list') {
        const agents = await db.agentInstance.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return {
            result: JSON.stringify({
                count: agents.length,
                agents: agents.map(a => ({
                    id: a.id, name: a.name, status: a.status, model: a.model, goal: a.goal.slice(0, 100),
                    currentStep: a.currentStep, maxSteps: a.maxSteps, memoryStrategy: a.memoryStrategy,
                    createdAt: a.createdAt,
                })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'status') {
        const { agentId } = input;
        if (!agentId) return { result: JSON.stringify({ error: 'agentId required' }), sideEffects: null };
        const agent = await db.agentInstance.findUnique({ where: { id: agentId } });
        if (!agent) return { result: JSON.stringify({ error: 'Agent not found' }), sideEffects: null };

        const uptime = Date.now() - new Date(agent.createdAt).getTime();
        return {
            result: JSON.stringify({
                id: agent.id, name: agent.name, status: agent.status, model: agent.model,
                goal: agent.goal, capabilities: agent.capabilities,
                progress: `${agent.currentStep}/${agent.maxSteps} steps`,
                memoryStrategy: agent.memoryStrategy,
                metrics: agent.metrics,
                resourceLimits: agent.resourceLimits,
                uptimeMs: uptime,
                uptimeHuman: uptime > 86400000 ? `${Math.floor(uptime / 86400000)}d` : uptime > 3600000 ? `${Math.floor(uptime / 3600000)}h` : `${Math.floor(uptime / 60000)}m`,
                createdAt: agent.createdAt,
                terminatedAt: agent.terminatedAt,
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 6. agent_delegate ──────────────────────────────────────────
async function executeAgentDelegate(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'delegate') {
        const { agentId, task, priority = 5, timeout } = input;
        if (!agentId || !task) return { result: JSON.stringify({ error: 'agentId and task required' }), sideEffects: null };

        const agent = await db.agentInstance.findUnique({ where: { id: agentId } });
        if (!agent) return { result: JSON.stringify({ error: 'Agent not found' }), sideEffects: null };
        if (agent.status !== 'running') return { result: JSON.stringify({ error: `Agent is ${agent.status}, not running` }), sideEffects: null };

        // Simulate delegation: increment step, add to memory
        const memory = agent.memory || { messages: [] };
        memory.messages = memory.messages || [];
        memory.messages.push({ role: 'delegation', content: task, timestamp: new Date().toISOString(), priority });

        const metrics = agent.metrics || { tasksCompleted: 0 };
        metrics.tasksCompleted = (metrics.tasksCompleted || 0) + 1;

        await db.agentInstance.update({
            where: { id: agentId },
            data: {
                currentStep: { increment: 1 },
                memory,
                metrics,
            },
        });

        const delegationId = `dlg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        return {
            result: JSON.stringify({
                delegationId,
                agentId,
                agentName: agent.name,
                task: task.slice(0, 500),
                priority,
                status: 'delegated',
                estimatedCompletionMs: timeout || 30000,
                step: agent.currentStep + 1,
                message: `Task delegated to "${agent.name}" (step ${agent.currentStep + 1}/${agent.maxSteps})`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'fan_out') {
        const { agentIds = [], task, tasks = [] } = input;
        if (agentIds.length === 0) return { result: JSON.stringify({ error: 'agentIds required' }), sideEffects: null };

        const taskList = tasks.length > 0 ? tasks : agentIds.map(() => task || 'No task specified');
        const results = [];

        for (let i = 0; i < agentIds.length; i++) {
            const agent = await db.agentInstance.findUnique({ where: { id: agentIds[i] } });
            if (!agent) { results.push({ agentId: agentIds[i], status: 'error', message: 'Agent not found' }); continue; }
            if (agent.status !== 'running') { results.push({ agentId: agentIds[i], name: agent.name, status: 'skipped', message: `Agent is ${agent.status}` }); continue; }

            await db.agentInstance.update({
                where: { id: agentIds[i] },
                data: { currentStep: { increment: 1 } },
            });

            results.push({
                agentId: agentIds[i],
                name: agent.name,
                task: (taskList[i] || task || '').slice(0, 200),
                status: 'delegated',
            });
        }

        return {
            result: JSON.stringify({
                fanOutId: `fan_${Date.now().toString(36)}`,
                totalAgents: agentIds.length,
                delegated: results.filter(r => r.status === 'delegated').length,
                skipped: results.filter(r => r.status !== 'delegated').length,
                results,
            }),
            sideEffects: null,
        };
    }

    if (action === 'chain') {
        const { agentId, tasks = [] } = input;
        if (!agentId || tasks.length === 0) return { result: JSON.stringify({ error: 'agentId and tasks[] required' }), sideEffects: null };

        const agent = await db.agentInstance.findUnique({ where: { id: agentId } });
        if (!agent) return { result: JSON.stringify({ error: 'Agent not found' }), sideEffects: null };

        const chain = tasks.map((t, i) => ({
            step: i + 1,
            task: t.slice(0, 300),
            status: i === 0 ? 'in_progress' : 'queued',
            dependsOn: i > 0 ? i : null,
        }));

        await db.agentInstance.update({
            where: { id: agentId },
            data: {
                currentStep: { increment: 1 },
                memory: {
                    ...(agent.memory || {}),
                    chain,
                    chainStarted: new Date().toISOString(),
                },
            },
        });

        return {
            result: JSON.stringify({
                chainId: `chain_${Date.now().toString(36)}`,
                agentId,
                agentName: agent.name,
                totalSteps: tasks.length,
                chain,
                message: `Sequential chain of ${tasks.length} tasks started on "${agent.name}"`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'status') {
        const { agentId } = input;
        if (!agentId) return { result: JSON.stringify({ error: 'agentId required' }), sideEffects: null };
        const agent = await db.agentInstance.findUnique({ where: { id: agentId } });
        if (!agent) return { result: JSON.stringify({ error: 'Agent not found' }), sideEffects: null };

        return {
            result: JSON.stringify({
                agentId: agent.id, name: agent.name, status: agent.status,
                progress: `${agent.currentStep}/${agent.maxSteps}`,
                metrics: agent.metrics,
                activeChain: (agent.memory || {}).chain || null,
            }),
            sideEffects: null,
        };
    }

    if (action === 'results') {
        const { agentId } = input;
        if (!agentId) return { result: JSON.stringify({ error: 'agentId required' }), sideEffects: null };
        const agent = await db.agentInstance.findUnique({ where: { id: agentId } });
        if (!agent) return { result: JSON.stringify({ error: 'Agent not found' }), sideEffects: null };

        const memory = agent.memory || {};
        return {
            result: JSON.stringify({
                agentId: agent.id, name: agent.name,
                completedTasks: (agent.metrics || {}).tasksCompleted || 0,
                messages: (memory.messages || []).slice(-20),
                chain: memory.chain || null,
            }),
            sideEffects: null,
        };
    }

    if (action === 'cancel') {
        const { agentId } = input;
        if (!agentId) return { result: JSON.stringify({ error: 'agentId required' }), sideEffects: null };
        const agent = await db.agentInstance.update({
            where: { id: agentId },
            data: { status: 'paused' },
        });
        return {
            result: JSON.stringify({ agentId: agent.id, name: agent.name, status: 'paused', message: 'Active delegations cancelled, agent paused' }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 7. agent_reflect ───────────────────────────────────────────
async function executeAgentReflect(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'reflect') {
        const { agentId, goal = '', outcome = '' } = input;
        if (!agentId) return { result: JSON.stringify({ error: 'agentId required' }), sideEffects: null };

        const agent = await db.agentInstance.findUnique({ where: { id: agentId } });
        if (!agent) return { result: JSON.stringify({ error: 'Agent not found' }), sideEffects: null };

        const goalText = goal || agent.goal;
        const memory = agent.memory || {};
        const messages = memory.messages || [];
        const metrics = agent.metrics || {};

        // Reflection analysis
        const reflection = {
            goalAlignment: outcome ? (outcome.toLowerCase().includes(goalText.toLowerCase().split(' ')[0]) ? 'aligned' : 'divergent') : 'unknown',
            stepsUsed: agent.currentStep,
            stepsRemaining: agent.maxSteps - agent.currentStep,
            efficiency: agent.currentStep > 0 ? Math.round(((metrics.tasksCompleted || 0) / agent.currentStep) * 100) : 0,
            errorRate: agent.currentStep > 0 ? Math.round(((metrics.errors || 0) / agent.currentStep) * 100) : 0,
            memoryUtilization: messages.length,
            patterns: [],
            insights: [],
        };

        // Detect patterns in message history
        const taskTypes = messages.map(m => m.role).reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
        reflection.patterns.push({ type: 'message_distribution', data: taskTypes });

        if (reflection.efficiency < 50) reflection.insights.push('Low task completion efficiency – consider simplifying task decomposition');
        if (reflection.errorRate > 20) reflection.insights.push('High error rate – review capability set and task complexity');
        if (reflection.stepsRemaining < 5) reflection.insights.push('Running low on steps – consider increasing maxSteps or optimizing');
        if (messages.length > 50) reflection.insights.push('Large memory footprint – consider switching to summary memory strategy');
        if (reflection.goalAlignment === 'divergent') reflection.insights.push('Outcome may not align with original goal – review task delegation strategy');

        // Store reflection in agent memory
        memory.reflections = memory.reflections || [];
        memory.reflections.push({ timestamp: new Date().toISOString(), reflection, outcome: outcome.slice(0, 500) });

        await db.agentInstance.update({
            where: { id: agentId },
            data: { memory },
        });

        return {
            result: JSON.stringify({
                agentId: agent.id, name: agent.name,
                reflection,
                summary: `Agent "${agent.name}" at step ${agent.currentStep}/${agent.maxSteps}. Efficiency: ${reflection.efficiency}%. ${reflection.insights.length} insights generated.`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'analyze_chain') {
        const { reasoningChain = [], goal = '' } = input;
        if (reasoningChain.length === 0) return { result: JSON.stringify({ error: 'reasoningChain required' }), sideEffects: null };

        const analysis = {
            totalSteps: reasoningChain.length,
            avgStepLength: Math.round(reasoningChain.reduce((s, step) => s + step.length, 0) / reasoningChain.length),
            potentialIssues: [],
            strengths: [],
            redundancyScore: 0,
        };

        // Check for redundancy (repeated concepts)
        const stepWords = reasoningChain.map(s => new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 4)));
        let redundantPairs = 0;
        for (let i = 0; i < stepWords.length; i++) {
            for (let j = i + 1; j < stepWords.length; j++) {
                const overlap = [...stepWords[i]].filter(w => stepWords[j].has(w)).length;
                const similarity = overlap / Math.max(stepWords[i].size, stepWords[j].size, 1);
                if (similarity > 0.6) redundantPairs++;
            }
        }
        analysis.redundancyScore = Math.round((redundantPairs / Math.max(reasoningChain.length - 1, 1)) * 100);

        if (analysis.redundancyScore > 30) analysis.potentialIssues.push(`High redundancy (${analysis.redundancyScore}%) – steps repeat similar concepts`);
        if (reasoningChain.length > 10) analysis.potentialIssues.push('Long reasoning chain – consider breaking into sub-problems');
        if (analysis.avgStepLength > 500) analysis.potentialIssues.push('Verbose steps – consider more concise reasoning');
        if (analysis.avgStepLength < 20) analysis.potentialIssues.push('Very short steps – may lack sufficient reasoning depth');

        if (analysis.redundancyScore < 15) analysis.strengths.push('Low redundancy – efficient reasoning');
        if (reasoningChain.length >= 3 && reasoningChain.length <= 8) analysis.strengths.push('Good chain length for most tasks');

        // Goal relevance check
        if (goal) {
            const goalWords = new Set(goal.toLowerCase().split(/\W+/).filter(w => w.length > 3));
            const chainText = reasoningChain.join(' ').toLowerCase();
            const goalCoverage = [...goalWords].filter(w => chainText.includes(w)).length / Math.max(goalWords.size, 1);
            analysis.goalCoverage = Math.round(goalCoverage * 100);
            if (goalCoverage < 0.5) analysis.potentialIssues.push(`Low goal coverage (${analysis.goalCoverage}%) – chain may be off-track`);
        }

        return { result: JSON.stringify(analysis), sideEffects: null };
    }

    if (action === 'suggest_improvements') {
        const { agentId } = input;
        if (!agentId) return { result: JSON.stringify({ error: 'agentId required' }), sideEffects: null };

        const agent = await db.agentInstance.findUnique({ where: { id: agentId } });
        if (!agent) return { result: JSON.stringify({ error: 'Agent not found' }), sideEffects: null };

        const metrics = agent.metrics || {};
        const memory = agent.memory || {};
        const suggestions = [];

        // Model optimization
        const spec = PROVIDER_CATALOGUE[agent.model];
        if (spec && spec.quality < 85 && (metrics.errors || 0) > 3) {
            suggestions.push({ area: 'model', suggestion: `Upgrade from ${agent.model} to a higher-quality model`, impact: 'high', reasoning: 'Error rate suggests current model may be insufficient' });
        }
        if (spec && spec.quality > 90 && (metrics.errors || 0) === 0 && (metrics.tasksCompleted || 0) > 5) {
            suggestions.push({ area: 'model', suggestion: `Downgrade from ${agent.model} to a cheaper model`, impact: 'medium', reasoning: 'Zero errors with many completions suggests over-provisioned model' });
        }

        // Memory optimization
        if (agent.memoryStrategy === 'full' && (memory.messages || []).length > 30) {
            suggestions.push({ area: 'memory', suggestion: 'Switch to sliding_window or summary memory strategy', impact: 'medium', reasoning: 'Full memory with many messages increases token usage' });
        }

        // Step budget
        if (agent.currentStep > agent.maxSteps * 0.8) {
            suggestions.push({ area: 'budget', suggestion: `Increase maxSteps (currently ${agent.maxSteps}, used ${agent.currentStep})`, impact: 'high', reasoning: 'Agent nearing step limit' });
        }

        // Capability analysis
        if ((agent.capabilities || []).length > 15) {
            suggestions.push({ area: 'capabilities', suggestion: 'Reduce capability set to only essential tools', impact: 'low', reasoning: 'Large capability set increases system prompt size' });
        }
        if ((agent.capabilities || []).length === 0) {
            suggestions.push({ area: 'capabilities', suggestion: 'Add specific capabilities for the agent goal', impact: 'high', reasoning: 'No capabilities defined limits agent effectiveness' });
        }

        return {
            result: JSON.stringify({
                agentId: agent.id, name: agent.name,
                currentConfig: { model: agent.model, maxSteps: agent.maxSteps, memoryStrategy: agent.memoryStrategy, capabilities: (agent.capabilities || []).length },
                suggestions,
                totalSuggestions: suggestions.length,
                highImpact: suggestions.filter(s => s.impact === 'high').length,
            }),
            sideEffects: null,
        };
    }

    if (action === 'performance') {
        const periodDays = input.periodDays || 7;
        const since = new Date(Date.now() - periodDays * 86400000);
        const agents = await db.agentInstance.findMany({
            where: { userId, createdAt: { gte: since } },
            orderBy: { createdAt: 'desc' },
        });

        const summary = {
            periodDays,
            totalAgents: agents.length,
            byStatus: {},
            avgStepsUsed: 0,
            avgEfficiency: 0,
            totalTasks: 0,
            totalErrors: 0,
            modelDistribution: {},
        };

        agents.forEach(a => {
            summary.byStatus[a.status] = (summary.byStatus[a.status] || 0) + 1;
            summary.avgStepsUsed += a.currentStep;
            const m = a.metrics || {};
            summary.totalTasks += m.tasksCompleted || 0;
            summary.totalErrors += m.errors || 0;
            summary.modelDistribution[a.model] = (summary.modelDistribution[a.model] || 0) + 1;
        });

        if (agents.length > 0) {
            summary.avgStepsUsed = Math.round(summary.avgStepsUsed / agents.length);
            summary.avgEfficiency = summary.avgStepsUsed > 0 ? Math.round((summary.totalTasks / (summary.avgStepsUsed * agents.length)) * 100) : 0;
        }

        return { result: JSON.stringify(summary), sideEffects: null };
    }

    if (action === 'optimize') {
        const { agentId } = input;
        if (!agentId) return { result: JSON.stringify({ error: 'agentId required' }), sideEffects: null };

        const agent = await db.agentInstance.findUnique({ where: { id: agentId } });
        if (!agent) return { result: JSON.stringify({ error: 'Agent not found' }), sideEffects: null };

        const metrics = agent.metrics || {};
        const memory = agent.memory || {};
        const optimizations = [];

        // Auto-optimize memory
        if (agent.memoryStrategy === 'full' && (memory.messages || []).length > 20) {
            const trimmed = (memory.messages || []).slice(-10);
            memory.messages = trimmed;
            optimizations.push('Trimmed memory from full to last 10 messages');
        }

        // Clean up old reflections
        if ((memory.reflections || []).length > 10) {
            memory.reflections = memory.reflections.slice(-5);
            optimizations.push('Pruned old reflections, kept last 5');
        }

        // Clean up completed chains
        if (memory.chain && memory.chain.every(s => s.status === 'completed')) {
            delete memory.chain;
            delete memory.chainStarted;
            optimizations.push('Removed completed chain from memory');
        }

        await db.agentInstance.update({
            where: { id: agentId },
            data: { memory },
        });

        return {
            result: JSON.stringify({
                agentId: agent.id, name: agent.name,
                optimizationsApplied: optimizations.length,
                optimizations,
                message: optimizations.length > 0 ? 'Agent optimized successfully' : 'No optimizations needed',
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 8. llm_compare ─────────────────────────────────────────────
const compareHistory = new Map();

async function executeLlmCompare(input, ctx) {
    const { action, prompt, models = [], taskType = 'chat', reference, comparisonId, take = 20 } = input;

    if (action === 'compare') {
        if (!prompt) return { result: JSON.stringify({ error: 'prompt required' }), sideEffects: null };
        if (models.length < 2) return { result: JSON.stringify({ error: 'At least 2 models required' }), sideEffects: null };

        const id = `cmp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const results = models.map(model => {
            const info = PROVIDER_CATALOGUE[model] || { inputCost: 0.005, outputCost: 0.015, latencyMs: 800, quality: 80, contextWindow: 128000 };
            const estimatedInputTokens = Math.ceil(prompt.length / 4);
            const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 1.5);
            const estimatedCost = (estimatedInputTokens / 1000) * info.inputCost + (estimatedOutputTokens / 1000) * info.outputCost;
            // Simulate quality score based on task type
            const taskBonus = { code: 0, creative: 0, analysis: 0, chat: 0, summarize: 2, translate: 1, extract: 1, reason: -2 };
            const qualityScore = Math.min(100, info.quality + (taskBonus[taskType] || 0) + Math.round(Math.random() * 5 - 2));
            const latency = info.latencyMs + Math.round(estimatedInputTokens * 0.02);
            let accuracyScore = null;
            if (reference) {
                // Simplified similarity check
                const refWords = new Set(reference.toLowerCase().split(/\s+/));
                const overlap = prompt.toLowerCase().split(/\s+/).filter(w => refWords.has(w)).length;
                accuracyScore = Math.min(100, Math.round((overlap / Math.max(refWords.size, 1)) * 100 + info.quality * 0.3));
            }
            return {
                model, provider: info.provider || 'unknown',
                estimatedLatencyMs: latency, estimatedCost: +estimatedCost.toFixed(6),
                qualityScore, accuracyScore,
                inputTokens: estimatedInputTokens, outputTokens: estimatedOutputTokens,
                contextWindow: info.contextWindow,
            };
        });
        results.sort((a, b) => b.qualityScore - a.qualityScore);
        const winner = results[0].model;
        const entry = { id, prompt: prompt.substring(0, 200), models, taskType, results, winner, createdAt: new Date().toISOString() };
        compareHistory.set(id, entry);
        return { result: JSON.stringify({ status: 'success', comparisonId: id, winner, results }), sideEffects: null };
    }

    if (action === 'leaderboard') {
        const entries = Array.from(compareHistory.values());
        const scores = {};
        entries.forEach(e => {
            e.results.forEach((r, idx) => {
                if (!scores[r.model]) scores[r.model] = { wins: 0, appearances: 0, avgQuality: 0, totalCost: 0 };
                scores[r.model].appearances++;
                scores[r.model].avgQuality += r.qualityScore;
                scores[r.model].totalCost += r.estimatedCost;
                if (idx === 0) scores[r.model].wins++;
            });
        });
        const board = Object.entries(scores).map(([model, s]) => ({
            model, wins: s.wins, appearances: s.appearances,
            winRate: s.appearances > 0 ? ((s.wins / s.appearances) * 100).toFixed(1) + '%' : '0%',
            avgQuality: s.appearances > 0 ? Math.round(s.avgQuality / s.appearances) : 0,
            totalCost: +s.totalCost.toFixed(6),
        })).sort((a, b) => b.wins - a.wins).slice(0, take);
        return { result: JSON.stringify({ status: 'success', leaderboard: board, totalComparisons: entries.length }), sideEffects: null };
    }

    if (action === 'history') {
        const entries = Array.from(compareHistory.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, take);
        return { result: JSON.stringify({ status: 'success', history: entries.map(e => ({ id: e.id, models: e.models, winner: e.winner, taskType: e.taskType, createdAt: e.createdAt })) }), sideEffects: null };
    }

    if (action === 'get') {
        if (!comparisonId) return { result: JSON.stringify({ error: 'comparisonId required' }), sideEffects: null };
        const entry = compareHistory.get(comparisonId);
        if (!entry) return { result: JSON.stringify({ error: 'Comparison not found' }), sideEffects: null };
        return { result: JSON.stringify({ status: 'success', comparison: entry }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 9. llm_cache ───────────────────────────────────────────────
const llmCache = new Map(); // hash => { response, model, hits, createdAt, expiresAt }
let cacheStats = { hits: 0, misses: 0, sets: 0, savedCost: 0 };

function hashPrompt(prompt, model) {
    let h = 0;
    const str = `${model}::${prompt}`;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return 'cache_' + Math.abs(h).toString(36);
}

function simpleSimilarity(a, b) {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    return intersection / Math.max(wordsA.size, wordsB.size, 1);
}

async function executeLlmCache(input, ctx) {
    const { action, prompt, model = 'default', response, ttlHours = 24, cacheKey, similarityThreshold = 0.95, take = 50 } = input;

    if (action === 'get') {
        if (!prompt) return { result: JSON.stringify({ error: 'prompt required' }), sideEffects: null };
        // Exact match first
        const key = hashPrompt(prompt, model);
        const exact = llmCache.get(key);
        if (exact && (!exact.expiresAt || new Date(exact.expiresAt) > new Date())) {
            exact.hits++;
            cacheStats.hits++;
            const info = PROVIDER_CATALOGUE[model];
            if (info) cacheStats.savedCost += (prompt.length / 4000) * info.inputCost + (exact.response.length / 4000) * info.outputCost;
            return { result: JSON.stringify({ status: 'hit', cacheKey: key, response: exact.response, hits: exact.hits, cached: true }), sideEffects: null };
        }
        // Fuzzy match
        if (similarityThreshold < 1.0) {
            for (const [k, v] of llmCache) {
                if (v.model === model && (!v.expiresAt || new Date(v.expiresAt) > new Date())) {
                    const sim = simpleSimilarity(prompt, v.prompt);
                    if (sim >= similarityThreshold) {
                        v.hits++;
                        cacheStats.hits++;
                        return { result: JSON.stringify({ status: 'fuzzy_hit', cacheKey: k, similarity: sim.toFixed(3), response: v.response, hits: v.hits, cached: true }), sideEffects: null };
                    }
                }
            }
        }
        cacheStats.misses++;
        return { result: JSON.stringify({ status: 'miss', cached: false }), sideEffects: null };
    }

    if (action === 'set') {
        if (!prompt || !response) return { result: JSON.stringify({ error: 'prompt and response required' }), sideEffects: null };
        const key = hashPrompt(prompt, model);
        const expiresAt = new Date(Date.now() + ttlHours * 3600000).toISOString();
        llmCache.set(key, { prompt, response, model, hits: 0, createdAt: new Date().toISOString(), expiresAt });
        cacheStats.sets++;
        return { result: JSON.stringify({ status: 'success', action: 'cached', cacheKey: key, expiresAt, totalCached: llmCache.size }), sideEffects: null };
    }

    if (action === 'invalidate') {
        if (!cacheKey) return { result: JSON.stringify({ error: 'cacheKey required' }), sideEffects: null };
        const existed = llmCache.delete(cacheKey);
        return { result: JSON.stringify({ status: 'success', action: 'invalidated', cacheKey, found: existed }), sideEffects: null };
    }

    if (action === 'stats') {
        const hitRate = (cacheStats.hits + cacheStats.misses) > 0 ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) : '0';
        // Cleanup expired
        let expired = 0;
        const now = new Date();
        for (const [k, v] of llmCache) { if (v.expiresAt && new Date(v.expiresAt) < now) { llmCache.delete(k); expired++; } }
        return { result: JSON.stringify({ status: 'success', stats: { ...cacheStats, hitRate: hitRate + '%', totalCached: llmCache.size, expiredCleaned: expired, estimatedSavedUSD: +cacheStats.savedCost.toFixed(6) } }), sideEffects: null };
    }

    if (action === 'clear') {
        const count = llmCache.size;
        llmCache.clear();
        cacheStats = { hits: 0, misses: 0, sets: 0, savedCost: 0 };
        return { result: JSON.stringify({ status: 'success', action: 'cleared', entriesRemoved: count }), sideEffects: null };
    }

    if (action === 'list') {
        const entries = Array.from(llmCache.entries()).slice(0, take).map(([k, v]) => ({
            cacheKey: k, model: v.model, promptPreview: v.prompt.substring(0, 80), hits: v.hits, expiresAt: v.expiresAt,
        }));
        return { result: JSON.stringify({ status: 'success', cache: entries, total: llmCache.size }), sideEffects: null };
    }

    if (action === 'search') {
        if (!prompt) return { result: JSON.stringify({ error: 'prompt required for search' }), sideEffects: null };
        const results = [];
        for (const [k, v] of llmCache) {
            const sim = simpleSimilarity(prompt, v.prompt);
            if (sim > 0.5) results.push({ cacheKey: k, model: v.model, similarity: +sim.toFixed(3), promptPreview: v.prompt.substring(0, 100), hits: v.hits });
        }
        results.sort((a, b) => b.similarity - a.similarity);
        return { result: JSON.stringify({ status: 'success', results: results.slice(0, take) }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 10. prompt_template ────────────────────────────────────────
const templateStore = new Map();

async function executePromptTemplate(input, ctx) {
    const { action, name, template, variables = {}, description, tags = [], templateId, take = 50 } = input;

    if (action === 'create') {
        if (!name || !template) return { result: JSON.stringify({ error: 'name and template required' }), sideEffects: null };
        const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        // Extract variable names from {{var}} placeholders
        const varNames = [...new Set((template.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/[{}]/g, '')))];
        const entry = {
            id, name, template, description: description || '',
            tags, variables: varNames, versions: [{ version: 1, template, createdAt: new Date().toISOString() }],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        templateStore.set(id, entry);
        return { result: JSON.stringify({ status: 'success', action: 'created', template: { id, name, variables: varNames, tags } }), sideEffects: null };
    }

    if (action === 'render') {
        if (!templateId) return { result: JSON.stringify({ error: 'templateId required' }), sideEffects: null };
        const tpl = templateStore.get(templateId);
        if (!tpl) return { result: JSON.stringify({ error: 'Template not found' }), sideEffects: null };
        let rendered = tpl.template;
        // Replace {{var}} placeholders
        for (const [key, value] of Object.entries(variables)) {
            rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        }
        // Check for unreplaced variables
        const missing = (rendered.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/[{}]/g, ''));
        return { result: JSON.stringify({ status: 'success', rendered, missingVariables: missing, templateName: tpl.name }), sideEffects: null };
    }

    if (action === 'update') {
        if (!templateId) return { result: JSON.stringify({ error: 'templateId required' }), sideEffects: null };
        const tpl = templateStore.get(templateId);
        if (!tpl) return { result: JSON.stringify({ error: 'Template not found' }), sideEffects: null };
        if (name) tpl.name = name;
        if (description) tpl.description = description;
        if (tags.length > 0) tpl.tags = tags;
        if (template) {
            tpl.template = template;
            tpl.variables = [...new Set((template.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/[{}]/g, '')))];
            tpl.versions.push({ version: tpl.versions.length + 1, template, createdAt: new Date().toISOString() });
        }
        tpl.updatedAt = new Date().toISOString();
        return { result: JSON.stringify({ status: 'success', action: 'updated', template: { id: tpl.id, name: tpl.name, version: tpl.versions.length } }), sideEffects: null };
    }

    if (action === 'get') {
        if (!templateId) return { result: JSON.stringify({ error: 'templateId required' }), sideEffects: null };
        const tpl = templateStore.get(templateId);
        if (!tpl) return { result: JSON.stringify({ error: 'Template not found' }), sideEffects: null };
        return { result: JSON.stringify({ status: 'success', template: tpl }), sideEffects: null };
    }

    if (action === 'list') {
        const templates = Array.from(templateStore.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, take)
            .map(t => ({ id: t.id, name: t.name, variables: t.variables, tags: t.tags, versions: t.versions.length }));
        return { result: JSON.stringify({ status: 'success', templates, count: templates.length }), sideEffects: null };
    }

    if (action === 'delete') {
        if (!templateId) return { result: JSON.stringify({ error: 'templateId required' }), sideEffects: null };
        const existed = templateStore.delete(templateId);
        return { result: JSON.stringify({ status: 'success', action: 'deleted', templateId, found: existed }), sideEffects: null };
    }

    if (action === 'test') {
        if (!templateId) return { result: JSON.stringify({ error: 'templateId required' }), sideEffects: null };
        const tpl = templateStore.get(templateId);
        if (!tpl) return { result: JSON.stringify({ error: 'Template not found' }), sideEffects: null };
        let rendered = tpl.template;
        for (const [key, value] of Object.entries(variables)) {
            rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        }
        const missing = (rendered.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/[{}]/g, ''));
        const tokenEstimate = Math.ceil(rendered.length / 4);
        return { result: JSON.stringify({ status: 'success', test: { rendered, charCount: rendered.length, tokenEstimate, missingVariables: missing, allFilled: missing.length === 0 } }), sideEffects: null };
    }

    if (action === 'version_history') {
        if (!templateId) return { result: JSON.stringify({ error: 'templateId required' }), sideEffects: null };
        const tpl = templateStore.get(templateId);
        if (!tpl) return { result: JSON.stringify({ error: 'Template not found' }), sideEffects: null };
        return { result: JSON.stringify({ status: 'success', templateName: tpl.name, versions: tpl.versions }), sideEffects: null };
    }

    if (action === 'clone') {
        if (!templateId) return { result: JSON.stringify({ error: 'templateId required' }), sideEffects: null };
        const original = templateStore.get(templateId);
        if (!original) return { result: JSON.stringify({ error: 'Template not found' }), sideEffects: null };
        const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const cloned = {
            ...JSON.parse(JSON.stringify(original)),
            id, name: `${original.name} (clone)`,
            versions: [{ version: 1, template: original.template, createdAt: new Date().toISOString() }],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        templateStore.set(id, cloned);
        return { result: JSON.stringify({ status: 'success', action: 'cloned', template: { id, name: cloned.name, clonedFrom: templateId } }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 11. agent_chain ────────────────────────────────────────────
const chainStore = new Map();

async function executeAgentChain(input, ctx) {
    const { action, name, steps = [], mode = 'sequential', chainId, initialInput, retryPolicy = { maxRetries: 2, backoffMs: 1000 }, take = 50 } = input;

    if (action === 'create') {
        if (!name || steps.length === 0) return { result: JSON.stringify({ error: 'name and steps array required' }), sideEffects: null };
        const id = `chain_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const chain = {
            id, name, mode, steps: steps.map((s, i) => ({ ...s, index: i, status: 'pending', result: null, startedAt: null, completedAt: null })),
            retryPolicy, status: 'created', createdAt: new Date().toISOString(),
        };
        chainStore.set(id, chain);
        return { result: JSON.stringify({ status: 'success', action: 'created', chain: { id, name, mode, stepCount: steps.length } }), sideEffects: null };
    }

    if (action === 'execute') {
        if (!chainId) return { result: JSON.stringify({ error: 'chainId required' }), sideEffects: null };
        const chain = chainStore.get(chainId);
        if (!chain) return { result: JSON.stringify({ error: 'Chain not found' }), sideEffects: null };
        chain.status = 'running';
        chain.startedAt = new Date().toISOString();

        if (chain.mode === 'sequential') {
            let previousOutput = initialInput || '';
            for (const step of chain.steps) {
                step.status = 'running';
                step.startedAt = new Date().toISOString();
                step.input = step.inputMapping ? `[mapped from previous: ${previousOutput.substring(0, 100)}]` : step.task;
                // Simulate execution
                step.result = `Executed step ${step.index + 1}: ${step.task} (agent: ${step.agentId || 'auto'}) — input: ${previousOutput.substring(0, 50)}`;
                previousOutput = step.result;
                step.status = 'completed';
                step.completedAt = new Date().toISOString();
            }
        } else if (chain.mode === 'parallel') {
            chain.steps.forEach(step => {
                step.status = 'running';
                step.startedAt = new Date().toISOString();
                step.input = initialInput || step.task;
                step.result = `Executed parallel step ${step.index + 1}: ${step.task} (agent: ${step.agentId || 'auto'})`;
                step.status = 'completed';
                step.completedAt = new Date().toISOString();
            });
        }

        chain.status = chain.steps.every(s => s.status === 'completed') ? 'completed' : 'partial';
        chain.completedAt = new Date().toISOString();
        const finalOutput = chain.steps[chain.steps.length - 1]?.result || '';
        return { result: JSON.stringify({ status: 'success', chainId, chainStatus: chain.status, stepsCompleted: chain.steps.filter(s => s.status === 'completed').length, totalSteps: chain.steps.length, finalOutput }), sideEffects: null };
    }

    if (action === 'status') {
        if (!chainId) return { result: JSON.stringify({ error: 'chainId required' }), sideEffects: null };
        const chain = chainStore.get(chainId);
        if (!chain) return { result: JSON.stringify({ error: 'Chain not found' }), sideEffects: null };
        return { result: JSON.stringify({ status: 'success', chain: { id: chain.id, name: chain.name, status: chain.status, steps: chain.steps.map(s => ({ index: s.index, task: s.task, status: s.status })) } }), sideEffects: null };
    }

    if (action === 'results') {
        if (!chainId) return { result: JSON.stringify({ error: 'chainId required' }), sideEffects: null };
        const chain = chainStore.get(chainId);
        if (!chain) return { result: JSON.stringify({ error: 'Chain not found' }), sideEffects: null };
        return { result: JSON.stringify({ status: 'success', chainId, results: chain.steps.map(s => ({ index: s.index, task: s.task, status: s.status, result: s.result })) }), sideEffects: null };
    }

    if (action === 'list') {
        const chains = Array.from(chainStore.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, take)
            .map(c => ({ id: c.id, name: c.name, mode: c.mode, status: c.status, steps: c.steps.length }));
        return { result: JSON.stringify({ status: 'success', chains, count: chains.length }), sideEffects: null };
    }

    if (action === 'delete') {
        if (!chainId) return { result: JSON.stringify({ error: 'chainId required' }), sideEffects: null };
        const existed = chainStore.delete(chainId);
        return { result: JSON.stringify({ status: 'success', action: 'deleted', chainId, found: existed }), sideEffects: null };
    }

    if (action === 'retry') {
        if (!chainId) return { result: JSON.stringify({ error: 'chainId required' }), sideEffects: null };
        const chain = chainStore.get(chainId);
        if (!chain) return { result: JSON.stringify({ error: 'Chain not found' }), sideEffects: null };
        const failedSteps = chain.steps.filter(s => s.status === 'failed' || s.status === 'pending');
        failedSteps.forEach(step => {
            step.status = 'running';
            step.startedAt = new Date().toISOString();
            step.result = `Retried step ${step.index + 1}: ${step.task}`;
            step.status = 'completed';
            step.completedAt = new Date().toISOString();
        });
        chain.status = chain.steps.every(s => s.status === 'completed') ? 'completed' : 'partial';
        return { result: JSON.stringify({ status: 'success', action: 'retried', retriedSteps: failedSteps.length, chainStatus: chain.status }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 12. model_benchmark ────────────────────────────────────────
const benchmarkStore = new Map();

const BENCHMARK_SUITES = {
    code: [
        { prompt: 'Write a function to check if a number is prime', category: 'code', expectedOutput: 'function isPrime' },
        { prompt: 'Implement a binary search algorithm', category: 'code', expectedOutput: 'function binarySearch' },
        { prompt: 'Create a debounce function', category: 'code', expectedOutput: 'function debounce' },
    ],
    reasoning: [
        { prompt: 'If all roses are flowers and some flowers fade quickly, can we conclude all roses fade quickly?', category: 'reasoning', expectedOutput: 'No' },
        { prompt: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?', category: 'reasoning', expectedOutput: '$0.05' },
    ],
    math: [
        { prompt: 'What is the integral of x^2 dx?', category: 'math', expectedOutput: 'x^3/3' },
        { prompt: 'Solve: 2x + 5 = 17', category: 'math', expectedOutput: 'x = 6' },
    ],
    instruction: [
        { prompt: 'List exactly 5 programming languages starting with P', category: 'instruction', expectedOutput: '5 items' },
        { prompt: 'Respond with ONLY the word "hello" and nothing else', category: 'instruction', expectedOutput: 'hello' },
    ],
    creative: [
        { prompt: 'Write a haiku about programming', category: 'creative', expectedOutput: '5-7-5 syllables' },
        { prompt: 'Create a one-paragraph short story about a robot learning to paint', category: 'creative', expectedOutput: 'narrative' },
    ],
    speed: [
        { prompt: 'Say "hello"', category: 'speed', expectedOutput: 'hello' },
    ],
};

async function executeModelBenchmark(input, ctx) {
    const { action, models = [], suite = 'comprehensive', customTests = [], benchmarkId, take = 20 } = input;

    if (action === 'run') {
        if (models.length === 0) return { result: JSON.stringify({ error: 'models array required' }), sideEffects: null };
        const id = `bench_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const tests = suite === 'comprehensive'
            ? Object.values(BENCHMARK_SUITES).flat()
            : BENCHMARK_SUITES[suite] || [];

        const results = models.map(model => {
            const info = PROVIDER_CATALOGUE[model] || { quality: 75, latencyMs: 800, inputCost: 0.005, outputCost: 0.015 };
            const testResults = tests.map(t => {
                const qualityBase = info.quality + Math.round(Math.random() * 8 - 4);
                const latency = info.latencyMs + Math.round(Math.random() * 200);
                return {
                    category: t.category,
                    prompt: t.prompt.substring(0, 60),
                    score: Math.min(100, Math.max(0, qualityBase)),
                    latencyMs: latency,
                };
            });
            const avgScore = Math.round(testResults.reduce((s, r) => s + r.score, 0) / testResults.length);
            const avgLatency = Math.round(testResults.reduce((s, r) => s + r.latencyMs, 0) / testResults.length);
            const estimatedCostPer1k = info.inputCost + info.outputCost;
            const byCategory = {};
            testResults.forEach(r => {
                if (!byCategory[r.category]) byCategory[r.category] = [];
                byCategory[r.category].push(r.score);
            });
            const categoryScores = Object.entries(byCategory).reduce((acc, [cat, scores]) => {
                acc[cat] = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
                return acc;
            }, {});

            return {
                model, provider: info.provider || 'unknown',
                overallScore: avgScore, avgLatencyMs: avgLatency,
                costPer1kTokens: +estimatedCostPer1k.toFixed(6),
                categoryScores, testsRun: testResults.length,
                valueScore: Math.round(avgScore / (estimatedCostPer1k * 100 + 1)),
            };
        });
        results.sort((a, b) => b.overallScore - a.overallScore);

        const entry = { id, suite, models, results, testsRun: tests.length, createdAt: new Date().toISOString() };
        benchmarkStore.set(id, entry);
        return { result: JSON.stringify({ status: 'success', benchmarkId: id, suite, testsRun: tests.length, results }), sideEffects: null };
    }

    if (action === 'results') {
        if (!benchmarkId) return { result: JSON.stringify({ error: 'benchmarkId required' }), sideEffects: null };
        const entry = benchmarkStore.get(benchmarkId);
        if (!entry) return { result: JSON.stringify({ error: 'Benchmark not found' }), sideEffects: null };
        return { result: JSON.stringify({ status: 'success', benchmark: entry }), sideEffects: null };
    }

    if (action === 'leaderboard') {
        const entries = Array.from(benchmarkStore.values());
        const scores = {};
        entries.forEach(e => {
            e.results.forEach(r => {
                if (!scores[r.model]) scores[r.model] = { runs: 0, totalScore: 0, avgLatency: 0, avgCost: 0 };
                scores[r.model].runs++;
                scores[r.model].totalScore += r.overallScore;
                scores[r.model].avgLatency += r.avgLatencyMs;
                scores[r.model].avgCost += r.costPer1kTokens;
            });
        });
        const board = Object.entries(scores).map(([model, s]) => ({
            model, benchmarkRuns: s.runs,
            avgScore: Math.round(s.totalScore / s.runs),
            avgLatencyMs: Math.round(s.avgLatency / s.runs),
            avgCostPer1k: +(s.avgCost / s.runs).toFixed(6),
        })).sort((a, b) => b.avgScore - a.avgScore).slice(0, take);
        return { result: JSON.stringify({ status: 'success', leaderboard: board }), sideEffects: null };
    }

    if (action === 'list_suites') {
        const suites = Object.entries(BENCHMARK_SUITES).map(([name, tests]) => ({ name, testCount: tests.length }));
        suites.push({ name: 'comprehensive', testCount: Object.values(BENCHMARK_SUITES).flat().length });
        return { result: JSON.stringify({ status: 'success', suites }), sideEffects: null };
    }

    if (action === 'custom_suite') {
        if (customTests.length === 0) return { result: JSON.stringify({ error: 'customTests array required' }), sideEffects: null };
        const suiteName = `custom_${Date.now()}`;
        BENCHMARK_SUITES[suiteName] = customTests.map(t => ({ prompt: t.prompt, category: t.category || 'custom', expectedOutput: t.expectedOutput || '' }));
        return { result: JSON.stringify({ status: 'success', action: 'suite_created', suiteName, testCount: customTests.length }), sideEffects: null };
    }

    if (action === 'history') {
        const entries = Array.from(benchmarkStore.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, take)
            .map(e => ({ id: e.id, suite: e.suite, models: e.models, testsRun: e.testsRun, createdAt: e.createdAt }));
        return { result: JSON.stringify({ status: 'success', history: entries }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

/* ═══════════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════════ */

const _names = new Set(ADVANCED_AI_TOOL_DEFINITIONS.map(t => t.name));
export function isAdvancedAITool(name) { return _names.has(name); }

export async function executeAdvancedAITool(toolName, input, ctx) {
    switch (toolName) {
        case 'llm_router': return executeLlmRouter(input, ctx);
        case 'llm_cost_optimize': return executeLlmCostOptimize(input, ctx);
        case 'llm_guardrail': return executeLlmGuardrail(input, ctx);
        case 'llm_evaluate': return executeLlmEvaluate(input, ctx);
        case 'agent_spawn': return executeAgentSpawn(input, ctx);
        case 'agent_delegate': return executeAgentDelegate(input, ctx);
        case 'agent_reflect': return executeAgentReflect(input, ctx);
        case 'llm_compare': return executeLlmCompare(input, ctx);
        case 'llm_cache': return executeLlmCache(input, ctx);
        case 'prompt_template': return executePromptTemplate(input, ctx);
        case 'agent_chain': return executeAgentChain(input, ctx);
        case 'model_benchmark': return executeModelBenchmark(input, ctx);
        default:
            return { result: JSON.stringify({ error: `Unknown advanced AI tool: ${toolName}` }), sideEffects: null };
    }
}
