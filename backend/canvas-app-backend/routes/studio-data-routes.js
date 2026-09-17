/**
 * STUDIO DATA ROUTES — Canvas App
 * Endpoints for: Chat Sessions, Agent Memory, Favorites, Feedback, Analytics, Preferences
 * All query the main maulaai database via authPrisma.
 */

import express from 'express';
import crypto from 'crypto';
import { authPrisma } from '../lib/db.js';

const router = express.Router();

function getUserId(req) {
    return req.user?.id || req.userId || null;
}

// ╔══════════════════════════════════════════════════════════╗
// ║  CHAT SESSIONS                                          ║
// ╚══════════════════════════════════════════════════════════╝

router.get('/sessions', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.json({ sessions: [] });

        const sessions = await authPrisma.$queryRawUnsafe(
            `SELECT id, "sessionId", name, description, "isActive", "isArchived", tags, stats, "createdAt", "updatedAt"
       FROM chat_sessions
       WHERE "userId" = $1
       ORDER BY "updatedAt" DESC
       LIMIT 50`,
            userId
        );

        return res.json({ sessions });
    } catch (error) {
        console.error('[StudioData] Sessions error:', error.message);
        return res.json({ sessions: [] });
    }
});

router.delete('/sessions/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await authPrisma.$executeRawUnsafe(
            `UPDATE chat_sessions SET "isArchived" = true, "archivedAt" = NOW() WHERE id = $1 AND "userId" = $2`,
            req.params.id,
            userId
        );

        return res.json({ success: true });
    } catch (error) {
        console.error('[StudioData] Delete session error:', error.message);
        return res.status(500).json({ error: 'Failed to archive session' });
    }
});

// ╔══════════════════════════════════════════════════════════╗
// ║  AGENT MEMORY                                           ║
// ╚══════════════════════════════════════════════════════════╝

router.get('/memories', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.json({ memories: [] });

        const memories = await authPrisma.$queryRawUnsafe(
            `SELECT id, "agentId", memories, summary, "totalMemories", "lastAccessed", "createdAt"
       FROM agent_memories
       WHERE "userId" = $1
       ORDER BY "lastAccessed" DESC NULLS LAST
       LIMIT 20`,
            userId
        );

        return res.json({ memories });
    } catch (error) {
        console.error('[StudioData] Memories error:', error.message);
        return res.json({ memories: [] });
    }
});

router.delete('/memories/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await authPrisma.$executeRawUnsafe(
            `DELETE FROM agent_memories WHERE id = $1 AND "userId" = $2`,
            req.params.id,
            userId
        );

        return res.json({ success: true });
    } catch (error) {
        console.error('[StudioData] Delete memory error:', error.message);
        return res.status(500).json({ error: 'Failed to delete memory' });
    }
});

// ╔══════════════════════════════════════════════════════════╗
// ║  FAVORITES                                              ║
// ╚══════════════════════════════════════════════════════════╝

router.get('/favorites', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.json({ favorites: [] });

        const favorites = await authPrisma.$queryRawUnsafe(
            `SELECT id, "itemType", "itemId", notes, "createdAt"
       FROM user_favorites
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 50`,
            userId
        );

        return res.json({ favorites });
    } catch (error) {
        console.error('[StudioData] Favorites error:', error.message);
        return res.json({ favorites: [] });
    }
});

router.post('/favorites', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { itemType, itemId, notes } = req.body;
        if (!itemType || !itemId) return res.status(400).json({ error: 'itemType and itemId required' });

        const id = crypto.randomUUID();
        await authPrisma.$executeRawUnsafe(
            `INSERT INTO user_favorites (id, "userId", "itemType", "itemId", notes, "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT ("userId", "itemType", "itemId") DO NOTHING`,
            id, userId, itemType, itemId, notes || null
        );

        return res.json({ success: true });
    } catch (error) {
        console.error('[StudioData] Add favorite error:', error.message);
        return res.status(500).json({ error: 'Failed to add favorite' });
    }
});

router.delete('/favorites/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await authPrisma.$executeRawUnsafe(
            `DELETE FROM user_favorites WHERE id = $1 AND "userId" = $2`,
            req.params.id,
            userId
        );

        return res.json({ success: true });
    } catch (error) {
        console.error('[StudioData] Delete favorite error:', error.message);
        return res.status(500).json({ error: 'Failed to remove favorite' });
    }
});

// ╔══════════════════════════════════════════════════════════╗
// ║  FEEDBACK                                               ║
// ╚══════════════════════════════════════════════════════════╝

router.get('/feedback', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.json({ feedback: [] });

        const feedback = await authPrisma.$queryRawUnsafe(
            `SELECT id, "sessionId", "messageId", rating, feedback, type, "createdAt"
       FROM chat_feedback
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 50`,
            userId
        );

        return res.json({ feedback });
    } catch (error) {
        console.error('[StudioData] Feedback error:', error.message);
        return res.json({ feedback: [] });
    }
});

router.post('/feedback', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { sessionId, messageId, rating, feedback, type } = req.body;
        if (!rating && !feedback) return res.status(400).json({ error: 'rating or feedback required' });

        const id = crypto.randomUUID();
        await authPrisma.$executeRawUnsafe(
            `INSERT INTO chat_feedback (id, "sessionId", "userId", "messageId", rating, feedback, type, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            id,
            sessionId || 'canvas-general',
            userId,
            messageId || null,
            rating || null,
            feedback || null,
            type || 'other'
        );

        return res.json({ success: true, feedback: { id, rating, feedback, type, createdAt: new Date().toISOString() } });
    } catch (error) {
        console.error('[StudioData] Submit feedback error:', error.message);
        return res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// ╔══════════════════════════════════════════════════════════╗
// ║  ANALYTICS                                              ║
// ╚══════════════════════════════════════════════════════════╝

router.get('/analytics', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.json({ analytics: null });

        const stats = await authPrisma.$queryRawUnsafe(
            `SELECT
        COUNT(*)::int AS "totalConversations",
        COALESCE(SUM("totalTokens"), 0)::int AS "totalTokens",
        COALESCE(SUM("turnCount"), 0)::int AS "totalTurns",
        COALESCE(AVG("durationMs"), 0)::int AS "avgDurationMs",
        COALESCE(MAX("totalTokens"), 0)::int AS "maxTokens"
       FROM chat_analytics_interactions
       WHERE "userId" = $1`,
            userId
        );

        const daily = await authPrisma.$queryRawUnsafe(
            `SELECT DATE("createdAt") AS day, COUNT(*)::int AS count, COALESCE(SUM("totalTokens"), 0)::int AS tokens
       FROM chat_analytics_interactions
       WHERE "userId" = $1 AND "createdAt" > NOW() - INTERVAL '7 days'
       GROUP BY DATE("createdAt")
       ORDER BY day`,
            userId
        );

        const sessionStats = await authPrisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "isActive" = true)::int AS active
       FROM chat_sessions
       WHERE "userId" = $1`,
            userId
        );

        return res.json({
            analytics: {
                summary: stats[0] || {},
                daily,
                sessions: sessionStats[0] || { total: 0, active: 0 },
            }
        });
    } catch (error) {
        console.error('[StudioData] Analytics error:', error.message);
        return res.json({ analytics: null });
    }
});

// ╔══════════════════════════════════════════════════════════╗
// ║  USER PREFERENCES                                       ║
// ╚══════════════════════════════════════════════════════════╝

router.get('/preferences', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.json({ preferences: {} });

        const users = await authPrisma.$queryRawUnsafe(
            `SELECT preferences FROM "User" WHERE id = $1 LIMIT 1`,
            userId
        );

        const prefs = users[0]?.preferences;
        const parsed = typeof prefs === 'string' ? JSON.parse(prefs) : (prefs || {});

        return res.json({ preferences: parsed });
    } catch (error) {
        console.error('[StudioData] Preferences error:', error.message);
        return res.json({ preferences: {} });
    }
});

router.put('/preferences', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Accept both { preferences: {...} } and flat { key: value }
        const newPrefs = req.body?.preferences || req.body || {};

        const users = await authPrisma.$queryRawUnsafe(
            `SELECT preferences FROM "User" WHERE id = $1 LIMIT 1`,
            userId
        );
        const existing = users[0]?.preferences;
        const parsed = typeof existing === 'string' ? JSON.parse(existing) : (existing || {});
        const merged = { ...parsed, ...newPrefs };

        await authPrisma.$executeRawUnsafe(
            `UPDATE "User" SET preferences = $1::jsonb WHERE id = $2`,
            JSON.stringify(merged),
            userId
        );

        return res.json({ success: true, preferences: merged });
    } catch (error) {
        console.error('[StudioData] Update preferences error:', error.message);
        return res.status(500).json({ error: 'Failed to update preferences' });
    }
});

export default router;
