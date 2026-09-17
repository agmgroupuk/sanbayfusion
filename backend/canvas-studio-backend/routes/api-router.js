/**
 * CANVAS APP — STANDALONE API ROUTER
 * Only canvas-related routes (stripped from main backend api-router)
 *
 * SECURITY: All endpoints require authentication + active subscription
 * except health, auth, billing, and user settings.
 */

import express from 'express';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireAuth, requireActivePlan } from '../middleware/auth.js';

// Auth route handlers
import authRouter from './auth-routes.js';
import userSettingsRouter from './user-settings-routes.js';

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

// Studio data (sessions, memories, favorites, feedback, analytics, preferences)
import studioDataRouter from './studio-data-routes.js';

// Studio hub (media, builds, deployments, databases, monitoring, tools)
import studioHubRouter from './studio-hub-routes.js';

// Per-project feature routes
import agentOpsRouter from './agent-ops-routes.js';
import databaseRouter from './database-routes.js';
import monitoringRouter from './monitoring-routes.js';
import videoRouter from './video-routes.js';
import gitRouter from './git-routes.js';
import aiToolsRouter from './ai-tools-routes.js';

const router = express.Router();

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

const apiLimiter = rateLimit(500, 15 * 60 * 1000);

// ============================================
// HEALTH CHECK (no auth needed)
// ============================================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Canvas App API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ============================================
// AUTH ROUTES (no auth needed — these handle login/verify/logout)
// ============================================

router.use('/auth', authRouter);

// ============================================
// BILLING ROUTES (auth checked internally — checkout/plan/verify)
// These mount BEFORE the global auth gate so unauthenticated users
// can check plan status and initiate checkout.
// ============================================

router.use('/canvas', apiLimiter, canvasBillingRouter);

// ============================================
// GLOBAL AUTH GATE — everything below requires valid session
// ============================================

router.use(requireAuth);

// ============================================
// USER SETTINGS (auth required, but NO plan check — so users
// can load UI settings even without a subscription)
// ============================================

router.use('/user/settings', apiLimiter, userSettingsRouter);

// ============================================
// STUDIO DATA (sessions, memories, favorites, feedback, analytics, preferences)
// Auth required, but NO plan check — data access for all users
// ============================================

router.use('/studio-data', apiLimiter, studioDataRouter);

// ============================================
// DASHBOARD DATA (auth required, but NO plan check — so users
// can view their apps/projects and see the paywall)
// ============================================

router.use('/canvas/apps', apiLimiter, canvasAppsRouter);
router.use('/canvas-projects', apiLimiter, canvasProjectRouter);

// ============================================
// GLOBAL PLAN GATE — everything below also requires active plan
// ============================================

router.use(requireActivePlan);

// ============================================
// CANVAS SUB-ROUTES (mount BEFORE /canvas catch-all)
// ============================================

router.use('/studio-hub', apiLimiter, studioHubRouter);

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
// PER-PROJECT FEATURES (agent ops, database, monitoring)
// ============================================

router.use('/agent-ops', apiLimiter, agentOpsRouter);
router.use('/database', apiLimiter, databaseRouter);
router.use('/monitoring', apiLimiter, monitoringRouter);
router.use('/video', apiLimiter, videoRouter);
router.use('/git', apiLimiter, gitRouter);
router.use('/ai-tools', apiLimiter, aiToolsRouter);

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
