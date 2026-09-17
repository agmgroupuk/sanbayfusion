/**
 * BUILD API ROUTES
 * POST   /api/builds                 — Start a build
 * GET    /api/builds/:projectId       — List builds for project
 * GET    /api/builds/:projectId/:id   — Get build details
 * GET    /api/builds/:id/logs         — Stream build logs (SSE)
 * POST   /api/builds/:id/cancel       — Cancel a build
 * DELETE /api/builds/cache/:projectId — Clear build cache
 */

import express from 'express';
import buildOrchestrator from '../services/build/build-orchestrator.js';
import { BuildDetector } from '../services/build/build-detector.js';
import buildCache from '../services/build/build-cache.js';
import buildLogger from '../services/build/build-logger.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();
const detector = new BuildDetector();

// ── Auth middleware ────────────────────────────────────────────────
const requireAuth = async (req, res, next) => {
  const userId = req.session?.userId || req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  req.userId = userId;
  next();
};

// ── Start a build ──────────────────────────────────────────────────
// Accepts { projectId } (loads files from DB) or { projectId, files } (inline).
// If projectId doesn't exist as a saved project, auto-creates one.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { projectId, files } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }

    // Try to find existing project
    let project = await prisma.canvasProject.findFirst({
      where: { id: projectId, userId: req.userId },
    });

    // If no saved project but inline files provided, auto-create a project record
    // so the Build FK constraint is satisfied
    if (!project && files) {
      project = await prisma.canvasProject.create({
        data: {
          id: projectId,
          userId: req.userId,
          name: 'Build Project',
          source: 'standalone',
        },
      });
    }

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found — save your project first or pass files inline' });
    }

    const build = await buildOrchestrator.startBuild({
      projectId,
      userId: req.userId,
      files: files || null,
      triggeredBy: 'manual',
    });

    res.status(201).json({ success: true, build });
  } catch (error) {
    console.error('[BuildRoutes] Start error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── List builds for a project ──────────────────────────────────────
router.get('/:projectId', requireAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const project = await prisma.canvasProject.findFirst({
      where: { id: req.params.projectId, userId: req.userId },
      select: { id: true },
    });
    if (!project) {
      // Project may not be persisted yet — return empty builds
      return res.json({ success: true, builds: [], total: 0 });
    }

    const [builds, total] = await Promise.all([
      prisma.build.findMany({
        where: { projectId: req.params.projectId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.build.count({ where: { projectId: req.params.projectId } }),
    ]);

    res.json({ success: true, builds, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Get build details ──────────────────────────────────────────────
router.get('/detail/:id', requireAuth, async (req, res) => {
  try {
    const build = await prisma.build.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { name: true } } },
    });
    if (!build || build.userId !== req.userId) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }

    // Parse stages from JSON string
    let stages = [];
    try { stages = JSON.parse(build.stages || '[]'); } catch { }

    res.json({ success: true, build: { ...build, stages } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Stream build logs (SSE) ────────────────────────────────────────
router.get('/:id/logs', requireAuth, async (req, res) => {
  try {
    const build = await prisma.build.findUnique({
      where: { id: req.params.id },
    });
    if (!build || build.userId !== req.userId) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }

    // SSE streaming
    buildLogger.subscribe(req.params.id, res);

    // If build is already done, send existing logs and close
    if (['success', 'failed', 'cancelled'].includes(build.status)) {
      setTimeout(() => {
        res.write(`data: ${JSON.stringify({ type: 'complete', status: build.status, duration: build.duration })}\n\n`);
        res.end();
      }, 500);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Cancel a build ─────────────────────────────────────────────────
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const build = await prisma.build.findUnique({
      where: { id: req.params.id },
    });
    if (!build || build.userId !== req.userId) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }

    await buildOrchestrator.cancelBuild(req.params.id);
    res.json({ success: true, message: 'Build cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Detect project framework ───────────────────────────────────────
router.post('/detect', requireAuth, async (req, res) => {
  try {
    const { files, packageJson } = req.body;
    if (!files) {
      return res.status(400).json({ success: false, message: 'files list is required' });
    }

    const result = detector.detect(files, packageJson || {});
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Clear build cache ──────────────────────────────────────────────
router.delete('/cache/:projectId', requireAuth, async (req, res) => {
  try {
    const project = await prisma.canvasProject.findFirst({
      where: { id: req.params.projectId, userId: req.userId },
      select: { id: true },
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await buildCache.invalidate(req.params.projectId);
    res.json({ success: true, message: 'Build cache cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Cache stats ────────────────────────────────────────────────────
router.get('/cache/stats', requireAuth, async (req, res) => {
  try {
    const stats = await buildCache.getStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
