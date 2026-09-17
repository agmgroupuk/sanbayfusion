/**
 * COLLABORATION TOOLS (8 tools)
 * team_invite, role_assign, comment_thread, task_assign, approval_flow,
 * activity_log, access_audit, notify_team
 *
 * Enterprise-ready collaboration: team management, RBAC, contextual discussions,
 * lightweight task management, multi-step approvals, activity tracking,
 * access auditing, and team notifications.
 * ALL state persisted in PostgreSQL via Prisma — NO localStorage.
 */

import { prisma } from '../prisma.js';
import crypto from 'crypto';

// ── team_invite ─────────────────────────────────────────────────
async function teamInvite(params) {
    const { action = 'invite', userId, ...opts } = params;

    try {
        switch (action) {
            case 'invite': {
                if (!opts.teamId || !opts.inviteeId) return { success: false, error: 'teamId and inviteeId required' };
                // Check if already a member
                const existing = await prisma.teamMember.findUnique({
                    where: { userId_teamId: { userId: opts.inviteeId, teamId: opts.teamId } },
                });
                if (existing && existing.status === 'active') return { success: false, error: 'User is already an active team member' };

                const member = await prisma.teamMember.upsert({
                    where: { userId_teamId: { userId: opts.inviteeId, teamId: opts.teamId } },
                    create: {
                        userId: opts.inviteeId,
                        teamId: opts.teamId,
                        role: opts.role || 'member',
                        permissions: opts.permissions || [],
                        invitedBy: userId || 'system',
                        status: 'pending',
                    },
                    update: {
                        role: opts.role || 'member',
                        permissions: opts.permissions || [],
                        invitedBy: userId || 'system',
                        status: 'pending',
                    },
                });
                return { success: true, member: { id: member.id, userId: member.userId, teamId: member.teamId, role: member.role, status: 'pending' } };
            }

            case 'accept': {
                if (!opts.teamId) return { success: false, error: 'teamId required' };
                const inviteeId = opts.inviteeId || userId;
                const member = await prisma.teamMember.update({
                    where: { userId_teamId: { userId: inviteeId, teamId: opts.teamId } },
                    data: { status: 'active', joinedAt: new Date() },
                });
                return { success: true, member: { id: member.id, role: member.role, status: 'active', joinedAt: member.joinedAt } };
            }

            case 'remove': {
                if (!opts.teamId || !opts.memberId) return { success: false, error: 'teamId and memberId (userId) required' };
                await prisma.teamMember.update({
                    where: { userId_teamId: { userId: opts.memberId, teamId: opts.teamId } },
                    data: { status: 'removed' },
                });
                return { success: true, removed: opts.memberId, teamId: opts.teamId };
            }

            case 'list': {
                if (!opts.teamId) return { success: false, error: 'teamId required' };
                const members = await prisma.teamMember.findMany({
                    where: { teamId: opts.teamId, ...(opts.status ? { status: opts.status } : { status: { not: 'removed' } }) },
                    orderBy: { createdAt: 'asc' },
                });
                const byRole = {};
                for (const m of members) { byRole[m.role] = (byRole[m.role] || 0) + 1; }
                return { success: true, members, count: members.length, byRole };
            }

            case 'teams': {
                const uid = userId || opts.userId;
                if (!uid) return { success: false, error: 'userId required' };
                const memberships = await prisma.teamMember.findMany({
                    where: { userId: uid, status: 'active' },
                    select: { teamId: true, role: true, joinedAt: true },
                });
                return { success: true, teams: memberships, count: memberships.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use invite, accept, remove, list, teams.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── role_assign ─────────────────────────────────────────────────
async function roleAssign(params) {
    const { action = 'assign', userId, ...opts } = params;

    try {
        switch (action) {
            case 'assign': {
                if (!opts.teamId || !opts.memberId || !opts.role) return { success: false, error: 'teamId, memberId, and role required' };
                const validRoles = ['owner', 'admin', 'member', 'viewer'];
                if (!validRoles.includes(opts.role)) return { success: false, error: `Invalid role. Use: ${validRoles.join(', ')}` };

                const member = await prisma.teamMember.update({
                    where: { userId_teamId: { userId: opts.memberId, teamId: opts.teamId } },
                    data: { role: opts.role },
                });
                return { success: true, member: { userId: member.userId, teamId: member.teamId, role: member.role } };
            }

            case 'permissions': {
                if (!opts.teamId || !opts.memberId) return { success: false, error: 'teamId and memberId required' };
                if (!opts.permissions) return { success: false, error: 'permissions array required' };
                const member = await prisma.teamMember.update({
                    where: { userId_teamId: { userId: opts.memberId, teamId: opts.teamId } },
                    data: { permissions: opts.permissions },
                });
                return { success: true, member: { userId: member.userId, permissions: member.permissions } };
            }

            case 'check': {
                if (!opts.teamId || !opts.permission) return { success: false, error: 'teamId and permission required' };
                const uid = opts.memberId || userId;
                const member = await prisma.teamMember.findUnique({
                    where: { userId_teamId: { userId: uid, teamId: opts.teamId } },
                });
                if (!member || member.status !== 'active') return { success: true, allowed: false, reason: 'Not an active team member' };

                // Role hierarchy: owner > admin > member > viewer
                const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 };
                const permissionLevels = { delete: 4, admin: 3, write: 2, read: 1 };
                const requiredLevel = permissionLevels[opts.permission] || 2;
                const userLevel = roleHierarchy[member.role] || 1;

                const allowed = userLevel >= requiredLevel || (Array.isArray(member.permissions) && member.permissions.includes(opts.permission));
                return { success: true, allowed, role: member.role, permission: opts.permission };
            }

            case 'roles': {
                return {
                    success: true,
                    roles: [
                        { name: 'owner', level: 4, description: 'Full access, can delete team and manage all settings' },
                        { name: 'admin', level: 3, description: 'Can manage members, settings, and all content' },
                        { name: 'member', level: 2, description: 'Can read and write content' },
                        { name: 'viewer', level: 1, description: 'Read-only access' },
                    ],
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use assign, permissions, check, roles.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── comment_thread ──────────────────────────────────────────────
async function commentThread(params) {
    const { action = 'create', userId, ...opts } = params;

    try {
        switch (action) {
            case 'create': {
                if (!opts.targetType || !opts.targetId) return { success: false, error: 'targetType and targetId required' };
                const thread = await prisma.commentThread.create({
                    data: {
                        userId: userId || 'system',
                        targetType: opts.targetType,
                        targetId: opts.targetId,
                        targetMeta: opts.targetMeta || {},
                    },
                });
                // Create first comment if content provided
                let firstComment = null;
                if (opts.content) {
                    firstComment = await prisma.comment.create({
                        data: { threadId: thread.id, userId: userId || 'system', content: opts.content },
                    });
                }
                return { success: true, thread: { id: thread.id, targetType: thread.targetType, targetId: thread.targetId }, comment: firstComment ? { id: firstComment.id } : null };
            }

            case 'reply': {
                if (!opts.threadId || !opts.content) return { success: false, error: 'threadId and content required' };
                const comment = await prisma.comment.create({
                    data: {
                        threadId: opts.threadId,
                        userId: userId || 'system',
                        content: opts.content,
                        parentId: opts.parentId || null,
                    },
                });
                return { success: true, comment: { id: comment.id, threadId: comment.threadId, content: comment.content } };
            }

            case 'list': {
                if (!opts.threadId && !opts.targetId) return { success: false, error: 'threadId or targetId required' };
                if (opts.threadId) {
                    const thread = await prisma.commentThread.findUnique({
                        where: { id: opts.threadId },
                        include: { comments: { orderBy: { createdAt: 'asc' } } },
                    });
                    if (!thread) return { success: false, error: 'Thread not found' };
                    return { success: true, thread, comments: thread.comments, count: thread.comments.length };
                }
                // List threads for a target
                const threads = await prisma.commentThread.findMany({
                    where: { targetType: opts.targetType, targetId: opts.targetId },
                    include: { comments: { orderBy: { createdAt: 'asc' } } },
                    orderBy: { createdAt: 'desc' },
                });
                return { success: true, threads, count: threads.length };
            }

            case 'resolve': {
                if (!opts.threadId) return { success: false, error: 'threadId required' };
                const thread = await prisma.commentThread.update({
                    where: { id: opts.threadId },
                    data: { resolved: true, resolvedBy: userId, resolvedAt: new Date() },
                });
                return { success: true, thread: { id: thread.id, resolved: true, resolvedBy: userId } };
            }

            case 'reopen': {
                if (!opts.threadId) return { success: false, error: 'threadId required' };
                const thread = await prisma.commentThread.update({
                    where: { id: opts.threadId },
                    data: { resolved: false, resolvedBy: null, resolvedAt: null },
                });
                return { success: true, thread: { id: thread.id, resolved: false } };
            }

            case 'react': {
                if (!opts.commentId || !opts.emoji) return { success: false, error: 'commentId and emoji required' };
                const comment = await prisma.comment.findUnique({ where: { id: opts.commentId } });
                if (!comment) return { success: false, error: 'Comment not found' };
                const reactions = comment.reactions || {};
                if (!reactions[opts.emoji]) reactions[opts.emoji] = [];
                const uid = userId || 'system';
                if (reactions[opts.emoji].includes(uid)) {
                    reactions[opts.emoji] = reactions[opts.emoji].filter(u => u !== uid); // toggle off
                } else {
                    reactions[opts.emoji].push(uid); // toggle on
                }
                await prisma.comment.update({ where: { id: opts.commentId }, data: { reactions } });
                return { success: true, emoji: opts.emoji, reactions };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use create, reply, list, resolve, reopen, react.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── task_assign ─────────────────────────────────────────────────
async function taskAssign(params) {
    const { action = 'create', userId, ...opts } = params;

    try {
        switch (action) {
            case 'create': {
                if (!opts.title) return { success: false, error: 'title required' };
                const task = await prisma.taskItem.create({
                    data: {
                        userId: userId || 'system',
                        title: opts.title,
                        description: opts.description || null,
                        status: opts.status || 'todo',
                        priority: opts.priority || 'medium',
                        assigneeId: opts.assigneeId || null,
                        teamId: opts.teamId || null,
                        labels: opts.labels || [],
                        dueDate: opts.dueDate ? new Date(opts.dueDate) : null,
                        estimateHrs: opts.estimateHrs || null,
                        dependencies: opts.dependencies || [],
                        attachments: opts.attachments || [],
                    },
                });
                return { success: true, task: { id: task.id, title: task.title, status: task.status, priority: task.priority, assigneeId: task.assigneeId } };
            }

            case 'update': {
                if (!opts.id) return { success: false, error: 'task id required' };
                const updates = {};
                const allowed = ['title', 'description', 'status', 'priority', 'assigneeId', 'labels', 'dueDate', 'estimateHrs', 'actualHrs', 'dependencies', 'attachments'];
                for (const key of allowed) {
                    if (opts[key] !== undefined) {
                        updates[key] = key === 'dueDate' && opts[key] ? new Date(opts[key]) : opts[key];
                    }
                }
                if (opts.status === 'done') updates.completedAt = new Date();
                const task = await prisma.taskItem.update({ where: { id: opts.id }, data: updates });
                return { success: true, task: { id: task.id, title: task.title, status: task.status } };
            }

            case 'assign': {
                if (!opts.id || !opts.assigneeId) return { success: false, error: 'task id and assigneeId required' };
                const task = await prisma.taskItem.update({ where: { id: opts.id }, data: { assigneeId: opts.assigneeId } });
                return { success: true, task: { id: task.id, assigneeId: task.assigneeId } };
            }

            case 'list': {
                const where = {};
                if (opts.teamId) where.teamId = opts.teamId;
                if (opts.assigneeId) where.assigneeId = opts.assigneeId;
                if (opts.status) where.status = opts.status;
                if (opts.priority) where.priority = opts.priority;
                if (opts.label) where.labels = { array_contains: [opts.label] };
                if (userId && !opts.teamId && !opts.assigneeId) where.OR = [{ userId }, { assigneeId: userId }];

                const tasks = await prisma.taskItem.findMany({
                    where,
                    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
                    take: opts.limit || 50,
                });

                // Priority sort (critical first)
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                tasks.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

                return { success: true, tasks, count: tasks.length };
            }

            case 'board': {
                const where = {};
                if (opts.teamId) where.teamId = opts.teamId;
                if (userId) where.OR = [{ userId }, { assigneeId: userId }];

                const tasks = await prisma.taskItem.findMany({ where, orderBy: { createdAt: 'desc' } });
                const board = { todo: [], in_progress: [], review: [], done: [], cancelled: [] };
                for (const t of tasks) {
                    if (board[t.status]) board[t.status].push({ id: t.id, title: t.title, priority: t.priority, assigneeId: t.assigneeId, dueDate: t.dueDate });
                }
                return {
                    success: true,
                    board,
                    summary: Object.fromEntries(Object.entries(board).map(([k, v]) => [k, v.length])),
                    total: tasks.length,
                };
            }

            case 'delete': {
                if (!opts.id) return { success: false, error: 'task id required' };
                await prisma.taskItem.delete({ where: { id: opts.id } });
                return { success: true, deleted: opts.id };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use create, update, assign, list, board, delete.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── approval_flow ───────────────────────────────────────────────
async function approvalFlow(params) {
    const { action = 'create', userId, ...opts } = params;

    try {
        switch (action) {
            case 'create': {
                if (!opts.title || !opts.approvers) return { success: false, error: 'title and approvers required' };
                const approvers = opts.approvers.map(a => ({
                    userId: typeof a === 'string' ? a : a.userId,
                    required: typeof a === 'string' ? true : (a.required ?? true),
                }));

                const request = await prisma.approvalRequest.create({
                    data: {
                        userId: userId || 'system',
                        title: opts.title,
                        description: opts.description || null,
                        type: opts.type || 'generic',
                        approvers,
                        deadline: opts.deadline ? new Date(opts.deadline) : null,
                        metadata: opts.metadata || {},
                        status: 'pending',
                    },
                });
                return { success: true, request: { id: request.id, title: request.title, status: 'pending', approverCount: approvers.length } };
            }

            case 'decide': {
                if (!opts.requestId || !opts.decision) return { success: false, error: 'requestId and decision (approve/reject) required' };
                if (!['approve', 'reject'].includes(opts.decision)) return { success: false, error: 'decision must be "approve" or "reject"' };

                const request = await prisma.approvalRequest.findUnique({ where: { id: opts.requestId } });
                if (!request) return { success: false, error: 'Request not found' };
                if (request.status !== 'pending') return { success: false, error: `Request already ${request.status}` };

                const deciderId = opts.deciderId || userId || 'system';
                const decisions = Array.isArray(request.decisions) ? [...request.decisions] : [];
                const existing = decisions.findIndex(d => d.userId === deciderId);
                const decision = { userId: deciderId, decision: opts.decision, comment: opts.comment || null, decidedAt: new Date().toISOString() };

                if (existing >= 0) decisions[existing] = decision;
                else decisions.push(decision);

                // Check if all required approvers have decided
                const approvers = Array.isArray(request.approvers) ? request.approvers : [];
                const requiredApprovers = approvers.filter(a => a.required);
                const requiredDecisions = decisions.filter(d => requiredApprovers.some(a => a.userId === d.userId));

                let newStatus = 'pending';
                if (requiredDecisions.some(d => d.decision === 'reject')) {
                    newStatus = 'rejected';
                } else if (requiredDecisions.length >= requiredApprovers.length && requiredDecisions.every(d => d.decision === 'approve')) {
                    newStatus = 'approved';
                }

                await prisma.approvalRequest.update({
                    where: { id: opts.requestId },
                    data: { decisions, status: newStatus, ...(newStatus !== 'pending' ? { resolvedAt: new Date() } : {}) },
                });

                return { success: true, decision: opts.decision, requestStatus: newStatus, totalDecisions: decisions.length, requiredRemaining: requiredApprovers.length - requiredDecisions.filter(d => d.decision === 'approve').length };
            }

            case 'status': {
                if (!opts.requestId) return { success: false, error: 'requestId required' };
                const request = await prisma.approvalRequest.findUnique({ where: { id: opts.requestId } });
                if (!request) return { success: false, error: 'Request not found' };

                const approvers = Array.isArray(request.approvers) ? request.approvers : [];
                const decisions = Array.isArray(request.decisions) ? request.decisions : [];
                const decisionMap = Object.fromEntries(decisions.map(d => [d.userId, d]));

                const status = approvers.map(a => ({
                    userId: a.userId,
                    required: a.required,
                    decision: decisionMap[a.userId]?.decision || 'pending',
                    comment: decisionMap[a.userId]?.comment || null,
                    decidedAt: decisionMap[a.userId]?.decidedAt || null,
                }));

                return { success: true, request: { id: request.id, title: request.title, status: request.status, type: request.type }, approvers: status, deadline: request.deadline };
            }

            case 'list': {
                const where = {};
                if (opts.status) where.status = opts.status;
                if (opts.type) where.type = opts.type;
                if (userId) where.OR = [{ userId }];

                const requests = await prisma.approvalRequest.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: opts.limit || 20,
                    select: { id: true, title: true, type: true, status: true, userId: true, deadline: true, createdAt: true },
                });
                return { success: true, requests, count: requests.length };
            }

            case 'cancel': {
                if (!opts.requestId) return { success: false, error: 'requestId required' };
                await prisma.approvalRequest.update({
                    where: { id: opts.requestId },
                    data: { status: 'cancelled', resolvedAt: new Date() },
                });
                return { success: true, requestId: opts.requestId, status: 'cancelled' };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use create, decide, status, list, cancel.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── activity_log ────────────────────────────────────────────────
async function activityLog(params) {
    const { action = 'log', userId, projectId, ...opts } = params || {};
    try {
        switch (action) {
            case 'log': {
                if (!opts.event) return { success: false, error: 'event required (e.g. file_created, tool_used, deploy_started)' };
                const entry = await prisma.activityLog.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: userId || 'system',
                        projectId: projectId || null,
                        event: opts.event,
                        details: opts.details ? JSON.stringify(opts.details) : null,
                        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
                        ip: opts.ip || null,
                        source: opts.source || 'agent',
                        createdAt: new Date(),
                    },
                });
                return { success: true, logId: entry.id, event: entry.event };
            }

            case 'query': {
                const where = {};
                if (userId) where.userId = userId;
                if (projectId) where.projectId = projectId;
                if (opts.event) where.event = opts.event;
                if (opts.source) where.source = opts.source;
                if (opts.since) where.createdAt = { gte: new Date(opts.since) };

                const logs = await prisma.activityLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: opts.limit || 50,
                    select: { id: true, userId: true, projectId: true, event: true, details: true, source: true, createdAt: true },
                });
                return { success: true, logs, count: logs.length };
            }

            case 'stats': {
                const since = opts.since ? new Date(opts.since) : new Date(Date.now() - 7 * 86400000);
                const where = { createdAt: { gte: since } };
                if (userId) where.userId = userId;
                if (projectId) where.projectId = projectId;

                const total = await prisma.activityLog.count({ where });
                const byEvent = await prisma.activityLog.groupBy({
                    by: ['event'],
                    where,
                    _count: true,
                    orderBy: { _count: { event: 'desc' } },
                    take: 20,
                });
                return { success: true, total, since: since.toISOString(), breakdown: byEvent };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use log, query, stats.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── access_audit ────────────────────────────────────────────────
async function accessAudit(params) {
    const { action = 'log', userId, ...opts } = params || {};
    try {
        switch (action) {
            case 'log': {
                if (!opts.resource) return { success: false, error: 'resource required (e.g. project, file, api_key)' };
                const entry = await prisma.accessAudit.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: userId || 'anonymous',
                        resource: opts.resource,
                        resourceId: opts.resourceId || null,
                        accessType: opts.accessType || 'read',
                        outcome: opts.outcome || 'allowed',
                        ip: opts.ip || null,
                        userAgent: opts.userAgent || null,
                        reason: opts.reason || null,
                        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
                        createdAt: new Date(),
                    },
                });
                return { success: true, auditId: entry.id, resource: entry.resource, outcome: entry.outcome };
            }

            case 'query': {
                const where = {};
                if (userId) where.userId = userId;
                if (opts.resource) where.resource = opts.resource;
                if (opts.resourceId) where.resourceId = opts.resourceId;
                if (opts.outcome) where.outcome = opts.outcome;
                if (opts.accessType) where.accessType = opts.accessType;
                if (opts.since) where.createdAt = { gte: new Date(opts.since) };

                const entries = await prisma.accessAudit.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: opts.limit || 50,
                    select: { id: true, userId: true, resource: true, resourceId: true, accessType: true, outcome: true, ip: true, reason: true, createdAt: true },
                });
                return { success: true, entries, count: entries.length };
            }

            case 'report': {
                const since = opts.since ? new Date(opts.since) : new Date(Date.now() - 30 * 86400000);
                const where = { createdAt: { gte: since } };
                if (userId) where.userId = userId;

                const total = await prisma.accessAudit.count({ where });
                const denied = await prisma.accessAudit.count({ where: { ...where, outcome: 'denied' } });
                const byResource = await prisma.accessAudit.groupBy({
                    by: ['resource'],
                    where,
                    _count: true,
                    orderBy: { _count: { resource: 'desc' } },
                    take: 20,
                });
                return { success: true, total, denied, allowed: total - denied, since: since.toISOString(), byResource };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use log, query, report.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── notify_team ─────────────────────────────────────────────────
async function notifyTeam(params) {
    const { action = 'send', userId, projectId, ...opts } = params || {};
    try {
        switch (action) {
            case 'send': {
                if (!opts.message) return { success: false, error: 'message required' };
                const recipients = opts.recipients || [];
                const notification = await prisma.teamNotification.create({
                    data: {
                        id: crypto.randomUUID(),
                        senderId: userId || 'system',
                        projectId: projectId || null,
                        channel: opts.channel || 'general',
                        message: opts.message,
                        priority: opts.priority || 'normal',
                        type: opts.type || 'info',
                        recipients: JSON.stringify(recipients),
                        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
                        readBy: JSON.stringify([]),
                        createdAt: new Date(),
                    },
                });
                return { success: true, notificationId: notification.id, recipients: recipients.length, channel: notification.channel };
            }

            case 'list': {
                const where = {};
                if (projectId) where.projectId = projectId;
                if (opts.channel) where.channel = opts.channel;
                if (opts.priority) where.priority = opts.priority;
                if (opts.type) where.type = opts.type;
                if (opts.since) where.createdAt = { gte: new Date(opts.since) };

                const notifications = await prisma.teamNotification.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: opts.limit || 30,
                    select: { id: true, senderId: true, projectId: true, channel: true, message: true, priority: true, type: true, readBy: true, createdAt: true },
                });
                return { success: true, notifications, count: notifications.length };
            }

            case 'mark_read': {
                if (!opts.notificationId) return { success: false, error: 'notificationId required' };
                if (!userId) return { success: false, error: 'userId required to mark as read' };
                const notif = await prisma.teamNotification.findUnique({ where: { id: opts.notificationId } });
                if (!notif) return { success: false, error: 'Notification not found' };
                const readBy = JSON.parse(notif.readBy || '[]');
                if (!readBy.includes(userId)) readBy.push(userId);
                await prisma.teamNotification.update({
                    where: { id: opts.notificationId },
                    data: { readBy: JSON.stringify(readBy) },
                });
                return { success: true, notificationId: opts.notificationId, readBy };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use send, list, mark_read.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export default {
    teamInvite,
    roleAssign,
    commentThread,
    taskAssign,
    approvalFlow,
    activityLog,
    accessAudit,
    notifyTeam,
};
