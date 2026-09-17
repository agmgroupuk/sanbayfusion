/**
 * AGENT SUBSCRIPTIONS ROUTER
 * Handles /api/subscriptions/* routes
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';
import db from '../lib/db.js';

const router = express.Router();

// GET /api/subscriptions — list user subscriptions
router.get('/', async (req, res) => {
    try {
        const sessionId = req.cookies?.sessionId;
        if (!sessionId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const user = await db.User.findBySessionId(sessionId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const subscriptions = await db.AgentSubscription.findByUser(user.id);
        res.json({ success: true, subscriptions });
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /api/subscriptions/check/:agentId — check if user has active subscription
router.get('/check/:agentId', async (req, res) => {
    try {
        const sessionId = req.cookies?.sessionId;
        if (!sessionId) {
            return res.json({ success: true, hasSubscription: false });
        }

        const user = await db.User.findBySessionId(sessionId);
        if (!user) {
            return res.json({ success: true, hasSubscription: false });
        }

        const sub = await db.AgentSubscription.findActiveByUserAndAgent(user.id, req.params.agentId);
        res.json({ success: true, hasSubscription: !!sub, subscription: sub });
    } catch (error) {
        console.error('Check subscription error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/subscriptions — create a new subscription
router.post('/', async (req, res) => {
    try {
        const sessionId = req.cookies?.sessionId;
        if (!sessionId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const user = await db.User.findBySessionId(sessionId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const { agentId, plan, stripeSubscriptionId } = req.body;

        const subscription = await db.AgentSubscription.create({
            userId: user.id,
            agentId,
            plan: plan || 'monthly',
            status: 'active',
            stripeSubscriptionId,
            startDate: new Date(),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        });

        res.json({ success: true, subscription });
    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// DELETE /api/subscriptions/:id — cancel a subscription
router.delete('/:id', async (req, res) => {
    try {
        const sessionId = req.cookies?.sessionId;
        if (!sessionId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const user = await db.User.findBySessionId(sessionId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const subscription = await db.AgentSubscription.cancel(req.params.id);
        res.json({ success: true, subscription });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/subscriptions/cancel — cancel by subscriptionId/agentId (used by billing page)
router.post('/cancel', async (req, res) => {
    try {
        const sessionId = req.cookies?.sessionId;
        if (!sessionId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const user = await db.User.findBySessionId(sessionId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const { subscriptionId, agentId } = req.body;

        // Find the subscription — by ID or by user+agent
        let sub;
        if (subscriptionId) {
            sub = await db.AgentSubscription.findById(subscriptionId);
        }
        if (!sub && agentId) {
            sub = await db.AgentSubscription.findActiveByUserAndAgent(user.id, agentId);
        }
        if (!sub) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        // Verify ownership
        if (sub.userId !== user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Cancel in Stripe if applicable
        if (sub.stripeSubscriptionId) {
            try {
                const Stripe = (await import('stripe')).default;
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
            } catch (stripeErr) {
                console.error('Stripe cancel error (non-critical):', stripeErr.message);
            }
        }

        // Cancel in DB
        const cancelled = await db.AgentSubscription.cancel(sub.id);
        res.json({ success: true, subscription: cancelled });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;
