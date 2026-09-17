/**
 * DEVICE SECURITY — Anti-Theft / Lost Device Routes
 *
 * All features are opt-in: user must explicitly enable each one.
 * Consent is recorded per-device at registration time.
 *
 * Routes:
 *   POST   /api/security/register          Register device + record consent
 *   PUT    /api/security/device/:deviceId  Update consent / device name
 *   GET    /api/security/devices           List all devices for logged-in user
 *   POST   /api/security/ping             Submit location ping from device
 *   GET    /api/security/location/:deviceId  Get latest + history (owner only)
 *   POST   /api/security/mark-lost         Mark device as lost
 *   POST   /api/security/mark-found        Mark device as found / recovered
 *   POST   /api/security/alarm             Trigger alarm (queued for device to poll)
 *   GET    /api/security/commands/:deviceId Poll for pending commands (device polls)
 *   DELETE /api/security/device/:deviceId   Remove device & all data
 *
 * Security:
 *   - All routes require valid session cookie (findUserBySession)
 *   - Device ownership verified on every operation
 *   - Location only returned to device owner
 *   - Input validated, lat/lng range-checked
 */

import express from 'express';
import { findUserBySession } from '../lib/auth-prisma.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// ─── Auth middleware ──────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
    const sessionId =
        req.cookies?.sessionId ||
        req.cookies?.session_id ||
        req.headers['x-session-id'];
    if (!sessionId) return res.status(401).json({ error: 'Authentication required' });

    const user = await findUserBySession(sessionId);
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' });

    req.user = user;
    next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LAT_RANGE = { min: -90, max: 90 };
const LNG_RANGE = { min: -180, max: 180 };

function validCoords(lat, lng) {
    return (
        typeof lat === 'number' && lat >= LAT_RANGE.min && lat <= LAT_RANGE.max &&
        typeof lng === 'number' && lng >= LNG_RANGE.min && lng <= LNG_RANGE.max
    );
}

function haversineMetres(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// DB-backed command queue per device (survives PM2 restarts)
async function pushCommand(deviceId, command) {
    await prisma.deviceCommand.create({
        data: {
            deviceId,
            type: command.type,
            payload: command,
        },
    });
    // keep last 10 commands only — delete oldest unexecuted if > 10
    const count = await prisma.deviceCommand.count({ where: { deviceId, executed: false } });
    if (count > 10) {
        const oldest = await prisma.deviceCommand.findMany({
            where: { deviceId, executed: false },
            orderBy: { createdAt: 'asc' },
            take: count - 10,
            select: { id: true },
        });
        await prisma.deviceCommand.deleteMany({ where: { id: { in: oldest.map(c => c.id) } } });
    }
}

// ─── POST /register ───────────────────────────────────────────────────────────
/**
 * Called once when the user accepts the consent popup.
 * Creates a SecurityDevice record tied to the logged-in user.
 * Body: { deviceId, deviceName, model, os, osVersion, appVersion,
 *         locationEnabled, geofenceEnabled, simAlertEnabled, alarmEnabled }
 */
router.post('/register', requireAuth, async (req, res) => {
    try {
        const {
            deviceId, deviceName, model, os, osVersion, appVersion,
            locationEnabled = false,
            geofenceEnabled = false,
            simAlertEnabled = false,
            alarmEnabled = false,
        } = req.body;

        if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 8) {
            return res.status(400).json({ error: 'Invalid deviceId' });
        }

        // Upsert — re-registration after reinstall is fine for the same owner
        const existing = await prisma.securityDevice.findUnique({ where: { deviceId } });
        if (existing && existing.userId !== req.user.id) {
            return res.status(409).json({ error: 'This device is already registered to another account' });
        }

        const device = await prisma.securityDevice.upsert({
            where: { deviceId },
            create: {
                userId: req.user.id,
                deviceId,
                deviceName: deviceName || model || 'My Device',
                model,
                os,
                osVersion,
                appVersion,
                status: 'active',
                locationEnabled,
                geofenceEnabled,
                simAlertEnabled,
                alarmEnabled,
                pingIntervalSecs: 300,
            },
            update: {
                deviceName: deviceName || model || undefined,
                model,
                os,
                osVersion,
                appVersion,
                locationEnabled,
                geofenceEnabled,
                simAlertEnabled,
                alarmEnabled,
                updatedAt: new Date(),
            },
        });

        return res.json({ success: true, device: sanitiseDevice(device) });
    } catch (err) {
        console.error('[security/register]', err);
        return res.status(500).json({ error: 'Registration failed' });
    }
});

// ─── GET /devices ─────────────────────────────────────────────────────────────
router.get('/devices', requireAuth, async (req, res) => {
    try {
        const devices = await prisma.securityDevice.findMany({
            where: { userId: req.user.id },
            orderBy: { lastSeenAt: 'desc' },
            include: {
                pings: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                    select: { lat: true, lng: true, timestamp: true },
                },
            },
        });

        const mapped = devices.map((d) => {
            const base = sanitiseDevice(d);
            base.lastLocation = d.pings[0]
                ? { lat: d.pings[0].lat, lng: d.pings[0].lng, timestamp: d.pings[0].timestamp }
                : null;
            return base;
        });

        return res.json({ success: true, devices: mapped });
    } catch (err) {
        console.error('[security/devices]', err);
        return res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// ─── PUT /device/:deviceId ────────────────────────────────────────────────────
router.put('/device/:deviceId', requireAuth, async (req, res) => {
    try {
        const device = await ownerOrFail(req.params.deviceId, req.user.id, res);
        if (!device) return;

        const {
            deviceName, locationEnabled, geofenceEnabled,
            simAlertEnabled, alarmEnabled,
            geofenceLat, geofenceLng, geofenceRadius,
        } = req.body;

        const updated = await prisma.securityDevice.update({
            where: { deviceId: req.params.deviceId },
            data: {
                ...(deviceName !== undefined && { deviceName }),
                ...(locationEnabled !== undefined && { locationEnabled }),
                ...(geofenceEnabled !== undefined && { geofenceEnabled }),
                ...(simAlertEnabled !== undefined && { simAlertEnabled }),
                ...(alarmEnabled !== undefined && { alarmEnabled }),
                ...(geofenceLat !== undefined && { geofenceLat }),
                ...(geofenceLng !== undefined && { geofenceLng }),
                ...(geofenceRadius !== undefined && { geofenceRadius }),
                updatedAt: new Date(),
            },
        });
        return res.json({ success: true, device: sanitiseDevice(updated) });
    } catch (err) {
        console.error('[security/device PUT]', err);
        return res.status(500).json({ error: 'Update failed' });
    }
});

// ─── POST /ping ───────────────────────────────────────────────────────────────
/**
 * Called by the mobile app on a schedule (background service).
 * No auth cookie needed — authenticated by deviceId + userId combo.
 * Body: { deviceId, userId, lat, lng, accuracy, altitude, speed,
 *         heading, battery, network, simChanged, newSimHash }
 */
router.post('/ping', async (req, res) => {
    try {
        const {
            deviceId, userId,
            lat, lng, accuracy, altitude, speed, heading,
            battery, network,
            simChanged = false, newSimHash,
        } = req.body;

        if (!deviceId || !userId) return res.status(400).json({ error: 'Missing deviceId or userId' });
        if (!validCoords(lat, lng)) return res.status(400).json({ error: 'Invalid coordinates' });

        const device = await prisma.securityDevice.findUnique({ where: { deviceId } });
        if (!device || device.userId !== userId) {
            return res.status(403).json({ error: 'Device not found or ownership mismatch' });
        }
        if (!device.locationEnabled) {
            // Device had location disabled — accept ping to keep device alive but don't store coords
            await prisma.securityDevice.update({
                where: { deviceId },
                data: { lastSeenAt: new Date(), lastBattery: battery ?? device.lastBattery, lastNetwork: network ?? device.lastNetwork },
            });
            return res.json({ success: true, stored: false, commands: [] });
        }

        // Store ping
        await prisma.locationPing.create({
            data: {
                deviceId,
                lat, lng,
                accuracy: accuracy ?? null,
                altitude: altitude ?? null,
                speed: speed ?? null,
                heading: heading ?? null,
                battery: battery ?? null,
                network: network ?? null,
                isLostPing: device.isLost,
                simChanged,
                newSimHash: newSimHash ?? null,
            },
        });

        // Update device last-seen
        const pingInterval = device.isLost ? 30 : 300;
        await prisma.securityDevice.update({
            where: { deviceId },
            data: {
                lastSeenAt: new Date(),
                lastBattery: battery ?? device.lastBattery,
                lastNetwork: network ?? device.lastNetwork,
                pingIntervalSecs: pingInterval,
                ...(simChanged && newSimHash ? { lastSimHash: newSimHash } : {}),
            },
        });

        // Geofence check
        if (device.geofenceEnabled && device.geofenceLat != null && device.geofenceLng != null) {
            const dist = haversineMetres(lat, lng, device.geofenceLat, device.geofenceLng);
            const radius = device.geofenceRadius ?? 500;
            if (dist > radius) {
                await prisma.geofenceAlert.create({
                    data: { deviceId, alertType: 'exit', lat, lng },
                });
                // Queue notification command back to device (owner will see it in dashboard)
                pushCommand(deviceId, { type: 'GEOFENCE_EXIT', lat, lng, dist: Math.round(dist) });
            }
        }

        // Prune pings older than 30 days to keep DB lean
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await prisma.locationPing.deleteMany({
            where: { deviceId, timestamp: { lt: cutoff } },
        });

        // Return pending commands and next ping interval
        const pendingCmds = await prisma.deviceCommand.findMany({
            where: { deviceId, executed: false },
            orderBy: { createdAt: 'asc' },
        });
        if (pendingCmds.length > 0) {
            await prisma.deviceCommand.updateMany({
                where: { id: { in: pendingCmds.map(c => c.id) } },
                data: { executed: true },
            });
        }
        const pending = pendingCmds.map(c => ({ type: c.type, ...((c.payload && typeof c.payload === 'object') ? c.payload : {}), createdAt: c.createdAt.toISOString() }));

        return res.json({
            success: true,
            stored: true,
            pingIntervalSecs: pingInterval,
            commands: pending,
        });
    } catch (err) {
        console.error('[security/ping]', err);
        return res.status(500).json({ error: 'Ping failed' });
    }
});

// ─── GET /location/:deviceId ──────────────────────────────────────────────────
router.get('/location/:deviceId', requireAuth, async (req, res) => {
    try {
        const device = await ownerOrFail(req.params.deviceId, req.user.id, res);
        if (!device) return;

        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const pings = await prisma.locationPing.findMany({
            where: { deviceId: req.params.deviceId },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });

        return res.json({
            success: true,
            device: sanitiseDevice(device),
            latest: pings[0] ?? null,
            history: pings,
            totalPings: pings.length,
        });
    } catch (err) {
        console.error('[security/location]', err);
        return res.status(500).json({ error: 'Failed to fetch location' });
    }
});

// ─── POST /mark-lost ──────────────────────────────────────────────────────────
router.post('/mark-lost', requireAuth, async (req, res) => {
    try {
        const { deviceId, lostNote } = req.body;
        const device = await ownerOrFail(deviceId, req.user.id, res);
        if (!device) return;

        await prisma.securityDevice.update({
            where: { deviceId },
            data: {
                isLost: true,
                status: 'lost',
                lostMarkedAt: new Date(),
                lostNote: lostNote || null,
                pingIntervalSecs: 30, // faster pings when lost
            },
        });

        // Tell device to ping faster
        pushCommand(deviceId, { type: 'SET_PING_INTERVAL', intervalSecs: 30 });

        return res.json({ success: true, message: 'Device marked as lost. Location tracking accelerated.' });
    } catch (err) {
        console.error('[security/mark-lost]', err);
        return res.status(500).json({ error: 'Failed to mark lost' });
    }
});

// ─── POST /mark-found ─────────────────────────────────────────────────────────
router.post('/mark-found', requireAuth, async (req, res) => {
    try {
        const { deviceId } = req.body;
        const device = await ownerOrFail(deviceId, req.user.id, res);
        if (!device) return;

        await prisma.securityDevice.update({
            where: { deviceId },
            data: {
                isLost: false,
                status: 'found',
                pingIntervalSecs: 300,
            },
        });

        pushCommand(deviceId, { type: 'SET_PING_INTERVAL', intervalSecs: 300 });

        return res.json({ success: true, message: 'Device marked as found.' });
    } catch (err) {
        console.error('[security/mark-found]', err);
        return res.status(500).json({ error: 'Failed to mark found' });
    }
});

// ─── POST /alarm ──────────────────────────────────────────────────────────────
router.post('/alarm', requireAuth, async (req, res) => {
    try {
        const { deviceId } = req.body;
        const device = await ownerOrFail(deviceId, req.user.id, res);
        if (!device) return;

        if (!device.alarmEnabled) {
            return res.status(400).json({ error: 'Remote alarm not enabled on this device' });
        }

        pushCommand(deviceId, { type: 'TRIGGER_ALARM', durationSecs: 30 });
        return res.json({ success: true, message: 'Alarm command sent. Device will ring on next ping.' });
    } catch (err) {
        console.error('[security/alarm]', err);
        return res.status(500).json({ error: 'Failed to send alarm' });
    }
});

// ─── GET /commands/:deviceId ──────────────────────────────────────────────────
// Device polls this (no auth cookie; uses deviceId + userId header/query)
router.get('/commands/:deviceId', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });

        const device = await prisma.securityDevice.findUnique({
            where: { deviceId: req.params.deviceId },
        });
        if (!device || device.userId !== userId) {
            return res.status(403).json({ error: 'Not authorised' });
        }

        const pendingCmds = await prisma.deviceCommand.findMany({
            where: { deviceId: req.params.deviceId, executed: false },
            orderBy: { createdAt: 'asc' },
        });
        if (pendingCmds.length > 0) {
            await prisma.deviceCommand.updateMany({
                where: { id: { in: pendingCmds.map(c => c.id) } },
                data: { executed: true },
            });
        }
        const commands = pendingCmds.map(c => ({ type: c.type, ...((c.payload && typeof c.payload === 'object') ? c.payload : {}), createdAt: c.createdAt.toISOString() }));
        return res.json({ success: true, commands });
    } catch (err) {
        console.error('[security/commands]', err);
        return res.status(500).json({ error: 'Failed to fetch commands' });
    }
});

// ─── DELETE /device/:deviceId ─────────────────────────────────────────────────
router.delete('/device/:deviceId', requireAuth, async (req, res) => {
    try {
        const device = await ownerOrFail(req.params.deviceId, req.user.id, res);
        if (!device) return;

        await prisma.locationPing.deleteMany({ where: { deviceId: req.params.deviceId } });
        await prisma.deviceCommand.deleteMany({ where: { deviceId: req.params.deviceId } });
        await prisma.securityDevice.delete({ where: { deviceId: req.params.deviceId } });

        return res.json({ success: true, message: 'Device and all location data removed.' });
    } catch (err) {
        console.error('[security/delete]', err);
        return res.status(500).json({ error: 'Delete failed' });
    }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function ownerOrFail(deviceId, userId, res) {
    const device = await prisma.securityDevice.findUnique({ where: { deviceId } });
    if (!device) { res.status(404).json({ error: 'Device not found' }); return null; }
    if (device.userId !== userId) { res.status(403).json({ error: 'Not your device' }); return null; }
    return device;
}

function sanitiseDevice(d) {
    return {
        id: d.id,
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        model: d.model,
        os: d.os,
        osVersion: d.osVersion,
        status: d.status,
        isLost: d.isLost,
        lostMarkedAt: d.lostMarkedAt,
        lostNote: d.lostNote,
        locationEnabled: d.locationEnabled,
        geofenceEnabled: d.geofenceEnabled,
        simAlertEnabled: d.simAlertEnabled,
        alarmEnabled: d.alarmEnabled,
        geofenceLat: d.geofenceLat,
        geofenceLng: d.geofenceLng,
        geofenceRadius: d.geofenceRadius,
        pingIntervalSecs: d.pingIntervalSecs,
        lastSeenAt: d.lastSeenAt,
        lastBattery: d.lastBattery,
        lastNetwork: d.lastNetwork,
        createdAt: d.createdAt,
    };
}

export default router;
