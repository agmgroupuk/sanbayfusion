/**
 * REPORT ROUTES — called by the owner (through sanbayfusion.com website)
 *
 * POST /api/report/submit      Submit a lost device report + identity proof
 * GET  /api/report/status/:id  Check report status (polling from website)
 */

import express from 'express';
import { getPrisma } from '../lib/prisma.js';
import { sendAdminNewReportEmail } from '../lib/email.js';

const router = express.Router();

// ── POST /submit ──────────────────────────────────────────────────────────────
router.post('/submit', async (req, res) => {
    const {
        deviceId,
        ownerName,
        ownerEmail,
        ownerPhone,
        purchaseProof,
        description,
    } = req.body;

    if (!deviceId || !ownerName || !ownerEmail) {
        return res.status(400).json({ error: 'deviceId, ownerName, and ownerEmail are required' });
    }

    // Basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    const prisma = getPrisma();

    // Device must be registered
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) {
        return res.status(404).json({ error: 'Device not found. Make sure the security app was installed on this device.' });
    }

    // Block duplicate pending reports
    const existing = await prisma.lostReport.findFirst({
        where: {
            deviceId,
            status: { in: ['pending', 'approved'] },
        },
    });
    if (existing) {
        return res.json({
            success: true,
            reportId: existing.id,
            status: existing.status,
            message: 'A report for this device is already under review.',
        });
    }

    const report = await prisma.lostReport.create({
        data: {
            deviceId,
            ownerName: ownerName.trim(),
            ownerEmail: ownerEmail.toLowerCase().trim(),
            ownerPhone: ownerPhone?.trim() || null,
            purchaseProof: purchaseProof?.trim() || null,
            description: description?.trim() || null,
            status: 'pending',
        },
    });

    // Alert admin team
    await sendAdminNewReportEmail(report).catch(e => console.error('[report] Email error:', e));

    return res.json({
        success: true,
        reportId: report.id,
        status: 'pending',
        message: 'Your report has been received. Our security team will verify your identity within 24 hours. You will receive an email once verification is complete.',
    });
});

// ── GET /status/:id ───────────────────────────────────────────────────────────
router.get('/status/:id', async (req, res) => {
    const prisma = getPrisma();
    const report = await prisma.lostReport.findUnique({
        where: { id: req.params.id },
        select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            paymentPaid: true,
            reviewNote: true,
        },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    return res.json({ report });
});

export default router;
