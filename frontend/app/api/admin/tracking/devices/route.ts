import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbidden } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * Map SecureTrace device fields to the frontend Device interface.
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
        // Keep original deviceId for detail lookups
        _deviceId: d.deviceId,
    };
}

/**
 * GET /api/admin/tracking/devices
 * Proxies to the SecureTrace backend if available, else returns empty list.
 */
export async function GET(req: NextRequest) {
    const admin = await verifyAdmin(req);
    if (!admin) return forbidden();

    const secureTraceUrl = process.env.SECURE_TRACE_BACKEND_URL || 'http://localhost:3450';
    try {
        const res = await fetch(`${secureTraceUrl}/api/admin/devices`, {
            headers: { 'Authorization': `Bearer ${process.env.ADMIN_JWT_SECRET || ''}` },
            signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
            const data = await res.json();
            const devices = (data.devices || []).map(mapDevice);
            return NextResponse.json({ success: true, devices });
        }
    } catch {
        // SecureTrace not running — return empty
    }

    return NextResponse.json({ success: true, devices: [] });
}
