/**
 * Maula AI — Service Worker
 * PWA: Offline support, caching, push notifications
 *
 * Strategy:
 *   - App Shell (HTML/CSS/JS)   → Cache-first, update in background
 *   - API calls                 → Network-first, fall back to cache
 *   - Static assets (fonts/img) → Cache-first, long TTL
 *   - Navigation                → Network-first, offline fallback page
 */

const CACHE_VERSION = 'maula-v4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Core app shell — precached on install
const APP_SHELL = [
    '/',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/apple-touch-icon.png',
    '/offline.html',
];

// Paths that should NEVER be cached
const NEVER_CACHE = [
    '/api/auth',
    '/api/canvas/generate',
    '/api/canvas/chat',
    '/api/studio/chat/stream',
    '/api/studio/chat',
    '/api/admin/realtime',
];

// ─── Install ──────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v' + CACHE_VERSION);
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(APP_SHELL).catch((err) => {
                console.warn('[SW] Precache partial failure (non-fatal):', err.message);
                return Promise.resolve();
            });
        })
    );
    self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v' + CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
                    .map((key) => {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    })
            );
        })
    );
    self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

    // Skip speculative prefetch/prerender requests — let browser/CDN handle them directly
    const secPurpose = request.headers.get('sec-purpose') || '';
    if (secPurpose.startsWith('prefetch') || secPurpose.startsWith('prerender')) return;

    // Skip SSE / EventSource streams — they cannot be cloned or cached
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/event-stream')) return;

    // Never cache auth/payment/streaming endpoints
    if (NEVER_CACHE.some((path) => url.pathname.startsWith(path))) return;

    // Skip agent pages — let nginx/universal-chat handle them
    if (url.pathname.startsWith('/agents/')) return;
    if (url.pathname.startsWith('/assets/')) return;

    // ── API requests: network-first ──
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request, API_CACHE, 5000));
        return;
    }

    // ── Static assets: cache-first ──
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // ── Navigation (HTML pages): network-first with offline fallback ──
    if (request.mode === 'navigate') {
        event.respondWith(navigationHandler(request));
        return;
    }

    // ── Everything else: network-first ──
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, 3000));
});

// ─── Caching strategies ───────────────────────────────────────────

async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

async function networkFirst(request, cacheName, timeout) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

async function navigationHandler(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;

        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) return offlinePage;

        return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline — Maula AI</title></head><body style="font-family:system-ui;background:#0a0a0a;color:#e5e7eb;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div><h1>📡 Offline</h1><p>Check your connection.</p><button onclick="location.reload()" style="background:#6366f1;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:8px;cursor:pointer">Retry</button></div></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
    }
}

function isStaticAsset(pathname) {
    return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|avif|mp4|webm)(\?.*)?$/.test(pathname);
}

// ─── Push Notifications ───────────────────────────────────────────

self.addEventListener('push', (event) => {
    let data = { title: 'Maula AI', body: 'You have a new notification', icon: '/icons/icon-192x192.png' };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/', dateOfArrival: Date.now() },
        actions: data.actions || [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
        tag: data.tag || 'maula-notification',
        renotify: !!data.renotify,
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';
    if (event.action === 'dismiss') return;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            return self.clients.openWindow(targetUrl);
        })
    );
});

// ─── Background Sync ──────────────────────────────────────────────
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-chat-messages') {
        event.waitUntil(Promise.resolve());
    }
});
