/**
 * Maula Security — Silent Anti-Theft Agent
 *
 * This app renders NO visible UI. It acts entirely as a background service:
 * - Registers the device with the Maula Security backend
 * - Polls for commands every POLL_INTERVAL_MS (when dormant)
 * - Sends GPS pings and photos ONLY when server's `trackingActive === true`
 *   (i.e. after security team manually activates it following identity verification)
 *
 * User consent: The user explicitly downloaded and installed this app knowing
 * it provides anti-theft location tracking when their device is reported lost.
 */

import React, { useEffect } from 'react';
import { buildDeviceId } from './services/DeviceInfo';
import { startCommandPoller, stopCommandPoller } from './services/CommandPoller';

const API_BASE = 'https://security.maula.ai/api';

async function register() {
    const deviceId = await buildDeviceId();
    const stored = localStorage.getItem('maula-security-registered');
    if (stored === deviceId) return; // already registered

    try {
        const res = await fetch(`${API_BASE}/device/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceId,
                deviceName: await getDeviceName(),
                model: await getDeviceModel(),
                os: 'Android',
            }),
        });
        if (res.ok) {
            localStorage.setItem('maula-security-registered', deviceId);
        }
    } catch {
        // Silently retry on next launch
    }
}

async function getDeviceName(): Promise<string> {
    try {
        const { Device } = await import('@capacitor/device');
        const info = await Device.getInfo();
        return info.name || `${info.manufacturer} ${info.model}`;
    } catch { return 'Android Device'; }
}

async function getDeviceModel(): Promise<string> {
    try {
        const { Device } = await import('@capacitor/device');
        const info = await Device.getInfo();
        return `${info.manufacturer} ${info.model}`;
    } catch { return 'Unknown'; }
}

export default function App() {
    useEffect(() => {
        register().then(() => startCommandPoller()).catch(console.error);
        return () => { stopCommandPoller(); };
    }, []);

    // Render nothing visible — this app has no UI
    return null;
}
