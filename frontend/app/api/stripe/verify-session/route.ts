/**
 * POST /api/stripe/verify-session
 * Verifies a Stripe checkout session and returns the subscription details.
 * Queries Stripe + Prisma directly — no backend proxy needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe-client';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items'],
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check payment status
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed', paymentStatus: session.payment_status },
        { status: 400 }
      );
    }

    const metadata = session.metadata;
    const userId = metadata?.userId;
    const agentId = metadata?.agentId;
    const agentName = metadata?.agentName;
    const plan = metadata?.plan;
    const app = metadata?.app; // canvas-studio | gencraft-pro | maula-editor | undefined

    // ── App-level checkouts (canvas-studio, gencraft-pro): write subscription
    //    using app slug as agentId so dashboards (which read the same table) pick it up.
    if (app === 'canvas-studio' || app === 'gencraft-pro') {
      const appAgentId = app; // 'canvas-studio' or 'gencraft-pro'
      const appAgentName = app === 'canvas-studio' ? 'Canvas Studio' : 'GenCraft Pro';

      const stripeSubId = session.subscription
        ? (typeof session.subscription === 'string' ? session.subscription : session.subscription.id)
        : session.id;

      // Already activated?
      let appSub = await prisma.agentSubscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId, agentId: appAgentId },
        orderBy: { createdAt: 'desc' },
      });

      if (!appSub && userId && plan) {
        // Cancel any other active subs for this app
        await prisma.agentSubscription.updateMany({
          where: { userId, agentId: appAgentId, status: 'active' },
          data: { status: 'cancelled' },
        });

        const now = new Date();
        const expiryDate = new Date(now);
        if (plan === 'yearly') expiryDate.setDate(expiryDate.getDate() + 365);
        else if (plan === 'weekly') expiryDate.setDate(expiryDate.getDate() + 7);
        else expiryDate.setMonth(expiryDate.getMonth() + 1);

        const price = app === 'canvas-studio'
          ? (plan === 'yearly' ? 300 : plan === 'monthly' ? 30 : 10)
          : (plan === 'yearly' ? 120 : plan === 'monthly' ? 19 : 7);

        // Ensure Agent row exists (FK constraint)
        await prisma.agent.upsert({
          where: { agentId: appAgentId },
          update: {},
          create: {
            agentId: appAgentId,
            name: appAgentName,
            specialty: app === 'canvas-studio' ? 'Visual design studio' : 'AI app builder',
            description: appAgentName,
            tags: [],
            specialties: [],
            systemPrompt: '',
            welcomeMessage: `Welcome to ${appAgentName}`,
          },
        });

        appSub = await prisma.agentSubscription.create({
          data: {
            userId,
            agentId: appAgentId,
            plan: plan as any,
            price,
            status: 'active',
            startDate: now,
            expiryDate,
            autoRenew: false,
            stripeSubscriptionId: stripeSubId,
          },
        });

        // Set cancel_at_period_end for non-yearly recurring
        if (plan !== 'yearly' && session.subscription) {
          try {
            await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
          } catch (e) {
            console.error('cancel_at_period_end failed:', e);
          }
        }

        console.log(`✅ ${appAgentName} ${plan} plan activated for user ${userId}`);
      }

      const daysRemaining = appSub?.expiryDate
        ? Math.ceil((new Date(appSub.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return NextResponse.json({
        success: true,
        verified: true,
        paymentStatus: session.payment_status,
        app,
        plan: appSub ? { type: appSub.plan, expiryDate: appSub.expiryDate } : { type: plan },
        subscription: appSub
          ? {
            id: appSub.id,
            plan: appSub.plan,
            price: appSub.price,
            status: appSub.status,
            startDate: appSub.startDate,
            expiryDate: appSub.expiryDate,
            daysRemaining,
            agentId: appSub.agentId,
          }
          : { plan: plan || 'monthly', status: 'active', agentId: appAgentId },
      });
    }

    // Maula Editor (credits): subscription-confirmation handled by editor backend webhook;
    // here we just confirm payment and return.
    if (app === 'maula-editor') {
      return NextResponse.json({
        success: true,
        verified: true,
        paymentStatus: session.payment_status,
        app,
        credits: Number(metadata?.credits) || null,
      });
    }

    // ── Agent-level checkouts (default): existing flow
    let subscription = null;
    if (userId && agentId) {
      subscription = await prisma.agentSubscription.findFirst({
        where: {
          userId,
          agentId,
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // If no subscription found yet (webhook may not have fired), look by stripeSubscriptionId
    if (!subscription && session.subscription) {
      const stripeSubId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

      subscription = await prisma.agentSubscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
        orderBy: { createdAt: 'desc' },
      });

      // If still not found, create it as a fallback (webhook may have failed)
      if (!subscription && userId && agentId && plan) {
        console.log('⚠️ No subscription found in DB after checkout, creating as fallback...');
        try {
          const stripeSub = typeof session.subscription === 'string'
            ? await (await import('../../../../lib/stripe-client')).stripe.subscriptions.retrieve(session.subscription)
            : session.subscription;

          const subAny = stripeSub as any;
          const startTs = subAny.current_period_start || subAny.start_date || subAny.created;
          const startDate = startTs ? new Date(startTs * 1000) : new Date();
          const expiryDate = new Date(startDate);

          switch (plan) {
            case 'daily': expiryDate.setDate(expiryDate.getDate() + 1); break;
            case 'weekly': expiryDate.setDate(expiryDate.getDate() + 7); break;
            case 'yearly': expiryDate.setDate(expiryDate.getDate() + 365); break;
            case 'monthly': default: expiryDate.setMonth(expiryDate.getMonth() + 1); break;
          }

          const price = stripeSub.items.data[0]?.price?.unit_amount
            ? stripeSub.items.data[0].price.unit_amount / 100
            : 0;

          // Ensure Agent row exists before creating subscription (FK constraint)
          const { ensureAgent } = await import('@/lib/ensureAgent');
          await ensureAgent(agentId, agentName);

          subscription = await prisma.agentSubscription.create({
            data: {
              userId,
              agentId,
              plan: plan as string,
              price,
              status: stripeSub.status === 'active' ? 'active' : 'expired',
              startDate,
              expiryDate,
              autoRenew: false,
              stripeSubscriptionId: stripeSub.id,
            },
          });

          console.log('✅ Fallback subscription created:', subscription.id);

          // Send confirmation email (webhook may have failed — this is the fallback path)
          const customerEmail = session.customer_details?.email || (session as any).customer_email;
          if (customerEmail && agentName) {
            const BACKEND_URL = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:3005';
            // Fire-and-forget — don't block the response
            Promise.all([
              fetch(`${BACKEND_URL}/api/email/subscription-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: customerEmail,
                  userName: metadata?.userName || 'there',
                  agentName,
                  agentId,
                  plan,
                  price,
                  startDate,
                  expiryDate,
                  autoRenew: false,
                }),
              }),
              fetch(`${BACKEND_URL}/api/email/payment-receipt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: customerEmail,
                  userName: metadata?.userName || 'there',
                  agentName,
                  plan,
                  transactionId: `txn_fallback_${Date.now()}`,
                  date: new Date(),
                  amount: price,
                  currency: 'USD',
                  startDate,
                  endDate: expiryDate,
                }),
              }),
            ]).catch(err => console.error('❌ Fallback email send failed:', err));
          }
        } catch (createErr) {
          console.error('❌ Failed to create fallback subscription:', createErr);
        }
      }
    }

    // Build response
    const daysRemaining = subscription?.expiryDate
      ? Math.ceil((new Date(subscription.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return NextResponse.json({
      success: true,
      verified: true,
      paymentStatus: session.payment_status,
      subscription: subscription
        ? {
          id: subscription.id,
          plan: subscription.plan,
          price: subscription.price,
          status: subscription.status,
          startDate: subscription.startDate,
          expiryDate: subscription.expiryDate,
          daysRemaining,
          agentId: subscription.agentId,
        }
        : {
          // Fallback from session metadata if DB record hasn't been created yet
          plan: plan || 'monthly',
          status: 'active',
          agentId: agentId || null,
          agentName: agentName || null,
        },
    });
  } catch (error) {
    console.error('Verify session error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
}
