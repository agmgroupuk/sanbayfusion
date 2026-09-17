/**
 * sessionApiService — Raw session API calls (load, create, delete, rename, files, active)
 * Wraps /api/sessions/* endpoints that App.tsx uses directly
 * Note: This supplements the existing sessionService.ts which handles in-memory caching & sync
 */

export interface SessionApiResult {
    success: boolean;
    sessions?: unknown[];
    activeSessionId?: string;
    files?: Record<string, string>;
    [key: string]: unknown;
}

export const sessionApiService = {
    /** Load sessions from DB */
    async loadSessions(agentId: string, userId: string, limit = 50): Promise<SessionApiResult> {
        const res = await fetch(`/api/sessions/load?agentId=${encodeURIComponent(agentId)}&limit=${limit}`, {
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        });
        return res.json();
    },

    /** Load virtual files for a session */
    async loadFiles(sessionId: string, userId: string): Promise<SessionApiResult> {
        const res = await fetch(`/api/sessions/${sessionId}/files`, {
            headers: { 'x-user-id': userId },
        });
        return res.json();
    },

    /** Save virtual files for a session */
    async saveFiles(sessionId: string, userId: string, files: Record<string, string>): Promise<void> {
        await fetch(`/api/sessions/${sessionId}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ files }),
        });
    },

    /** Set active session */
    async setActive(sessionId: string, userId: string): Promise<void> {
        await fetch('/api/sessions/active', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ sessionId }),
        });
    },

    /** Delete a session */
    async deleteSession(sessionId: string, userId: string): Promise<void> {
        await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': userId },
        });
    },

    /** Rename a session */
    async renameSession(sessionId: string, userId: string, title: string): Promise<void> {
        await fetch(`/api/sessions/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ title }),
        });
    },

    /** Create a new session */
    async createSession(userId: string, data: { title: string; agentId: string; settings: unknown; localId: string }): Promise<void> {
        await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ userId, ...data }),
        });
    },

    /** Update a message's content (for edits) */
    async updateMessage(sessionId: string, messageId: string, userId: string, content: string): Promise<SessionApiResult> {
        const res = await fetch(`/api/sessions/${sessionId}/messages/${messageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ content }),
        });
        return res.json();
    },

    /** Delete a single message */
    async deleteMessage(sessionId: string, messageId: string, userId: string): Promise<void> {
        await fetch(`/api/sessions/${sessionId}/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': userId },
        });
    },

    /** Delete all messages in a session (clear chat) */
    async deleteAllMessages(sessionId: string, userId: string): Promise<SessionApiResult> {
        const res = await fetch(`/api/sessions/${sessionId}/messages`, {
            method: 'DELETE',
            headers: { 'x-user-id': userId },
        });
        return res.json();
    },

    /** Delete a canvas file */
    async deleteFile(sessionId: string, fileName: string, userId: string): Promise<void> {
        await fetch(`/api/sessions/${sessionId}/files/${encodeURIComponent(fileName)}`, {
            method: 'DELETE',
            headers: { 'x-user-id': userId },
        });
    },

    /** Update session settings (pinned messages, etc.) */
    async updateSettings(sessionId: string, userId: string, settings: Record<string, unknown>): Promise<SessionApiResult> {
        const res = await fetch(`/api/sessions/${sessionId}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ settings }),
        });
        return res.json();
    },
};

export default sessionApiService;
