/**
 * Stripe Webhook Handler
 * Receives events from Stripe and saves subscriptions to PostgreSQL via Prisma
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { verifyWebhookSignature } from '../../../../lib/stripe-client';
import { ensureAgent } from '@/lib/ensureAgent';

export const dynamic = 'force-dynamic';
import { awardSubscriptionPoints } from '@/lib/rewards-engine';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover' as any,
});

// Backend API URL for email notifications
const BACKEND_URL = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:3005';

/**
 * Send email notification via backend API
 */
async function sendEmailNotification(endpoint: string, data: Record<string, any>) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error(`❌ Failed to send email (${endpoint}):`, await response.text());
    } else {
      console.log(`✅ Email sent successfully (${endpoint})`);
    }
  } catch (error) {
    console.error(`❌ Error sending email (${endpoint}):`, error);
  }
}

function safeDateFromUnix(
  seconds?: number | null,
  plan?: 'daily' | 'weekly' | 'monthly' | 'yearly'
) {
  const base = seconds ? new Date(seconds * 1000) : new Date();
  const date = isNaN(base.getTime()) ? new Date() : base;

  if (!plan) return date;

  const fallback = new Date(date);
  switch (plan) {
    case 'daily':
      fallback.setDate(fallback.getDate() + 1);
      break;
    case 'weekly':
      fallback.setDate(fallback.getDate() + 7);
      break;
    case 'yearly':
      fallback.setDate(fallback.getDate() + 365);
      break;
    case 'monthly':
    default:
      fallback.setMonth(fallback.getMonth() + 1);
      break;
  }
  return fallback;
}

/**
 * Extract start/expiry dates from a Stripe subscription object.
 * Newer Stripe API versions (2025+) removed current_period_start/end.
 */
function getSubscriptionDates(subscription: any, planType: 'daily' | 'weekly' | 'monthly' | 'yearly') {
  const startDate = safeDateFromUnix(
    subscription.current_period_start || subscription.start_date || subscription.created
  );
  const expiryDate = subscription.current_period_end
    ? safeDateFromUnix(subscription.current_period_end)
    : safeDateFromUnix(subscription.start_date || subscription.created, planType);
  return { startDate, expiryDate };
}

export async function POST(request: NextRequest) {
  console.log('🔥 STRIPE WEBHOOK RECEIVED - STARTING PROCESSING');

  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    console.log('📨 Webhook headers received:', {
      hasSignature: !!signature,
      contentType: headersList.get('content-type'),
      userAgent: headersList.get('user-agent'),
    });

    if (!signature) {
      console.error('❌ No Stripe signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
      console.log('✅ Webhook signature verified successfully');
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('🎯 Stripe webhook event received:', {
      type: event.type,
      id: event.id,
      created: event.created,
      livemode: event.livemode,
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice_payment.paid': {
        // Newer Stripe event type (API v2025+) — extract invoice and process
        const invoicePayment = event.data.object as any;
        const invoiceRef = invoicePayment.invoice;
        const invoiceId = typeof invoiceRef === 'string' ? invoiceRef : invoiceRef?.id;
        if (invoiceId) {
          console.log('📩 invoice_payment.paid — retrieving invoice:', invoiceId);
          const inv = await stripe.invoices.retrieve(invoiceId);
          await handleInvoicePaid(inv);
        } else {
          console.log('⚠️ invoice_payment.paid missing invoice ID');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('💥 WEBHOOK HANDLER ERROR:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log('🛒 Processing checkout session completed:', {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    status: session.status,
  });

  const {
    client_reference_id,
    customer_email: email,
    subscription: subscriptionId,
    payment_status: paymentStatus,
    mode,
  } = session;
  const metadata = session.metadata;

  // Fall back to metadata.userId when client_reference_id is not set
  const userId = client_reference_id || metadata?.userId || null;
  const customerEmail = email || (session as any).customer_details?.email || null;

  console.log('👤 Session data extracted:', {
    userId,
    email: customerEmail,
    subscriptionId,
    paymentStatus,
    mode,
    metadata,
    client_reference_id,
  });

  if (!metadata || !userId || !customerEmail) {
    // Canvas Studio purchases use metadata.userId instead of client_reference_id
    if ((metadata?.app === 'canvas-studio' || metadata?.app === 'gencraft-pro') && metadata?.userId) {
      console.log('🎨 Canvas app purchase detected, handling via studio-verify flow')
      // Canvas/GenCraft purchases are handled by /api/canvas/studio-verify
      // The webhook just ensures cancel_at_period_end is set
      if (mode === 'subscription' && subscriptionId) {
        try {
          await stripe.subscriptions.update(subscriptionId as string, {
            cancel_at_period_end: true,
          });
          console.log('✅ Canvas Studio subscription set to cancel at period end');
        } catch (e) {
          console.error('Failed to set cancel_at_period_end for Canvas Studio:', e);
        }
      }
      return;
    }

    console.error('❌ Missing required session data:', {
      userId,
      email: customerEmail,
      subscriptionId,
      paymentStatus,
      mode,
      metadata,
      client_reference_id,
    });
    return;
  }

  // For payment mode, check if payment was successful
  if (mode === 'payment' && paymentStatus !== 'paid') {
    console.log('ℹ️ Payment not completed yet, status:', paymentStatus);
    return;
  }

  // For subscription mode, ensure subscription exists
  if (mode === 'subscription' && !subscriptionId) {
    console.error('❌ Missing subscription ID for subscription mode');
    return;
  }

  let stripeSubscriptionId: string | undefined;
  let subscription: Stripe.Subscription | null = null;

  if (mode === 'subscription' && subscriptionId) {
    // Get full subscription details from Stripe
    console.log(
      '🔍 Fetching subscription details from Stripe:',
      subscriptionId
    );
    subscription = await stripe.subscriptions.retrieve(
      subscriptionId as string
    );
    console.log('✅ Subscription details retrieved:', {
      id: subscription.id,
      status: subscription.status,
      items: subscription.items.data.length,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

    // ✅ CRITICAL: Set cancel_at_period_end = true for one-time purchase model
    if (!subscription.cancel_at_period_end) {
      console.log('🔧 Setting cancel_at_period_end for one-time purchase...');
      try {
        await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: true,
        });
        console.log(
          '✅ Subscription set to cancel at period end (no auto-renewal)'
        );
      } catch (error) {
        console.error('❌ Failed to set cancel_at_period_end:', error);
      }
    }
    stripeSubscriptionId = subscription.id;
  } else if (mode === 'payment') {
    // For payment mode, use session id as reference
    stripeSubscriptionId = session.id;
  }

  // Check if subscription already exists by Stripe ID (avoid duplicates)
  const existingByStripeId = await prisma.agentSubscription.findFirst({
    where: { stripeSubscriptionId },
  });

  if (existingByStripeId) {
    console.log(
      'ℹ️ Subscription already processed (Stripe ID):',
      stripeSubscriptionId
    );
    return;
  }

  // Check if agent subscription already exists
  const existingSubscription = await prisma.agentSubscription.findFirst({
    where: {
      userId: metadata?.userId,
      agentId: metadata?.agentId,
    },
  });

  if (!existingSubscription && subscription) {
    // Map Stripe interval to our plan types
    let planType: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly';
    if (subscription.items.data[0]?.price?.recurring?.interval === 'day')
      planType = 'daily';
    else if (subscription.items.data[0]?.price?.recurring?.interval === 'week')
      planType = 'weekly';
    else if (subscription.items.data[0]?.price?.recurring?.interval === 'year')
      planType = 'yearly';

    const { startDate, expiryDate } = getSubscriptionDates(subscription, planType);

    await ensureAgent(metadata?.agentId as string, metadata?.agentName as string | undefined);

    const agentSub = await prisma.agentSubscription.create({
      data: {
        userId: metadata?.userId as string,
        agentId: metadata?.agentId as string,
        plan: planType,
        price: subscription.items.data[0]?.price?.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : 0,
        status: subscription.status === 'active' ? 'active' : 'expired',
        startDate,
        expiryDate,
        autoRenew: false, // Always false for one-time purchase model
        stripeSubscriptionId: subscription.id,
      },
    });

    console.log('✅ Agent subscription created:', agentSub.id);

    // Award rewards points for the subscription
    awardSubscriptionPoints(metadata?.userId as string, planType, metadata?.agentId as string)
      .catch(err => console.error('Failed to award subscription points:', err));

    // Create transaction record (with dedup — invoice.paid may also fire)
    const recentTxn = await prisma.transaction.findFirst({
      where: {
        stripeSubscriptionId: subscription.id,
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
    });

    if (!recentTxn) {
      const transactionId = `txn_${Date.now()}_${subscription.id}`;
      await prisma.transaction.create({
        data: {
          transactionId,
          userId: metadata?.userId as string,
          type: 'subscription',
          item: {
            agentId: metadata?.agentId,
            agentName: metadata?.agentName,
            plan: planType,
          },
          amount: agentSub.price,
          currency: 'USD',
          status: 'completed',
          stripeSubscriptionId: subscription.id,
        },
      });

      console.log('✅ Transaction created:', transactionId);

      // Send subscription confirmation email
      if (customerEmail) {
        await sendEmailNotification('subscription-confirmation', {
          email: customerEmail,
          userName: metadata?.userName || 'there',
          agentName: metadata?.agentName || 'AI Agent',
          agentId: metadata?.agentId,
          plan: planType,
          price: agentSub.price,
          startDate,
          expiryDate,
          autoRenew: false,
        });

        // Send payment receipt email
        await sendEmailNotification('payment-receipt', {
          email: customerEmail,
          userName: metadata?.userName || 'there',
          agentName: metadata?.agentName || 'AI Agent',
          plan: planType,
          transactionId,
          date: new Date(),
          amount: agentSub.price,
          currency: 'USD',
          startDate,
          endDate: expiryDate,
        });
      }
    } else {
      console.log('ℹ️ Transaction already exists for subscription (dedup):', subscription.id);
    }
  } else {
    console.log('ℹ️ Agent subscription already exists, skipping creation');
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🆕 Subscription created:', subscription.id);

  // Canvas Studio purchases are fully handled by /api/canvas/studio-verify — skip here.
  // Also skip if agentId is missing (prevents incorrect findFirst without agentId filter).
  if (subscription.metadata?.app === 'canvas-studio' || subscription.metadata?.app === 'gencraft-pro' || !subscription.metadata?.agentId) {
    console.log('⏭️ Skipping subscription created for canvas-studio/gencraft-pro / missing agentId:', subscription.id);
    // Still set cancel_at_period_end if needed
    if (subscription.metadata?.cancelAtPeriodEnd === 'true' && !subscription.cancel_at_period_end) {
      try { await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true }); } catch { }
    }
    return;
  }

  // ✅ CRITICAL: Set cancel_at_period_end = true for one-time purchase model
  if (
    subscription.metadata?.cancelAtPeriodEnd === 'true' &&
    !subscription.cancel_at_period_end
  ) {
    console.log('🔧 Setting cancel_at_period_end for one-time purchase...');
    try {
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
      console.log(
        '✅ Subscription set to cancel at period end (no auto-renewal)'
      );
    } catch (error) {
      console.error('❌ Failed to set cancel_at_period_end:', error);
    }
  }

  // Check if subscription already exists by Stripe ID (avoid duplicates)
  const existingByStripeId = await prisma.agentSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (existingByStripeId) {
    console.log(
      'ℹ️ Subscription already processed (Stripe ID):',
      subscription.id
    );
    return;
  }

  const existingSubscription = await prisma.agentSubscription.findFirst({
    where: {
      userId: subscription.metadata?.userId,
      agentId: subscription.metadata?.agentId,
    },
  });

  if (!existingSubscription) {
    // Map Stripe interval to our plan types
    let planType: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly';
    if (subscription.items.data[0]?.price?.recurring?.interval === 'day')
      planType = 'daily';
    else if (subscription.items.data[0]?.price?.recurring?.interval === 'week')
      planType = 'weekly';
    else if (subscription.items.data[0]?.price?.recurring?.interval === 'year')
      planType = 'yearly';

    const subAny = subscription as any;
    const { startDate, expiryDate } = getSubscriptionDates(subAny, planType);

    await ensureAgent(subscription.metadata?.agentId as string, subscription.metadata?.agentName as string | undefined);

    const agentSub = await prisma.agentSubscription.create({
      data: {
        userId: subscription.metadata?.userId as string,
        agentId: subscription.metadata?.agentId as string,
        plan: planType,
        price: subscription.items.data[0]?.price?.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : 0,
        status: subscription.status === 'active' ? 'active' : 'expired',
        startDate,
        expiryDate,
        autoRenew: false,
        stripeSubscriptionId: subscription.id,
      },
    });

    console.log('✅ Agent subscription created:', agentSub.id);

    // Award rewards points for the subscription
    awardSubscriptionPoints(subscription.metadata?.userId as string, planType, subscription.metadata?.agentId as string)
      .catch(err => console.error('Failed to award subscription points:', err));
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  // Canvas Studio purchases handled by studio-verify; also guard missing agentId.
  if (subscription.metadata?.app === 'canvas-studio' || subscription.metadata?.app === 'gencraft-pro' || !subscription.metadata?.agentId) {
    console.log('⏭️ Skipping subscription updated for canvas-studio/gencraft-pro / missing agentId:', subscription.id);
    return;
  }

  const existingSubscription = await prisma.agentSubscription.findFirst({
    where: {
      userId: subscription.metadata?.userId,
      agentId: subscription.metadata?.agentId,
    },
  });

  // Map Stripe interval to our plan types
  let planType: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly';
  if (subscription.items.data[0]?.price?.recurring?.interval === 'day')
    planType = 'daily';
  else if (subscription.items.data[0]?.price?.recurring?.interval === 'week')
    planType = 'weekly';
  else if (subscription.items.data[0]?.price?.recurring?.interval === 'year')
    planType = 'yearly';

  if (!existingSubscription) {
    console.log(
      'Agent subscription not found in database, creating new record'
    );

    const { startDate, expiryDate } = getSubscriptionDates(subscription, planType);

    await ensureAgent(subscription.metadata?.agentId as string, subscription.metadata?.agentName as string | undefined);

    const agentSub = await prisma.agentSubscription.create({
      data: {
        userId: subscription.metadata?.userId as string,
        agentId: subscription.metadata?.agentId as string,
        plan: planType,
        price: subscription.items.data[0]?.price?.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : 0,
        status: subscription.status === 'active' ? 'active' : 'expired',
        startDate,
        expiryDate,
        autoRenew: false,
        stripeSubscriptionId: subscription.id,
      },
    });

    console.log('✅ Agent subscription created:', agentSub.id);

    // Award rewards points for the subscription
    awardSubscriptionPoints(subscription.metadata?.userId as string, planType, subscription.metadata?.agentId as string)
      .catch(err => console.error('Failed to award subscription points:', err));
  } else {
    // Update existing subscription
    const { expiryDate: updatedExpiry } = getSubscriptionDates(subscription, planType);
    await prisma.agentSubscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: subscription.status === 'active' ? 'active' : 'expired',
        expiryDate: updatedExpiry,
        autoRenew: false,
      },
    });

    console.log('✅ Agent subscription updated:', existingSubscription.id);
  }
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  // Canvas Studio cancellations are handled via /api/subscriptions/cancel.
  if (subscription.metadata?.app === 'canvas-studio' || subscription.metadata?.app === 'gencraft-pro' || !subscription.metadata?.agentId) {
    console.log('⏭️ Skipping subscription deleted for canvas-studio/gencraft-pro / missing agentId:', subscription.id);
    return;
  }

  const existingSubscription = await prisma.agentSubscription.findFirst({
    where: {
      userId: subscription.metadata?.userId,
      agentId: subscription.metadata?.agentId,
    },
  });

  if (existingSubscription) {
    await prisma.agentSubscription.update({
      where: { id: existingSubscription.id },
      data: { status: 'cancelled' },
    });
    console.log('Agent subscription marked as canceled in database');
  }
}

/**
 * Handle invoice paid — creates Transaction records for ALL payments
 * (including Canvas Studio) and reactivates agent subscriptions.
 * Supports both old (invoice.subscription) and new (invoice.parent.subscription_details) API formats.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('💰 Invoice paid:', invoice.id);

  const invoiceAny = invoice as any;

  // Extract subscription ID — handle both old and new Stripe API formats
  const subscriptionId: string | undefined =
    invoiceAny.subscription ||
    invoiceAny.parent?.subscription_details?.subscription ||
    invoiceAny.lines?.data?.[0]?.parent?.subscription_item_details?.subscription;

  if (!subscriptionId) {
    console.log('ℹ️ Invoice without subscription, skipping');
    return;
  }

  // Get metadata — first try from invoice.parent, then from line items, then from subscription retrieve
  let metadata: Record<string, string> =
    invoiceAny.parent?.subscription_details?.metadata ||
    invoiceAny.lines?.data?.[0]?.metadata ||
    {};

  // If no metadata found locally, retrieve the subscription from Stripe
  let subscriptionObj: any = null;
  if (!metadata.userId) {
    try {
      subscriptionObj = await stripe.subscriptions.retrieve(subscriptionId);
      metadata = subscriptionObj.metadata || {};
    } catch (err: any) {
      console.log('⚠️ Could not retrieve subscription:', subscriptionId, err.message);
    }
  }

  const userId = metadata.userId;
  const isCanvasStudio = metadata.app === 'canvas-studio' || metadata.app === 'gencraft-pro';
  const agentId = metadata.agentId || (isCanvasStudio ? 'canvas-studio' : null);

  if (!userId) {
    console.log('⚠️ Invoice paid but no userId in metadata, skipping');
    return;
  }

  // --- Transaction record creation (for ALL paid invoices, with dedup) ---
  const amountPaid = (invoiceAny.amount_paid || 0) / 100; // cents → dollars

  if (amountPaid > 0) {
    // Dedup: skip if a transaction was already created for this subscription recently
    // (handleCheckoutSessionCompleted may have already recorded it)
    const recentTxn = await prisma.transaction.findFirst({
      where: {
        stripeSubscriptionId: subscriptionId,
        createdAt: { gte: new Date(Date.now() - 3600000) }, // 1 hour window
      },
    });

    if (!recentTxn) {
      const planType = metadata.plan || 'monthly';
      const agentName = isCanvasStudio
        ? 'Canvas Studio'
        : (metadata.agentName || 'AI Agent');

      const transactionId = `txn_inv_${invoice.id}`;

      await prisma.transaction.create({
        data: {
          transactionId,
          userId,
          type: 'subscription',
          item: {
            agentId: agentId || 'unknown',
            agentName,
            plan: planType,
            invoiceId: invoice.id,
          },
          amount: amountPaid,
          currency: ((invoiceAny.currency as string) || 'usd').toUpperCase(),
          status: 'completed',
          stripeSubscriptionId: subscriptionId,
          stripeInvoiceId: invoice.id,
        },
      });

      console.log(`✅ Transaction created from invoice: ${transactionId} ($${amountPaid})`);
    } else {
      console.log('ℹ️ Transaction already exists for this subscription (dedup):', subscriptionId);
    }
  }

  // --- Subscription reactivation (non-Canvas-Studio only, handled by studio-verify) ---
  if (!isCanvasStudio && agentId) {
    const existingSubscription = await prisma.agentSubscription.findFirst({
      where: { userId, agentId },
    });

    if (existingSubscription && existingSubscription.status !== 'active') {
      await prisma.agentSubscription.update({
        where: { id: existingSubscription.id },
        data: { status: 'active' },
      });
      console.log('Agent subscription reactivated after payment');
    }
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);

  const invoiceAny = invoice as any;

  // Extract subscription ID — handle both old and new Stripe API formats
  const subscriptionId: string | undefined =
    invoiceAny.subscription ||
    invoiceAny.parent?.subscription_details?.subscription ||
    invoiceAny.lines?.data?.[0]?.parent?.subscription_item_details?.subscription;

  if (subscriptionId) {
    // Get metadata — first try from invoice.parent, then from subscription retrieve
    let metadata: Record<string, string> =
      invoiceAny.parent?.subscription_details?.metadata ||
      invoiceAny.lines?.data?.[0]?.metadata ||
      {};

    if (!metadata.userId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        metadata = subscription.metadata || {};
      } catch (err: any) {
        console.log('⚠️ Could not retrieve subscription:', subscriptionId, err.message);
      }
    }

    if (metadata.userId && metadata.agentId) {
      const existingSubscription = await prisma.agentSubscription.findFirst({
        where: {
          userId: metadata.userId,
          agentId: metadata.agentId,
        },
      });

      if (existingSubscription) {
        await prisma.agentSubscription.update({
          where: { id: existingSubscription.id },
          data: { status: 'expired' },
        });
        console.log('Agent subscription marked as expired due to payment failure');
      }
    }
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
