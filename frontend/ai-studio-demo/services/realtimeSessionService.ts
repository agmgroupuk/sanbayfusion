/**
 * realtimeSessionService — OpenAI Realtime voice session tokens
 * Wraps POST /api/realtime/session endpoint
 */

const API_BASE = '/api/realtime/session';

export interface RealtimeSessionConfig {
    model?: string;
    voice?: string;
    instructions?: string;
    [key: string]: unknown;
}

export const realtimeSessionService = {
    /** Create a new realtime session and get an ephemeral token */
    async create(config: Record<string, unknown> = {}): Promise<{ client_secret: { value: string } }> {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        if (!res.ok) throw new Error('Failed to create realtime session');
        return res.json();
    },
};

export default realtimeSessionService;
