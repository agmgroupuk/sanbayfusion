/**
 * Auth Middleware — session-cookie based authentication
 * Reads sessionId cookie and verifies against the MAIN maulaai database.
 * Auth is centralized at https://maula.ai/auth/login;
 * these backends only verify existing sessions via cross-subdomain cookies.
 *
 * Also provides requireActivePlan middleware to enforce active subscription.
 */
import db, { authPrisma } from '../lib/db.js';
import { prisma } from '../lib/prisma.js';

/**
 * Extract sessionId from cookies (supports both cookie names)
 */
function extractSessionId(req) {
    return req.cookies?.sessionId || req.cookies?.session_id || null;
}

/**
 * Required auth — rejects 401 if no valid session
 */
export async function requireAuth(req, res, next) {
    const sessionId = extractSessionId(req);
    if (!sessionId) return res.status(401).json({ error: 'Authentication required' });

    try {
        // Query the main maulaai database (sessions live there, not in canvas_app)
        const user = await db.User.findBySessionId(sessionId);

        if (!user || (user.sessionExpiry && new Date(user.sessionExpiry) < new Date())) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        req.userId = user.id;
        req.userEmail = user.email;
        req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
        next();
    } catch (err) {
        console.error('[auth] session lookup error:', err.message);
        return res.status(500).json({ error: 'Authentication service error' });
    }
}

/**
 * Optional auth — sets req.userId if valid session present, continues either way
 */
export async function optionalAuth(req, res, next) {
    const sessionId = extractSessionId(req);
    if (sessionId) {
        try {
            const user = await db.User.findBySessionId(sessionId);

            if (user && (!user.sessionExpiry || new Date(user.sessionExpiry) >= new Date())) {
                req.userId = user.id;
                req.userEmail = user.email;
                req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
            }
        } catch {
            // DB error — continue as guest
        }
    }
    next();
}

/**
 * Require active Canvas App (GenCraft Pro) subscription.
 * Checks local canvas_app DB first, then falls back to the main maulaai DB
 * (where subscriptions purchased via maula.ai/overview/pricing are stored).
 * Auto-syncs from main DB to local DB when found.
 * Must be applied AFTER requireAuth (needs req.userId).
 */
export async function requireActivePlan(req, res, next) {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Check main maulaai DB — this is the authoritative source for gencraft-pro subscriptions.
        // The local DB was previously used as a cache but caused cross-app contamination when
        // canvas-studio subscriptions were incorrectly synced into it. Main DB is now always checked first.
        const mainSubs = await authPrisma.$queryRawUnsafe(
            `SELECT id, "userId", plan, status, "startDate", "expiryDate", "stripeSubscriptionId"
             FROM subscriptions
             WHERE "userId" = $1 AND "agentId" = 'gencraft-pro' AND status = 'active' AND "expiryDate" > NOW()
             ORDER BY "createdAt" DESC LIMIT 1`,
            userId
        );

        if (mainSubs && mainSubs.length > 0) {
            return next();
        }

        return res.status(403).json({
            error: 'Active GenCraft Pro subscription required',
            code: 'SUBSCRIPTION_REQUIRED',
        });
    } catch (err) {
        console.error('[auth] plan check error:', err.message);
        return res.status(503).json({
            error: 'Subscription service temporarily unavailable',
            code: 'SUBSCRIPTION_CHECK_FAILED',
        });
    }
}
