/**
 * LocationService — GPS ping collection.
 *
 * Uses @capacitor-community/background-geolocation to collect location
 * even when screen is off. Runs silently in a foreground service.
 */

import { buildDeviceId } from './DeviceInfo';

const API_BASE = 'https://security.sanbayfusion.com/api';

let pingingInterval: ReturnType<typeof setInterval> | null = null;
let bgGeoStarted = false;

export async function startContinuousPinging(intervalSecs: number) {
    stopContinuousPinging();

    // Start background geolocation
    await startBgGeo().catch(() => { });

    // Send pings on interval
    pingingInterval = setInterval(() => sendLocationPing().catch(() => { }), intervalSecs * 1000);
    // Send one immediately
    sendLocationPing().catch(() => { });
}

export function stopContinuousPinging() {
    if (pingingInterval) { clearInterval(pingingInterval); pingingInterval = null; }
    stopBgGeo().catch(() => { });
}

export async function sendLocationPing() {
    const location = await getCurrentLocation();
    if (!location) return;

    const deviceId = await buildDeviceId();

    // Get network/battery state
    let battery: number | undefined;
    let network: string | undefined;
    try {
        const { Device } = await import('@capacitor/device');
        const b = await Device.getBatteryInfo();
        battery = Math.round((b.batteryLevel ?? 0) * 100);
    } catch { /* ignore */ }
    try {
        const { Network } = await import('@capacitor/network');
        const n = await Network.getStatus();
        network = n.connected ? (n.connectionType === 'wifi' ? 'wifi' : 'mobile') : 'none';
    } catch { /* ignore */ }

    await fetch(`${API_BASE}/device/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            deviceId,
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy,
            battery,
            network,
        }),
    });
}

async function getCurrentLocation(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
    // Try @capacitor-community/background-geolocation first
    try {
        const { BackgroundGeolocation } = await import('@capacitor-community/background-geolocation');
        const loc = await BackgroundGeolocation.getCurrentLocation({ timeout: 10000, maximumAge: 5000, enableHighAccuracy: true });
        return { lat: loc.latitude, lng: loc.longitude, accuracy: loc.accuracy };
    } catch { /* fall through */ }

    // Fallback to browser Geolocation API
    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
            () => resolve(null),
            { timeout: 10000, maximumAge: 5000, enableHighAccuracy: true }
        );
    });
}

async function startBgGeo() {
    if (bgGeoStarted) return;
    const { BackgroundGeolocation } = await import('@capacitor-community/background-geolocation');
    await BackgroundGeolocation.addWatcher(
        {
            backgroundTitle: 'Maula Security',
            backgroundMessage: 'Maula Security is running.',
            requestPermissions: true,
            stale: false,
            distanceFilter: 10,
        },
        () => { } // handled by our interval-based pinging
    );
    bgGeoStarted = true;
}

async function stopBgGeo() {
    if (!bgGeoStarted) return;
    try {
        const { BackgroundGeolocation } = await import('@capacitor-community/background-geolocation');
        await BackgroundGeolocation.removeAllWatchers();
        bgGeoStarted = false;
    } catch { /* ignore */ }
}
