/**
 * authService — Authentication management for Canvas App
 * Wraps /api/auth/* endpoints
 * Handles session verification, logout
 */

const API_BASE = '/api/auth';

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
}

export interface VerifyResult {
    valid: boolean;
    user?: AuthUser;
}

export const authService = {
    /**
     * Verify current user session via cookie
     * Returns { valid: true, user } if authenticated
     */
    async verify(): Promise<VerifyResult> {
        const res = await fetch(`${API_BASE}/verify`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
            return { valid: false };
        }

        const data = await res.json();
        return {
            valid: data.valid === true && !!data.user,
            user: data.user || undefined,
        };
    },

    /**
     * Logout current session
     */
    async logout(): Promise<void> {
        try {
            await fetch(`${API_BASE}/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch {
            // Logout is fire-and-forget
        }
    },
};

export default authService;
