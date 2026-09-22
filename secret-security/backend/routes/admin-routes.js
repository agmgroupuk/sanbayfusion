/**
 * ADMIN ROUTES — used by the internal security team panel
 *
 * POST /api/admin/login
 * GET  /api/admin/reports           List all reports (queue)
 * GET  /api/admin/report/:id        Get report details + device info + photos
 * POST /api/admin/report/:id/approve   Verify identity → activate tracking on device
 * POST /api/admin/report/:id/reject    Reject + notify owner
 * POST /api/admin/report/:id/generate-report  Generate ZIP report → send payment link
 * GET  /api/admin/devices           All registered devices (map data)
 * GET  /api/admin/device/:deviceId  Device detail + ping history
 * GET  /api/admin/device/:deviceId/photos  List photos with pre-signed URLs
 * POST /api/admin/device/:deviceId/command  Queue a command (alarm, photo, etc.)
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../lib/prisma.js';
import { getPhotoUrl, getReportDownloadUrl } from '../lib/storage.js';
import { sendReportReadyEmail, sendReportRejectedEmail } from '../lib/email.js';
import { requireAdmin, signAdminToken } from '../middleware/admin-auth.js';

const router = express.Router();

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const prisma = getPrisma();
    const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const token = signAdminToken(admin.id);
    res.cookie('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 12 * 60 * 60 * 1000,
    });

    return res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
});

router.post('/logout', (_req, res) => {
    res.clearCookie('admin_token');
    res.json({ ok: true });
});

// All routes below require admin auth
router.use(requireAdmin);

// ── GET /reports ──────────────────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
    const { status } = req.query;
    const prisma = getPrisma();
    const reports = await prisma.lostReport.findMany({
        where: status ? { status } : {},
        include: {
            device: {
                select: { deviceId: true, deviceName: true, model: true, os: true, lastSeenAt: true, lastLat: true, lastLng: true, lastBattery: true, trackingActive: true, status: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    return res.json({ reports });
});

// ── GET /report/:id ───────────────────────────────────────────────────────────
router.get('/report/:id', async (req, res) => {
    const prisma = getPrisma();
    const report = await prisma.lostReport.findUnique({
        where: { id: req.params.id },
        include: {
            device: {
                include: {
                    pings: { orderBy: { timestamp: 'desc' }, take: 50 },
                    photos: { orderBy: { takenAt: 'desc' }, take: 20 },
                },
            },
        },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Attach pre-signed photo URLs
    const photosWithUrls = await Promise.all(
        (report.device?.photos || []).map(async (p) => ({
            ...p,
            url: await getPhotoUrl(p.storageKey).catch(() => null),
        }))
    );

    return res.json({ report: { ...report, device: { ...report.device, photos: photosWithUrls } } });
});

// ── POST /report/:id/approve ──────────────────────────────────────────────────
// Identity verified → status = 'approved', start tracking on device
router.post('/report/:id/approve', async (req, res) => {
    const { note } = req.body;
    const prisma = getPrisma();

    const report = await prisma.lostReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.status !== 'pending') return res.status(400).json({ error: `Report is already ${report.status}` });

    // MANUALLY activate tracking — the single most important gate
    await prisma.$transaction([
        prisma.lostReport.update({
            where: { id: report.id },
            data: {
                status: 'approved',
                reviewedBy: req.admin.id,
                reviewNote: note || null,
                reviewedAt: new Date(),
            },
        }),
        prisma.device.update({
            where: { deviceId: report.deviceId },
            data: {
                status: 'tracking',
                trackingActive: true,
                activatedAt: new Date(),
                activatedBy: req.admin.id,
                pingIntervalSecs: 30, // fast ping when tracking
            },
        }),
        // Queue initial commands
        prisma.commandQueue.create({
            data: {
                deviceId: report.deviceId,
                command: 'START_TRACKING',
                issuedBy: req.admin.id,
            },
        }),
        prisma.commandQueue.create({
            data: {
                deviceId: report.deviceId,
                command: 'TAKE_PHOTO',
                payload: { interval: 300 }, // take photo every 5 min
                issuedBy: req.admin.id,
            },
        }),
    ]);

    return res.json({ ok: true, message: 'Device tracking activated. Commands queued.' });
});

// ── POST /report/:id/reject ───────────────────────────────────────────────────
router.post('/report/:id/reject', async (req, res) => {
    const { reason } = req.body;
    const prisma = getPrisma();

    const report = await prisma.lostReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    await prisma.lostReport.update({
        where: { id: report.id },
        data: {
            status: 'rejected',
            reviewedBy: req.admin.id,
            reviewNote: reason || null,
            reviewedAt: new Date(),
        },
    });

    await sendReportRejectedEmail(report.ownerEmail, report.ownerName, reason).catch(console.error);

    return res.json({ ok: true });
});

// ── POST /report/:id/generate-report ─────────────────────────────────────────
// Admin triggers report generation + sends payment link to owner.
// In production, this would ZIP location pings + photos and upload to S3.
// For now we send a Stripe checkout link.
router.post('/report/:id/generate-report', async (req, res) => {
    const prisma = getPrisma();
    const report = await prisma.lostReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.status === 'pending' || report.status === 'rejected') {
        return res.status(400).json({ error: 'Report must be approved before generating' });
    }

    // Build payment URL (Stripe checkout created client-side or we use /api/payment/create-checkout)
    const paymentUrl = `${process.env.APP_URL || 'https://sanbayfusion.com'}/security/report-pay?report=${report.id}`;

    await prisma.lostReport.update({
        where: { id: report.id },
        data: { status: 'resolved' }, // ready for download after payment
    });

    await sendReportReadyEmail(report.ownerEmail, report.ownerName, paymentUrl).catch(console.error);

    return res.json({ ok: true, paymentUrl });
});

// ── GET /devices ──────────────────────────────────────────────────────────────
router.get('/devices', async (req, res) => {
    const prisma = getPrisma();
    const devices = await prisma.device.findMany({
        orderBy: { lastSeenAt: 'desc' },
        select: {
            id: true,
            deviceId: true,
            deviceName: true,
            model: true,
            os: true,
            status: true,
            trackingActive: true,
            lastSeenAt: true,
            lastLat: true,
            lastLng: true,
            lastBattery: true,
            lastNetwork: true,
            createdAt: true,
        },
    });
    return res.json({ devices });
});

// ── GET /device/:deviceId ─────────────────────────────────────────────────────
router.get('/device/:deviceId', async (req, res) => {
    const prisma = getPrisma();
    const device = await prisma.device.findUnique({
        where: { deviceId: req.params.deviceId },
        include: {
            pings: { orderBy: { timestamp: 'desc' }, take: 500 },
            reports: { orderBy: { createdAt: 'desc' } },
            _count: { select: { photos: true, pings: true } },
        },
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    return res.json({ device });
});

// ── GET /device/:deviceId/photos ──────────────────────────────────────────────
router.get('/device/:deviceId/photos', async (req, res) => {
    const prisma = getPrisma();
    const photos = await prisma.devicePhoto.findMany({
        where: { deviceId: req.params.deviceId },
        orderBy: { takenAt: 'desc' },
        take: 100,
    });
    const withUrls = await Promise.all(
        photos.map(async (p) => ({ ...p, url: await getPhotoUrl(p.storageKey).catch(() => null) }))
    );
    return res.json({ photos: withUrls });
});

// ── POST /device/:deviceId/command ────────────────────────────────────────────
router.post('/device/:deviceId/command', async (req, res) => {
    const { command, payload } = req.body;
    const VALID = ['START_TRACKING', 'STOP_TRACKING', 'TAKE_PHOTO', 'TRIGGER_ALARM', 'SET_PING_INTERVAL', 'SELF_DESTRUCT'];
    if (!VALID.includes(command)) return res.status(400).json({ error: 'Invalid command' });

    const prisma = getPrisma();
    const device = await prisma.device.findUnique({ where: { deviceId: req.params.deviceId } });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    await prisma.commandQueue.create({
        data: {
            deviceId: device.deviceId,
            command,
            payload: payload || null,
            issuedBy: req.admin.id,
        },
    });

    // If stopping tracking, deactivate immediately
    if (command === 'STOP_TRACKING') {
        await prisma.device.update({
            where: { deviceId: device.deviceId },
            data: { trackingActive: false, pingIntervalSecs: 300, status: 'found' },
        });
    }

    return res.json({ ok: true });
});

export default router;
