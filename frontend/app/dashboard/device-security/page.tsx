'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeft,
    Smartphone,
    MapPin,
    Bell,
    BellOff,
    AlertTriangle,
    CheckCircle,
    Shield,
    ShieldAlert,
    Wifi,
    WifiOff,
    Battery,
    RefreshCw,
    Trash2,
    Clock,
    SlidersHorizontal,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const CHAT_API = 'https://maula.ai/chat/api/security';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SecurityDevice {
    id: string;
    deviceId: string;
    deviceName: string;
    model: string | null;
    os: string | null;
    status: 'active' | 'lost' | 'found' | 'disabled';
    isLost: boolean;
    lostNote: string | null;
    locationEnabled: boolean;
    geofenceEnabled: boolean;
    simAlertEnabled: boolean;
    alarmEnabled: boolean;
    geofenceLat: number | null;
    geofenceLng: number | null;
    geofenceRadius: number | null;
    lastSeenAt: string | null;
    lastBattery: number | null;
    lastNetwork: string | null;
    pingIntervalSecs: number;
    lastLocation?: { lat: number; lng: number; timestamp: string } | null;
}

// ─── Helper utils ──────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
    if (!iso) return 'Never';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function batteryColor(pct: number): string {
    if (pct > 50) return 'text-green-400';
    if (pct > 20) return 'text-yellow-400';
    return 'text-red-400';
}

function mapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ device }: { device: SecurityDevice }) {
    if (device.isLost || device.status === 'lost') {
        return (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                <ShieldAlert className="w-3 h-3" /> Lost
            </span>
        );
    }
    if (device.status === 'found') {
        return (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                <CheckCircle className="w-3 h-3" /> Found
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
            <Shield className="w-3 h-3" /> Protected
        </span>
    );
}

function FeaturePip({
    enabled,
    label,
}: {
    enabled: boolean;
    label: string;
}) {
    return (
        <span
            className={`text-xs px-1.5 py-0.5 rounded ${enabled
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'bg-white/5 text-gray-600'
                }`}
        >
            {label}
        </span>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DeviceSecurityPage() {
    const { state } = useAuth();
    const user = state.user;
    const authLoading = state.isLoading;
    const [devices, setDevices] = useState<SecurityDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // deviceId of current action
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    // Geofence edit state
    const [editingGeofence, setEditingGeofence] = useState<string | null>(null);
    const [gfLat, setGfLat] = useState('');
    const [gfLng, setGfLng] = useState('');
    const [gfRadius, setGfRadius] = useState('500');

    // Note for mark-as-lost
    const [lostNote, setLostNote] = useState<Record<string, string>>({});

    function showToast(msg: string, ok = true) {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    }

    const fetchDevices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${CHAT_API}/devices`, { credentials: 'include' });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Error ${res.status}`);
            }
            const data = await res.json();
            setDevices(data.devices ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load devices');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) fetchDevices();
    }, [authLoading, user, fetchDevices]);

    async function apiAction(
        deviceId: string,
        path: string,
        body?: Record<string, unknown>
    ): Promise<boolean> {
        setActionLoading(deviceId);
        try {
            const res = await fetch(`${CHAT_API}${path}`, {
                method: 'POST',
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                credentials: 'include',
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                showToast(d.error || `Error ${res.status}`, false);
                return false;
            }
            return true;
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Request failed', false);
            return false;
        } finally {
            setActionLoading(null);
        }
    }

    async function markLost(deviceId: string) {
        const ok = await apiAction(deviceId, '/mark-lost', {
            deviceId,
            note: lostNote[deviceId] || undefined,
        });
        if (ok) {
            showToast('Device marked as lost. Ping interval set to 30s.');
            fetchDevices();
        }
    }

    async function markFound(deviceId: string) {
        const ok = await apiAction(deviceId, '/mark-found', { deviceId });
        if (ok) {
            showToast('Device marked as found!');
            fetchDevices();
        }
    }

    async function triggerAlarm(deviceId: string) {
        const ok = await apiAction(deviceId, '/alarm', { deviceId });
        if (ok) showToast('Alarm queued — device will sound on next poll.');
    }

    async function deleteDevice(deviceId: string) {
        if (
            !confirm(
                'Remove this device? All location history will be permanently deleted.'
            )
        )
            return;
        setActionLoading(deviceId);
        try {
            const res = await fetch(`${CHAT_API}/device/${deviceId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                showToast(d.error || `Error ${res.status}`, false);
                return;
            }
            showToast('Device removed.');
            fetchDevices();
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Request failed', false);
        } finally {
            setActionLoading(null);
        }
    }

    async function saveGeofence(device: SecurityDevice) {
        const lat = parseFloat(gfLat);
        const lng = parseFloat(gfLng);
        const radius = parseInt(gfRadius, 10);
        if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
            showToast('Enter valid lat, lng, and radius values', false);
            return;
        }
        setActionLoading(device.deviceId);
        try {
            const res = await fetch(`${CHAT_API}/device/${device.deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    geofenceEnabled: true,
                    geofenceLat: lat,
                    geofenceLng: lng,
                    geofenceRadius: radius,
                }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                showToast(d.error || `Error ${res.status}`, false);
                return;
            }
            showToast('Geofence updated!');
            setEditingGeofence(null);
            fetchDevices();
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Request failed', false);
        } finally {
            setActionLoading(null);
        }
    }

    // ── Render ──────────────────────────────────────────────────────────────────

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">Sign in to manage device security</p>
                    <Link href="/auth/login" className="text-cyan-400 underline">
                        Log in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-gray-300">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-top-2 fade-in duration-200 ${toast.ok
                            ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                            : 'bg-red-500/20 border border-red-500/30 text-red-300'
                        }`}
                >
                    {toast.msg}
                </div>
            )}

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/dashboard"
                        className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Shield className="w-6 h-6 text-cyan-400" />
                            Device Security
                        </h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            Anti-theft protection for your registered devices
                        </p>
                    </div>
                    <button
                        onClick={fetchDevices}
                        disabled={loading}
                        className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Info banner */}
                <div className="mb-6 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-sm text-cyan-300/80 flex gap-3">
                    <Shield className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                    <p>
                        To register a device, open{' '}
                        <a
                            href="https://maula.ai/chat"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-cyan-400"
                        >
                            maula.ai/chat
                        </a>{' '}
                        on that device while logged in — a setup prompt will appear on first
                        visit.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex gap-2 items-start">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse"
                            />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && devices.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                            <Smartphone className="w-7 h-7 text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-sm">No devices registered yet.</p>
                        <p className="text-gray-600 text-xs mt-2">
                            Open maula.ai/chat from the device you want to protect.
                        </p>
                    </div>
                )}

                {/* Device cards */}
                {!loading && (
                    <div className="space-y-4">
                        {devices.map((device) => {
                            const busy = actionLoading === device.deviceId;
                            const isLost = device.isLost || device.status === 'lost';

                            return (
                                <div
                                    key={device.id}
                                    className={`rounded-2xl border transition-all ${isLost
                                            ? 'bg-red-500/5 border-red-500/20'
                                            : 'bg-white/[0.02] border-white/[0.08]'
                                        }`}
                                >
                                    <div className="p-6">
                                        {/* Top row */}
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLost ? 'bg-red-500/20' : 'bg-cyan-500/15'
                                                        }`}
                                                >
                                                    <Smartphone
                                                        className={`w-5 h-5 ${isLost ? 'text-red-400' : 'text-cyan-400'}`}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-white font-semibold">
                                                            {device.deviceName}
                                                        </span>
                                                        <StatusBadge device={device} />
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {device.os} · ID {device.deviceId.slice(0, 12)}…
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Delete */}
                                            <button
                                                onClick={() => deleteDevice(device.deviceId)}
                                                disabled={busy}
                                                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                                title="Remove device"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Stats row */}
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="bg-white/[0.03] rounded-lg p-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                                                    <span className="text-xs text-gray-500">Last seen</span>
                                                </div>
                                                <p className="text-sm font-medium text-white">
                                                    {timeAgo(device.lastSeenAt)}
                                                </p>
                                            </div>

                                            <div className="bg-white/[0.03] rounded-lg p-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Battery className="w-3.5 h-3.5 text-gray-500" />
                                                    <span className="text-xs text-gray-500">Battery</span>
                                                </div>
                                                <p
                                                    className={`text-sm font-medium ${device.lastBattery != null
                                                            ? batteryColor(device.lastBattery)
                                                            : 'text-gray-600'
                                                        }`}
                                                >
                                                    {device.lastBattery != null
                                                        ? `${device.lastBattery}%`
                                                        : '—'}
                                                </p>
                                            </div>

                                            <div className="bg-white/[0.03] rounded-lg p-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    {device.lastNetwork ? (
                                                        <Wifi className="w-3.5 h-3.5 text-gray-500" />
                                                    ) : (
                                                        <WifiOff className="w-3.5 h-3.5 text-gray-500" />
                                                    )}
                                                    <span className="text-xs text-gray-500">Network</span>
                                                </div>
                                                <p className="text-sm font-medium text-white truncate">
                                                    {device.lastNetwork || '—'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Feature pills */}
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            <FeaturePip enabled={device.locationEnabled} label="📍 Location" />
                                            <FeaturePip enabled={device.geofenceEnabled} label="🔵 Geofence" />
                                            <FeaturePip enabled={device.simAlertEnabled} label="📲 SIM Alert" />
                                            <FeaturePip enabled={device.alarmEnabled} label="🔊 Alarm" />
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-600">
                                                Ping {device.pingIntervalSecs}s
                                            </span>
                                        </div>

                                        {/* Last location */}
                                        {device.lastLocation && (
                                            <div className="mb-4 flex items-center gap-2 text-sm">
                                                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                                                <a
                                                    href={mapsUrl(
                                                        device.lastLocation.lat,
                                                        device.lastLocation.lng
                                                    )}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-cyan-400 underline"
                                                >
                                                    {device.lastLocation.lat.toFixed(5)},{' '}
                                                    {device.lastLocation.lng.toFixed(5)}
                                                </a>
                                                <span className="text-gray-600 text-xs">
                                                    · {timeAgo(device.lastLocation.timestamp)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Lost note */}
                                        {isLost && device.lostNote && (
                                            <p className="mb-4 text-sm text-red-300/70 bg-red-500/5 rounded-lg px-3 py-2">
                                                Note: {device.lostNote}
                                            </p>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex flex-wrap gap-2">
                                            {!isLost ? (
                                                <>
                                                    <button
                                                        onClick={() => markLost(device.deviceId)}
                                                        disabled={busy}
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm hover:bg-red-500/25 transition-colors disabled:opacity-50"
                                                    >
                                                        <ShieldAlert className="w-4 h-4" />
                                                        Mark as Lost
                                                    </button>
                                                    {device.alarmEnabled && (
                                                        <button
                                                            onClick={() => triggerAlarm(device.deviceId)}
                                                            disabled={busy}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/15 text-yellow-400 text-sm hover:bg-yellow-500/25 transition-colors disabled:opacity-50"
                                                        >
                                                            <Bell className="w-4 h-4" />
                                                            Trigger Alarm
                                                        </button>
                                                    )}
                                                    {device.geofenceEnabled && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingGeofence(device.deviceId);
                                                                setGfLat(device.geofenceLat?.toString() ?? '');
                                                                setGfLng(device.geofenceLng?.toString() ?? '');
                                                                setGfRadius(
                                                                    device.geofenceRadius?.toString() ?? '500'
                                                                );
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/15 text-blue-400 text-sm hover:bg-blue-500/25 transition-colors"
                                                        >
                                                            <SlidersHorizontal className="w-4 h-4" />
                                                            Set Geofence
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => markFound(device.deviceId)}
                                                        disabled={busy}
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/15 text-green-400 text-sm hover:bg-green-500/25 transition-colors disabled:opacity-50"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Mark as Found
                                                    </button>
                                                    {device.alarmEnabled && (
                                                        <button
                                                            onClick={() => triggerAlarm(device.deviceId)}
                                                            disabled={busy}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/15 text-yellow-400 text-sm hover:bg-yellow-500/25 transition-colors disabled:opacity-50"
                                                        >
                                                            <Bell className="w-4 h-4" />
                                                            Trigger Alarm
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Mark-as-lost note input */}
                                        {!isLost && (
                                            <input
                                                type="text"
                                                placeholder="Optional: note for mark-as-lost (e.g. last seen at gym)"
                                                value={lostNote[device.deviceId] ?? ''}
                                                onChange={(e) =>
                                                    setLostNote((prev) => ({
                                                        ...prev,
                                                        [device.deviceId]: e.target.value,
                                                    }))
                                                }
                                                className="mt-3 w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-red-500/40"
                                            />
                                        )}

                                        {/* Geofence editor */}
                                        {editingGeofence === device.deviceId && (
                                            <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                                                <p className="text-sm text-blue-300 font-medium">
                                                    Set Geofence Center &amp; Radius
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Latitude"
                                                        value={gfLat}
                                                        onChange={(e) => setGfLat(e.target.value)}
                                                        className="col-span-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Longitude"
                                                        value={gfLng}
                                                        onChange={(e) => setGfLng(e.target.value)}
                                                        className="col-span-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                                                    />
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            placeholder="Radius (m)"
                                                            value={gfRadius}
                                                            onChange={(e) => setGfRadius(e.target.value)}
                                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    Tip: open Google Maps, right-click your home/office and
                                                    copy the coordinates.
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => saveGeofence(device)}
                                                        disabled={busy}
                                                        className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingGeofence(null)}
                                                        className="px-4 py-2 rounded-lg bg-white/[0.04] text-gray-400 text-sm hover:bg-white/[0.08] transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
