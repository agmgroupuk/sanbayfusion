import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const AGENT_MAP: Record<
  string,
  { name: string; type: string; avatar: string }
> = {
  einstein: { name: 'Einstein', type: 'Physics & Science', avatar: '🧠' },
  'tech-wizard': {
    name: 'Tech Wizard',
    type: 'Technology & Programming',
    avatar: '🧙‍♂️',
  },
  'comedy-king': {
    name: 'Comedy King',
    type: 'Entertainment & Humor',
    avatar: '😄',
  },
  'chef-biew': { name: 'Chef Biew', type: 'Cooking & Recipes', avatar: '👨‍🍳' },
  'ben-sega': {
    name: 'Ben Sega',
    type: 'Gaming & Entertainment',
    avatar: '🎮',
  },
  'chess-player': {
    name: 'Chess Player',
    type: 'Strategy & Games',
    avatar: '♟️',
  },
  default: { name: 'AI Assistant', type: 'General Purpose', avatar: '🤖' },
};

function resolveAgent(agentId?: string) {
  if (!agentId) {
    return AGENT_MAP.default;
  }
  return AGENT_MAP[agentId] || AGENT_MAP.default;
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    return { change: current > 0 ? '+100%' : '+0%', trend: 'up' as const };
  }
  const percentChange = ((current - previous) / previous) * 100;
  const change = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
  return {
    change,
    trend: percentChange >= 0 ? ('up' as const) : ('down' as const),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const sessionId = request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      return NextResponse.json({ message: 'No session ID' }, { status: 401 });
    }

    // Find user by session using Prisma
    const sessionUser = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() }
      }
    });

    if (!sessionUser) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const userId = sessionUser.id;
    const agentIdParam = params.agentId;
    const timeRange = request.nextUrl.searchParams.get('timeRange') || '7d';
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const previousPeriodStart = new Date(
      startDate.getTime() - (now.getTime() - startDate.getTime())
    );

    const agentInfo = resolveAgent(agentIdParam);

    // Build the where clause - for 'default', show ALL user sessions
    // For specific agents, filter by agentId or session name
    const baseWhere = {
      userId,
      createdAt: { gte: startDate },
    };

    // Get current period chat sessions for THIS USER
    const currentSessions = await prisma.chatSession.findMany({
      where: agentIdParam === 'default'
        ? baseWhere
        : {
          ...baseWhere,
          OR: [
            { agentId: { contains: agentIdParam, mode: 'insensitive' } },
            { name: { contains: agentInfo.name, mode: 'insensitive' } }
          ]
        },
      include: {
        messages: true,
        agent: true
      }
    });

    console.log(`[Agent Performance] User: ${userId}, Agent: ${agentIdParam}, Sessions found: ${currentSessions.length}`);

    // Calculate stats from actual chat sessions
    const totalConversations = currentSessions.length;
    let totalMessages = 0;
    let totalDurationMs = 0;

    currentSessions.forEach((session) => {
      totalMessages += session.messages?.length || 0;
      // Get duration from stats if available
      const stats = session.stats as any;
      if (stats?.durationMs) {
        totalDurationMs += stats.durationMs;
      } else {
        // Estimate based on message count
        totalDurationMs += (session.messages?.length || 0) * 2000;
      }
    });

    const avgResponseTime = totalConversations > 0
      ? totalDurationMs / totalConversations / 1000 // Convert to seconds
      : 0;

    // Build previous period where clause
    const prevBaseWhere = {
      userId,
      createdAt: { gte: previousPeriodStart, lt: startDate },
    };

    // Get previous period stats for comparison
    const previousSessions = await prisma.chatSession.findMany({
      where: agentIdParam === 'default'
        ? prevBaseWhere
        : {
          ...prevBaseWhere,
          OR: [
            { agentId: { contains: agentIdParam, mode: 'insensitive' } },
            { name: { contains: agentInfo.name, mode: 'insensitive' } }
          ]
        },
      include: {
        messages: true
      }
    });

    const prevTotalConversations = previousSessions.length;
    let prevTotalMessages = 0;
    let prevTotalDurationMs = 0;

    previousSessions.forEach((session) => {
      prevTotalMessages += session.messages?.length || 0;
      const stats = session.stats as any;
      if (stats?.durationMs) {
        prevTotalDurationMs += stats.durationMs;
      } else {
        prevTotalDurationMs += (session.messages?.length || 0) * 2000;
      }
    });

    const prevAvgResponseTime = prevTotalConversations > 0
      ? prevTotalDurationMs / prevTotalConversations / 1000
      : 0;

    const conversationTrend = calculateTrend(totalConversations, prevTotalConversations);
    const messageTrend = calculateTrend(totalMessages, prevTotalMessages);
    // For response time, lower is better, so we reverse the comparison
    const responseTimeTrend = calculateTrend(prevAvgResponseTime, avgResponseTime);

    // Get recent activity from chat sessions
    const recentSessions = await prisma.chatSession.findMany({
      where: agentIdParam === 'default'
        ? baseWhere
        : {
          ...baseWhere,
          OR: [
            { agentId: { contains: agentIdParam, mode: 'insensitive' } },
            { name: { contains: agentInfo.name, mode: 'insensitive' } }
          ]
        },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        agent: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    const transformedActivity = recentSessions.map((session) => {
      const lastUpdate = session.updatedAt || session.createdAt;
      const minutesAgo = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60)
      );

      let timeAgo: string;
      if (minutesAgo < 1) {
        timeAgo = 'Just now';
      } else if (minutesAgo < 60) {
        timeAgo = `${minutesAgo} min ago`;
      } else if (minutesAgo < 1440) {
        timeAgo = `${Math.floor(minutesAgo / 60)} hours ago`;
      } else {
        timeAgo = `${Math.floor(minutesAgo / 1440)} days ago`;
      }

      const lastMessage = session.messages?.[0];
      const description = lastMessage?.content
        ? `${lastMessage.content.substring(0, 60)}${lastMessage.content.length > 60 ? '...' : ''
        }`
        : session.name || 'Conversation started';

      return {
        timestamp: timeAgo,
        type: 'conversation',
        description,
        user: sessionUser.username || sessionUser.email || 'You',
      };
    });

    // Calculate satisfaction score from real ChatFeedback data
    let satisfactionScore = 0;
    let prevSatisfactionScore = 0;
    try {
      const feedbackWhere = agentIdParam === 'default'
        ? { userId, createdAt: { gte: startDate } }
        : {
          userId,
          createdAt: { gte: startDate },
          session: {
            OR: [
              { agentId: { contains: agentIdParam, mode: 'insensitive' as const } },
              { name: { contains: agentInfo.name, mode: 'insensitive' as const } }
            ]
          }
        };

      const currentFeedback = await prisma.chatFeedback.aggregate({
        where: feedbackWhere,
        _avg: { rating: true },
        _count: { rating: true },
      });

      if (currentFeedback._count.rating > 0 && currentFeedback._avg.rating) {
        satisfactionScore = currentFeedback._avg.rating;
      }

      const prevFeedbackWhere = agentIdParam === 'default'
        ? { userId, createdAt: { gte: previousPeriodStart, lt: startDate } }
        : {
          userId,
          createdAt: { gte: previousPeriodStart, lt: startDate },
          session: {
            OR: [
              { agentId: { contains: agentIdParam, mode: 'insensitive' as const } },
              { name: { contains: agentInfo.name, mode: 'insensitive' as const } }
            ]
          }
        };

      const prevFeedback = await prisma.chatFeedback.aggregate({
        where: prevFeedbackWhere,
        _avg: { rating: true },
        _count: { rating: true },
      });

      if (prevFeedback._count.rating > 0 && prevFeedback._avg.rating) {
        prevSatisfactionScore = prevFeedback._avg.rating;
      }
    } catch (e) {
      console.log('[Agent Performance] Feedback query error:', e);
    }

    const satisfactionTrend = calculateTrend(satisfactionScore, prevSatisfactionScore);

    // Calculate uptime as percentage of successful conversations (sessions with messages)
    const successfulConversations = currentSessions.filter(s => (s.messages?.length || 0) > 0).length;
    const uptime = totalConversations > 0
      ? Math.round((successfulConversations / totalConversations) * 1000) / 10
      : 0;

    // Determine agent status
    const hasRecentActivity = currentSessions.some(s => {
      const lastUpdate = s.updatedAt || s.createdAt;
      return (now.getTime() - lastUpdate.getTime()) < 30 * 60 * 1000; // 30 minutes
    });

    const performanceData = {
      agent: {
        name: agentInfo.name,
        type: agentInfo.type,
        avatar: agentInfo.avatar,
        status: hasRecentActivity ? 'active' : (totalConversations > 0 ? 'idle' : 'idle'),
      },
      metrics: {
        totalConversations,
        totalMessages,
        averageResponseTime: Math.round(avgResponseTime * 10) / 10,
        satisfactionScore: Math.round(satisfactionScore * 10) / 10,
        activeUsers: totalConversations > 0 ? 1 : 0, // For individual user dashboard
        uptime,
      },
      trends: {
        conversations: {
          value: totalConversations,
          change: conversationTrend.change,
          trend: conversationTrend.trend,
        },
        messages: {
          value: totalMessages,
          change: messageTrend.change,
          trend: messageTrend.trend,
        },
        responseTime: {
          value: Math.round(avgResponseTime * 10) / 10,
          change: responseTimeTrend.change,
          trend: responseTimeTrend.trend,
        },
        satisfaction: {
          value: Math.round(satisfactionScore * 10) / 10,
          change: satisfactionTrend.change,
          trend: satisfactionTrend.trend,
        },
      },
      recentActivity: transformedActivity,
      timeRange,
      conversationsInWindow: `${totalConversations} conversations in this window`,
      dataRefreshed: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: performanceData });
  } catch (error) {
    console.error('Agent performance error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
