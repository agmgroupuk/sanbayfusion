/**
 * ACCOUNT LOCKOUT SERVICE
 * Prevents brute-force attacks by tracking failed login attempts
 * and progressively locking accounts.
 * 
 * 3 fails → 15 min lock → 3 fails → 24 hr lock → 3 fails → permanent lock
 */

const MAX_ATTEMPTS_PER_TIER = 3;

interface LockoutRecord {
    attempts: number;
    tier: number;          // 0 = no lock yet, 1 = 15min, 2 = 24hr, 3 = permanent
    lockedUntil: Date | null;
    lastAttempt: Date;
}

// In-memory store (process-scoped, resets on restart)
const failedAttempts = new Map<string, LockoutRecord>();

// Lock durations per tier (in milliseconds)
const LOCK_DURATIONS: Record<number, number | null> = {
    1: 15 * 60 * 1000,       // 15 minutes
    2: 24 * 60 * 60 * 1000,  // 24 hours
    3: null,                  // permanent
};

/**
 * Check if an email is currently locked out.
 */
export function checkLockout(email: string): {
    locked: boolean;
    message?: string;
    retryAfter?: string;
    permanent?: boolean;
} {
    const key = email.toLowerCase();
    const record = failedAttempts.get(key);

    if (!record) {
        return { locked: false };
    }

    // Check if there's an active lock
    if (record.lockedUntil) {
        if (record.tier === 3) {
            // Permanent lock
            return {
                locked: true,
                message: 'Account permanently locked. Contact support@maula.ai to unlock.',
                permanent: true,
            };
        }

        if (new Date() < record.lockedUntil) {
            const remainingMs = record.lockedUntil.getTime() - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            return {
                locked: true,
                message: `Account temporarily locked. Try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`,
                retryAfter: record.lockedUntil.toISOString(),
            };
        }

        // Lock expired — reset attempts for this tier but keep tier level
        record.attempts = 0;
        record.lockedUntil = null;
    }

    return { locked: false };
}

/**
 * Record a failed login attempt. Returns lockout info.
 */
export function recordFailedAttempt(email: string): {
    locked: boolean;
    message?: string;
    retryAfter?: string;
    permanent?: boolean;
    attemptsRemaining?: number;
} {
    const key = email.toLowerCase();
    let record = failedAttempts.get(key);

    if (!record) {
        record = { attempts: 0, tier: 0, lockedUntil: null, lastAttempt: new Date() };
    }

    record.attempts += 1;
    record.lastAttempt = new Date();

    if (record.attempts >= MAX_ATTEMPTS_PER_TIER) {
        // Advance to next lock tier
        record.tier = Math.min(record.tier + 1, 3);
        const duration = LOCK_DURATIONS[record.tier];

        if (duration === null) {
            // Permanent lock
            record.lockedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // far future
            failedAttempts.set(key, record);
            return {
                locked: true,
                message: 'Account permanently locked due to too many failed attempts. Contact support@maula.ai.',
                permanent: true,
            };
        }

        record.lockedUntil = new Date(Date.now() + duration);
        record.attempts = 0; // Reset counter for next tier
        failedAttempts.set(key, record);

        const minutes = Math.ceil(duration / 60000);
        return {
            locked: true,
            message: `Too many failed attempts. Account locked for ${minutes >= 60 ? `${Math.round(minutes / 60)} hour${Math.round(minutes / 60) > 1 ? 's' : ''}` : `${minutes} minutes`}.`,
            retryAfter: record.lockedUntil.toISOString(),
        };
    }

    failedAttempts.set(key, record);
    return {
        locked: false,
        attemptsRemaining: MAX_ATTEMPTS_PER_TIER - record.attempts,
        message: 'Invalid credentials',
    };
}

/**
 * Reset lockout after successful login.
 */
export function resetLockoutOnSuccess(email: string): void {
    failedAttempts.delete(email.toLowerCase());
}

/**
 * Admin: Unlock a permanently locked account.
 */
export function adminUnlockAccount(email: string): void {
    failedAttempts.delete(email.toLowerCase());
}
