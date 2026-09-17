/**
 * CANVAS APP — STANDALONE API ROUTER
 * Only canvas-related routes (stripped from main backend api-router)
 *
 * SECURITY: All endpoints require authentication + active subscription
 * except health, auth, and billing routes.
 */

import express from 'express';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireAuth, requireActivePlan } from '../middleware/auth.js';

// Auth route handlers
import authRouter from './auth-routes.js';

// Canvas route handlers
import canvasRouter from './canvas-routes.js';
import canvasProjectRouter from './canvas-project-routes.js';
import canvasAppsRouter from './canvas-apps-routes.js';
import canvasFilesRouter from './canvas-files-routes.js';
import canvasDeployRouter from './canvas-deploy-routes.js';
import canvasDeployExternalRouter from './canvas-deploy-external-routes.js';

// Infrastructure route handlers
import sandboxRouter from './sandbox-routes.js';
import buildRouter from './build-routes.js';
import assetRouter from './asset-routes.js';

// Canvas Studio billing (checkout, plan check, verify)
import canvasBillingRouter from './canvas-billing-routes.js';

// Per-project feature routes
import databaseRouter from './database-routes.js';
import monitoringRouter from './monitoring-routes.js';
import gitRouter from './git-routes.js';
import videoRouter from './video-routes.js';

// Studio data routes (sessions, memories, favorites, feedback, analytics, preferences)
import studioDataRouter from './studio-data-routes.js';

// Per-user history (replaces localStorage for video / voice / image-to-code panels)
import userHistoryRouter from './user-history-routes.js';

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
    message: 'Canvas App API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// ============================================
// AUTH
// ============================================

router.use('/auth', authRouter);

// ============================================
// BILLING ROUTES (auth checked internally — checkout/plan/verify)
// These mount BEFORE the global auth gate so unauthenticated users
// can check plan status and initiate checkout.
// ============================================

router.use('/canvas', apiLimiter, canvasBillingRouter);

// ============================================
// READ-ONLY DATA — canvas/apps handles auth internally
// (returns empty list for guests, so must be BEFORE the global auth gate)
// ============================================

router.use('/canvas/apps', apiLimiter, canvasAppsRouter);

// ============================================
// GLOBAL AUTH GATE — everything below requires valid session
// ============================================

router.use(requireAuth);

// STUDIO DATA (sessions, memories, favorites, feedback, analytics, preferences)
// Auth required, but NO plan check — data access for all users
router.use('/studio-data', apiLimiter, studioDataRouter);

// USER HISTORY (video / voice / image-to-code) — replaces localStorage
// Auth required, NO plan check — feature is gated by plan, but history is user data
router.use('/user-history', apiLimiter, userHistoryRouter);

router.use('/canvas-projects', apiLimiter, canvasProjectRouter);

// ============================================
// GLOBAL PLAN GATE — everything below also requires active plan
// ============================================

router.use(requireActivePlan);

// ============================================
// CANVAS SUB-ROUTES (mount BEFORE /canvas catch-all)
// ============================================

router.use('/canvas/files', apiLimiter, canvasFilesRouter);
router.use('/canvas/deploy-external', apiLimiter, canvasDeployExternalRouter);
router.use('/canvas/deploy', apiLimiter, canvasDeployRouter);

// ============================================
// CANVAS GENERATION (catch-all /canvas)
// ============================================

router.use('/canvas', apiLimiter, canvasRouter);

// ============================================
// INFRASTRUCTURE
// ============================================

router.use('/sandbox', apiLimiter, sandboxRouter);
router.use('/builds', apiLimiter, buildRouter);
router.use('/assets', apiLimiter, assetRouter);

// ============================================
// PER-PROJECT FEATURES (database, monitoring)
// ============================================

router.use('/database', apiLimiter, databaseRouter);
router.use('/monitoring', apiLimiter, monitoringRouter);
router.use('/git', apiLimiter, gitRouter);
router.use('/video', apiLimiter, videoRouter);

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
