import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '../../../../lib/stripe-client';
import prisma from '@/lib/prisma';
import {
  verifyRequest,
  unauthorizedResponse,
} from '../../../../lib/validateAuth';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = verifyRequest(request);
    if (!authResult.ok) return unauthorizedResponse(authResult.error);

    const body = await request.json();
    const { agentId, agentName, plan, userId, userEmail } = body;

    // Validate required fields
    if (!agentId || !agentName || !plan || !userId || !userEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: agentId, agentName, plan, userId, userEmail',
        },
        { status: 400 }
      );
    }

    // Validate plan type
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(plan)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid plan. Must be daily, weekly, monthly, or yearly',
        },
        { status: 400 }
      );
    }

    // ✅ CRITICAL: Check if user already has active subscription for this agent
    // Query Prisma directly instead of proxying to backend
    const existingSub = await prisma.agentSubscription.findFirst({
      where: {
        userId,
        agentId,
        status: 'active',
        expiryDate: { gt: new Date() },
      },
    });

    if (existingSub) {
      const daysRemaining = Math.ceil(
        (new Date(existingSub.expiryDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
      );

      return NextResponse.json(
        {
          success: false,
          error: `You already have an active ${existingSub.plan} subscription for ${agentName}`,
          alreadySubscribed: true,
          existingSubscription: {
            plan: existingSub.plan,
            expiryDate: existingSub.expiryDate,
            daysRemaining,
          },
        },
        { status: 400 }
      );
    }

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maula.ai';
    const successUrl = `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}&agent=${encodeURIComponent(
      agentName
    )}&slug=${agentId}`;
    const cancelUrl = `${baseUrl}/subscribe?agent=${encodeURIComponent(
      agentName
    )}&slug=${agentId}&plan=${plan}&cancelled=true`;

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      agentId,
      agentName,
      plan,
      userId,
      userEmail,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
