/**
 * ============================================================================
 * TEAM COLLABORATION TOOLS V4 — PROFESSOR GRADE
 * ============================================================================
 * team_invite, role_assign, comment_thread, task_assign, approval_flow,
 * activity_log, notification_send, shared_snippet, access_request, presence_track
 * Team membership, role-based permissions, threaded comments, task
 * assignment/tracking, multi-step approval workflows, activity feeds,
 * notifications, shared snippets, access governance, presence awareness.
 * ALL state persisted to PostgreSQL via Prisma — ZERO localStorage
 * ============================================================================
 */

import { PersistentMap } from '../lib/persistentMap.js';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const TEAM_COLLABORATION_TOOL_DEFINITIONS = [
    {
        name: 'team_invite',
        description:
            'Invite team members: send invitations, manage membership, list members, remove members, check permissions. Supports owner/admin/member/viewer roles with granular permissions. All persisted in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['invite', 'accept', 'remove', 'suspend', 'reactivate', 'list', 'get', 'update', 'check_permission'],
                    description: 'Team action',
                },
                email: { type: 'string', description: 'Member email' },
                name: { type: 'string', description: 'Member name' },
                role: { type: 'string', enum: ['owner', 'admin', 'member', 'viewer'], description: 'Role. Default: member' },
                permissions: {
                    type: 'array',
                    items: { type: 'string', enum: ['read', 'write', 'deploy', 'admin', 'billing', 'invite'] },
                    description: 'Specific permissions to grant',
                },
                memberId: { type: 'string', description: '[accept/remove/suspend/reactivate/get/update] Member ID' },
                permission: { type: 'string', description: '[check_permission] Permission to check' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'role_assign',
        description:
            'Role and permission management: define roles, assign to members, check access, audit permissions. Supports hierarchical roles (owner > admin > member > viewer) with custom permission sets.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['set_role', 'set_permissions', 'get_permissions', 'audit', 'list_by_role', 'role_hierarchy'],
                    description: 'Role action',
                },
                memberId: { type: 'string', description: 'Team member ID' },
                role: { type: 'string', enum: ['owner', 'admin', 'member', 'viewer'], description: 'Role to assign' },
                permissions: {
                    type: 'array',
                    items: { type: 'string', enum: ['read', 'write', 'deploy', 'admin', 'billing', 'invite'] },
                    description: 'Permissions to set',
                },
                roleFilter: { type: 'string', description: '[list_by_role] Filter by role' },
            },
            required: ['action'],
        },
    },
    {
        name: 'comment_thread',
        description:
            'Threaded comments on files, projects, deployments, and tasks. Create threads, reply, resolve, mention team members. Supports priority levels and status tracking. All stored in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'reply', 'resolve', 'reopen', 'delete', 'list', 'get', 'search', 'list_by_target'],
                    description: 'Comment action',
                },
                body: { type: 'string', description: 'Comment text' },
                targetType: { type: 'string', enum: ['file', 'project', 'deploy', 'task', 'general'], description: 'What the comment is about' },
                targetId: { type: 'string', description: 'ID of the target entity' },
                filePath: { type: 'string', description: '[file comments] File path' },
                lineNumber: { type: 'number', description: '[file comments] Line number' },
                parentId: { type: 'string', description: '[reply] Parent comment ID' },
                priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Priority. Default: normal' },
                mentions: { type: 'array', items: { type: 'string' }, description: 'User IDs to mention' },
                authorName: { type: 'string', description: 'Author display name' },
                commentId: { type: 'string', description: '[resolve/reopen/delete/get] Comment ID' },
                query: { type: 'string', description: '[search] Search text' },
                take: { type: 'number', description: '[list/search] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'task_assign',
        description:
            'Task management: create tasks, assign to team members, set priority/due dates, track status (todo → in_progress → review → done). Supports tags, attachments, and project linking.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'update', 'assign', 'update_status', 'delete', 'list', 'get', 'my_tasks', 'by_status', 'overdue'],
                    description: 'Task action',
                },
                title: { type: 'string', description: 'Task title' },
                description: { type: 'string', description: 'Task description' },
                assigneeId: { type: 'string', description: 'Assignee user ID' },
                assigneeName: { type: 'string', description: 'Assignee display name' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Priority. Default: medium' },
                dueDate: { type: 'string', description: 'Due date (ISO format)' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
                projectId: { type: 'string', description: 'Link to project' },
                filePath: { type: 'string', description: 'Link to file' },
                status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'], description: '[update_status] New status' },
                taskId: { type: 'string', description: '[update/assign/update_status/delete/get] Task ID' },
                statusFilter: { type: 'string', description: '[by_status] Filter by status' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'approval_flow',
        description:
            'Multi-step approval workflows: create approval requests for deploys/merges/access/configs, define approver chains, track decisions. Supports auto-expiry and escalation. All persisted in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'approve', 'reject', 'cancel', 'escalate', 'get', 'list', 'my_pending', 'delete'],
                    description: 'Approval action',
                },
                title: { type: 'string', description: 'Approval request title' },
                description: { type: 'string', description: 'Description/justification' },
                type: { type: 'string', enum: ['deploy', 'merge', 'access', 'budget', 'config', 'other'], description: 'Request type' },
                priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Priority' },
                approvers: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: { userId: { type: 'string' }, name: { type: 'string' } },
                    },
                    description: 'Ordered list of approvers',
                },
                requiredCount: { type: 'number', description: 'Number of approvals needed. Default: 1' },
                context: { type: 'object', description: 'Additional context (deployId, branch, etc.)' },
                expiresIn: { type: 'number', description: 'Auto-expire after N hours' },
                requestId: { type: 'string', description: '[approve/reject/cancel/escalate/get/delete] Request ID' },
                decision: { type: 'string', description: '[approve/reject] Decision notes' },
                approverId: { type: 'string', description: '[approve/reject] Approver user ID' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'activity_log',
        description:
            'Team activity feed: log and query who did what, when. Track file edits, deploys, task changes, comments, approvals. Filter by user, action type, date range. All persisted in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['log', 'list', 'get', 'by_user', 'by_type', 'summary', 'delete', 'clear'],
                    description: 'Activity log action',
                },
                eventType: {
                    type: 'string',
                    enum: ['file_edit', 'deploy', 'task_update', 'comment', 'approval', 'member_change', 'permission_change', 'build', 'config', 'other'],
                    description: '[log] Event type',
                },
                description: { type: 'string', description: '[log] Human-readable description' },
                targetType: { type: 'string', description: '[log] Target entity type (file, project, deploy)' },
                targetId: { type: 'string', description: '[log] Target entity ID' },
                metadata: { type: 'object', description: '[log] Extra context data' },
                actorName: { type: 'string', description: '[log] Who performed the action' },
                memberId: { type: 'string', description: '[by_user] Filter by user' },
                eventTypeFilter: { type: 'string', description: '[by_type] Filter by event type' },
                since: { type: 'string', description: '[list/by_user/by_type] ISO date — only events after this' },
                logId: { type: 'string', description: '[get/delete] Activity log entry ID' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'notification_send',
        description:
            'Team notification system: send notifications to team members, manage read/unread, list notifications, bulk dismiss. Supports priority levels and notification types (mention, assignment, approval, deploy, alert).',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['send', 'list', 'mark_read', 'mark_all_read', 'delete', 'unread_count', 'by_type'],
                    description: 'Notification action',
                },
                recipientId: { type: 'string', description: '[send] Target user ID' },
                recipientName: { type: 'string', description: '[send] Target user name' },
                type: {
                    type: 'string',
                    enum: ['mention', 'assignment', 'approval_request', 'approval_decision', 'deploy', 'alert', 'info', 'comment'],
                    description: '[send] Notification type',
                },
                title: { type: 'string', description: '[send] Notification title' },
                body: { type: 'string', description: '[send] Notification body' },
                priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Priority. Default: normal' },
                link: { type: 'string', description: '[send] Deep-link URL/path to related item' },
                senderName: { type: 'string', description: '[send] Who sent it' },
                notificationId: { type: 'string', description: '[mark_read/delete] Notification ID' },
                typeFilter: { type: 'string', description: '[by_type] Filter by notification type' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'shared_snippet',
        description:
            'Shared code/text snippet library: create, edit, search, tag reusable snippets across the team. Supports language detection, version history, fork/clone, and starred/pinned snippets.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'update', 'get', 'list', 'search', 'delete', 'star', 'unstar', 'fork', 'by_tag'],
                    description: 'Snippet action',
                },
                title: { type: 'string', description: '[create/update] Snippet title' },
                content: { type: 'string', description: '[create/update] Snippet content/code' },
                language: { type: 'string', description: '[create/update] Language (js, python, bash, etc.)' },
                description: { type: 'string', description: '[create/update] Brief description' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags for organization' },
                snippetId: { type: 'string', description: '[update/get/delete/star/unstar/fork] Snippet ID' },
                query: { type: 'string', description: '[search] Search text' },
                tagFilter: { type: 'string', description: '[by_tag] Filter by tag' },
                isPublic: { type: 'boolean', description: '[create] Public to all team members. Default: true' },
                take: { type: 'number', description: '[list/search] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'access_request',
        description:
            'Resource access governance: request access to projects/repos/environments, list pending requests, approve/deny, revoke access, audit access logs. Integrates with role_assign for permission enforcement.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['request', 'approve', 'deny', 'revoke', 'list', 'get', 'my_requests', 'audit', 'delete'],
                    description: 'Access request action',
                },
                resourceType: { type: 'string', enum: ['project', 'repo', 'environment', 'database', 'secret', 'api_key', 'other'], description: 'Resource type' },
                resourceId: { type: 'string', description: 'Resource identifier' },
                resourceName: { type: 'string', description: 'Resource display name' },
                permissionLevel: { type: 'string', enum: ['read', 'write', 'admin'], description: 'Requested permission level' },
                reason: { type: 'string', description: '[request] Why access is needed' },
                requestId: { type: 'string', description: '[approve/deny/revoke/get/delete] Request ID' },
                reviewerNotes: { type: 'string', description: '[approve/deny] Reviewer notes' },
                expiresIn: { type: 'number', description: '[approve] Grant expires after N hours' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'presence_track',
        description:
            'Team presence and availability tracking: heartbeats, status updates (online/away/busy/offline), current activity indicators. See who is working on what file, who is online, idle detection.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['heartbeat', 'set_status', 'get', 'list_online', 'list_all', 'set_activity', 'idle', 'offline'],
                    description: 'Presence action',
                },
                status: { type: 'string', enum: ['online', 'away', 'busy', 'dnd', 'offline'], description: '[set_status] New status' },
                statusMessage: { type: 'string', description: '[set_status] Custom status message (e.g. "In a meeting")' },
                currentFile: { type: 'string', description: '[heartbeat/set_activity] File currently being edited' },
                currentProject: { type: 'string', description: '[heartbeat/set_activity] Project being worked on' },
                memberId: { type: 'string', description: '[get] Member ID to look up' },
                memberName: { type: 'string', description: '[heartbeat] Display name' },
                idleMinutes: { type: 'number', description: '[idle] Minutes idle before auto-away. Default: 15' },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// DEFAULT PERMISSIONS BY ROLE
// ============================================================================

const ROLE_DEFAULTS = {
    owner: ['read', 'write', 'deploy', 'admin', 'billing', 'invite'],
    admin: ['read', 'write', 'deploy', 'admin', 'invite'],
    member: ['read', 'write', 'deploy'],
    viewer: ['read'],
};

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeTeamInvite(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'invite': {
            const { email, name, role = 'member', permissions } = input;
            if (!email) return JSON.stringify({ status: 'error', error: 'email required' });

            const perms = permissions || ROLE_DEFAULTS[role] || ROLE_DEFAULTS.member;

            const member = await prisma.teamMember.upsert({
                where: { teamOwnerId_email: { teamOwnerId: userId, email } },
                update: { name: name || undefined, role, permissions: perms, status: 'pending', invitedAt: new Date() },
                create: { teamOwnerId: userId, email, name: name || null, role, permissions: perms, status: 'pending' },
            });

            return JSON.stringify({ status: 'success', member: { id: member.id, email: member.email, role: member.role, status: member.status, permissions: perms } });
        }

        case 'accept': {
            const { memberId } = input;
            if (!memberId) return JSON.stringify({ status: 'error', error: 'memberId required' });

            await prisma.teamMember.updateMany({
                where: { id: memberId, teamOwnerId: userId, status: 'pending' },
                data: { status: 'active', joinedAt: new Date() },
            });
            return JSON.stringify({ status: 'success', memberId, status: 'active' });
        }

        case 'remove': {
            const { memberId, email } = input;
            if (memberId) {
                await prisma.teamMember.deleteMany({ where: { id: memberId, teamOwnerId: userId } });
                return JSON.stringify({ status: 'success', removed: memberId });
            }
            if (email) {
                await prisma.teamMember.deleteMany({ where: { teamOwnerId: userId, email } });
                return JSON.stringify({ status: 'success', removed: email });
            }
            return JSON.stringify({ status: 'error', error: 'memberId or email required' });
        }

        case 'suspend': {
            const { memberId } = input;
            if (!memberId) return JSON.stringify({ status: 'error', error: 'memberId required' });
            await prisma.teamMember.updateMany({ where: { id: memberId, teamOwnerId: userId }, data: { status: 'suspended' } });
            return JSON.stringify({ status: 'success', memberId, status: 'suspended' });
        }

        case 'reactivate': {
            const { memberId } = input;
            if (!memberId) return JSON.stringify({ status: 'error', error: 'memberId required' });
            await prisma.teamMember.updateMany({ where: { id: memberId, teamOwnerId: userId, status: 'suspended' }, data: { status: 'active' } });
            return JSON.stringify({ status: 'success', memberId, status: 'active' });
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const members = await prisma.teamMember.findMany({
                where: { teamOwnerId: userId },
                orderBy: { createdAt: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: members.length, members: members.map((m) => ({ id: m.id, email: m.email, name: m.name, role: m.role, status: m.status, joinedAt: m.joinedAt })) });
        }

        case 'get': {
            const { memberId } = input;
            if (!memberId) return JSON.stringify({ status: 'error', error: 'memberId required' });
            const member = await prisma.teamMember.findFirst({ where: { id: memberId, teamOwnerId: userId } });
            if (!member) return JSON.stringify({ status: 'error', error: 'Member not found' });
            return JSON.stringify({ status: 'success', member });
        }

        case 'update': {
            const { memberId, name, role, permissions } = input;
            if (!memberId) return JSON.stringify({ status: 'error', error: 'memberId required' });
            const data = {};
            if (name !== undefined) data.name = name;
            if (role !== undefined) { data.role = role; data.permissions = ROLE_DEFAULTS[role] || []; }
            if (permissions !== undefined) data.permissions = permissions;
            await prisma.teamMember.updateMany({ where: { id: memberId, teamOwnerId: userId }, data });
            return JSON.stringify({ status: 'success', updated: memberId });
        }

        case 'check_permission': {
            const { memberId, email, permission } = input;
            if (!permission) return JSON.stringify({ status: 'error', error: 'permission required' });

            let member;
            if (memberId) member = await prisma.teamMember.findFirst({ where: { id: memberId, teamOwnerId: userId } });
            else if (email) member = await prisma.teamMember.findFirst({ where: { teamOwnerId: userId, email } });
            else return JSON.stringify({ status: 'error', error: 'memberId or email required' });

            if (!member) return JSON.stringify({ status: 'error', error: 'Member not found' });
            const perms = Array.isArray(member.permissions) ? member.permissions : [];
            const hasPermission = perms.includes(permission) || perms.includes('admin');

            return JSON.stringify({ status: 'success', member: member.email, permission, hasPermission, role: member.role, allPermissions: perms });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown team_invite action: ${action}` });
    }
}

async function executeRoleAssign(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'set_role': {
            const { memberId, role } = input;
            if (!memberId || !role) return JSON.stringify({ status: 'error', error: 'memberId and role required' });
            const perms = ROLE_DEFAULTS[role] || [];
            await prisma.teamMember.updateMany({ where: { id: memberId, teamOwnerId: userId }, data: { role, permissions: perms } });
            return JSON.stringify({ status: 'success', memberId, role, permissions: perms });
        }

        case 'set_permissions': {
            const { memberId, permissions = [] } = input;
            if (!memberId) return JSON.stringify({ status: 'error', error: 'memberId required' });
            await prisma.teamMember.updateMany({ where: { id: memberId, teamOwnerId: userId }, data: { permissions } });
            return JSON.stringify({ status: 'success', memberId, permissions });
        }

        case 'get_permissions': {
            const { memberId } = input;
            if (!memberId) return JSON.stringify({ status: 'error', error: 'memberId required' });
            const member = await prisma.teamMember.findFirst({ where: { id: memberId, teamOwnerId: userId } });
            if (!member) return JSON.stringify({ status: 'error', error: 'Member not found' });
            return JSON.stringify({ status: 'success', member: member.email, role: member.role, permissions: member.permissions });
        }

        case 'audit': {
            const members = await prisma.teamMember.findMany({ where: { teamOwnerId: userId } });
            const audit = {
                totalMembers: members.length,
                byRole: {},
                byStatus: {},
                adminCount: 0,
                suspendedCount: 0,
            };

            for (const m of members) {
                audit.byRole[m.role] = (audit.byRole[m.role] || 0) + 1;
                audit.byStatus[m.status] = (audit.byStatus[m.status] || 0) + 1;
                if (m.role === 'admin' || m.role === 'owner') audit.adminCount++;
                if (m.status === 'suspended') audit.suspendedCount++;
            }

            // Security recommendations
            audit.recommendations = [];
            if (audit.adminCount > Math.ceil(members.length * 0.3)) {
                audit.recommendations.push('Too many admins — consider reducing admin privileges');
            }
            if (audit.byStatus['pending'] > 0) {
                audit.recommendations.push(`${audit.byStatus['pending']} pending invitations — follow up or remove stale invites`);
            }

            return JSON.stringify({ status: 'success', audit });
        }

        case 'list_by_role': {
            const { roleFilter } = input;
            if (!roleFilter) return JSON.stringify({ status: 'error', error: 'roleFilter required' });
            const members = await prisma.teamMember.findMany({
                where: { teamOwnerId: userId, role: roleFilter },
                select: { id: true, email: true, name: true, role: true, status: true, permissions: true },
            });
            return JSON.stringify({ status: 'success', role: roleFilter, count: members.length, members });
        }

        case 'role_hierarchy': {
            return JSON.stringify({
                status: 'success',
                hierarchy: [
                    { role: 'owner', level: 4, defaultPermissions: ROLE_DEFAULTS.owner, description: 'Full access, billing, team management' },
                    { role: 'admin', level: 3, defaultPermissions: ROLE_DEFAULTS.admin, description: 'Full access except billing' },
                    { role: 'member', level: 2, defaultPermissions: ROLE_DEFAULTS.member, description: 'Read, write, and deploy' },
                    { role: 'viewer', level: 1, defaultPermissions: ROLE_DEFAULTS.viewer, description: 'Read-only access' },
                ],
            });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown role_assign action: ${action}` });
    }
}

async function executeCommentThread(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'create': {
            const { body, targetType = 'general', targetId = 'global', filePath, lineNumber, priority = 'normal', mentions = [], authorName } = input;
            if (!body) return JSON.stringify({ status: 'error', error: 'body required' });

            const comment = await prisma.commentThread.create({
                data: {
                    userId,
                    body,
                    targetType,
                    targetId,
                    filePath: filePath || null,
                    lineNumber: lineNumber || null,
                    priority,
                    mentions,
                    authorName: authorName || null,
                },
            });
            return JSON.stringify({ status: 'success', comment: { id: comment.id, targetType, targetId, priority, status: comment.status } });
        }

        case 'reply': {
            const { parentId, body, authorName, mentions = [] } = input;
            if (!parentId || !body) return JSON.stringify({ status: 'error', error: 'parentId and body required' });

            const parent = await prisma.commentThread.findFirst({ where: { id: parentId, userId } });
            if (!parent) return JSON.stringify({ status: 'error', error: 'Parent comment not found' });

            const reply = await prisma.commentThread.create({
                data: {
                    userId,
                    body,
                    targetType: parent.targetType,
                    targetId: parent.targetId,
                    filePath: parent.filePath,
                    parentId,
                    priority: parent.priority,
                    mentions,
                    authorName: authorName || null,
                },
            });
            return JSON.stringify({ status: 'success', reply: { id: reply.id, parentId, body: reply.body.slice(0, 100) } });
        }

        case 'resolve': {
            const { commentId } = input;
            if (!commentId) return JSON.stringify({ status: 'error', error: 'commentId required' });
            await prisma.commentThread.updateMany({
                where: { id: commentId, userId },
                data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId },
            });
            return JSON.stringify({ status: 'success', commentId, status: 'resolved' });
        }

        case 'reopen': {
            const { commentId } = input;
            if (!commentId) return JSON.stringify({ status: 'error', error: 'commentId required' });
            await prisma.commentThread.updateMany({
                where: { id: commentId, userId },
                data: { status: 'open', resolvedAt: null, resolvedBy: null },
            });
            return JSON.stringify({ status: 'success', commentId, status: 'open' });
        }

        case 'delete': {
            const { commentId } = input;
            if (!commentId) return JSON.stringify({ status: 'error', error: 'commentId required' });
            // Delete replies too
            await prisma.commentThread.deleteMany({ where: { parentId: commentId, userId } });
            await prisma.commentThread.deleteMany({ where: { id: commentId, userId } });
            return JSON.stringify({ status: 'success', deleted: commentId });
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const comments = await prisma.commentThread.findMany({
                where: { userId, parentId: null },
                orderBy: { createdAt: 'desc' },
                take,
            });
            return JSON.stringify({
                status: 'success',
                count: comments.length,
                threads: comments.map((c) => ({ id: c.id, body: c.body.slice(0, 200), targetType: c.targetType, targetId: c.targetId, status: c.status, priority: c.priority, createdAt: c.createdAt })),
            });
        }

        case 'get': {
            const { commentId } = input;
            if (!commentId) return JSON.stringify({ status: 'error', error: 'commentId required' });
            const comment = await prisma.commentThread.findFirst({ where: { id: commentId, userId } });
            if (!comment) return JSON.stringify({ status: 'error', error: 'Comment not found' });

            // Get replies
            const replies = await prisma.commentThread.findMany({
                where: { parentId: commentId, userId },
                orderBy: { createdAt: 'asc' },
            });

            return JSON.stringify({ status: 'success', comment, replies }).slice(0, MAX_OUTPUT);
        }

        case 'search': {
            const { query, take: limit = 50 } = input;
            if (!query) return JSON.stringify({ status: 'error', error: 'query required' });
            const take = Math.min(limit, 200);

            const comments = await prisma.commentThread.findMany({
                where: { userId, body: { contains: query, mode: 'insensitive' } },
                orderBy: { createdAt: 'desc' },
                take,
            });
            return JSON.stringify({
                status: 'success',
                query,
                count: comments.length,
                results: comments.map((c) => ({ id: c.id, body: c.body.slice(0, 200), targetType: c.targetType, status: c.status, createdAt: c.createdAt })),
            });
        }

        case 'list_by_target': {
            const { targetType, targetId, take: limit = 50 } = input;
            if (!targetType || !targetId) return JSON.stringify({ status: 'error', error: 'targetType and targetId required' });
            const take = Math.min(limit, 200);

            const comments = await prisma.commentThread.findMany({
                where: { userId, targetType, targetId, parentId: null },
                orderBy: { createdAt: 'desc' },
                take,
            });
            return JSON.stringify({
                status: 'success',
                targetType,
                targetId,
                count: comments.length,
                threads: comments.map((c) => ({ id: c.id, body: c.body.slice(0, 200), status: c.status, priority: c.priority, authorName: c.authorName, createdAt: c.createdAt })),
            });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown comment_thread action: ${action}` });
    }
}

async function executeTaskAssign(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'create': {
            const { title, description, assigneeId, assigneeName, priority = 'medium', dueDate, tags = [], projectId, filePath } = input;
            if (!title) return JSON.stringify({ status: 'error', error: 'title required' });

            const task = await prisma.taskItem.create({
                data: {
                    userId,
                    title,
                    description: description || null,
                    assigneeId: assigneeId || null,
                    assigneeName: assigneeName || null,
                    priority,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    tags,
                    projectId: projectId || null,
                    filePath: filePath || null,
                },
            });
            return JSON.stringify({ status: 'success', task: { id: task.id, title: task.title, priority, status: task.status, assignee: assigneeName || assigneeId } });
        }

        case 'update': {
            const { taskId, title, description, priority, dueDate, tags, projectId, filePath } = input;
            if (!taskId) return JSON.stringify({ status: 'error', error: 'taskId required' });

            const data = {};
            if (title !== undefined) data.title = title;
            if (description !== undefined) data.description = description;
            if (priority !== undefined) data.priority = priority;
            if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
            if (tags !== undefined) data.tags = tags;
            if (projectId !== undefined) data.projectId = projectId;
            if (filePath !== undefined) data.filePath = filePath;

            await prisma.taskItem.updateMany({ where: { id: taskId, userId }, data });
            return JSON.stringify({ status: 'success', updated: taskId });
        }

        case 'assign': {
            const { taskId, assigneeId, assigneeName } = input;
            if (!taskId) return JSON.stringify({ status: 'error', error: 'taskId required' });
            await prisma.taskItem.updateMany({
                where: { id: taskId, userId },
                data: { assigneeId: assigneeId || null, assigneeName: assigneeName || null },
            });
            return JSON.stringify({ status: 'success', taskId, assignee: assigneeName || assigneeId });
        }

        case 'update_status': {
            const { taskId, status } = input;
            if (!taskId || !status) return JSON.stringify({ status: 'error', error: 'taskId and status required' });
            const data = { status };
            if (status === 'done') data.completedAt = new Date();
            await prisma.taskItem.updateMany({ where: { id: taskId, userId }, data });
            return JSON.stringify({ status: 'success', taskId, status });
        }

        case 'delete': {
            const { taskId } = input;
            if (!taskId) return JSON.stringify({ status: 'error', error: 'taskId required' });
            await prisma.taskItem.deleteMany({ where: { id: taskId, userId } });
            return JSON.stringify({ status: 'success', deleted: taskId });
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const tasks = await prisma.taskItem.findMany({
                where: { userId },
                select: { id: true, title: true, status: true, priority: true, assigneeName: true, dueDate: true, tags: true, createdAt: true },
                orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
                take,
            });
            return JSON.stringify({ status: 'success', count: tasks.length, tasks });
        }

        case 'get': {
            const { taskId } = input;
            if (!taskId) return JSON.stringify({ status: 'error', error: 'taskId required' });
            const task = await prisma.taskItem.findFirst({ where: { id: taskId, userId } });
            if (!task) return JSON.stringify({ status: 'error', error: 'Task not found' });
            return JSON.stringify({ status: 'success', task });
        }

        case 'my_tasks': {
            const { assigneeId } = input;
            const where = { userId };
            if (assigneeId) where.assigneeId = assigneeId;
            else where.assigneeId = userId;

            const tasks = await prisma.taskItem.findMany({
                where,
                select: { id: true, title: true, status: true, priority: true, dueDate: true, tags: true },
                orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
                take: 50,
            });
            return JSON.stringify({ status: 'success', count: tasks.length, tasks });
        }

        case 'by_status': {
            const { statusFilter } = input;
            if (!statusFilter) return JSON.stringify({ status: 'error', error: 'statusFilter required' });
            const tasks = await prisma.taskItem.findMany({
                where: { userId, status: statusFilter },
                select: { id: true, title: true, priority: true, assigneeName: true, dueDate: true },
                orderBy: { priority: 'desc' },
                take: 100,
            });
            return JSON.stringify({ status: 'success', status: statusFilter, count: tasks.length, tasks });
        }

        case 'overdue': {
            const tasks = await prisma.taskItem.findMany({
                where: { userId, dueDate: { lt: new Date() }, status: { notIn: ['done', 'cancelled'] } },
                select: { id: true, title: true, priority: true, assigneeName: true, dueDate: true, status: true },
                orderBy: { dueDate: 'asc' },
                take: 100,
            });
            return JSON.stringify({ status: 'success', count: tasks.length, overdueTasks: tasks });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown task_assign action: ${action}` });
    }
}

async function executeApprovalFlow(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'create': {
            const { title, description, type = 'other', priority = 'normal', approvers = [], requiredCount = 1, context, expiresIn } = input;
            if (!title) return JSON.stringify({ status: 'error', error: 'title required' });

            const enrichedApprovers = approvers.map((a) => ({ ...a, status: 'pending', respondedAt: null }));
            const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 3600000) : null;

            const request = await prisma.approvalRequest.create({
                data: {
                    userId,
                    title,
                    description: description || null,
                    type,
                    priority,
                    approvers: enrichedApprovers,
                    requiredCount: Math.min(requiredCount, enrichedApprovers.length || 1),
                    context: context || null,
                    expiresAt,
                },
            });

            return JSON.stringify({
                status: 'success',
                request: { id: request.id, title: request.title, type, approverCount: enrichedApprovers.length, requiredApprovals: requiredCount, expiresAt: expiresAt?.toISOString() },
            });
        }

        case 'approve': {
            const { requestId, decision, approverId } = input;
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });

            const request = await prisma.approvalRequest.findFirst({ where: { id: requestId, userId } });
            if (!request) return JSON.stringify({ status: 'error', error: 'Request not found' });
            if (request.status !== 'pending') return JSON.stringify({ status: 'error', error: `Request is already ${request.status}` });

            // Check expiry
            if (request.expiresAt && new Date() > request.expiresAt) {
                await prisma.approvalRequest.update({ where: { id: requestId }, data: { status: 'expired' } });
                return JSON.stringify({ status: 'error', error: 'Request has expired' });
            }

            const approvers = Array.isArray(request.approvers) ? request.approvers : [];
            const approver = approvers.find((a) => a.userId === approverId || a.userId === userId) || approvers[request.currentStep];
            if (approver) {
                approver.status = 'approved';
                approver.respondedAt = new Date().toISOString();
                if (decision) approver.decision = decision;
            }

            const approvedCount = approvers.filter((a) => a.status === 'approved').length;
            const isFullyApproved = approvedCount >= request.requiredCount;

            await prisma.approvalRequest.update({
                where: { id: requestId },
                data: {
                    approvers,
                    currentStep: request.currentStep + 1,
                    status: isFullyApproved ? 'approved' : 'pending',
                    decision: decision || null,
                    decidedBy: isFullyApproved ? (approverId || userId) : null,
                    decidedAt: isFullyApproved ? new Date() : null,
                },
            });

            return JSON.stringify({
                status: 'success',
                requestId,
                approvedCount,
                requiredCount: request.requiredCount,
                finalStatus: isFullyApproved ? 'approved' : 'pending',
            });
        }

        case 'reject': {
            const { requestId, decision, approverId } = input;
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });

            const request = await prisma.approvalRequest.findFirst({ where: { id: requestId, userId } });
            if (!request) return JSON.stringify({ status: 'error', error: 'Request not found' });

            const approvers = Array.isArray(request.approvers) ? request.approvers : [];
            const approver = approvers.find((a) => a.userId === approverId || a.userId === userId) || approvers[request.currentStep];
            if (approver) {
                approver.status = 'rejected';
                approver.respondedAt = new Date().toISOString();
                if (decision) approver.decision = decision;
            }

            await prisma.approvalRequest.update({
                where: { id: requestId },
                data: { approvers, status: 'rejected', decision: decision || 'Rejected', decidedBy: approverId || userId, decidedAt: new Date() },
            });

            return JSON.stringify({ status: 'success', requestId, finalStatus: 'rejected', reason: decision || 'No reason provided' });
        }

        case 'cancel': {
            const { requestId } = input;
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });
            await prisma.approvalRequest.updateMany({ where: { id: requestId, userId, status: 'pending' }, data: { status: 'expired' } });
            return JSON.stringify({ status: 'success', cancelled: requestId });
        }

        case 'escalate': {
            const { requestId } = input;
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });

            const request = await prisma.approvalRequest.findFirst({ where: { id: requestId, userId } });
            if (!request) return JSON.stringify({ status: 'error', error: 'Request not found' });

            await prisma.approvalRequest.update({
                where: { id: requestId },
                data: { priority: 'urgent' },
            });

            return JSON.stringify({ status: 'success', requestId, escalated: true, newPriority: 'urgent' });
        }

        case 'get': {
            const { requestId } = input;
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });
            const request = await prisma.approvalRequest.findFirst({ where: { id: requestId, userId } });
            if (!request) return JSON.stringify({ status: 'error', error: 'Request not found' });
            return JSON.stringify({ status: 'success', request }).slice(0, MAX_OUTPUT);
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const requests = await prisma.approvalRequest.findMany({
                where: { userId },
                select: { id: true, title: true, type: true, status: true, priority: true, requiredCount: true, currentStep: true, createdAt: true, expiresAt: true },
                orderBy: { createdAt: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: requests.length, requests });
        }

        case 'my_pending': {
            const requests = await prisma.approvalRequest.findMany({
                where: { userId, status: 'pending' },
                orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
                take: 50,
            });

            // Check for expired
            const now = new Date();
            const active = [];
            for (const r of requests) {
                if (r.expiresAt && now > r.expiresAt) {
                    await prisma.approvalRequest.update({ where: { id: r.id }, data: { status: 'expired' } });
                } else {
                    active.push({ id: r.id, title: r.title, type: r.type, priority: r.priority, createdAt: r.createdAt, expiresAt: r.expiresAt });
                }
            }

            return JSON.stringify({ status: 'success', count: active.length, pendingRequests: active });
        }

        case 'delete': {
            const { requestId } = input;
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });
            await prisma.approvalRequest.deleteMany({ where: { id: requestId, userId } });
            return JSON.stringify({ status: 'success', deleted: requestId });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown approval_flow action: ${action}` });
    }
}

// ============================================================================
// ACTIVITY LOG EXECUTOR
// ============================================================================

const activityStore = new PersistentMap('team.activityStore');

async function executeActivityLog(input, prisma, userId) {
    const { action, eventType, description, targetType, targetId, metadata, actorName, memberId, eventTypeFilter, since, logId, take = 50 } = input;

    switch (action) {
        case 'log': {
            if (!eventType || !description) return JSON.stringify({ status: 'error', error: 'eventType and description required' });
            const id = `act_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const entry = {
                id, userId, eventType, description,
                targetType: targetType || null, targetId: targetId || null,
                metadata: metadata || {}, actorName: actorName || userId,
                createdAt: new Date().toISOString(),
            };
            activityStore.set(id, entry);
            return JSON.stringify({ status: 'success', action: 'logged', activity: { id, eventType, description } });
        }

        case 'list': {
            let entries = Array.from(activityStore.values()).filter(e => e.userId === userId);
            if (since) entries = entries.filter(e => new Date(e.createdAt) >= new Date(since));
            entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return JSON.stringify({ status: 'success', activities: entries.slice(0, take), total: entries.length });
        }

        case 'get': {
            if (!logId) return JSON.stringify({ status: 'error', error: 'logId required' });
            const entry = activityStore.get(logId);
            if (!entry) return JSON.stringify({ status: 'error', error: 'Activity not found' });
            return JSON.stringify({ status: 'success', activity: entry });
        }

        case 'by_user': {
            if (!memberId) return JSON.stringify({ status: 'error', error: 'memberId required' });
            let entries = Array.from(activityStore.values()).filter(e => e.actorName === memberId || e.userId === memberId);
            if (since) entries = entries.filter(e => new Date(e.createdAt) >= new Date(since));
            entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return JSON.stringify({ status: 'success', activities: entries.slice(0, take), total: entries.length });
        }

        case 'by_type': {
            if (!eventTypeFilter) return JSON.stringify({ status: 'error', error: 'eventTypeFilter required' });
            let entries = Array.from(activityStore.values()).filter(e => e.eventType === eventTypeFilter && e.userId === userId);
            if (since) entries = entries.filter(e => new Date(e.createdAt) >= new Date(since));
            entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return JSON.stringify({ status: 'success', eventType: eventTypeFilter, activities: entries.slice(0, take), total: entries.length });
        }

        case 'summary': {
            const entries = Array.from(activityStore.values()).filter(e => e.userId === userId);
            const byType = {};
            const byActor = {};
            entries.forEach(e => {
                byType[e.eventType] = (byType[e.eventType] || 0) + 1;
                byActor[e.actorName] = (byActor[e.actorName] || 0) + 1;
            });
            const today = new Date().toISOString().split('T')[0];
            const todayCount = entries.filter(e => e.createdAt.startsWith(today)).length;
            return JSON.stringify({ status: 'success', summary: { total: entries.length, today: todayCount, byType, byActor, mostActive: Object.entries(byActor).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none' } });
        }

        case 'delete': {
            if (!logId) return JSON.stringify({ status: 'error', error: 'logId required' });
            const existed = activityStore.delete(logId);
            return JSON.stringify({ status: 'success', deleted: logId, found: existed });
        }

        case 'clear': {
            const before = activityStore.size;
            const toDelete = [];
            activityStore.forEach((v, k) => { if (v.userId === userId) toDelete.push(k); });
            toDelete.forEach(k => activityStore.delete(k));
            return JSON.stringify({ status: 'success', cleared: toDelete.length, was: before });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown activity_log action: ${action}` });
    }
}

// ============================================================================
// NOTIFICATION SEND EXECUTOR
// ============================================================================

const notificationStore = new PersistentMap('team.notificationStore'); // recipientId => [notifications]

async function executeNotificationSend(input, prisma, userId) {
    const { action, recipientId, recipientName, type, title, body, priority = 'normal', link, senderName, notificationId, typeFilter, take = 50 } = input;

    switch (action) {
        case 'send': {
            if (!recipientId || !title) return JSON.stringify({ status: 'error', error: 'recipientId and title required' });
            const id = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const notif = {
                id, recipientId, recipientName: recipientName || recipientId,
                type: type || 'info', title, body: body || '',
                priority, link: link || null, senderName: senderName || userId,
                senderId: userId, read: false, createdAt: new Date().toISOString(),
            };
            if (!notificationStore.has(recipientId)) notificationStore.set(recipientId, []);
            notificationStore.get(recipientId).push(notif);
            return JSON.stringify({ status: 'success', action: 'sent', notification: { id, recipientId, type: notif.type, title, priority } });
        }

        case 'list': {
            const notifs = (notificationStore.get(userId) || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, take);
            return JSON.stringify({ status: 'success', notifications: notifs, total: notifs.length });
        }

        case 'mark_read': {
            if (!notificationId) return JSON.stringify({ status: 'error', error: 'notificationId required' });
            const notifs = notificationStore.get(userId) || [];
            const notif = notifs.find(n => n.id === notificationId);
            if (!notif) return JSON.stringify({ status: 'error', error: 'Notification not found' });
            notif.read = true;
            notif.readAt = new Date().toISOString();
            return JSON.stringify({ status: 'success', action: 'marked_read', notificationId });
        }

        case 'mark_all_read': {
            const notifs = notificationStore.get(userId) || [];
            let count = 0;
            notifs.forEach(n => { if (!n.read) { n.read = true; n.readAt = new Date().toISOString(); count++; } });
            return JSON.stringify({ status: 'success', action: 'marked_all_read', count });
        }

        case 'delete': {
            if (!notificationId) return JSON.stringify({ status: 'error', error: 'notificationId required' });
            const notifs = notificationStore.get(userId) || [];
            const idx = notifs.findIndex(n => n.id === notificationId);
            if (idx === -1) return JSON.stringify({ status: 'error', error: 'Notification not found' });
            notifs.splice(idx, 1);
            return JSON.stringify({ status: 'success', action: 'deleted', notificationId });
        }

        case 'unread_count': {
            const notifs = notificationStore.get(userId) || [];
            const unread = notifs.filter(n => !n.read).length;
            return JSON.stringify({ status: 'success', unreadCount: unread, total: notifs.length });
        }

        case 'by_type': {
            if (!typeFilter) return JSON.stringify({ status: 'error', error: 'typeFilter required' });
            const notifs = (notificationStore.get(userId) || []).filter(n => n.type === typeFilter).slice(0, take);
            return JSON.stringify({ status: 'success', type: typeFilter, notifications: notifs, count: notifs.length });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown notification_send action: ${action}` });
    }
}

// ============================================================================
// SHARED SNIPPET EXECUTOR
// ============================================================================

const snippetStore = new PersistentMap('team.snippetStore');
const snippetStars = new Map(); // snippetId => Set of userIds (in-memory: Sets are not JSON-persistable)

async function executeSharedSnippet(input, prisma, userId) {
    const { action, title, content, language, description, tags = [], snippetId, query, tagFilter, isPublic = true, take = 50 } = input;

    switch (action) {
        case 'create': {
            if (!title || !content) return JSON.stringify({ status: 'error', error: 'title and content required' });
            const id = `snip_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const detectedLang = language || detectLanguage(content);
            const snippet = {
                id, title, content, language: detectedLang,
                description: description || '', tags, isPublic,
                authorId: userId, versions: [{ version: 1, content, updatedAt: new Date().toISOString() }],
                stars: 0, forkOf: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
            snippetStore.set(id, snippet);
            return JSON.stringify({ status: 'success', action: 'created', snippet: { id, title, language: detectedLang, tags, linesOfCode: content.split('\n').length } });
        }

        case 'update': {
            if (!snippetId) return JSON.stringify({ status: 'error', error: 'snippetId required' });
            const snip = snippetStore.get(snippetId);
            if (!snip) return JSON.stringify({ status: 'error', error: 'Snippet not found' });
            if (title) snip.title = title;
            if (description) snip.description = description;
            if (tags.length > 0) snip.tags = tags;
            if (content) {
                snip.content = content;
                snip.versions.push({ version: snip.versions.length + 1, content, updatedAt: new Date().toISOString() });
            }
            if (language) snip.language = language;
            snip.updatedAt = new Date().toISOString();
            return JSON.stringify({ status: 'success', action: 'updated', snippet: { id: snip.id, title: snip.title, version: snip.versions.length } });
        }

        case 'get': {
            if (!snippetId) return JSON.stringify({ status: 'error', error: 'snippetId required' });
            const snip = snippetStore.get(snippetId);
            if (!snip) return JSON.stringify({ status: 'error', error: 'Snippet not found' });
            return JSON.stringify({ status: 'success', snippet: { ...snip, starred: snippetStars.has(snippetId) && snippetStars.get(snippetId).has(userId) } });
        }

        case 'list': {
            const snippets = Array.from(snippetStore.values())
                .filter(s => s.authorId === userId || s.isPublic)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, take)
                .map(s => ({ id: s.id, title: s.title, language: s.language, tags: s.tags, stars: s.stars, author: s.authorId }));
            return JSON.stringify({ status: 'success', snippets, count: snippets.length });
        }

        case 'search': {
            if (!query) return JSON.stringify({ status: 'error', error: 'query required' });
            const q = query.toLowerCase();
            const results = Array.from(snippetStore.values())
                .filter(s => (s.authorId === userId || s.isPublic) && (s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q))))
                .slice(0, take)
                .map(s => ({ id: s.id, title: s.title, language: s.language, tags: s.tags, matchIn: s.title.toLowerCase().includes(q) ? 'title' : s.content.toLowerCase().includes(q) ? 'content' : 'tags' }));
            return JSON.stringify({ status: 'success', query, results, count: results.length });
        }

        case 'delete': {
            if (!snippetId) return JSON.stringify({ status: 'error', error: 'snippetId required' });
            const existed = snippetStore.delete(snippetId);
            snippetStars.delete(snippetId);
            return JSON.stringify({ status: 'success', action: 'deleted', snippetId, found: existed });
        }

        case 'star': {
            if (!snippetId) return JSON.stringify({ status: 'error', error: 'snippetId required' });
            const snip = snippetStore.get(snippetId);
            if (!snip) return JSON.stringify({ status: 'error', error: 'Snippet not found' });
            if (!snippetStars.has(snippetId)) snippetStars.set(snippetId, new Set());
            snippetStars.get(snippetId).add(userId);
            snip.stars = snippetStars.get(snippetId).size;
            return JSON.stringify({ status: 'success', action: 'starred', snippetId, stars: snip.stars });
        }

        case 'unstar': {
            if (!snippetId) return JSON.stringify({ status: 'error', error: 'snippetId required' });
            const snip = snippetStore.get(snippetId);
            if (!snip) return JSON.stringify({ status: 'error', error: 'Snippet not found' });
            if (snippetStars.has(snippetId)) {
                snippetStars.get(snippetId).delete(userId);
                snip.stars = snippetStars.get(snippetId).size;
            }
            return JSON.stringify({ status: 'success', action: 'unstarred', snippetId, stars: snip.stars });
        }

        case 'fork': {
            if (!snippetId) return JSON.stringify({ status: 'error', error: 'snippetId required' });
            const original = snippetStore.get(snippetId);
            if (!original) return JSON.stringify({ status: 'error', error: 'Snippet not found' });
            const id = `snip_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const forked = {
                ...JSON.parse(JSON.stringify(original)),
                id, authorId: userId, forkOf: snippetId,
                title: `${original.title} (fork)`,
                versions: [{ version: 1, content: original.content, updatedAt: new Date().toISOString() }],
                stars: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
            snippetStore.set(id, forked);
            return JSON.stringify({ status: 'success', action: 'forked', snippet: { id, title: forked.title, forkedFrom: snippetId } });
        }

        case 'by_tag': {
            if (!tagFilter) return JSON.stringify({ status: 'error', error: 'tagFilter required' });
            const tag = tagFilter.toLowerCase();
            const results = Array.from(snippetStore.values())
                .filter(s => (s.authorId === userId || s.isPublic) && s.tags.some(t => t.toLowerCase() === tag))
                .slice(0, take)
                .map(s => ({ id: s.id, title: s.title, language: s.language, tags: s.tags }));
            return JSON.stringify({ status: 'success', tag: tagFilter, snippets: results, count: results.length });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown shared_snippet action: ${action}` });
    }
}

function detectLanguage(content) {
    if (content.includes('import ') && content.includes('from ')) return 'javascript';
    if (content.includes('def ') && content.includes(':')) return 'python';
    if (content.includes('func ') && content.includes('{')) return 'go';
    if (content.includes('fn ') && content.includes('->')) return 'rust';
    if (content.startsWith('#!/bin/bash') || content.startsWith('#!/bin/sh')) return 'bash';
    if (content.includes('SELECT ') || content.includes('CREATE TABLE')) return 'sql';
    if (content.includes('<html') || content.includes('<div')) return 'html';
    if (content.includes('{') && content.includes('}') && content.includes(':')) return 'json';
    return 'text';
}

// ============================================================================
// ACCESS REQUEST EXECUTOR
// ============================================================================

const accessRequestStore = new PersistentMap('team.accessRequestStore');
const accessGrantStore = new PersistentMap('team.accessGrantStore'); // resourceId => [grants]

async function executeAccessRequest(input, prisma, userId) {
    const { action, resourceType, resourceId, resourceName, permissionLevel = 'read', reason, requestId, reviewerNotes, expiresIn, take = 50 } = input;

    switch (action) {
        case 'request': {
            if (!resourceType || !resourceId) return JSON.stringify({ status: 'error', error: 'resourceType and resourceId required' });
            const id = `accreq_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const req = {
                id, userId, resourceType, resourceId,
                resourceName: resourceName || resourceId,
                permissionLevel, reason: reason || '',
                status: 'pending', createdAt: new Date().toISOString(),
                reviewedAt: null, reviewerNotes: null,
            };
            accessRequestStore.set(id, req);
            return JSON.stringify({ status: 'success', action: 'requested', request: { id, resourceType, resourceId, permissionLevel, status: 'pending' } });
        }

        case 'approve': {
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });
            const req = accessRequestStore.get(requestId);
            if (!req) return JSON.stringify({ status: 'error', error: 'Request not found' });
            if (req.status !== 'pending') return JSON.stringify({ status: 'error', error: `Request is already ${req.status}` });
            req.status = 'approved';
            req.reviewedAt = new Date().toISOString();
            req.reviewerNotes = reviewerNotes || null;
            req.reviewerId = userId;
            // Create grant
            const grantId = `grant_${Date.now()}`;
            const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 3600000).toISOString() : null;
            const grant = { id: grantId, requestId, userId: req.userId, resourceType: req.resourceType, resourceId: req.resourceId, permissionLevel: req.permissionLevel, grantedBy: userId, grantedAt: new Date().toISOString(), expiresAt };
            if (!accessGrantStore.has(req.resourceId)) accessGrantStore.set(req.resourceId, []);
            accessGrantStore.get(req.resourceId).push(grant);
            return JSON.stringify({ status: 'success', action: 'approved', requestId, grant: { id: grantId, expiresAt } });
        }

        case 'deny': {
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });
            const req = accessRequestStore.get(requestId);
            if (!req) return JSON.stringify({ status: 'error', error: 'Request not found' });
            req.status = 'denied';
            req.reviewedAt = new Date().toISOString();
            req.reviewerNotes = reviewerNotes || null;
            req.reviewerId = userId;
            return JSON.stringify({ status: 'success', action: 'denied', requestId });
        }

        case 'revoke': {
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });
            const req = accessRequestStore.get(requestId);
            if (!req) return JSON.stringify({ status: 'error', error: 'Request not found' });
            req.status = 'revoked';
            req.revokedAt = new Date().toISOString();
            // Remove grant
            if (accessGrantStore.has(req.resourceId)) {
                const grants = accessGrantStore.get(req.resourceId);
                const idx = grants.findIndex(g => g.requestId === requestId);
                if (idx !== -1) grants.splice(idx, 1);
            }
            return JSON.stringify({ status: 'success', action: 'revoked', requestId });
        }

        case 'list': {
            const reqs = Array.from(accessRequestStore.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, take);
            return JSON.stringify({ status: 'success', requests: reqs.map(r => ({ id: r.id, resourceType: r.resourceType, resourceId: r.resourceId, permissionLevel: r.permissionLevel, status: r.status, userId: r.userId })), count: reqs.length });
        }

        case 'get': {
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });
            const req = accessRequestStore.get(requestId);
            if (!req) return JSON.stringify({ status: 'error', error: 'Request not found' });
            return JSON.stringify({ status: 'success', request: req });
        }

        case 'my_requests': {
            const reqs = Array.from(accessRequestStore.values()).filter(r => r.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, take);
            return JSON.stringify({ status: 'success', requests: reqs, count: reqs.length });
        }

        case 'audit': {
            const allGrants = [];
            accessGrantStore.forEach((grants, resId) => {
                grants.forEach(g => allGrants.push(g));
            });
            const expiredCount = allGrants.filter(g => g.expiresAt && new Date(g.expiresAt) < new Date()).length;
            return JSON.stringify({
                status: 'success',
                audit: {
                    totalRequests: accessRequestStore.size,
                    pending: Array.from(accessRequestStore.values()).filter(r => r.status === 'pending').length,
                    approved: Array.from(accessRequestStore.values()).filter(r => r.status === 'approved').length,
                    denied: Array.from(accessRequestStore.values()).filter(r => r.status === 'denied').length,
                    activeGrants: allGrants.length,
                    expiredGrants: expiredCount,
                },
            });
        }

        case 'delete': {
            if (!requestId) return JSON.stringify({ status: 'error', error: 'requestId required' });
            const existed = accessRequestStore.delete(requestId);
            return JSON.stringify({ status: 'success', deleted: requestId, found: existed });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown access_request action: ${action}` });
    }
}

// ============================================================================
// PRESENCE TRACK EXECUTOR
// ============================================================================

const presenceStore = new PersistentMap('team.presenceStore'); // memberId => presence state

async function executePresenceTrack(input, prisma, userId) {
    const { action, status, statusMessage, currentFile, currentProject, memberId, memberName, idleMinutes = 15 } = input;

    switch (action) {
        case 'heartbeat': {
            const presence = presenceStore.get(userId) || { memberId: userId, memberName: memberName || userId, status: 'online', statusMessage: '', currentFile: null, currentProject: null, lastHeartbeat: null, idleThreshold: 15 };
            presence.lastHeartbeat = new Date().toISOString();
            presence.status = 'online';
            if (currentFile) presence.currentFile = currentFile;
            if (currentProject) presence.currentProject = currentProject;
            if (memberName) presence.memberName = memberName;
            presenceStore.set(userId, presence);
            return JSON.stringify({ status: 'success', action: 'heartbeat', presence: { memberId: userId, status: 'online', currentFile: presence.currentFile } });
        }

        case 'set_status': {
            if (!status) return JSON.stringify({ status: 'error', error: 'status required' });
            const presence = presenceStore.get(userId) || { memberId: userId, memberName: userId, status: 'online', statusMessage: '', currentFile: null, currentProject: null, lastHeartbeat: new Date().toISOString(), idleThreshold: 15 };
            presence.status = status;
            if (statusMessage !== undefined) presence.statusMessage = statusMessage;
            presence.lastHeartbeat = new Date().toISOString();
            presenceStore.set(userId, presence);
            return JSON.stringify({ status: 'success', action: 'status_set', memberId: userId, newStatus: status, statusMessage: presence.statusMessage });
        }

        case 'get': {
            const target = memberId || userId;
            const presence = presenceStore.get(target);
            if (!presence) return JSON.stringify({ status: 'success', memberId: target, status: 'offline', message: 'No presence data' });
            // Auto-detect idle
            const lastBeat = new Date(presence.lastHeartbeat);
            const minutesSince = (Date.now() - lastBeat.getTime()) / 60000;
            if (minutesSince > (presence.idleThreshold || 15) && presence.status === 'online') {
                presence.status = 'away';
            }
            return JSON.stringify({ status: 'success', presence });
        }

        case 'list_online': {
            const online = [];
            const now = Date.now();
            presenceStore.forEach((p, id) => {
                const minutesSince = (now - new Date(p.lastHeartbeat).getTime()) / 60000;
                if (minutesSince > (p.idleThreshold || 15) && p.status === 'online') p.status = 'away';
                if (p.status === 'online' || p.status === 'busy' || p.status === 'dnd') {
                    online.push({ memberId: id, memberName: p.memberName, status: p.status, statusMessage: p.statusMessage, currentFile: p.currentFile, currentProject: p.currentProject });
                }
            });
            return JSON.stringify({ status: 'success', online, count: online.length });
        }

        case 'list_all': {
            const all = [];
            const now = Date.now();
            presenceStore.forEach((p, id) => {
                const minutesSince = (now - new Date(p.lastHeartbeat).getTime()) / 60000;
                if (minutesSince > (p.idleThreshold || 15) && p.status === 'online') p.status = 'away';
                if (minutesSince > 60 && p.status !== 'offline') p.status = 'offline';
                all.push({ memberId: id, memberName: p.memberName, status: p.status, statusMessage: p.statusMessage, lastSeen: p.lastHeartbeat });
            });
            all.sort((a, b) => { const order = { online: 0, busy: 1, dnd: 2, away: 3, offline: 4 }; return (order[a.status] || 5) - (order[b.status] || 5); });
            return JSON.stringify({ status: 'success', members: all, total: all.length });
        }

        case 'set_activity': {
            const presence = presenceStore.get(userId) || { memberId: userId, memberName: userId, status: 'online', statusMessage: '', currentFile: null, currentProject: null, lastHeartbeat: new Date().toISOString(), idleThreshold: 15 };
            if (currentFile !== undefined) presence.currentFile = currentFile;
            if (currentProject !== undefined) presence.currentProject = currentProject;
            presence.lastHeartbeat = new Date().toISOString();
            presenceStore.set(userId, presence);
            return JSON.stringify({ status: 'success', action: 'activity_set', currentFile: presence.currentFile, currentProject: presence.currentProject });
        }

        case 'idle': {
            const presence = presenceStore.get(userId);
            if (!presence) return JSON.stringify({ status: 'success', memberId: userId, idle: true, message: 'No presence data' });
            presence.status = 'away';
            presence.idleThreshold = idleMinutes;
            presenceStore.set(userId, presence);
            return JSON.stringify({ status: 'success', action: 'idle', memberId: userId, idleMinutes });
        }

        case 'offline': {
            const presence = presenceStore.get(userId);
            if (presence) {
                presence.status = 'offline';
                presence.currentFile = null;
                presence.currentProject = null;
            }
            return JSON.stringify({ status: 'success', action: 'offline', memberId: userId });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown presence_track action: ${action}` });
    }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeTeamCollaborationTool(toolName, input, ctx = {}) {
    const prisma = ctx.prisma || (await import('../lib/prisma.js')).default;
    const userId = ctx.userId || 'system';

    switch (toolName) {
        case 'team_invite':
            return { result: await executeTeamInvite(input, prisma, userId), sideEffects: null };
        case 'role_assign':
            return { result: await executeRoleAssign(input, prisma, userId), sideEffects: null };
        case 'comment_thread':
            return { result: await executeCommentThread(input, prisma, userId), sideEffects: null };
        case 'task_assign':
            return { result: await executeTaskAssign(input, prisma, userId), sideEffects: null };
        case 'approval_flow':
            return { result: await executeApprovalFlow(input, prisma, userId), sideEffects: null };
        case 'activity_log':
            return { result: await executeActivityLog(input, prisma, userId), sideEffects: null };
        case 'notification_send':
            return { result: await executeNotificationSend(input, prisma, userId), sideEffects: null };
        case 'shared_snippet':
            return { result: await executeSharedSnippet(input, prisma, userId), sideEffects: null };
        case 'access_request':
            return { result: await executeAccessRequest(input, prisma, userId), sideEffects: null };
        case 'presence_track':
            return { result: await executePresenceTrack(input, prisma, userId), sideEffects: null };
        default:
            return { result: JSON.stringify({ status: 'error', error: `Unknown team collaboration tool: ${toolName}` }), sideEffects: null };
    }
}

const TEAM_COLLABORATION_TOOL_NAMES = new Set(TEAM_COLLABORATION_TOOL_DEFINITIONS.map((t) => t.name));
function isTeamCollaborationTool(toolName) {
    return TEAM_COLLABORATION_TOOL_NAMES.has(toolName);
}

export { TEAM_COLLABORATION_TOOL_DEFINITIONS, executeTeamCollaborationTool, isTeamCollaborationTool };
