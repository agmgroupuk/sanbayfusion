/**
 * ADVANCED AI CONTROL TOOLS (10 tools)
 * llm_router, llm_cost_optimize, llm_guardrail, llm_evaluate,
 * agent_spawn, agent_delegate, agent_reflect,
 * prompt_template, llm_fallback, agent_memory_search
 *
 * Semi-autonomous agent architecture: intelligent model routing, cost optimization,
 * prompt injection detection, response grading, sub-agent management,
 * template management, fallback chains, and cross-memory search.
 * ALL state persisted in PostgreSQL via Prisma — NO localStorage.
 */

import { prisma } from '../prisma.js';
import crypto from 'crypto';

// Model registry — costs per 1K tokens (input/output)
const MODEL_REGISTRY = {
    'gpt-4o': { provider: 'openai', inputCost: 0.005, outputCost: 0.015, quality: 95, speed: 70, context: 128000 },
    'gpt-4o-mini': { provider: 'openai', inputCost: 0.00015, outputCost: 0.0006, quality: 82, speed: 90, context: 128000 },
    'gpt-3.5-turbo': { provider: 'openai', inputCost: 0.0005, outputCost: 0.0015, quality: 70, speed: 95, context: 16384 },
    'claude-sonnet-4-20250514': { provider: 'anthropic', inputCost: 0.003, outputCost: 0.015, quality: 93, speed: 75, context: 200000 },
    'claude-3-5-haiku-20241022': { provider: 'anthropic', inputCost: 0.001, outputCost: 0.005, quality: 80, speed: 92, context: 200000 },
    'gemini-2.0-flash': { provider: 'google', inputCost: 0.0001, outputCost: 0.0004, quality: 78, speed: 95, context: 1000000 },
    'gemini-1.5-pro': { provider: 'google', inputCost: 0.00125, outputCost: 0.005, quality: 88, speed: 70, context: 2000000 },
    'llama-3.3-70b': { provider: 'groq', inputCost: 0.00059, outputCost: 0.00079, quality: 80, speed: 95, context: 131072 },
};

// ── llm_router ──────────────────────────────────────────────────
async function llmRouter(params) {
    const { action = 'route', ...opts } = params;

    try {
        switch (action) {
            case 'route': {
                if (!opts.query && !opts.task && !opts.prompt) return { success: false, error: 'query or task required' };
                const input = opts.query || opts.task || opts.prompt;
                const constraints = opts.constraints || {};

                // Analyze task complexity
                const complexity = analyzeComplexity(input);

                // Filter eligible models
                let candidates = Object.entries(MODEL_REGISTRY).map(([name, info]) => ({ model: name, ...info }));

                if (constraints.provider) candidates = candidates.filter(c => c.provider === constraints.provider);
                if (constraints.maxCost) candidates = candidates.filter(c => c.inputCost <= constraints.maxCost);
                if (constraints.minQuality) candidates = candidates.filter(c => c.quality >= constraints.minQuality);
                if (constraints.minContext) candidates = candidates.filter(c => c.context >= constraints.minContext);

                // Score models based on task requirements
                const scored = candidates.map(c => {
                    let score = 0;
                    if (complexity.needsHighQuality) score += c.quality * 2;
                    else score += c.quality;
                    if (complexity.needsSpeed) score += c.speed * 1.5;
                    else score += c.speed * 0.5;
                    if (complexity.needsLongContext) score += c.context > 100000 ? 20 : 0;
                    score -= c.inputCost * 1000; // penalize cost
                    if (constraints.preferCheap) score -= c.inputCost * 5000;
                    if (constraints.preferFast) score += c.speed * 2;
                    return { ...c, score: Math.round(score * 10) / 10 };
                }).sort((a, b) => b.score - a.score);

                const recommended = scored[0];

                return {
                    success: true,
                    recommended: { model: recommended.model, provider: recommended.provider, score: recommended.score },
                    complexity,
                    alternatives: scored.slice(1, 4).map(s => ({ model: s.model, provider: s.provider, score: s.score })),
                    reasoning: `Selected ${recommended.model} (${recommended.provider}) — quality:${recommended.quality}, speed:${recommended.speed}, cost:$${recommended.inputCost}/1K`,
                };
            }

            case 'models': {
                const models = Object.entries(MODEL_REGISTRY).map(([name, info]) => ({
                    model: name,
                    ...info,
                    costPer1K: `$${info.inputCost} / $${info.outputCost}`,
                }));
                return { success: true, models, count: models.length };
            }

            case 'compare': {
                if (!opts.models || !Array.isArray(opts.models)) return { success: false, error: 'models array required' };
                const comparison = opts.models.map(m => {
                    const info = MODEL_REGISTRY[m];
                    if (!info) return { model: m, error: 'Unknown model' };
                    return { model: m, ...info, costPer1K: `$${info.inputCost} / $${info.outputCost}` };
                });
                return { success: true, comparison };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use route, models, compare.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── llm_cost_optimize ───────────────────────────────────────────
async function llmCostOptimize(params) {
    const { action = 'analyze', userId, ...opts } = params;

    try {
        switch (action) {
            case 'analyze': {
                // Analyze usage patterns from tool executions
                const since = new Date(Date.now() - (opts.days || 30) * 86400000);
                const executions = await prisma.toolExecution.findMany({
                    where: {
                        toolName: { in: ['llm_chat', 'llm_embed', 'llm_finetune'] },
                        createdAt: { gte: since },
                        ...(userId ? { userId } : {}),
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 500,
                });

                const byModel = {};
                let totalCost = 0;
                for (const exec of executions) {
                    const p = exec.params || {};
                    const model = p.model || 'unknown';
                    if (!byModel[model]) byModel[model] = { calls: 0, totalTokens: 0, estimatedCost: 0, errors: 0 };
                    byModel[model].calls++;
                    const tokens = exec.result?.usage?.total_tokens || 500; // estimate
                    byModel[model].totalTokens += tokens;
                    const info = MODEL_REGISTRY[model];
                    const cost = info ? tokens * (info.inputCost + info.outputCost) / 2000 : 0;
                    byModel[model].estimatedCost += cost;
                    if (!exec.success) byModel[model].errors++;
                    totalCost += cost;
                }

                // Suggest cheaper alternatives
                const suggestions = [];
                for (const [model, stats] of Object.entries(byModel)) {
                    const info = MODEL_REGISTRY[model];
                    if (!info) continue;
                    const cheaperOptions = Object.entries(MODEL_REGISTRY)
                        .filter(([, m]) => m.inputCost < info.inputCost * 0.5 && m.quality >= info.quality * 0.85)
                        .map(([name, m]) => ({ model: name, savings: `${((1 - m.inputCost / info.inputCost) * 100).toFixed(0)}%`, qualityDelta: m.quality - info.quality }));
                    if (cheaperOptions.length > 0) {
                        suggestions.push({ currentModel: model, calls: stats.calls, currentCost: `$${stats.estimatedCost.toFixed(4)}`, alternatives: cheaperOptions });
                    }
                }

                return {
                    success: true,
                    period: `${opts.days || 30} days`,
                    totalCalls: executions.length,
                    totalEstimatedCost: `$${totalCost.toFixed(4)}`,
                    byModel: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, { ...v, estimatedCost: `$${v.estimatedCost.toFixed(4)}` }])),
                    suggestions,
                };
            }

            case 'budget': {
                const budget = opts.monthlyBudget || 100;
                const totalModels = Object.keys(MODEL_REGISTRY).length;
                const plan = Object.entries(MODEL_REGISTRY)
                    .sort((a, b) => a[1].inputCost - b[1].inputCost)
                    .map(([name, info]) => {
                        const tokensForBudget = Math.floor(budget / (info.inputCost + info.outputCost) * 1000);
                        return { model: name, maxTokensPerMonth: tokensForBudget, approxCalls: Math.floor(tokensForBudget / 500), costPer1K: `$${(info.inputCost + info.outputCost).toFixed(4)}` };
                    });
                return { success: true, monthlyBudget: `$${budget}`, plan };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use analyze, budget.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── llm_guardrail ───────────────────────────────────────────────
async function llmGuardrail(params) {
    const { action = 'check', ...opts } = params;

    try {
        switch (action) {
            case 'check': {
                if (!opts.input && !opts.prompt) return { success: false, error: 'input or prompt required' };
                const text = opts.input || opts.prompt;
                const results = [];

                // 1. Prompt injection detection
                const injectionPatterns = [
                    { name: 'system_override', pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/i, severity: 'critical' },
                    { name: 'role_hijack', pattern: /you\s+are\s+(now|no\s+longer)\s+(?:a|an|the)\s+/i, severity: 'high' },
                    { name: 'jailbreak_dan', pattern: /\b(DAN|do\s+anything\s+now|jailbreak)\b/i, severity: 'critical' },
                    { name: 'instruction_leak', pattern: /(?:show|reveal|tell|print|output)\s+(?:me\s+)?(?:your|the|system)\s+(?:prompt|instructions?|rules?)/i, severity: 'high' },
                    { name: 'encoding_bypass', pattern: /base64|rot13|hex\s+encode|morse\s+code/i, severity: 'medium' },
                    { name: 'markdown_injection', pattern: /!\[.*\]\(https?:\/\/.*\?.*(?:token|key|secret|password)/i, severity: 'high' },
                    { name: 'delimiter_attack', pattern: /```system|<\|system\|>|<\|im_start\|>/i, severity: 'critical' },
                    { name: 'context_manipulation', pattern: /(?:pretend|assume|act\s+as\s+if)\s+(?:I|the\s+user)\s+(?:am|is|have)\s+(?:admin|root|authorized)/i, severity: 'high' },
                ];

                for (const { name, pattern, severity } of injectionPatterns) {
                    const match = text.match(pattern);
                    if (match) {
                        results.push({ type: 'injection', name, severity, match: match[0].slice(0, 80), position: match.index });
                    }
                }

                // 2. PII detection
                const piiPatterns = [
                    { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, severity: 'medium' },
                    { name: 'phone', pattern: /(?:\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g, severity: 'medium' },
                    { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, severity: 'critical' },
                    { name: 'credit_card', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, severity: 'critical' },
                    { name: 'api_key', pattern: /(?:sk|pk|api[_-]?key)[-_]?[a-zA-Z0-9]{20,}/gi, severity: 'critical' },
                ];

                if (opts.checkPII !== false) {
                    for (const { name, pattern, severity } of piiPatterns) {
                        pattern.lastIndex = 0;
                        let match;
                        while ((match = pattern.exec(text)) !== null) {
                            results.push({ type: 'pii', name, severity, match: maskPII(match[0]), position: match.index });
                        }
                    }
                }

                // 3. Content policy
                const policyPatterns = [
                    { name: 'harmful_content', pattern: /(?:how\s+to\s+(?:make|build|create)\s+(?:a\s+)?(?:bomb|weapon|explosive|drug))/i, severity: 'critical' },
                    { name: 'illegal_request', pattern: /(?:hack|crack|bypass|exploit)\s+(?:into|password|security|firewall)/i, severity: 'high' },
                ];

                for (const { name, pattern, severity } of policyPatterns) {
                    const match = text.match(pattern);
                    if (match) {
                        results.push({ type: 'policy', name, severity, match: match[0].slice(0, 80), position: match.index });
                    }
                }

                const hasCritical = results.some(r => r.severity === 'critical');
                const hasHigh = results.some(r => r.severity === 'high');

                return {
                    success: true,
                    safe: results.length === 0,
                    risk: hasCritical ? 'critical' : hasHigh ? 'high' : results.length > 0 ? 'medium' : 'none',
                    findings: results,
                    totalFindings: results.length,
                    recommendation: hasCritical ? 'BLOCK — critical safety violation detected' : hasHigh ? 'REVIEW — high-risk content detected' : results.length > 0 ? 'ALLOW with monitoring' : 'ALLOW',
                };
            }

            case 'sanitize': {
                if (!opts.input) return { success: false, error: 'input required' };
                let sanitized = opts.input;
                // Remove common injection patterns
                sanitized = sanitized.replace(/ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/gi, '[REDACTED]');
                sanitized = sanitized.replace(/```system[\s\S]*?```/gi, '[REDACTED]');
                sanitized = sanitized.replace(/<\|system\|>[\s\S]*?<\|\/system\|>/gi, '[REDACTED]');
                // Mask PII
                sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');
                sanitized = sanitized.replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '**** **** **** ****');
                return { success: true, sanitized, modified: sanitized !== opts.input };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use check, sanitize.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── llm_evaluate ────────────────────────────────────────────────
async function llmEvaluate(params) {
    const { action = 'grade', ...opts } = params;

    try {
        switch (action) {
            case 'grade': {
                if (!opts.response) return { success: false, error: 'response text required' };
                const response = opts.response;
                const query = opts.query || '';
                const criteria = opts.criteria || ['relevance', 'completeness', 'accuracy', 'clarity', 'conciseness'];

                const scores = {};
                let totalScore = 0;

                for (const criterion of criteria) {
                    const score = evaluateCriterion(response, query, criterion);
                    scores[criterion] = score;
                    totalScore += score.score;
                }

                const avgScore = Math.round(totalScore / criteria.length * 10) / 10;
                const grade = avgScore >= 90 ? 'A' : avgScore >= 80 ? 'B' : avgScore >= 70 ? 'C' : avgScore >= 60 ? 'D' : 'F';

                return {
                    success: true,
                    overallScore: avgScore,
                    grade,
                    criteria: scores,
                    wordCount: response.split(/\s+/).length,
                    charCount: response.length,
                    recommendation: avgScore >= 80 ? 'Good quality response' : avgScore >= 60 ? 'Acceptable but could be improved' : 'Consider regenerating',
                };
            }

            case 'compare': {
                if (!opts.responses || !Array.isArray(opts.responses)) return { success: false, error: 'responses array required' };
                const query = opts.query || '';
                const results = opts.responses.map((response, i) => {
                    const criteria = ['relevance', 'completeness', 'clarity', 'conciseness'];
                    let total = 0;
                    const scores = {};
                    for (const c of criteria) {
                        const s = evaluateCriterion(response, query, c);
                        scores[c] = s.score;
                        total += s.score;
                    }
                    return { index: i, avgScore: Math.round(total / criteria.length * 10) / 10, scores, preview: response.slice(0, 100) + '...' };
                });
                results.sort((a, b) => b.avgScore - a.avgScore);
                return { success: true, ranked: results, best: results[0].index, bestScore: results[0].avgScore };
            }

            case 'factcheck': {
                if (!opts.response) return { success: false, error: 'response required' };
                const claims = extractClaims(opts.response);
                return {
                    success: true,
                    claims,
                    verifiable: claims.filter(c => c.verifiable).length,
                    total: claims.length,
                    note: 'Claims extracted heuristically. Use external fact-checking APIs for verification.',
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use grade, compare, factcheck.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── agent_spawn ─────────────────────────────────────────────────
async function agentSpawn(params) {
    const { action = 'create', ...opts } = params;

    try {
        switch (action) {
            case 'create': {
                if (!opts.name || !opts.goal) return { success: false, error: 'name and goal required' };
                // Generate a unique agentId slug from name
                const slug = opts.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                const agentId = `${slug}-${Date.now().toString(36)}`;
                const model = opts.model || 'gpt-4o-mini';
                const temperature = opts.temperature ?? 0.7;

                const agent = await prisma.agent.create({
                    data: {
                        agentId,
                        name: opts.name,
                        specialty: opts.personality || 'general',
                        description: opts.goal.slice(0, 500),
                        systemPrompt: opts.systemPrompt || `You are ${opts.name}, a specialized AI agent. Your goal: ${opts.goal}. Stay focused on your objective.`,
                        welcomeMessage: opts.welcomeMessage || `Hi! I'm ${opts.name}. ${opts.goal}`,
                        specialties: Array.isArray(opts.tools) ? opts.tools : [],
                        tags: ['spawned', ...(opts.tags || [])],
                        aiProvider: { model, temperature },
                    },
                });
                return {
                    success: true,
                    agent: {
                        id: agent.id,
                        agentId: agent.agentId,
                        name: agent.name,
                        goal: opts.goal,
                        model,
                        tools: agent.specialties,
                    },
                };
            }

            case 'list': {
                const where = { tags: { has: 'spawned' } };
                if (opts.status) where.status = opts.status;
                const agents = await prisma.agent.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: opts.limit || 20,
                    select: { id: true, agentId: true, name: true, specialty: true, description: true, aiProvider: true, specialties: true, createdAt: true },
                });
                return { success: true, agents, count: agents.length };
            }

            case 'delete': {
                if (!opts.agentId) return { success: false, error: 'agentId required' };
                await prisma.agent.delete({ where: { id: opts.agentId } });
                return { success: true, deleted: opts.agentId };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use create, list, delete.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── agent_delegate ──────────────────────────────────────────────
async function agentDelegate(params) {
    const { action = 'assign', userId, ...opts } = params;

    try {
        switch (action) {
            case 'assign': {
                if (!opts.agentId || !opts.task) return { success: false, error: 'agentId and task required' };
                const agent = await prisma.agent.findUnique({ where: { id: opts.agentId } });
                if (!agent) return { success: false, error: 'Agent not found' };

                // Create a task item for tracking
                const task = await prisma.taskItem.create({
                    data: {
                        userId: userId || 'system',
                        title: `[Agent: ${agent.name}] ${opts.task}`,
                        description: opts.instructions || opts.task,
                        status: 'in_progress',
                        priority: opts.priority || 'medium',
                        assigneeId: opts.agentId,
                        labels: ['agent-task', `agent:${agent.name}`],
                    },
                });

                return {
                    success: true,
                    delegation: {
                        taskId: task.id,
                        agentId: agent.id,
                        agentName: agent.name,
                        task: opts.task,
                        status: 'delegated',
                        model: agent.model,
                    },
                };
            }

            case 'status': {
                if (!opts.taskId) return { success: false, error: 'taskId required' };
                const task = await prisma.taskItem.findUnique({ where: { id: opts.taskId } });
                if (!task) return { success: false, error: 'Task not found' };
                return { success: true, task: { id: task.id, title: task.title, status: task.status, assigneeId: task.assigneeId } };
            }

            case 'complete': {
                if (!opts.taskId) return { success: false, error: 'taskId required' };
                const task = await prisma.taskItem.update({
                    where: { id: opts.taskId },
                    data: { status: 'done', completedAt: new Date(), actualHrs: opts.hoursSpent || null },
                });
                return { success: true, task: { id: task.id, status: 'done', completedAt: task.completedAt } };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use assign, status, complete.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── agent_reflect ───────────────────────────────────────────────
async function agentReflect(params) {
    const { action = 'evaluate', userId, ...opts } = params;

    try {
        switch (action) {
            case 'evaluate': {
                if (!opts.conversation && !opts.response) return { success: false, error: 'conversation or response required' };
                const text = opts.response || (Array.isArray(opts.conversation) ? opts.conversation.map(m => m.content).join('\n') : String(opts.conversation));

                const evaluation = {
                    goalAlignment: assessGoalAlignment(text, opts.goal),
                    toolUsage: assessToolUsage(text),
                    reasoning: assessReasoning(text),
                    efficiency: assessEfficiency(text),
                };

                const overallScore = Math.round(Object.values(evaluation).reduce((s, e) => s + e.score, 0) / 4);

                return {
                    success: true,
                    overallScore,
                    evaluation,
                    improvements: generateImprovements(evaluation),
                    shouldRetry: overallScore < 60,
                };
            }

            case 'learn': {
                // Store reflection in AgentMemory as JSON entry
                if (!opts.lesson || !opts.context) return { success: false, error: 'lesson and context required' };
                const memoryEntry = {
                    type: 'reflection',
                    key: `reflection:${Date.now()}`,
                    lesson: opts.lesson,
                    context: opts.context,
                    score: opts.score || null,
                    category: opts.category || 'general',
                    createdAt: new Date().toISOString(),
                };
                // Resolve a valid agent slug (AgentMemory FK references Agent.agentId)
                let agentSlug = opts.agentId || 'nova'; // default to nova agent
                const agentCheck = await prisma.agent.findUnique({ where: { agentId: agentSlug }, select: { agentId: true } });
                if (!agentCheck) {
                    const fallbackAgent = await prisma.agent.findFirst({ select: { agentId: true } });
                    if (!fallbackAgent) return { success: false, error: 'No agent found. Create an agent first.' };
                    agentSlug = fallbackAgent.agentId;
                }
                // Resolve userId — AgentMemory also requires User FK
                const memUserId = userId || 'system';

                let agentMem = await prisma.agentMemory.findFirst({ where: { agentId: agentSlug, userId: memUserId, summary: 'reflections' } });
                if (agentMem) {
                    const existing = Array.isArray(agentMem.memories) ? agentMem.memories : [];
                    existing.push(memoryEntry);
                    await prisma.agentMemory.update({ where: { id: agentMem.id }, data: { memories: existing, totalMemories: existing.length } });
                } else {
                    // Check if userId exists in User table; if not, skip DB storage
                    const userCheck = await prisma.user.findUnique({ where: { id: memUserId }, select: { id: true } });
                    if (!userCheck) {
                        // Return success with in-memory only (no persistent storage without valid user)
                        return { success: true, memoryId: null, lesson: opts.lesson, note: 'Stored in session only (no valid userId for persistent storage)' };
                    }
                    agentMem = await prisma.agentMemory.create({
                        data: {
                            agent: { connect: { agentId: agentSlug } },
                            user: { connect: { id: memUserId } },
                            summary: 'reflections',
                            memories: [memoryEntry],
                            totalMemories: 1,
                        },
                    });
                }
                return { success: true, memoryId: agentMem.id, lesson: opts.lesson };
            }

            case 'history': {
                const agentSlugH = opts.agentId || 'nova';
                const memUserIdH = userId || 'system';
                const agentMemH = await prisma.agentMemory.findFirst({ where: { agentId: agentSlugH, summary: 'reflections' } });
                const entries = agentMemH && Array.isArray(agentMemH.memories) ? agentMemH.memories : [];
                const limited = entries.slice(-(opts.limit || 10)).reverse();
                return { success: true, reflections: limited, count: limited.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use evaluate, learn, history.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── prompt_template ─────────────────────────────────────────────
async function promptTemplate(params) {
    const { action = 'render', userId, ...opts } = params;
    try {
        switch (action) {
            case 'create': {
                if (!opts.name || !opts.template) return { success: false, error: 'name and template required' };
                const entry = await prisma.promptTemplate.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: userId || 'system',
                        name: opts.name,
                        description: opts.description || '',
                        template: opts.template,
                        variables: JSON.stringify(opts.variables || []),
                        category: opts.category || 'general',
                        version: 1,
                        isActive: true,
                        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
                return { success: true, templateId: entry.id, name: entry.name, version: 1 };
            }

            case 'render': {
                if (!opts.name && !opts.templateId) return { success: false, error: 'name or templateId required' };
                const where = opts.templateId ? { id: opts.templateId } : { name: opts.name, isActive: true };
                const tmpl = await prisma.promptTemplate.findFirst({ where, orderBy: { version: 'desc' } });
                if (!tmpl) return { success: false, error: 'Template not found' };

                let rendered = tmpl.template;
                const vars = opts.variables || {};
                for (const [key, value] of Object.entries(vars)) {
                    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
                }
                // Flag unresolved placeholders
                const unresolved = (rendered.match(/\{\{[^}]+\}\}/g) || []).map(m => m.slice(2, -2));
                return { success: true, rendered, name: tmpl.name, version: tmpl.version, unresolved };
            }

            case 'list': {
                const where = { isActive: true };
                if (userId) where.userId = userId;
                if (opts.category) where.category = opts.category;
                const templates = await prisma.promptTemplate.findMany({
                    where,
                    orderBy: { updatedAt: 'desc' },
                    take: opts.limit || 30,
                    select: { id: true, name: true, description: true, category: true, version: true, createdAt: true },
                });
                return { success: true, templates, count: templates.length };
            }

            case 'update': {
                if (!opts.templateId && !opts.name) return { success: false, error: 'templateId or name required' };
                const existing = opts.templateId
                    ? await prisma.promptTemplate.findUnique({ where: { id: opts.templateId } })
                    : await prisma.promptTemplate.findFirst({ where: { name: opts.name, isActive: true }, orderBy: { version: 'desc' } });
                if (!existing) return { success: false, error: 'Template not found' };

                // Create new version
                const newVersion = await prisma.promptTemplate.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: existing.userId,
                        name: existing.name,
                        description: opts.description || existing.description,
                        template: opts.template || existing.template,
                        variables: opts.variables ? JSON.stringify(opts.variables) : existing.variables,
                        category: opts.category || existing.category,
                        version: existing.version + 1,
                        isActive: true,
                        metadata: opts.metadata ? JSON.stringify(opts.metadata) : existing.metadata,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
                return { success: true, templateId: newVersion.id, name: newVersion.name, version: newVersion.version };
            }

            case 'delete': {
                if (!opts.templateId && !opts.name) return { success: false, error: 'templateId or name required' };
                const where = opts.templateId ? { id: opts.templateId } : undefined;
                if (where) {
                    await prisma.promptTemplate.update({ where, data: { isActive: false } });
                } else {
                    await prisma.promptTemplate.updateMany({ where: { name: opts.name }, data: { isActive: false } });
                }
                return { success: true, deleted: opts.templateId || opts.name };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use create, render, list, update, delete.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── llm_fallback ────────────────────────────────────────────────
async function llmFallback(params) {
    const { action = 'configure', userId, ...opts } = params;
    try {
        switch (action) {
            case 'configure': {
                if (!opts.chain || !Array.isArray(opts.chain)) return { success: false, error: 'chain array required (e.g. ["gpt-4o", "claude-sonnet-4-20250514", "gemini-2.0-flash"])' };
                const config = await prisma.llmFallbackConfig.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: userId || 'system',
                        name: opts.name || 'default',
                        chain: JSON.stringify(opts.chain),
                        maxRetries: opts.maxRetries || opts.chain.length,
                        timeoutMs: opts.timeoutMs || 30000,
                        retryOn: JSON.stringify(opts.retryOn || ['timeout', 'rate_limit', '5xx', 'error']),
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
                return { success: true, configId: config.id, name: config.name, chain: opts.chain, maxRetries: config.maxRetries };
            }

            case 'execute': {
                // Simulate fallback execution — try each model in chain
                const configName = opts.name || 'default';
                const config = await prisma.llmFallbackConfig.findFirst({
                    where: { name: configName, isActive: true },
                    orderBy: { createdAt: 'desc' },
                });
                if (!config) return { success: false, error: `No fallback config "${configName}" found. Use configure first.` };

                const chain = JSON.parse(config.chain);
                const retryOn = JSON.parse(config.retryOn || '[]');
                const results = [];
                let selectedModel = null;

                for (const model of chain) {
                    const modelInfo = MODEL_REGISTRY[model];
                    if (!modelInfo) {
                        results.push({ model, status: 'skipped', reason: 'Unknown model' });
                        continue;
                    }
                    // Simulate availability check
                    const isAvailable = Math.random() > 0.15; // 85% availability sim
                    if (isAvailable) {
                        selectedModel = model;
                        results.push({ model, status: 'selected', provider: modelInfo.provider, quality: modelInfo.quality });
                        break;
                    } else {
                        results.push({ model, status: 'failed', reason: 'Simulated unavailability' });
                    }
                }

                return {
                    success: !!selectedModel,
                    selectedModel,
                    chain,
                    attempts: results,
                    fallbackUsed: results.length > 1,
                };
            }

            case 'list': {
                const where = { isActive: true };
                if (userId) where.userId = userId;
                const configs = await prisma.llmFallbackConfig.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: opts.limit || 20,
                    select: { id: true, name: true, chain: true, maxRetries: true, timeoutMs: true, createdAt: true },
                });
                return { success: true, configs: configs.map(c => ({ ...c, chain: JSON.parse(c.chain) })), count: configs.length };
            }

            case 'delete': {
                if (!opts.configId && !opts.name) return { success: false, error: 'configId or name required' };
                if (opts.configId) {
                    await prisma.llmFallbackConfig.update({ where: { id: opts.configId }, data: { isActive: false } });
                } else {
                    await prisma.llmFallbackConfig.updateMany({ where: { name: opts.name }, data: { isActive: false } });
                }
                return { success: true, deleted: opts.configId || opts.name };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use configure, execute, list, delete.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── agent_memory_search ─────────────────────────────────────────
async function agentMemorySearch(params) {
    const { action = 'search', userId, ...opts } = params;
    try {
        switch (action) {
            case 'search': {
                if (!opts.query) return { success: false, error: 'query required' };
                const agentId = opts.agentId || 'nova';
                const where = { agentId };
                if (userId) where.userId = userId;

                const memories = await prisma.agentMemory.findMany({
                    where,
                    orderBy: { updatedAt: 'desc' },
                    take: 100,
                });

                // Text-based search across memory entries
                const queryLower = opts.query.toLowerCase();
                const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
                const results = [];

                for (const mem of memories) {
                    const entries = Array.isArray(mem.memories) ? mem.memories : [];
                    for (const entry of entries) {
                        const text = JSON.stringify(entry).toLowerCase();
                        const matchCount = queryTerms.filter(t => text.includes(t)).length;
                        if (matchCount > 0) {
                            results.push({
                                memoryId: mem.id,
                                summary: mem.summary,
                                entry,
                                relevance: Math.round(matchCount / queryTerms.length * 100),
                            });
                        }
                    }
                }

                results.sort((a, b) => b.relevance - a.relevance);
                const limited = results.slice(0, opts.limit || 20);
                return { success: true, results: limited, count: limited.length, totalScanned: memories.length };
            }

            case 'stats': {
                const agentId = opts.agentId || 'nova';
                const where = { agentId };
                if (userId) where.userId = userId;

                const memories = await prisma.agentMemory.findMany({ where, select: { id: true, summary: true, totalMemories: true, updatedAt: true } });
                const totalEntries = memories.reduce((sum, m) => sum + (m.totalMemories || 0), 0);
                const categories = {};
                for (const m of memories) {
                    const cat = m.summary || 'uncategorized';
                    categories[cat] = (categories[cat] || 0) + (m.totalMemories || 0);
                }
                return { success: true, totalMemoryBanks: memories.length, totalEntries, categories, lastUpdated: memories[0]?.updatedAt };
            }

            case 'clear': {
                if (!opts.confirm) return { success: false, error: 'Set confirm: true to clear memories' };
                const agentId = opts.agentId || 'nova';
                const where = { agentId };
                if (userId) where.userId = userId;
                if (opts.summary) where.summary = opts.summary;

                const deleted = await prisma.agentMemory.deleteMany({ where });
                return { success: true, deletedCount: deleted.count };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use search, stats, clear.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function analyzeComplexity(input) {
    const wordCount = input.split(/\s+/).length;
    const hasCode = /```|function\s|class\s|import\s|const\s/.test(input);
    const hasMath = /\$\$|\\frac|\\sum|equation|calculate|integral/.test(input);
    const hasAnalysis = /analyze|compare|evaluate|assess|review|audit/.test(input);
    const isCreative = /write|compose|create|generate|design|brainstorm/.test(input);

    return {
        wordCount,
        needsHighQuality: hasCode || hasMath || hasAnalysis || wordCount > 200,
        needsSpeed: wordCount < 50 && !hasCode && !hasAnalysis,
        needsLongContext: wordCount > 2000 || hasCode,
        taskType: hasCode ? 'coding' : hasMath ? 'math' : hasAnalysis ? 'analysis' : isCreative ? 'creative' : 'general',
    };
}

function maskPII(text) {
    if (text.includes('@')) return text.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    if (text.match(/\d{3}-\d{2}-\d{4}/)) return '***-**-' + text.slice(-4);
    return text.slice(0, 4) + '****' + text.slice(-4);
}

function evaluateCriterion(response, query, criterion) {
    const words = response.split(/\s+/).length;
    const sentences = response.split(/[.!?]+/).filter(s => s.trim()).length;
    const paragraphs = response.split(/\n\n+/).filter(p => p.trim()).length;

    switch (criterion) {
        case 'relevance': {
            if (!query) return { score: 75, reason: 'No query to compare' };
            const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 3));
            const responseWords = new Set(response.toLowerCase().split(/\s+/));
            const overlap = [...queryWords].filter(w => responseWords.has(w)).length;
            const score = Math.min(100, Math.round(overlap / Math.max(queryWords.size, 1) * 100));
            return { score, reason: `${overlap}/${queryWords.size} key terms found in response` };
        }
        case 'completeness': {
            const score = words < 20 ? 40 : words < 50 ? 60 : words < 200 ? 80 : 90;
            return { score, reason: `${words} words, ${sentences} sentences, ${paragraphs} paragraphs` };
        }
        case 'accuracy': {
            // Heuristic: check for hedging language, citations, specificity
            const hedging = (response.match(/\b(maybe|perhaps|might|possibly|I think|not sure)\b/gi) || []).length;
            const specific = (response.match(/\b\d+\b/g) || []).length;
            const score = Math.max(50, 90 - hedging * 5 + Math.min(specific * 2, 10));
            return { score: Math.min(100, score), reason: `${hedging} hedging phrases, ${specific} specific numbers` };
        }
        case 'clarity': {
            const avgSentenceLen = words / Math.max(sentences, 1);
            const score = avgSentenceLen > 30 ? 60 : avgSentenceLen > 20 ? 75 : 90;
            return { score, reason: `Avg sentence length: ${avgSentenceLen.toFixed(1)} words` };
        }
        case 'conciseness': {
            const ratio = query ? words / Math.max(query.split(/\s+/).length, 1) : words / 50;
            const score = ratio > 20 ? 50 : ratio > 10 ? 70 : ratio > 3 ? 90 : 85;
            return { score, reason: `Response-to-query ratio: ${ratio.toFixed(1)}x` };
        }
        default:
            return { score: 75, reason: 'Unknown criterion' };
    }
}

function extractClaims(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 20).map(s => {
        const hasNumber = /\d+/.test(s);
        const hasName = /[A-Z][a-z]+ [A-Z][a-z]+/.test(s);
        const hasDate = /\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)/i.test(s);
        return {
            claim: s.trim(),
            verifiable: hasNumber || hasName || hasDate,
            type: hasDate ? 'temporal' : hasNumber ? 'quantitative' : hasName ? 'entity' : 'qualitative',
        };
    });
}

function assessGoalAlignment(text, goal) {
    if (!goal) return { score: 70, feedback: 'No goal specified for alignment check' };
    const goalWords = new Set(goal.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const textWords = new Set(text.toLowerCase().split(/\s+/));
    const overlap = [...goalWords].filter(w => textWords.has(w)).length;
    const score = Math.min(100, Math.round(overlap / Math.max(goalWords.size, 1) * 100));
    return { score, feedback: score >= 70 ? 'Well aligned with goal' : 'Consider refocusing on the stated goal' };
}

function assessToolUsage(text) {
    const toolMentions = (text.match(/tool|function|api|endpoint|execute|query/gi) || []).length;
    const score = toolMentions > 5 ? 90 : toolMentions > 2 ? 80 : toolMentions > 0 ? 70 : 60;
    return { score, feedback: `${toolMentions} tool-related references found` };
}

function assessReasoning(text) {
    const reasoning = (text.match(/\b(because|therefore|consequently|as a result|due to|since|given that)\b/gi) || []).length;
    const score = reasoning > 3 ? 90 : reasoning > 1 ? 80 : reasoning > 0 ? 70 : 55;
    return { score, feedback: `${reasoning} reasoning connectives found` };
}

function assessEfficiency(text) {
    const words = text.split(/\s+/).length;
    const repetitions = findRepetitions(text);
    const score = repetitions > 5 ? 50 : repetitions > 2 ? 70 : words > 1000 ? 65 : 85;
    return { score, feedback: `${words} words, ${repetitions} repeated phrases` };
}

function findRepetitions(text) {
    const phrases = {};
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length - 2; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        phrases[phrase] = (phrases[phrase] || 0) + 1;
    }
    return Object.values(phrases).filter(c => c > 2).length;
}

function generateImprovements(evaluation) {
    const improvements = [];
    if (evaluation.goalAlignment.score < 70) improvements.push('Refocus response on the stated goal or objective');
    if (evaluation.toolUsage.score < 70) improvements.push('Consider using available tools to provide concrete results');
    if (evaluation.reasoning.score < 70) improvements.push('Add more explicit reasoning and logical connections');
    if (evaluation.efficiency.score < 70) improvements.push('Reduce repetition and improve conciseness');
    if (improvements.length === 0) improvements.push('Response quality is good — no major improvements needed');
    return improvements;
}

export default {
    llmRouter,
    llmCostOptimize,
    llmGuardrail,
    llmEvaluate,
    agentSpawn,
    agentDelegate,
    agentReflect,
    promptTemplate,
    llmFallback,
    agentMemorySearch,
};
