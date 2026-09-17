import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  verifyRequest,
  unauthorizedResponse,
} from '../../../../lib/validateAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log(`[/api/subscriptions/${userId}] Request received`);

    // Require authentication for subscription endpoints
    const authResult = verifyRequest(request);
    console.log(`[/api/subscriptions/${userId}] Auth result:`, authResult.ok ? 'OK' : authResult.error);
    if (!authResult.ok) return unauthorizedResponse(authResult.error);

    // Query subscriptions using Prisma
    const subscriptions = await prisma.agentSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: {
            name: true,
            avatarUrl: true,
            specialty: true,
          },
        },
      },
    });

    console.log(`[/api/subscriptions/${userId}] Found ${subscriptions.length} subscriptions`);
    
    // Log active ones for debugging
    const activeSubs = subscriptions.filter((s: any) => s.status === 'active' && new Date(s.expiryDate) > new Date());
    console.log(`[/api/subscriptions/${userId}] Active subscriptions: ${activeSubs.length}`);

    return NextResponse.json({
      success: true,
      count: subscriptions.length,
      subscriptions: subscriptions
    });
  } catch (err: any) {
    console.error('[/api/subscriptions/[userId]] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch subscriptions',
        subscriptions: [],
      },
      { status: 500 }
    );
  }
}
