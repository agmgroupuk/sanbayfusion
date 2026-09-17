import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Cancel Subscription API Route
 * - Canvas Studio subscriptions: proxied to canvas-studio-backend
 * - Agent subscriptions: handled directly via Prisma
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, agentId, subscriptionId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Canvas subscriptions live in separate backends — proxy the cancel
    if (agentId === 'canvas-studio' || agentId === 'gencraft-pro' || agentId === 'gencraft' || agentId === 'canvas-app') {
      const backendBase =
        agentId === 'canvas-studio'
          ? (process.env.CANVAS_STUDIO_BACKEND_URL || 'http://127.0.0.1:3200')
          : (process.env.CANVAS_APP_BACKEND_URL || 'http://127.0.0.1:3100');
      const cookieHeader = request.headers.get('cookie') || '';
      try {
        const backendRes = await fetch(`${backendBase}/api/canvas/studio-cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
          body: JSON.stringify({ userId, subscriptionId }),
        });
        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
      } catch (proxyErr: any) {
        console.error(`[/api/subscriptions/cancel] ${agentId} proxy error:`, proxyErr?.message);
        return NextResponse.json(
          { success: false, error: 'Failed to reach subscription service' },
          { status: 502 }
        );
      }
    }

    // Agent subscription — requires agentId
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'userId and agentId are required' },
        { status: 400 }
      );
    }

    // Authenticate via session cookie
    const sessionId =
      request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'No session ID' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { sessionId, sessionExpiry: { gt: new Date() } },
    });

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the active subscription
    const where: any = { userId, agentId, status: 'active' };
    if (subscriptionId) where.id = subscriptionId;

    const subscription = await prisma.agentSubscription.findFirst({ where });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Cancel Stripe subscription if exists
    if (subscription.stripeSubscriptionId) {
      try {
        const { cancelSubscription } = await import('@/lib/stripe-client');
        await cancelSubscription(subscription.stripeSubscriptionId);
      } catch (stripeErr) {
        console.error('[/api/subscriptions/cancel] Stripe error:', stripeErr);
        // Continue with DB cancellation even if Stripe fails
      }
    }

    // Update subscription status in database
    const updated = await prisma.agentSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        autoRenew: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: updated,
    });
  } catch (err: any) {
    console.error('[/api/subscriptions/cancel] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
