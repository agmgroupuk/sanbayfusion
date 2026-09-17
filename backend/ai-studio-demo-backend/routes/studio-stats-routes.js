/**
 * STUDIO SESSION STATISTICS ROUTES
 * Stores and retrieves session stats for the Studio chat interface
 * Stats are permanently stored in the database - never deleted
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// ============================================
// POST /stats - Save/update session stats
// ============================================
router.post('/stats', async (req, res) => {
    try {
        const {
            sessionId,
            totalMessages = 0,
            totalRequests = 0,
            totalErrors = 0,
            totalTokensUsed = 0,
            sessionStartTime,
            requestLog = [],
        } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }

        // Upsert - create if new, update if exists
        const stats = await prisma.studioSessionStats.upsert({
            where: { sessionId },
            create: {
                sessionId,
                totalMessages,
                totalRequests,
                totalErrors,
                totalTokensUsed,
                sessionStartTime: sessionStartTime ? new Date(sessionStartTime) : new Date(),
                requestLog: JSON.stringify(requestLog),
            },
            update: {
                totalMessages,
                totalRequests,
                totalErrors,
                totalTokensUsed,
                requestLog: JSON.stringify(requestLog),
            },
        });

        return res.json({ success: true, stats });
    } catch (error) {
        console.error('[studio/stats] Save error:', error);
        return res.status(500).json({ error: 'Failed to save session stats' });
    }
});

// ============================================
// GET /stats/:sessionId - Get stats for a session
// ============================================
router.get('/stats/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const stats = await prisma.studioSessionStats.findUnique({
            where: { sessionId },
        });

        if (!stats) {
            // Return empty stats for new sessions (avoids 404 console noise)
            return res.json({ success: true, stats: null });
        }

        return res.json({ success: true, stats });
    } catch (error) {
        console.error('[studio/stats] Get error:', error);
        return res.status(500).json({ error: 'Failed to get session stats' });
    }
});

// ============================================
// GET /stats - Get all session stats (paginated)
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [stats, total] = await Promise.all([
            prisma.studioSessionStats.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.studioSessionStats.count(),
        ]);

        return res.json({
            success: true,
            stats,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[studio/stats] List error:', error);
        return res.status(500).json({ error: 'Failed to list session stats' });
    }
});

export default router;
