/**
 * AI STUDIO DEMO — STANDALONE API ROUTER
 * Routes for the AI Studio Demo frontend (sessions, studio chat, TTS, agent memory, stats)
 */

import express from 'express';
import os from 'os';
import multer from 'multer';
import { rateLimit } from '../middleware/rate-limit.js';

// Route handlers
import chatSessionRouter from './chat-session-routes.js';
import missingEndpointsRouter from './missing-endpoints.js';
import studioStatsRouter from './studio-stats-routes.js';
import agentMemoryRouter from './agent-memory-routes.js';

const router = express.Router();

// File upload (in-memory, 20MB max)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

const apiLimiter = rateLimit(500, 15 * 60 * 1000);

// ============================================
// HEALTH CHECK
// ============================================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Studio Demo API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ============================================
// PLATFORM STATUS (used by NavigationDrawer)
// ============================================

const startTime = Date.now();

router.get('/status', (req, res) => {
  const uptimeSec = (Date.now() - startTime) / 1000;
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  res.json({
    success: true,
    data: {
      platform: { status: 'operational', uptime: uptimeSec },
      api: { responseTime: 50, errorRate: 0, requestsToday: 0 },
      metrics: { avgResponseMs: 50, errorRate: 0, totalRequests: 0 },
      uptime: uptimeSec,
      services: {
        api: { status: 'operational', responseTimeMs: 50 },
        database: { status: 'operational' },
      },
      system: {
        cpuCount: cpus.length,
        memoryUsed: ((totalMem - freeMem) / totalMem * 100).toFixed(1),
        nodeVersion: process.version,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// SESSION ROUTES — /api/sessions/*
// ============================================

router.use('/sessions', apiLimiter, chatSessionRouter);

// ============================================
// STUDIO ROUTES — /api/studio/* (chat, feedback, stats)
// ============================================

router.use('/studio', apiLimiter, studioStatsRouter);    // /studio/stats
router.use('/studio', apiLimiter, missingEndpointsRouter); // /studio/chat, /studio/chat/stream, /studio/feedback

// ============================================
// AGENT MEMORY — /api/agents/memory/*
// ============================================

router.use('/agents', apiLimiter, agentMemoryRouter);

// ============================================
// DOCUMENT EXTRACTION — /api/extract-document
// ============================================

router.post('/extract-document', apiLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fileName = req.file.originalname;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const buffer = req.file.buffer;

    let content = '';
    let pageCount = undefined;

    if (ext === 'pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      content = data.text;
      pageCount = data.numpages;
    } else if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else if (['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'html'].includes(ext)) {
      content = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ success: false, error: `Unsupported file type: ${ext}` });
    }

    res.json({ success: true, content, fileName, fileType: ext, pageCount });
  } catch (error) {
    console.error('Document extraction error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to extract document text' });
  }
});

// ============================================
// 404 HANDLER
// ============================================

router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// ============================================
// ERROR HANDLER
// ============================================

// eslint-disable-next-line no-unused-vars
router.use((error, req, res, _next) => {
  console.error('API Error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Validation error' });
  }
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }
  if (error.name?.startsWith('PrismaClient')) {
    return res.status(500).json({ success: false, message: 'Database error' });
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
});

export default router;
