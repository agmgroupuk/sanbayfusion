/**
 * TRACKING MIDDLEWARE
 * Visitor and page view tracking for analytics
 * Includes user-agent parsing and geo-IP lookup
 */

import { prisma } from './prisma.js';
import crypto from 'crypto';

// ============================================
// USER-AGENT PARSING
// ============================================

function parseUserAgent(ua) {
    if (!ua) return { device: 'desktop', browser: 'Unknown', os: 'Unknown' };
    
    // Device
    let device = 'desktop';
    if (/mobi|android.*mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) device = 'mobile';
    else if (/tablet|ipad|playbook|silk|kindle/i.test(ua)) device = 'tablet';
    
    // Browser
    let browser = 'Unknown';
    if (/edg\//i.test(ua)) browser = 'Edge';
    else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
    else if (/firefox\//i.test(ua)) browser = 'Firefox';
    else if (/chrome\//i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
    else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/msie|trident/i.test(ua)) browser = 'IE';
    
    // OS
    let os = 'Unknown';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os|macintosh/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua) && !/android/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/cros/i.test(ua)) os = 'ChromeOS';

    return { device, browser, os };
}

// ============================================
// GEO-IP LOOKUP
// ============================================

function isPrivateIP(ip) {
    if (!ip) return true;
    return /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|::1|fd|fe80|localhost)/.test(ip);
}

// Cache geo lookups for 1 hour to avoid repeated API calls
const geoCache = new Map();
const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function lookupGeo(ip) {
    if (!ip || isPrivateIP(ip)) return { country: 'Unknown', city: 'Unknown' };
    
    // Check cache
    const cached = geoCache.get(ip);
    if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL) {
        return cached.data;
    }
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        const res = await fetch(
            `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`,
            { signal: controller.signal }
        );
        clearTimeout(timeout);
        
        if (!res.ok) return { country: 'Unknown', city: 'Unknown' };
        
        const data = await res.json();
        if (data.status === 'success') {
            const result = { country: data.country || 'Unknown', city: data.city || 'Unknown' };
            geoCache.set(ip, { data: result, timestamp: Date.now() });
            return result;
        }
    } catch {
        // Silent fail — don't block tracking for geo
    }
    return { country: 'Unknown', city: 'Unknown' };
}

// ============================================
// INITIALIZE TRACKING
// ============================================

export function initializeTracking(req, res, next) {
    // Attach tracking metadata to request
    req.trackingId = req.cookies?.trackingId || crypto.randomUUID();

    // Set tracking cookie if not present
    if (!req.cookies?.trackingId) {
        res.cookie('trackingId', req.trackingId, {
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
        });
    }

    next();
}

// ============================================
// VISITOR TRACKING MIDDLEWARE
// ============================================

export function trackVisitorMiddleware(req, res, next) {
    // Skip static assets / health checks
    if (req.path === '/health' || req.path === '/version' || req.path.startsWith('/static')) {
        return next();
    }

    // Fire-and-forget visitor tracking
    const visitorId = req.trackingId || 'anonymous';
    const ipAddress = (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '').replace(/^::ffff:/, '');
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || '';
    const { device, browser, os } = parseUserAgent(userAgent);

    setImmediate(async () => {
        try {
            // Geo-IP lookup (non-blocking)
            const geo = await lookupGeo(ipAddress);
            
            await prisma.visitor.upsert({
                where: { visitorId },
                update: {
                    lastVisit: new Date(),
                    visitCount: { increment: 1 },
                    ipAddress,
                    userAgent,
                    device,
                    browser,
                    os,
                    country: geo.country,
                    city: geo.city,
                    isActive: true,
                },
                create: {
                    visitorId,
                    ipAddress,
                    userAgent,
                    referrer,
                    landingPage: req.path || '/',
                    device,
                    browser,
                    os,
                    country: geo.country,
                    city: geo.city,
                    lastVisit: new Date(),
                    visitCount: 1,
                    isActive: true,
                },
            });
        } catch (err) {
            // Silently fail — tracking should never block requests
            if (process.env.NODE_ENV === 'development') {
                console.warn('[tracking] visitor upsert failed:', err.message);
            }
        }
    });

    next();
}

// ============================================
// PAGE VIEW TRACKING MIDDLEWARE
// ============================================

export function trackPageViewMiddleware(req, res, next) {
    // Only track GET requests to pages (not API calls or assets)
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/static')) {
        return next();
    }

    const visitorId = req.trackingId || 'anonymous';
    const url = req.path;
    const referrer = req.headers['referer'] || '';
    const userAgent = req.headers['user-agent'] || '';

    setImmediate(async () => {
        try {
            await prisma.pageView.create({
                data: {
                    visitorId,
                    url,
                    referrer,
                    timestamp: new Date(),
                },
            });
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[tracking] pageView create failed:', err.message);
            }
        }
    });

    next();
}
