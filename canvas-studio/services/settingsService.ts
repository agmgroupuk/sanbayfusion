/**
 * settingsService — User settings (dark mode, preferences)
 * Wraps /api/user/settings endpoint
 */

const API_BASE = '/api/user/settings';

export interface UserSettings {
    preferences?: {
        canvasDarkMode?: boolean;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export const settingsService = {
    /** Load user settings */
    async get(): Promise<UserSettings> {
        const res = await fetch(API_BASE, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to load settings: ${res.statusText}`);
        const data = await res.json();
        return data?.settings ?? {};
    },

    /** Save/merge user preferences (reads existing first to avoid overwriting) */
    async updatePreferences(updates: Record<string, unknown>): Promise<void> {
        // Read current prefs first so we don't overwrite other fields
        let existing: Record<string, unknown> = {};
        try {
            const res = await fetch(API_BASE, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                existing = data?.settings?.preferences ?? {};
            }
        } catch { /* use empty */ }

        await fetch(API_BASE, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ preferences: { ...existing, ...updates } }),
        });
    },
};

export default settingsService;
