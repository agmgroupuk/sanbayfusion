/**
 * API ROUTER — catch-all handler for /api/* routes
 * Must be mounted LAST because it contains a 404 catch-all
 */

import express from 'express';

const router = express.Router();

// Health check at /api/health
router.get('/health', (req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Version endpoint
router.get('/version', (req, res) => {
    res.json({ success: true, version: process.env.APP_VERSION || '2.0.0' });
});

// 404 catch-all — must be last
router.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
});

export default router;
