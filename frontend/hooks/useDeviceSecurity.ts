'use client';

/**
 * useDeviceSecurity — Silent browser-based device security hook.
 *
 * Works for ALL visitors (anonymous + signed-in):
 * - Auto-registers the browser as a device on first visit
 * - Asks for geolocation once; works with or without permission
 * - Runs GPS ping + heartbeat loops in background
 * - Links to user account when signed in
 * - Polls for admin commands (SET_PING_INTERVAL, TRIGGER_ALARM)
 * - Completely silent — no visible UI
 */

import { useEffect, useRef, useCallback } from 'react';

const SECURITY_API = '/api/security';
const DEFAULT_PING_INTERVAL = 300; // 5 min in seconds
const HEARTBEAT_INTERVAL = 300_000; // 5 min in ms
const COMMAND_POLL_INTERVAL = 300_000; // 5 min in ms

// ─── Device fingerprint ───────────────────────────────────────────────────────

function getOrCreateDeviceId(): string {
  const KEY = 'maula-device-id';
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  return id;
}

function getDeviceInfo(): { model: string; os: string; deviceName: string } {
  const ua = navigator.userAgent;
  let os = 'Unknown';
  let model = 'Browser';

  if (/Android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s[\d.]+;\s([^)]+)\)/);
    model = match?.[1]?.split(';').pop()?.trim() || 'Android Device';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
    model = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
  } else if (/Mac OS X/i.test(ua)) {
    os = 'macOS';
    model = 'Mac';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
    model = 'PC';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    model = 'PC';
  }

  let browser = 'Unknown';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  return {
    os,
    model: `${model} (${browser})`,
    deviceName: `${os} ${browser}`,
  };
}

// ─── Geolocation helper ──────────────────────────────────────────────────────

function getCurrentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false }
    );
  });
}

// ─── Battery / Network helpers ───────────────────────────────────────────────

async function getBatteryLevel(): Promise<number | undefined> {
  try {
    // @ts-expect-error — Battery API not in all TS defs
    const batt = await navigator.getBattery?.();
    if (batt) return Math.round(batt.level * 100);
  } catch { /* ignore */ }
  return undefined;
}

function getNetworkType(): string | undefined {
  try {
    // @ts-expect-error — NetworkInformation not in all TS defs
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return conn?.effectiveType || (navigator.onLine ? 'online' : 'offline');
  } catch { /* ignore */ }
  return navigator.onLine ? 'online' : 'offline';
}

// ─── The hook ────────────────────────────────────────────────────────────────

export function useDeviceSecurity(userId?: string) {
  const pingIntervalRef = useRef(DEFAULT_PING_INTERVAL);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const commandTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registeredRef = useRef(false);
  const deviceIdRef = useRef<string>('');
  const userIdRef = useRef(userId);

  // Keep userIdRef in sync so callbacks always see latest userId
  userIdRef.current = userId;

  // ─── Register device ────────────────────────────────────────────────

  const registerDevice = useCallback(async () => {
    const deviceId = getOrCreateDeviceId();
    deviceIdRef.current = deviceId;

    // Session dedup — don't re-register on every render/navigation
    const regKey = `maula-security-reg-${deviceId}`;
    if (sessionStorage.getItem(regKey)) {
      registeredRef.current = true;
      return true;
    }

    try {
      const { os, model, deviceName } = getDeviceInfo();
      const pos = await getCurrentPosition();

      const body: Record<string, unknown> = {
        deviceId,
        deviceName,
        model,
        os,
        appVersion: '1.0.0',
      };

      if (userIdRef.current) body.maulaUserId = userIdRef.current;
      if (pos) {
        body.lat = pos.coords.latitude;
        body.lng = pos.coords.longitude;
        body.accuracy = pos.coords.accuracy;
      }

      const res = await fetch(`${SECURITY_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        sessionStorage.setItem(regKey, 'true');
        registeredRef.current = true;
        return true;
      }
    } catch {
      // Silent — will retry on next page load
    }
    return false;
  }, []);

  // ─── Link user account to device on sign-in ────────────────────────

  useEffect(() => {
    if (!userId || !deviceIdRef.current) return;

    // Re-register with userId to link the account
    fetch(`${SECURITY_API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        deviceId: deviceIdRef.current,
        deviceName: getDeviceInfo().deviceName,
        model: getDeviceInfo().model,
        os: getDeviceInfo().os,
        maulaUserId: userId,
        appVersion: '1.0.0',
      }),
    }).catch(() => {});
  }, [userId]);

  // ─── Send heartbeat (always — even without location) ───────────────

  const sendHeartbeat = useCallback(async () => {
    if (!deviceIdRef.current) return;

    try {
      const battery = await getBatteryLevel();
      const network = getNetworkType();

      await fetch(`${SECURITY_API}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          battery,
          network,
        }),
      });
    } catch { /* silent */ }
  }, []);

  // ─── Send location ping ─────────────────────────────────────────────

  const sendPing = useCallback(async () => {
    if (!deviceIdRef.current) return;

    try {
      const pos = await getCurrentPosition();
      if (!pos) return; // No permission or unavailable

      const battery = await getBatteryLevel();
      const network = getNetworkType();

      await fetch(`${SECURITY_API}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          battery,
          network,
        }),
      });
    } catch { /* silent */ }
  }, []);

  // ─── Poll commands ──────────────────────────────────────────────────

  const pollCommands = useCallback(async () => {
    if (!deviceIdRef.current) return;

    try {
      const res = await fetch(
        `${SECURITY_API}/commands?deviceId=${deviceIdRef.current}`,
        { credentials: 'include' }
      );
      if (!res.ok) return;

      const { commands, pingIntervalSecs } = await res.json();

      if (pingIntervalSecs && pingIntervalSecs !== pingIntervalRef.current) {
        pingIntervalRef.current = pingIntervalSecs;
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(sendPing, pingIntervalSecs * 1000);
      }

      for (const cmd of commands || []) {
        switch (cmd.command || cmd.type) {
          case 'SET_PING_INTERVAL': {
            const newInterval = cmd.payload?.intervalSecs || DEFAULT_PING_INTERVAL;
            if (newInterval !== pingIntervalRef.current) {
              pingIntervalRef.current = newInterval;
              if (pingTimerRef.current) clearInterval(pingTimerRef.current);
              pingTimerRef.current = setInterval(sendPing, newInterval * 1000);
            }
            break;
          }
          case 'TRIGGER_ALARM':
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Maula Security Alert', {
                  body: 'Your device alarm has been triggered!',
                  icon: '/icons/icon-192x192.png',
                  requireInteraction: true,
                });
              }
            } catch { /* ignore */ }
            break;
        }
      }
    } catch { /* silent */ }
  }, [sendPing]);

  // ─── Lifecycle ─────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function init() {
      const ok = await registerDevice();
      if (!ok || !mounted) return;

      sendHeartbeat();
      sendPing();

      heartbeatTimerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
      pingTimerRef.current = setInterval(sendPing, pingIntervalRef.current * 1000);
      pollCommands();
      commandTimerRef.current = setInterval(pollCommands, COMMAND_POLL_INTERVAL);
    }

    // Delay 2s to avoid blocking initial page render
    const t = setTimeout(init, 2000);

    return () => {
      mounted = false;
      clearTimeout(t);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (commandTimerRef.current) clearInterval(commandTimerRef.current);
    };
  }, [registerDevice, sendHeartbeat, sendPing, pollCommands]);
}
