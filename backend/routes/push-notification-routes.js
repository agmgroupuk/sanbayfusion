import express from 'express';
import webpush from 'web-push';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:support@sanbayfusion.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    console.log('[Push] VAPID keys configured');
} else {
    console.warn('[Push] VAPID keys not found in environment — push notifications disabled');
}

// ─── GET /api/push/vapid-public-key ───
router.get('/vapid-public-key', (req, res) => {
    if (!VAPID_PUBLIC_KEY) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ─── POST /api/push/subscribe ───
router.post('/subscribe', async (req, res) => {
    try {
        const { subscription, userId } = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        // If userId provided, store subscription in user preferences
        if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user) {
                const prefs = user.preferences || {};
                const subs = prefs.pushSubscriptions || [];

                // Avoid duplicates
                const exists = subs.some((s) => s.endpoint === subscription.endpoint);
                if (!exists) {
                    subs.push({
                        endpoint: subscription.endpoint,
                        keys: subscription.keys,
                        createdAt: new Date().toISOString(),
                    });
                }

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        preferences: { ...prefs, pushSubscriptions: subs },
                    },
                });
            }
        }

        res.json({ success: true, message: 'Subscription saved' });
    } catch (error) {
        console.error('[Push] Subscribe error:', error);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

// ─── POST /api/push/unsubscribe ───
router.post('/unsubscribe', async (req, res) => {
    try {
        const { endpoint, userId } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint required' });
        }

        if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user) {
                const prefs = user.preferences || {};
                const subs = (prefs.pushSubscriptions || []).filter(
                    (s) => s.endpoint !== endpoint
                );

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        preferences: { ...prefs, pushSubscriptions: subs },
                    },
                });
            }
        }

        res.json({ success: true, message: 'Subscription removed' });
    } catch (error) {
        console.error('[Push] Unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to remove subscription' });
    }
});

// ─── POST /api/push/send ───
// Send notification to a specific user
router.post('/send', async (req, res) => {
    try {
        const { userId, title, body, url, icon } = req.body;

        if (!userId || !title) {
            return res.status(400).json({ error: 'userId and title are required' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const prefs = user.preferences || {};
        const subs = prefs.pushSubscriptions || [];

        if (subs.length === 0) {
            return res.status(404).json({ error: 'No push subscriptions for this user' });
        }

        const payload = JSON.stringify({
            title,
            body: body || '',
            icon: icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            url: url || '/',
            timestamp: Date.now(),
        });

        const results = await Promise.allSettled(
            subs.map((sub) =>
                webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    payload
                )
            )
        );

        // Clean up expired subscriptions (410 Gone)
        const expiredEndpoints = [];
        results.forEach((result, i) => {
            if (result.status === 'rejected' && result.reason.statusCode === 410) {
                expiredEndpoints.push(subs[i].endpoint);
            }
        });

        if (expiredEndpoints.length > 0) {
            const cleanedSubs = subs.filter(
                (s) => !expiredEndpoints.includes(s.endpoint)
            );
            await prisma.user.update({
                where: { id: userId },
                data: {
                    preferences: { ...prefs, pushSubscriptions: cleanedSubs },
                },
            });
        }

        const sent = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        res.json({ success: true, sent, failed, cleaned: expiredEndpoints.length });
    } catch (error) {
        console.error('[Push] Send error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// ─── POST /api/push/broadcast ───
// Send notification to all subscribed users
router.post('/broadcast', async (req, res) => {
    try {
        const { title, body, url, icon } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }

        // Find all users with push subscriptions
        const users = await prisma.user.findMany({
            where: {
                preferences: { not: null },
            },
            select: { id: true, preferences: true },
        });

        const payload = JSON.stringify({
            title,
            body: body || '',
            icon: icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            url: url || '/',
            timestamp: Date.now(),
        });

        let totalSent = 0;
        let totalFailed = 0;

        for (const user of users) {
            const prefs = user.preferences || {};
            const subs = prefs.pushSubscriptions || [];
            if (subs.length === 0) continue;

            const results = await Promise.allSettled(
                subs.map((sub) =>
                    webpush.sendNotification(
                        { endpoint: sub.endpoint, keys: sub.keys },
                        payload
                    )
                )
            );

            // Clean up expired subscriptions
            const expiredEndpoints = [];
            results.forEach((result, i) => {
                if (result.status === 'rejected' && result.reason.statusCode === 410) {
                    expiredEndpoints.push(subs[i].endpoint);
                }
            });

            if (expiredEndpoints.length > 0) {
                const cleanedSubs = subs.filter(
                    (s) => !expiredEndpoints.includes(s.endpoint)
                );
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        preferences: { ...prefs, pushSubscriptions: cleanedSubs },
                    },
                });
            }

            totalSent += results.filter((r) => r.status === 'fulfilled').length;
            totalFailed += results.filter((r) => r.status === 'rejected').length;
        }

        res.json({ success: true, sent: totalSent, failed: totalFailed });
    } catch (error) {
        console.error('[Push] Broadcast error:', error);
        res.status(500).json({ error: 'Failed to broadcast notification' });
    }
});

export default router;
