/**
 * GIT ROUTES — Version control API for canvas projects
 * Stores commits + snapshots in project metadata JSON field.
 * Bidirectional: app edits → git tracks changes; git checkout → restores app files.
 */

import express from 'express';
import { param, body, validationResult } from 'express-validator';
import crypto from 'crypto';
import db from '../lib/db.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// ── Helpers ────────────────────────────────────────────────────────

function shortHash() {
  return crypto.randomBytes(10).toString('hex').slice(0, 12);
}

function getGitState(project) {
  try {
    const meta = project.metadata ? JSON.parse(project.metadata) : {};
    return meta.git || { currentBranch: 'main', branches: { main: null }, commits: {} };
  } catch {
    return { currentBranch: 'main', branches: { main: null }, commits: {} };
  }
}

async function saveGitState(projectId, git) {
  const project = await db.canvasProject.findUnique({ where: { id: projectId }, select: { metadata: true } });
  const meta = project?.metadata ? JSON.parse(project.metadata) : {};
  meta.git = git;
  await db.canvasProject.update({ where: { id: projectId }, data: { metadata: JSON.stringify(meta) } });
}

async function getProjectFiles(projectId) {
  const rows = await db.projectFile.findMany({ where: { projectId }, select: { path: true, content: true } });
  const map = {};
  for (const r of rows) map[r.path] = r.content;
  return map;
}

// ── GET /api/git/:projectId/status ────────────────────────────────
// Returns current branch, changed files (compared to last commit)

router.get('/:projectId/status', [
  param('projectId').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const git = getGitState(project);
    const headId = git.branches[git.currentBranch];
    const headSnap = headId ? (git.commits[headId]?.snapshot || {}) : {};
    const currentFiles = await getProjectFiles(project.id);

    // Compute changed files
    const changes = [];
    const allPaths = new Set([...Object.keys(headSnap), ...Object.keys(currentFiles)]);
    for (const p of allPaths) {
      const inHead = p in headSnap;
      const inCurrent = p in currentFiles;
      if (inHead && inCurrent) {
        if (headSnap[p] !== currentFiles[p]) changes.push({ path: p, status: 'modified' });
      } else if (!inHead && inCurrent) {
        changes.push({ path: p, status: 'added' });
      } else if (inHead && !inCurrent) {
        changes.push({ path: p, status: 'deleted' });
      }
    }

    res.json({
      success: true,
      branch: git.currentBranch,
      branches: Object.keys(git.branches),
      headCommitId: headId,
      changes,
      totalFiles: Object.keys(currentFiles).length,
    });
  } catch (e) {
    console.error('[git/status]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/git/:projectId/commit ───────────────────────────────
// Creates a commit snapshot from current project files

router.post('/:projectId/commit', [
  param('projectId').isString().notEmpty(),
  body('message').isString().trim().notEmpty(),
  body('stagedPaths').isArray(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const { message, stagedPaths } = req.body;
    const git = getGitState(project);
    const headId = git.branches[git.currentBranch];
    const headSnap = headId ? (git.commits[headId]?.snapshot || {}) : {};
    const currentFiles = await getProjectFiles(project.id);

    // Build new snapshot: start from head, apply only staged changes
    const snapshot = { ...headSnap };
    const stagedSet = new Set(stagedPaths);
    for (const p of stagedSet) {
      if (p in currentFiles) {
        snapshot[p] = currentFiles[p];
      } else {
        delete snapshot[p]; // file was deleted
      }
    }

    const commitId = shortHash();
    const commit = {
      id: commitId,
      hash: commitId,
      message,
      author: req.session.userId,
      date: new Date().toISOString(),
      branch: git.currentBranch,
      parent: headId || null,
      snapshot,
    };

    git.commits[commitId] = commit;
    git.branches[git.currentBranch] = commitId;

    // Prune: keep only last 50 commits per branch to prevent metadata from growing unboundedly
    const branchCommits = Object.values(git.commits)
      .filter(c => c.branch === git.currentBranch)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (branchCommits.length > 50) {
      for (const old of branchCommits.slice(50)) delete git.commits[old.id];
    }

    await saveGitState(project.id, git);

    // Look up author email for response
    const user = await db.user.findUnique({ where: { id: req.session.userId }, select: { email: true, name: true } });

    res.json({
      success: true,
      commit: {
        id: commitId,
        hash: commitId,
        message,
        author: user?.name || user?.email || req.session.userId,
        date: commit.date,
        branch: git.currentBranch,
        filesChanged: stagedPaths.length,
      },
    });
  } catch (e) {
    console.error('[git/commit]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET /api/git/:projectId/log ───────────────────────────────────
// Returns commit history for current branch

router.get('/:projectId/log', [
  param('projectId').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const git = getGitState(project);
    const branch = req.query.branch || git.currentBranch;

    // Walk the chain from HEAD
    const commits = [];
    let cur = git.branches[branch];
    const visited = new Set();
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const c = git.commits[cur];
      if (!c) break;
      const user = await db.user.findUnique({ where: { id: c.author }, select: { email: true, name: true } });
      commits.push({
        id: c.id,
        hash: c.hash,
        message: c.message,
        author: user?.name || user?.email || c.author,
        date: c.date,
        branch: c.branch,
        filesChanged: c.snapshot ? Object.keys(c.snapshot).length : 0,
      });
      cur = c.parent;
    }

    res.json({ success: true, branch, commits });
  } catch (e) {
    console.error('[git/log]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/git/:projectId/checkout ─────────────────────────────
// Restore project files from a specific commit

router.post('/:projectId/checkout', [
  param('projectId').isString().notEmpty(),
  body('commitId').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const git = getGitState(project);
    const commit = git.commits[req.body.commitId];
    if (!commit) return res.status(404).json({ success: false, message: 'Commit not found' });

    const snapshot = commit.snapshot || {};

    // Replace all project files with the snapshot
    await db.projectFile.deleteMany({ where: { projectId: project.id } });
    const creates = Object.entries(snapshot).map(([path, content]) => ({
      projectId: project.id,
      path,
      content,
      language: path.split('.').pop() || 'text',
      size: content.length,
    }));
    if (creates.length > 0) {
      await db.projectFile.createMany({ data: creates });
    }

    // Update head pointer to this commit
    git.branches[git.currentBranch] = commit.id;
    await saveGitState(project.id, git);

    res.json({
      success: true,
      commitId: commit.id,
      message: commit.message,
      files: snapshot, // send full file contents so frontend can update editor
      fileCount: Object.keys(snapshot).length,
    });
  } catch (e) {
    console.error('[git/checkout]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET /api/git/:projectId/diff/:commitId ────────────────────────
// Returns per-file diff between a commit and current files

router.get('/:projectId/diff/:commitId', [
  param('projectId').isString().notEmpty(),
  param('commitId').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const git = getGitState(project);
    const commit = git.commits[req.params.commitId];
    if (!commit) return res.status(404).json({ success: false, message: 'Commit not found' });

    const snapshot = commit.snapshot || {};
    const currentFiles = await getProjectFiles(project.id);

    const diffs = [];
    const allPaths = new Set([...Object.keys(snapshot), ...Object.keys(currentFiles)]);
    for (const p of allPaths) {
      const old = snapshot[p] ?? null;
      const cur = currentFiles[p] ?? null;
      if (old === cur) continue;
      diffs.push({
        path: p,
        status: !old ? 'added' : !cur ? 'deleted' : 'modified',
        oldContent: old,
        newContent: cur,
        additions: cur ? cur.split('\n').length : 0,
        deletions: old ? old.split('\n').length : 0,
      });
    }

    res.json({ success: true, diffs });
  } catch (e) {
    console.error('[git/diff]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/git/:projectId/discard ──────────────────────────────
// Discard changes to specific file(s), restoring from last commit

router.post('/:projectId/discard', [
  param('projectId').isString().notEmpty(),
  body('paths').isArray({ min: 1 }),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const git = getGitState(project);
    const headId = git.branches[git.currentBranch];
    const headSnap = headId ? (git.commits[headId]?.snapshot || {}) : {};
    const restoredFiles = {};

    for (const p of req.body.paths) {
      if (p in headSnap) {
        // Restore from last commit
        await db.projectFile.upsert({
          where: { projectId_path: { projectId: project.id, path: p } },
          create: { projectId: project.id, path: p, content: headSnap[p], language: p.split('.').pop() || 'text', size: headSnap[p].length },
          update: { content: headSnap[p], size: headSnap[p].length },
        });
        restoredFiles[p] = headSnap[p];
      } else {
        // File didn't exist in last commit — delete it
        await db.projectFile.deleteMany({ where: { projectId: project.id, path: p } });
        restoredFiles[p] = null;
      }
    }

    res.json({ success: true, restoredFiles });
  } catch (e) {
    console.error('[git/discard]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/git/:projectId/branch ───────────────────────────────
// Create a new branch from current HEAD

router.post('/:projectId/branch', [
  param('projectId').isString().notEmpty(),
  body('name').isString().trim().notEmpty().matches(/^[a-zA-Z0-9._/-]+$/),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const git = getGitState(project);
    const name = req.body.name;
    if (git.branches[name]) return res.status(409).json({ success: false, message: 'Branch already exists' });

    // New branch points to same commit as current branch
    git.branches[name] = git.branches[git.currentBranch];
    git.currentBranch = name;
    await saveGitState(project.id, git);

    res.json({ success: true, branch: name, branches: Object.keys(git.branches) });
  } catch (e) {
    console.error('[git/branch]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/git/:projectId/branch/switch ────────────────────────
// Switch to an existing branch (restores files from that branch's HEAD)

router.post('/:projectId/branch/switch', [
  param('projectId').isString().notEmpty(),
  body('name').isString().trim().notEmpty(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const git = getGitState(project);
    if (!git.branches[req.body.name]) return res.status(404).json({ success: false, message: 'Branch not found' });

    git.currentBranch = req.body.name;
    const headId = git.branches[git.currentBranch];
    const snapshot = headId ? (git.commits[headId]?.snapshot || {}) : {};

    // Restore files from branch HEAD
    await db.projectFile.deleteMany({ where: { projectId: project.id } });
    const creates = Object.entries(snapshot).map(([path, content]) => ({
      projectId: project.id,
      path,
      content,
      language: path.split('.').pop() || 'text',
      size: content.length,
    }));
    if (creates.length > 0) {
      await db.projectFile.createMany({ data: creates });
    }

    await saveGitState(project.id, git);

    res.json({
      success: true,
      branch: git.currentBranch,
      files: snapshot,
      fileCount: Object.keys(snapshot).length,
    });
  } catch (e) {
    console.error('[git/branch/switch]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── DELETE /api/git/:projectId/branch/:name ───────────────────────
// Delete a branch (cannot delete current branch)

router.delete('/:projectId/branch/:name', [
  param('projectId').isString().notEmpty(),
  param('name').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const git = getGitState(project);
    const name = req.params.name;
    if (name === git.currentBranch) return res.status(400).json({ success: false, message: 'Cannot delete current branch' });
    if (!git.branches[name]) return res.status(404).json({ success: false, message: 'Branch not found' });

    delete git.branches[name];
    await saveGitState(project.id, git);

    res.json({ success: true, branches: Object.keys(git.branches) });
  } catch (e) {
    console.error('[git/branch/delete]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/git/:projectId/init ─────────────────────────────────
// Initialize git for a project (first commit with all current files)

router.post('/:projectId/init', [
  param('projectId').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const git = getGitState(project);
    if (Object.keys(git.commits).length > 0) return res.json({ success: true, message: 'Already initialized', branch: git.currentBranch });

    const currentFiles = await getProjectFiles(project.id);
    const commitId = shortHash();
    git.commits[commitId] = {
      id: commitId,
      hash: commitId,
      message: 'Initial commit',
      author: req.session.userId,
      date: new Date().toISOString(),
      branch: 'main',
      parent: null,
      snapshot: currentFiles,
    };
    git.branches.main = commitId;
    git.currentBranch = 'main';
    await saveGitState(project.id, git);

    const user = await db.user.findUnique({ where: { id: req.session.userId }, select: { email: true, name: true } });
    res.json({
      success: true,
      commit: {
        id: commitId,
        hash: commitId,
        message: 'Initial commit',
        author: user?.name || user?.email || req.session.userId,
        date: git.commits[commitId].date,
        branch: 'main',
        filesChanged: Object.keys(currentFiles).length,
      },
    });
  } catch (e) {
    console.error('[git/init]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/git/:projectId/sync ─────────────────────────────────
// Sync current editor files to DB (called before git operations when files are only in editorBridge)

router.post('/:projectId/sync', [
  param('projectId').isString().notEmpty(),
  body('files').isObject(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ success: false, message: 'Project not found' });

    const files = req.body.files; // { path: content }
    const paths = Object.keys(files);

    // Upsert all files
    for (const [path, content] of Object.entries(files)) {
      await db.projectFile.upsert({
        where: { projectId_path: { projectId: project.id, path } },
        create: { projectId: project.id, path, content, language: path.split('.').pop() || 'text', size: content.length },
        update: { content, size: content.length },
      });
    }

    // Remove files not in editor
    await db.projectFile.deleteMany({
      where: { projectId: project.id, path: { notIn: paths } },
    });

    res.json({ success: true, synced: paths.length });
  } catch (e) {
    console.error('[git/sync]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
