/**
 * AUTH ROUTES — Authentication endpoints for Canvas Studio
 * Provides session verification and logout.
 * Auth is centralized at https://maula.ai/auth/login
 * This backend verifies sessions from the MAIN maulaai database.
 */

import express from 'express';
import db from '../lib/db.js';

const router = express.Router();

/**
 * Extract sessionId from cookies
 */
function extractSessionId(req) {
    return req.cookies?.sessionId || req.cookies?.session_id || null;
}

// ─── POST /verify ──────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
    try {
        const sessionId = extractSessionId(req);

        if (!sessionId) {
            return res.json({ valid: false });
        }

        // Query main maulaai database (sessions live there, not in canvas_studio)
        const user = await db.User.findBySessionId(sessionId);

        if (!user || (user.sessionExpiry && new Date(user.sessionExpiry) < new Date())) {
            return res.json({ valid: false });
        }

        return res.json({
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || user.email?.split('@')[0] || '',
                avatar: null,
            },
        });
    } catch (error) {
        console.error('[Auth] Verify error:', error);
        return res.json({ valid: false });
    }
});

// ─── GET /login-url ────────────────────────────────────────────────
router.get('/login-url', (_req, res) => {
    const loginUrl = `https://maula.ai/auth/login?redirect=${encodeURIComponent('https://studio.maula.ai')}`;
    res.json({ success: true, loginUrl });
});

// ─── POST /logout ──────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
    const cookieOpts = { domain: '.maula.ai', path: '/' };
    res.clearCookie('sessionId', cookieOpts);
    res.clearCookie('session_id', cookieOpts);
    res.clearCookie('token', cookieOpts);
    res.clearCookie('auth_token', cookieOpts);
    res.clearCookie('sessionId');
    res.clearCookie('session_id');
    res.clearCookie('token');
    res.clearCookie('auth_token');
    res.json({ success: true, message: 'Logged out' });
});

export default router;
