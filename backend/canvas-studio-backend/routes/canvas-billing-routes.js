/**
 * Canvas Studio Billing Routes (Express)
 * 
 * ARCHITECTURE (CLEANED UP):
 * - ALL subscription data lives in the MAIN maulaai database
 * - No local canvas_studio DB subscription table usage
 * - Uses agentId='canvas-studio' to identify this product
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

// Plan configs
const CANVAS_STUDIO_PLANS = {
    weekly: { name: 'Canvas Studio - Weekly', price: 10, mode: 'subscription', interval: 'week', priceEnv: 'STRIPE_PRICE_CANVAS_STUDIO_WEEKLY' },
    monthly: { name: 'Canvas Studio - Monthly', price: 30, mode: 'subscription', interval: 'month', priceEnv: 'STRIPE_PRICE_CANVAS_STUDIO_MONTHLY' },
    yearly: { name: 'Canvas Studio - Yearly', price: 300, mode: 'payment', priceEnv: 'STRIPE_PRICE_CANVAS_STUDIO_YEARLY' },
};

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
                 WHERE "userId" = $1 AND "agentId" = 'canvas-studio' AND status = 'active' AND "expiryDate" > NOW()
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

        const planConfig = CANVAS_STUDIO_PLANS[plan];
        const priceId = process.env[planConfig.priceEnv];

        if (!priceId) {
            return res.status(500).json({ success: false, error: 'Payment configuration not set up yet.' });
        }

        // ALL flows redirect to the unified maula.ai thank-you page (with dashboard + open-app buttons).
        const mainDomain = (req.body.returnUrl || 'https://maula.ai').replace(/\/$/, '');
        const successUrl = `${mainDomain}/payment/success?session_id={CHECKOUT_SESSION_ID}&app=canvas-studio&plan=${plan}&agent=Canvas+Studio&slug=canvas-studio`;
        const cancelUrl = `${mainDomain}/overview/studio?purchase=cancelled&plan=${plan}`;

        let session;
        if (planConfig.mode === 'payment') {
            session = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                customer_email: userEmail,
                allow_promotion_codes: true,
                line_items: [{ price: priceId, quantity: 1 }],
                metadata: { userId, app: 'canvas-studio', plan: 'yearly' },
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
                subscription_data: { metadata: { userId, app: 'canvas-studio', plan, cancelAtPeriodEnd: 'true' } },
                metadata: { userId, app: 'canvas-studio', plan },
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
// MAIN DB ONLY — no local DB fallback
router.get('/studio-plan', async (req, res) => {
    try {
        const userId = await getAuthUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        // Query MAIN maulaai DB directly — single source of truth
        let subscription = null;
        try {
            const rows = await authPrisma.$queryRawUnsafe(
                `SELECT id, "userId", plan, status, "startDate", "expiryDate", "stripeSubscriptionId", price
                 FROM subscriptions
                 WHERE "userId" = $1 AND "agentId" = 'canvas-studio' AND status = 'active' AND "expiryDate" > NOW()
                 ORDER BY "createdAt" DESC LIMIT 1`,
                userId
            );
            if (rows && rows.length > 0) {
                const r = rows[0];
                subscription = {
                    id: r.id,
                    userId: r.userId,
                    plan: r.plan,
                    status: r.status,
                    currentPeriodStart: r.startDate,
                    currentPeriodEnd: r.expiryDate,
                    stripeSubscriptionId: r.stripeSubscriptionId,
                };
            }
        } catch (err) {
            console.error('[studio-plan] DB error:', err.message);
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        if (!subscription) {
            return res.json({ success: true, hasAccess: false, plan: null });
        }

        const now = new Date();
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
        if (!metadata || metadata.app !== 'canvas-studio') {
            return res.status(400).json({ success: false, error: 'Invalid session' });
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
             WHERE "stripeSubscriptionId" = $1 AND "agentId" = 'canvas-studio' LIMIT 1`,
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
             WHERE "userId" = $1 AND "agentId" = 'canvas-studio' AND status = 'active'`,
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
        const price = plan === 'yearly' ? 300 : plan === 'monthly' ? 30 : 10;
        const subId = generateId();
        await authPrisma.$executeRawUnsafe(
            `INSERT INTO subscriptions (id, "userId", "agentId", plan, price, status, "startDate", "expiryDate", "autoRenew", "stripeSubscriptionId", "createdAt", "updatedAt")
             VALUES ($1, $2, 'canvas-studio', $3::"SubscriptionPlan", $4, 'active'::"SubscriptionStatus", $5, $6, false, $7, NOW(), NOW())`,
            subId,
            metadata.userId,
            plan,
            price,
            now,
            periodEnd,
            stripeSubId
        );

        console.log(`✅ Canvas Studio ${plan} plan activated for user ${metadata.userId}`);

        return res.json({
            success: true,
            message: `Canvas Studio ${plan} plan activated!`,
            plan: { type: plan, startDate: now, expiryDate: periodEnd, isYearly: plan === 'yearly' },
        });
    } catch (error) {
        console.error('Canvas Studio verify error:', error);
        return res.status(500).json({ success: false, error: 'Verification failed' });
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
             WHERE "userId" = $1 AND "agentId" = 'canvas-studio' AND status = 'active'
             ORDER BY "createdAt" DESC LIMIT 1`,
            userId
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No active Canvas Studio subscription found' });
        }

        const sub = rows[0];

        // Cancel in Stripe if recurring subscription
        if (sub.stripeSubscriptionId && sub.plan !== 'yearly') {
            if (stripe) {
                try {
                    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
                } catch (e) {
                    console.error('[studio-cancel] Stripe cancel error:', e.message);
                }
            }
        }

        // Cancel in MAIN DB
        await authPrisma.$executeRawUnsafe(
            `UPDATE subscriptions SET status = 'cancelled'::"SubscriptionStatus", "autoRenew" = false, "updatedAt" = NOW()
             WHERE id = $1`,
            sub.id
        );

        console.log(`✅ Canvas Studio subscription cancelled for user ${userId}`);
        return res.json({ success: true, message: 'Subscription cancelled successfully' });
    } catch (error) {
        console.error('Canvas Studio cancel error:', error);
        return res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
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
             WHERE "userId" = $1 AND "agentId" = 'canvas-studio'
             ORDER BY "createdAt" DESC`,
            userId
        );

        return res.json({
            success: true,
            subscriptions: (rows || []).map(sub => ({
                id: sub.id,
                app: 'canvas-studio',
                appLabel: 'Canvas Studio',
                plan: sub.plan,
                status: sub.status,
                price: sub.plan === 'yearly' ? 300 : sub.plan === 'monthly' ? 30 : sub.plan === 'weekly' ? 10 : 0,
                startDate: sub.startDate,
                expiryDate: sub.expiryDate,
                stripeSubscriptionId: sub.stripeSubscriptionId,
                createdAt: sub.createdAt,
            })),
        });
    } catch (error) {
        console.error('Canvas Studio subscriptions list error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
    }
});

// ─── GET /studio-dashboard ────────────────────────────────────────
// Returns aggregated stats for the Canvas Studio dashboard page
// Uses local DB for apps/projects/deployments, MAIN DB for subscriptions
router.get('/studio-dashboard', async (req, res) => {
    try {
        const userId = await getAuthUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        // Stats from local canvas_studio DB (apps, projects, deployments)
        const [appsCount, projectsCount, deploymentsCount, recentApps, recentProjects, recentDeployments] = await Promise.all([
            prisma.canvasApp.count({ where: { userId } }),
            prisma.canvasProject.count({ where: { userId } }),
            prisma.canvasDeployHistory.count({ where: { userId } }),
            prisma.canvasApp.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, prompt: true, language: true, source: true, deployedUrl: true, createdAt: true, updatedAt: true },
            }),
            prisma.canvasProject.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                select: { id: true, name: true, description: true, source: true, createdAt: true, updatedAt: true },
            }),
            prisma.canvasDeployHistory.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, platform: true, projectName: true, url: true, status: true, error: true, createdAt: true },
            }),
        ]);

        // Subscription from MAIN DB
        let plan = null;
        try {
            const rows = await authPrisma.$queryRawUnsafe(
                `SELECT plan, status, "startDate", "expiryDate"
                 FROM subscriptions
                 WHERE "userId" = $1 AND "agentId" = 'canvas-studio' AND status = 'active' AND "expiryDate" > NOW()
                 ORDER BY "createdAt" DESC LIMIT 1`,
                userId
            );
            if (rows && rows.length > 0) {
                const r = rows[0];
                plan = {
                    type: r.plan,
                    status: r.status,
                    startDate: r.startDate,
                    expiryDate: r.expiryDate,
                    daysRemaining: Math.max(0, Math.floor((new Date(r.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
                };
            }
        } catch (err) {
            console.error('[studio-dashboard] subscription lookup error:', err.message);
        }

        return res.json({
            success: true,
            stats: { apps: appsCount, projects: projectsCount, deployments: deploymentsCount },
            plan,
            recentApps,
            recentProjects,
            recentDeployments,
        });
    } catch (error) {
        console.error('Canvas Studio dashboard error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
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
                     WHERE "stripeSubscriptionId" = $1 AND "agentId" = 'canvas-studio'`,
                    subId,
                    new Date(stripeSub.current_period_start * 1000),
                    new Date(stripeSub.current_period_end * 1000)
                );
                console.log(`[webhook] Subscription renewed: ${subId}`);
                break;
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                await authPrisma.$executeRawUnsafe(
                    `UPDATE subscriptions SET status = 'cancelled'::"SubscriptionStatus", "updatedAt" = NOW()
                     WHERE "stripeSubscriptionId" = $1 AND "agentId" = 'canvas-studio'`,
                    sub.id
                );
                console.log(`[webhook] Subscription cancelled: ${sub.id}`);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const subId = invoice.subscription;
                if (!subId) break;
                console.warn(`[webhook] Payment failed for subscription ${subId}`);
                break;
            }

            case 'checkout.session.completed': {
                const session = event.data.object;
                const metadata = session.metadata;
                if (!metadata || metadata.app !== 'canvas-studio') break;
                if (session.payment_status !== 'paid') break;

                const stripeSubId = session.subscription || session.id;
                
                // Check if already processed
                const existing = await authPrisma.$queryRawUnsafe(
                    `SELECT id FROM subscriptions WHERE "stripeSubscriptionId" = $1 AND "agentId" = 'canvas-studio' LIMIT 1`,
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
                     WHERE "userId" = $1 AND "agentId" = 'canvas-studio' AND status = 'active'`,
                    metadata.userId
                );

                // Create new subscription
                const price = plan === 'yearly' ? 300 : plan === 'monthly' ? 30 : 10;
                const newSubId = generateId();
                await authPrisma.$executeRawUnsafe(
                    `INSERT INTO subscriptions (id, "userId", "agentId", plan, price, status, "startDate", "expiryDate", "autoRenew", "stripeSubscriptionId", "createdAt", "updatedAt")
                     VALUES ($1, $2, 'canvas-studio', $3::"SubscriptionPlan", $4, 'active'::"SubscriptionStatus", $5, $6, false, $7, NOW(), NOW())`,
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

// ─── GET /studio-usage — Real usage metrics ───────────────────────
router.get('/studio-usage', async (req, res) => {
    try {
        const userId = await getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

        // Count real AI generations from chat sessions in main DB
        let aiGenerations = 0;
        let tokensUsed = 0;
        try {
            const genRows = await authPrisma.$queryRawUnsafe(
                `SELECT COUNT(*) as count FROM chat_sessions
                 WHERE "userId" = $1 AND "agentId" = 'canvas-studio'`,
                userId
            );
            aiGenerations = Number(genRows?.[0]?.count) || 0;

            // Estimate tokens from interactions
            const tokenRows = await authPrisma.$queryRawUnsafe(
                `SELECT COALESCE(SUM(CAST(metadata->>'tokens' AS INTEGER)), 0) as total
                 FROM chat_analytics_interactions
                 WHERE "userId" = $1 AND "agentId" = 'canvas-studio'`,
                userId
            );
            tokensUsed = Number(tokenRows?.[0]?.total) || aiGenerations * 350;
        } catch { }

        // Count storage usage
        const [assetsAgg, filesAgg] = await Promise.all([
            prisma.asset.aggregate({
                where: { userId },
                _sum: { optimizedSize: true, originalSize: true },
                _count: true,
            }),
            prisma.projectFile.aggregate({
                where: { project: { userId } },
                _sum: { size: true },
                _count: true,
            }),
        ]);

        const storageUsed = (assetsAgg._sum.optimizedSize || assetsAgg._sum.originalSize || 0) + (filesAgg._sum.size || 0);
        const buildsCount = await prisma.build.count({ where: { userId } });

        // Get plan from MAIN DB
        let plan = 'free';
        try {
            const rows = await authPrisma.$queryRawUnsafe(
                `SELECT plan FROM subscriptions WHERE "userId" = $1 AND "agentId" = 'canvas-studio' AND status = 'active' AND "expiryDate" > NOW() LIMIT 1`,
                userId
            );
            if (rows && rows.length > 0) {
                plan = rows[0].plan;
            }
        } catch (e) {
            console.error('[studio-usage] plan lookup error:', e.message);
        }
        const isYearly = plan.includes('yearly');
        const isPro = plan !== 'free';

        const limits = {
            generations: isPro ? (isYearly ? 50000 : 5000) : 500,
            tokens: isPro ? (isYearly ? 25000000 : 2500000) : 250000,
            storage: isPro ? (isYearly ? 10737418240 : 5368709120) : 524288000, // 10GB / 5GB / 500MB
            builds: isPro ? (isYearly ? 5000 : 500) : 50,
        };

        res.json({
            success: true,
            metrics: [
                { label: 'AI Generations', used: aiGenerations, limit: limits.generations, unit: 'requests', icon: 'generations' },
                { label: 'Tokens Used', used: tokensUsed, limit: limits.tokens, unit: 'tokens', icon: 'tokens' },
                { label: 'Storage', used: storageUsed, limit: limits.storage, unit: 'bytes', icon: 'storage' },
                { label: 'Builds', used: buildsCount, limit: limits.builds, unit: 'builds', icon: 'compute' },
            ],
            plan: plan,
        });
    } catch (error) {
        console.error('[studio-usage] error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch usage' });
    }
});

// ─── GET /studio-invoices — Real invoices from Stripe ─────────────
// MAIN DB ONLY
router.get('/studio-invoices', async (req, res) => {
    try {
        const userId = await getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

        // Get subscriptions from MAIN DB
        let mainSubs = [];
        try {
            mainSubs = await authPrisma.$queryRawUnsafe(
                `SELECT plan, price, status, "startDate", "expiryDate", "stripeSubscriptionId", "createdAt"
                 FROM subscriptions
                 WHERE "userId" = $1 AND "agentId" = 'canvas-studio'
                 ORDER BY "createdAt" DESC LIMIT 20`,
                userId
            );
        } catch (e) {
            console.error('[studio-invoices] DB error:', e.message);
        }

        // Build invoices from subscription records
        const invoices = [];
        const allSubs = mainSubs.map(ms => ({
            plan: ms.plan,
            status: ms.status,
            startDate: ms.startDate,
            stripeId: ms.stripeSubscriptionId,
            createdAt: ms.createdAt,
            price: ms.price,
        }));

        // Deduplicate by stripeId
        const seen = new Set();
        for (const sub of allSubs) {
            const key = sub.stripeId || sub.createdAt?.toISOString();
            if (seen.has(key)) continue;
            seen.add(key);

            const price = sub.price || (
                sub.plan?.includes('yearly') ? 30000 :
                    sub.plan?.includes('monthly') ? 3000 :
                        sub.plan === 'weekly' ? 1000 : 0
            );

            invoices.push({
                id: sub.stripeId || `inv_${key}`,
                date: new Date(sub.startDate || sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                amount: price,
                currency: 'usd',
                status: sub.status === 'active' ? 'paid' : sub.status === 'cancelled' ? 'paid' : 'pending',
                description: `Canvas Studio — ${sub.plan || 'plan'}`,
                paymentMethod: 'Card',
            });
        }

        res.json({ success: true, invoices });
    } catch (error) {
        console.error('[studio-invoices] error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
    }
});

export default router;
