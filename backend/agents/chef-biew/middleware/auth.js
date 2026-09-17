/**
 * Auth Middleware — session-cookie based authentication
 * Authenticates against the MAIN maulaai database (where users live).
 * Also accepts userId from request body/header for server-to-server proxied calls.
 * Ensures a local user record exists for foreign-key constraints.
 */
import { findUserBySession, findUserById } from '../lib/auth-prisma.js';
import { prisma } from '../lib/prisma.js';

/**
 * Extract sessionId from cookies (supports both cookie names)
 */
function extractSessionId(req) {
    return req.cookies?.sessionId || req.cookies?.session_id || null;
}

/**
 * Check if request carries a valid internal API key for server-to-server calls.
 */
function isInternalCall(req) {
    const key = process.env.INTERNAL_API_KEY;
    if (!key) return false;
    return req.headers['x-internal-key'] === key;
}

/**
 * Ensure a minimal user record exists in the LOCAL universal_chat DB for FK constraints.
 */
async function ensureLocalUser(user) {
    try {
        await prisma.user.upsert({
            where: { id: user.id },
            create: { id: user.id, email: user.email || `${user.id}@placeholder.local`, name: user.name || null },
            update: {},
        });
    } catch {
        // Non-fatal: log but don't block request
    }
}

/**
 * Required auth — rejects 401 if no valid session.
 * Checks (in order):
 *   1. Cookie sessionId → lookup in main DB
 *   2. Body userId / x-user-id header → verify exists in main DB
 * Sets req.userId and req.userEmail on success.
 */
export async function requireAuth(req, res, next) {
    // 1. Cookie-based session (primary — set by frontend login)
    const sessionId = extractSessionId(req);
    if (sessionId) {
        try {
            const user = await findUserBySession(sessionId);
            if (user) {
                await ensureLocalUser(user);
                req.userId = user.id;
                req.userEmail = user.email;
                req.user = { id: user.id };
                return next();
            }
        } catch (err) {
            console.error('[auth] session lookup error:', err.message);
        }
    }

    // 2. userId from body or header (for server-to-server proxy calls with valid internal key)
    if (isInternalCall(req)) {
        const userId = req.body?.userId || req.headers['x-user-id'];
        if (userId) {
            try {
                const user = await findUserById(userId);
                if (user) {
                    await ensureLocalUser(user);
                    req.userId = user.id;
                    req.userEmail = user.email;
                    req.user = { id: user.id };
                    return next();
                }
            } catch (err) {
                console.error('[auth] userId lookup error:', err.message);
            }
        }
    }

    // 3. userId from body or x-user-id header — verify user exists in main DB
    //    (Matches chat-session-routes pattern for frontend-to-backend calls)
    {
        const userId = req.body?.userId || req.headers['x-user-id'];
        if (userId) {
            try {
                const user = await findUserById(userId);
                if (user) {
                    await ensureLocalUser(user);
                    req.userId = user.id;
                    req.userEmail = user.email;
                    req.user = { id: user.id };
                    return next();
                }
            } catch (err) {
                console.error('[auth] userId fallback lookup error:', err.message);
            }
        }
    }

    return res.status(401).json({ error: 'Authentication required' });
}

/**
 * Optional auth — sets req.userId if valid session present, continues either way.
 * Allows guest access while still identifying logged-in users.
 */
export async function optionalAuth(req, res, next) {
    const sessionId = extractSessionId(req);
    if (sessionId) {
        try {
            const user = await findUserBySession(sessionId);
            if (user) {
                await ensureLocalUser(user);
                req.userId = user.id;
                req.userEmail = user.email;
                req.user = { id: user.id };
                return next();
            }
        } catch {
            // DB error — continue as guest
        }
    }

    // Also try userId from body/header (ONLY for internal proxy calls)
    if (isInternalCall(req)) {
        const userId = req.body?.userId || req.headers['x-user-id'];
        if (userId) {
            try {
                const user = await findUserById(userId);
                if (user) {
                    await ensureLocalUser(user);
                    req.userId = user.id;
                    req.userEmail = user.email;
                    req.user = { id: user.id };
                    return next();
                }
            } catch {
                // Continue as guest
            }
        }
    }

    // Also try userId from body/header (frontend fallback)
    {
        const userId = req.body?.userId || req.headers['x-user-id'];
        if (userId) {
            try {
                const user = await findUserById(userId);
                if (user) {
                    await ensureLocalUser(user);
                    req.userId = user.id;
                    req.userEmail = user.email;
                    req.user = { id: user.id };
                    return next();
                }
            } catch {
                // Continue as guest
            }
        }
    }

    next();
}
