/**
 * Tool Data Service
 * Persists tool-specific user data to the database via /api/user/tool-data/:userId/:toolKey
 * Replaces localStorage for all tool history, favorites, settings, etc.
 */

let cachedUserId: string | null = null;

async function getUserId(): Promise<string | null> {
    if (cachedUserId) return cachedUserId;
    if (typeof window === 'undefined') return null;

    try {
        const res = await fetch('/api/user/profile', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            cachedUserId = data.data?._id || data.data?.id || null;
            return cachedUserId;
        }
    } catch {
        // Not authenticated
    }
    return null;
}

export function clearCachedUserId(): void {
    cachedUserId = null;
}

/**
 * Load tool data from database.
 * Returns null if user not authenticated or data doesn't exist.
 */
export async function loadToolData<T>(toolKey: string): Promise<T | null> {
    try {
        const userId = await getUserId();
        if (!userId) return null;

        const res = await fetch(`/api/user/tool-data/${userId}/${encodeURIComponent(toolKey)}`, {
            credentials: 'include',
        });

        if (res.ok) {
            const result = await res.json();
            return result.data || null;
        }
    } catch (error) {
        console.error(`[ToolData] Failed to load ${toolKey}:`, error);
    }
    return null;
}

/**
 * Save tool data to database.
 * Silently fails if user not authenticated.
 */
export async function saveToolData<T>(toolKey: string, data: T): Promise<boolean> {
    try {
        const userId = await getUserId();
        if (!userId) return false;

        const res = await fetch(`/api/user/tool-data/${userId}/${encodeURIComponent(toolKey)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        return res.ok;
    } catch (error) {
        console.error(`[ToolData] Failed to save ${toolKey}:`, error);
        return false;
    }
}
