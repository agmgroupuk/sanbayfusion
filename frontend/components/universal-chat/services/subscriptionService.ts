/**
 * subscriptionService — Stripe subscription management
 * Wraps /api/subscriptions/* and /api/stripe/* endpoints
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

export interface CheckoutResult {
    success: boolean;
    url?: string;
    error?: string;
    alreadySubscribed?: boolean;
    existingSubscription?: {
        plan: string;
        expiryDate: string;
        daysRemaining?: number;
    };
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

    /** Create Stripe checkout session */
    async createCheckout(data: {
        agentId: string;
        agentName: string;
        plan: string;
        userId: string;
        userEmail: string;
    }, token?: string): Promise<CheckoutResult> {
        const res = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) {
            return { success: false, ...result };
        }
        return result;
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
