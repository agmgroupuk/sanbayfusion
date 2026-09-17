/**
 * CACHE MANAGER (In-Memory, optional Redis)
 * Self-contained — no dependency on shared backend/lib/cache.js
 */

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
            this.client.on('ready', () => { this.isConnected = true; });
            this.client.on('error', (err) => {
                console.warn('⚠️ Redis connection error:', err.message);
                this.isConnected = false;
            });
            this.client.on('close', () => { this.isConnected = false; });

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
export default cache;
