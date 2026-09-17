/**
 * guestSessionService — Guest session management (check limit, increment count)
 * Wraps /api/sessions/guest/* endpoints
 */

export interface GuestCheckResult {
    success: boolean;
    allowed?: boolean;
    messageCount?: number;
}

export const guestSessionService = {
    /** Check if guest can send messages */
    async check(guestId: string): Promise<GuestCheckResult> {
        const res = await fetch('/api/sessions/guest/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guestId }),
        });
        return res.json();
    },

    /** Increment guest message count (fire-and-forget friendly) */
    async increment(guestId: string): Promise<GuestCheckResult> {
        const res = await fetch('/api/sessions/guest/increment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guestId }),
        });
        return res.json();
    },
};

export default guestSessionService;
