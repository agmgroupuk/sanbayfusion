/**
 * AUTH DATABASE CLIENT — Connects to the main `maulaai` database for user authentication.
 *
 * The ai-studio-demo-backend has its own `ai_studio_demo` database for sessions/messages,
 * but users are stored in the main `maulaai` database. This client is used ONLY for
 * authenticating users (looking up by ID or session cookie).
 *
 * Env: AUTH_DATABASE_URL — connection string to the maulaai database
 *      Falls back to DATABASE_URL with the database name replaced.
 */

import { PrismaClient } from '@prisma/client';

// Build auth database URL:
// If AUTH_DATABASE_URL is set, use it directly.
// Otherwise, derive from DATABASE_URL by replacing the database name with 'maulaai'.
function getAuthDatabaseUrl() {
    if (process.env.AUTH_DATABASE_URL) {
        return process.env.AUTH_DATABASE_URL;
    }

    const baseUrl = process.env.DATABASE_URL || '';
    // Replace the last path segment (database name) with 'maulaai'
    const replaced = baseUrl.replace(/\/[^/?]+(\?.*)?$/, '/maulaai$1');
    if (replaced === baseUrl && !baseUrl.endsWith('/maulaai')) {
        console.warn('[auth-prisma] Could not derive AUTH_DATABASE_URL from DATABASE_URL. User auth will fail.');
    }
    return replaced;
}

const authUrl = getAuthDatabaseUrl();

const globalForAuthPrisma = globalThis;

export const authPrisma = globalForAuthPrisma.__authPrisma ?? new PrismaClient({
    datasources: {
        db: { url: authUrl },
    },
    log: ['error'],
    errorFormat: 'pretty',
});

if (process.env.NODE_ENV !== 'production') {
    globalForAuthPrisma.__authPrisma = authPrisma;
}

/**
 * Look up a user by ID in the main database.
 * Returns { id } or null.
 */
export async function findUserById(userId) {
    try {
        return await authPrisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true },
        });
    } catch (e) {
        console.error('[auth-prisma] findUserById error:', e.message);
        return null;
    }
}

/**
 * Look up a user by session cookie value in the main database.
 * Returns { id } or null.
 */
export async function findUserBySession(sessionId) {
    try {
        return await authPrisma.user.findFirst({
            where: {
                sessionId,
                sessionExpiry: { gt: new Date() },
            },
            select: { id: true, email: true, name: true },
        });
    } catch (e) {
        console.error('[auth-prisma] findUserBySession error:', e.message);
        return null;
    }
}
