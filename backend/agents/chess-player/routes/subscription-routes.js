/**
 * Subscription Routes — Universal Chat Backend
 * Check, cancel, and manage agent subscriptions
 */

import express from 'express';
import Stripe from 'stripe';
import { authPrisma as prisma } from '../lib/auth-prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

let stripe = null;
const getStripe = () => {
    if (!stripe) {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-04-30.basil',
        });
    }
    return stripe;
};

// ============================================
// CHECK — Check if user has active subscription for agent
// ============================================

router.post('/check', requireAuth, async (req, res) => {
    try {
        const { userId, agentId } = req.body;

        if (req.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to check this user\'s subscriptions' });
        }

        if (!userId || !agentId) {
            return res.status(400).json({
                success: false,
                error: 'userId and agentId are required',
            });
        }

        const subscription = await prisma.agentSubscription.findFirst({
            where: {
                userId,
                agentId,
                status: 'active',
                expiryDate: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        let daysRemaining = 0;
        if (subscription?.expiryDate) {
            daysRemaining = Math.ceil(
                (new Date(subscription.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
        }

        res.json({
            hasAccess: !!subscription,
            hasActiveSubscription: !!subscription,
            subscription: subscription
                ? { ...subscription, daysRemaining, daysUntilRenewal: daysRemaining }
                : null,
        });
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({ success: false, error: 'Failed to check subscription' });
    }
});

// ============================================
// GET USER SUBSCRIPTIONS
// ============================================

router.get('/user/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to view this user\'s subscriptions' });
        }

        const subscriptions = await prisma.agentSubscription.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                agent: {
                    select: { name: true, avatarUrl: true, specialty: true },
                },
            },
        });

        res.json({ success: true, count: subscriptions.length, subscriptions });
    } catch (error) {
        console.error('Fetch subscriptions error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch subscriptions', subscriptions: [] });
    }
});

// ============================================
// CANCEL — Cancel subscription
// ============================================

router.post('/cancel', requireAuth, async (req, res) => {
    try {
        const { userId, agentId } = req.body;

        if (!userId || !agentId) {
            return res.status(400).json({ success: false, error: 'userId and agentId are required' });
        }

        if (req.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to cancel this user\'s subscription' });
        }

        const subscription = await prisma.agentSubscription.findFirst({
            where: {
                userId,
                agentId,
                status: 'active',
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!subscription) {
            return res.status(404).json({ success: false, error: 'No active subscription found' });
        }

        // Cancel Stripe subscription if exists
        if (subscription.stripeSubscriptionId) {
            try {
                await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
                console.log('✅ Stripe subscription cancelled:', subscription.stripeSubscriptionId);
            } catch (err) {
                console.error('Stripe cancel error (non-critical):', err.message);
            }
        }

        // Update DB
        await prisma.agentSubscription.update({
            where: { id: subscription.id },
            data: { status: 'cancelled' },
        });

        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            subscription: { ...subscription, status: 'cancelled' },
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
    }
});

// ============================================
// CHECK ACCESS — Quick check by userId/agentId params
// ============================================

router.get('/check/:userId/:agentId', requireAuth, async (req, res) => {
    try {
        const { userId, agentId } = req.params;

        if (req.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to check this user\'s subscriptions' });
        }

        const subscription = await prisma.agentSubscription.findFirst({
            where: {
                userId,
                agentId,
                status: 'active',
                expiryDate: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        let daysRemaining = 0;
        if (subscription?.expiryDate) {
            daysRemaining = Math.ceil(
                (new Date(subscription.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
        }

        res.json({
            hasActiveSubscription: !!subscription,
            hasAccess: !!subscription,
            subscription: subscription
                ? { ...subscription, daysRemaining }
                : null,
        });
    } catch (error) {
        console.error('Check access error:', error);
        res.status(500).json({ error: 'Failed to check subscription' });
    }
});

export default router;
