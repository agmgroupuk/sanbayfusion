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

// ── Upload limits ──────────────────────────────────────────────────
const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50 MB per file
const MAX_FILES_PER_UPLOAD = 20;         // max files in one batch

// Allowed MIME types — comprehensive list
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'font/', 'text/'];
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Code / data
  'application/json',
  'application/javascript',
  'application/xml',
  'application/x-yaml',
  'application/x-sh',
  'application/typescript',
  'application/wasm',
  // Archives
  'application/zip',
  'application/gzip',
  'application/x-tar',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  // Fonts
  'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
  'application/font-woff', 'application/font-woff2',
  'application/x-font-ttf', 'application/x-font-otf',
  // Misc
  'application/octet-stream', // fallback for unknown binary
]);

function isAllowedMime(mime) {
  if (!mime) return false;
  if (ALLOWED_MIME_TYPES.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p));
}

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES_PER_UPLOAD },
  fileFilter: (req, file, cb) => {
    if (isAllowedMime(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: images, videos, audio, fonts, documents, code files, archives.`));
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
      // Project may not be persisted yet — return empty
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
router.post('/upload', requireAuth, (req, res, next) => {
  // Wrap multer to catch file-size / file-type errors cleanly
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.` });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }

    // Verify ownership — auto-create project if it doesn't exist yet
    let project = await prisma.canvasProject.findFirst({
      where: { id: projectId, userId: req.userId },
      select: { id: true },
    });
    if (!project) {
      project = await prisma.canvasProject.create({
        data: { id: projectId, userId: req.userId, name: 'Untitled', code: '' },
      });
    }

    const asset = await assetOptimizer.processAndUpload({
      projectId,
      userId: req.userId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    res.status(201).json({ success: true, asset });
  } catch (error) {
    console.error('[AssetRoutes] Upload error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Upload limits info (frontend can query this) ───────────────────
router.get('/limits', (req, res) => {
  res.json({
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
    maxFilesPerUpload: MAX_FILES_PER_UPLOAD,
    allowedTypes: [
      'Images (JPEG, PNG, GIF, WebP, SVG, AVIF, ICO, BMP, TIFF)',
      'Videos (MP4, WebM, MOV, AVI)',
      'Audio (MP3, WAV, OGG, AAC, FLAC)',
      'Documents (PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, MD)',
      'Code (JS, TS, JSON, HTML, CSS, XML, YAML, SH, WASM)',
      'Fonts (WOFF, WOFF2, TTF, OTF)',
      'Archives (ZIP, GZIP, TAR, 7Z, RAR)',
    ],
  });
});

// ── List project assets ────────────────────────────────────────────
router.get('/:projectId', requireAuth, async (req, res) => {
  try {
    const project = await prisma.canvasProject.findFirst({
      where: { id: req.params.projectId, userId: req.userId },
      select: { id: true },
    });
    if (!project) {
      // Project may not be persisted yet — return empty
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
