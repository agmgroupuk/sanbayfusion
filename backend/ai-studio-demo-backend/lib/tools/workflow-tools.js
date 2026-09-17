/**
 * WORKFLOW ENGINE TOOLS (5 tools)
 * workflow_create, workflow_execute, workflow_schedule, workflow_visualize, workflow_optimize
 *
 * Multi-step pipeline orchestration with conditional/parallel execution.
 * ALL state persisted in PostgreSQL via Prisma — NO localStorage.
 */

import { prisma } from '../prisma.js';

// ── workflow_create ─────────────────────────────────────────────
async function workflowCreate(params) {
    const { action = 'create', userId, ...opts } = params;

    try {
        switch (action) {
            case 'create': {
                if (!opts.name || !opts.steps) return { success: false, error: 'name and steps required' };
                // Validate step structure
                const steps = Array.isArray(opts.steps) ? opts.steps : [];
                const validated = steps.map((s, i) => ({
                    id: s.id || `step_${i + 1}`,
                    tool: s.tool,
                    params: s.params || {},
                    dependsOn: s.dependsOn || [],
                    condition: s.condition || null,
                    parallel: s.parallel || false,
                    retries: s.retries || 0,
                    timeout: s.timeout || 30000,
                    onError: s.onError || 'stop', // stop, skip, retry
                }));
                // Validate DAG — no circular dependencies
                const ids = new Set(validated.map(s => s.id));
                for (const step of validated) {
                    for (const dep of step.dependsOn) {
                        if (!ids.has(dep)) return { success: false, error: `Step "${step.id}" depends on unknown step "${dep}"` };
                    }
                }
                if (detectCycle(validated)) return { success: false, error: 'Circular dependency detected in workflow steps' };

                const workflow = await prisma.workflow.create({
                    data: {
                        userId: userId || 'system',
                        name: opts.name,
                        description: opts.description || null,
                        steps: validated,
                        schedule: opts.schedule || null,
                        tags: opts.tags || [],
                        status: 'draft',
                    },
                });
                return { success: true, workflow: { id: workflow.id, name: workflow.name, stepCount: validated.length, status: workflow.status } };
            }

            case 'update': {
                if (!opts.id) return { success: false, error: 'workflow id required' };
                const updates = {};
                if (opts.name) updates.name = opts.name;
                if (opts.description !== undefined) updates.description = opts.description;
                if (opts.steps) updates.steps = opts.steps;
                if (opts.schedule !== undefined) updates.schedule = opts.schedule;
                if (opts.status) updates.status = opts.status;
                if (opts.tags) updates.tags = opts.tags;
                const updated = await prisma.workflow.update({ where: { id: opts.id }, data: updates });
                return { success: true, workflow: { id: updated.id, name: updated.name, status: updated.status } };
            }

            case 'get': {
                if (!opts.id) return { success: false, error: 'workflow id required' };
                const wf = await prisma.workflow.findUnique({ where: { id: opts.id }, include: { runs: { take: 5, orderBy: { startedAt: 'desc' } } } });
                if (!wf) return { success: false, error: 'Workflow not found' };
                return { success: true, workflow: wf };
            }

            case 'list': {
                const where = { userId: userId || 'system' };
                if (opts.status) where.status = opts.status;
                const workflows = await prisma.workflow.findMany({
                    where,
                    orderBy: { updatedAt: 'desc' },
                    take: opts.limit || 20,
                    select: { id: true, name: true, description: true, status: true, runCount: true, avgDuration: true, schedule: true, updatedAt: true },
                });
                return { success: true, workflows, count: workflows.length };
            }

            case 'delete': {
                if (!opts.id) return { success: false, error: 'workflow id required' };
                await prisma.workflow.delete({ where: { id: opts.id } });
                return { success: true, deleted: opts.id };
            }

            case 'clone': {
                if (!opts.id) return { success: false, error: 'workflow id required' };
                const source = await prisma.workflow.findUnique({ where: { id: opts.id } });
                if (!source) return { success: false, error: 'Source workflow not found' };
                const cloned = await prisma.workflow.create({
                    data: {
                        userId: userId || source.userId,
                        name: opts.name || `${source.name} (copy)`,
                        description: source.description,
                        steps: source.steps,
                        schedule: null,
                        tags: source.tags,
                        status: 'draft',
                    },
                });
                return { success: true, workflow: { id: cloned.id, name: cloned.name } };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use create, update, get, list, delete, clone.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── workflow_execute ────────────────────────────────────────────
async function workflowExecute(params) {
    const { action = 'run', userId, executeTool, ...opts } = params;

    try {
        switch (action) {
            case 'run': {
                if (!opts.workflowId && !opts.id) return { success: false, error: 'workflowId required' };
                const wfId = opts.workflowId || opts.id;
                const workflow = await prisma.workflow.findUnique({ where: { id: wfId } });
                if (!workflow) return { success: false, error: 'Workflow not found' };

                const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
                const overrides = opts.overrides || {};

                // Create run record
                const run = await prisma.workflowRun.create({
                    data: { workflowId: wfId, trigger: opts.trigger || 'manual', status: 'running', stepResults: [] },
                });

                const startTime = Date.now();
                const stepResults = [];
                const completed = new Set();
                const stepOutputs = {}; // step_id → result, for variable interpolation

                // Topologically sort steps
                const sorted = topologicalSort(steps);

                for (const step of sorted) {
                    const stepStart = Date.now();

                    // Check condition
                    if (step.condition) {
                        const condMet = evaluateCondition(step.condition, stepOutputs);
                        if (!condMet) {
                            stepResults.push({ stepId: step.id, status: 'skipped', reason: 'condition not met', startedAt: new Date(stepStart), completedAt: new Date() });
                            completed.add(step.id);
                            continue;
                        }
                    }

                    // Check dependencies
                    for (const dep of step.dependsOn || []) {
                        if (!completed.has(dep)) {
                            stepResults.push({ stepId: step.id, status: 'skipped', reason: `dependency "${dep}" not completed`, startedAt: new Date(stepStart), completedAt: new Date() });
                            completed.add(step.id);
                            continue;
                        }
                    }

                    // Merge params with overrides and interpolate outputs
                    const mergedParams = { ...step.params, ...(overrides[step.id] || {}) };
                    const resolvedParams = interpolateParams(mergedParams, stepOutputs);

                    // Execute the tool
                    let result;
                    let retries = step.retries || 0;
                    let attempt = 0;
                    while (attempt <= retries) {
                        try {
                            if (typeof executeTool === 'function') {
                                result = await executeTool(step.tool, { ...resolvedParams, userId });
                            } else {
                                // Lightweight execution — return params for external executor
                                result = { deferred: true, tool: step.tool, params: resolvedParams };
                            }
                            break;
                        } catch (execErr) {
                            attempt++;
                            if (attempt > retries) {
                                result = { success: false, error: execErr.message };
                                if (step.onError === 'stop') {
                                    stepResults.push({ stepId: step.id, status: 'failed', error: execErr.message, attempts: attempt, startedAt: new Date(stepStart), completedAt: new Date() });
                                    // Abort workflow
                                    const duration = Date.now() - startTime;
                                    await prisma.workflowRun.update({ where: { id: run.id }, data: { status: 'failed', stepResults, error: `Step ${step.id} failed: ${execErr.message}`, durationMs: duration, completedAt: new Date() } });
                                    await prisma.workflow.update({ where: { id: wfId }, data: { lastRunAt: new Date(), lastResult: { runId: run.id, status: 'failed' }, runCount: { increment: 1 } } });
                                    return { success: false, runId: run.id, failedStep: step.id, error: execErr.message, stepResults, durationMs: duration };
                                }
                            }
                        }
                    }

                    stepOutputs[step.id] = result;
                    stepResults.push({
                        stepId: step.id,
                        tool: step.tool,
                        status: result?.success !== false ? 'completed' : 'failed',
                        result: result,
                        startedAt: new Date(stepStart),
                        completedAt: new Date(),
                    });
                    completed.add(step.id);

                    // Update run progress
                    await prisma.workflowRun.update({ where: { id: run.id }, data: { currentStep: step.id, stepResults } });
                }

                const duration = Date.now() - startTime;
                const allPassed = stepResults.every(r => r.status === 'completed' || r.status === 'skipped');

                await prisma.workflowRun.update({
                    where: { id: run.id },
                    data: { status: allPassed ? 'completed' : 'failed', stepResults, durationMs: duration, completedAt: new Date(), currentStep: null },
                });

                // Update workflow stats
                const allRuns = await prisma.workflowRun.findMany({ where: { workflowId: wfId }, select: { durationMs: true } });
                const avgDur = Math.round(allRuns.reduce((s, r) => s + r.durationMs, 0) / allRuns.length);
                await prisma.workflow.update({
                    where: { id: wfId },
                    data: { lastRunAt: new Date(), lastResult: { runId: run.id, status: allPassed ? 'completed' : 'failed' }, runCount: { increment: 1 }, avgDuration: avgDur, status: 'active' },
                });

                return { success: true, runId: run.id, status: allPassed ? 'completed' : 'failed', stepResults, durationMs: duration, stepsCompleted: stepResults.filter(r => r.status === 'completed').length, totalSteps: steps.length };
            }

            case 'status': {
                if (!opts.runId) return { success: false, error: 'runId required' };
                const run = await prisma.workflowRun.findUnique({ where: { id: opts.runId } });
                if (!run) return { success: false, error: 'Run not found' };
                return { success: true, run };
            }

            case 'cancel': {
                if (!opts.runId) return { success: false, error: 'runId required' };
                const cancelled = await prisma.workflowRun.update({ where: { id: opts.runId }, data: { status: 'cancelled', completedAt: new Date() } });
                return { success: true, runId: cancelled.id, status: 'cancelled' };
            }

            case 'history': {
                const wfId = opts.workflowId || opts.id;
                if (!wfId) return { success: false, error: 'workflowId required' };
                const runs = await prisma.workflowRun.findMany({
                    where: { workflowId: wfId },
                    orderBy: { startedAt: 'desc' },
                    take: opts.limit || 10,
                });
                return { success: true, runs, count: runs.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use run, status, cancel, history.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── workflow_schedule ───────────────────────────────────────────
async function workflowSchedule(params) {
    const { action = 'set', userId, ...opts } = params;

    try {
        switch (action) {
            case 'schedule':
            case 'set': {
                if (!opts.workflowId && !opts.id) return { success: false, error: 'workflowId required' };
                if (!opts.schedule) return { success: false, error: 'schedule (cron expression) required' };
                const wfId = opts.workflowId || opts.id;
                // Validate cron expression
                if (!isValidCron(opts.schedule)) return { success: false, error: `Invalid cron expression: "${opts.schedule}". Use: "minute hour day month weekday"` };
                const updated = await prisma.workflow.update({
                    where: { id: wfId },
                    data: { schedule: opts.schedule, status: 'active' },
                });
                const nextRun = getNextCronRun(opts.schedule);
                return { success: true, workflowId: wfId, schedule: opts.schedule, nextRun, status: 'active' };
            }

            case 'remove': {
                if (!opts.workflowId && !opts.id) return { success: false, error: 'workflowId required' };
                const wfId = opts.workflowId || opts.id;
                await prisma.workflow.update({ where: { id: wfId }, data: { schedule: null } });
                return { success: true, workflowId: wfId, schedule: null };
            }

            case 'list': {
                const scheduled = await prisma.workflow.findMany({
                    where: { userId: userId || 'system', schedule: { not: null } },
                    select: { id: true, name: true, schedule: true, status: true, lastRunAt: true, runCount: true },
                    orderBy: { updatedAt: 'desc' },
                });
                const withNext = scheduled.map(w => ({ ...w, nextRun: getNextCronRun(w.schedule) }));
                return { success: true, scheduled: withNext, count: withNext.length };
            }

            case 'pause': {
                if (!opts.workflowId && !opts.id) return { success: false, error: 'workflowId required' };
                const wfId = opts.workflowId || opts.id;
                await prisma.workflow.update({ where: { id: wfId }, data: { status: 'paused' } });
                return { success: true, workflowId: wfId, status: 'paused' };
            }

            case 'resume': {
                if (!opts.workflowId && !opts.id) return { success: false, error: 'workflowId required' };
                const wfId = opts.workflowId || opts.id;
                await prisma.workflow.update({ where: { id: wfId }, data: { status: 'active' } });
                return { success: true, workflowId: wfId, status: 'active' };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use set, remove, list, pause, resume.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── workflow_visualize ──────────────────────────────────────────
async function workflowVisualize(params) {
    const { action = 'dag', ...opts } = params;

    try {
        switch (action) {
            case 'dag': {
                if (!opts.workflowId && !opts.id && !opts.steps) return { success: false, error: 'workflowId or steps required' };
                let steps;
                if (opts.steps) {
                    steps = opts.steps;
                } else {
                    const wf = await prisma.workflow.findUnique({ where: { id: opts.workflowId || opts.id } });
                    if (!wf) return { success: false, error: 'Workflow not found' };
                    steps = Array.isArray(wf.steps) ? wf.steps : [];
                }

                // Generate Mermaid DAG
                const lines = ['graph TD'];
                for (const step of steps) {
                    const label = `${step.id}["${step.tool}${step.condition ? ' ?' : ''}"]`;
                    lines.push(`    ${label}`);
                    for (const dep of step.dependsOn || []) {
                        const edgeLabel = step.condition ? `-->|"${step.condition}"|` : '-->';
                        lines.push(`    ${dep} ${edgeLabel} ${step.id}`);
                    }
                    if (!step.dependsOn?.length && steps.indexOf(step) > 0) {
                        // Implicit sequential dependency
                    }
                }
                // Style nodes
                lines.push('    classDef parallel fill:#4ecdc4,stroke:#333');
                lines.push('    classDef conditional fill:#ffe66d,stroke:#333');
                for (const step of steps) {
                    if (step.parallel) lines.push(`    class ${step.id} parallel`);
                    if (step.condition) lines.push(`    class ${step.id} conditional`);
                }
                const mermaid = lines.join('\n');

                // Also generate text DAG
                const textDag = generateTextDAG(steps);

                return { success: true, mermaid, textDag, nodeCount: steps.length, edgeCount: steps.reduce((s, st) => s + (st.dependsOn?.length || 0), 0) };
            }

            case 'timeline': {
                if (!opts.runId) return { success: false, error: 'runId required' };
                const run = await prisma.workflowRun.findUnique({ where: { id: opts.runId } });
                if (!run) return { success: false, error: 'Run not found' };
                const results = Array.isArray(run.stepResults) ? run.stepResults : [];
                const timeline = results.map(r => ({
                    step: r.stepId,
                    tool: r.tool,
                    status: r.status,
                    duration: r.completedAt && r.startedAt ? new Date(r.completedAt) - new Date(r.startedAt) : 0,
                    startedAt: r.startedAt,
                    completedAt: r.completedAt,
                }));
                return { success: true, timeline, totalDuration: run.durationMs };
            }

            case 'stats': {
                if (!opts.workflowId && !opts.id) return { success: false, error: 'workflowId required' };
                const wfId = opts.workflowId || opts.id;
                const runs = await prisma.workflowRun.findMany({ where: { workflowId: wfId }, orderBy: { startedAt: 'desc' }, take: 100 });
                const completed = runs.filter(r => r.status === 'completed');
                const failed = runs.filter(r => r.status === 'failed');
                const durations = completed.map(r => r.durationMs).sort((a, b) => a - b);
                return {
                    success: true,
                    totalRuns: runs.length,
                    successRate: runs.length ? (completed.length / runs.length * 100).toFixed(1) + '%' : '0%',
                    failureRate: runs.length ? (failed.length / runs.length * 100).toFixed(1) + '%' : '0%',
                    avgDuration: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0,
                    p50Duration: durations.length ? durations[Math.floor(durations.length * 0.5)] : 0,
                    p95Duration: durations.length ? durations[Math.floor(durations.length * 0.95)] : 0,
                    lastRun: runs[0] || null,
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use dag, timeline, stats.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── workflow_optimize ───────────────────────────────────────────
async function workflowOptimize(params) {
    const { action = 'analyze', ...opts } = params;

    try {
        switch (action) {
            case 'analyze': {
                if (!opts.workflowId && !opts.id && !opts.steps) return { success: false, error: 'workflowId or steps required' };
                let steps, wfId;
                if (opts.steps) {
                    steps = opts.steps;
                } else {
                    wfId = opts.workflowId || opts.id;
                    const wf = await prisma.workflow.findUnique({ where: { id: wfId } });
                    if (!wf) return { success: false, error: 'Workflow not found' };
                    steps = Array.isArray(wf.steps) ? wf.steps : [];
                }

                const suggestions = [];

                // 1. Find parallelizable steps (no shared dependencies)
                const parallelGroups = findParallelGroups(steps);
                if (parallelGroups.length > 0) {
                    suggestions.push({
                        type: 'parallelization',
                        impact: 'high',
                        description: `${parallelGroups.length} group(s) of steps can run in parallel`,
                        groups: parallelGroups,
                    });
                }

                // 2. Check for redundant steps (same tool+params)
                const dupes = findDuplicateSteps(steps);
                if (dupes.length > 0) {
                    suggestions.push({
                        type: 'deduplication',
                        impact: 'medium',
                        description: `${dupes.length} duplicate step(s) found — consider caching results`,
                        duplicates: dupes,
                    });
                }

                // 3. Analyze run history for bottlenecks
                if (wfId) {
                    const runs = await prisma.workflowRun.findMany({ where: { workflowId: wfId, status: 'completed' }, take: 20, orderBy: { startedAt: 'desc' } });
                    if (runs.length > 0) {
                        const stepDurations = {};
                        for (const run of runs) {
                            const results = Array.isArray(run.stepResults) ? run.stepResults : [];
                            for (const r of results) {
                                if (r.startedAt && r.completedAt) {
                                    const dur = new Date(r.completedAt) - new Date(r.startedAt);
                                    if (!stepDurations[r.stepId]) stepDurations[r.stepId] = [];
                                    stepDurations[r.stepId].push(dur);
                                }
                            }
                        }
                        const bottlenecks = Object.entries(stepDurations)
                            .map(([id, durs]) => ({ stepId: id, avgMs: Math.round(durs.reduce((s, d) => s + d, 0) / durs.length), maxMs: Math.max(...durs) }))
                            .sort((a, b) => b.avgMs - a.avgMs)
                            .slice(0, 3);
                        if (bottlenecks.length > 0) {
                            suggestions.push({
                                type: 'bottleneck',
                                impact: 'high',
                                description: 'Slowest steps identified from run history',
                                bottlenecks,
                            });
                        }
                    }
                }

                // 4. Check for missing error handling
                const noErrorHandling = steps.filter(s => !s.onError || s.onError === 'stop');
                if (noErrorHandling.length > 2) {
                    suggestions.push({
                        type: 'resilience',
                        impact: 'medium',
                        description: `${noErrorHandling.length} steps use default error handling (stop). Consider using 'skip' or 'retry' for non-critical steps.`,
                        steps: noErrorHandling.map(s => s.id),
                    });
                }

                // 5. Estimate cost based on tool types
                const toolCosts = { llm_chat: 'high', image_create: 'high', api_request: 'low', web_scrape: 'medium' };
                const costEstimate = steps.reduce((total, s) => {
                    const level = toolCosts[s.tool] || 'low';
                    return total + (level === 'high' ? 3 : level === 'medium' ? 2 : 1);
                }, 0);

                return {
                    success: true,
                    suggestions,
                    metrics: {
                        totalSteps: steps.length,
                        maxParallelism: Math.max(...parallelGroups.map(g => g.length), 1),
                        estimatedCostUnits: costEstimate,
                        criticalPathLength: getCriticalPathLength(steps),
                    },
                };
            }

            case 'reorder': {
                if (!opts.steps) return { success: false, error: 'steps required' };
                const optimized = topologicalSort(opts.steps);
                return { success: true, optimizedSteps: optimized, reordered: true };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use analyze, reorder.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function detectCycle(steps) {
    const visited = new Set();
    const stack = new Set();
    const adj = {};
    for (const s of steps) {
        adj[s.id] = s.dependsOn || [];
    }
    function dfs(node) {
        visited.add(node);
        stack.add(node);
        for (const dep of adj[node] || []) {
            if (!visited.has(dep)) { if (dfs(dep)) return true; }
            else if (stack.has(dep)) return true;
        }
        stack.delete(node);
        return false;
    }
    for (const s of steps) {
        if (!visited.has(s.id) && dfs(s.id)) return true;
    }
    return false;
}

function topologicalSort(steps) {
    const inDegree = {};
    const adj = {};
    for (const s of steps) {
        inDegree[s.id] = (s.dependsOn || []).length;
        adj[s.id] = [];
    }
    for (const s of steps) {
        for (const dep of s.dependsOn || []) {
            if (!adj[dep]) adj[dep] = [];
            adj[dep].push(s.id);
        }
    }
    const queue = steps.filter(s => inDegree[s.id] === 0).map(s => s.id);
    const order = [];
    const stepMap = Object.fromEntries(steps.map(s => [s.id, s]));
    while (queue.length > 0) {
        const node = queue.shift();
        order.push(stepMap[node]);
        for (const next of adj[node] || []) {
            inDegree[next]--;
            if (inDegree[next] === 0) queue.push(next);
        }
    }
    // Any remaining are in cycles — append them
    for (const s of steps) {
        if (!order.find(o => o.id === s.id)) order.push(s);
    }
    return order;
}

function evaluateCondition(condition, outputs) {
    try {
        // Simple conditions: "step_1.success === true", "step_2.result.count > 0"
        const parts = condition.match(/^(\w+)\.(.+)$/);
        if (!parts) return true;
        const [, stepId, expr] = parts;
        const data = outputs[stepId];
        if (!data) return false;
        // Safe evaluation of simple comparisons
        const val = expr.split('.').reduce((obj, key) => obj?.[key], data);
        return !!val;
    } catch {
        return true;
    }
}

function interpolateParams(params, outputs) {
    const str = JSON.stringify(params);
    const interpolated = str.replace(/\{\{(\w+)\.([^}]+)\}\}/g, (_, stepId, path) => {
        const data = outputs[stepId];
        if (!data) return '';
        const val = path.split('.').reduce((obj, key) => obj?.[key], data);
        return typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
    });
    try { return JSON.parse(interpolated); } catch { return params; }
}

function isValidCron(expr) {
    const parts = expr.trim().split(/\s+/);
    return parts.length >= 5 && parts.length <= 6;
}

function getNextCronRun(schedule) {
    if (!schedule) return null;
    // Simple next-run estimation
    const now = new Date();
    const parts = schedule.trim().split(/\s+/);
    if (parts.length < 5) return null;
    const [min, hour] = parts;
    const next = new Date(now);
    if (min !== '*') next.setMinutes(parseInt(min) || 0);
    if (hour !== '*') next.setHours(parseInt(hour) || 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
}

function generateTextDAG(steps) {
    const lines = [];
    for (const step of steps) {
        const deps = (step.dependsOn || []).join(', ');
        const prefix = deps ? `[after: ${deps}] ` : '';
        const suffix = step.condition ? ` (if: ${step.condition})` : '';
        const parallel = step.parallel ? ' ⚡' : '';
        lines.push(`${prefix}${step.id}: ${step.tool}${suffix}${parallel}`);
    }
    return lines.join('\n');
}

function findParallelGroups(steps) {
    // Steps with the same set of dependencies can run in parallel
    const groups = {};
    for (const step of steps) {
        const key = JSON.stringify((step.dependsOn || []).sort());
        if (!groups[key]) groups[key] = [];
        groups[key].push(step.id);
    }
    return Object.values(groups).filter(g => g.length > 1);
}

function findDuplicateSteps(steps) {
    const seen = {};
    const dupes = [];
    for (const step of steps) {
        const key = `${step.tool}:${JSON.stringify(step.params)}`;
        if (seen[key]) dupes.push({ original: seen[key], duplicate: step.id, tool: step.tool });
        else seen[key] = step.id;
    }
    return dupes;
}

function getCriticalPathLength(steps) {
    const depMap = {};
    for (const s of steps) depMap[s.id] = s.dependsOn || [];
    function pathLen(id) {
        if (!depMap[id] || depMap[id].length === 0) return 1;
        return 1 + Math.max(...depMap[id].map(pathLen));
    }
    return Math.max(...steps.map(s => pathLen(s.id)));
}

export default {
    workflowCreate,
    workflowExecute,
    workflowSchedule,
    workflowVisualize,
    workflowOptimize,
};
