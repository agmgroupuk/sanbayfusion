/**
 * POST /api/subscriptions/check
 * Checks if a user has an active subscription for a given agent.
 * Queries Prisma directly — no backend proxy needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  verifyRequest,
  unauthorizedResponse,
} from '../../../../lib/validateAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, agentId } = body;

    if (!userId || !agentId) {
      return NextResponse.json(
        { success: false, error: 'userId and agentId are required' },
        { status: 400 }
      );
    }

    // Require authentication
    const authResult = verifyRequest(request);
    if (!authResult.ok) return unauthorizedResponse(authResult.error);

    // Query Prisma directly for active subscription
    const subscription = await prisma.agentSubscription.findFirst({
      where: {
        userId,
        agentId,
        status: 'active',
        expiryDate: { gt: new Date() },
      },
    });

    const hasAccess = !!subscription;

    // Calculate days remaining if subscription exists
    let daysRemaining: number | null = null;
    if (subscription) {
      daysRemaining = Math.ceil(
        (new Date(subscription.expiryDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
      );
    }

    return NextResponse.json({
      success: true,
      hasAccess,
      hasActiveSubscription: hasAccess,
      subscription: subscription
        ? {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          expiryDate: subscription.expiryDate,
          daysRemaining,
        }
        : null,
    });
  } catch (err: any) {
    console.error('[/api/subscriptions/check] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
