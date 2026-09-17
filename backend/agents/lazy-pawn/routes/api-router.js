/**
 * Lazy Pawn — API Router
 * Routes for the Universal Chat frontend (sessions, studio chat, TTS, agent memory, stats)
 */

import express from 'express';
import os from 'os';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireAuth } from '../middleware/auth.js';
import { findUserBySession } from '../lib/auth-prisma.js';

// Route handlers
import chatSessionRouter from './chat-session-routes.js';
import missingEndpointsRouter from './missing-endpoints.js';
import studioStatsRouter from './studio-stats-routes.js';
import agentMemoryRouter from './agent-memory-routes.js';
import stsRouter from './sts-routes.js';
import stripeRouter from './stripe-routes.js';
import subscriptionRouter from './subscription-routes.js';
import deviceSecurityRouter from './device-security-routes.js';

const router = express.Router();

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
    message: 'Universal Chat API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ============================================
// AUTH VERIFY — Validate session cookie against main DB
// Called by the frontend on page load/refresh to restore auth
// ============================================

const authVerifyHandler = async (req, res) => {
  const sessionId = req.cookies?.sessionId || req.cookies?.session_id;
  if (!sessionId) {
    return res.json({ valid: false, success: true, user: null });
  }

  try {
    const user = await findUserBySession(sessionId);
    if (!user) {
      return res.json({ valid: false, success: true, user: null });
    }

    return res.json({
      valid: true,
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('[auth/verify] Error:', error.message);
    return res.json({ valid: false, success: false, message: 'Session verification failed' });
  }
};

router.get('/auth/verify', authVerifyHandler);
router.post('/auth/verify', authVerifyHandler);

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
      uptime: uptimeSec,
      services: {
        api: { status: 'operational' },
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

router.use('/studio', apiLimiter, requireAuth, studioStatsRouter);    // /studio/stats
router.use('/studio', apiLimiter, requireAuth, missingEndpointsRouter); // /studio/chat, /studio/chat/stream, /studio/feedback

// ============================================
// AGENT MEMORY — /api/agents/memory/*
// ============================================

router.use('/agents', apiLimiter, requireAuth, agentMemoryRouter);

// ============================================
// TTS — /api/tts/*
// ============================================

router.use('/tts', apiLimiter, requireAuth, stsRouter);

// ============================================
// REALTIME VOICE — /api/realtime/* (same handler, frontend uses this path)
// ============================================

router.use('/realtime', apiLimiter, requireAuth, stsRouter);

// ============================================
// DOCUMENT EXTRACTION — /api/extract-document
// Extracts text from PDF, DOCX, DOC files via multer upload
// ============================================

import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are supported'));
  },
});

router.post('/extract-document', apiLimiter, requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Send a PDF or DOCX file.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const ext = originalname.split('.').pop()?.toLowerCase() || '';
    let content = '';
    let pageCount;

    if (mimetype === 'application/pdf' || ext === 'pdf') {
      const data = await pdfParse(buffer);
      content = data.text || '';
      pageCount = data.numpages;
    } else if (ext === 'docx' || mimetype.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value || '';
    } else if (ext === 'doc') {
      // .doc (legacy) — try mammoth, falls back gracefully
      try {
        const result = await mammoth.extractRawText({ buffer });
        content = result.value || '';
      } catch {
        content = '[Legacy .doc format — conversion failed. Please save as .docx and retry.]';
      }
    }

    res.json({
      success: true,
      content: content.slice(0, 500_000), // cap at 500K chars
      fileName: originalname,
      fileType: ext,
      pageCount,
    });
  } catch (error) {
    console.error('[extract-document] Error:', error.message);
    res.status(500).json({ success: false, error: `Failed to extract document text: ${error.message}` });
  }
});

// ============================================
// STRIPE — /api/stripe/* (checkout, webhook)
// ============================================

router.use('/stripe', stripeRouter);

// ============================================
// SUBSCRIPTIONS — /api/subscriptions/* (check, cancel, user list)
// ============================================

router.use('/subscriptions', subscriptionRouter);

// Also mount at /agent/subscriptions for backward compat with main backend
router.use('/agent/subscriptions', subscriptionRouter);

// ============================================
// DEVICE SECURITY — /api/security/*
// Anti-theft / lost device tracking (fully opt-in)
// ============================================

router.use('/security', deviceSecurityRouter);

// ============================================
// SUPPORT — Bug reports with image uploads
// ============================================

import nodemailer from 'nodemailer';

const bugReportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10 MB max per file, 5 files max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.post('/support/bug-report', bugReportUpload.any(), async (req, res) => {
  try {
    const { description, userEmail, userId, userAgent, url, timestamp } = req.body;
    const images = req.files || [];

    if (!description || description.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Please provide a more detailed description (at least 10 characters)' });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    });

    // Prepare email content
    const emailHtml = `
      <h2>🐛 Bug Report from Universal Chat</h2>
      <hr/>
      <p><strong>Submitted:</strong> ${timestamp || new Date().toISOString()}</p>
      <p><strong>User Email:</strong> ${userEmail || 'Anonymous'}</p>
      <p><strong>User ID:</strong> ${userId || 'N/A'}</p>
      <p><strong>URL:</strong> ${url || 'N/A'}</p>
      <p><strong>User Agent:</strong> ${userAgent || 'N/A'}</p>
      <hr/>
      <h3>Description:</h3>
      <p style="background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${description}</p>
      <hr/>
      <p><em>Images attached: ${images.length}</em></p>
    `;

    // Prepare attachments
    const attachments = images.map((file, index) => ({
      filename: file.originalname || `screenshot_${index + 1}.png`,
      content: file.buffer,
      contentType: file.mimetype,
    }));

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Maula AI Support" <support@sanbayfusion.com>',
      to: process.env.BUG_REPORT_EMAIL || 'bugs@sanbayfusion.com',
      subject: `[Bug Report] ${description.slice(0, 50)}...`,
      html: emailHtml,
      attachments,
    });

    console.log(`[bug-report] Submitted by ${userEmail || 'anonymous'}: ${description.slice(0, 100)}...`);

    res.json({ success: true, message: 'Bug report submitted successfully' });
  } catch (error) {
    console.error('[bug-report] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to submit bug report. Please try again.' });
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
