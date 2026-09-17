import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdmin, forbidden } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * Catch-all for /api/admin/analytics/* (used by the old analytics page).
 * Routes: stats, users, visitors, pageviews, live
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const admin = await verifyAdmin(req);
    if (!admin) return forbidden();

    const { slug } = await params;
    const path = slug.join('/');
    const url = new URL(req.url);

    try {
        // ─── STATS ─────────────────────────────────────────
        if (path === 'stats') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const fiveMin = new Date(now.getTime() - 5 * 60 * 1000);

            const [userTotal, userActive, pvTotal, pvToday, visitorTotal, visitorsToday, visitorsNow, signups, logins, totalEvents] = await Promise.all([
                prisma.user.count(),
                prisma.user.count({ where: { lastLoginAt: { gte: week } } }),
                prisma.pageView.count(),
                prisma.pageView.count({ where: { timestamp: { gte: today } } }),
                prisma.visitor.count(),
                prisma.visitor.count({ where: { lastVisit: { gte: today } } }),
                prisma.session.count({ where: { isActive: true, lastActivity: { gte: fiveMin } } }),
                prisma.userEvent.count({ where: { eventType: 'signup', occurredAt: { gte: week } } }),
                prisma.userEvent.count({ where: { eventType: 'login', occurredAt: { gte: week } } }),
                prisma.userEvent.count({ where: { occurredAt: { gte: week } } }),
            ]);

            return NextResponse.json({
                success: true,
                data: {
                    users: { total: userTotal, active: userActive },
                    pageViews: { total: pvTotal, today: pvToday },
                    events: { total: totalEvents, signups, logins },
                    visitors: { total: visitorTotal, today: visitorsToday, now: visitorsNow },
                },
            });
        }

        // ─── USERS ─────────────────────────────────────────
        if (path === 'users') {
            const users = await prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100,
                select: { id: true, email: true, name: true, role: true, createdAt: true, lastLoginAt: true },
            });
            return NextResponse.json({ success: true, data: { users } });
        }

        // ─── VISITORS ──────────────────────────────────────
        if (path === 'visitors') {
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const [visitors, total] = await Promise.all([
                prisma.visitor.findMany({ orderBy: { lastVisit: 'desc' }, take: limit }),
                prisma.visitor.count(),
            ]);
            return NextResponse.json({ success: true, data: { visitors, total } });
        }

        // ─── PAGEVIEWS ─────────────────────────────────────
        if (path === 'pageviews') {
            const limit = parseInt(url.searchParams.get('limit') || '100');
            const [pageViews, total] = await Promise.all([
                prisma.pageView.findMany({
                    orderBy: { timestamp: 'desc' },
                    take: limit,
                    include: { user: { select: { name: true, email: true } } },
                }),
                prisma.pageView.count(),
            ]);

            // Map to include visitor info if available
            const mapped = await Promise.all(
                pageViews.map(async (pv) => {
                    let visitor = null;
                    try {
                        visitor = await prisma.visitor.findFirst({
                            where: { visitorId: pv.visitorId },
                            select: { ipAddress: true, device: true, browser: true, os: true, country: true, city: true },
                        });
                    } catch { /* ignore */ }
                    return { ...pv, visitor };
                })
            );

            return NextResponse.json({ success: true, data: { pageViews: mapped, total } });
        }

        // ─── LIVE ──────────────────────────────────────────
        if (path === 'live') {
            const minutes = parseInt(url.searchParams.get('minutes') || '60');
            const since = new Date(Date.now() - minutes * 60 * 1000);

            const [pageViews, visitors] = await Promise.all([
                prisma.pageView.findMany({
                    where: { timestamp: { gte: since } },
                    orderBy: { timestamp: 'desc' },
                    take: 50,
                    select: { id: true, url: true, visitorId: true, userId: true, timestamp: true, timeSpent: true },
                }),
                prisma.visitor.findMany({
                    where: { lastVisit: { gte: since } },
                    orderBy: { lastVisit: 'desc' },
                    take: 50,
                }),
            ]);

            return NextResponse.json({ success: true, data: { pageViews, visitors } });
        }

        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    } catch (error: any) {
        console.error(`[admin-analytics] ${path} error:`, error.message);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
