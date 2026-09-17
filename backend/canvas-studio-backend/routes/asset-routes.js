/**
 * ASSET API ROUTES
 * POST   /api/assets/upload       — Upload & optimize an asset
 * GET    /api/assets/:projectId    — List project assets
 * GET    /api/assets/detail/:id    — Get asset details
 * DELETE /api/assets/:id           — Delete an asset
 * POST   /api/assets/upload-url    — Get pre-signed upload URL
 */

import express from 'express';
import multer from 'multer';
import assetOptimizer from '../services/assets/asset-optimizer.js';
import assetCdn from '../services/assets/asset-cdn.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// ── History helper ─────────────────────────────────────────────────
async function recordAssetHistory(projectId, entry) {
  try {
    const project = await prisma.canvasProject.findUnique({
      where: { id: projectId },
      select: { metadata: true },
    });
    let meta = {};
    try { meta = project?.metadata ? JSON.parse(project.metadata) : {}; } catch {}
    if (!meta.assetHistory) meta.assetHistory = [];
    meta.assetHistory.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      ...entry,
    });
    if (meta.assetHistory.length > 200) meta.assetHistory = meta.assetHistory.slice(-200);
    await prisma.canvasProject.update({
      where: { id: projectId },
      data: { metadata: JSON.stringify(meta) },
    });
  } catch {}
}

// Multer config — 10MB max, memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
      'application/pdf', 'text/css', 'text/javascript', 'application/javascript',
      'application/json', 'font/woff', 'font/woff2', 'video/mp4', 'audio/mpeg',
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ── Auth middleware ────────────────────────────────────────────────
const requireAuth = async (req, res, next) => {
  const userId = req.session?.userId || req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  req.userId = userId;
  next();
};

// ── List project assets (query-param form used by frontend) ────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const projectId = req.query.projectId;
    if (!projectId) {
      return res.json([]);
    }

    const project = await prisma.canvasProject.findFirst({
      where: { id: projectId, userId: req.userId },
      select: { id: true },
    });
    if (!project) {
      return res.json([]);
    }

    const { type, limit = 50, offset = 0 } = req.query;
    const result = await assetOptimizer.listAssets(projectId, {
      type,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Frontend expects a plain array
    res.json(result.assets || result || []);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Upload & optimize an asset ─────────────────────────────────────
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }

    // Verify ownership
    const project = await prisma.canvasProject.findFirst({
      where: { id: projectId, userId: req.userId },
      select: { id: true },
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const asset = await assetOptimizer.processAndUpload({
      projectId,
      userId: req.userId,
      file: {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });

    res.status(201).json({ success: true, asset });

    // Record history
    recordAssetHistory(projectId, {
      action: 'upload',
      assetName: req.file.originalname,
      assetType: asset.type || 'file',
      size: req.file.size,
      cdnUrl: asset.cdnUrl,
    });
  } catch (error) {
    console.error('[AssetRoutes] Upload error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Get asset activity history for a project ──────────────────────
router.get('/:projectId/history', requireAuth, async (req, res) => {
  try {
    const project = await prisma.canvasProject.findFirst({
      where: { id: req.params.projectId, userId: req.userId },
      select: { id: true, metadata: true },
    });
    if (!project) {
      return res.json({ success: true, history: [] });
    }

    let meta = {};
    try { meta = project.metadata ? JSON.parse(project.metadata) : {}; } catch {}
    const history = (meta.assetHistory || []).reverse();

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Clear asset history ────────────────────────────────────────────
router.delete('/:projectId/history', requireAuth, async (req, res) => {
  try {
    const project = await prisma.canvasProject.findFirst({
      where: { id: req.params.projectId, userId: req.userId },
      select: { id: true, metadata: true },
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    let meta = {};
    try { meta = project.metadata ? JSON.parse(project.metadata) : {}; } catch {}
    meta.assetHistory = [];

    await prisma.canvasProject.update({
      where: { id: project.id },
      data: { metadata: JSON.stringify(meta) },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── List project assets ────────────────────────────────────────────
router.get('/:projectId', requireAuth, async (req, res) => {
  try {
    const project = await prisma.canvasProject.findFirst({
      where: { id: req.params.projectId, userId: req.userId },
      select: { id: true },
    });
    if (!project) {
      return res.json({ success: true, assets: [], total: 0 });
    }

    const { type, limit = 50, offset = 0 } = req.query;
    const assets = await assetOptimizer.listAssets(req.params.projectId, {
      type,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ success: true, ...assets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Get asset details ──────────────────────────────────────────────
router.get('/detail/:id', requireAuth, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { userId: true } } },
    });
    if (!asset || asset.project.userId !== req.userId) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Delete an asset ────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { userId: true } } },
    });
    if (!asset || asset.project.userId !== req.userId) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    await assetOptimizer.deleteAsset(req.params.id);
    res.json({ success: true, message: 'Asset deleted' });

    // Record history
    recordAssetHistory(asset.projectId, {
      action: 'delete',
      assetName: asset.originalName,
      assetType: asset.type || 'file',
      size: asset.originalSize,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Get pre-signed upload URL ──────────────────────────────────────
router.post('/upload-url', requireAuth, async (req, res) => {
  try {
    const { projectId, filename, contentType } = req.body;
    if (!projectId || !filename || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'projectId, filename, and contentType are required',
      });
    }

    const project = await prisma.canvasProject.findFirst({
      where: { id: projectId, userId: req.userId },
      select: { id: true },
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const { uploadUrl, key, cdnUrl } = await assetCdn.getUploadUrl(projectId, filename, contentType);
    res.json({ success: true, uploadUrl, key, cdnUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
