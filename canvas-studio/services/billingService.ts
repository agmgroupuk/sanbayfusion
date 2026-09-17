/**
 * billingService — Stripe billing & plan management for Canvas Studio (Standalone)
 * Wraps /api/canvas/studio-plan, /studio-checkout, /studio-verify endpoints
 * Pricing: $10/week, $30/month, $300/year
 */

const API_BASE = '/api/canvas';

export interface PlanInfo {
    type: 'weekly' | 'monthly' | 'yearly';
    price: number;
    startDate: string;
    expiryDate: string | null;
    isYearly: boolean;
    daysRemaining: number | null;
    hoursRemaining: number | null;
}

export interface PlanCheckResult {
    success: boolean;
    hasAccess: boolean;
    plan?: PlanInfo;
}

export interface CheckoutResult {
    success: boolean;
    url?: string;
    error?: string;
}

export interface VerifyResult {
    success: boolean;
    error?: string;
}

export const billingService = {
    /**
     * Check if user has an active plan (uses session cookie for auth)
     */
    async checkPlan(): Promise<PlanCheckResult> {
        const res = await fetch(`${API_BASE}/studio-plan`, {
            credentials: 'include',
        });

        if (!res.ok) {
            return { success: false, hasAccess: false };
        }

        return res.json();
    },

    /**
     * Create a Stripe checkout session
     * @param plan - 'weekly' ($10), 'monthly' ($30), 'yearly' ($300)
     */
    async createCheckout(email: string, plan: string): Promise<CheckoutResult> {
        const res = await fetch(`${API_BASE}/studio-checkout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: email, plan, source: 'canvas-studio' }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({ error: res.statusText }));
            return { success: false, error: data.error || 'Checkout failed' };
        }

        const data = await res.json();
        return { success: true, url: data.url };
    },

    /**
     * Verify a completed Stripe purchase
     */
    async verifyPurchase(sessionId: string): Promise<VerifyResult> {
        const res = await fetch(`${API_BASE}/studio-verify`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
            return { success: false, error: 'Verification failed' };
        }

        return res.json();
    },

    /**
     * Redirect to Stripe checkout
     */
    async redirectToCheckout(email: string, plan: string): Promise<void> {
        const result = await this.createCheckout(email, plan);
        if (result.success && result.url) {
            window.location.href = result.url;
        } else {
            throw new Error(result.error || 'Failed to create checkout session');
        }
    },
};

export default billingService;
