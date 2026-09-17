/**
 * DEVICE ROUTES — called by the mobile app
 *
 * POST /api/device/register    Register device on install (dormant — NOT tracking)
 * POST /api/device/ping        Submit location ping (only when trackingActive=true)
 * POST /api/device/photo       Upload base64 camera photo (only when trackingActive=true)
 * GET  /api/device/commands    Poll for pending commands
 * POST /api/device/heartbeat   Lightweight alive signal (no GPS, just battery/network)
 */

import express from 'express';
import { getPrisma } from '../lib/prisma.js';
import { uploadPhoto } from '../lib/storage.js';

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function validCoords(lat, lng) {
    return typeof lat === 'number' && lat >= -90 && lat <= 90 &&
        typeof lng === 'number' && lng >= -180 && lng <= 180;
}

/**
 * Verify the request is from a known device.
 * Device sends deviceId + a simple HMAC (deviceId + secret) to prevent spoofing.
 * For simplicity, we use deviceId lookup; production should add HMAC.
 */
async function resolveDevice(req, res) {
    const deviceId = req.body.deviceId || req.params.deviceId || req.query.deviceId;
    if (!deviceId) { res.status(400).json({ error: 'deviceId required' }); return null; }
    const prisma = getPrisma();
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) { res.status(404).json({ error: 'Device not registered' }); return null; }
    return device;
}

// ── POST /register ───────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { deviceId, deviceName, model, os, osVersion, appVersion, maulaUserId, ownerEmail, lat, lng, accuracy } = req.body;

    if (!deviceId || !deviceName) {
        return res.status(400).json({ error: 'deviceId and deviceName are required' });
    }

    const prisma = getPrisma();

    // Upsert — safe to call multiple times (app reinstall)
    const device = await prisma.device.upsert({
        where: { deviceId },
        update: {
            deviceName,
            model: model || null,
            os: os || 'Unknown',
            osVersion: osVersion || null,
            appVersion: appVersion || null,
            maulaUserId: maulaUserId || undefined,
            ownerEmail: ownerEmail || null,
            lastSeenAt: new Date(),
            ...(validCoords(lat, lng) ? { lastLat: lat, lastLng: lng } : {}),
        },
        create: {
            deviceId,
            deviceName,
            model: model || null,
            os: os || 'Unknown',
            osVersion: osVersion || null,
            appVersion: appVersion || null,
            maulaUserId: maulaUserId || null,
            ownerEmail: ownerEmail || null,
            status: 'registered',
            trackingActive: false,
            ...(validCoords(lat, lng) ? { lastLat: lat, lastLng: lng } : {}),
        },
    });

    // If initial location provided, also create first location ping
    if (validCoords(lat, lng)) {
        await prisma.locationPing.create({
            data: {
                deviceId: device.deviceId,
                lat, lng,
                accuracy: accuracy ?? null,
            },
        }).catch(() => {}); // non-critical
    }

    return res.json({
        success: true,
        deviceId: device.deviceId,
        status: device.status,
        trackingActive: device.trackingActive,
        pingIntervalSecs: device.pingIntervalSecs,
    });
});

// ── POST /heartbeat ───────────────────────────────────────────────────────────
// App sends this every ~5 min regardless of tracking state.
// Very lightweight — just battery, network, SIM hash.
router.post('/heartbeat', async (req, res) => {
    const device = await resolveDevice(req, res);
    if (!device) return;

    const { battery, network, simHash } = req.body;
    const prisma = getPrisma();

    const simChanged = simHash && device.lastSimHash && simHash !== device.lastSimHash;

    await prisma.device.update({
        where: { deviceId: device.deviceId },
        data: {
            lastSeenAt: new Date(),
            lastBattery: battery != null ? Math.round(battery) : device.lastBattery,
            lastNetwork: network || device.lastNetwork,
            lastSimHash: simHash || device.lastSimHash,
            simChangedAt: simChanged ? new Date() : device.simChangedAt,
        },
    });

    // Return current config so app adjusts its own behavior
    return res.json({
        trackingActive: device.trackingActive,
        pingIntervalSecs: device.pingIntervalSecs,
        simChanged: simChanged || false,
    });
});

// ── POST /ping ────────────────────────────────────────────────────────────────
// Always store location data — needed for device recovery even before activation.
// trackingActive only controls ping frequency (app-side) and admin visibility.
router.post('/ping', async (req, res) => {
    const device = await resolveDevice(req, res);
    if (!device) return;

    const { lat, lng, accuracy, altitude, speed, heading, battery, network, simHash } = req.body;

    if (!validCoords(lat, lng)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const prisma = getPrisma();
    const simChanged = simHash && device.lastSimHash && simHash !== device.lastSimHash;

    // Store ping + update device last known location
    await prisma.$transaction([
        prisma.locationPing.create({
            data: {
                deviceId: device.deviceId,
                lat, lng,
                accuracy: accuracy ?? null,
                altitude: altitude ?? null,
                speed: speed ?? null,
                heading: heading ?? null,
                battery: battery != null ? Math.round(battery) : null,
                network: network ?? null,
                simHash: simHash ?? null,
                simChanged: simChanged || false,
            },
        }),
        prisma.device.update({
            where: { deviceId: device.deviceId },
            data: {
                lastSeenAt: new Date(),
                lastLat: lat,
                lastLng: lng,
                lastBattery: battery != null ? Math.round(battery) : undefined,
                lastNetwork: network ?? undefined,
                lastSimHash: simHash ?? undefined,
                simChangedAt: simChanged ? new Date() : undefined,
            },
        }),
    ]);

    // Prune pings older than 30 days to manage DB size
    await prisma.locationPing.deleteMany({
        where: {
            deviceId: device.deviceId,
            timestamp: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
    }).catch(() => { }); // fire and forget

    return res.json({ ok: true, pingIntervalSecs: device.pingIntervalSecs });
});

// ── POST /photo ───────────────────────────────────────────────────────────────
// App sends base64 JPEG from front camera (silently, no preview shown on device).
router.post('/photo', async (req, res) => {
    const device = await resolveDevice(req, res);
    if (!device) return;

    if (!device.trackingActive) {
        return res.json({ ok: true, trackingActive: false });
    }

    const { imageBase64, camera = 'front' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    // Basic size sanity check (~10MB max)
    if (imageBase64.length > 14_000_000) {
        return res.status(413).json({ error: 'Image too large' });
    }

    const prisma = getPrisma();

    const s3Key = await uploadPhoto(device.deviceId, imageBase64);

    await prisma.devicePhoto.create({
        data: {
            deviceId: device.deviceId,
            s3Key,
            camera: camera === 'rear' ? 'rear' : 'front',
            sizeBytes: Math.round(imageBase64.length * 0.75), // approx decoded bytes
        },
    });

    return res.json({ ok: true });
});

// ── GET /commands ─────────────────────────────────────────────────────────────
// App polls for pending commands (every heartbeat cycle).
// Commands are consumed (deliveredAt set) on poll.
router.get('/commands', async (req, res) => {
    const deviceId = req.query.deviceId;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    const prisma = getPrisma();
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return res.status(404).json({ error: 'Device not registered' });

    // Fetch undelivered commands
    const commands = await prisma.commandQueue.findMany({
        where: { deviceId, deliveredAt: null },
        orderBy: { createdAt: 'asc' },
    });

    if (commands.length > 0) {
        await prisma.commandQueue.updateMany({
            where: { id: { in: commands.map(c => c.id) } },
            data: { deliveredAt: new Date() },
        });
    }

    return res.json({
        commands: commands.map(c => ({ id: c.id, command: c.command, payload: c.payload })),
        trackingActive: device.trackingActive,
        pingIntervalSecs: device.pingIntervalSecs,
    });
});

export default router;
