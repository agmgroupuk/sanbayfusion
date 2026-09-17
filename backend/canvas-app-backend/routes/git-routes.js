/**
 * GIT ROUTES — Persistent version control for canvas projects
 * Commits, branches, stash, tags — all persisted to PostgreSQL
 */
import express from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────

const genHash = () => crypto.randomBytes(20).toString('hex');

const parseJSON = (str, fallback = {}) => {
    try { return JSON.parse(str); } catch { return fallback; }
};

function computeStats(oldSnap = {}, newSnap = {}) {
    let additions = 0, deletions = 0;
    const allPaths = new Set([...Object.keys(oldSnap), ...Object.keys(newSnap)]);
    for (const path of allPaths) {
        const oldLen = oldSnap[path] ? oldSnap[path].split('\n').length : 0;
        const newLen = newSnap[path] ? newSnap[path].split('\n').length : 0;
        additions += Math.max(0, newLen - oldLen);
        deletions += Math.max(0, oldLen - newLen);
    }
    return { additions, deletions };
}

function stripCommit(c) {
    return {
        id: c.id, branch: c.branch, hash: c.hash,
        message: c.message, author: c.author,
        files: parseJSON(c.files, []),
        stats: parseJSON(c.stats, {}),
        isMerge: c.isMerge || false,
        createdAt: c.createdAt,
    };
}

// ═══════════════════════════════════════════════════════════════════
// INIT — Initialize or load git state for a project
// ═══════════════════════════════════════════════════════════════════

router.post('/:projectId/init', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { snapshot = {}, author = 'You' } = req.body;

        // Ensure a CanvasProject record exists for this ID.
        // saveToBackend() saves to canvas_apps, but git FKs point to canvas_projects.
        // Auto-promote: if projectId exists in canvas_apps but not canvas_projects, create one.
        const existingProject = await prisma.canvasProject.findUnique({ where: { id: projectId } });
        if (!existingProject) {
            const app = await prisma.canvasApp.findUnique({ where: { id: projectId } });
            if (!app) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }
            await prisma.canvasProject.create({
                data: {
                    id: projectId,
                    userId: app.userId,
                    name: app.name || 'Untitled Project',
                    code: app.code,
                    source: app.source || 'standalone',
                },
            });
        }

        // Already initialized?
        const existingBranch = await prisma.gitBranch.findFirst({
            where: { projectId, isActive: true },
        });

        if (existingBranch) {
            const commits = await prisma.gitCommit.findMany({
                where: { projectId, branch: existingBranch.name },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
            const branches = await prisma.gitBranch.findMany({
                where: { projectId },
                orderBy: { createdAt: 'asc' },
            });
            const stashes = await prisma.gitStash.findMany({
                where: { projectId },
                orderBy: { createdAt: 'desc' },
                select: { id: true, message: true, branch: true, createdAt: true },
            });
            const tags = await prisma.gitTag.findMany({ where: { projectId } });

            const headCommit = commits[0];
            const lastSnapshot = headCommit ? parseJSON(headCommit.snapshot, {}) : {};

            return res.json({
                success: true,
                data: {
                    branch: existingBranch.name,
                    commits: commits.map(stripCommit),
                    branches: branches.map(b => ({
                        id: b.id, name: b.name, isActive: b.isActive,
                        headCommitId: b.headCommitId, createdAt: b.createdAt,
                    })),
                    stashes,
                    tags: tags.map(t => ({
                        id: t.id, name: t.name, commitId: t.commitId,
                        message: t.message, createdAt: t.createdAt,
                    })),
                    lastSnapshot,
                    alreadyInitialized: true,
                },
            });
        }

        // Create initial commit
        const hash = genHash();
        const fileList = Object.keys(snapshot);
        const lineCount = fileList.reduce(
            (sum, f) => sum + (snapshot[f] || '').split('\n').length, 0
        );
        const stats = { additions: lineCount, deletions: 0 };

        const commit = await prisma.gitCommit.create({
            data: {
                projectId, branch: 'main', hash,
                message: 'Initial commit', author,
                snapshot: JSON.stringify(snapshot),
                files: JSON.stringify(fileList),
                stats: JSON.stringify(stats),
            },
        });

        await prisma.gitBranch.create({
            data: { projectId, name: 'main', headCommitId: commit.id, isActive: true },
        });

        res.json({
            success: true,
            data: {
                branch: 'main',
                commits: [stripCommit(commit)],
                branches: [{ id: commit.id, name: 'main', isActive: true, headCommitId: commit.id, createdAt: commit.createdAt }],
                stashes: [],
                tags: [],
                lastSnapshot: snapshot,
                alreadyInitialized: false,
            },
        });
    } catch (err) {
        console.error('[git] init error:', err);
        res.status(500).json({ success: false, message: 'Failed to initialize git' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// COMMIT
// ═══════════════════════════════════════════════════════════════════

router.post('/:projectId/commit', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { message, snapshot, changedFiles, branch = 'main', author = 'You' } = req.body;

        if (!message?.trim()) return res.status(400).json({ success: false, message: 'Commit message required' });
        if (!snapshot) return res.status(400).json({ success: false, message: 'Snapshot required' });

        const prevCommit = await prisma.gitCommit.findFirst({
            where: { projectId, branch },
            orderBy: { createdAt: 'desc' },
        });
        const prevSnapshot = prevCommit ? parseJSON(prevCommit.snapshot, {}) : {};
        const stats = computeStats(prevSnapshot, snapshot);

        const commit = await prisma.gitCommit.create({
            data: {
                projectId, branch, hash: genHash(),
                message: message.trim(), author,
                snapshot: JSON.stringify(snapshot),
                files: JSON.stringify(changedFiles || []),
                stats: JSON.stringify(stats),
            },
        });

        await prisma.gitBranch.updateMany({
            where: { projectId, name: branch },
            data: { headCommitId: commit.id },
        });

        res.json({ success: true, data: stripCommit(commit) });
    } catch (err) {
        console.error('[git] commit error:', err);
        res.status(500).json({ success: false, message: 'Failed to commit' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════

router.get('/:projectId/history', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { branch, search, limit = '50', offset = '0' } = req.query;

        const where = { projectId };
        if (branch) where.branch = branch;
        if (search) where.message = { contains: search, mode: 'insensitive' };

        const [commits, total] = await Promise.all([
            prisma.gitCommit.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset),
            }),
            prisma.gitCommit.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                commits: commits.map(stripCommit),
                total,
                hasMore: parseInt(offset) + commits.length < total,
            },
        });
    } catch (err) {
        console.error('[git] history error:', err);
        res.status(500).json({ success: false, message: 'Failed to get history' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// RESTORE
// ═══════════════════════════════════════════════════════════════════

router.post('/:projectId/restore', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { commitId } = req.body;

        const commit = await prisma.gitCommit.findFirst({
            where: { id: commitId, projectId },
        });
        if (!commit) return res.status(404).json({ success: false, message: 'Commit not found' });

        const snapshot = parseJSON(commit.snapshot, {});
        res.json({ success: true, data: { snapshot, commit: stripCommit(commit) } });
    } catch (err) {
        console.error('[git] restore error:', err);
        res.status(500).json({ success: false, message: 'Failed to restore' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// AMEND
// ═══════════════════════════════════════════════════════════════════

router.post('/:projectId/amend', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { message, snapshot, changedFiles, branch = 'main' } = req.body;

        const lastCommit = await prisma.gitCommit.findFirst({
            where: { projectId, branch },
            orderBy: { createdAt: 'desc' },
        });
        if (!lastCommit) return res.status(404).json({ success: false, message: 'No commits to amend' });

        const updateData = {};
        if (message?.trim()) updateData.message = message.trim();
        if (snapshot) {
            updateData.snapshot = JSON.stringify(snapshot);
            const prevCommit = await prisma.gitCommit.findFirst({
                where: { projectId, branch, createdAt: { lt: lastCommit.createdAt } },
                orderBy: { createdAt: 'desc' },
            });
            const prevSnapshot = prevCommit ? parseJSON(prevCommit.snapshot, {}) : {};
            updateData.stats = JSON.stringify(computeStats(prevSnapshot, snapshot));
        }
        if (changedFiles) updateData.files = JSON.stringify(changedFiles);

        const updated = await prisma.gitCommit.update({
            where: { id: lastCommit.id },
            data: updateData,
        });

        res.json({ success: true, data: stripCommit(updated) });
    } catch (err) {
        console.error('[git] amend error:', err);
        res.status(500).json({ success: false, message: 'Failed to amend commit' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// BRANCHES
// ═══════════════════════════════════════════════════════════════════

router.get('/:projectId/branches', async (req, res) => {
    try {
        const branches = await prisma.gitBranch.findMany({
            where: { projectId: req.params.projectId },
            orderBy: { createdAt: 'asc' },
        });
        res.json({ success: true, data: branches });
    } catch (err) {
        console.error('[git] branches error:', err);
        res.status(500).json({ success: false, message: 'Failed to list branches' });
    }
});

router.post('/:projectId/branches', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ success: false, message: 'Branch name required' });

        // Fork from current branch's head
        const activeBranch = await prisma.gitBranch.findFirst({
            where: { projectId, isActive: true },
        });
        const headCommit = activeBranch
            ? await prisma.gitCommit.findFirst({
                where: { projectId, branch: activeBranch.name },
                orderBy: { createdAt: 'desc' },
            })
            : null;

        // Create branch-origin commit
        const commit = await prisma.gitCommit.create({
            data: {
                projectId, branch: name.trim(), hash: genHash(),
                message: `Branch created from ${activeBranch?.name || 'main'}`,
                author: 'System',
                snapshot: headCommit?.snapshot || '{}',
                files: '[]',
                stats: '{"additions":0,"deletions":0}',
            },
        });

        // Deactivate all, activate new
        await prisma.gitBranch.updateMany({
            where: { projectId, isActive: true },
            data: { isActive: false },
        });
        const branch = await prisma.gitBranch.create({
            data: { projectId, name: name.trim(), headCommitId: commit.id, isActive: true },
        });

        res.json({ success: true, data: branch });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ success: false, message: 'Branch already exists' });
        }
        console.error('[git] create branch error:', err);
        res.status(500).json({ success: false, message: 'Failed to create branch' });
    }
});

router.post('/:projectId/branches/switch', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name } = req.body;

        const branch = await prisma.gitBranch.findUnique({
            where: { projectId_name: { projectId, name } },
        });
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

        await prisma.gitBranch.updateMany({
            where: { projectId, isActive: true },
            data: { isActive: false },
        });
        await prisma.gitBranch.update({
            where: { id: branch.id },
            data: { isActive: true },
        });

        const headCommit = await prisma.gitCommit.findFirst({
            where: { projectId, branch: name },
            orderBy: { createdAt: 'desc' },
        });
        const snapshot = headCommit ? parseJSON(headCommit.snapshot, {}) : {};

        const commits = await prisma.gitCommit.findMany({
            where: { projectId, branch: name },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        res.json({
            success: true,
            data: { snapshot, commits: commits.map(stripCommit), branch: name },
        });
    } catch (err) {
        console.error('[git] switch branch error:', err);
        res.status(500).json({ success: false, message: 'Failed to switch branch' });
    }
});

router.delete('/:projectId/branches/:name', async (req, res) => {
    try {
        const { projectId, name } = req.params;

        const branch = await prisma.gitBranch.findUnique({
            where: { projectId_name: { projectId, name } },
        });
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
        if (branch.isActive) return res.status(400).json({ success: false, message: 'Cannot delete active branch' });

        await prisma.gitCommit.deleteMany({ where: { projectId, branch: name } });
        await prisma.gitBranch.delete({ where: { id: branch.id } });

        res.json({ success: true });
    } catch (err) {
        console.error('[git] delete branch error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete branch' });
    }
});

router.post('/:projectId/merge', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { sourceBranch, author = 'You' } = req.body;

        const activeBranch = await prisma.gitBranch.findFirst({
            where: { projectId, isActive: true },
        });
        if (!activeBranch) return res.status(400).json({ success: false, message: 'No active branch' });
        if (sourceBranch === activeBranch.name) {
            return res.status(400).json({ success: false, message: 'Cannot merge branch into itself' });
        }

        const sourceHead = await prisma.gitCommit.findFirst({
            where: { projectId, branch: sourceBranch },
            orderBy: { createdAt: 'desc' },
        });
        if (!sourceHead) return res.status(404).json({ success: false, message: 'Source branch has no commits' });

        const currentHead = await prisma.gitCommit.findFirst({
            where: { projectId, branch: activeBranch.name },
            orderBy: { createdAt: 'desc' },
        });

        const sourceSnapshot = parseJSON(sourceHead.snapshot, {});
        const currentSnapshot = currentHead ? parseJSON(currentHead.snapshot, {}) : {};
        const mergedSnapshot = { ...currentSnapshot, ...sourceSnapshot };
        const stats = computeStats(currentSnapshot, mergedSnapshot);

        const mergeCommit = await prisma.gitCommit.create({
            data: {
                projectId, branch: activeBranch.name, hash: genHash(),
                message: `Merge '${sourceBranch}' into '${activeBranch.name}'`,
                author,
                snapshot: JSON.stringify(mergedSnapshot),
                files: JSON.stringify(Object.keys(sourceSnapshot)),
                stats: JSON.stringify(stats),
                isMerge: true,
            },
        });

        await prisma.gitBranch.update({
            where: { id: activeBranch.id },
            data: { headCommitId: mergeCommit.id },
        });

        res.json({
            success: true,
            data: { commit: stripCommit(mergeCommit), snapshot: mergedSnapshot },
        });
    } catch (err) {
        console.error('[git] merge error:', err);
        res.status(500).json({ success: false, message: 'Failed to merge' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// STASH
// ═══════════════════════════════════════════════════════════════════

router.post('/:projectId/stash', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { snapshot, message, branch = 'main' } = req.body;
        if (!snapshot) return res.status(400).json({ success: false, message: 'Snapshot required' });

        const stash = await prisma.gitStash.create({
            data: {
                projectId,
                message: message || `WIP on ${branch}`,
                snapshot: JSON.stringify(snapshot),
                branch,
            },
        });

        res.json({
            success: true,
            data: { id: stash.id, message: stash.message, branch: stash.branch, createdAt: stash.createdAt },
        });
    } catch (err) {
        console.error('[git] stash error:', err);
        res.status(500).json({ success: false, message: 'Failed to stash' });
    }
});

router.get('/:projectId/stashes', async (req, res) => {
    try {
        const stashes = await prisma.gitStash.findMany({
            where: { projectId: req.params.projectId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, message: true, branch: true, createdAt: true },
        });
        res.json({ success: true, data: stashes });
    } catch (err) {
        console.error('[git] stashes error:', err);
        res.status(500).json({ success: false, message: 'Failed to list stashes' });
    }
});

router.post('/:projectId/stash/pop', async (req, res) => {
    try {
        const { projectId } = req.params;
        const stash = await prisma.gitStash.findFirst({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
        });
        if (!stash) return res.status(404).json({ success: false, message: 'No stashes to pop' });

        const snapshot = parseJSON(stash.snapshot, {});
        await prisma.gitStash.delete({ where: { id: stash.id } });

        res.json({ success: true, data: { snapshot, stash: { id: stash.id, message: stash.message } } });
    } catch (err) {
        console.error('[git] stash pop error:', err);
        res.status(500).json({ success: false, message: 'Failed to pop stash' });
    }
});

router.delete('/:projectId/stash/:stashId', async (req, res) => {
    try {
        await prisma.gitStash.delete({ where: { id: req.params.stashId } });
        res.json({ success: true });
    } catch (err) {
        console.error('[git] stash drop error:', err);
        res.status(500).json({ success: false, message: 'Failed to drop stash' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// TAGS
// ═══════════════════════════════════════════════════════════════════

router.post('/:projectId/tags', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, commitId, message } = req.body;
        if (!name?.trim() || !commitId) {
            return res.status(400).json({ success: false, message: 'Tag name and commitId required' });
        }

        const tag = await prisma.gitTag.create({
            data: { projectId, name: name.trim(), commitId, message: message || null },
        });
        res.json({ success: true, data: tag });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ success: false, message: 'Tag already exists' });
        }
        console.error('[git] tag error:', err);
        res.status(500).json({ success: false, message: 'Failed to create tag' });
    }
});

router.get('/:projectId/tags', async (req, res) => {
    try {
        const tags = await prisma.gitTag.findMany({
            where: { projectId: req.params.projectId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: tags });
    } catch (err) {
        console.error('[git] tags error:', err);
        res.status(500).json({ success: false, message: 'Failed to list tags' });
    }
});

router.delete('/:projectId/tags/:name', async (req, res) => {
    try {
        const { projectId, name } = req.params;
        await prisma.gitTag.delete({
            where: { projectId_name: { projectId, name } },
        });
        res.json({ success: true });
    } catch (err) {
        console.error('[git] tag delete error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete tag' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// DIFF — compare commit with its parent
// ═══════════════════════════════════════════════════════════════════

router.get('/:projectId/diff/:commitId', async (req, res) => {
    try {
        const { projectId, commitId } = req.params;

        const commit = await prisma.gitCommit.findFirst({
            where: { id: commitId, projectId },
        });
        if (!commit) return res.status(404).json({ success: false, message: 'Commit not found' });

        const parent = await prisma.gitCommit.findFirst({
            where: { projectId, branch: commit.branch, createdAt: { lt: commit.createdAt } },
            orderBy: { createdAt: 'desc' },
        });

        const currentSnap = parseJSON(commit.snapshot, {});
        const parentSnap = parent ? parseJSON(parent.snapshot, {}) : {};

        res.json({
            success: true,
            data: { current: currentSnap, parent: parentSnap, commit: stripCommit(commit) },
        });
    } catch (err) {
        console.error('[git] diff error:', err);
        res.status(500).json({ success: false, message: 'Failed to get diff' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// GITHUB PUSH — Push project files to a private GitHub repo
// ═══════════════════════════════════════════════════════════════════

// Validate GitHub token format (ghp_xxx or github_pat_xxx)
function isValidGithubToken(token) {
    return typeof token === 'string' && /^(ghp_|github_pat_)[A-Za-z0-9_]{20,}$/.test(token);
}

// Validate "owner/repo" format — no path traversal, no special chars
function isValidRepo(repo) {
    return typeof repo === 'string' && /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(repo);
}

async function githubRequest(path, method, body, token) {
    const res = await fetch(`https://api.github.com${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Maula-Canvas/1.0',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `GitHub API error ${res.status}`);
    return json;
}

/**
 * POST /api/canvas/git/:projectId/push
 * Push all project files to GitHub using the tree API (atomic push).
 * Body: { token, repo, branch, message }
 *   token  — GitHub PAT (ghp_ or github_pat_)
 *   repo   — "owner/repo" (private repos work with PAT)
 *   branch — target branch name (default: "main")
 *   message — commit message
 */
router.post('/:projectId/push', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { token, repo, branch = 'main', message } = req.body;

        // Validate inputs
        if (!isValidGithubToken(token)) {
            return res.status(400).json({ success: false, message: 'Invalid GitHub token format. Must start with ghp_ or github_pat_' });
        }
        if (!isValidRepo(repo)) {
            return res.status(400).json({ success: false, message: 'Invalid repo format. Use "owner/repo"' });
        }
        if (!message || typeof message !== 'string' || message.length > 500) {
            return res.status(400).json({ success: false, message: 'Commit message required (max 500 chars)' });
        }

        // Load latest commit snapshot for files
        const latestCommit = await prisma.gitCommit.findFirst({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
        });

        // Fall back to canvas app code if no commit snapshot
        let files = {};
        if (latestCommit?.snapshot) {
            files = parseJSON(latestCommit.snapshot, {});
        } else {
            const app = await prisma.canvasApp.findUnique({ where: { id: projectId }, select: { code: true, language: true } });
            if (app?.code) {
                const ext = app.language === 'react' ? 'jsx' : (app.language || 'html');
                files[`/index.${ext}`] = app.code;
            }
        }

        if (Object.keys(files).length === 0) {
            return res.status(400).json({ success: false, message: 'No files to push. Commit your changes first.' });
        }

        // ── GitHub Tree API push (works for private repos with PAT) ──

        // 1. Get HEAD of target branch (to find base tree SHA)
        let baseSha = null;
        let baseTreeSha = null;
        try {
            const branchData = await githubRequest(`/repos/${repo}/branches/${branch}`, 'GET', null, token);
            baseSha = branchData.commit.sha;
            baseTreeSha = branchData.commit.commit.tree.sha;
        } catch {
            // Branch doesn't exist yet — will create it from default branch or root
        }

        // 2. Create blobs for each file
        const treeEntries = [];
        for (const [path, content] of Object.entries(files)) {
            if (typeof content !== 'string') continue;
            const normalized = path.startsWith('/') ? path.slice(1) : path;
            const blob = await githubRequest(`/repos/${repo}/git/blobs`, 'POST', {
                content: Buffer.from(content).toString('base64'),
                encoding: 'base64',
            }, token);
            treeEntries.push({ path: normalized, mode: '100644', type: 'blob', sha: blob.sha });
        }

        // 3. Create tree
        const tree = await githubRequest(`/repos/${repo}/git/trees`, 'POST', {
            tree: treeEntries,
            ...(baseTreeSha ? { base_tree: baseTreeSha } : {}),
        }, token);

        // 4. Create commit
        const commit = await githubRequest(`/repos/${repo}/git/commits`, 'POST', {
            message,
            tree: tree.sha,
            ...(baseSha ? { parents: [baseSha] } : { parents: [] }),
        }, token);

        // 5. Update (or create) branch ref
        if (baseSha) {
            await githubRequest(`/repos/${repo}/git/refs/heads/${branch}`, 'PATCH', {
                sha: commit.sha,
                force: false,
            }, token);
        } else {
            await githubRequest(`/repos/${repo}/git/refs`, 'POST', {
                ref: `refs/heads/${branch}`,
                sha: commit.sha,
            }, token);
        }

        const commitUrl = `https://github.com/${repo}/commit/${commit.sha}`;
        console.log(`[git] Pushed to GitHub: ${repo}@${branch} — ${commit.sha.slice(0, 7)}`);

        res.json({
            success: true,
            data: {
                sha: commit.sha,
                shortSha: commit.sha.slice(0, 7),
                repo,
                branch,
                commitUrl,
                fileCount: treeEntries.length,
            },
        });
    } catch (err) {
        console.error('[git] GitHub push error:', err.message);
        res.status(500).json({ success: false, message: err.message || 'GitHub push failed' });
    }
});

/**
 * GET /api/canvas/git/:projectId/remote
 * Get saved remote config for this project (token masked).
 */
router.get('/:projectId/remote', async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await prisma.canvasProject.findUnique({
            where: { id: projectId },
            select: { metadata: true },
        });
        if (!project) {
            // Try canvas_apps
            const app = await prisma.canvasApp.findUnique({ where: { id: projectId }, select: { id: true } });
            if (!app) return res.status(404).json({ success: false, message: 'Project not found' });
        }
        const meta = parseJSON(project?.metadata, {});
        const remote = meta.githubRemote || null;
        res.json({
            success: true,
            data: remote ? {
                repo: remote.repo,
                branch: remote.branch || 'main',
                tokenHint: remote.tokenHint || '****',
            } : null,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to get remote' });
    }
});

/**
 * POST /api/canvas/git/:projectId/remote
 * Save remote config for this project (stores token hint only — full token never persisted here).
 * The token is entered each session by the user.
 * Body: { repo, branch, tokenHint }
 */
router.post('/:projectId/remote', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { repo, branch = 'main', tokenHint } = req.body;

        if (!isValidRepo(repo)) {
            return res.status(400).json({ success: false, message: 'Invalid repo format' });
        }

        // Ensure project exists in canvas_projects (git FK requirement)
        let project = await prisma.canvasProject.findUnique({ where: { id: projectId } });
        if (!project) {
            const app = await prisma.canvasApp.findUnique({ where: { id: projectId } });
            if (!app) return res.status(404).json({ success: false, message: 'Project not found' });
            project = await prisma.canvasProject.create({
                data: { id: projectId, userId: app.userId, name: app.name || 'Untitled', code: app.code, source: app.source || 'standalone' },
            });
        }

        const meta = parseJSON(project.metadata, {});
        meta.githubRemote = { repo, branch, tokenHint: tokenHint || '****' };
        await prisma.canvasProject.update({ where: { id: projectId }, data: { metadata: JSON.stringify(meta) } });

        res.json({ success: true, data: { repo, branch } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to save remote' });
    }
});

export default router;
