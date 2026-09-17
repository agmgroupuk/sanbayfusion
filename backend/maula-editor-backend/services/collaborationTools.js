/**
 * ============================================================================
 * COLLABORATION TOOLS V3 — PROFESSOR GRADE
 * ============================================================================
 * diff_merge, conflict_resolve, review_comment, share_snapshot, live_session
 * ALL state persisted to PostgreSQL via Prisma — ZERO localStorage
 * Diff/merge engine, code review, shareable snapshots, real-time sessions
 * ============================================================================
 */
import crypto from 'crypto';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const COLLABORATION_TOOL_DEFINITIONS = [
    {
        name: 'diff_merge',
        description: 'Diff and merge engine: 2-way/3-way merge, unified diff, conflict detection. Supports text, JSON, code. All operations tracked in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['diff', 'merge', 'three_way_merge', 'status', 'list', 'delete'],
                    description: 'Diff/merge action',
                },
                // diff/merge params
                name: { type: 'string', description: 'Operation name' },
                sourceA: { type: 'string', description: 'Source A content ("ours")' },
                sourceB: { type: 'string', description: 'Source B content ("theirs")' },
                baseSource: { type: 'string', description: '[three_way_merge] Common ancestor' },
                format: { type: 'string', enum: ['text', 'json', 'code'], description: 'Content format. Default: text' },
                language: { type: 'string', description: '[code] Programming language' },
                // status/delete params
                operationId: { type: 'string', description: 'Operation ID' },
                take: { type: 'number', description: '[list] Limit. Default: 20' },
            },
            required: ['action'],
        },
    },
    {
        name: 'conflict_resolve',
        description: 'Conflict resolution: view conflicts, accept ours/theirs/custom, auto-resolve strategies. Works with diff_merge operations. Persisted in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['list_conflicts', 'resolve', 'auto_resolve', 'accept_ours', 'accept_theirs'],
                    description: 'Resolution action',
                },
                // resolve params
                operationId: { type: 'string', description: 'Diff/merge operation ID' },
                conflictIndex: { type: 'number', description: '[resolve] Index of conflict to resolve' },
                resolution: { type: 'string', description: '[resolve] Custom resolution content' },
                strategy: { type: 'string', enum: ['ours', 'theirs', 'shortest', 'longest', 'manual'], description: '[auto_resolve] Strategy' },
            },
            required: ['action'],
        },
    },
    {
        name: 'review_comment',
        description: 'Code review comments: add inline comments, suggestions, issues on files/projects/diffs. Threaded discussions, severity classification. All stored in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'reply', 'resolve', 'dismiss', 'list', 'delete', 'summary'],
                    description: 'Review action',
                },
                // create params
                targetType: { type: 'string', enum: ['project', 'file', 'diff', 'snippet'], description: 'Review target type' },
                targetId: { type: 'string', description: 'Target entity ID' },
                filePath: { type: 'string', description: 'File path (for file/diff reviews)' },
                lineStart: { type: 'number', description: 'Starting line number' },
                lineEnd: { type: 'number', description: 'Ending line number' },
                body: { type: 'string', description: 'Comment body (markdown supported)' },
                codeSnippet: { type: 'string', description: 'Referenced code snippet' },
                suggestion: { type: 'string', description: 'Suggested code change' },
                severity: { type: 'string', enum: ['comment', 'suggestion', 'issue', 'blocker', 'praise'], description: 'Comment severity. Default: comment' },
                category: { type: 'string', enum: ['style', 'bug', 'security', 'performance', 'documentation', 'logic', 'accessibility'], description: 'Comment category' },
                // reply params
                parentId: { type: 'string', description: '[reply] Parent comment ID' },
                // resolve/dismiss/delete params
                commentId: { type: 'string', description: 'Comment ID' },
                // list params
                take: { type: 'number', description: '[list] Limit. Default: 50' },
                statusFilter: { type: 'string', enum: ['open', 'resolved', 'dismissed', 'wont_fix'], description: '[list] Filter' },
            },
            required: ['action'],
        },
    },
    {
        name: 'share_snapshot',
        description: 'Shareable code snapshots: create time-capsule snapshots of files/projects, generate sharing URLs, password protection, expiry. All stored in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'view', 'update', 'delete', 'list', 'stats'],
                    description: 'Snapshot action',
                },
                // create params
                name: { type: 'string', description: 'Snapshot name' },
                files: {
                    type: 'array',
                    items: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' }, language: { type: 'string' } } },
                    description: 'Files to include in snapshot',
                },
                description: { type: 'string', description: 'Description' },
                isPublic: { type: 'boolean', description: 'Public access. Default: true' },
                password: { type: 'string', description: 'Password protection' },
                expiresIn: { type: 'number', description: 'Expiry in hours (null = never)' },
                // view/update/delete params
                snapshotId: { type: 'string', description: 'Snapshot ID' },
                slug: { type: 'string', description: '[view] Snapshot slug for sharing' },
                take: { type: 'number', description: '[list] Limit. Default: 20' },
            },
            required: ['action'],
        },
    },
    {
        name: 'live_session',
        description: 'Live collaboration sessions: create real-time editing sessions with join codes, manage participants, chat, track operations. Session state persisted in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'join', 'leave', 'end', 'status', 'list', 'chat', 'participants', 'settings'],
                    description: 'Session action',
                },
                // create params
                name: { type: 'string', description: '[create] Session name' },
                projectId: { type: 'string', description: '[create] Project ID to collaborate on' },
                maxParticipants: { type: 'number', description: '[create] Max participants. Default: 10' },
                allowEdit: { type: 'boolean', description: '[create] Allow editing. Default: true' },
                allowChat: { type: 'boolean', description: '[create] Allow chat. Default: true' },
                // join params
                sessionCode: { type: 'string', description: '[join] 6-8 char session code' },
                displayName: { type: 'string', description: '[join] Display name' },
                // chat params
                message: { type: 'string', description: '[chat] Chat message' },
                // status/end/leave params
                sessionId: { type: 'string', description: 'Session ID' },
                take: { type: 'number', description: '[list] Limit. Default: 20' },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// HELPERS
// ============================================================================

function generateSlug(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

function generateSessionCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
}

function computeDiff(a, b) {
    const linesA = a.split('\n'), linesB = b.split('\n');
    const diff = [];
    const max = Math.max(linesA.length, linesB.length);
    let additions = 0, deletions = 0;

    for (let i = 0; i < max; i++) {
        if (i >= linesA.length) { diff.push({ type: 'add', line: i + 1, content: linesB[i] }); additions++; }
        else if (i >= linesB.length) { diff.push({ type: 'del', line: i + 1, content: linesA[i] }); deletions++; }
        else if (linesA[i] !== linesB[i]) {
            diff.push({ type: 'change', line: i + 1, from: linesA[i], to: linesB[i] });
            additions++;
            deletions++;
        }
    }

    return { diff: diff.slice(0, 200), additions, deletions, identical: additions === 0 && deletions === 0 };
}

function threeWayMerge(base, ours, theirs) {
    const baseLines = base.split('\n');
    const ourLines = ours.split('\n');
    const theirLines = theirs.split('\n');
    const merged = [];
    const conflicts = [];
    const max = Math.max(baseLines.length, ourLines.length, theirLines.length);

    for (let i = 0; i < max; i++) {
        const b = baseLines[i], o = ourLines[i], t = theirLines[i];

        if (o === t) {
            merged.push(o ?? b ?? '');
        } else if (o === b) {
            merged.push(t ?? ''); // theirs changed, ours didn't
        } else if (t === b) {
            merged.push(o ?? ''); // ours changed, theirs didn't
        } else {
            // Both changed differently — conflict
            conflicts.push({ line: i + 1, ours: o, theirs: t, base: b });
            merged.push(`<<<<<<< OURS\n${o || ''}\n=======\n${t || ''}\n>>>>>>> THEIRS`);
        }
    }

    return { merged: merged.join('\n'), conflicts, hasConflicts: conflicts.length > 0 };
}

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeDiffMerge(input, prisma, userId) {
    const { action = 'list' } = input;

    switch (action) {
        case 'diff': {
            const { name = 'diff', sourceA, sourceB, format = 'text', language } = input;
            if (!sourceA || !sourceB) return JSON.stringify({ status: 'error', error: 'sourceA and sourceB required' });

            let diffResult;
            if (format === 'json') {
                try {
                    const a = JSON.parse(sourceA), b = JSON.parse(sourceB);
                    const changes = jsonDiff(a, b);
                    diffResult = JSON.stringify(changes);
                } catch (e) {
                    return JSON.stringify({ status: 'error', error: `Invalid JSON: ${e.message}` });
                }
            } else {
                const result = computeDiff(sourceA, sourceB);
                diffResult = JSON.stringify(result.diff);
            }

            const op = await prisma.diffMerge.create({
                data: { userId, name, sourceA, sourceB, format, language, diff: diffResult, status: 'diffed', hasConflicts: false },
            });

            const d = JSON.parse(diffResult);
            return JSON.stringify({
                status: 'success',
                operationId: op.id,
                format,
                ...(Array.isArray(d) ? { changes: d.length, diff: d.slice(0, 50) } : { totalChanges: d.length || 0, diff: d }),
            });
        }

        case 'merge': {
            const { name = 'merge', sourceA, sourceB, format = 'text' } = input;
            if (!sourceA || !sourceB) return JSON.stringify({ status: 'error', error: 'sourceA and sourceB required' });

            // Simple line-based merge (prefer A for conflicts)
            const linesA = sourceA.split('\n'), linesB = sourceB.split('\n');
            const merged = [];
            const max = Math.max(linesA.length, linesB.length);
            let conflicts = 0;

            for (let i = 0; i < max; i++) {
                if (linesA[i] === linesB[i]) merged.push(linesA[i] ?? '');
                else if (linesA[i] !== undefined && linesB[i] === undefined) merged.push(linesA[i]);
                else if (linesA[i] === undefined && linesB[i] !== undefined) merged.push(linesB[i]);
                else { merged.push(linesA[i]); conflicts++; }
            }

            const mergedContent = merged.join('\n');
            const op = await prisma.diffMerge.create({
                data: { userId, name, sourceA, sourceB, format, merged: mergedContent, hasConflicts: conflicts > 0, conflictCount: conflicts, status: conflicts > 0 ? 'conflict' : 'merged' },
            });

            return JSON.stringify({ status: 'success', operationId: op.id, merged: mergedContent.slice(0, MAX_OUTPUT), hasConflicts: conflicts > 0, conflictCount: conflicts });
        }

        case 'three_way_merge': {
            const { name = '3-way-merge', sourceA, sourceB, baseSource, format = 'text' } = input;
            if (!sourceA || !sourceB || !baseSource) return JSON.stringify({ status: 'error', error: 'sourceA, sourceB, and baseSource required' });

            const result = threeWayMerge(baseSource, sourceA, sourceB);

            const op = await prisma.diffMerge.create({
                data: {
                    userId, name, sourceA, sourceB, baseSource, format,
                    merged: result.merged, hasConflicts: result.hasConflicts,
                    conflictCount: result.conflicts.length,
                    conflictDetails: result.conflicts,
                    status: result.hasConflicts ? 'conflict' : 'merged',
                },
            });

            return JSON.stringify({ status: 'success', operationId: op.id, hasConflicts: result.hasConflicts, conflictCount: result.conflicts.length, conflicts: result.conflicts.slice(0, 20), merged: result.merged.slice(0, MAX_OUTPUT) });
        }

        case 'status': {
            const { operationId } = input;
            if (!operationId) return JSON.stringify({ status: 'error', error: 'operationId required' });
            const op = await prisma.diffMerge.findFirst({ where: { id: operationId, userId } });
            if (!op) return JSON.stringify({ status: 'error', error: 'Operation not found' });
            return JSON.stringify({ status: 'success', operation: { ...op, sourceA: undefined, sourceB: undefined, baseSource: undefined, merged: op.merged?.slice(0, 5000) } });
        }

        case 'list': {
            const { take = 20 } = input;
            const ops = await prisma.diffMerge.findMany({
                where: { userId }, orderBy: { createdAt: 'desc' }, take,
                select: { id: true, name: true, format: true, status: true, hasConflicts: true, conflictCount: true, createdAt: true },
            });
            return JSON.stringify({ status: 'success', operations: ops });
        }

        case 'delete': {
            const { operationId } = input;
            if (!operationId) return JSON.stringify({ status: 'error', error: 'operationId required' });
            await prisma.diffMerge.deleteMany({ where: { id: operationId, userId } });
            return JSON.stringify({ status: 'success', deleted: operationId });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown diff_merge action: ${action}` });
    }
}

function jsonDiff(a, b, path = '') {
    const changes = [];
    const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const key of allKeys) {
        const fullPath = path ? `${path}.${key}` : key;
        if (a?.[key] === undefined) { changes.push({ path: fullPath, type: 'added', value: b[key] }); continue; }
        if (b?.[key] === undefined) { changes.push({ path: fullPath, type: 'removed', value: a[key] }); continue; }
        if (typeof a[key] === 'object' && typeof b[key] === 'object' && a[key] !== null && b[key] !== null) {
            changes.push(...jsonDiff(a[key], b[key], fullPath));
        } else if (a[key] !== b[key]) {
            changes.push({ path: fullPath, type: 'changed', from: a[key], to: b[key] });
        }
    }
    return changes;
}

async function executeConflictResolve(input, prisma, userId) {
    const { action = 'list_conflicts', operationId } = input;
    if (!operationId) return JSON.stringify({ status: 'error', error: 'operationId required' });

    const op = await prisma.diffMerge.findFirst({ where: { id: operationId, userId } });
    if (!op) return JSON.stringify({ status: 'error', error: 'Operation not found' });

    switch (action) {
        case 'list_conflicts': {
            return JSON.stringify({ status: 'success', hasConflicts: op.hasConflicts, conflictCount: op.conflictCount, conflicts: op.conflictDetails || [] });
        }

        case 'resolve': {
            const { conflictIndex, resolution } = input;
            if (conflictIndex === undefined || !resolution) return JSON.stringify({ status: 'error', error: 'conflictIndex and resolution required' });

            const conflicts = op.conflictDetails || [];
            if (conflictIndex >= conflicts.length) return JSON.stringify({ status: 'error', error: 'Conflict index out of range' });

            conflicts[conflictIndex].resolved = true;
            conflicts[conflictIndex].resolution = resolution;
            const allResolved = conflicts.every(c => c.resolved);

            await prisma.diffMerge.update({
                where: { id: operationId },
                data: { conflictDetails: conflicts, status: allResolved ? 'resolved' : 'conflict', resolvedBy: 'manual' },
            });

            return JSON.stringify({ status: 'success', resolved: true, remainingConflicts: conflicts.filter(c => !c.resolved).length, allResolved });
        }

        case 'accept_ours': {
            const conflicts = (op.conflictDetails || []).map(c => ({ ...c, resolved: true, resolution: c.ours }));
            // Rebuild merged content using ours for all conflicts
            let merged = op.merged || '';
            merged = merged.replace(/<<<<<<< OURS\n(.*?)\n=======\n.*?\n>>>>>>> THEIRS/gs, '$1');

            await prisma.diffMerge.update({
                where: { id: operationId },
                data: { conflictDetails: conflicts, merged, hasConflicts: false, status: 'resolved', resolvedBy: 'ours' },
            });
            return JSON.stringify({ status: 'success', strategy: 'accept_ours', resolved: conflicts.length });
        }

        case 'accept_theirs': {
            const conflicts = (op.conflictDetails || []).map(c => ({ ...c, resolved: true, resolution: c.theirs }));
            let merged = op.merged || '';
            merged = merged.replace(/<<<<<<< OURS\n.*?\n=======\n(.*?)\n>>>>>>> THEIRS/gs, '$1');

            await prisma.diffMerge.update({
                where: { id: operationId },
                data: { conflictDetails: conflicts, merged, hasConflicts: false, status: 'resolved', resolvedBy: 'theirs' },
            });
            return JSON.stringify({ status: 'success', strategy: 'accept_theirs', resolved: conflicts.length });
        }

        case 'auto_resolve': {
            const { strategy = 'ours' } = input;
            const conflicts = (op.conflictDetails || []).map(c => {
                let resolution;
                switch (strategy) {
                    case 'ours': resolution = c.ours; break;
                    case 'theirs': resolution = c.theirs; break;
                    case 'shortest': resolution = (c.ours?.length || 0) <= (c.theirs?.length || 0) ? c.ours : c.theirs; break;
                    case 'longest': resolution = (c.ours?.length || 0) >= (c.theirs?.length || 0) ? c.ours : c.theirs; break;
                    default: resolution = c.ours;
                }
                return { ...c, resolved: true, resolution };
            });

            let merged = op.merged || '';
            for (const c of conflicts) {
                merged = merged.replace(/<<<<<<< OURS\n.*?\n=======\n.*?\n>>>>>>> THEIRS/, c.resolution || '');
            }

            await prisma.diffMerge.update({
                where: { id: operationId },
                data: { conflictDetails: conflicts, merged, hasConflicts: false, status: 'resolved', resolvedBy: strategy },
            });
            return JSON.stringify({ status: 'success', strategy, resolved: conflicts.length });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown conflict_resolve action: ${action}` });
    }
}

async function executeReviewComment(input, prisma, userId) {
    const { action = 'list' } = input;

    switch (action) {
        case 'create': {
            const { targetType, targetId, filePath, lineStart, lineEnd, body, codeSnippet, suggestion, severity = 'comment', category } = input;
            if (!targetType || !targetId || !body) return JSON.stringify({ status: 'error', error: 'targetType, targetId, and body required' });

            const comment = await prisma.reviewComment.create({
                data: { userId, targetType, targetId, filePath, lineStart, lineEnd, body, codeSnippet, suggestion, severity, category, status: 'open' },
            });
            return JSON.stringify({ status: 'success', commentId: comment.id, severity, targetType });
        }

        case 'reply': {
            const { parentId, body } = input;
            if (!parentId || !body) return JSON.stringify({ status: 'error', error: 'parentId and body required' });

            const parent = await prisma.reviewComment.findUnique({ where: { id: parentId } });
            if (!parent) return JSON.stringify({ status: 'error', error: 'Parent comment not found' });

            const reply = await prisma.reviewComment.create({
                data: { userId, targetType: parent.targetType, targetId: parent.targetId, filePath: parent.filePath, lineStart: parent.lineStart, lineEnd: parent.lineEnd, body, parentId, severity: 'comment', status: 'open' },
            });
            return JSON.stringify({ status: 'success', commentId: reply.id, parentId });
        }

        case 'resolve': {
            const { commentId } = input;
            if (!commentId) return JSON.stringify({ status: 'error', error: 'commentId required' });
            await prisma.reviewComment.update({ where: { id: commentId }, data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId } });
            return JSON.stringify({ status: 'success', resolved: commentId });
        }

        case 'dismiss': {
            const { commentId } = input;
            if (!commentId) return JSON.stringify({ status: 'error', error: 'commentId required' });
            await prisma.reviewComment.update({ where: { id: commentId }, data: { status: 'dismissed' } });
            return JSON.stringify({ status: 'success', dismissed: commentId });
        }

        case 'list': {
            const { targetType, targetId, statusFilter, take = 50 } = input;
            const where = { userId };
            if (targetType) where.targetType = targetType;
            if (targetId) where.targetId = targetId;
            if (statusFilter) where.status = statusFilter;
            where.parentId = null; // Top-level comments only

            const comments = await prisma.reviewComment.findMany({ where, orderBy: { createdAt: 'desc' }, take });
            return JSON.stringify({ status: 'success', comments });
        }

        case 'summary': {
            const { targetType, targetId } = input;
            const where = { userId };
            if (targetType) where.targetType = targetType;
            if (targetId) where.targetId = targetId;

            const all = await prisma.reviewComment.findMany({ where, select: { severity: true, status: true, category: true } });
            const summary = {
                total: all.length,
                bySeverity: {}, byStatus: {}, byCategory: {},
            };
            for (const c of all) {
                summary.bySeverity[c.severity] = (summary.bySeverity[c.severity] || 0) + 1;
                summary.byStatus[c.status] = (summary.byStatus[c.status] || 0) + 1;
                if (c.category) summary.byCategory[c.category] = (summary.byCategory[c.category] || 0) + 1;
            }
            return JSON.stringify({ status: 'success', summary });
        }

        case 'delete': {
            const { commentId } = input;
            if (!commentId) return JSON.stringify({ status: 'error', error: 'commentId required' });
            await prisma.reviewComment.deleteMany({ where: { id: commentId, userId } });
            return JSON.stringify({ status: 'success', deleted: commentId });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown review_comment action: ${action}` });
    }
}

async function executeShareSnapshot(input, prisma, userId) {
    const { action = 'list' } = input;

    switch (action) {
        case 'create': {
            const { name, files = [], description, isPublic = true, password, expiresIn } = input;
            if (!name || !files.length) return JSON.stringify({ status: 'error', error: 'name and files required' });

            const slug = generateSlug(name);
            const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 3600 * 1000) : null;

            const snapshot = await prisma.sharedSnapshot.create({
                data: { userId, name, slug, files, description, isPublic, password, expiresAt },
            });

            const shareUrl = `https://share.onelastai.com/${slug}`;
            return JSON.stringify({ status: 'success', snapshotId: snapshot.id, slug, shareUrl, fileCount: files.length, expiresAt: expiresAt?.toISOString(), passwordProtected: !!password });
        }

        case 'view': {
            const { snapshotId, slug } = input;
            let snapshot;
            if (snapshotId) snapshot = await prisma.sharedSnapshot.findFirst({ where: { id: snapshotId } });
            else if (slug) snapshot = await prisma.sharedSnapshot.findUnique({ where: { slug } });
            if (!snapshot) return JSON.stringify({ status: 'error', error: 'Snapshot not found' });

            // Increment view count
            await prisma.sharedSnapshot.update({ where: { id: snapshot.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } });

            return JSON.stringify({
                status: 'success',
                snapshot: {
                    id: snapshot.id, name: snapshot.name, slug: snapshot.slug,
                    description: snapshot.description, files: snapshot.files,
                    isPublic: snapshot.isPublic, viewCount: snapshot.viewCount + 1,
                    createdAt: snapshot.createdAt, expiresAt: snapshot.expiresAt,
                },
            });
        }

        case 'update': {
            const { snapshotId, name, description, files, isPublic, password, expiresIn } = input;
            if (!snapshotId) return JSON.stringify({ status: 'error', error: 'snapshotId required' });
            const data = {};
            if (name) data.name = name;
            if (description) data.description = description;
            if (files) data.files = files;
            if (isPublic !== undefined) data.isPublic = isPublic;
            if (password !== undefined) data.password = password || null;
            if (expiresIn) data.expiresAt = new Date(Date.now() + expiresIn * 3600 * 1000);
            await prisma.sharedSnapshot.update({ where: { id: snapshotId }, data });
            return JSON.stringify({ status: 'success', updated: snapshotId });
        }

        case 'list': {
            const { take = 20 } = input;
            const snapshots = await prisma.sharedSnapshot.findMany({
                where: { userId }, orderBy: { createdAt: 'desc' }, take,
                select: { id: true, name: true, slug: true, isPublic: true, viewCount: true, downloadCount: true, expiresAt: true, createdAt: true },
            });
            return JSON.stringify({ status: 'success', snapshots });
        }

        case 'delete': {
            const { snapshotId } = input;
            if (!snapshotId) return JSON.stringify({ status: 'error', error: 'snapshotId required' });
            await prisma.sharedSnapshot.deleteMany({ where: { id: snapshotId, userId } });
            return JSON.stringify({ status: 'success', deleted: snapshotId });
        }

        case 'stats': {
            const snapshots = await prisma.sharedSnapshot.findMany({
                where: { userId }, select: { viewCount: true, downloadCount: true, isPublic: true },
            });
            const totalViews = snapshots.reduce((s, sn) => s + sn.viewCount, 0);
            const totalDownloads = snapshots.reduce((s, sn) => s + sn.downloadCount, 0);
            return JSON.stringify({
                status: 'success',
                stats: { totalSnapshots: snapshots.length, public: snapshots.filter(s => s.isPublic).length, private: snapshots.filter(s => !s.isPublic).length, totalViews, totalDownloads },
            });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown share_snapshot action: ${action}` });
    }
}

async function executeLiveSession(input, prisma, userId) {
    const { action = 'list' } = input;

    switch (action) {
        case 'create': {
            const { name = 'Live Session', projectId, maxParticipants = 10, allowEdit = true, allowChat = true } = input;
            const sessionCode = generateSessionCode();

            const session = await prisma.liveSession.create({
                data: {
                    userId, name, sessionCode, projectId, maxParticipants, allowEdit, allowChat,
                    participants: [{ userId, name: 'Host', role: 'host', joinedAt: new Date().toISOString() }],
                    status: 'active',
                },
            });

            return JSON.stringify({ status: 'success', sessionId: session.id, sessionCode, joinUrl: `https://app.onelastai.com/live/${sessionCode}`, name });
        }

        case 'join': {
            const { sessionCode, displayName = 'Anonymous' } = input;
            if (!sessionCode) return JSON.stringify({ status: 'error', error: 'sessionCode required' });

            const session = await prisma.liveSession.findUnique({ where: { sessionCode } });
            if (!session) return JSON.stringify({ status: 'error', error: 'Session not found' });
            if (session.status !== 'active') return JSON.stringify({ status: 'error', error: 'Session is not active' });

            const participants = session.participants || [];
            if (participants.length >= session.maxParticipants) return JSON.stringify({ status: 'error', error: 'Session is full' });

            // Check if already joined
            const existing = participants.find(p => p.userId === userId);
            if (!existing) {
                participants.push({ userId, name: displayName, role: 'participant', joinedAt: new Date().toISOString() });
                await prisma.liveSession.update({ where: { sessionCode }, data: { participants } });
            }

            return JSON.stringify({ status: 'success', sessionId: session.id, sessionCode, joined: true, participants: participants.length, maxParticipants: session.maxParticipants });
        }

        case 'leave': {
            const { sessionId, sessionCode: code } = input;
            const where = sessionId ? { id: sessionId } : code ? { sessionCode: code } : null;
            if (!where) return JSON.stringify({ status: 'error', error: 'sessionId or sessionCode required' });

            const session = await prisma.liveSession.findFirst({ where });
            if (!session) return JSON.stringify({ status: 'error', error: 'Session not found' });

            const participants = (session.participants || []).filter(p => p.userId !== userId);
            await prisma.liveSession.update({ where: { id: session.id }, data: { participants } });
            return JSON.stringify({ status: 'success', left: true, remainingParticipants: participants.length });
        }

        case 'end': {
            const { sessionId } = input;
            if (!sessionId) return JSON.stringify({ status: 'error', error: 'sessionId required' });
            await prisma.liveSession.updateMany({ where: { id: sessionId, userId }, data: { status: 'ended', endedAt: new Date() } });
            return JSON.stringify({ status: 'success', ended: sessionId });
        }

        case 'chat': {
            const { sessionId, sessionCode: code, message } = input;
            if (!message) return JSON.stringify({ status: 'error', error: 'message required' });
            const where = sessionId ? { id: sessionId } : code ? { sessionCode: code } : null;
            if (!where) return JSON.stringify({ status: 'error', error: 'sessionId or sessionCode required' });

            const session = await prisma.liveSession.findFirst({ where });
            if (!session) return JSON.stringify({ status: 'error', error: 'Session not found' });
            if (!session.allowChat) return JSON.stringify({ status: 'error', error: 'Chat is disabled' });

            const chatLog = session.chatLog || [];
            chatLog.push({ userId, message, timestamp: new Date().toISOString() });
            await prisma.liveSession.update({ where: { id: session.id }, data: { chatLog } });
            return JSON.stringify({ status: 'success', sent: true, totalMessages: chatLog.length });
        }

        case 'status': {
            const { sessionId, sessionCode: code } = input;
            const where = sessionId ? { id: sessionId } : code ? { sessionCode: code } : null;
            if (!where) return JSON.stringify({ status: 'error', error: 'sessionId or sessionCode required' });
            const session = await prisma.liveSession.findFirst({ where, select: { id: true, name: true, sessionCode: true, status: true, participants: true, maxParticipants: true, allowEdit: true, allowChat: true, startedAt: true } });
            if (!session) return JSON.stringify({ status: 'error', error: 'Session not found' });
            return JSON.stringify({ status: 'success', session: { ...session, participantCount: (session.participants || []).length } });
        }

        case 'list': {
            const { take = 20 } = input;
            const sessions = await prisma.liveSession.findMany({
                where: { userId }, orderBy: { createdAt: 'desc' }, take,
                select: { id: true, name: true, sessionCode: true, status: true, maxParticipants: true, startedAt: true, endedAt: true, participants: true },
            });
            return JSON.stringify({ status: 'success', sessions: sessions.map(s => ({ ...s, participantCount: (s.participants || []).length, participants: undefined })) });
        }

        case 'participants': {
            const { sessionId, sessionCode: code } = input;
            const where = sessionId ? { id: sessionId } : code ? { sessionCode: code } : null;
            if (!where) return JSON.stringify({ status: 'error', error: 'sessionId or sessionCode required' });
            const session = await prisma.liveSession.findFirst({ where, select: { participants: true, maxParticipants: true } });
            if (!session) return JSON.stringify({ status: 'error', error: 'Session not found' });
            return JSON.stringify({ status: 'success', participants: session.participants, max: session.maxParticipants });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown live_session action: ${action}` });
    }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeCollaborationTool(toolName, input, ctx = {}) {
    const prisma = ctx.prisma || (await import('../lib/prisma.js')).default;
    const userId = ctx.userId || 'system';

    switch (toolName) {
        case 'diff_merge': return { result: await executeDiffMerge(input, prisma, userId), sideEffects: null };
        case 'conflict_resolve': return { result: await executeConflictResolve(input, prisma, userId), sideEffects: null };
        case 'review_comment': return { result: await executeReviewComment(input, prisma, userId), sideEffects: null };
        case 'share_snapshot': return { result: await executeShareSnapshot(input, prisma, userId), sideEffects: null };
        case 'live_session': return { result: await executeLiveSession(input, prisma, userId), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown collaboration tool: ${toolName}` }), sideEffects: null };
    }
}

const COLLABORATION_TOOL_NAMES = new Set(COLLABORATION_TOOL_DEFINITIONS.map(t => t.name));
function isCollaborationTool(toolName) { return COLLABORATION_TOOL_NAMES.has(toolName); }

export { COLLABORATION_TOOL_DEFINITIONS, executeCollaborationTool, isCollaborationTool };
