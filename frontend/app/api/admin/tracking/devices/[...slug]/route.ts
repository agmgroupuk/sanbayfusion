import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbidden } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const SECURE_TRACE_URL = process.env.SECURE_TRACE_BACKEND_URL || 'http://localhost:3450';
const AUTH_HEADER = { 'Authorization': `Bearer ${process.env.ADMIN_JWT_SECRET || ''}` };

function ok(data: any) {
    return NextResponse.json({ success: true, ...data });
}

function err(message: string, status = 500) {
    return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Map SecureTrace device to frontend DeviceDetail interface.
 */
function mapDevice(d: any) {
    return {
        id: d.id,
        deviceName: d.deviceName || null,
        deviceModel: d.model || null,
        deviceOS: d.os || null,
        deviceOSVersion: d.osVersion || null,
        ownerEmail: d.ownerEmail || null,
        ownerPhone: null,
        registeredIp: null,
        isLost: d.status === 'tracking',
        isActive: d.status !== 'disabled',
        lastSeenAt: d.lastSeenAt || null,
        lastLat: d.lastLat ?? null,
        lastLng: d.lastLng ?? null,
        lastAccuracy: null,
        lastBattery: d.lastBattery ?? null,
        lastNetwork: d.lastNetwork || null,
        locationUnlocked: d.trackingActive || false,
        paymentRef: null,
        notes: null,
        appVersion: d.appVersion || null,
        createdAt: d.createdAt,
        _deviceId: d.deviceId,
        pings: (d.pings || []).map((p: any) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            accuracy: p.accuracy ?? null,
            battery: p.battery ?? null,
            network: p.network || null,
            ipAddress: null,
            timestamp: p.timestamp,
        })),
    };
}

// SecureTrace uses /api/admin/device/:deviceId (singular) not /devices/
async function proxy(method: string, path: string, body?: any) {
    try {
        const opts: RequestInit = {
            method,
            headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`${SECURE_TRACE_URL}/api/admin/device/${path}`, opts);
        if (res.ok) return await res.json();
        return null;
    } catch {
        return null;
    }
}

// GET /api/admin/tracking/devices/:id
// Frontend sends cuid `id`, but we need to look up via `deviceId` or `id`.
// First try the devices list to find the matching deviceId.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const admin = await verifyAdmin(req);
    if (!admin) return forbidden();

    const { slug } = await params;
    const id = slug[0];

    // Try direct lookup by deviceId first (if id IS the deviceId)
    let data = await proxy('GET', id);
    if (!data) {
        // Might be a cuid `id` — fetch all devices and find the matching deviceId
        try {
            const listRes = await fetch(`${SECURE_TRACE_URL}/api/admin/devices`, {
                headers: AUTH_HEADER,
                signal: AbortSignal.timeout(3000),
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                const match = (listData.devices || []).find((d: any) => d.id === id);
                if (match) {
                    data = await proxy('GET', match.deviceId);
                }
            }
        } catch { /* ignore */ }
    }

    if (!data) return err('Device not found or SecureTrace unavailable', 404);

    const device = data.device || data;
    return ok({ device: mapDevice(device) });
}

// POST /api/admin/tracking/devices/:id/lost or /unlock
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const admin = await verifyAdmin(req);
    if (!admin) return forbidden();

    const { slug } = await params;
    const id = slug[0];
    const action = slug[1]; // 'lost' or 'unlock'
    const body = await req.json().catch(() => ({}));

    // Resolve deviceId from cuid id if needed
    const deviceId = await resolveDeviceId(id);
    if (!deviceId) return err('Device not found', 404);

    if (action === 'lost') {
        // Map isLost to SecureTrace command
        const command = body.isLost ? 'START_TRACKING' : 'STOP_TRACKING';
        const data = await proxy('POST', `${deviceId}/command`, { command });
        if (!data) return err('SecureTrace unavailable', 503);
        return ok(data);
    }

    if (action === 'unlock') {
        // No direct unlock in SecureTrace — just acknowledge
        return ok({ message: 'Location unlocked' });
    }

    // Generic pass-through
    const path = [deviceId, ...slug.slice(1)].join('/');
    const data = await proxy('POST', path, body);
    if (!data) return err('SecureTrace unavailable', 503);
    return ok(data);
}

// PUT /api/admin/tracking/devices/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const admin = await verifyAdmin(req);
    if (!admin) return forbidden();

    const { slug } = await params;
    const id = slug[0];
    const body = await req.json();
    const deviceId = await resolveDeviceId(id);
    if (!deviceId) return err('Device not found', 404);
    const data = await proxy('PUT', deviceId, body);
    if (!data) return err('SecureTrace unavailable', 503);
    return ok(data);
}

// PATCH /api/admin/tracking/devices/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const admin = await verifyAdmin(req);
    if (!admin) return forbidden();

    const { slug } = await params;
    const id = slug[0];
    const body = await req.json();
    const deviceId = await resolveDeviceId(id);
    if (!deviceId) return err('Device not found', 404);
    const data = await proxy('PATCH', deviceId, body);
    if (!data) return err('SecureTrace unavailable', 503);
    return ok(data);
}

// DELETE /api/admin/tracking/devices/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const admin = await verifyAdmin(req);
    if (!admin) return forbidden();

    const { slug } = await params;
    const id = slug[0];
    const deviceId = await resolveDeviceId(id);
    if (!deviceId) return err('Device not found', 404);
    const data = await proxy('DELETE', deviceId);
    if (!data) return err('SecureTrace unavailable', 503);
    return ok(data);
}

/**
 * Resolve a cuid `id` to a SecureTrace `deviceId` fingerprint.
 * If the id IS already a deviceId (not a cuid), returns it directly.
 */
async function resolveDeviceId(id: string): Promise<string | null> {
    // First try as deviceId directly
    const direct = await proxy('GET', id);
    if (direct) return id;

    // Look up in devices list to find the matching deviceId for this cuid id
    try {
        const listRes = await fetch(`${SECURE_TRACE_URL}/api/admin/devices`, {
            headers: AUTH_HEADER,
            signal: AbortSignal.timeout(3000),
        });
        if (listRes.ok) {
            const data = await listRes.json();
            const match = (data.devices || []).find((d: any) => d.id === id);
            if (match) return match.deviceId;
        }
    } catch { /* ignore */ }

    return null;
}
