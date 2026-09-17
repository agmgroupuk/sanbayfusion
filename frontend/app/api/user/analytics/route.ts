import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate via session cookie
    const sessionId =
      request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session ID' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch data in parallel
    const [
      totalSessions,
      recentSessions,
      prevWeekSessions,
      totalMessages,
      recentMessages,
      prevWeekMessages,
      activeSubscriptions,
      recentActivity,
      agentStats,
    ] = await Promise.all([
      // Total conversations (all time)
      prisma.chatSession.count({ where: { userId } }),
      // Conversations in last 7 days
      prisma.chatSession.count({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
      }),
      // Conversations 7-14 days ago (for trend)
      prisma.chatSession.count({
        where: {
          userId,
          createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
      // Total messages
      prisma.chatMessage.count({
        where: { session: { userId } },
      }),
      // Messages in last 7 days
      prisma.chatMessage.count({
        where: {
          session: { userId },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      // Messages 7-14 days ago
      prisma.chatMessage.count({
        where: {
          session: { userId },
          createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
      // Active subscriptions
      prisma.agentSubscription.findMany({
        where: {
          userId,
          status: 'active',
          expiryDate: { gt: now },
        },
        include: { agent: { select: { name: true, agentId: true } } },
      }),
      // Recent activity (last 10 sessions)
      prisma.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          agent: { select: { name: true } },
          _count: { select: { messages: true } },
        },
      }),
      // Per-agent stats
      prisma.chatSession.groupBy({
        by: ['agentId'],
        where: { userId, agentId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Build daily usage for last 7 days
    const dailyUsage: Array<{
      date: string;
      conversations: number;
      messages: number;
      apiCalls: number;
    }> = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayConvos, dayMsgs] = await Promise.all([
        prisma.chatSession.count({
          where: { userId, createdAt: { gte: dayStart, lte: dayEnd } },
        }),
        prisma.chatMessage.count({
          where: {
            session: { userId },
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      dailyUsage.push({
        date: dayStart.toISOString().split('T')[0],
        conversations: dayConvos,
        messages: dayMsgs,
        apiCalls: dayMsgs, // approximate API calls as messages
      });
    }

    // Calculate weekly trends
    const calcTrend = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    };

    // Resolve agent names for groupBy results
    const agentIds = agentStats
      .map((s) => s.agentId)
      .filter((id): id is string => id !== null);
    const agents = agentIds.length > 0
      ? await prisma.agent.findMany({
        where: { agentId: { in: agentIds } },
        select: { agentId: true, name: true },
      })
      : [];
    const agentNameMap = new Map(agents.map((a) => [a.agentId, a.name]));

    // Build top agents
    const topAgents = agentStats.map((s) => ({
      name: agentNameMap.get(s.agentId ?? '') || s.agentId || 'Unknown',
      usage: s._count.id,
    }));

    // Build agent performance
    const agentPerformance = topAgents.map((a) => ({
      name: a.name,
      conversations: a.usage,
      messages: 0,
      avgResponseTime: 0,
      successRate: 100,
    }));

    // Build subscription info
    const monthlyTotal = activeSubscriptions.reduce((sum, sub) => {
      if (sub.plan === 'monthly') return sum + sub.price;
      if (sub.plan === 'weekly') return sum + sub.price * 4.33;
      if (sub.plan === 'daily') return sum + sub.price * 30;
      return sum;
    }, 0);

    const nextRenewal = activeSubscriptions.length > 0
      ? new Date(
        Math.min(
          ...activeSubscriptions.map((s) => s.expiryDate.getTime())
        )
      )
      : null;

    const subscription = activeSubscriptions.length > 0
      ? {
        plan: `${activeSubscriptions.length} Active Agent${activeSubscriptions.length > 1 ? 's' : ''}`,
        status: 'active',
        price: monthlyTotal,
        period: 'month',
        renewalDate: nextRenewal?.toISOString().split('T')[0] || 'N/A',
        daysUntilRenewal: nextRenewal
          ? Math.max(
            0,
            Math.ceil(
              (nextRenewal.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
            )
          )
          : 0,
      }
      : {
        plan: 'No Active Plan',
        status: 'inactive',
        price: 0,
        period: 'month',
        renewalDate: 'N/A',
        daysUntilRenewal: 0,
      };

    const analyticsData = {
      subscription,
      usage: {
        conversations: {
          current: totalSessions,
          limit: 10000,
          percentage: Math.min(100, (totalSessions / 10000) * 100),
        },
        agents: {
          current: activeSubscriptions.length,
          limit: 50,
          percentage: Math.min(100, (activeSubscriptions.length / 50) * 100),
        },
        apiCalls: {
          current: totalMessages,
          limit: 100000,
          percentage: Math.min(100, (totalMessages / 100000) * 100),
        },
        storage: {
          current: 0,
          limit: 10240,
          percentage: 0,
          unit: 'MB',
        },
        messages: {
          current: totalMessages,
          limit: 100000,
          percentage: Math.min(100, (totalMessages / 100000) * 100),
        },
      },
      dailyUsage,
      weeklyTrend: {
        conversationsChange: calcTrend(recentSessions, prevWeekSessions),
        messagesChange: calcTrend(recentMessages, prevWeekMessages),
        apiCallsChange: calcTrend(recentMessages, prevWeekMessages),
        responseTimeChange: '0%',
      },
      agentPerformance,
      recentActivity: recentActivity.map((session) => ({
        timestamp: session.updatedAt.toISOString(),
        agent: session.agent?.name || session.agentId || 'General',
        action: `Chat session: ${session.name}`,
        status: session.isActive ? 'active' : 'completed',
        type: 'conversation',
        messages: session._count.messages,
      })),
      costAnalysis: {
        currentMonth: monthlyTotal,
        projectedMonth: monthlyTotal,
        breakdown:
          monthlyTotal > 0
            ? [
              {
                category: 'Agent Subscriptions',
                cost: monthlyTotal,
                percentage: 100,
              },
            ]
            : [],
      },
      topAgents,
      summary: {
        totalConversations: totalSessions,
        totalMessages,
        totalApiCalls: totalMessages,
        activeAgents: activeSubscriptions.length,
        averageResponseTime: '0ms',
        successRate: 100,
      },
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error in /api/user/analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
