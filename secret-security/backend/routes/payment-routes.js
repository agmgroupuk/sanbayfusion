/**
 * PAYMENT ROUTES — Stripe one-time payment for report download
 *
 * POST /api/payment/create-checkout   → create Stripe Checkout Session for a report
 * POST /api/payment/webhook           → Stripe webhook; on success sets paymentPaid=true, emails download link
 * GET  /api/payment/download/:token   → verify token, stream report from S3 (one-time, 48h)
 */

import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { getPrisma } from '../lib/prisma.js';
import { getReportDownloadUrl } from '../lib/storage.js';
import { sendReportConfirmedEmail } from '../lib/email.js';

const router = express.Router();

function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
    return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
}

// ── POST /create-checkout ─────────────────────────────────────────────────────
router.post('/create-checkout', async (req, res) => {
    const { reportId } = req.body;
    if (!reportId) return res.status(400).json({ error: 'reportId required' });

    const prisma = getPrisma();
    const report = await prisma.lostReport.findUnique({ where: { id: reportId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.paymentPaid) return res.status(400).json({ error: 'Already paid' });
    if (report.status !== 'resolved') {
        return res.status(400).json({ error: 'Report is not ready for payment' });
    }

    const stripe = getStripe();
    const baseUrl = process.env.APP_URL || 'https://maula.ai';

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Maula Device Security Report',
                        description: 'Full location history and photo report for your lost device',
                    },
                    unit_amount: 999, // $9.99
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/security/report-success?session_id={CHECKOUT_SESSION_ID}&report=${reportId}`,
        cancel_url: `${baseUrl}/security/report-pay?report=${reportId}`,
        metadata: { reportId },
        customer_email: report.ownerEmail,
    });

    await prisma.lostReport.update({
        where: { id: reportId },
        data: { paymentSessionId: session.id },
    });

    return res.json({ url: session.url, sessionId: session.id });
});

// ── POST /webhook ─────────────────────────────────────────────────────────────
// Stripe sends raw body — express.raw() is applied in server.js for this path
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
    } catch (err) {
        console.error('[Payment webhook] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const reportId = session.metadata?.reportId;
        if (!reportId) return res.json({ received: true });

        const prisma = getPrisma();
        const report = await prisma.lostReport.findUnique({ where: { id: reportId } });
        if (!report || report.paymentPaid) return res.json({ received: true });

        // Generate a one-time secure download token
        const downloadToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

        await prisma.lostReport.update({
            where: { id: reportId },
            data: { paymentPaid: true, downloadToken, downloadTokenExpiry: tokenExpiry },
        });

        const downloadUrl = `${process.env.APP_URL || 'https://maula.ai'}/security/download/${downloadToken}`;
        await sendReportConfirmedEmail(report.ownerEmail, report.ownerName, downloadUrl).catch(console.error);
    }

    res.json({ received: true });
});

// ── GET /download/:token ──────────────────────────────────────────────────────
router.get('/download/:token', async (req, res) => {
    const { token } = req.params;
    if (!token || token.length < 32) return res.status(400).json({ error: 'Invalid token' });

    const prisma = getPrisma();
    const report = await prisma.lostReport.findFirst({
        where: { downloadToken: token },
    });

    if (!report) return res.status(404).json({ error: 'Download link not found or expired' });
    if (!report.paymentPaid) return res.status(402).json({ error: 'Payment required' });
    if (report.downloadTokenExpiry && new Date() > report.downloadTokenExpiry) {
        return res.status(410).json({ error: 'Download link has expired' });
    }
    if (!report.reportS3Key) return res.status(404).json({ error: 'Report file not yet available' });

    // Invalidate token (one-time use) by clearing it
    await prisma.lostReport.update({
        where: { id: report.id },
        data: { downloadToken: null, downloadTokenExpiry: null },
    });

    const presignedUrl = await getReportDownloadUrl(report.reportS3Key);
    return res.redirect(302, presignedUrl);
});

export default router;
