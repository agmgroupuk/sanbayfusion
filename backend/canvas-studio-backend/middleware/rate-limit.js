/**
 * Rate Limiter — simple in-memory rate limiting
 */
const store = new Map();

/**
 * Create a rate limiter middleware
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Window duration in ms (default 60s)
 */
export function rateLimit(maxRequests = 60, windowMs = 60000) {
    return (req, res, next) => {
        const key = req.userId || req.ip;
        const now = Date.now();
        const record = store.get(key);

        if (!record || now - record.start > windowMs) {
            store.set(key, { start: now, count: 1 });
            return next();
        }

        record.count++;
        if (record.count > maxRequests) {
            const retryAfter = Math.ceil((record.start + windowMs - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({
                error: 'Too many requests',
                retryAfter,
            });
        }

        next();
    };
}

// Cleanup stale entries every 10 minutes (must exceed longest rate-limit window)
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store) {
        if (now - record.start > 1800000) store.delete(key);
    }
}, 600000);
