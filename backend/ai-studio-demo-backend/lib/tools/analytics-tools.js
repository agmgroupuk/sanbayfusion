/**
 * ANALYTICS & MONITORING TOOLS (5 tools)
 * analytics_track, analytics_dashboard, log_parse,
 * monitor_health, telemetry_send
 * 
 * All state persisted in PostgreSQL via Prisma — NO localStorage
 */

import { prisma } from '../prisma.js';

// ── analytics_track ─────────────────────────────────────────────
async function analyticsTrack(params) {
    const { action = 'event', userId, ...opts } = params;
    if (!userId) return { success: false, error: 'userId is required' };

    const visitorId = opts.visitorId || `visitor_${userId}`;
    const sessionId = opts.sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    try {
        switch (action) {
            case 'event': {
                const { eventName, category = 'general', properties = {} } = opts;
                if (!eventName) return { success: false, error: 'eventName required' };
                const event = await prisma.analyticsEvent.create({
                    data: {
                        visitorId,
                        sessionId,
                        userId,
                        eventName,
                        eventData: { category, ...properties },
                    },
                });
                return { success: true, eventId: event.id, eventName, tracked: true };
            }

            case 'page_view': {
                const event = await prisma.analyticsEvent.create({
                    data: {
                        visitorId,
                        sessionId,
                        userId,
                        eventName: 'page_view',
                        eventData: {
                            category: 'navigation',
                            page: opts.page || '/',
                            title: opts.title || '',
                            url: opts.page || opts.url || null,
                            referrer: opts.referrer || null,
                        },
                    },
                });
                return { success: true, eventId: event.id, type: 'page_view', tracked: true };
            }

            case 'batch': {
                const { events = [] } = opts;
                if (events.length === 0) return { success: false, error: 'events array required' };
                const created = await prisma.analyticsEvent.createMany({
                    data: events.map(e => ({
                        visitorId,
                        sessionId: e.sessionId || sessionId,
                        userId,
                        eventName: e.eventName || e.name,
                        eventData: { category: e.category || 'general', ...(e.properties || {}) },
                    })),
                });
                return { success: true, tracked: created.count, total: events.length };
            }

            default:
                return { success: false, error: `Unknown analytics_track action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── analytics_dashboard ─────────────────────────────────────────
async function analyticsDashboard(params) {
    const { action = 'overview', userId, ...opts } = params;

    try {
        switch (action) {
            case 'overview': {
                const now = new Date();
                const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
                const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

                const where = userId ? { userId } : {};
                const [totalEvents, last24h, last7d] = await Promise.all([
                    prisma.analyticsEvent.count({ where }),
                    prisma.analyticsEvent.count({ where: { ...where, timestamp: { gte: dayAgo } } }),
                    prisma.analyticsEvent.count({ where: { ...where, timestamp: { gte: weekAgo } } }),
                ]);

                // Top events via raw SQL (table is mapped to "analytics_events")
                let topEvents = [];
                try {
                    topEvents = userId
                        ? await prisma.$queryRawUnsafe(
                            `SELECT "eventName", COUNT(*)::int as count FROM "analytics_events" WHERE "userId" = $1 GROUP BY "eventName" ORDER BY count DESC LIMIT 10`,
                            userId
                        )
                        : await prisma.$queryRawUnsafe(
                            `SELECT "eventName", COUNT(*)::int as count FROM "analytics_events" GROUP BY "eventName" ORDER BY count DESC LIMIT 10`
                        );
                } catch { /* table may not exist yet */ }

                return {
                    success: true,
                    overview: { totalEvents, last24h, last7d },
                    topEvents: Array.isArray(topEvents) ? topEvents : [],
                };
            }

            case 'events': {
                const { eventName, limit = 50, offset = 0, from, to } = opts;
                const where = {};
                if (userId) where.userId = userId;
                if (eventName) where.eventName = eventName;
                if (from || to) {
                    where.timestamp = {};
                    if (from) where.timestamp.gte = new Date(from);
                    if (to) where.timestamp.lte = new Date(to);
                }
                const [events, total] = await Promise.all([
                    prisma.analyticsEvent.findMany({ where, take: limit, skip: offset, orderBy: { timestamp: 'desc' } }),
                    prisma.analyticsEvent.count({ where }),
                ]);
                return { success: true, events, total, limit, offset };
            }

            case 'funnel': {
                const { steps = [] } = opts;
                if (steps.length === 0) return { success: false, error: 'steps array required' };
                const where = userId ? { userId } : {};
                const results = [];
                for (const step of steps) {
                    const count = await prisma.analyticsEvent.count({
                        where: { ...where, eventName: step },
                    });
                    results.push({ step, count });
                }
                return {
                    success: true,
                    funnel: results.map((r, i) => ({
                        step: r.step,
                        count: r.count,
                        dropoff: i > 0 ? Math.round((1 - r.count / (results[i - 1].count || 1)) * 100) : 0,
                    })),
                };
            }

            default:
                return { success: false, error: `Unknown analytics_dashboard action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── log_parse ───────────────────────────────────────────────────
async function logParse(params) {
    const { action = 'parse', content, ...opts } = params;
    if (!content && action !== 'stats') return { success: false, error: 'content is required' };

    try {
        switch (action) {
            case 'parse': {
                const lines = content.split('\n').filter(l => l.trim());
                const entries = [];
                for (const line of lines) {
                    const entry = { raw: line };
                    // Try common formats
                    // ISO timestamp
                    const isoMatch = line.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?)/);
                    if (isoMatch) entry.timestamp = isoMatch[1];
                    // Log level
                    const levelMatch = line.match(/\b(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL|TRACE)\b/i);
                    if (levelMatch) entry.level = levelMatch[1].toUpperCase();
                    // JSON extraction
                    const jsonMatch = line.match(/\{.*\}/);
                    if (jsonMatch) {
                        try { entry.json = JSON.parse(jsonMatch[0]); } catch { /* not json */ }
                    }
                    // IP address
                    const ipMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                    if (ipMatch) entry.ip = ipMatch[1];
                    // HTTP method + path
                    const httpMatch = line.match(/"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^"]+)"/);
                    if (httpMatch) { entry.method = httpMatch[1]; entry.path = httpMatch[2].split(' ')[0]; }
                    // HTTP status
                    const statusMatch = line.match(/\s(\d{3})\s/);
                    if (statusMatch) entry.status = parseInt(statusMatch[1]);

                    entries.push(entry);
                }
                return { success: true, entries, total: entries.length };
            }

            case 'filter': {
                const lines = content.split('\n').filter(l => l.trim());
                let filtered = lines;
                if (opts.level) filtered = filtered.filter(l => l.match(new RegExp(`\\b${opts.level}\\b`, 'i')));
                if (opts.contains) filtered = filtered.filter(l => l.includes(opts.contains));
                if (opts.regex) filtered = filtered.filter(l => l.match(new RegExp(opts.regex, 'i')));
                if (opts.from) { const d = new Date(opts.from); filtered = filtered.filter(l => { const m = l.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/); return m && new Date(m[1]) >= d; }); }
                return { success: true, lines: filtered, matched: filtered.length, total: lines.length };
            }

            case 'stats': {
                const lines = (content || '').split('\n').filter(l => l.trim());
                const levels = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 };
                const statusCodes = {};
                const ipCounts = {};
                for (const line of lines) {
                    const levelMatch = line.match(/\b(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL|TRACE)\b/i);
                    if (levelMatch) {
                        let lvl = levelMatch[1].toUpperCase();
                        if (lvl === 'WARNING') lvl = 'WARN';
                        if (lvl === 'CRITICAL') lvl = 'FATAL';
                        levels[lvl] = (levels[lvl] || 0) + 1;
                    }
                    const statusMatch = line.match(/\s(\d{3})\s/);
                    if (statusMatch) statusCodes[statusMatch[1]] = (statusCodes[statusMatch[1]] || 0) + 1;
                    const ipMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                    if (ipMatch) ipCounts[ipMatch[1]] = (ipCounts[ipMatch[1]] || 0) + 1;
                }
                return {
                    success: true,
                    totalLines: lines.length,
                    levels,
                    statusCodes,
                    topIPs: Object.entries(ipCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ip, count]) => ({ ip, count })),
                    errorRate: lines.length > 0 ? Math.round(((levels.ERROR + levels.FATAL) / lines.length) * 10000) / 100 : 0,
                };
            }

            default:
                return { success: false, error: `Unknown log_parse action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── monitor_health ──────────────────────────────────────────────
async function monitorHealth(params) {
    const { action = 'check', userId, ...opts } = params;

    try {
        switch (action) {
            case 'check': {
                const { url, method = 'GET', timeout = 10000, expectedStatus = 200 } = opts;
                if (!url) return { success: false, error: 'url is required' };
                const start = Date.now();
                try {
                    const res = await fetch(url, { method, timeout });
                    const latency = Date.now() - start;
                    const healthy = res.status === expectedStatus;

                    // Save to DB if userId provided
                    if (userId) {
                        await prisma.healthCheck.upsert({
                            where: { id: opts.checkId || 'new' },
                            update: { lastStatus: String(res.status), lastLatency: latency, lastCheckedAt: new Date() },
                            create: {
                                userId,
                                name: opts.name || url,
                                url,
                                method,
                                timeout,
                                expectedCode: expectedStatus,
                                lastStatus: String(res.status),
                                lastLatency: latency,
                                lastCheckedAt: new Date(),
                            },
                        }).catch(() => { }); // don't fail the check if DB write fails
                    }

                    return { success: true, url, healthy, status: res.status, latencyMs: latency };
                } catch (err) {
                    return { success: true, url, healthy: false, error: err.message, latencyMs: Date.now() - start };
                }
            }

            case 'create': {
                if (!userId) return { success: false, error: 'userId required' };
                const { url, name, method = 'GET', interval = 60, timeout = 10000, expectedStatus = 200 } = opts;
                if (!url || !name) return { success: false, error: 'url and name required' };
                const check = await prisma.healthCheck.create({
                    data: { userId, name, url, method, interval, timeout, expectedCode: expectedStatus, active: true },
                });
                return { success: true, check: { id: check.id, name: check.name, url: check.url } };
            }

            case 'list': {
                if (!userId) return { success: false, error: 'userId required' };
                const checks = await prisma.healthCheck.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                });
                return { success: true, checks };
            }

            case 'status': {
                if (!userId) return { success: false, error: 'userId required' };
                const checks = await prisma.healthCheck.findMany({
                    where: { userId, active: true },
                });
                // Run all checks
                const results = await Promise.all(checks.map(async (check) => {
                    const start = Date.now();
                    try {
                        const res = await fetch(check.url, { method: check.method, timeout: check.timeout });
                        const latency = Date.now() - start;
                        const healthy = res.status === check.expectedCode;
                        await prisma.healthCheck.update({
                            where: { id: check.id },
                            data: { lastStatus: String(res.status), lastLatency: latency, lastCheckedAt: new Date() },
                        }).catch(() => { });
                        return { name: check.name, url: check.url, healthy, status: res.status, latencyMs: latency };
                    } catch (err) {
                        return { name: check.name, url: check.url, healthy: false, error: err.message };
                    }
                }));
                const healthy = results.filter(r => r.healthy).length;
                return { success: true, results, healthy, unhealthy: results.length - healthy, total: results.length };
            }

            case 'delete': {
                if (!opts.id) return { success: false, error: 'check id required' };
                await prisma.healthCheck.delete({ where: { id: opts.id } });
                return { success: true, deleted: true };
            }

            default:
                return { success: false, error: `Unknown monitor_health action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── telemetry_send ──────────────────────────────────────────────
async function telemetrySend(params) {
    const { action = 'send', userId, ...opts } = params;

    try {
        switch (action) {
            case 'send': {
                const { metric, value, tags = {}, unit = '' } = opts;
                if (!metric) return { success: false, error: 'metric name required' };
                // Store as analytics event for persistence
                if (userId) {
                    await prisma.analyticsEvent.create({
                        data: {
                            visitorId: `visitor_${userId}`,
                            sessionId: `telemetry_${Date.now()}`,
                            userId,
                            eventName: `telemetry:${metric}`,
                            eventData: { category: 'telemetry', value, tags, unit, timestamp: new Date().toISOString() },
                        },
                    });
                }
                return { success: true, metric, value, tags, unit, recorded: true };
            }

            case 'batch': {
                const { metrics = [] } = opts;
                if (metrics.length === 0) return { success: false, error: 'metrics array required' };
                if (userId) {
                    await prisma.analyticsEvent.createMany({
                        data: metrics.map(m => ({
                            visitorId: `visitor_${userId}`,
                            sessionId: `telemetry_${Date.now()}`,
                            userId,
                            eventName: `telemetry:${m.metric}`,
                            eventData: { category: 'telemetry', value: m.value, tags: m.tags || {}, unit: m.unit || '' },
                        })),
                    });
                }
                return { success: true, recorded: metrics.length };
            }

            case 'query': {
                const { metric, from, to, limit = 100 } = opts;
                if (!metric) return { success: false, error: 'metric name required' };
                const where = { eventName: `telemetry:${metric}` };
                if (userId) where.userId = userId;
                if (from || to) {
                    where.timestamp = {};
                    if (from) where.timestamp.gte = new Date(from);
                    if (to) where.timestamp.lte = new Date(to);
                }
                const events = await prisma.analyticsEvent.findMany({
                    where,
                    take: limit,
                    orderBy: { timestamp: 'desc' },
                });
                const dataPoints = events.map(e => ({
                    value: e.eventData?.value,
                    tags: e.eventData?.tags,
                    timestamp: e.timestamp,
                }));
                return { success: true, metric, dataPoints, count: dataPoints.length };
            }

            default:
                return { success: false, error: `Unknown telemetry_send action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export default {
    analyticsTrack,
    analyticsDashboard,
    logParse,
    monitorHealth,
    telemetrySend,
};
