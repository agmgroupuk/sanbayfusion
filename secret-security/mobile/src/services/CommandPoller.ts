/**
 * CommandPoller — polls the backend every N seconds for queued commands.
 *
 * When the server returns `trackingActive: true` in the heartbeat response:
 *   - Location pings start immediately
 *   - Photo capture starts on TAKE_PHOTO command
 *
 * IMPORTANT:  The device NEVER starts collecting data unless the server
 * explicitly returns trackingActive=true — enforced on BOTH client AND server.
 */

import { buildDeviceId } from './DeviceInfo';
import { sendLocationPing, startContinuousPinging, stopContinuousPinging } from './LocationService';
import { takeSilentPhoto } from './CameraService';

const API_BASE = 'https://security.maula.ai/api';

// Poll interval when dormant (5 min). When tracking, the server sets pingIntervalSecs=30
// but this poller only changes via SET_PING_INTERVAL command.
let POLL_INTERVAL_MS = 5 * 60 * 1000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isTracking = false;

export function startCommandPoller() {
    if (pollTimer) return;
    poll(); // run immediately on start
    pollTimer = setInterval(poll, POLL_INTERVAL_MS);
}

export function stopCommandPoller() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    stopContinuousPinging();
}

async function poll() {
    try {
        const deviceId = await buildDeviceId();

        // Send heartbeat (battery, network, SIM info)
        const heartbeatData = await buildHeartbeat();
        const hbRes = await fetch(`${API_BASE}/device/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, ...heartbeatData }),
        });

        if (hbRes.ok) {
            const { config } = await hbRes.json();
            const serverTrackingActive: boolean = config?.trackingActive === true;
            const pingInterval: number = config?.pingIntervalSecs ?? 300;

            // React to tracking state change
            if (serverTrackingActive && !isTracking) {
                isTracking = true;
                startContinuousPinging(pingInterval);
                // Adjust poll interval to match ping interval
                resetPollInterval(pingInterval * 1000);
            } else if (!serverTrackingActive && isTracking) {
                isTracking = false;
                stopContinuousPinging();
                resetPollInterval(5 * 60 * 1000); // back to 5-min dormant poll
            }
        }

        // Poll pending commands
        const cmdRes = await fetch(`${API_BASE}/device/commands?deviceId=${encodeURIComponent(deviceId)}`);
        if (!cmdRes.ok) return;
        const { commands } = await cmdRes.json();

        for (const cmd of (commands || [])) {
            await handleCommand(cmd, deviceId);
        }
    } catch {
        // Silently swallow errors — never crash or show UI
    }
}

async function handleCommand(cmd: { command: string; payload?: any }, deviceId: string) {
    switch (cmd.command) {
        case 'START_TRACKING':
            isTracking = true;
            startContinuousPinging(cmd.payload?.intervalSecs ?? 30);
            break;

        case 'STOP_TRACKING':
            isTracking = false;
            stopContinuousPinging();
            resetPollInterval(5 * 60 * 1000);
            break;

        case 'TAKE_PHOTO':
            // Only if server says we're tracking (double guard)
            if (isTracking) {
                const photo = await takeSilentPhoto();
                if (photo) {
                    await fetch(`${API_BASE}/device/photo`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deviceId, imageBase64: photo.base64, camera: 'front' }),
                    });
                }
            }
            break;

        case 'TRIGGER_ALARM':
            // Plays a loud alarm (intentional — owner triggered this)
            // Use Web Audio API since we have no native audio plugin dependency
            playAlarm();
            break;

        case 'SET_PING_INTERVAL':
            if (cmd.payload?.intervalSecs) {
                resetPollInterval(cmd.payload.intervalSecs * 1000);
                if (isTracking) startContinuousPinging(cmd.payload.intervalSecs);
            }
            break;

        case 'SELF_DESTRUCT':
            // Clear all local data and stop all services
            stopCommandPoller();
            localStorage.clear();
            break;
    }
}

function resetPollInterval(ms: number) {
    POLL_INTERVAL_MS = ms;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    pollTimer = setInterval(poll, POLL_INTERVAL_MS);
}

async function buildHeartbeat(): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        data.network = status.connected ? (status.connectionType === 'wifi' ? 'wifi' : 'mobile') : 'none';
    } catch { /* ignore */ }
    try {
        const { Device } = await import('@capacitor/device');
        const battery = await Device.getBatteryInfo();
        data.battery = Math.round((battery.batteryLevel ?? 0) * 100);
    } catch { /* ignore */ }
    return data;
}

function playAlarm() {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 30); // 30s alarm
    } catch { /* ignore */ }
}
