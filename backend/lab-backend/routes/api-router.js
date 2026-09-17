/**
 * API ROUTER — Lab Backend
 * Mounts all route modules
 */

import express from 'express';
import labRoutes from './lab-routes.js';
import analyticsRoutes from './analytics-routes.js';

const router = express.Router();

// Mount routes
router.use('/lab', labRoutes);
router.use('/analytics', analyticsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'lab-backend', timestamp: new Date().toISOString() });
});

export default router;
