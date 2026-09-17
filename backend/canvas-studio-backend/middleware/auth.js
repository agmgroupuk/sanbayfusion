/**
 * Auth Middleware — session-cookie based authentication
 * Reads sessionId cookie and looks up user in the MAIN maulaai database
 * (sessions live there, not in canvas_studio).
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
 * Required auth — rejects 401 if no valid session.
 * Queries the MAIN maulaai database via authPrisma (sessions live there).
 */
export async function requireAuth(req, res, next) {
    const sessionId = extractSessionId(req);
    if (!sessionId) return res.status(401).json({ error: 'Authentication required' });

    try {
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
 * Require active Canvas Studio subscription.
 * Checks local canvas_studio DB first, then falls back to the main maulaai DB
 * (where subscriptions purchased via maula.ai/overview/studio are stored).
 * Auto-syncs from main DB to local DB when found.
 * Must be applied AFTER requireAuth (needs req.userId).
 */
export async function requireActivePlan(req, res, next) {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Main maulaai DB is the authoritative source for Canvas Studio access.
        const mainSubs = await authPrisma.$queryRawUnsafe(
            `SELECT id, "userId", plan, status, "startDate", "expiryDate", "stripeSubscriptionId"
             FROM subscriptions
             WHERE "userId" = $1 AND "agentId" = 'canvas-studio' AND status = 'active' AND "expiryDate" > NOW()
             ORDER BY "createdAt" DESC LIMIT 1`,
            userId
        );

        if (mainSubs && mainSubs.length > 0) {
            const mainSub = mainSubs[0];

            // Keep the local cache aligned with the authoritative record.
            try {
                // Ensure user exists in local DB (FK constraint)
                await prisma.user.upsert({
                    where: { id: mainSub.userId },
                    update: {},
                    create: {
                        id: mainSub.userId,
                        email: req.userEmail || `${mainSub.userId}@synced`,
                        name: req.user?.name || null,
                    },
                });
                await prisma.subscription.create({
                    data: {
                        userId: mainSub.userId,
                        stripeSubscriptionId: mainSub.stripeSubscriptionId || null,
                        plan: mainSub.plan === 'yearly' ? 'pro_yearly'
                            : mainSub.plan === 'monthly' ? 'pro_monthly'
                                : mainSub.plan,
                        status: 'active',
                        currentPeriodStart: mainSub.startDate,
                        currentPeriodEnd: mainSub.expiryDate,
                    },
                });
                console.log(`[auth] Synced subscription from main DB for user ${userId}`);
            } catch (syncErr) {
                // Non-critical — subscription found, just sync failed
                console.error('[auth] sync error (non-critical):', syncErr.message);
            }

            return next();
        }

        // No active main subscription means access must be denied, even if a stale
        // local cache row still exists.
        await prisma.subscription.updateMany({
            where: {
                userId,
                status: 'active',
            },
            data: {
                status: 'cancelled',
            },
        });

        return res.status(403).json({
            error: 'Active Canvas Studio subscription required',
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
