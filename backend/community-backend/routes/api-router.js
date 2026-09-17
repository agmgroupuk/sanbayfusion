/**
 * API ROUTER — Community Backend
 * Mounts all route modules
 */

import express from 'express';
import communityRoutes from './community-routes.js';
import suggestionsRoutes from './suggestions-routes.js';
import { healthCheck } from '../lib/prisma.js';

const router = express.Router();

// Mount routes
router.use('/community', communityRoutes);
router.use('/suggestions', suggestionsRoutes);

// Health check
router.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();
  res.json({ status: 'ok', service: 'community-backend', database: dbHealth, timestamp: new Date().toISOString() });
});

export default router;
