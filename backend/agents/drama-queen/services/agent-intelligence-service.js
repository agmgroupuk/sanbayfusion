/**
 * AGENT INTELLIGENCE SERVICE
 * Real implementations for agent memory, safety, UI, control, and workflow tools.
 *
 * - agentMemory   — DB-backed via AgentMemory model
 * - agentSafety   — Action validation + DB audit log
 * - agentUI       — Pushes SSE events to frontend in real-time
 * - agentControl  — Per-user state stored in cache (Redis / in-memory)
 * - editorSelect  — Canvas-aware selection operations via SSE
 * - agentWorkflow — Multi-step task tracking stored in cache
 * - agentMetrics  — Real stats from DB (ChatMessage, StudioSessionStats)
 */

import AgentMemory from '../models/AgentMemory.js';
import memoryService from './agent-memory-service.js';
import { prisma } from '../lib/prisma.js';
import { cache } from '../lib/cache.js';
import { emitSSE, getContext } from '../lib/request-context.js';

// ═══════════════════════════════════════════════════════════════
// AGENT MEMORY — save, get, clear, stats, search
// ═══════════════════════════════════════════════════════════════
export async function agentMemory(params, userId = 'default') {
    const { action = 'get', key, value, tags = [], importance = 5, query, agentId = 'default' } = params;
    const effectiveAgentId = params.agentId || agentId;

    try {
        switch (action) {
            case 'save': {
                const memory = await AgentMemory.getOrCreate(userId, effectiveAgentId);
                await memory.addMemory({
                    type: key ? 'keyed_memory' : 'conversation_insight',
                    content: key ? `${key}: ${value}` : value,
                    importance,
                    tags: [...tags, ...(key ? [key] : [])],
                    data: { key, value },
                });
                return {
                    success: true,
                    action: 'save',
                    key,
                    memoryCount: memory.memories.length,
                    message: `Memory saved${key ? ` under key "${key}"` : ''} (${memory.memories.length} total)`,
                };
            }

            case 'get': {
                const memory = await AgentMemory.findOne({ userId, agentId: effectiveAgentId });
                if (!memory || !memory.memories?.length) {
                    return { success: true, action: 'get', memories: [], count: 0, message: 'No memories found' };
                }
                let filtered = memory.memories;
                if (key) {
                    filtered = filtered.filter(m =>
                        m.tags?.includes(key) ||
                        m.data?.key === key ||
                        (m.content || '').toLowerCase().includes(key.toLowerCase())
                    );
                }
                return {
                    success: true,
                    action: 'get',
                    memories: filtered.slice(0, 50),
                    count: filtered.length,
                    totalMemories: memory.memories.length,
                    userProfile: memory.userProfile || {},
                };
            }

            case 'search': {
                const memory = await AgentMemory.findOne({ userId, agentId: effectiveAgentId });
                if (!memory || !memory.memories?.length) {
                    return { success: true, action: 'search', results: [], count: 0 };
                }
                const q = (query || key || '').toLowerCase();
                const results = memory.memories.filter(m =>
                    (m.content || '').toLowerCase().includes(q) ||
                    (m.data?.key || '').toLowerCase().includes(q) ||
                    (m.data?.value || '').toLowerCase().includes(q) ||
                    (m.tags || []).some(t => t.toLowerCase().includes(q))
                );
                return {
                    success: true,
                    action: 'search',
                    query: q,
                    results: results.slice(0, 30),
                    count: results.length,
                };
            }

            case 'stats': {
                const stats = await memoryService.getMemoryStats(userId, effectiveAgentId);
                return { success: true, action: 'stats', ...stats };
            }

            case 'clear': {
                await memoryService.clearMemories(userId, effectiveAgentId);
                return { success: true, action: 'clear', message: 'All memories cleared' };
            }

            default:
                return { success: false, error: `Unknown memory action: ${action}` };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════
// BLOCKED / DANGEROUS patterns for safety checks
// ═══════════════════════════════════════════════════════════════
const BLOCKED_PATTERNS = [
    'rm -rf', 'format c:', 'shutdown', 'reboot', 'drop database', 'drop table',
    'truncate table', 'delete from', 'exec(', 'eval(', 'child_process',
    'sudo rm', 'mkfs', 'dd if=', ':(){ :|:& };:',
];

// ═══════════════════════════════════════════════════════════════
// AGENT SAFETY — real permission checks + DB audit log
// ═══════════════════════════════════════════════════════════════
export async function agentSafety(params, userId = 'default') {
    const { action = 'check_permission', target_action, reason, severity = 'low', resource } = params;
    const { agentId } = getContext();

    switch (action) {
        case 'check_permission': {
            const lower = (target_action || '').toLowerCase();
            const blocked = BLOCKED_PATTERNS.some(p => lower.includes(p));
            // Log the check
            await _auditWrite(userId, agentId, 'permission_check', { target_action, allowed: !blocked, severity });
            return {
                success: true,
                action: 'check_permission',
                target_action,
                allowed: !blocked,
                reason: blocked ? 'Action contains a blocked destructive pattern' : 'Action permitted',
                checkedAt: new Date().toISOString(),
            };
        }

        case 'request_approval': {
            const id = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const autoApprove = severity !== 'critical';
            const record = { id, userId, agentId, target_action, reason, severity, status: autoApprove ? 'approved' : 'pending', createdAt: new Date().toISOString() };
            await cache.set(`approval:${id}`, JSON.stringify(record), 3600);
            await _auditWrite(userId, agentId, 'approval_request', record);
            // Push to frontend
            emitSSE({ type: 'agent_ui', uiAction: 'approval_request', data: record });
            return {
                success: true,
                action: 'request_approval',
                approvalId: id,
                status: record.status,
                target_action,
                message: autoApprove ? 'Auto-approved (non-critical)' : 'Pending user approval',
            };
        }

        case 'validate_action': {
            const lower = (target_action || '').toLowerCase();
            const valid = !BLOCKED_PATTERNS.some(p => lower.includes(p));
            return { success: true, action: 'validate_action', target_action, valid, checkedAt: new Date().toISOString() };
        }

        case 'audit_log': {
            const cacheKey = `audit:${userId}:${agentId || 'all'}`;
            const raw = await cache.get(cacheKey);
            const entries = raw ? JSON.parse(raw) : [];
            return { success: true, action: 'audit_log', entries: entries.slice(-50), count: entries.length };
        }

        default:
            return { success: false, error: `Unknown safety action: ${action}` };
    }
}

/** Append to per-user/agent audit log in cache */
async function _auditWrite(userId, agentId, type, data) {
    try {
        const cacheKey = `audit:${userId}:${agentId || 'all'}`;
        const raw = await cache.get(cacheKey);
        const entries = raw ? JSON.parse(raw) : [];
        entries.push({ type, ...data, timestamp: new Date().toISOString() });
        // Keep last 200 entries, TTL 24h
        await cache.set(cacheKey, JSON.stringify(entries.slice(-200)), 86400);
    } catch { /* non-critical */ }
}

// ═══════════════════════════════════════════════════════════════
// AGENT UI — real-time SSE push to the frontend
// ═══════════════════════════════════════════════════════════════
export async function agentUI(params, _userId = 'default') {
    const { action = 'show_message', text, title, question, options, percent, label, level } = params;

    switch (action) {
        case 'show_message': {
            emitSSE({ type: 'agent_ui', uiAction: 'show_message', text, title, level: level || 'info' });
            return { success: true, action: 'show_message', displayed: true, text, title };
        }

        case 'show_warning': {
            emitSSE({ type: 'agent_ui', uiAction: 'show_warning', text, title });
            return { success: true, action: 'show_warning', displayed: true, text, title };
        }

        case 'show_error': {
            emitSSE({ type: 'agent_ui', uiAction: 'show_error', text, title });
            return { success: true, action: 'show_error', displayed: true, text, title };
        }

        case 'ask_user': {
            emitSSE({ type: 'agent_ui', uiAction: 'ask_user', question, options: options || [] });
            return {
                success: true,
                action: 'ask_user',
                question,
                options: options || [],
                message: 'Question pushed to user in real-time',
            };
        }

        case 'show_toast': {
            emitSSE({ type: 'agent_ui', uiAction: 'show_toast', text, level: level || 'info' });
            return { success: true, action: 'show_toast', displayed: true, text };
        }

        case 'show_progress': {
            emitSSE({ type: 'agent_ui', uiAction: 'show_progress', percent: percent || 0, label: label || '' });
            return { success: true, action: 'show_progress', percent: percent || 0, label: label || '' };
        }

        default:
            return { success: false, error: `Unknown UI action: ${action}` };
    }
}

// ═══════════════════════════════════════════════════════════════
// AGENT CONTROL — per-user state stored in cache
// ═══════════════════════════════════════════════════════════════
export async function agentControl(params, userId = 'default') {
    const { action = 'get_state', mode, key, value, task_id } = params;
    const { agentId } = getContext();
    const stateKey = `agent_state:${userId}:${agentId || 'default'}`;

    switch (action) {
        case 'set_mode': {
            const state = await _getState(stateKey);
            state.mode = mode || 'chat';
            state.updatedAt = new Date().toISOString();
            await cache.set(stateKey, JSON.stringify(state), 86400);
            emitSSE({ type: 'agent_ui', uiAction: 'mode_change', mode: state.mode });
            return { success: true, action: 'set_mode', mode: state.mode };
        }

        case 'get_state': {
            const state = await _getState(stateKey);
            return { success: true, action: 'get_state', ...state };
        }

        case 'cancel_task': {
            const wfKey = `workflow:${userId}:${task_id}`;
            const raw = await cache.get(wfKey);
            if (raw) {
                const wf = JSON.parse(raw);
                wf.status = 'cancelled';
                wf.cancelledAt = new Date().toISOString();
                await cache.set(wfKey, JSON.stringify(wf), 3600);
            }
            emitSSE({ type: 'agent_ui', uiAction: 'task_cancelled', task_id });
            return { success: true, action: 'cancel_task', task_id, cancelled: true };
        }

        case 'set_context': {
            const state = await _getState(stateKey);
            if (!state.context) state.context = {};
            state.context[key] = value;
            state.updatedAt = new Date().toISOString();
            await cache.set(stateKey, JSON.stringify(state), 86400);
            return { success: true, action: 'set_context', key, value };
        }

        default:
            return { success: false, error: `Unknown control action: ${action}` };
    }
}

async function _getState(cacheKey) {
    try {
        const raw = await cache.get(cacheKey);
        return raw ? JSON.parse(raw) : { mode: 'chat', context: {}, createdAt: new Date().toISOString() };
    } catch {
        return { mode: 'chat', context: {}, createdAt: new Date().toISOString() };
    }
}

// ═══════════════════════════════════════════════════════════════
// EDITOR SELECT — canvas-aware content operations via SSE
// ═══════════════════════════════════════════════════════════════
export async function editorSelect(params, _userId = 'default') {
    const { action = 'get_selection', text, position } = params;

    switch (action) {
        case 'get_selection': {
            // Push a selection-request SSE event; the frontend responds if canvas content is active
            emitSSE({ type: 'agent_ui', uiAction: 'get_selection_request' });
            return { success: true, action: 'get_selection', message: 'Selection request sent to frontend canvas' };
        }

        case 'insert_at_cursor': {
            emitSSE({ type: 'agent_ui', uiAction: 'insert_text', text, position: position || 'cursor' });
            return { success: true, action: 'insert_at_cursor', message: 'Insert command sent to canvas', text };
        }

        case 'replace_selection': {
            emitSSE({ type: 'agent_ui', uiAction: 'replace_selection', text });
            return { success: true, action: 'replace_selection', message: 'Replace command sent to canvas', text };
        }

        case 'get_cursor': {
            emitSSE({ type: 'agent_ui', uiAction: 'get_cursor_request' });
            return { success: true, action: 'get_cursor', message: 'Cursor position request sent to frontend' };
        }

        default:
            return { success: false, error: `Unknown editor action: ${action}` };
    }
}

// ═══════════════════════════════════════════════════════════════
// AGENT WORKFLOW — multi-step task tracking stored in cache
// ═══════════════════════════════════════════════════════════════
export async function agentWorkflow(params, userId = 'default') {
    const { action = 'list', name, steps, workflow_id, step_index, status, result } = params;
    const { agentId } = getContext();

    switch (action) {
        case 'create': {
            const id = workflow_id || `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const workflow = {
                id,
                userId,
                agentId,
                name: name || 'Untitled workflow',
                steps: (steps || []).map((s, i) => ({
                    index: i,
                    label: typeof s === 'string' ? s : s.label || `Step ${i + 1}`,
                    status: 'pending',
                    result: null,
                })),
                status: 'running',
                createdAt: new Date().toISOString(),
            };
            await cache.set(`workflow:${userId}:${id}`, JSON.stringify(workflow), 86400);
            // Track list of active workflows
            await _addToWorkflowList(userId, id);
            emitSSE({ type: 'agent_ui', uiAction: 'workflow_started', workflow });
            return { success: true, action: 'create', workflow_id: id, workflow };
        }

        case 'update_step': {
            const wfKey = `workflow:${userId}:${workflow_id}`;
            const raw = await cache.get(wfKey);
            if (!raw) return { success: false, error: `Workflow ${workflow_id} not found` };
            const wf = JSON.parse(raw);
            const step = wf.steps[step_index];
            if (!step) return { success: false, error: `Step ${step_index} not found` };
            step.status = status || 'completed';
            if (result) step.result = result;
            step.updatedAt = new Date().toISOString();
            // Check if all done
            const allDone = wf.steps.every(s => s.status === 'completed' || s.status === 'skipped');
            if (allDone) wf.status = 'completed';
            await cache.set(wfKey, JSON.stringify(wf), 86400);
            emitSSE({ type: 'agent_ui', uiAction: 'workflow_step_update', workflow_id, step_index, step, workflowStatus: wf.status });
            return { success: true, action: 'update_step', workflow_id, step_index, step, workflowStatus: wf.status };
        }

        case 'get': {
            const wfKey = `workflow:${userId}:${workflow_id}`;
            const raw = await cache.get(wfKey);
            if (!raw) return { success: false, error: `Workflow ${workflow_id} not found` };
            return { success: true, action: 'get', workflow: JSON.parse(raw) };
        }

        case 'list': {
            const listKey = `workflow_list:${userId}`;
            const listRaw = await cache.get(listKey);
            const ids = listRaw ? JSON.parse(listRaw) : [];
            const workflows = [];
            for (const id of ids.slice(-20)) {
                const raw = await cache.get(`workflow:${userId}:${id}`);
                if (raw) workflows.push(JSON.parse(raw));
            }
            return { success: true, action: 'list', workflows, count: workflows.length };
        }

        case 'cancel': {
            const wfKey = `workflow:${userId}:${workflow_id}`;
            const raw = await cache.get(wfKey);
            if (!raw) return { success: false, error: `Workflow ${workflow_id} not found` };
            const wf = JSON.parse(raw);
            wf.status = 'cancelled';
            wf.cancelledAt = new Date().toISOString();
            await cache.set(wfKey, JSON.stringify(wf), 3600);
            emitSSE({ type: 'agent_ui', uiAction: 'workflow_cancelled', workflow_id });
            return { success: true, action: 'cancel', workflow_id };
        }

        default:
            return { success: false, error: `Unknown workflow action: ${action}` };
    }
}

async function _addToWorkflowList(userId, workflowId) {
    const listKey = `workflow_list:${userId}`;
    try {
        const raw = await cache.get(listKey);
        const ids = raw ? JSON.parse(raw) : [];
        ids.push(workflowId);
        await cache.set(listKey, JSON.stringify(ids.slice(-50)), 86400);
    } catch { /* non-critical */ }
}

// ═══════════════════════════════════════════════════════════════
// AGENT METRICS — real DB-backed stats
// ═══════════════════════════════════════════════════════════════
export async function agentMetrics(params, userId = 'default') {
    const { action = 'summary', session_id } = params;
    const { agentId, sessionId } = getContext();

    switch (action) {
        case 'summary': {
            // Gather real data: message count, session count, memory size
            const [msgCount, sessionCount, memoryRow] = await Promise.all([
                prisma.chatMessage.count({
                    where: { session: { userId } },
                }).catch(() => 0),
                prisma.chatSession.count({
                    where: { userId, isActive: true },
                }).catch(() => 0),
                prisma.agentMemory.findFirst({
                    where: { userId, agentId: agentId || 'default' },
                    select: { totalMemories: true },
                }).catch(() => null),
            ]);
            return {
                success: true,
                action: 'summary',
                metrics: {
                    totalMessages: msgCount,
                    activeSessions: sessionCount,
                    memoriesStored: memoryRow?.totalMemories || 0,
                    serverUptime: Math.floor(process.uptime()),
                    heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1048576),
                    timestamp: new Date().toISOString(),
                },
            };
        }

        case 'tool_usage': {
            // Read from the StudioSessionStats request logs
            const targetSession = session_id || sessionId;
            if (!targetSession) {
                return { success: true, action: 'tool_usage', tools: [], message: 'No session ID available' };
            }
            const stats = await prisma.studioSessionStats.findUnique({
                where: { sessionId: targetSession },
                select: { requestLog: true, totalRequests: true },
            }).catch(() => null);
            if (!stats) return { success: true, action: 'tool_usage', tools: [], totalRequests: 0 };
            let log = [];
            try { log = typeof stats.requestLog === 'string' ? JSON.parse(stats.requestLog) : (stats.requestLog || []); } catch { log = []; }
            // Count tools from request log
            const toolCounts = {};
            for (const entry of log) {
                const name = entry.tool || entry.name || 'unknown';
                toolCounts[name] = (toolCounts[name] || 0) + 1;
            }
            const tools = Object.entries(toolCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
            return { success: true, action: 'tool_usage', tools, totalRequests: stats.totalRequests || 0 };
        }

        case 'session_stats': {
            const targetSession = session_id || sessionId;
            if (!targetSession) {
                return { success: true, action: 'session_stats', stats: null, message: 'No session ID available' };
            }
            const [dbStats, msgCount] = await Promise.all([
                prisma.studioSessionStats.findUnique({ where: { sessionId: targetSession } }).catch(() => null),
                prisma.chatMessage.count({ where: { sessionId: targetSession } }).catch(() => 0),
            ]);
            return {
                success: true,
                action: 'session_stats',
                stats: {
                    sessionId: targetSession,
                    totalMessages: dbStats?.totalMessages || msgCount,
                    totalRequests: dbStats?.totalRequests || 0,
                    totalErrors: dbStats?.totalErrors || 0,
                    totalTokensUsed: dbStats?.totalTokensUsed || 0,
                    startedAt: dbStats?.sessionStartTime || null,
                },
            };
        }

        case 'reset': {
            const targetSession = session_id || sessionId;
            if (targetSession) {
                await prisma.studioSessionStats.update({
                    where: { sessionId: targetSession },
                    data: { totalMessages: 0, totalRequests: 0, totalErrors: 0, totalTokensUsed: 0, requestLog: '[]' },
                }).catch(() => null);
            }
            return { success: true, action: 'reset', message: 'Metrics reset', sessionId: targetSession };
        }

        default:
            return { success: false, error: `Unknown metrics action: ${action}` };
    }
}

export default {
    agentMemory,
    agentSafety,
    agentUI,
    agentControl,
    editorSelect,
    agentWorkflow,
    agentMetrics,
};
