/**
 * USER SETTINGS ROUTES — Canvas Studio
 * Simple settings endpoint for dark mode and UI preferences.
 * Settings are persisted in the main maulaai database User.preferences JSON field
 * via authPrisma (since canvas_studio DB User model has no preferences column).
 */

import express from 'express';
import { authPrisma } from '../lib/db.js';

const router = express.Router();

/**
 * Extract sessionId and find user from main DB
 */
async function getAuthUser(req) {
    const sessionId = req.cookies?.sessionId || req.cookies?.session_id || null;
    if (!sessionId) return null;
    try {
        const users = await authPrisma.$queryRawUnsafe(
            'SELECT id, email, preferences FROM "User" WHERE "sessionId" = $1 LIMIT 1',
            sessionId
        );
        return users[0] || null;
    } catch {
        return null;
    }
}

// ─── GET /api/user/settings ────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return res.json({ settings: { preferences: {} } });
        }

        const preferences = typeof user.preferences === 'string'
            ? JSON.parse(user.preferences)
            : (user.preferences || {});

        return res.json({ settings: { preferences } });
    } catch (error) {
        console.error('[Settings] GET error:', error);
        return res.json({ settings: { preferences: {} } });
    }
});

// ─── PUT /api/user/settings ────────────────────────────────────────
router.put('/', async (req, res) => {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return res.json({ success: true, settings: { preferences: req.body?.preferences || {} } });
        }

        const newPreferences = req.body?.preferences || {};

        // Merge with existing preferences
        const existing = typeof user.preferences === 'string'
            ? JSON.parse(user.preferences)
            : (user.preferences || {});

        const merged = { ...existing, ...newPreferences };

        // Save to main DB
        await authPrisma.$executeRawUnsafe(
            'UPDATE "User" SET preferences = $1::jsonb WHERE id = $2',
            JSON.stringify(merged),
            user.id
        );

        return res.json({ success: true, settings: { preferences: merged } });
    } catch (error) {
        console.error('[Settings] PUT error:', error);
        // Return success anyway — settings are non-critical
        return res.json({ success: true, settings: { preferences: req.body?.preferences || {} } });
    }
});

export default router;
