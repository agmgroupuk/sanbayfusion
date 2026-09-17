import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * SSE stream for admin real-time analytics.
 * Pushes dashboard + analytics data every 3 seconds.
 * Replaces polling-based approach for instant updates.
 */
export async function GET(req: NextRequest) {
    const admin = await verifyAdmin(req);
    if (!admin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const encoder = new TextEncoder();
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const stream = new ReadableStream({
        start(controller) {
            const send = (event: string, data: any) => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                } catch {
                    closed = true;
                }
            };

            // Tell clients to wait 5s before reconnecting (prevents reconnection storm)
            try {
                controller.enqueue(encoder.encode(`retry: 5000\n\n`));
            } catch { /* ignore */ }

            // Send heartbeat immediately
            send('connected', { status: 'ok', timestamp: new Date().toISOString() });

            const pushUpdate = async () => {
                if (closed) return;
                try {
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const fiveMin = new Date(now.getTime() - 5 * 60 * 1000);
                    const oneMin = new Date(now.getTime() - 60 * 1000);
                    const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    const oneHour = new Date(now.getTime() - 60 * 60 * 1000);

                    const [
                        activeSessions, activeVisitors,
                        recentPV, recentAPI, recentSessions,
                        recentChats, recentErrors,
                        userTotal, usersToday, usersWeek,
                        visitorTotal, visitorsToday, visitorsWeek,
                        pvTotal, pvToday, pvWeek, pvMonth,
                        apiToday, apiWeek,
                        chatsToday, chatsWeek,
                        toolsToday, eventsToday,
                        revenue,
                        livePageViews, liveVisitors,
                    ] = await Promise.all([
                        // Realtime counts
                        prisma.session.count({ where: { isActive: true, lastActivity: { gte: fiveMin } } }),
                        prisma.visitor.count({ where: { lastVisit: { gte: fiveMin }, isActive: true } }),
                        prisma.pageView.findMany({ where: { timestamp: { gte: fiveMin } }, orderBy: { timestamp: 'desc' }, take: 20, select: { url: true, visitorId: true, timestamp: true, userId: true } }),
                        prisma.apiUsage.findMany({ where: { timestamp: { gte: oneMin } }, orderBy: { timestamp: 'desc' }, take: 20, select: { endpoint: true, method: true, statusCode: true, responseTime: true, ipAddress: true, timestamp: true } }),
                        prisma.session.findMany({ where: { isActive: true, lastActivity: { gte: fiveMin } }, orderBy: { lastActivity: 'desc' }, take: 20, select: { sessionId: true, visitorId: true, userId: true, startTime: true, lastActivity: true, pageViews: true, events: true, duration: true } }),
                        prisma.chatAnalyticsInteraction.count({ where: { startedAt: { gte: fiveMin } } }),
                        prisma.apiUsage.count({ where: { timestamp: { gte: fiveMin }, statusCode: { gte: 500 } } }),

                        // Overview counts
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
                        prisma.chatAnalyticsInteraction.count({ where: { startedAt: { gte: today } } }),
                        prisma.chatAnalyticsInteraction.count({ where: { startedAt: { gte: week } } }),
                        prisma.toolUsage.count({ where: { occurredAt: { gte: today } } }),
                        prisma.userEvent.count({ where: { occurredAt: { gte: today } } }),
                        prisma.transaction.aggregate({ where: { status: 'completed', type: { in: ['subscription', 'renewal'] } }, _sum: { amount: true }, _count: true }),

                        // Live analytics data (last hour)
                        prisma.pageView.findMany({
                            where: { timestamp: { gte: oneHour } },
                            orderBy: { timestamp: 'desc' },
                            take: 50,
                            select: { id: true, url: true, visitorId: true, userId: true, timestamp: true, timeSpent: true },
                        }),
                        prisma.visitor.findMany({
                            where: { lastVisit: { gte: oneHour } },
                            orderBy: { lastVisit: 'desc' },
                            take: 50,
                        }),
                    ]);

                    // Realtime event (for dashboard)
                    send('realtime', {
                        activeSessions, activeVisitors,
                        recentPageViews: recentPV,
                        recentApiCalls: recentAPI,
                        recentSessions,
                        recentChats, recentErrors,
                        timestamp: now.toISOString(),
                    });

                    // Overview event (for dashboard KPI cards)
                    send('overview', {
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

                    // Stats event (for analytics page)
                    send('stats', {
                        users: { total: userTotal, active: usersWeek },
                        pageViews: { total: pvTotal, today: pvToday },
                        events: { total: eventsToday, signups: 0, logins: 0 },
                        visitors: { total: visitorTotal, today: visitorsToday, now: activeSessions },
                    });

                    // Live activity event (for analytics live tab)
                    send('live', {
                        pageViews: livePageViews,
                        visitors: liveVisitors,
                    });

                } catch (err) {
                    console.error('[SSE] push error:', err);
                    send('error', { message: 'Data fetch failed' });
                }
            };

            // Initial push
            pushUpdate();

            // Push every 3 seconds
            intervalId = setInterval(pushUpdate, 3000);
        },
        cancel() {
            closed = true;
            if (intervalId) clearInterval(intervalId);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // nginx: disable buffering
        },
    });
}
