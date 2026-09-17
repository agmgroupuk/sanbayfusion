/**
 * Check Agent Subscription API
 * Checks if a user has an active subscription to a specific agent
 * Queries Prisma directly — no backend proxy needed
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; agentId: string }> }
) {
  try {
    const { userId, agentId } = await params;

    if (!userId || !agentId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Agent ID are required' },
        { status: 400 }
      );
    }

    const subscription = await prisma.agentSubscription.findFirst({
      where: {
        userId,
        agentId,
        status: 'active',
        expiryDate: { gt: new Date() },
      },
    });

    return NextResponse.json({
      success: true,
      hasSubscription: !!subscription,
      subscription: subscription || null,
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
