import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path?.join('/') || '';

    // Handle /api/gamification/metrics/:userId
    const metricsMatch = path.match(/^metrics\/(.+)$/);
    if (metricsMatch) {
      const userId = metricsMatch[1];

      // Compute gamification metrics from real data
      const [sessionCount, messageCount, subscriptionCount] = await Promise.all([
        prisma.chatSession.count({ where: { userId } }),
        prisma.chatMessage.count({
          where: { session: { userId } },
        }),
        prisma.agentSubscription.count({ where: { userId, status: 'active' } }),
      ]);

      return NextResponse.json({
        success: true,
        metrics: {
          totalSessions: sessionCount,
          totalMessages: messageCount,
          activeSubscriptions: subscriptionCount,
          totalPoints: messageCount * 10 + sessionCount * 50,
          level: Math.floor(Math.sqrt((messageCount * 10 + sessionCount * 50) / 100)) + 1,
          streak: 0,
          lastActivityTime: new Date().toISOString(),
        },
      });
    }

    // Default: return empty metrics for unknown gamification paths
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Gamification API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load gamification data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path?.join('/') || '';
    const body = await request.json();

    // Handle /api/gamification/metrics/:userId (persist metrics)
    const metricsMatch = path.match(/^metrics\/(.+)$/);
    if (metricsMatch) {
      // Accept the POST but metrics are computed from real data
      // This is a fire-and-forget from the rewards system
      return NextResponse.json({ success: true, message: 'Metrics recorded' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gamification API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process gamification data' },
      { status: 500 }
    );
  }
}