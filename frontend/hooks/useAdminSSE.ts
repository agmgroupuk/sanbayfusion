'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type SSEStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling';

interface UseAdminSSEOptions {
    /** Which SSE event names to listen for */
    events?: string[];
    /** Auto-connect on mount (default: true) */
    enabled?: boolean;
}

const MAX_SSE_RETRIES = 5;
const POLL_INTERVAL = 5000;

/**
 * Hook that connects to the admin SSE stream at /api/admin/realtime/stream.
 * Returns the latest data for each event name and connection status.
 * Auto-reconnects on disconnect with exponential backoff.
 * Falls back to HTTP polling after MAX_SSE_RETRIES failures.
 */
export function useAdminSSE<T extends Record<string, any>>(
    options: UseAdminSSEOptions = {},
) {
    const { events = ['realtime', 'overview', 'stats', 'live'], enabled = true } = options;

    // Stabilize events array reference to prevent infinite re-render loop
    const eventsKey = events.join(',');
    const eventsRef = useRef(events);
    eventsRef.current = events;

    const [data, setData] = useState<Partial<T>>({});
    const [status, setStatus] = useState<SSEStatus>('disconnected');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const esRef = useRef<EventSource | null>(null);
    const retryRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const usingPollingRef = useRef(false);

    // Fallback polling — fetches overview + realtime via HTTP
    const pollData = useCallback(async () => {
        try {
            const [overviewRes, realtimeRes] = await Promise.all([
                fetch('/api/admin/dashboard/overview', { credentials: 'include' }),
                fetch('/api/admin/dashboard/realtime', { credentials: 'include' }),
            ]);
            const [overviewJson, realtimeJson] = await Promise.all([overviewRes.json(), realtimeRes.json()]);
            if (overviewJson.success) {
                setData(prev => ({ ...prev, overview: overviewJson.data, stats: overviewJson.data }));
            }
            if (realtimeJson.success) {
                setData(prev => ({ ...prev, realtime: realtimeJson.data, live: realtimeJson.data }));
            }
            setLastUpdate(new Date());
        } catch {
            // polling failure — will retry on next interval
        }
    }, []);

    const startPolling = useCallback(() => {
        if (pollTimerRef.current) return; // already polling
        usingPollingRef.current = true;
        setStatus('polling');
        pollData(); // immediate first poll
        pollTimerRef.current = setInterval(pollData, POLL_INTERVAL);
    }, [pollData]);

    const stopPolling = useCallback(() => {
        usingPollingRef.current = false;
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        // Cleanup existing
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
        stopPolling();

        setStatus('connecting');

        const es = new EventSource('/api/admin/realtime/stream');
        esRef.current = es;

        es.addEventListener('connected', () => {
            setStatus('connected');
            retryRef.current = 0; // Reset backoff on successful connect
            stopPolling();
        });

        // Listen to each event type
        for (const event of eventsRef.current) {
            es.addEventListener(event, (e: MessageEvent) => {
                try {
                    const parsed = JSON.parse(e.data);
                    setData(prev => ({ ...prev, [event]: parsed }));
                    setLastUpdate(new Date());
                    // Ensure status is connected on any data receipt
                    setStatus('connected');
                    retryRef.current = 0;
                } catch {
                    // ignore parse errors
                }
            });
        }

        es.addEventListener('error', (e: MessageEvent) => {
            try {
                const parsed = JSON.parse(e.data);
                console.warn('[SSE] server error:', parsed.message);
            } catch {
                // native EventSource error (disconnect)
            }
        });

        es.onerror = () => {
            es.close();
            esRef.current = null;

            retryRef.current++;

            // After too many SSE failures, fall back to HTTP polling
            if (retryRef.current >= MAX_SSE_RETRIES) {
                console.warn('[SSE] Max retries reached, falling back to HTTP polling');
                startPolling();
                return;
            }

            setStatus('error');

            // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
            const delay = Math.min(1000 * Math.pow(2, retryRef.current), 15000);

            retryTimerRef.current = setTimeout(() => {
                if (enabled) connect();
            }, delay);
        };
    }, [eventsKey, enabled, startPolling, stopPolling]);

    const disconnect = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
        stopPolling();
        setStatus('disconnected');
    }, [stopPolling]);

    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            disconnect();
        }

        return () => disconnect();
    }, [enabled, connect, disconnect]);

    return {
        data,
        status,
        lastUpdate,
        isConnected: status === 'connected' || status === 'polling',
        reconnect: connect,
        disconnect,
    };
}
