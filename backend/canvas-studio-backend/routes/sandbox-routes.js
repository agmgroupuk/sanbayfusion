/**
 * SANDBOX API ROUTES
 * POST   /api/sandbox          — Create sandbox
 * GET    /api/sandbox           — List user sandboxes
 * GET    /api/sandbox/:id       — Get sandbox details
 * DELETE /api/sandbox/:id       — Destroy sandbox
 * POST   /api/sandbox/:id/exec  — Execute command in sandbox
 * POST   /api/sandbox/:id/files — Sync files to sandbox
 */

import express from 'express';
import sandboxManager from '../services/sandbox/sandbox-manager.js';
import { SandboxTemplates } from '../../../packages/sandbox/sandbox-templates.js';
import sandboxNetwork from '../services/sandbox/sandbox-network.js';
import sandboxStorage from '../services/sandbox/sandbox-storage.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();
const templates = new SandboxTemplates();

// ── Auth middleware (cookie-based session fallback) ────────────
const requireAuth = async (req, res, next) => {
  let userId = req.session?.userId || req.user?.id;

  // Cookie-based session fallback
  if (!userId && req.cookies?.sessionId) {
    try {
      const { default: db } = await import('../lib/db.js');
      const user = await db.User.findBySessionId(req.cookies.sessionId);
      if (user) {
        userId = user.id;
        req.user = user;
      }
    } catch (e) {
      // Silently fail — no auth
    }
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  req.userId = userId;
  next();
};



// ── List available templates ───────────────────────────────────────
router.get('/templates', (req, res) => {
  const { category } = req.query;
  const list = category
    ? templates.listByCategory(category)
    : templates.listTemplates();
  res.json({ success: true, templates: list });
});

// ── Create sandbox ─────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { projectId, template } = req.body;
    if (!projectId || !template) {
      return res.status(400).json({ success: false, message: 'projectId and template are required' });
    }

    // Verify project ownership
    const project = await prisma.canvasProject.findFirst({
      where: { id: projectId, userId: req.userId },
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get user plan
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { plan: true },
    });

    const sandbox = await sandboxManager.create({
      projectId,
      userId: req.userId,
      template,
      plan: user?.plan || 'weekly',
    });

    res.status(201).json({ success: true, sandbox });
  } catch (error) {
    console.error('[SandboxRoutes] Create error:', error.message);
    res.status(error.message.includes('limit') ? 403 : 500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── List user sandboxes ────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const sandboxes = await sandboxManager.listForUser(req.userId);
    res.json({ success: true, sandboxes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Sandbox status/stats ───────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await sandboxManager.getStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Get sandbox details ────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const sandbox = await prisma.sandbox.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!sandbox) {
      return res.status(404).json({ success: false, message: 'Sandbox not found' });
    }
    res.json({ success: true, sandbox });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Execute command in sandbox ─────────────────────────────────────
router.post('/:id/exec', requireAuth, async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, message: 'command is required' });
    }

    const sandbox = await prisma.sandbox.findFirst({
      where: { id: req.params.id, userId: req.userId, status: 'running' },
    });
    if (!sandbox) {
      return res.status(404).json({ success: false, message: 'Running sandbox not found' });
    }

    const output = await sandboxManager.exec(sandbox.id, command);
    res.json({ success: true, output });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Sync files to sandbox ──────────────────────────────────────────
router.post('/:id/files', requireAuth, async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ success: false, message: 'files array is required' });
    }

    const sandbox = await prisma.sandbox.findFirst({
      where: { id: req.params.id, userId: req.userId, status: 'running' },
    });
    if (!sandbox) {
      return res.status(404).json({ success: false, message: 'Running sandbox not found' });
    }

    await sandboxManager.syncFiles(sandbox.id, files);
    res.json({ success: true, message: 'Files synced' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Destroy sandbox ────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const sandbox = await prisma.sandbox.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!sandbox) {
      return res.status(404).json({ success: false, message: 'Sandbox not found' });
    }

    await sandboxManager.destroy(sandbox.id);
    res.json({ success: true, message: 'Sandbox destroyed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Network stats ──────────────────────────────────────────────────
router.get('/:id/network', requireAuth, async (req, res) => {
  try {
    const stats = await sandboxNetwork.getStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Storage info ───────────────────────────────────────────────────
router.get('/:id/storage', requireAuth, async (req, res) => {
  try {
    const sandbox = await prisma.sandbox.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!sandbox) {
      return res.status(404).json({ success: false, message: 'Sandbox not found' });
    }

    const size = await sandboxStorage.getVolumeSize(sandbox.id);
    res.json({ success: true, sandboxId: sandbox.id, storageUsed: size });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// ── Sandbox logs ───────────────────────────────────────────────
router.get('/:id/logs', requireAuth, async (req, res) => {
  try {
    const sandbox = await prisma.sandbox.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!sandbox) {
      return res.status(404).json({ success: false, message: 'Sandbox not found' });
    }

    const tail = parseInt(req.query.tail) || 100;
    const logs = await sandboxManager.getLogs(sandbox.id, { tail });
    res.json({ success: true, ...logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Sandbox stop ───────────────────────────────────────────────
router.post('/:id/stop', requireAuth, async (req, res) => {
  try {
    const sandbox = await prisma.sandbox.findFirst({
      where: { id: req.params.id, userId: req.userId, status: 'running' },
    });
    if (!sandbox) {
      return res.status(404).json({ success: false, message: 'Running sandbox not found' });
    }

    await sandboxManager.stop(sandbox.id);
    res.json({ success: true, message: 'Sandbox stopped' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
