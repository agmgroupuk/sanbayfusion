/**
 * RATE LIMITING & CACHING UTILITIES
 * Advanced rate limiting and caching configuration
 */

import rateLimit from 'express-rate-limit';

// ============================================
// RATE LIMITING CONFIGURATIONS
// ============================================

export const rateLimiters = {
    global: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: { success: false, message: 'Too many requests from this IP, please try again later.', retryAfter: '15 minutes' },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.path === '/health' || req.path === '/version',
    }),

    api: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 2000,
        message: { success: false, message: 'API rate limit exceeded, please try again later.', retryAfter: '15 minutes' },
        standardHeaders: true,
        legacyHeaders: false,
    }),

    auth: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: { success: false, message: 'Too many authentication attempts, please try again later.', retryAfter: '15 minutes' },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
    }),

    upload: rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 100,
        message: { success: false, message: 'Upload rate limit exceeded, please try again later.', retryAfter: '1 hour' },
        standardHeaders: true,
        legacyHeaders: false,
    }),

    search: rateLimit({
        windowMs: 60 * 1000,
        max: 100,
        message: { success: false, message: 'Search rate limit exceeded, please try again later.', retryAfter: '1 minute' },
        standardHeaders: true,
        legacyHeaders: false,
    }),

    agent: rateLimit({
        windowMs: 60 * 1000,
        max: 60,
        message: { success: false, message: 'Agent interaction rate limit exceeded, please try again later.', retryAfter: '1 minute' },
        standardHeaders: true,
        legacyHeaders: false,
    }),

    community: rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 50,
        message: { success: false, message: 'Posting rate limit exceeded, please try again later.', retryAfter: '1 hour' },
        standardHeaders: true,
        legacyHeaders: false,
    }),
};

// ============================================
// CACHE MANAGER (In-Memory, optional Redis)
// ============================================

class CacheManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.memoryCache = new Map();
        this.initialized = false;
        this.init();
    }

    async ensureInitialized() {
        if (this.initialized) return;
        this.initialized = true;
    }

    async init() {
        this.initialized = true;
        const redisUrl = process.env.REDIS_URL;

        if (!redisUrl) {
            console.log('ℹ️  REDIS_URL not set — using in-memory cache');
            this.client = null;
            this.isConnected = false;
            return;
        }

        try {
            const { default: Redis } = await import('ioredis');
            this.client = new Redis(redisUrl, {
                retryDelayOnFailover: 100,
                enableReadyCheck: true,
                maxRetriesPerRequest: 3,
                lazyConnect: false,
                connectTimeout: 10000,
                reconnectOnError: (err) => {
                    console.warn('⚠️ Redis reconnect error:', err.message);
                    return true;
                },
            });

            this.client.on('connect', () => {
                console.log('✅ Redis cache connected');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                this.isConnected = true;
            });

            this.client.on('error', (err) => {
                console.warn('⚠️ Redis connection error:', err.message);
                this.isConnected = false;
            });

            this.client.on('close', () => {
                this.isConnected = false;
            });

            await this.client.ping();
            this.isConnected = true;
        } catch (error) {
            console.warn('⚠️ Redis not available, using in-memory cache:', error.message);
            this.client = null;
            this.isConnected = false;
        }
    }

    async get(key) {
        await this.ensureInitialized();
        try {
            if (this.client && this.isConnected) {
                const value = await this.client.get(key);
                return value ? JSON.parse(value) : null;
            } else if (this.memoryCache) {
                const value = this.memoryCache.get(key);
                if (value && value.expires > Date.now()) return value.data;
                if (value) this.memoryCache.delete(key);
                return null;
            }
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(key, value, ttlSeconds = 300) {
        await this.ensureInitialized();
        try {
            const data = JSON.stringify(value);
            if (this.client && this.isConnected) {
                await this.client.setex(key, ttlSeconds, data);
            } else if (this.memoryCache) {
                this.memoryCache.set(key, { data: value, expires: Date.now() + ttlSeconds * 1000 });
            }
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    async del(key) {
        await this.ensureInitialized();
        try {
            if (this.client && this.isConnected) await this.client.del(key);
            else if (this.memoryCache) this.memoryCache.delete(key);
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }

    async clear(pattern = '*') {
        await this.ensureInitialized();
        try {
            if (this.client && this.isConnected) {
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) await this.client.del(keys);
            } else if (this.memoryCache) {
                this.memoryCache.clear();
            }
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    middleware(ttlSeconds = 300, keyGenerator = null) {
        return async (req, res, next) => {
            const key = keyGenerator ? keyGenerator(req) : `${req.method}:${req.originalUrl}`;
            try {
                const cached = await this.get(key);
                if (cached) return res.json(cached);
                const originalJson = res.json;
                res.json = function (data) {
                    this.set(key, data, ttlSeconds);
                    return originalJson.call(this, data);
                }.bind(this);
                next();
            } catch (_error) {
                next();
            }
        };
    }
}

export const cache = new CacheManager();

export const cacheKeys = {
    user: (userId) => `user:${userId}`,
    agent: (agentId) => `agent:${agentId}`,
    analytics: (type, userId, date) => `analytics:${type}:${userId}:${date}`,
    community: (postId) => `community:${postId}`,
    search: (query, filters) => `search:${query}:${JSON.stringify(filters)}`,
    api: (method, path) => `api:${method}:${path}`,
};

export const queryCache = {
    query: async (queryKey, queryFn, ttl = 300) => {
        const cached = await cache.get(queryKey);
        if (cached) return cached;
        const result = await queryFn();
        if (result) await cache.set(queryKey, result, ttl);
        return result;
    },
    invalidate: async (pattern) => await cache.clear(pattern),
    userData: async (userId, dataType, queryFn, ttl = 600) => {
        const key = `user:${userId}:${dataType}`;
        return queryCache.query(key, queryFn, ttl);
    },
    analytics: async (type, params, queryFn, ttl = 1800) => {
        const key = `analytics:${type}:${JSON.stringify(params)}`;
        return queryCache.query(key, queryFn, ttl);
    },
};
