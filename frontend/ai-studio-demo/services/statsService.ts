/**
 * statsService — Studio session statistics
 * Wraps /api/studio/stats endpoint
 */

const API_BASE = '/api/studio/stats';

export interface SessionStats {
    totalMessages: number;
    totalRequests: number;
    totalErrors: number;
    totalTokensUsed: number;
    sessionStartTime: number;
    requestLog: { timestamp: number; tokens: number; latencyMs: number; success: boolean }[];
}

export const statsService = {
    /** Load stats for a session */
    async load(sessionId: string): Promise<{ success: boolean; stats?: SessionStats }> {
        const res = await fetch(`${API_BASE}/${encodeURIComponent(sessionId)}`);
        if (!res.ok) throw new Error(`Failed to load stats: ${res.statusText}`);
        return res.json();
    },

    /** Persist stats to database */
    async save(data: {
        sessionId: string;
        totalMessages: number;
        totalRequests: number;
        totalErrors: number;
        totalTokensUsed: number;
        sessionStartTime: number;
        requestLog: { timestamp: number; tokens: number; latencyMs: number; success: boolean }[];
    }): Promise<void> {
        await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },
};

export default statsService;
