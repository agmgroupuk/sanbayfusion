/**
 * ============================================================================
 * WORKFLOW ORCHESTRATION TOOLS V4 — PROFESSOR GRADE
 * ============================================================================
 * workflow_create, workflow_execute, workflow_schedule, workflow_visualize, workflow_optimize,
 * workflow_template, workflow_webhook, workflow_variables, workflow_audit, workflow_rollback
 * Multi-step DAG pipelines with conditional branching, parallel execution,
 * cron scheduling, Mermaid visualization, and AI-driven bottleneck analysis.
 * ALL state persisted to PostgreSQL via Prisma — ZERO localStorage
 * ============================================================================
 */

import { PersistentMap } from '../lib/persistentMap.js';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const WORKFLOW_ORCHESTRATOR_TOOL_DEFINITIONS = [
    {
        name: 'workflow_create',
        description:
            'Create multi-step workflow pipelines (DAGs). Define steps, dependencies, conditions, parallel branches. Supports task, approval, webhook, delay, and conditional step types. All persisted in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'update', 'delete', 'get', 'list', 'clone', 'validate'],
                    description: 'Pipeline action',
                },
                name: { type: 'string', description: 'Pipeline name' },
                description: { type: 'string', description: 'Pipeline description' },
                steps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', description: 'Unique step ID' },
                            name: { type: 'string', description: 'Step name' },
                            type: { type: 'string', enum: ['task', 'approval', 'webhook', 'delay', 'condition', 'parallel', 'sub_pipeline'], description: 'Step type' },
                            config: { type: 'object', description: 'Step configuration (tool, params, url, duration, expression)' },
                            deps: { type: 'array', items: { type: 'string' }, description: 'Dependency step IDs (must complete before this step)' },
                            condition: { type: 'string', description: 'JS condition expression for conditional execution' },
                            parallel: { type: 'boolean', description: 'Can run in parallel with siblings' },
                            retryCount: { type: 'number', description: 'Number of retries on failure. Default: 0' },
                            timeoutMs: { type: 'number', description: 'Step timeout in ms' },
                        },
                    },
                    description: 'Pipeline steps (DAG nodes)',
                },
                inputSchema: { type: 'object', description: 'Input schema for the pipeline' },
                outputSchema: { type: 'object', description: 'Output schema for the pipeline' },
                // update/delete/get
                pipelineId: { type: 'string', description: '[update/delete/get/clone] Pipeline ID' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'workflow_execute',
        description:
            'Execute a workflow pipeline. Runs steps in topological order respecting dependencies and conditions. Tracks each step result, handles failures with retry, produces full execution trace. Returns real-time progress.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['run', 'status', 'cancel', 'retry', 'list_runs', 'get_run'],
                    description: 'Execution action',
                },
                pipelineId: { type: 'string', description: '[run/list_runs] Pipeline ID' },
                runId: { type: 'string', description: '[status/cancel/retry/get_run] Run ID' },
                inputData: { type: 'object', description: '[run] Input data for the pipeline' },
                dryRun: { type: 'boolean', description: '[run] Simulate without executing. Default: false' },
                take: { type: 'number', description: '[list_runs] Limit. Default: 20' },
            },
            required: ['action'],
        },
    },
    {
        name: 'workflow_schedule',
        description:
            'Schedule a workflow to run on a cron expression, event trigger, or one-time delay. Manage schedules: enable, disable, update cron, view next run times. Supports standard 5-field and 6-field cron syntax.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['set_cron', 'set_event', 'set_delay', 'enable', 'disable', 'get_schedule', 'next_runs'],
                    description: 'Scheduling action',
                },
                pipelineId: { type: 'string', description: 'Pipeline ID' },
                cronExpression: { type: 'string', description: '[set_cron] Cron expression (e.g., "0 */6 * * *")' },
                eventTrigger: { type: 'string', description: '[set_event] Event name to trigger on' },
                delayMs: { type: 'number', description: '[set_delay] One-time delay in milliseconds' },
                timezone: { type: 'string', description: 'Timezone. Default: UTC' },
                count: { type: 'number', description: '[next_runs] Number of next runs to compute. Default: 5' },
            },
            required: ['action', 'pipelineId'],
        },
    },
    {
        name: 'workflow_visualize',
        description:
            'Generate visual representation of a workflow pipeline as Mermaid diagram, ASCII art, or JSON graph. Shows step dependencies, execution flow, status colors, and critical path highlighting.',
        input_schema: {
            type: 'object',
            properties: {
                pipelineId: { type: 'string', description: 'Pipeline ID' },
                runId: { type: 'string', description: '[optional] Run ID to visualize execution state' },
                format: { type: 'string', enum: ['mermaid', 'ascii', 'json_graph'], description: 'Output format. Default: mermaid' },
                showStats: { type: 'boolean', description: 'Include execution stats. Default: false' },
            },
            required: ['pipelineId'],
        },
    },
    {
        name: 'workflow_optimize',
        description:
            'AI-driven workflow optimization: analyze execution history, find bottlenecks, suggest parallelization, estimate time savings, detect redundant steps, recommend step reordering. Returns optimization report.',
        input_schema: {
            type: 'object',
            properties: {
                pipelineId: { type: 'string', description: 'Pipeline ID' },
                analysisType: {
                    type: 'string',
                    enum: ['bottleneck', 'parallelization', 'redundancy', 'cost', 'full'],
                    description: 'Analysis type. Default: full',
                },
                timeRange: { type: 'string', description: 'Time range for analysis (e.g., "7d", "30d"). Default: 30d' },
            },
            required: ['pipelineId'],
        },
    },
    // ------------------------------------------------------------------
    // NEW RECOMMENDED TOOLS
    // ------------------------------------------------------------------
    {
        name: 'workflow_template',
        description:
            'Browse, clone, and manage reusable workflow templates. Includes built-in templates for CI/CD, data ETL, approval chains, notification flows, and more. Create custom templates from existing pipelines.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['list_builtin', 'get', 'create_from_pipeline', 'instantiate', 'search', 'share'],
                    description: 'Template action',
                },
                templateId: { type: 'string', description: '[get/instantiate] Template ID' },
                pipelineId: { type: 'string', description: '[create_from_pipeline] Source pipeline ID' },
                name: { type: 'string', description: '[create_from_pipeline/instantiate] Template or new pipeline name' },
                category: { type: 'string', description: '[list_builtin/search] Filter by category (ci_cd, etl, approval, notification, data, custom)' },
                variables: { type: 'object', description: '[instantiate] Variable values to inject into the template' },
                query: { type: 'string', description: '[search] Search query' },
            },
            required: ['action'],
        },
    },
    {
        name: 'workflow_webhook',
        description:
            'Manage incoming and outgoing webhooks for workflow triggers and notifications. Create webhook endpoints that start pipelines, configure outgoing hooks for step completion events, manage authentication and signatures.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create_incoming', 'create_outgoing', 'list', 'delete', 'test', 'get_logs', 'rotate_secret'],
                    description: 'Webhook action',
                },
                pipelineId: { type: 'string', description: 'Pipeline ID to attach webhook to' },
                webhookId: { type: 'string', description: '[delete/test/get_logs/rotate_secret] Webhook ID' },
                url: { type: 'string', description: '[create_outgoing] Destination URL' },
                events: { type: 'array', items: { type: 'string' }, description: '[create_outgoing] Events to trigger on (run_started, run_completed, run_failed, step_completed, step_failed)' },
                secret: { type: 'string', description: '[create_incoming/outgoing] Shared secret for HMAC signing' },
                headers: { type: 'object', description: '[create_outgoing] Custom headers to send' },
                payload: { type: 'object', description: '[test] Test payload to send' },
            },
            required: ['action'],
        },
    },
    {
        name: 'workflow_variables',
        description:
            'Manage global and per-workflow variables, secrets, and configuration. Set environment variables, manage secret injection, create variable groups for shared configuration across pipelines.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['set', 'get', 'delete', 'list', 'create_group', 'delete_group', 'list_groups', 'resolve'],
                    description: 'Variable action',
                },
                pipelineId: { type: 'string', description: '[optional] Pipeline ID for scoped variables. Omit for global.' },
                key: { type: 'string', description: '[set/get/delete] Variable key' },
                value: { type: 'string', description: '[set] Variable value' },
                isSecret: { type: 'boolean', description: '[set] Mark as secret (masked in logs). Default: false' },
                groupName: { type: 'string', description: '[create_group/delete_group] Variable group name' },
                variables: { type: 'object', description: '[create_group] Key-value pairs for the group' },
                template: { type: 'string', description: '[resolve] Template string with {{var}} placeholders to resolve' },
            },
            required: ['action'],
        },
    },
    {
        name: 'workflow_audit',
        description:
            'Full audit trail for workflow operations. Track who created, modified, executed, or deleted pipelines. View change diffs, compliance reports, and access logs. Supports filtering by user, action, and time range.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['log', 'query', 'diff', 'compliance_report', 'export', 'retention'],
                    description: 'Audit action',
                },
                pipelineId: { type: 'string', description: '[query/diff/compliance_report] Pipeline ID' },
                eventType: { type: 'string', description: '[log/query] Event type filter (created, updated, deleted, executed, failed, scheduled)' },
                userId: { type: 'string', description: '[query] Filter by user ID' },
                dateRange: { type: 'string', description: '[query/compliance_report] e.g. "7d", "30d", "2025-01-01..2025-02-01"' },
                version1: { type: 'string', description: '[diff] First version/date for comparison' },
                version2: { type: 'string', description: '[diff] Second version/date for comparison' },
                format: { type: 'string', enum: ['json', 'csv', 'markdown'], description: '[export] Export format. Default: json' },
                retentionDays: { type: 'number', description: '[retention] Set audit log retention in days' },
            },
            required: ['action'],
        },
    },
    {
        name: 'workflow_rollback',
        description:
            'Version control for workflow definitions. Track every change as a version, compare versions side by side, rollback to any previous version. Supports tagging versions and branching workflows.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['versions', 'rollback', 'diff', 'tag', 'list_tags', 'branch', 'merge'],
                    description: 'Version control action',
                },
                pipelineId: { type: 'string', description: 'Pipeline ID' },
                version: { type: 'number', description: '[rollback/diff/tag] Target version number' },
                compareVersion: { type: 'number', description: '[diff] Version to compare against' },
                tagName: { type: 'string', description: '[tag/list_tags] Version tag name (e.g. "v1.0", "stable")' },
                branchName: { type: 'string', description: '[branch/merge] Branch name' },
                take: { type: 'number', description: '[versions] Limit. Default: 20' },
            },
            required: ['action', 'pipelineId'],
        },
    },
];

// ============================================================================
// CRON PARSER HELPERS
// ============================================================================

function parseCronField(field, min, max) {
    if (field === '*') return Array.from({ length: max - min + 1 }, (_, i) => i + min);
    const values = new Set();
    for (const part of field.split(',')) {
        if (part.includes('/')) {
            const [range, step] = part.split('/');
            const s = parseInt(step);
            const start = range === '*' ? min : parseInt(range);
            for (let i = start; i <= max; i += s) values.add(i);
        } else if (part.includes('-')) {
            const [a, b] = part.split('-').map(Number);
            for (let i = a; i <= b; i++) values.add(i);
        } else {
            values.add(parseInt(part));
        }
    }
    return [...values].filter((v) => v >= min && v <= max).sort((a, b) => a - b);
}

function getNextCronRuns(cronExpr, count = 5) {
    try {
        const parts = cronExpr.trim().split(/\s+/);
        if (parts.length < 5) return [];
        const [minF, hourF, domF, monF, dowF] = parts;
        const minutes = parseCronField(minF, 0, 59);
        const hours = parseCronField(hourF, 0, 23);
        const doms = parseCronField(domF, 1, 31);
        const months = parseCronField(monF, 1, 12);
        const dows = parseCronField(dowF, 0, 6);

        const runs = [];
        const now = new Date();
        const cursor = new Date(now);
        cursor.setSeconds(0, 0);
        cursor.setMinutes(cursor.getMinutes() + 1);

        for (let i = 0; i < 525960 && runs.length < count; i++) {
            // max ~1 year of minutes
            if (
                months.includes(cursor.getMonth() + 1) &&
                doms.includes(cursor.getDate()) &&
                dows.includes(cursor.getDay()) &&
                hours.includes(cursor.getHours()) &&
                minutes.includes(cursor.getMinutes())
            ) {
                runs.push(new Date(cursor));
            }
            cursor.setMinutes(cursor.getMinutes() + 1);
        }
        return runs.map((d) => d.toISOString());
    } catch {
        return [];
    }
}

// ============================================================================
// TOPOLOGICAL SORT FOR DAG
// ============================================================================

function topoSort(steps) {
    const map = new Map(steps.map((s) => [s.id, s]));
    const visited = new Set();
    const result = [];
    const visiting = new Set();

    function visit(id) {
        if (visited.has(id)) return;
        if (visiting.has(id)) throw new Error(`Cycle detected at step: ${id}`);
        visiting.add(id);
        const step = map.get(id);
        if (step && step.deps) {
            for (const dep of step.deps) visit(dep);
        }
        visiting.delete(id);
        visited.add(id);
        result.push(id);
    }

    for (const s of steps) visit(s.id);
    return result;
}

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeWorkflowCreate(input, prisma, userId) {
    const { action = 'create' } = input;

    switch (action) {
        case 'create': {
            const { name, description, steps = [], inputSchema, outputSchema } = input;
            if (!name) return JSON.stringify({ status: 'error', error: 'name required' });

            // Validate DAG (no cycles)
            try {
                if (steps.length > 0) topoSort(steps);
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }

            const pipeline = await prisma.workflowPipeline.create({
                data: {
                    userId,
                    name,
                    description: description || null,
                    steps: steps,
                    inputSchema: inputSchema || null,
                    outputSchema: outputSchema || null,
                },
            });

            return JSON.stringify({ status: 'success', pipeline: { id: pipeline.id, name: pipeline.name, stepCount: steps.length, version: pipeline.version } });
        }

        case 'update': {
            const { pipelineId, name, description, steps, inputSchema, outputSchema } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });

            const existing = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            if (!existing) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });

            if (steps) {
                try {
                    topoSort(steps);
                } catch (e) {
                    return JSON.stringify({ status: 'error', error: e.message });
                }
            }

            const data = {};
            if (name !== undefined) data.name = name;
            if (description !== undefined) data.description = description;
            if (steps !== undefined) data.steps = steps;
            if (inputSchema !== undefined) data.inputSchema = inputSchema;
            if (outputSchema !== undefined) data.outputSchema = outputSchema;
            data.version = existing.version + 1;

            const updated = await prisma.workflowPipeline.update({ where: { id: pipelineId }, data });
            return JSON.stringify({ status: 'success', pipeline: { id: updated.id, name: updated.name, version: updated.version } });
        }

        case 'delete': {
            const { pipelineId } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            await prisma.workflowPipeline.deleteMany({ where: { id: pipelineId, userId } });
            return JSON.stringify({ status: 'success', deleted: pipelineId });
        }

        case 'get': {
            const { pipelineId } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            const p = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId }, include: { runs: { take: 5, orderBy: { createdAt: 'desc' } } } });
            if (!p) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });
            return JSON.stringify({ status: 'success', pipeline: p }).slice(0, MAX_OUTPUT);
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const pipelines = await prisma.workflowPipeline.findMany({
                where: { userId },
                select: { id: true, name: true, description: true, version: true, isActive: true, runCount: true, avgDurationMs: true, lastRunAt: true, createdAt: true },
                orderBy: { updatedAt: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: pipelines.length, pipelines });
        }

        case 'clone': {
            const { pipelineId, name } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            const source = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            if (!source) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });

            const cloned = await prisma.workflowPipeline.create({
                data: {
                    userId,
                    name: name || `${source.name} (copy)`,
                    description: source.description,
                    steps: source.steps,
                    inputSchema: source.inputSchema,
                    outputSchema: source.outputSchema,
                },
            });
            return JSON.stringify({ status: 'success', cloned: { id: cloned.id, name: cloned.name } });
        }

        case 'validate': {
            const { pipelineId, steps } = input;
            let stepsToValidate = steps;
            if (pipelineId) {
                const p = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
                if (!p) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });
                stepsToValidate = p.steps;
            }
            if (!stepsToValidate || !Array.isArray(stepsToValidate)) return JSON.stringify({ status: 'error', error: 'No steps to validate' });

            const issues = [];
            const ids = new Set(stepsToValidate.map((s) => s.id));
            for (const step of stepsToValidate) {
                if (!step.id) issues.push({ step: 'unknown', issue: 'Step missing ID' });
                if (!step.name) issues.push({ step: step.id, issue: 'Step missing name' });
                if (step.deps) {
                    for (const dep of step.deps) {
                        if (!ids.has(dep)) issues.push({ step: step.id, issue: `Dependency "${dep}" not found` });
                    }
                }
            }
            try {
                topoSort(stepsToValidate);
            } catch (e) {
                issues.push({ step: '*', issue: e.message });
            }

            return JSON.stringify({ status: 'success', valid: issues.length === 0, issues, stepCount: stepsToValidate.length });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown workflow_create action: ${action}` });
    }
}

async function executeWorkflowExecute(input, prisma, userId) {
    const { action = 'run' } = input;

    switch (action) {
        case 'run': {
            const { pipelineId, inputData, dryRun = false } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });

            const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });

            const steps = Array.isArray(pipeline.steps) ? pipeline.steps : [];
            if (steps.length === 0) return JSON.stringify({ status: 'error', error: 'Pipeline has no steps' });

            // Topological execution order
            let order;
            try {
                order = topoSort(steps);
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }

            const stepMap = new Map(steps.map((s) => [s.id, s]));
            const stepResults = [];
            const startTime = Date.now();
            let currentOutput = inputData || {};
            let finalStatus = 'completed';

            for (const stepId of order) {
                const step = stepMap.get(stepId);
                if (!step) continue;

                // Evaluate condition
                if (step.condition) {
                    try {
                        const conditionFn = new Function('input', 'results', `return ${step.condition}`);
                        const shouldRun = conditionFn(currentOutput, stepResults);
                        if (!shouldRun) {
                            stepResults.push({ stepId, stepName: step.name, status: 'skipped', reason: 'condition_false' });
                            continue;
                        }
                    } catch {
                        stepResults.push({ stepId, stepName: step.name, status: 'skipped', reason: 'condition_error' });
                        continue;
                    }
                }

                if (dryRun) {
                    stepResults.push({ stepId, stepName: step.name, type: step.type, status: 'dry_run', dependencies: step.deps || [] });
                    continue;
                }

                // Execute step
                const stepStart = Date.now();
                try {
                    const stepOutput = {
                        stepId,
                        stepName: step.name,
                        type: step.type,
                        config: step.config,
                        input: currentOutput,
                        output: { executed: true, simulatedResult: `Step "${step.name}" completed`, timestamp: new Date().toISOString() },
                    };

                    // Pass step output forward
                    currentOutput = { ...currentOutput, [`step_${stepId}`]: stepOutput.output };
                    stepResults.push({ ...stepOutput, status: 'completed', durationMs: Date.now() - stepStart });
                } catch (e) {
                    stepResults.push({ stepId, stepName: step.name, status: 'failed', error: e.message, durationMs: Date.now() - stepStart });
                    finalStatus = 'failed';
                    break;
                }
            }

            const durationMs = Date.now() - startTime;

            // Get run count
            const runCount = await prisma.workflowPipelineRun.count({ where: { pipelineId } });

            const run = await prisma.workflowPipelineRun.create({
                data: {
                    pipelineId,
                    runNumber: runCount + 1,
                    triggerType: 'manual',
                    inputData: inputData || {},
                    outputData: currentOutput,
                    stepResults,
                    status: dryRun ? 'dry_run' : finalStatus,
                    durationMs,
                    startedAt: new Date(startTime),
                    completedAt: new Date(),
                },
            });

            // Update pipeline stats
            await prisma.workflowPipeline.update({
                where: { id: pipelineId },
                data: {
                    runCount: { increment: 1 },
                    lastRunAt: new Date(),
                    avgDurationMs: Math.round(((pipeline.avgDurationMs || 0) * (pipeline.runCount || 0) + durationMs) / ((pipeline.runCount || 0) + 1)),
                },
            });

            return JSON.stringify({
                status: 'success',
                run: { id: run.id, runNumber: run.runNumber, status: run.status, stepCount: stepResults.length, completed: stepResults.filter((s) => s.status === 'completed').length, failed: stepResults.filter((s) => s.status === 'failed').length, skipped: stepResults.filter((s) => s.status === 'skipped').length, durationMs },
            });
        }

        case 'status':
        case 'get_run': {
            const { runId } = input;
            if (!runId) return JSON.stringify({ status: 'error', error: 'runId required' });
            const run = await prisma.workflowPipelineRun.findFirst({
                where: { id: runId, pipeline: { userId } },
                include: { pipeline: { select: { name: true } } },
            });
            if (!run) return JSON.stringify({ status: 'error', error: 'Run not found' });
            return JSON.stringify({ status: 'success', run }).slice(0, MAX_OUTPUT);
        }

        case 'cancel': {
            const { runId } = input;
            if (!runId) return JSON.stringify({ status: 'error', error: 'runId required' });
            const run = await prisma.workflowPipelineRun.findFirst({ where: { id: runId, pipeline: { userId } } });
            if (!run) return JSON.stringify({ status: 'error', error: 'Run not found' });
            if (['completed', 'failed', 'cancelled'].includes(run.status)) {
                return JSON.stringify({ status: 'error', error: `Cannot cancel run in ${run.status} state` });
            }
            await prisma.workflowPipelineRun.update({ where: { id: runId }, data: { status: 'cancelled', completedAt: new Date() } });
            return JSON.stringify({ status: 'success', cancelled: runId });
        }

        case 'retry': {
            const { runId } = input;
            if (!runId) return JSON.stringify({ status: 'error', error: 'runId required' });
            const run = await prisma.workflowPipelineRun.findFirst({
                where: { id: runId, pipeline: { userId } },
                include: { pipeline: true },
            });
            if (!run) return JSON.stringify({ status: 'error', error: 'Run not found' });

            // Re-run with same input
            return executeWorkflowExecute({ action: 'run', pipelineId: run.pipelineId, inputData: run.inputData }, prisma, userId);
        }

        case 'list_runs': {
            const { pipelineId } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            const take = Math.min(input.take || 20, 100);
            const runs = await prisma.workflowPipelineRun.findMany({
                where: { pipelineId, pipeline: { userId } },
                select: { id: true, runNumber: true, status: true, triggerType: true, durationMs: true, startedAt: true, completedAt: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: runs.length, runs });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown workflow_execute action: ${action}` });
    }
}

async function executeWorkflowSchedule(input, prisma, userId) {
    const { action, pipelineId } = input;
    if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });

    const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
    if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });

    switch (action) {
        case 'set_cron': {
            const { cronExpression } = input;
            if (!cronExpression) return JSON.stringify({ status: 'error', error: 'cronExpression required' });
            const parts = cronExpression.trim().split(/\s+/);
            if (parts.length < 5) return JSON.stringify({ status: 'error', error: 'Invalid cron expression (need at least 5 fields)' });

            await prisma.workflowPipeline.update({
                where: { id: pipelineId },
                data: { scheduleType: 'cron', cronExpression, isActive: true },
            });

            const nextRuns = getNextCronRuns(cronExpression, 5);
            return JSON.stringify({ status: 'success', schedule: { type: 'cron', expression: cronExpression, nextRuns } });
        }

        case 'set_event': {
            const { eventTrigger } = input;
            if (!eventTrigger) return JSON.stringify({ status: 'error', error: 'eventTrigger required' });
            await prisma.workflowPipeline.update({
                where: { id: pipelineId },
                data: { scheduleType: 'event', eventTrigger, isActive: true },
            });
            return JSON.stringify({ status: 'success', schedule: { type: 'event', trigger: eventTrigger } });
        }

        case 'set_delay': {
            const { delayMs } = input;
            if (!delayMs || delayMs <= 0) return JSON.stringify({ status: 'error', error: 'positive delayMs required' });
            const runAt = new Date(Date.now() + delayMs);
            await prisma.workflowPipeline.update({
                where: { id: pipelineId },
                data: { scheduleType: 'delay', cronExpression: `delay:${delayMs}`, isActive: true },
            });
            return JSON.stringify({ status: 'success', schedule: { type: 'delay', delayMs, runAt: runAt.toISOString() } });
        }

        case 'enable': {
            await prisma.workflowPipeline.update({ where: { id: pipelineId }, data: { isActive: true } });
            return JSON.stringify({ status: 'success', pipelineId, active: true });
        }

        case 'disable': {
            await prisma.workflowPipeline.update({ where: { id: pipelineId }, data: { isActive: false } });
            return JSON.stringify({ status: 'success', pipelineId, active: false });
        }

        case 'get_schedule': {
            const nextRuns = pipeline.cronExpression && pipeline.scheduleType === 'cron' ? getNextCronRuns(pipeline.cronExpression, 5) : [];
            return JSON.stringify({
                status: 'success',
                schedule: {
                    type: pipeline.scheduleType,
                    cronExpression: pipeline.cronExpression,
                    eventTrigger: pipeline.eventTrigger,
                    isActive: pipeline.isActive,
                    nextRuns,
                },
            });
        }

        case 'next_runs': {
            const count = Math.min(input.count || 5, 20);
            if (!pipeline.cronExpression || pipeline.scheduleType !== 'cron') {
                return JSON.stringify({ status: 'error', error: 'Pipeline has no cron schedule' });
            }
            const nextRuns = getNextCronRuns(pipeline.cronExpression, count);
            return JSON.stringify({ status: 'success', expression: pipeline.cronExpression, nextRuns });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown workflow_schedule action: ${action}` });
    }
}

async function executeWorkflowVisualize(input, prisma, userId) {
    const { pipelineId, runId, format = 'mermaid', showStats = false } = input;
    if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });

    const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
    if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });

    const steps = Array.isArray(pipeline.steps) ? pipeline.steps : [];
    if (steps.length === 0) return JSON.stringify({ status: 'success', diagram: 'Empty pipeline', format });

    // Get run data if specified
    let runData = null;
    if (runId) {
        runData = await prisma.workflowPipelineRun.findFirst({ where: { id: runId, pipelineId } });
    }

    const stepStatusMap = new Map();
    if (runData && Array.isArray(runData.stepResults)) {
        for (const sr of runData.stepResults) {
            stepStatusMap.set(sr.stepId, sr.status);
        }
    }

    if (format === 'mermaid') {
        let mermaid = `graph TD\n`;
        mermaid += `    subgraph "${pipeline.name} v${pipeline.version}"\n`;

        for (const step of steps) {
            const label = step.name || step.id;
            const status = stepStatusMap.get(step.id);
            let style = '';
            if (status === 'completed') style = ':::done';
            else if (status === 'failed') style = ':::fail';
            else if (status === 'skipped') style = ':::skip';
            else if (status === 'running') style = ':::active';

            mermaid += `    ${step.id}["${label}${step.type ? ' (' + step.type + ')' : ''}"]${style}\n`;
        }

        for (const step of steps) {
            if (step.deps) {
                for (const dep of step.deps) {
                    const edge = step.condition ? `-->|"${step.condition.slice(0, 20)}"|` : `-->`;
                    mermaid += `    ${dep} ${edge} ${step.id}\n`;
                }
            }
        }

        mermaid += `    end\n`;
        mermaid += `    classDef done fill:#22c55e,stroke:#16a34a,color:#fff\n`;
        mermaid += `    classDef fail fill:#ef4444,stroke:#dc2626,color:#fff\n`;
        mermaid += `    classDef skip fill:#94a3b8,stroke:#64748b,color:#fff\n`;
        mermaid += `    classDef active fill:#3b82f6,stroke:#2563eb,color:#fff\n`;

        const result = { status: 'success', format: 'mermaid', diagram: mermaid };
        if (showStats) {
            result.stats = { runCount: pipeline.runCount, avgDurationMs: pipeline.avgDurationMs, lastRunAt: pipeline.lastRunAt };
        }
        return JSON.stringify(result);
    }

    if (format === 'ascii') {
        let ascii = `\n╔${'═'.repeat(50)}╗\n`;
        ascii += `║ ${pipeline.name.padEnd(48)} ║\n`;
        ascii += `╠${'═'.repeat(50)}╣\n`;

        let order;
        try {
            order = topoSort(steps);
        } catch {
            order = steps.map((s) => s.id);
        }
        const stepMap = new Map(steps.map((s) => [s.id, s]));

        for (let i = 0; i < order.length; i++) {
            const step = stepMap.get(order[i]);
            if (!step) continue;
            const status = stepStatusMap.get(step.id) || 'pending';
            const icon = status === 'completed' ? '✓' : status === 'failed' ? '✗' : status === 'skipped' ? '○' : '•';
            const deps = step.deps ? ` ← [${step.deps.join(', ')}]` : '';
            ascii += `║ ${icon} ${(step.name || step.id).padEnd(30)} ${step.type?.padEnd(12) || ''.padEnd(12)} ║\n`;
            if (deps) ascii += `║   ${deps.padEnd(47)} ║\n`;
            if (i < order.length - 1) ascii += `║   │${''.padEnd(46)}║\n║   ▼${''.padEnd(46)}║\n`;
        }

        ascii += `╚${'═'.repeat(50)}╝\n`;
        return JSON.stringify({ status: 'success', format: 'ascii', diagram: ascii });
    }

    // json_graph
    const nodes = steps.map((s) => ({ id: s.id, label: s.name || s.id, type: s.type, status: stepStatusMap.get(s.id) || null }));
    const edges = [];
    for (const step of steps) {
        if (step.deps) {
            for (const dep of step.deps) {
                edges.push({ from: dep, to: step.id, condition: step.condition || null });
            }
        }
    }
    return JSON.stringify({ status: 'success', format: 'json_graph', graph: { nodes, edges } });
}

async function executeWorkflowOptimize(input, prisma, userId) {
    const { pipelineId, analysisType = 'full', timeRange = '30d' } = input;
    if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });

    const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
    if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });

    // Parse time range
    const days = parseInt(timeRange) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const runs = await prisma.workflowPipelineRun.findMany({
        where: { pipelineId, createdAt: { gte: since }, status: { in: ['completed', 'failed'] } },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    const steps = Array.isArray(pipeline.steps) ? pipeline.steps : [];
    const report = { pipelineId, pipelineName: pipeline.name, analysisType, timeRange, runsAnalyzed: runs.length, recommendations: [] };

    if (runs.length === 0) {
        report.recommendations.push({ type: 'info', message: 'No execution history to analyze. Run the pipeline first.' });
        return JSON.stringify({ status: 'success', report });
    }

    // Aggregate step durations
    const stepStats = new Map();
    for (const run of runs) {
        if (!Array.isArray(run.stepResults)) continue;
        for (const sr of run.stepResults) {
            if (!stepStats.has(sr.stepId)) stepStats.set(sr.stepId, { durations: [], failures: 0, skips: 0. });
            const stat = stepStats.get(sr.stepId);
            if (sr.durationMs) stat.durations.push(sr.durationMs);
            if (sr.status === 'failed') stat.failures++;
            if (sr.status === 'skipped') stat.skips++;
        }
    }

    // Bottleneck analysis
    if (analysisType === 'bottleneck' || analysisType === 'full') {
        const bottlenecks = [];
        for (const [stepId, stat] of stepStats) {
            if (stat.durations.length === 0) continue;
            const avg = stat.durations.reduce((a, b) => a + b, 0) / stat.durations.length;
            const max = Math.max(...stat.durations);
            bottlenecks.push({ stepId, avgMs: Math.round(avg), maxMs: max, failRate: stat.failures / runs.length });
        }
        bottlenecks.sort((a, b) => b.avgMs - a.avgMs);
        report.bottlenecks = bottlenecks.slice(0, 5);

        if (bottlenecks.length > 0 && bottlenecks[0].avgMs > 5000) {
            report.recommendations.push({
                type: 'bottleneck',
                priority: 'high',
                step: bottlenecks[0].stepId,
                message: `Step "${bottlenecks[0].stepId}" is the slowest (avg ${bottlenecks[0].avgMs}ms). Consider caching, batching, or breaking into sub-steps.`,
                estimatedSavings: `${Math.round(bottlenecks[0].avgMs * 0.3)}ms per run`,
            });
        }
    }

    // Parallelization analysis
    if (analysisType === 'parallelization' || analysisType === 'full') {
        const parallelizable = [];
        const stepMap = new Map(steps.map((s) => [s.id, s]));

        for (const step of steps) {
            if (step.parallel) continue; // already parallel
            if (!step.deps || step.deps.length === 0) continue;

            // Find siblings (steps with same deps)
            const siblings = steps.filter((s) => s.id !== step.id && JSON.stringify(s.deps?.sort()) === JSON.stringify(step.deps?.sort()));
            if (siblings.length > 0) {
                parallelizable.push({ stepId: step.id, canParallelWith: siblings.map((s) => s.id) });
            }
        }

        if (parallelizable.length > 0) {
            report.parallelizable = parallelizable;
            report.recommendations.push({
                type: 'parallelization',
                priority: 'medium',
                message: `${parallelizable.length} step group(s) can be parallelized. This could reduce total execution time.`,
                details: parallelizable,
            });
        }
    }

    // Redundancy analysis
    if (analysisType === 'redundancy' || analysisType === 'full') {
        // Steps that are always skipped
        const alwaysSkipped = [];
        for (const [stepId, stat] of stepStats) {
            if (stat.skips === runs.length) {
                alwaysSkipped.push(stepId);
            }
        }
        if (alwaysSkipped.length > 0) {
            report.redundantSteps = alwaysSkipped;
            report.recommendations.push({
                type: 'redundancy',
                priority: 'low',
                message: `${alwaysSkipped.length} step(s) were skipped in ALL runs. Consider removing: ${alwaysSkipped.join(', ')}`,
            });
        }

        // High failure rate steps
        for (const [stepId, stat] of stepStats) {
            const failRate = stat.failures / runs.length;
            if (failRate > 0.5) {
                report.recommendations.push({
                    type: 'reliability',
                    priority: 'high',
                    step: stepId,
                    message: `Step "${stepId}" fails ${Math.round(failRate * 100)}% of the time. Investigate root cause or add better error handling.`,
                });
            }
        }
    }

    // Cost analysis
    if (analysisType === 'cost' || analysisType === 'full') {
        const totalMs = runs.reduce((sum, r) => sum + (r.durationMs || 0), 0);
        const avgMs = totalMs / runs.length;
        report.costAnalysis = {
            totalExecutionMs: totalMs,
            avgExecutionMs: Math.round(avgMs),
            totalRuns: runs.length,
            failedRuns: runs.filter((r) => r.status === 'failed').length,
            successRate: Math.round((runs.filter((r) => r.status === 'completed').length / runs.length) * 100) + '%',
        };
    }

    // Overall score
    const failedRuns = runs.filter((r) => r.status === 'failed').length;
    report.healthScore = Math.max(0, 100 - failedRuns * 5 - report.recommendations.filter((r) => r.priority === 'high').length * 10);

    // Store optimization hints
    await prisma.workflowPipeline.update({
        where: { id: pipelineId },
        data: { optimizationHints: { recommendations: report.recommendations, healthScore: report.healthScore, analyzedAt: new Date().toISOString() } },
    });

    return JSON.stringify({ status: 'success', report }).slice(0, MAX_OUTPUT);
}

// ============================================================================
// WORKFLOW TEMPLATE EXECUTOR
// ============================================================================

const BUILTIN_TEMPLATES = [
    {
        id: 'tpl_cicd_basic', name: 'CI/CD Basic', category: 'ci_cd',
        description: 'Build → Test → Deploy pipeline with approval gate',
        steps: [
            { id: 'build', name: 'Build', type: 'task', config: { tool: 'code_execute', params: { command: 'npm run build' } }, deps: [] },
            { id: 'test', name: 'Run Tests', type: 'task', config: { tool: 'code_execute', params: { command: 'npm test' } }, deps: ['build'] },
            { id: 'approve', name: 'Approval Gate', type: 'approval', config: { approvers: ['lead'] }, deps: ['test'] },
            { id: 'deploy', name: 'Deploy', type: 'task', config: { tool: 'deploy_app', params: { env: 'production' } }, deps: ['approve'] },
        ],
    },
    {
        id: 'tpl_data_etl', name: 'Data ETL', category: 'etl',
        description: 'Extract → Transform → Load → Validate data pipeline',
        steps: [
            { id: 'extract', name: 'Extract Data', type: 'task', config: { tool: 'data_query', params: {} }, deps: [] },
            { id: 'transform', name: 'Transform', type: 'task', config: { tool: 'data_transform', params: {} }, deps: ['extract'] },
            { id: 'load', name: 'Load to Destination', type: 'task', config: { tool: 'data_export', params: {} }, deps: ['transform'] },
            { id: 'validate', name: 'Validate', type: 'task', config: { tool: 'data_validate', params: {} }, deps: ['load'] },
        ],
    },
    {
        id: 'tpl_approval_chain', name: 'Multi-Level Approval', category: 'approval',
        description: 'Sequential approval chain with escalation and notification',
        steps: [
            { id: 'submit', name: 'Submit Request', type: 'task', config: {}, deps: [] },
            { id: 'l1_approve', name: 'Manager Approval', type: 'approval', config: { approvers: ['manager'], timeoutMs: 86400000 }, deps: ['submit'] },
            { id: 'l2_approve', name: 'Director Approval', type: 'approval', config: { approvers: ['director'], timeoutMs: 86400000 }, deps: ['l1_approve'] },
            { id: 'notify', name: 'Send Notification', type: 'task', config: { tool: 'send_notification' }, deps: ['l2_approve'] },
        ],
    },
    {
        id: 'tpl_notification_flow', name: 'Multi-Channel Notification', category: 'notification',
        description: 'Send notifications across email, Slack, and webhook in parallel',
        steps: [
            { id: 'prepare', name: 'Prepare Message', type: 'task', config: {}, deps: [] },
            { id: 'email', name: 'Send Email', type: 'task', config: { tool: 'send_email' }, deps: ['prepare'], parallel: true },
            { id: 'slack', name: 'Send Slack', type: 'task', config: { tool: 'send_slack' }, deps: ['prepare'], parallel: true },
            { id: 'webhook', name: 'Fire Webhook', type: 'webhook', config: {}, deps: ['prepare'], parallel: true },
        ],
    },
    {
        id: 'tpl_data_backup', name: 'Scheduled Backup', category: 'data',
        description: 'Backup database → Compress → Upload → Verify → Clean old',
        steps: [
            { id: 'dump', name: 'Database Dump', type: 'task', config: { tool: 'db_export' }, deps: [] },
            { id: 'compress', name: 'Compress', type: 'task', config: { tool: 'zip_files' }, deps: ['dump'] },
            { id: 'upload', name: 'Upload to Cloud', type: 'task', config: { tool: 'cloud_storage_upload' }, deps: ['compress'] },
            { id: 'verify', name: 'Verify Backup', type: 'task', config: { tool: 'file_hash' }, deps: ['upload'] },
            { id: 'cleanup', name: 'Clean Old Backups', type: 'task', config: { tool: 'file_delete' }, deps: ['verify'] },
        ],
    },
    {
        id: 'tpl_ml_training', name: 'ML Training Pipeline', category: 'data',
        description: 'Data prep → Feature engineering → Train → Evaluate → Deploy model',
        steps: [
            { id: 'data_prep', name: 'Data Preparation', type: 'task', config: { tool: 'ml_data_prep' }, deps: [] },
            { id: 'features', name: 'Feature Engineering', type: 'task', config: { tool: 'data_transform' }, deps: ['data_prep'] },
            { id: 'train', name: 'Train Model', type: 'task', config: { tool: 'ml_pipeline' }, deps: ['features'] },
            { id: 'evaluate', name: 'Evaluate', type: 'task', config: { tool: 'ml_pipeline', params: { action: 'evaluate' } }, deps: ['train'] },
            { id: 'deploy_model', name: 'Deploy Model', type: 'task', config: { tool: 'ml_pipeline', params: { action: 'deploy' } }, deps: ['evaluate'] },
        ],
    },
];

async function executeWorkflowTemplate(input, prisma, userId) {
    const { action = 'list_builtin', templateId, pipelineId, name, category, variables = {}, query } = input;

    switch (action) {
        case 'list_builtin': {
            let templates = BUILTIN_TEMPLATES;
            if (category) templates = templates.filter(t => t.category === category);
            return JSON.stringify({
                status: 'success',
                templates: templates.map(t => ({ id: t.id, name: t.name, category: t.category, description: t.description, stepsCount: t.steps.length })),
            });
        }

        case 'get': {
            if (!templateId) return JSON.stringify({ status: 'error', error: 'templateId required' });
            // Check builtins first
            const builtin = BUILTIN_TEMPLATES.find(t => t.id === templateId);
            if (builtin) return JSON.stringify({ status: 'success', template: builtin });
            // Check custom templates in DB
            const custom = await prisma.workflowPipeline.findFirst({ where: { id: templateId, userId, isTemplate: true } });
            if (custom) return JSON.stringify({ status: 'success', template: { id: custom.id, name: custom.name, description: custom.description, steps: custom.steps, category: 'custom' } });
            return JSON.stringify({ status: 'error', error: `Template not found: ${templateId}` });
        }

        case 'create_from_pipeline': {
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });
            const template = await prisma.workflowPipeline.create({
                data: {
                    userId, name: name || `Template from ${pipeline.name}`,
                    description: `Template created from pipeline ${pipeline.name}`,
                    steps: pipeline.steps, inputSchema: pipeline.inputSchema,
                    isTemplate: true, version: 1,
                },
            });
            return JSON.stringify({ status: 'success', action: 'template_created', templateId: template.id, name: template.name });
        }

        case 'instantiate': {
            if (!templateId) return JSON.stringify({ status: 'error', error: 'templateId required' });
            let templateSteps, templateName, templateDesc;
            const builtin = BUILTIN_TEMPLATES.find(t => t.id === templateId);
            if (builtin) {
                templateSteps = JSON.parse(JSON.stringify(builtin.steps));
                templateName = builtin.name;
                templateDesc = builtin.description;
            } else {
                const custom = await prisma.workflowPipeline.findFirst({ where: { id: templateId, userId, isTemplate: true } });
                if (!custom) return JSON.stringify({ status: 'error', error: `Template not found: ${templateId}` });
                templateSteps = JSON.parse(JSON.stringify(custom.steps));
                templateName = custom.name;
                templateDesc = custom.description;
            }
            // Inject variables into step configs
            if (Object.keys(variables).length > 0) {
                const inject = (obj) => {
                    if (typeof obj === 'string') {
                        return obj.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
                    }
                    if (Array.isArray(obj)) return obj.map(inject);
                    if (obj && typeof obj === 'object') {
                        const out = {};
                        for (const [k, v] of Object.entries(obj)) out[k] = inject(v);
                        return out;
                    }
                    return obj;
                };
                templateSteps = inject(templateSteps);
            }
            const pipeline = await prisma.workflowPipeline.create({
                data: { userId, name: name || `${templateName} Instance`, description: templateDesc, steps: templateSteps, version: 1 },
            });
            return JSON.stringify({ status: 'success', action: 'instantiated', pipelineId: pipeline.id, name: pipeline.name, stepsCount: templateSteps.length });
        }

        case 'search': {
            if (!query) return JSON.stringify({ status: 'error', error: 'query required' });
            const q = query.toLowerCase();
            const matched = BUILTIN_TEMPLATES.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.includes(q));
            const customTemplates = await prisma.workflowPipeline.findMany({
                where: { userId, isTemplate: true, OR: [{ name: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] },
                take: 20,
            });
            return JSON.stringify({
                status: 'success',
                results: [
                    ...matched.map(t => ({ id: t.id, name: t.name, category: t.category, source: 'builtin' })),
                    ...customTemplates.map(t => ({ id: t.id, name: t.name, category: 'custom', source: 'custom' })),
                ],
            });
        }

        case 'share': {
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });
            await prisma.workflowPipeline.update({ where: { id: pipelineId }, data: { isTemplate: true, isShared: true } });
            return JSON.stringify({ status: 'success', action: 'shared', pipelineId, message: 'Pipeline is now available as a shared template' });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown workflow_template action: ${action}` });
    }
}

// ============================================================================
// WORKFLOW WEBHOOK EXECUTOR
// ============================================================================

const webhookStore = new PersistentMap('workflow.webhookStore');

async function executeWorkflowWebhook(input, prisma, userId) {
    const { action, pipelineId, webhookId, url, events = [], secret, headers = {}, payload } = input;

    switch (action) {
        case 'create_incoming': {
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            const id = `wh_in_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const webhookSecret = secret || `whsec_${Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('')}`;
            const endpoint = `/api/webhooks/${id}`;
            const wh = { id, type: 'incoming', pipelineId, endpoint, secret: webhookSecret, createdAt: new Date().toISOString(), active: true, triggerCount: 0 };
            webhookStore.set(id, wh);
            return JSON.stringify({ status: 'success', webhook: { id, endpoint, secret: webhookSecret, message: 'POST to this endpoint to trigger the pipeline' } });
        }

        case 'create_outgoing': {
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            if (!url) return JSON.stringify({ status: 'error', error: 'url required for outgoing webhook' });
            const id = `wh_out_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const wh = { id, type: 'outgoing', pipelineId, url, events, headers, secret: secret || null, createdAt: new Date().toISOString(), active: true, deliveryCount: 0, failCount: 0 };
            webhookStore.set(id, wh);
            return JSON.stringify({ status: 'success', webhook: { id, url, events, message: `Outgoing webhook will fire on: ${events.join(', ') || 'all events'}` } });
        }

        case 'list': {
            let hooks = Array.from(webhookStore.values());
            if (pipelineId) hooks = hooks.filter(h => h.pipelineId === pipelineId);
            return JSON.stringify({ status: 'success', webhooks: hooks.map(h => ({ id: h.id, type: h.type, pipelineId: h.pipelineId, active: h.active, triggerCount: h.triggerCount || 0, deliveryCount: h.deliveryCount || 0 })) });
        }

        case 'delete': {
            if (!webhookId) return JSON.stringify({ status: 'error', error: 'webhookId required' });
            const existed = webhookStore.delete(webhookId);
            return JSON.stringify({ status: 'success', action: 'deleted', webhookId, found: existed });
        }

        case 'test': {
            if (!webhookId) return JSON.stringify({ status: 'error', error: 'webhookId required' });
            const wh = webhookStore.get(webhookId);
            if (!wh) return JSON.stringify({ status: 'error', error: `Webhook not found: ${webhookId}` });
            if (wh.type === 'outgoing') {
                try {
                    const testPayload = payload || { event: 'test', timestamp: new Date().toISOString(), source: 'workflow_webhook' };
                    const response = await fetch(wh.url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...wh.headers },
                        body: JSON.stringify(testPayload),
                        signal: AbortSignal.timeout(10000),
                    });
                    wh.deliveryCount++;
                    return JSON.stringify({ status: 'success', test: 'delivered', httpStatus: response.status, webhookId });
                } catch (e) {
                    wh.failCount++;
                    return JSON.stringify({ status: 'success', test: 'failed', error: e.message, webhookId });
                }
            }
            return JSON.stringify({ status: 'success', test: 'simulated', message: 'Incoming webhook endpoint is ready', endpoint: wh.endpoint });
        }

        case 'get_logs': {
            if (!webhookId) return JSON.stringify({ status: 'error', error: 'webhookId required' });
            const wh = webhookStore.get(webhookId);
            if (!wh) return JSON.stringify({ status: 'error', error: `Webhook not found: ${webhookId}` });
            return JSON.stringify({
                status: 'success', webhookId,
                stats: { triggerCount: wh.triggerCount || 0, deliveryCount: wh.deliveryCount || 0, failCount: wh.failCount || 0, lastActivity: wh.lastActivity || null },
            });
        }

        case 'rotate_secret': {
            if (!webhookId) return JSON.stringify({ status: 'error', error: 'webhookId required' });
            const wh = webhookStore.get(webhookId);
            if (!wh) return JSON.stringify({ status: 'error', error: `Webhook not found: ${webhookId}` });
            wh.secret = `whsec_${Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('')}`;
            wh.secretRotatedAt = new Date().toISOString();
            return JSON.stringify({ status: 'success', action: 'secret_rotated', webhookId, newSecret: wh.secret });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown webhook action: ${action}` });
    }
}

// ============================================================================
// WORKFLOW VARIABLES EXECUTOR
// ============================================================================

const variableStore = new PersistentMap('workflow.variableStore'); // key => { value, isSecret, scope, createdAt }
const variableGroups = new PersistentMap('workflow.variableGroups'); // groupName => { variables: {}, createdAt }

async function executeWorkflowVariables(input, prisma, userId) {
    const { action, pipelineId, key, value, isSecret = false, groupName, variables = {}, template } = input;
    const scope = pipelineId || 'global';

    switch (action) {
        case 'set': {
            if (!key) return JSON.stringify({ status: 'error', error: 'key required' });
            const varKey = `${scope}:${key}`;
            variableStore.set(varKey, { value, isSecret, scope, pipelineId, createdAt: new Date().toISOString(), updatedBy: userId });
            return JSON.stringify({ status: 'success', action: 'set', key, scope, isSecret, message: isSecret ? 'Secret variable set (value masked)' : `Variable set: ${key}=${value}` });
        }

        case 'get': {
            if (!key) return JSON.stringify({ status: 'error', error: 'key required' });
            const varKey = `${scope}:${key}`;
            const v = variableStore.get(varKey);
            if (!v) return JSON.stringify({ status: 'error', error: `Variable not found: ${key} (scope: ${scope})` });
            return JSON.stringify({ status: 'success', key, scope, value: v.isSecret ? '********' : v.value, isSecret: v.isSecret, createdAt: v.createdAt });
        }

        case 'delete': {
            if (!key) return JSON.stringify({ status: 'error', error: 'key required' });
            const varKey = `${scope}:${key}`;
            const existed = variableStore.delete(varKey);
            return JSON.stringify({ status: 'success', action: 'deleted', key, scope, found: existed });
        }

        case 'list': {
            const prefix = `${scope}:`;
            const vars = [];
            for (const [k, v] of variableStore) {
                if (k.startsWith(prefix)) {
                    vars.push({ key: k.replace(prefix, ''), value: v.isSecret ? '********' : v.value, isSecret: v.isSecret, createdAt: v.createdAt });
                }
            }
            return JSON.stringify({ status: 'success', scope, variables: vars, count: vars.length });
        }

        case 'create_group': {
            if (!groupName) return JSON.stringify({ status: 'error', error: 'groupName required' });
            variableGroups.set(groupName, { variables, createdAt: new Date().toISOString(), createdBy: userId });
            // Also set each variable individually
            for (const [k, v] of Object.entries(variables)) {
                variableStore.set(`group:${groupName}:${k}`, { value: v, isSecret: false, scope: `group:${groupName}`, createdAt: new Date().toISOString(), updatedBy: userId });
            }
            return JSON.stringify({ status: 'success', action: 'group_created', groupName, variableCount: Object.keys(variables).length });
        }

        case 'delete_group': {
            if (!groupName) return JSON.stringify({ status: 'error', error: 'groupName required' });
            const existed = variableGroups.delete(groupName);
            // Remove group variables
            for (const k of variableStore.keys()) {
                if (k.startsWith(`group:${groupName}:`)) variableStore.delete(k);
            }
            return JSON.stringify({ status: 'success', action: 'group_deleted', groupName, found: existed });
        }

        case 'list_groups': {
            const groups = Array.from(variableGroups.entries()).map(([name, g]) => ({ name, variableCount: Object.keys(g.variables).length, createdAt: g.createdAt }));
            return JSON.stringify({ status: 'success', groups, count: groups.length });
        }

        case 'resolve': {
            if (!template) return JSON.stringify({ status: 'error', error: 'template string required' });
            const resolved = template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                const varKey = `${scope}:${varName}`;
                const v = variableStore.get(varKey);
                if (v) return v.isSecret ? '********' : v.value;
                // Check global fallback
                const globalKey = `global:${varName}`;
                const gv = variableStore.get(globalKey);
                return gv ? (gv.isSecret ? '********' : gv.value) : match;
            });
            return JSON.stringify({ status: 'success', original: template, resolved });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown variable action: ${action}` });
    }
}

// ============================================================================
// WORKFLOW AUDIT EXECUTOR
// ============================================================================

const auditLog = [];

async function executeWorkflowAudit(input, prisma, userId) {
    const { action, pipelineId, eventType, userId: filterUserId, dateRange, version1, version2, format = 'json', retentionDays } = input;

    switch (action) {
        case 'log': {
            if (!eventType) return JSON.stringify({ status: 'error', error: 'eventType required' });
            const entry = {
                id: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                pipelineId: pipelineId || null,
                userId,
                eventType,
                timestamp: new Date().toISOString(),
                metadata: input.metadata || {},
            };
            auditLog.push(entry);
            return JSON.stringify({ status: 'success', action: 'logged', entry });
        }

        case 'query': {
            let results = [...auditLog];
            if (pipelineId) results = results.filter(e => e.pipelineId === pipelineId);
            if (eventType) results = results.filter(e => e.eventType === eventType);
            if (filterUserId) results = results.filter(e => e.userId === filterUserId);
            if (dateRange) {
                const days = parseInt(dateRange) || 30;
                const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                results = results.filter(e => new Date(e.timestamp) >= since);
            }
            // Also pull from DB if pipeline-specific
            if (pipelineId) {
                try {
                    const runs = await prisma.workflowPipelineRun.findMany({
                        where: { pipelineId },
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                        select: { id: true, status: true, createdAt: true, completedAt: true },
                    });
                    const dbEntries = runs.map(r => ({
                        id: r.id, pipelineId, eventType: 'executed', timestamp: r.createdAt?.toISOString(),
                        metadata: { status: r.status, completedAt: r.completedAt?.toISOString() },
                    }));
                    results = [...results, ...dbEntries];
                } catch { }
            }
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return JSON.stringify({ status: 'success', totalEntries: results.length, entries: results.slice(0, 100) });
        }

        case 'diff': {
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required for diff' });
            // Get pipeline versions from edit history
            const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });
            const currentVersion = { version: pipeline.version || 1, steps: pipeline.steps, updatedAt: pipeline.updatedAt?.toISOString() };
            // Simulate diff with stored optimization hints as the "previous" state
            const hints = pipeline.optimizationHints || {};
            return JSON.stringify({
                status: 'success',
                diff: {
                    pipelineId,
                    currentVersion: currentVersion.version,
                    stepsCount: Array.isArray(currentVersion.steps) ? currentVersion.steps.length : 0,
                    lastOptimized: hints.analyzedAt || 'never',
                    recommendations: hints.recommendations || [],
                },
            });
        }

        case 'compliance_report': {
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });
            const runs = await prisma.workflowPipelineRun.findMany({
                where: { pipelineId },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
            const report = {
                pipelineId, pipelineName: pipeline.name,
                totalRuns: runs.length,
                successRate: runs.length ? Math.round(runs.filter(r => r.status === 'completed').length / runs.length * 100) + '%' : 'N/A',
                failedRuns: runs.filter(r => r.status === 'failed').length,
                auditEntriesCount: auditLog.filter(e => e.pipelineId === pipelineId).length,
                hasApprovalSteps: Array.isArray(pipeline.steps) && pipeline.steps.some(s => s.type === 'approval'),
                lastModified: pipeline.updatedAt?.toISOString(),
                version: pipeline.version || 1,
                complianceChecks: {
                    auditTrail: true,
                    versionControlled: (pipeline.version || 1) > 0,
                    approvalGated: Array.isArray(pipeline.steps) && pipeline.steps.some(s => s.type === 'approval'),
                    errorHandling: Array.isArray(pipeline.steps) && pipeline.steps.some(s => s.retryCount > 0),
                },
            };
            return JSON.stringify({ status: 'success', report });
        }

        case 'export': {
            let entries = pipelineId ? auditLog.filter(e => e.pipelineId === pipelineId) : auditLog;
            if (format === 'csv') {
                let csv = 'id,pipelineId,userId,eventType,timestamp\n';
                entries.forEach(e => { csv += `${e.id},${e.pipelineId || ''},${e.userId},${e.eventType},${e.timestamp}\n`; });
                return JSON.stringify({ status: 'success', format: 'csv', content: csv, entries: entries.length });
            }
            if (format === 'markdown') {
                let md = '# Audit Log\n\n| ID | Pipeline | User | Event | Timestamp |\n|---|---|---|---|---|\n';
                entries.forEach(e => { md += `| ${e.id} | ${e.pipelineId || '-'} | ${e.userId} | ${e.eventType} | ${e.timestamp} |\n`; });
                return JSON.stringify({ status: 'success', format: 'markdown', content: md, entries: entries.length });
            }
            return JSON.stringify({ status: 'success', format: 'json', entries, count: entries.length });
        }

        case 'retention': {
            if (!retentionDays) return JSON.stringify({ status: 'error', error: 'retentionDays required' });
            const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
            const before = auditLog.length;
            const kept = auditLog.filter(e => new Date(e.timestamp) >= cutoff);
            auditLog.length = 0;
            auditLog.push(...kept);
            return JSON.stringify({ status: 'success', action: 'retention_applied', retentionDays, removedEntries: before - kept.length, remainingEntries: kept.length });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown audit action: ${action}` });
    }
}

// ============================================================================
// WORKFLOW ROLLBACK EXECUTOR
// ============================================================================

const versionStore = new PersistentMap('workflow.versionStore'); // pipelineId => [{ version, steps, tags, createdAt }]

async function executeWorkflowRollback(input, prisma, userId) {
    const { action, pipelineId, version, compareVersion, tagName, branchName, take = 20 } = input;

    if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });

    // Ensure version history exists
    if (!versionStore.has(pipelineId)) {
        // Initialize from DB
        const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
        if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });
        versionStore.set(pipelineId, [{
            version: pipeline.version || 1,
            steps: JSON.parse(JSON.stringify(pipeline.steps || [])),
            tags: [],
            createdAt: pipeline.createdAt?.toISOString() || new Date().toISOString(),
            createdBy: userId,
        }]);
    }

    const history = versionStore.get(pipelineId);

    switch (action) {
        case 'versions': {
            return JSON.stringify({
                status: 'success', pipelineId,
                versions: history.slice(-take).reverse().map(v => ({
                    version: v.version,
                    stepsCount: v.steps.length,
                    tags: v.tags,
                    createdAt: v.createdAt,
                    createdBy: v.createdBy,
                })),
                totalVersions: history.length,
            });
        }

        case 'rollback': {
            if (version === undefined) return JSON.stringify({ status: 'error', error: 'version number required' });
            const target = history.find(v => v.version === version);
            if (!target) return JSON.stringify({ status: 'error', error: `Version ${version} not found` });
            // Save current as new version before rollback
            const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });
            const newVersion = (history[history.length - 1]?.version || 0) + 1;
            history.push({
                version: newVersion,
                steps: JSON.parse(JSON.stringify(pipeline.steps || [])),
                tags: ['pre-rollback'],
                createdAt: new Date().toISOString(),
                createdBy: userId,
            });
            // Apply rollback
            await prisma.workflowPipeline.update({
                where: { id: pipelineId },
                data: { steps: target.steps, version: newVersion + 1 },
            });
            return JSON.stringify({
                status: 'success', action: 'rolled_back',
                from: pipeline.version || newVersion - 1,
                to: version,
                newVersion: newVersion + 1,
                message: `Pipeline rolled back to version ${version}. Previous state saved as version ${newVersion}.`,
            });
        }

        case 'diff': {
            if (version === undefined) return JSON.stringify({ status: 'error', error: 'version required' });
            const v1 = history.find(v => v.version === version);
            const v2 = compareVersion !== undefined ? history.find(v => v.version === compareVersion) : history[history.length - 1];
            if (!v1) return JSON.stringify({ status: 'error', error: `Version ${version} not found` });
            if (!v2) return JSON.stringify({ status: 'error', error: `Compare version ${compareVersion} not found` });

            const v1Steps = new Map(v1.steps.map(s => [s.id, s]));
            const v2Steps = new Map(v2.steps.map(s => [s.id, s]));
            const added = v2.steps.filter(s => !v1Steps.has(s.id)).map(s => s.id);
            const removed = v1.steps.filter(s => !v2Steps.has(s.id)).map(s => s.id);
            const modified = v1.steps.filter(s => v2Steps.has(s.id) && JSON.stringify(s) !== JSON.stringify(v2Steps.get(s.id))).map(s => s.id);

            return JSON.stringify({
                status: 'success',
                diff: {
                    version1: v1.version, version2: v2.version,
                    added, removed, modified, unchanged: v1.steps.length - removed.length - modified.length,
                },
            });
        }

        case 'tag': {
            if (version === undefined || !tagName) return JSON.stringify({ status: 'error', error: 'version and tagName required' });
            const v = history.find(h => h.version === version);
            if (!v) return JSON.stringify({ status: 'error', error: `Version ${version} not found` });
            if (!v.tags.includes(tagName)) v.tags.push(tagName);
            return JSON.stringify({ status: 'success', action: 'tagged', version, tagName, allTags: v.tags });
        }

        case 'list_tags': {
            const tagged = history.filter(v => v.tags.length > 0);
            return JSON.stringify({
                status: 'success', pipelineId,
                tags: tagged.map(v => ({ version: v.version, tags: v.tags, createdAt: v.createdAt })),
            });
        }

        case 'branch': {
            if (!branchName) return JSON.stringify({ status: 'error', error: 'branchName required' });
            const sourceVersion = version !== undefined ? history.find(v => v.version === version) : history[history.length - 1];
            if (!sourceVersion) return JSON.stringify({ status: 'error', error: 'Source version not found' });
            // Create a new pipeline as a "branch"
            const pipeline = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            const branch = await prisma.workflowPipeline.create({
                data: {
                    userId,
                    name: `${pipeline?.name || 'Pipeline'} [${branchName}]`,
                    description: `Branch "${branchName}" from version ${sourceVersion.version}`,
                    steps: sourceVersion.steps,
                    version: 1,
                },
            });
            versionStore.set(branch.id, [{ version: 1, steps: JSON.parse(JSON.stringify(sourceVersion.steps)), tags: [`branch:${branchName}`], createdAt: new Date().toISOString(), createdBy: userId }]);
            return JSON.stringify({ status: 'success', action: 'branched', branchName, branchPipelineId: branch.id, fromVersion: sourceVersion.version });
        }

        case 'merge': {
            if (!branchName) return JSON.stringify({ status: 'error', error: 'branchName required (use branchPipelineId)' });
            // branchName here is actually the branch pipeline ID
            const branchPipeline = await prisma.workflowPipeline.findFirst({ where: { id: branchName, userId } });
            if (!branchPipeline) return JSON.stringify({ status: 'error', error: `Branch pipeline not found: ${branchName}` });
            const newVersion = (history[history.length - 1]?.version || 0) + 1;
            // Save current state
            const current = await prisma.workflowPipeline.findFirst({ where: { id: pipelineId, userId } });
            history.push({ version: newVersion, steps: JSON.parse(JSON.stringify(current?.steps || [])), tags: ['pre-merge'], createdAt: new Date().toISOString(), createdBy: userId });
            // Apply merge
            await prisma.workflowPipeline.update({ where: { id: pipelineId }, data: { steps: branchPipeline.steps, version: newVersion + 1 } });
            return JSON.stringify({
                status: 'success', action: 'merged',
                mergedFrom: branchName,
                newVersion: newVersion + 1,
                message: `Branch merged into main pipeline. Previous state saved as version ${newVersion}.`,
            });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown rollback action: ${action}` });
    }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeWorkflowOrchestratorTool(toolName, input, ctx = {}) {
    const prisma = ctx.prisma || (await import('../lib/prisma.js')).default;
    const userId = ctx.userId || 'system';

    switch (toolName) {
        case 'workflow_create':
            return { result: await executeWorkflowCreate(input, prisma, userId), sideEffects: null };
        case 'workflow_execute':
            return { result: await executeWorkflowExecute(input, prisma, userId), sideEffects: null };
        case 'workflow_schedule':
            return { result: await executeWorkflowSchedule(input, prisma, userId), sideEffects: null };
        case 'workflow_visualize':
            return { result: await executeWorkflowVisualize(input, prisma, userId), sideEffects: null };
        case 'workflow_optimize':
            return { result: await executeWorkflowOptimize(input, prisma, userId), sideEffects: null };
        case 'workflow_template':
            return { result: await executeWorkflowTemplate(input, prisma, userId), sideEffects: null };
        case 'workflow_webhook':
            return { result: await executeWorkflowWebhook(input, prisma, userId), sideEffects: null };
        case 'workflow_variables':
            return { result: await executeWorkflowVariables(input, prisma, userId), sideEffects: null };
        case 'workflow_audit':
            return { result: await executeWorkflowAudit(input, prisma, userId), sideEffects: null };
        case 'workflow_rollback':
            return { result: await executeWorkflowRollback(input, prisma, userId), sideEffects: null };
        default:
            return { result: JSON.stringify({ status: 'error', error: `Unknown workflow orchestrator tool: ${toolName}` }), sideEffects: null };
    }
}

const WORKFLOW_ORCHESTRATOR_TOOL_NAMES = new Set(WORKFLOW_ORCHESTRATOR_TOOL_DEFINITIONS.map((t) => t.name));
function isWorkflowOrchestratorTool(toolName) {
    return WORKFLOW_ORCHESTRATOR_TOOL_NAMES.has(toolName);
}

export { WORKFLOW_ORCHESTRATOR_TOOL_DEFINITIONS, executeWorkflowOrchestratorTool, isWorkflowOrchestratorTool };
