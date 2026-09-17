import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdmin, forbidden } from '@/lib/admin-auth';
import { queryChatDb } from '@/lib/chat-db';

export const dynamic = 'force-dynamic';

function ok(data: any) {
    return NextResponse.json({ success: true, data });
}

function err(message: string, status = 500) {
    return NextResponse.json({ success: false, error: message }, { status });
}

function periodToDate(period: string): Date {
    const now = new Date();
    switch (period) {
        case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
        case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
}

// ─── GET /api/admin/dashboard/[...slug] ───────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const admin = await verifyAdmin(req);
    if (!admin) return forbidden();

    const { slug } = await params;
    const path = slug.join('/');
    const url = new URL(req.url);

    try {
        // ─── OVERVIEW ──────────────────────────────────────
        if (path === 'overview') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const fiveMin = new Date(now.getTime() - 5 * 60 * 1000);

            const [
                userTotal, usersToday, usersWeek,
                visitorTotal, visitorsToday, visitorsWeek,
                pvTotal, pvToday, pvWeek, pvMonth,
                apiToday, apiWeek,
                toolsToday, eventsToday,
                activeSessions,
                revenue,
            ] = await Promise.all([
                prisma.user.count(),
                prisma.user.count({ where: { createdAt: { gte: today } } }),
                prisma.user.count({ where: { createdAt: { gte: week } } }),
                prisma.visitor.count(),
                prisma.visitor.count({ where: { lastVisit: { gte: today } } }),
                prisma.visitor.count({ where: { lastVisit: { gte: week } } }),
                prisma.pageView.count(),
                prisma.pageView.count({ where: { timestamp: { gte: today } } }),
                prisma.pageView.count({ where: { timestamp: { gte: week } } }),
                prisma.pageView.count({ where: { timestamp: { gte: month } } }),
                prisma.apiUsage.count({ where: { timestamp: { gte: today } } }),
                prisma.apiUsage.count({ where: { timestamp: { gte: week } } }),
                prisma.toolUsage.count({ where: { occurredAt: { gte: today } } }),
                prisma.userEvent.count({ where: { occurredAt: { gte: today } } }),
                prisma.session.count({ where: { isActive: true, lastActivity: { gte: fiveMin } } }),
                prisma.transaction.aggregate({ where: { status: 'completed', type: { in: ['subscription', 'renewal'] } }, _sum: { amount: true }, _count: true }),
            ]);

            // Query real chat data from universal-chat backend DB
            let chatsToday = 0;
            let chatsWeek = 0;
            try {
                const [todayRows, weekRows] = await Promise.all([
                    queryChatDb<{ count: string }>('SELECT COUNT(*) as count FROM chat_sessions WHERE "createdAt" >= $1', [today]),
                    queryChatDb<{ count: string }>('SELECT COUNT(*) as count FROM chat_sessions WHERE "createdAt" >= $1', [week]),
                ]);
                chatsToday = parseInt(todayRows[0]?.count || '0', 10);
                chatsWeek = parseInt(weekRows[0]?.count || '0', 10);
            } catch (e) {
                console.error('[Admin Dashboard] Failed to query chat DB:', e);
                // Fall back to main DB
                chatsToday = await prisma.chatAnalyticsInteraction.count({ where: { startedAt: { gte: today } } });
                chatsWeek = await prisma.chatAnalyticsInteraction.count({ where: { startedAt: { gte: week } } });
            }

            return ok({
                realtime: { activeSessions, timestamp: now.toISOString() },
                users: { total: userTotal, newToday: usersToday, new7d: usersWeek },
                visitors: { total: visitorTotal, today: visitorsToday, last7d: visitorsWeek },
                pageViews: { total: pvTotal, today: pvToday, last7d: pvWeek, last30d: pvMonth },
                apiCalls: { today: apiToday, last7d: apiWeek },
                chats: { today: chatsToday, last7d: chatsWeek },
                tools: { today: toolsToday },
                events: { today: eventsToday },
                revenue: { total: Math.round((revenue._sum.amount || 0) * 100), transactions: revenue._count },
            });
        }

        // ─── REALTIME ──────────────────────────────────────
        if (path === 'realtime') {
            const now = new Date();
            const fiveMin = new Date(now.getTime() - 5 * 60 * 1000);
            const oneMin = new Date(now.getTime() - 60 * 1000);

            const [activeSessions, activeVisitors, recentPV, recentAPI, recentSessions, recentErrors] = await Promise.all([
                prisma.session.count({ where: { isActive: true, lastActivity: { gte: fiveMin } } }),
                prisma.visitor.count({ where: { lastVisit: { gte: fiveMin }, isActive: true } }),
                prisma.pageView.findMany({ where: { timestamp: { gte: fiveMin } }, orderBy: { timestamp: 'desc' }, take: 20, select: { url: true, visitorId: true, timestamp: true, userId: true } }),
                prisma.apiUsage.findMany({ where: { timestamp: { gte: oneMin } }, orderBy: { timestamp: 'desc' }, take: 20, select: { endpoint: true, method: true, statusCode: true, responseTime: true, ipAddress: true, timestamp: true } }),
                prisma.session.findMany({ where: { isActive: true, lastActivity: { gte: fiveMin } }, orderBy: { lastActivity: 'desc' }, take: 20, select: { sessionId: true, visitorId: true, userId: true, startTime: true, lastActivity: true, pageViews: true, events: true, duration: true } }),
                prisma.apiUsage.count({ where: { timestamp: { gte: fiveMin }, statusCode: { gte: 500 } } }),
            ]);

            // Query real chat data from universal-chat backend DB
            let recentChats = 0;
            try {
                const rows = await queryChatDb<{ count: string }>('SELECT COUNT(*) as count FROM chat_sessions WHERE "createdAt" >= $1', [fiveMin]);
                recentChats = parseInt(rows[0]?.count || '0', 10);
            } catch (e) {
                console.error('[Admin Dashboard Realtime] Failed to query chat DB:', e);
                recentChats = await prisma.chatAnalyticsInteraction.count({ where: { startedAt: { gte: fiveMin } } });
            }

            return ok({
                activeSessions, activeVisitors,
                recentPageViews: recentPV,
                recentApiCalls: recentAPI,
                recentSessions: recentSessions,
                recentChats, recentErrors,
                timestamp: now.toISOString(),
            });
        }

        // ─── VISITORS ──────────────────────────────────────
        // ─── VISITORS (list) ────────────────────────────────
        if (path === 'visitors') {
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const search = url.searchParams.get('search') || '';
            const device = url.searchParams.get('device') || '';

            const where: any = {};
            if (search) {
                where.OR = [
                    { ipAddress: { contains: search, mode: 'insensitive' } },
                    { browser: { contains: search, mode: 'insensitive' } },
                    { os: { contains: search, mode: 'insensitive' } },
                    { country: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (device && device !== 'all') where.device = device;

            const [visitors, total] = await Promise.all([
                prisma.visitor.findMany({ where, orderBy: { lastVisit: 'desc' }, skip: (page - 1) * limit, take: limit }),
                prisma.visitor.count({ where }),
            ]);

            return ok({ visitors, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
        }

        // ─── SESSIONS ──────────────────────────────────────
        if (path === 'sessions') {
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const active = url.searchParams.get('active');

            const where: any = {};
            if (active === 'true') where.isActive = true;
            else if (active === 'false') where.isActive = false;

            const [sessions, total] = await Promise.all([
                prisma.session.findMany({ where, orderBy: { lastActivity: 'desc' }, skip: (page - 1) * limit, take: limit }),
                prisma.session.count({ where }),
            ]);

            return ok({ sessions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
        }

        // ─── USERS ─────────────────────────────────────────
        if (path === 'users') {
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const search = url.searchParams.get('search') || '';
            const role = url.searchParams.get('role') || '';

            const where: any = {};
            if (search) {
                where.OR = [
                    { email: { contains: search, mode: 'insensitive' } },
                    { name: { contains: search, mode: 'insensitive' } },
                    { id: { contains: search } },
                ];
            }
            if (role && role !== 'all') where.role = role;

            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: {
                        id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true,
                        lastLoginAt: true, isActive: true, image: true, avatar: true,
                        subscriptions: { where: { status: 'active' }, select: { plan: true, status: true }, take: 1 },
                    },
                }),
                prisma.user.count({ where }),
            ]);

            const mapped = users.map(u => ({
                ...u,
                profileImage: u.avatar || u.image || null,
                subscriptionTier: u.subscriptions[0]?.plan || null,
                subscriptionStatus: u.subscriptions[0]?.status || null,
                loginCount: 0,
            }));

            return ok({ users: mapped, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
        }

        // ─── HEALTH ────────────────────────────────────────
        if (path === 'health') {
            const start = Date.now();
            await prisma.$queryRaw`SELECT 1`;
            const dbLatency = Date.now() - start;
            const mem = process.memoryUsage();

            return ok({
                status: dbLatency < 500 ? 'healthy' : 'degraded',
                uptime: process.uptime(),
                memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, external: mem.external },
                dbLatency,
                nodeVersion: process.version,
                platform: process.platform,
                pid: process.pid,
                timestamp: new Date().toISOString(),
            });
        }

        // ─── PAGEVIEWS ─────────────────────────────────────
        if (path === 'pageviews') {
            const period = url.searchParams.get('period') || '7d';
            const since = periodToDate(period);

            const [topPages, total, timeline] = await Promise.all([
                prisma.pageView.groupBy({ by: ['url'], where: { timestamp: { gte: since } }, _count: true, orderBy: { _count: { url: 'desc' } }, take: 30 }),
                prisma.pageView.count({ where: { timestamp: { gte: since } } }),
                prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT DATE("timestamp") as date, COUNT(*)::int as count 
          FROM page_views WHERE "timestamp" >= ${since} 
          GROUP BY DATE("timestamp") ORDER BY date ASC
        `,
            ]);

            return ok({
                topPages: topPages.map(p => ({ url: p.url, views: p._count })),
                timeline: (timeline as any[]).map(t => ({ date: String(t.date).slice(0, 10), count: Number(t.count) })),
                total,
                period,
            });
        }

        // ─── GEO ───────────────────────────────────────────
        if (path === 'geo') {
            const [countries, cities] = await Promise.all([
                prisma.visitor.groupBy({ by: ['country'], _count: true, orderBy: { _count: { country: 'desc' } }, take: 30 }),
                prisma.visitor.groupBy({ by: ['city', 'country'], _count: true, orderBy: { _count: { city: 'desc' } }, take: 30 }),
            ]);

            return ok({
                countries: countries.map(c => ({ country: c.country, count: c._count })),
                cities: cities.map(c => ({ city: c.city, country: c.country, count: c._count })),
            });
        }

        // ─── DEVICES ───────────────────────────────────────
        if (path === 'devices') {
            const [devices, browsers, os] = await Promise.all([
                prisma.visitor.groupBy({ by: ['device'], _count: true, orderBy: { _count: { device: 'desc' } } }),
                prisma.visitor.groupBy({ by: ['browser'], _count: true, orderBy: { _count: { browser: 'desc' } }, take: 15 }),
                prisma.visitor.groupBy({ by: ['os'], _count: true, orderBy: { _count: { os: 'desc' } }, take: 15 }),
            ]);

            return ok({
                devices: devices.map(d => ({ deviceType: d.device, count: d._count })),
                browsers: browsers.map(b => ({ browser: b.browser, count: b._count })),
                os: os.map(o => ({ os: o.os, count: o._count })),
            });
        }

        // ─── ACTIVITY LOG ──────────────────────────────────
        if (path === 'activity-log') {
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '40');
            const fiveMin = new Date(Date.now() - 5 * 60 * 1000);

            const [pvRecent, sessionRecent, eventRecent, apiRecent] = await Promise.all([
                prisma.pageView.findMany({ where: { timestamp: { gte: fiveMin } }, orderBy: { timestamp: 'desc' }, take: 15, select: { id: true, url: true, userId: true, visitorId: true, timestamp: true } }),
                prisma.session.findMany({ where: { lastActivity: { gte: fiveMin } }, orderBy: { lastActivity: 'desc' }, take: 10, select: { id: true, sessionId: true, visitorId: true, userId: true, lastActivity: true, pageViews: true } }),
                prisma.userEvent.findMany({ where: { occurredAt: { gte: fiveMin } }, orderBy: { occurredAt: 'desc' }, take: 10, select: { id: true, eventType: true, category: true, action: true, userId: true, occurredAt: true } }),
                prisma.apiUsage.findMany({ where: { timestamp: { gte: fiveMin } }, orderBy: { timestamp: 'desc' }, take: 10, select: { id: true, endpoint: true, method: true, statusCode: true, ipAddress: true, timestamp: true } }),
            ]);

            const items = [
                ...pvRecent.map(p => ({ id: p.id, type: 'pageview' as const, summary: `Page view: ${p.url}`, details: p.url, userId: p.userId, visitorId: p.visitorId, timestamp: p.timestamp.toISOString() })),
                ...sessionRecent.map(s => ({ id: s.id, type: 'session' as const, summary: `Session active: ${s.pageViews} pages`, details: `Session ${s.sessionId.slice(0, 8)}...`, userId: s.userId, visitorId: s.visitorId, timestamp: s.lastActivity.toISOString() })),
                ...eventRecent.map(e => ({ id: e.id, type: 'event' as const, summary: `${e.category}: ${e.action}`, details: e.eventType, userId: e.userId, timestamp: e.occurredAt.toISOString() })),
                ...apiRecent.map(a => ({ id: a.id, type: 'api' as const, summary: `${a.method} ${a.endpoint} → ${a.statusCode}`, details: a.endpoint, ip: a.ipAddress, timestamp: a.timestamp.toISOString() })),
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            const paged = items.slice((page - 1) * limit, page * limit);

            return ok({ items: paged, total: items.length });
        }

        // ─── CHATS ─────────────────────────────────────────
        if (path === 'chats') {
            const period = url.searchParams.get('period') || '7d';
            const since = periodToDate(period);

            try {
                const [summaryRows, byAgentRows, recentRows] = await Promise.all([
                    queryChatDb<{ total_chats: string; total_messages: string; avg_messages: string }>(
                        `SELECT COUNT(*) as total_chats,
                                COALESCE(SUM((stats->>'messageCount')::int), 0) as total_messages,
                                COALESCE(AVG((stats->>'messageCount')::float), 0) as avg_messages
                         FROM chat_sessions WHERE "createdAt" >= $1`, [since]
                    ),
                    queryChatDb<{ agent_id: string | null; chats: string }>(
                        `SELECT "agentId" as agent_id, COUNT(*) as chats
                         FROM chat_sessions WHERE "createdAt" >= $1
                         GROUP BY "agentId" ORDER BY chats DESC LIMIT 20`, [since]
                    ),
                    queryChatDb<{ session_id: string; user_id: string; agent_id: string | null; name: string; created_at: string; is_active: boolean }>(
                        `SELECT "sessionId" as session_id, "userId" as user_id, "agentId" as agent_id, name, "createdAt" as created_at, "isActive" as is_active
                         FROM chat_sessions WHERE "createdAt" >= $1
                         ORDER BY "createdAt" DESC LIMIT 50`, [since]
                    ),
                ]);

                const s = summaryRows[0];
                return ok({
                    summary: {
                        totalChats: parseInt(s?.total_chats || '0', 10),
                        totalTokens: parseInt(s?.total_messages || '0', 10),
                        avgDuration: 0,
                        avgTurns: Math.round(parseFloat(s?.avg_messages || '0') * 10) / 10,
                    },
                    chatsByAgent: byAgentRows.map(a => ({ agentId: a.agent_id || 'unknown', chats: parseInt(a.chats, 10), tokens: 0 })),
                    recentChats: recentRows.map(r => ({
                        conversationId: r.session_id,
                        userId: r.user_id,
                        agentId: r.agent_id,
                        channel: 'web',
                        totalTokens: 0,
                        durationMs: 0,
                        turnCount: 0,
                        startedAt: r.created_at,
                        status: r.is_active ? 'active' : 'closed',
                    })),
                    period,
                });
            } catch (e) {
                console.error('[Admin Dashboard Chats] Failed to query chat DB, falling back:', e);
                // Fallback to main DB
                const [summary, byAgent, recent] = await Promise.all([
                    prisma.chatAnalyticsInteraction.aggregate({
                        where: { startedAt: { gte: since } },
                        _count: true,
                        _sum: { totalTokens: true, durationMs: true, turnCount: true },
                        _avg: { durationMs: true, turnCount: true },
                    }),
                    prisma.chatAnalyticsInteraction.groupBy({
                        by: ['agentId'],
                        where: { startedAt: { gte: since } },
                        _count: true,
                        _sum: { totalTokens: true },
                        orderBy: { _count: { agentId: 'desc' } },
                        take: 20,
                    }),
                    prisma.chatAnalyticsInteraction.findMany({
                        where: { startedAt: { gte: since } },
                        orderBy: { startedAt: 'desc' },
                        take: 50,
                        select: { conversationId: true, userId: true, agentId: true, channel: true, totalTokens: true, durationMs: true, turnCount: true, startedAt: true, status: true },
                    }),
                ]);
                return ok({
                    summary: {
                        totalChats: summary._count,
                        totalTokens: summary._sum.totalTokens || 0,
                        avgDuration: Math.round(summary._avg.durationMs || 0),
                        avgTurns: Math.round((summary._avg.turnCount || 0) * 10) / 10,
                    },
                    chatsByAgent: byAgent.map(a => ({ agentId: a.agentId || 'unknown', chats: a._count, tokens: a._sum.totalTokens || 0 })),
                    recentChats: recent,
                    period,
                });
            }
        }

        // ─── TOOLS ─────────────────────────────────────────
        if (path === 'tools') {
            const period = url.searchParams.get('period') || '7d';
            const since = periodToDate(period);

            const [summary, tools] = await Promise.all([
                prisma.toolUsage.aggregate({
                    where: { occurredAt: { gte: since } },
                    _count: true,
                    _avg: { latencyMs: true, tokensInput: true, tokensOutput: true },
                    _sum: { tokensInput: true, tokensOutput: true },
                }),
                prisma.toolUsage.groupBy({
                    by: ['toolName'],
                    where: { occurredAt: { gte: since } },
                    _count: true,
                    _avg: { latencyMs: true, tokensInput: true, tokensOutput: true },
                    orderBy: { _count: { toolName: 'desc' } },
                    take: 30,
                }),
            ]);

            return ok({
                summary: {
                    totalUsage: summary._count,
                    avgLatency: Math.round(summary._avg.latencyMs || 0),
                    totalTokensInput: summary._sum.tokensInput || 0,
                    totalTokensOutput: summary._sum.tokensOutput || 0,
                },
                tools: tools.map(t => ({
                    name: t.toolName,
                    count: t._count,
                    avgLatency: Math.round(t._avg.latencyMs || 0),
                    avgTokensIn: Math.round(t._avg.tokensInput || 0),
                    avgTokensOut: Math.round(t._avg.tokensOutput || 0),
                })),
                period,
            });
        }

        // ─── REVENUE ───────────────────────────────────────
        if (path === 'revenue') {
            const period = url.searchParams.get('period') || '30d';
            const since = periodToDate(period);

            const [summary, byType, recent] = await Promise.all([
                prisma.transaction.aggregate({
                    where: { createdAt: { gte: since }, status: 'completed', type: { in: ['subscription', 'renewal'] } },
                    _sum: { amount: true },
                    _count: true,
                    _avg: { amount: true },
                }),
                prisma.transaction.groupBy({
                    by: ['type'],
                    where: { createdAt: { gte: since }, status: 'completed' },
                    _sum: { amount: true },
                    _count: true,
                    orderBy: { _sum: { amount: 'desc' } },
                }),
                prisma.transaction.findMany({
                    where: { createdAt: { gte: since } },
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    select: { id: true, userId: true, type: true, amount: true, currency: true, status: true, notes: true, createdAt: true },
                }),
            ]);

            return ok({
                summary: {
                    totalRevenue: Math.round((summary._sum.amount || 0) * 100),
                    transactionCount: summary._count,
                    avgAmount: Math.round((summary._avg.amount || 0) * 100),
                },
                byType: byType.map(t => ({ type: t.type, total: Math.round((t._sum.amount || 0) * 100), count: t._count })),
                recentTransactions: recent.map(t => ({
                    ...t,
                    amount: Math.round(t.amount * 100),
                    description: t.notes,
                })),
                period,
            });
        }

        // ─── EVENTS ────────────────────────────────────────
        if (path === 'events') {
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '30');
            const type = url.searchParams.get('type') || '';
            const category = url.searchParams.get('category') || '';

            const where: any = {};
            if (type) where.eventType = { contains: type, mode: 'insensitive' };
            if (category && category !== 'all') where.category = category;

            const [events, total] = await Promise.all([
                prisma.userEvent.findMany({
                    where,
                    orderBy: { occurredAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: { id: true, userId: true, eventType: true, category: true, properties: true, occurredAt: true },
                }),
                prisma.userEvent.count({ where }),
            ]);

            return ok({
                events: events.map(e => ({
                    id: e.id,
                    userId: e.userId,
                    event: e.eventType,
                    category: e.category,
                    metadata: e.properties,
                    timestamp: e.occurredAt.toISOString(),
                })),
                total,
            });
        }

        // ─── API USAGE ─────────────────────────────────────
        if (path === 'api-usage') {
            const period = url.searchParams.get('period') || '24h';
            const since = periodToDate(period);

            const [summary, topEndpoints, errorEndpoints, statusCodes, slowEndpoints] = await Promise.all([
                prisma.apiUsage.aggregate({
                    where: { timestamp: { gte: since } },
                    _count: true,
                    _avg: { responseTime: true },
                }),
                prisma.apiUsage.groupBy({
                    by: ['endpoint'],
                    where: { timestamp: { gte: since } },
                    _count: true,
                    _avg: { responseTime: true },
                    orderBy: { _count: { endpoint: 'desc' } },
                    take: 20,
                }),
                prisma.apiUsage.groupBy({
                    by: ['endpoint'],
                    where: { timestamp: { gte: since }, statusCode: { gte: 400 } },
                    _count: true,
                    orderBy: { _count: { endpoint: 'desc' } },
                    take: 10,
                }),
                prisma.apiUsage.groupBy({
                    by: ['statusCode'],
                    where: { timestamp: { gte: since } },
                    _count: true,
                    orderBy: { _count: { statusCode: 'desc' } },
                }),
                prisma.apiUsage.findMany({
                    where: { timestamp: { gte: since }, responseTime: { gt: 1000 } },
                    orderBy: { responseTime: 'desc' },
                    take: 20,
                    select: { endpoint: true, method: true, statusCode: true, responseTime: true, timestamp: true },
                }),
            ]);

            const errorCount = await prisma.apiUsage.count({ where: { timestamp: { gte: since }, statusCode: { gte: 400 } } });
            const totalCalls = summary._count;

            return ok({
                summary: {
                    totalCalls,
                    errorCount,
                    errorRate: totalCalls > 0 ? `${((errorCount / totalCalls) * 100).toFixed(1)}%` : '0%',
                    avgResponseTime: Math.round(summary._avg.responseTime || 0),
                },
                topEndpoints: topEndpoints.map(e => ({ endpoint: e.endpoint, calls: e._count, avgResponseTime: Math.round(e._avg.responseTime || 0) })),
                errorEndpoints: errorEndpoints.map(e => ({ endpoint: e.endpoint, errors: e._count })),
                statusCodes: statusCodes.map(s => ({ code: s.statusCode, count: s._count })),
                slowEndpoints,
                period,
            });
        }

        // ─── VISITOR DETAIL ─────────────────────────────────
        const visitorMatch = path.match(/^visitors\/(.+)$/);
        if (visitorMatch) {
            const visitorId = visitorMatch[1];
            const visitor = await prisma.visitor.findFirst({ where: { visitorId } });
            if (!visitor) return err('Visitor not found', 404);

            const [sessions, pageViews, recentPages] = await Promise.all([
                prisma.session.findMany({ where: { visitorId }, orderBy: { lastActivity: 'desc' }, take: 20 }),
                prisma.pageView.count({ where: { visitorId } }),
                prisma.pageView.findMany({ where: { visitorId }, orderBy: { timestamp: 'desc' }, take: 50 }),
            ]);

            return ok({ visitor, sessions, pageViewCount: pageViews, recentPageViews: recentPages });
        }

        // ─── EMAILS ─────────────────────────────────────────
        if (path === 'emails') {
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const type = url.searchParams.get('type') || undefined;
            const status = url.searchParams.get('status') || undefined;
            const period = url.searchParams.get('period') || '30d';
            const since = periodToDate(period);
            const skip = (page - 1) * limit;

            const where: any = { createdAt: { gte: since } };
            if (type) where.type = type;
            if (status) where.status = status;

            const [items, total, stats] = await Promise.all([
                prisma.emailLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.emailLog.count({ where }),
                prisma.$queryRaw`
                    SELECT
                        COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
                        COUNT(*) FILTER (WHERE status = 'opened')::int AS opened,
                        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
                    FROM email_logs
                    WHERE "createdAt" >= ${since}
                `,
            ]);

            // Type breakdown
            const typeBreakdown = await prisma.$queryRaw`
                SELECT
                    type,
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status = 'opened')::int AS opened
                FROM email_logs
                WHERE "createdAt" >= ${since}
                GROUP BY type
                ORDER BY total DESC
            `;

            const s = (stats as any[])[0] || { total: 0, sent: 0, opened: 0, failed: 0 };
            const openRate = s.sent > 0 ? Math.round((s.opened / s.sent) * 10000) / 100 : 0;

            return ok({
                items,
                total,
                page,
                pages: Math.ceil(total / limit),
                stats: { ...s, openRate },
                typeBreakdown,
            });
        }

        // ─── USER DETAIL ───────────────────────────────────
        const userDetailMatch = path.match(/^users\/([^/]+)$/);
        if (userDetailMatch) {
            const userId = userDetailMatch[1];
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true,
                    lastLoginAt: true, isActive: true, image: true, avatar: true,
                    subscriptions: { select: { plan: true, status: true, startDate: true, endDate: true }, take: 5 },
                },
            });
            if (!user) return err('User not found', 404);

            const [pageViews, events, sessions] = await Promise.all([
                prisma.pageView.count({ where: { userId } }),
                prisma.userEvent.count({ where: { userId } }),
                prisma.session.findMany({ where: { userId }, orderBy: { lastActivity: 'desc' }, take: 10 }),
            ]);

            return ok({ user, stats: { pageViews, events, sessions: sessions.length }, recentSessions: sessions });
        }

        return err('Not found', 404);
    } catch (error: any) {
        console.error(`[admin-dashboard] ${path} error:`, error.message);
        return err('Internal server error');
    }
}

// ─── PATCH /api/admin/dashboard/[...slug] ─────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const admin = await verifyAdmin(req);
    if (!admin) return forbidden();

    const { slug } = await params;
    const path = slug.join('/');

    try {
        // PATCH /users/:id/role
        const roleMatch = path.match(/^users\/([^/]+)\/role$/);
        if (roleMatch) {
            const userId = roleMatch[1];
            const { role } = await req.json();
            if (!['admin', 'moderator', 'user'].includes(role)) return err('Invalid role', 400);
            await prisma.user.update({ where: { id: userId }, data: { role } });
            return NextResponse.json({ success: true, message: 'Role updated' });
        }

        // PATCH /users/:id/status
        const statusMatch = path.match(/^users\/([^/]+)\/status$/);
        if (statusMatch) {
            const userId = statusMatch[1];
            const { isActive } = await req.json();
            await prisma.user.update({ where: { id: userId }, data: { isActive } });
            return NextResponse.json({ success: true, message: 'Status updated' });
        }

        return err('Not found', 404);
    } catch (error: any) {
        console.error(`[admin-dashboard] PATCH ${path} error:`, error.message);
        return err('Internal server error');
    }
}
