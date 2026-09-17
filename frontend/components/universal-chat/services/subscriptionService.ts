/**
 * subscriptionService — subscription status/management
 * Wraps /api/subscriptions/* endpoints (checkout provider removed)
 */

export interface SubscriptionCheckResult {
    hasAccess?: boolean;
    hasActiveSubscription?: boolean;
    subscription?: {
        plan: string;
        expiryDate: string;
        daysUntilRenewal?: number;
        daysRemaining?: number;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export const subscriptionService = {
    /** Check existing subscription status */
    async check(userId: string, agentId: string, token?: string): Promise<SubscriptionCheckResult> {
        const res = await fetch('/api/subscriptions/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({ userId, agentId }),
        });
        if (!res.ok) throw new Error(`Subscription check failed: ${res.statusText}`);
        return res.json();
    },

    /** Cancel subscription */
    async cancel(userId: string, agentId: string, token?: string): Promise<{ success: boolean; error?: string }> {
        const res = await fetch('/api/subscriptions/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({ userId, agentId }),
        });
        return res.json();
    },
};

export default subscriptionService;
