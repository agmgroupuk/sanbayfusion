/**
 * AI REQUEST QUEUE — Phase 6.4
 * Redis-backed concurrency limiter, per-user rate limiter, and dead letter queue.
 *
 * Works for both streaming (generators) and non-streaming (promises).
 * Gracefully degrades if Redis is unavailable — AI calls still work, just unprotected.
 *
 * Features:
 *   1. Per-provider concurrency limits (atomic Redis Lua semaphore)
 *   2. Per-user sliding-window rate limits
 *   3. Priority-aware slot acquisition (authenticated users poll 3× faster)
 *   4. Retry with exponential backoff for 429 errors
 *   5. BullMQ dead letter queue for failed requests
 *   6. Monitoring stats endpoint
 */

import { Queue } from 'bullmq';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Max concurrent requests per AI provider */
const PROVIDER_LIMITS = {
  openai:   30,
  mistral:  50,
  xai:      20,
  groq:     20,
  cerebras: 20,
  gemini:   20,
};

/** AI requests per minute per user */
const USER_RATE_LIMITS = {
  authenticated: 60,
  guest:         10,
};

/** How long a slot lives before auto-cleanup (stale protection) */
const SLOT_TTL_MS = 5 * 60 * 1000;

/** Max wait time for a concurrency slot */
const DEFAULT_TIMEOUT_MS = 30_000;

// ============================================================================
// REDIS LUA SCRIPTS (atomic operations)
// ============================================================================

/**
 * Atomic semaphore acquire:
 *   1. Remove stale slots older than TTL
 *   2. If under limit, add slot and return 1
 *   3. Otherwise return 0
 */
const ACQUIRE_LUA = `
  local key   = KEYS[1]
  local limit = tonumber(ARGV[1])
  local id    = ARGV[2]
  local now   = tonumber(ARGV[3])
  local ttl   = tonumber(ARGV[4])
  redis.call('ZREMRANGEBYSCORE', key, 0, now - ttl)
  if redis.call('ZCARD', key) < limit then
    redis.call('ZADD', key, now, id)
    redis.call('EXPIRE', key, math.ceil(ttl / 1000) + 60)
    return 1
  end
  return 0
`;

/**
 * Atomic sliding-window rate check:
 *   1. Remove entries older than window
 *   2. If under limit, add entry and return 1
 *   3. Otherwise return 0
 */
const RATE_LUA = `
  local key    = KEYS[1]
  local limit  = tonumber(ARGV[1])
  local now    = tonumber(ARGV[2])
  local window = tonumber(ARGV[3])
  local id     = ARGV[4]
  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  if redis.call('ZCARD', key) >= limit then
    return 0
  end
  redis.call('ZADD', key, now, id)
  redis.call('EXPIRE', key, math.ceil(window / 1000) + 60)
  return 1
`;

// ============================================================================
// STATE
// ============================================================================

let redis = null;
let dlq   = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log('[ai-queue] REDIS_URL not set — running without queue protection');
    return;
  }

  try {
    const { default: Redis } = await import('ioredis');
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: false,
    });
    await redis.ping();
    console.log('[ai-queue] Redis connected');

    dlq = new Queue('ai:dead-letter', {
      connection: { url },
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
    console.log('[ai-queue] Dead letter queue ready');
  } catch (err) {
    console.warn(`[ai-queue] Redis unavailable (${err.message}) — running unprotected`);
    redis = null;
    dlq = null;
  }
}

// Fire-and-forget initialization
init();

// ============================================================================
// AI QUEUE CLASS
// ============================================================================

export class AiQueue {

  // --------------------------------------------------------------------------
  // Per-user rate limit (sliding window, 1-minute)
  // --------------------------------------------------------------------------

  static async checkUserRate(userId) {
    if (!redis) return;

    const tier = userId ? 'authenticated' : 'guest';
    const limit = USER_RATE_LIMITS[tier];
    const key = `ai:rate:${userId || 'guest'}`;
    const rid = `${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    try {
      const ok = await redis.eval(RATE_LUA, 1, key, limit, Date.now(), 60_000, rid);
      if (ok === 0) {
        const err = new Error(`AI rate limit exceeded: ${limit} requests/min (${tier})`);
        err.code = 'AI_RATE_LIMIT';
        err.status = 429;
        throw err;
      }
    } catch (err) {
      if (err.code === 'AI_RATE_LIMIT') throw err;
      // Redis error — degrade gracefully
    }
  }

  // --------------------------------------------------------------------------
  // Per-provider concurrency semaphore
  // --------------------------------------------------------------------------

  static async acquireSlot(provider, authenticated = true, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (!redis) return null;

    const limit = PROVIDER_LIMITS[provider] || 20;
    const key = `ai:slots:${provider}`;
    const slotId = `${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const deadline = Date.now() + timeoutMs;

    // Authenticated users poll 3× faster → get slots sooner
    const pollMs = authenticated ? 100 : 300;

    while (Date.now() < deadline) {
      try {
        const ok = await redis.eval(ACQUIRE_LUA, 1, key, limit, slotId, Date.now(), SLOT_TTL_MS);
        if (ok === 1) return { key, slotId };
      } catch {
        return null; // Redis error — degrade
      }
      await new Promise(r => setTimeout(r, pollMs));
    }

    const err = new Error(`AI queue timeout: ${provider} at capacity (${limit} concurrent), waited ${timeoutMs}ms`);
    err.code = 'AI_QUEUE_TIMEOUT';
    err.status = 503;
    throw err;
  }

  static async releaseSlot(slot) {
    if (!redis || !slot) return;
    try { await redis.zrem(slot.key, slot.slotId); } catch { /* ignore */ }
  }

  // --------------------------------------------------------------------------
  // Dead letter queue
  // --------------------------------------------------------------------------

  static async logFailure(provider, model, userId, error) {
    if (!dlq) return;
    try {
      await dlq.add('failure', {
        provider,
        model,
        userId: userId || 'anonymous',
        error: error.message || String(error),
        status: error.status || error.statusCode,
        timestamp: new Date().toISOString(),
      });
    } catch { /* ignore */ }
  }

  // --------------------------------------------------------------------------
  // Retry with exponential backoff (429 errors only)
  // --------------------------------------------------------------------------

  static async withRetry(fn, { provider, model, userId, maxRetries = 3 } = {}) {
    let lastErr;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const is429 = err.status === 429 || err.statusCode === 429 ||
          (err.message && /rate.?limit|429|too many/i.test(err.message));

        if (!is429 || i === maxRetries) {
          await AiQueue.logFailure(provider, model, userId, err);
          throw err;
        }
        const delay = Math.pow(2, i) * 1000; // 1s → 2s → 4s
        console.warn(`[ai-queue] ${provider}/${model} 429 — retry ${i + 1}/${maxRetries} in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }

  // --------------------------------------------------------------------------
  // High-level wrappers
  // --------------------------------------------------------------------------

  /**
   * Wrap a non-streaming AI call with full protection.
   * @param {object} opts - { provider, model, userId, fn }
   * @returns {Promise<any>} - result of fn()
   */
  static async execute({ provider, model, userId, fn }) {
    await AiQueue.checkUserRate(userId);
    const slot = await AiQueue.acquireSlot(provider, !!userId);
    try {
      return await AiQueue.withRetry(fn, { provider, model, userId });
    } finally {
      await AiQueue.releaseSlot(slot);
    }
  }

  /**
   * Wrap a streaming generator with full protection.
   * Slot is held for the entire duration of the stream.
   * @param {object} opts - { provider, model, userId, generatorFn }
   * @yields {any} - chunks from generatorFn()
   */
  static async *executeStream({ provider, model, userId, generatorFn }) {
    await AiQueue.checkUserRate(userId);
    const slot = await AiQueue.acquireSlot(provider, !!userId);
    try {
      yield* generatorFn();
    } catch (err) {
      await AiQueue.logFailure(provider, model, userId, err);
      throw err;
    } finally {
      await AiQueue.releaseSlot(slot);
    }
  }

  // --------------------------------------------------------------------------
  // Monitoring
  // --------------------------------------------------------------------------

  static async getStats() {
    if (!redis) return { available: false };
    try {
      const providers = {};
      for (const [prov, limit] of Object.entries(PROVIDER_LIMITS)) {
        const key = `ai:slots:${prov}`;
        await redis.zremrangebyscore(key, 0, Date.now() - SLOT_TTL_MS);
        const active = await redis.zcard(key);
        providers[prov] = { active, limit, available: limit - active };
      }
      const dlqCounts = dlq ? await dlq.getJobCounts() : null;
      return { available: true, providers, deadLetterQueue: dlqCounts };
    } catch (err) {
      return { available: false, error: err.message };
    }
  }

  static async shutdown() {
    if (dlq) await dlq.close();
    if (redis) await redis.quit();
  }
}
