/**
 * API ROUTER — Live Support Backend
 * Mounts all route modules
 */

import express from 'express';
import supportRoutes from './support-routes.js';
import liveChatRoutes from './live-chat-routes.js';
import { healthCheck } from '../lib/prisma.js';

const router = express.Router();

// Mount routes
router.use('/support', supportRoutes);
router.use('/live-support', liveChatRoutes);

// Also handle /api/contact → delegate to support routes
router.post('/contact', (req, res, next) => {
  req.url = '/support/contact';
  next('route');
});

// Health check
router.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();
  res.json({ status: 'ok', service: 'live-support-backend', database: dbHealth, timestamp: new Date().toISOString() });
});

export default router;
