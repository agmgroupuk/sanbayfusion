import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const LIVE_SUPPORT_URL = process.env.LIVE_SUPPORT_URL || 'http://127.0.0.1:3900';

export const dynamic = 'force-dynamic';

/**
 * POST /api/support/live-chat
 * AI Agent support — requires login.
 * Fetches full user context (subscriptions, tickets) and forwards to live-support backend.
 */
export async function POST(req: NextRequest) {
    try {
        const sessionId =
            req.cookies.get('sessionId')?.value ||
            req.cookies.get('session_id')?.value;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Please log in to use live support', requiresLogin: true },
                { status: 401 },
            );
        }

        // Verify session
        const sessionUser = await prisma.user.findFirst({
            where: { sessionId },
            select: { id: true, email: true, name: true, role: true, sessionExpiry: true, createdAt: true },
        });

        if (!sessionUser || (sessionUser.sessionExpiry && new Date(sessionUser.sessionExpiry) < new Date())) {
            return NextResponse.json(
                { error: 'Session expired. Please log in again.', requiresLogin: true },
                { status: 401 },
            );
        }

        const body = await req.json();
        const { message, conversationHistory = [] } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // ── Fetch user context from main database ──────────────

        // 1. Subscriptions
        const subscriptions = await prisma.agentSubscription.findMany({
            where: { userId: sessionUser.id },
            select: {
                plan: true,
                status: true,
                startDate: true,
                expiryDate: true,
                autoRenew: true,
                agent: { select: { agentId: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        // 2. Recent transactions
        const transactions = await prisma.transaction.findMany({
            where: { userId: sessionUser.id },
            select: {
                type: true,
                amount: true,
                currency: true,
                status: true,
                createdAt: true,
                item: true,
                errorMessage: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        // 3. Existing support tickets (from live-support backend)
        let existingTickets: any[] = [];
        try {
            const ticketsRes = await fetch(
                `${LIVE_SUPPORT_URL}/api/support/tickets/user/${sessionUser.id}?limit=5`,
                { headers: { 'Content-Type': 'application/json' } },
            );
            if (ticketsRes.ok) {
                const ticketsData = await ticketsRes.json();
                existingTickets = ticketsData.tickets || [];
            }
        } catch {
            // Backend may be unreachable — continue without tickets
        }

        // ── Build user context object ──────────────
        const userContext = {
            userId: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.name || 'there',
            role: sessionUser.role,
            memberSince: sessionUser.createdAt,
            subscriptions: subscriptions.map((s) => ({
                agentName: s.agent?.name || s.agent?.agentId || 'Unknown',
                plan: s.plan,
                status: s.status,
                expiryDate: s.expiryDate,
                autoRenew: s.autoRenew,
            })),
            recentTransactions: transactions.map((t) => ({
                type: t.type,
                amount: t.amount,
                currency: t.currency,
                status: t.status,
                date: t.createdAt,
                item: t.item,
                error: t.errorMessage,
            })),
            existingTickets: existingTickets.map((t: any) => ({
                ticketId: t.ticketId,
                subject: t.subject,
                status: t.status,
                priority: t.priority,
                category: t.category,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
            })),
        };

        // ── Forward to live-support backend agent-chat endpoint ──────────
        const backendRes = await fetch(`${LIVE_SUPPORT_URL}/api/live-support/agent-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                conversationHistory,
                userContext,
            }),
        });

        if (!backendRes.ok) {
            const errText = await backendRes.text();
            console.error('[live-chat] Backend error:', errText);
            return NextResponse.json(
                { error: 'Support service temporarily unavailable' },
                { status: 503 },
            );
        }

        const data = await backendRes.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('[live-chat] Error:', error);
        return NextResponse.json(
            { error: 'Support service encountered an error' },
            { status: 500 },
        );
    }
}
