/**
 * Stripe Routes — Universal Chat Backend
 * Handles Stripe webhook events and checkout session creation
 */

import express from 'express';
import Stripe from 'stripe';
import { authPrisma as prisma } from '../lib/auth-prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Lazy Stripe init
let stripe = null;
const getStripe = () => {
    if (!stripe) {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-04-30.basil',
        });
    }
    return stripe;
};

// Valid plans
const VALID_PLANS = ['daily', 'weekly', 'monthly', 'yearly'];

// ============================================
// CHECKOUT — Create Stripe Checkout Session
// ============================================

router.post('/checkout', requireAuth, async (req, res) => {
    try {
        const { agentId, agentName, plan, userId, userEmail } = req.body;

        if (!agentId || !agentName || !plan || !userId || !userEmail) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: agentId, agentName, plan, userId, userEmail',
            });
        }

        if (!VALID_PLANS.includes(plan)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid plan. Must be daily, weekly, monthly, or yearly',
            });
        }

        // Look up pre-created price ID from env — NO dynamic fallback
        const priceEnvKey = `STRIPE_PRICE_${agentId.toUpperCase()}_${plan.toUpperCase()}`;
        const priceId = process.env[priceEnvKey];

        if (!priceId) {
            console.error(`Missing Stripe price ID for env key: ${priceEnvKey}`);
            return res.status(400).json({
                success: false,
                error: `No price configured for ${agentName} ${plan} plan`,
            });
        }

        // Check existing active subscription
        const existing = await prisma.agentSubscription.findFirst({
            where: {
                userId,
                agentId,
                status: 'active',
                expiryDate: { gt: new Date() },
            },
        });

        if (existing) {
            const daysRemaining = Math.ceil(
                (new Date(existing.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return res.status(400).json({
                success: false,
                error: `You already have an active ${existing.plan} subscription for ${agentName}`,
                alreadySubscribed: true,
                existingSubscription: {
                    plan: existing.plan,
                    expiryDate: existing.expiryDate,
                    daysRemaining,
                },
            });
        }

        const baseUrl = process.env.FRONTEND_URL || 'https://sanbayfusion.com';
        const successUrl = `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}&agent=${encodeURIComponent(agentName)}&slug=${agentId}`;
        const cancelUrl = `${baseUrl}/subscribe?agent=${encodeURIComponent(agentName)}&slug=${agentId}&plan=${plan}&cancelled=true`;

        const session = await getStripe().checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: userEmail,
            allow_promotion_codes: true,
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
                metadata: {
                    userId,
                    agentId,
                    agentName,
                    plan,
                    cancelAtPeriodEnd: 'true',
                },
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { userId, agentId, agentName, plan },
        });

        res.json({ success: true, url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create checkout session',
        });
    }
});

// ============================================
// WEBHOOK — Stripe Webhook Handler
// ============================================

// NOTE: This route receives raw body from server.js (express.raw)
router.post('/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).json({ error: 'No stripe-signature header' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
        event = getStripe().webhooks.constructEvent(req.body, signature, webhookSecret);
        console.log('✅ Stripe webhook verified:', event.type, event.id);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            case 'invoice.paid':
                await handleInvoicePaid(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;
            default:
                console.log(`Unhandled webhook event: ${event.type}`);
        }
    } catch (err) {
        console.error('Webhook handler error:', err);
    }

    res.json({ received: true });
});

// ============================================
// WEBHOOK HANDLERS
// ============================================

function safeDateFromUnix(seconds, plan) {
    const base = seconds ? new Date(seconds * 1000) : new Date();
    const date = isNaN(base.getTime()) ? new Date() : base;
    if (!plan) return date;
    const fallback = new Date(date);
    switch (plan) {
        case 'daily': fallback.setDate(fallback.getDate() + 1); break;
        case 'weekly': fallback.setDate(fallback.getDate() + 7); break;
        case 'yearly': fallback.setDate(fallback.getDate() + 365); break;
        case 'monthly': default: fallback.setMonth(fallback.getMonth() + 1); break;
    }
    return fallback;
}

function getPlanType(subscription) {
    const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
    if (interval === 'day') return 'daily';
    if (interval === 'week') return 'weekly';
    if (interval === 'year') return 'yearly';
    return 'monthly';
}

async function handleCheckoutCompleted(session) {
    console.log('🛒 Checkout completed:', session.id);

    const metadata = session.metadata || {};
    const userId = metadata.userId || session.client_reference_id;
    const agentId = metadata.agentId;
    const email = session.customer_email;
    const subscriptionId = session.subscription;

    if (!userId || !agentId) {
        console.log('Missing userId or agentId in checkout metadata');
        return;
    }

    // Avoid duplicates
    if (subscriptionId) {
        const existsByStripe = await prisma.agentSubscription.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
        });
        if (existsByStripe) {
            console.log('Subscription already processed:', subscriptionId);
            return;
        }
    }

    if (session.mode === 'subscription' && subscriptionId) {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);

        // Set cancel at period end (no auto-renewal)
        if (!sub.cancel_at_period_end) {
            try {
                await getStripe().subscriptions.update(sub.id, { cancel_at_period_end: true });
                console.log('✅ Set cancel_at_period_end');
            } catch (e) {
                console.error('Failed to set cancel_at_period_end:', e.message);
            }
        }

        const planType = getPlanType(sub);
        const startDate = safeDateFromUnix(sub.current_period_start);
        const expiryDate = safeDateFromUnix(sub.current_period_end, planType);
        const price = sub.items.data[0]?.price?.unit_amount
            ? sub.items.data[0].price.unit_amount / 100
            : PRICES[planType] / 100;

        // Check if already exists
        const existing = await prisma.agentSubscription.findFirst({
            where: { userId, agentId },
        });

        if (!existing) {
            const agentSub = await prisma.agentSubscription.create({
                data: {
                    userId,
                    agentId,
                    plan: planType,
                    price,
                    status: 'active',
                    startDate,
                    expiryDate,
                    autoRenew: false,
                    stripeSubscriptionId: sub.id,
                },
            });
            console.log('✅ Subscription created:', agentSub.id);
        } else {
            // Reactivate existing
            await prisma.agentSubscription.update({
                where: { id: existing.id },
                data: {
                    plan: planType,
                    price,
                    status: 'active',
                    startDate,
                    expiryDate,
                    stripeSubscriptionId: sub.id,
                },
            });
            console.log('✅ Subscription reactivated:', existing.id);
        }
    }
}

async function handleSubscriptionCreated(subscription) {
    console.log('🆕 Subscription created:', subscription.id);

    // Set cancel at period end
    if (subscription.metadata?.cancelAtPeriodEnd === 'true' && !subscription.cancel_at_period_end) {
        try {
            await getStripe().subscriptions.update(subscription.id, { cancel_at_period_end: true });
        } catch (e) {
            console.error('Failed to set cancel_at_period_end:', e.message);
        }
    }

    const userId = subscription.metadata?.userId;
    const agentId = subscription.metadata?.agentId;
    if (!userId || !agentId) return;

    const existsByStripe = await prisma.agentSubscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
    });
    if (existsByStripe) return;

    const existing = await prisma.agentSubscription.findFirst({
        where: { userId, agentId },
    });
    if (existing) return;

    const planType = getPlanType(subscription);
    const startDate = safeDateFromUnix(subscription.current_period_start);
    const expiryDate = safeDateFromUnix(subscription.current_period_end, planType);

    await prisma.agentSubscription.create({
        data: {
            userId,
            agentId,
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
    console.log('✅ Subscription record created');
}

async function handleSubscriptionUpdated(subscription) {
    console.log('🔄 Subscription updated:', subscription.id);

    const userId = subscription.metadata?.userId;
    const agentId = subscription.metadata?.agentId;
    if (!userId || !agentId) return;

    const planType = getPlanType(subscription);
    const existing = await prisma.agentSubscription.findFirst({
        where: { userId, agentId },
    });

    if (existing) {
        await prisma.agentSubscription.update({
            where: { id: existing.id },
            data: {
                status: subscription.status === 'active' ? 'active' : 'expired',
                expiryDate: safeDateFromUnix(subscription.current_period_end, planType),
            },
        });
    } else {
        const startDate = safeDateFromUnix(subscription.current_period_start);
        const expiryDate = safeDateFromUnix(subscription.current_period_end, planType);
        await prisma.agentSubscription.create({
            data: {
                userId,
                agentId,
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
    }
}

async function handleSubscriptionDeleted(subscription) {
    console.log('🗑️ Subscription deleted:', subscription.id);

    const userId = subscription.metadata?.userId;
    const agentId = subscription.metadata?.agentId;
    if (!userId || !agentId) return;

    const existing = await prisma.agentSubscription.findFirst({
        where: { userId, agentId },
    });

    if (existing) {
        await prisma.agentSubscription.update({
            where: { id: existing.id },
            data: { status: 'cancelled' },
        });
        console.log('Subscription cancelled in DB');
    }
}

async function handleInvoicePaid(invoice) {
    console.log('💰 Invoice paid:', invoice.id);
    if (!invoice.subscription) return;

    const sub = await getStripe().subscriptions.retrieve(invoice.subscription);
    const userId = sub.metadata?.userId;
    const agentId = sub.metadata?.agentId;
    if (!userId || !agentId) return;

    const existing = await prisma.agentSubscription.findFirst({
        where: { userId, agentId },
    });
    if (existing && existing.status !== 'active') {
        await prisma.agentSubscription.update({
            where: { id: existing.id },
            data: { status: 'active' },
        });
    }
}

async function handleInvoicePaymentFailed(invoice) {
    console.log('❌ Invoice payment failed:', invoice.id);
    if (!invoice.subscription) return;

    const sub = await getStripe().subscriptions.retrieve(invoice.subscription);
    const userId = sub.metadata?.userId;
    const agentId = sub.metadata?.agentId;
    if (!userId || !agentId) return;

    const existing = await prisma.agentSubscription.findFirst({
        where: { userId, agentId },
    });
    if (existing) {
        await prisma.agentSubscription.update({
            where: { id: existing.id },
            data: { status: 'expired' },
        });
    }
}

export default router;
