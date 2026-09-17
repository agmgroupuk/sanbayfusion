/**
 * billingService — Stripe billing & plan management for Canvas App
 * Wraps /api/canvas/studio-plan, /studio-checkout, /studio-verify endpoints
 * Product: 'canvas-app' — completely separate from canvas-studio ('canvas-studio')
 * Pricing: $7/week, $19/month, $120/year
 */

const API_BASE = '/api/canvas';

export interface Plan {
    id: string;
    name: string;
    tier: string;
    status: string;
    expiresAt?: string;
}

export interface PlanCheckResult {
    success: boolean;
    hasAccess: boolean;
    plan?: any;
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
        const res = await fetch(`${API_BASE}/studio-plan?app=gencraft-pro`, {
            credentials: 'include',
        });

        if (!res.ok) {
            return { success: false, hasAccess: false };
        }

        return res.json();
    },

    /**
     * Create a Stripe checkout session
     * @param email - User email (for Stripe customer_email)
     * @param plan - Plan identifier (e.g. 'monthly', 'yearly')
     */
    async createCheckout(email: string, plan: string): Promise<CheckoutResult> {
        const res = await fetch(`${API_BASE}/studio-checkout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: email, plan }),
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
     * @param sessionId - Stripe checkout session ID
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
     * Creates a session and redirects the browser
     */
    async redirectToCheckout(email: string, plan: string): Promise<void> {
        const result = await this.createCheckout(email, plan);
        if (result.success && result.url) {
            window.location.href = result.url;
        } else {
            throw new Error(result.error || 'Failed to create checkout session');
        }
    },

    /**
     * Fetch invoice history from billing API
     */
    async getInvoices(): Promise<{ success: boolean; invoices?: Array<{ id: string; date: string; amount: number; currency: string; status: 'paid' | 'pending' | 'failed'; description: string }> }> {
        try {
            const res = await fetch(`${API_BASE}/studio-invoices`, { credentials: 'include' });
            if (!res.ok) return { success: false, invoices: [] };
            return res.json();
        } catch {
            return { success: false, invoices: [] };
        }
    },
};

export default billingService;
