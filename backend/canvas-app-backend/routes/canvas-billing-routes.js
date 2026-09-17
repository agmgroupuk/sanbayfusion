/**
 * GenCraft Pro (Canvas App) Billing Routes
 * 
 * ARCHITECTURE (CLEANED UP):
 * - ALL subscription data lives in the MAIN maulaai database
 * - No local canvas_app DB subscription table usage
 * - Uses agentId='gencraft-pro' to identify this product
 */

import { Router } from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import db, { authPrisma } from '../lib/db.js';

const router = Router();

// Generate CUID-like unique ID for subscriptions
const generateId = () => 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24);

/**
 * Extract authenticated userId from session cookie.
 * Validates against main maulaai DB — never trust query params.
 */
async function getAuthUserId(req) {
    const sessionId = req.cookies?.sessionId || req.cookies?.session_id;
    if (!sessionId) return null;
    try {
        const user = await db.User.findBySessionId(sessionId);
        if (user && (!user.sessionExpiry || new Date(user.sessionExpiry) >= new Date())) {
            req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
            return user.id;
        }
    } catch (err) {
        console.error('[billing] session lookup error:', err.message);
    }
    return null;
}

const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    : null;

// Plan configs — canvas-app has its own pricing separate from canvas-studio
// Prices are configurable via env vars, with defaults as fallback
const CANVAS_APP_PLANS = {
    weekly: { name: 'Canvas App - Weekly', price: Number(process.env.CANVAS_APP_PRICE_WEEKLY) || 7, originalPrice: Number(process.env.CANVAS_APP_ORIGINAL_PRICE_WEEKLY) || 14, mode: 'subscription', interval: 'week', priceEnv: 'STRIPE_PRICE_CANVAS_APP_WEEKLY' },
    monthly: { name: 'Canvas App - Monthly', price: Number(process.env.CANVAS_APP_PRICE_MONTHLY) || 19, originalPrice: Number(process.env.CANVAS_APP_ORIGINAL_PRICE_MONTHLY) || 38, mode: 'subscription', interval: 'month', priceEnv: 'STRIPE_PRICE_CANVAS_APP_MONTHLY' },
    yearly: { name: 'Canvas App - Yearly', price: Number(process.env.CANVAS_APP_PRICE_YEARLY) || 120, originalPrice: Number(process.env.CANVAS_APP_ORIGINAL_PRICE_YEARLY) || 240, mode: 'payment', priceEnv: 'STRIPE_PRICE_CANVAS_APP_YEARLY' },
};

// ─── GET /studio-plans — public pricing info (no auth) ─────────────
router.get('/studio-plans', (req, res) => {
    const plans = Object.entries(CANVAS_APP_PLANS).map(([id, p]) => ({
        id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        interval: p.interval || null,
    }));
    res.json({ success: true, plans });
});

// ─── POST /studio-checkout ─────────────────────────────────────────
router.post('/studio-checkout', async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ success: false, error: 'Stripe not configured' });
        const userId = await getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
        const { plan, userEmail } = req.body;

        if (!plan || !userEmail) {
            return res.status(400).json({ success: false, error: 'Missing required fields: plan, userEmail' });
        }
        if (!['weekly', 'monthly', 'yearly'].includes(plan)) {
            return res.status(400).json({ success: false, error: 'Invalid plan' });
        }

        // Check existing active subscription in MAIN DB only
        try {
            const existing = await authPrisma.$queryRawUnsafe(
                `SELECT id, plan, status, "expiryDate" FROM subscriptions
                 WHERE "userId" = $1 AND "agentId" = 'gencraft-pro' AND status = 'active' AND "expiryDate" > NOW()
                 LIMIT 1`,
                userId
            );
            if (existing && existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `You already have an active ${existing[0].plan} plan.`,
                    alreadySubscribed: true,
                    existingPlan: { plan: existing[0].plan, expiryDate: existing[0].expiryDate, status: existing[0].status },
                });
            }
        } catch (e) {
            console.error('[studio-checkout] existing check error:', e.message);
        }

        const planConfig = CANVAS_APP_PLANS[plan];
        const priceId = process.env[planConfig.priceEnv];

        if (!priceId) {
            return res.status(500).json({ success: false, error: 'Payment configuration not set up yet.' });
        }

        // ALL flows redirect to the unified maula.ai thank-you page (with dashboard + open-app buttons).
        const mainDomain = (req.body.returnUrl || 'https://maula.ai').replace(/\/$/, '');
        const successUrl = `${mainDomain}/payment/success?session_id={CHECKOUT_SESSION_ID}&app=gencraft-pro&plan=${plan}&agent=GenCraft+Pro&slug=gencraft-pro`;
        const cancelUrl = `${mainDomain}/overview/pricing?purchase=cancelled&plan=${plan}`;

        let session;
        if (planConfig.mode === 'payment') {
            session = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                customer_email: userEmail,
                allow_promotion_codes: true,
                line_items: [{ price: priceId, quantity: 1 }],
                metadata: { userId, app: 'canvas-app', plan: 'yearly' },
                success_url: successUrl,
                cancel_url: cancelUrl,
            });
        } else {
            session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                customer_email: userEmail,
                allow_promotion_codes: true,
                line_items: [{ price: priceId, quantity: 1 }],
                subscription_data: { metadata: { userId, app: 'canvas-app', plan, cancelAtPeriodEnd: 'true' } },
                metadata: { userId, app: 'canvas-app', plan },
                success_url: successUrl,
                cancel_url: cancelUrl,
            });
        }

        return res.json({ success: true, url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('Canvas Studio checkout error:', error);
        return res.status(500).json({ success: false, error: 'Checkout failed' });
    }
});

// ─── GET /studio-plan ──────────────────────────────────────────────
router.get('/studio-plan', async (req, res) => {
    try {
        const userId = await getAuthUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        // Main DB is the sole authoritative source for gencraft-pro subscriptions.
        // All purchases (via canvas.maula.ai or maula.ai/overview/pricing) are written here.
        let subscription = null;
        try {
            const mainSubs = await authPrisma.$queryRawUnsafe(
                `SELECT id, "userId", plan, status, "startDate", "expiryDate", "stripeSubscriptionId", price
                 FROM subscriptions
                 WHERE "userId" = $1 AND "agentId" = 'gencraft-pro' AND status = 'active' AND "expiryDate" > NOW()
                 ORDER BY "createdAt" DESC LIMIT 1`,
                userId
            );
            if (mainSubs && mainSubs.length > 0) {
                const ms = mainSubs[0];
                subscription = {
                    id: ms.id,
                    userId: ms.userId,
                    plan: ms.plan,
                    status: ms.status,
                    currentPeriodStart: ms.startDate,
                    currentPeriodEnd: ms.expiryDate,
                    stripeSubscriptionId: ms.stripeSubscriptionId,
                };
            }
        } catch (mainErr) {
            console.error('[studio-plan] main DB error:', mainErr.message);
        }

        if (!subscription) {
            return res.json({ success: true, hasAccess: false, plan: null });
        }

        const now = new Date();
        const isExpired = subscription.currentPeriodEnd && subscription.currentPeriodEnd < now;

        if (isExpired) {
            return res.json({ success: true, hasAccess: false, plan: null, expired: true });
        }

        const diff = subscription.currentPeriodEnd
            ? subscription.currentPeriodEnd.getTime() - now.getTime()
            : 0;

        return res.json({
            success: true,
            hasAccess: true,
            plan: {
                id: subscription.id,
                type: subscription.plan,
                startDate: subscription.currentPeriodStart,
                expiryDate: subscription.currentPeriodEnd,
                isYearly: subscription.plan === 'pro_yearly' || subscription.plan === 'yearly',
                daysRemaining: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hoursRemaining: Math.floor(diff / (1000 * 60 * 60)),
                stripeSubscriptionId: subscription.stripeSubscriptionId,
            },
        });
    } catch (error) {
        console.error('Canvas Studio plan check error:', error);
        return res.status(500).json({ success: false, error: 'Failed to check plan status' });
    }
});

// ─── POST /studio-verify ──────────────────────────────────────────
// MAIN DB ONLY — writes subscription directly to maulaai database
router.post('/studio-verify', async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ success: false, error: 'Stripe not configured' });
        const userId = await getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Missing sessionId' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ success: false, error: 'Payment not completed' });
        }

        const metadata = session.metadata;
        if (!metadata || metadata.app !== 'canvas-app') {
            return res.status(400).json({ success: false, error: 'Invalid session — this session belongs to a different product' });
        }

        // SECURITY: userId MUST match the Stripe metadata — prevent subscription hijacking
        if (metadata.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Session does not belong to this user' });
        }

        const plan = metadata.plan; // weekly | monthly | yearly
        const stripeSubId = session.subscription
            ? (typeof session.subscription === 'string' ? session.subscription : session.subscription.id)
            : session.id;

        // Check if already processed in MAIN DB
        const existingRows = await authPrisma.$queryRawUnsafe(
            `SELECT id, plan, "expiryDate" FROM subscriptions 
             WHERE "stripeSubscriptionId" = $1 AND "agentId" = 'gencraft-pro' LIMIT 1`,
            stripeSubId
        );
        if (existingRows && existingRows.length > 0) {
            return res.json({
                success: true,
                message: 'Already activated',
                plan: { type: existingRows[0].plan, expiryDate: existingRows[0].expiryDate },
            });
        }

        // Cancel any existing active subs in MAIN DB
        await authPrisma.$executeRawUnsafe(
            `UPDATE subscriptions SET status = 'cancelled'::"SubscriptionStatus", "updatedAt" = NOW()
             WHERE "userId" = $1 AND "agentId" = 'gencraft-pro' AND status = 'active'`,
            metadata.userId
        );

        // Calculate period dates
        const now = new Date();
        let periodEnd;
        if (plan === 'yearly') {
            periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        } else if (plan === 'weekly') {
            periodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
            periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        // Ensure cancel_at_period_end for recurring subscriptions
        if (plan !== 'yearly' && session.subscription) {
            const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
            try { await stripe.subscriptions.update(subId, { cancel_at_period_end: true }); } catch (e) {
                console.error('Failed to set cancel_at_period_end:', e);
            }
        }

        // Write subscription to MAIN maulaai DB ONLY
        const price = plan === 'yearly' ? 120 : plan === 'monthly' ? 19 : 7;
        const subId = generateId();
        await authPrisma.$executeRawUnsafe(
            `INSERT INTO subscriptions (id, "userId", "agentId", plan, price, status, "startDate", "expiryDate", "autoRenew", "stripeSubscriptionId", "createdAt", "updatedAt")
             VALUES ($1, $2, 'gencraft-pro', $3::"SubscriptionPlan", $4, 'active'::"SubscriptionStatus", $5, $6, false, $7, NOW(), NOW())`,
            subId,
            metadata.userId,
            plan,
            price,
            now,
            periodEnd,
            stripeSubId
        );

        console.log(`✅ GenCraft Pro ${plan} plan activated for user ${metadata.userId}`);

        return res.json({
            success: true,
            message: `GenCraft Pro ${plan} plan activated!`,
            plan: { type: plan, startDate: now, expiryDate: periodEnd, isYearly: plan === 'yearly' },
        });
    } catch (error) {
        console.error('GenCraft Pro verify error:', error);
        return res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// ─── GET /studio-subscriptions ────────────────────────────────────
// MAIN DB ONLY
router.get('/studio-subscriptions', async (req, res) => {
    try {
        const userId = await getAuthUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        // Query MAIN DB directly
        const rows = await authPrisma.$queryRawUnsafe(
            `SELECT id, plan, status, "startDate", "expiryDate", "stripeSubscriptionId", price, "createdAt"
             FROM subscriptions
             WHERE "userId" = $1 AND "agentId" = 'gencraft-pro'
             ORDER BY "createdAt" DESC`,
            userId
        );

        return res.json({
            success: true,
            subscriptions: (rows || []).map(sub => ({
                id: sub.id,
                app: 'gencraft-pro',
                appLabel: 'GenCraft Pro',
                plan: sub.plan,
                status: sub.status,
                price: sub.plan === 'yearly' ? 120 : sub.plan === 'monthly' ? 19 : sub.plan === 'weekly' ? 7 : 0,
                startDate: sub.startDate,
                expiryDate: sub.expiryDate,
                stripeSubscriptionId: sub.stripeSubscriptionId,
                createdAt: sub.createdAt,
            })),
        });
    } catch (error) {
        console.error('GenCraft Pro subscriptions list error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
    }
});

// ─── POST /studio-cancel ──────────────────────────────────────────
// MAIN DB ONLY
router.post('/studio-cancel', async (req, res) => {
    try {
        const userId = await getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

        // Check MAIN DB only
        const rows = await authPrisma.$queryRawUnsafe(
            `SELECT id, "stripeSubscriptionId", plan FROM subscriptions
             WHERE "userId" = $1 AND "agentId" = 'gencraft-pro' AND status = 'active'
             ORDER BY "createdAt" DESC LIMIT 1`,
            userId
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No active GenCraft Pro subscription found' });
        }

        const sub = rows[0];

        // Cancel in Stripe if recurring subscription
        if (sub.stripeSubscriptionId && sub.plan !== 'yearly') {
            if (stripe) {
                try {
                    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
                    console.log(`[gencraft-cancel] Stripe subscription ${sub.stripeSubscriptionId} cancelled`);
                } catch (e) {
                    console.error(`[gencraft-cancel] Stripe cancel error:`, e.message);
                }
            }
        }

        // Cancel in MAIN DB
        await authPrisma.$executeRawUnsafe(
            `UPDATE subscriptions SET status = 'cancelled'::"SubscriptionStatus", "autoRenew" = false, "updatedAt" = NOW()
             WHERE id = $1`,
            sub.id
        );

        console.log(`✅ GenCraft Pro subscription cancelled for user ${userId}`);
        return res.json({ success: true, message: 'Subscription cancelled successfully' });
    } catch (error) {
        console.error('GenCraft Pro cancel error:', error);
        return res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
    }
});

// ─── POST /studio-webhook — Stripe Webhook ────────────────────────
// Handles subscription lifecycle events: renewals, cancellations, failures.
// MAIN DB ONLY — all operations go to maulaai database
router.post('/studio-webhook', async (req, res) => {
    if (!stripe) return res.status(503).send('Stripe not configured');

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('[webhook] STRIPE_WEBHOOK_SECRET not set — rejecting');
        return res.status(500).send('Webhook not configured');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('[webhook] Signature verification failed:', err.message);
        return res.status(400).send('Webhook signature verification failed');
    }

    console.log(`[webhook] Received event: ${event.type}`);

    try {
        switch (event.type) {
            // Subscription renewed successfully
            case 'invoice.paid': {
                const invoice = event.data.object;
                const subId = invoice.subscription;
                if (!subId) break;

                const stripeSub = await stripe.subscriptions.retrieve(subId);
                await authPrisma.$executeRawUnsafe(
                    `UPDATE subscriptions SET 
                        status = 'active'::"SubscriptionStatus",
                        "startDate" = $2,
                        "expiryDate" = $3,
                        "updatedAt" = NOW()
                     WHERE "stripeSubscriptionId" = $1 AND "agentId" = 'gencraft-pro'`,
                    subId,
                    new Date(stripeSub.current_period_start * 1000),
                    new Date(stripeSub.current_period_end * 1000)
                );
                console.log(`[webhook] Subscription renewed: ${subId}`);
                break;
            }

            // Subscription cancelled
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                await authPrisma.$executeRawUnsafe(
                    `UPDATE subscriptions SET status = 'cancelled'::"SubscriptionStatus", "updatedAt" = NOW()
                     WHERE "stripeSubscriptionId" = $1 AND "agentId" = 'gencraft-pro'`,
                    sub.id
                );
                console.log(`[webhook] Subscription cancelled: ${sub.id}`);
                break;
            }

            // Payment failed
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const subId = invoice.subscription;
                if (!subId) break;
                console.warn(`[webhook] Payment failed for subscription ${subId}`);
                break;
            }

            // One-time payment completed (yearly plan)
            case 'checkout.session.completed': {
                const session = event.data.object;
                const metadata = session.metadata;
                if (!metadata || metadata.app !== 'canvas-app') break;
                if (session.payment_status !== 'paid') break;

                const stripeSubId = session.subscription || session.id;
                
                // Check if already processed
                const existing = await authPrisma.$queryRawUnsafe(
                    `SELECT id FROM subscriptions WHERE "stripeSubscriptionId" = $1 AND "agentId" = 'gencraft-pro' LIMIT 1`,
                    stripeSubId
                );
                if (existing && existing.length > 0) break;

                const plan = metadata.plan;
                const now = new Date();
                let periodEnd;
                if (plan === 'yearly') {
                    periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
                } else if (plan === 'weekly') {
                    periodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                } else {
                    periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                }

                // Cancel existing active subs
                await authPrisma.$executeRawUnsafe(
                    `UPDATE subscriptions SET status = 'cancelled'::"SubscriptionStatus", "updatedAt" = NOW()
                     WHERE "userId" = $1 AND "agentId" = 'gencraft-pro' AND status = 'active'`,
                    metadata.userId
                );

                // Create new subscription
                const price = plan === 'yearly' ? 120 : plan === 'monthly' ? 19 : 7;
                const newSubId = generateId();
                await authPrisma.$executeRawUnsafe(
                    `INSERT INTO subscriptions (id, "userId", "agentId", plan, price, status, "startDate", "expiryDate", "autoRenew", "stripeSubscriptionId", "createdAt", "updatedAt")
                     VALUES ($1, $2, 'gencraft-pro', $3::"SubscriptionPlan", $4, 'active'::"SubscriptionStatus", $5, $6, false, $7, NOW(), NOW())`,
                    newSubId,
                    metadata.userId,
                    plan,
                    price,
                    now,
                    periodEnd,
                    stripeSubId
                );
                console.log(`[webhook] Checkout completed — ${plan} plan activated for user ${metadata.userId}`);
                break;
            }

            default:
                break;
        }
    } catch (err) {
        console.error(`[webhook] Error processing ${event.type}:`, err);
    }

    res.json({ received: true });
});

export default router;
