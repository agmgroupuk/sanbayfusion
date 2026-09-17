/**
 * ACCOUNT LOCKOUT SERVICE
 * Prevents brute-force attacks by tracking failed login attempts
 * and temporarily locking accounts after too many failures.
 *
 * Storage hierarchy (most to least preferred):
 *   1. Redis  — survives restarts, distributed, fast (via shared CacheManager)
 *   2. DB     — survives Redis loss; source of truth on User.loginAttempts / lockUntil
 *   3. Memory — CacheManager's built-in fallback when Redis is unavailable
 *
 * All three layers are written on every failed attempt so any single layer
 * failure is transparent to callers.
 */

import { prisma } from './prisma.js';
import { cache } from './cache.js';

// Configuration
const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_ATTEMPTS || '5');
const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30');
const LOCKOUT_DURATION_MS = LOCKOUT_DURATION_MINUTES * 60 * 1000;
const LOCKOUT_DURATION_SECONDS = LOCKOUT_DURATION_MINUTES * 60;

// How long to retain attempt counters before auto-expiry when not yet locked (24 h)
const ATTEMPT_WINDOW_SECONDS = 24 * 60 * 60;

const lockoutKey = (email) => `account:lockout:${email.toLowerCase()}`;

// ── DB helpers ────────────────────────────────────────────────────────────────

async function dbGetLockout(email) {
    try {
        return await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { loginAttempts: true, lockUntil: true, permanentlyLocked: true },
        });
    } catch {
        return null;
    }
}

async function dbIncrementAttempts(email) {
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, loginAttempts: true },
        });
        if (!user) return; // Unknown email — no User row to update
        const newAttempts = (user.loginAttempts || 0) + 1;
        const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
        await prisma.user.update({
            where: { id: user.id },
            data: {
                loginAttempts: newAttempts,
                ...(shouldLock && { lockUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) }),
            },
        });
    } catch {
        // Non-critical — cache is primary store
    }
}

async function dbReset(email) {
    try {
        await prisma.user.updateMany({
            where: { email: email.toLowerCase() },
            data: { loginAttempts: 0, lockUntil: null },
        });
    } catch {
        // Non-critical
    }
}

async function dbResetById(userId) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { loginAttempts: 0, lockUntil: null },
        });
    } catch {
        // Non-critical
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if an account is currently locked out.
 * @param {string} email - The email/identifier to check
 * @returns {{ locked: boolean, remainingMinutes?: number, attemptsLeft?: number, permanent?: boolean }}
 */
export async function checkLockout(email) {
    const key = email.toLowerCase();
    const now = Date.now();

    // 1. Cache (Redis if available, in-memory otherwise — both survive restarts when Redis is up)
    const cached = await cache.get(lockoutKey(key));
    if (cached !== null) {
        if (cached.lockedUntil && now < cached.lockedUntil) {
            const remainingMs = cached.lockedUntil - now;
            return { locked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
        }
        if (cached.lockedUntil && now >= cached.lockedUntil) {
            // Lock expired — clean up both stores
            await Promise.allSettled([
                cache.del(lockoutKey(key)),
                dbReset(key),
            ]);
            return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS };
        }
        return {
            locked: false,
            attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - (cached.attempts || 0)),
        };
    }

    // 2. DB fallback — catches cases where Redis was down during a lockout event
    const dbRecord = await dbGetLockout(key);
    if (dbRecord) {
        if (dbRecord.permanentlyLocked) {
            return { locked: true, permanent: true, remainingMinutes: null };
        }
        if (dbRecord.lockUntil && now < new Date(dbRecord.lockUntil).getTime()) {
            const remainingMs = new Date(dbRecord.lockUntil).getTime() - now;
            // Re-warm the cache so subsequent checks are fast
            await cache.set(
                lockoutKey(key),
                { attempts: dbRecord.loginAttempts, lockedUntil: new Date(dbRecord.lockUntil).getTime() },
                Math.ceil(remainingMs / 1000) + 60,
            );
            return { locked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
        }
        if (dbRecord.lockUntil && now >= new Date(dbRecord.lockUntil).getTime()) {
            await dbReset(key);
            return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS };
        }
        return {
            locked: false,
            attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - (dbRecord.loginAttempts || 0)),
        };
    }

    return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS };
}

/**
 * Record a failed login attempt.
 * Writes to cache (Redis/memory) and DB in parallel — DB errors never surface to callers.
 * @param {string} email - The email/identifier
 * @returns {{ locked: boolean, attemptsLeft?: number, remainingMinutes?: number }}
 */
export async function recordFailedAttempt(email) {
    const key = email.toLowerCase();
    const now = Date.now();

    // Read current attempt count — cache first, then DB
    let currentAttempts = 0;
    const cached = await cache.get(lockoutKey(key));
    if (cached) {
        currentAttempts = cached.attempts || 0;
    } else {
        const dbRecord = await dbGetLockout(key);
        if (dbRecord) currentAttempts = dbRecord.loginAttempts || 0;
    }

    const newAttempts = currentAttempts + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock ? now + LOCKOUT_DURATION_MS : null;

    const cacheRecord = { attempts: newAttempts, lockedUntil, lastAttempt: now };
    const cacheTTL = shouldLock ? LOCKOUT_DURATION_SECONDS + 60 : ATTEMPT_WINDOW_SECONDS;

    // Write to cache + DB in parallel; neither failure is fatal
    await Promise.allSettled([
        cache.set(lockoutKey(key), cacheRecord, cacheTTL),
        dbIncrementAttempts(key),
    ]);

    if (shouldLock) {
        return { locked: true, remainingMinutes: LOCKOUT_DURATION_MINUTES };
    }
    return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - newAttempts };
}

/**
 * Reset lockout after a successful login.
 * Clears from cache and resets DB fields.
 * @param {string} userIdOrEmail - The user ID or email
 */
export async function resetLockoutOnSuccess(userIdOrEmail) {
    const isEmail = userIdOrEmail.includes?.('@');

    if (isEmail) {
        const key = userIdOrEmail.toLowerCase();
        await Promise.allSettled([
            cache.del(lockoutKey(key)),
            dbReset(key),
        ]);
        return;
    }

    // userId passed — reset DB directly by ID, then fetch email to clear cache
    await Promise.allSettled([
        dbResetById(userIdOrEmail),
        (async () => {
            try {
                const user = await prisma.user.findUnique({
                    where: { id: userIdOrEmail },
                    select: { email: true },
                });
                if (user?.email) {
                    await cache.del(lockoutKey(user.email.toLowerCase()));
                }
            } catch {
                // Non-critical
            }
        })(),
    ]);
}
