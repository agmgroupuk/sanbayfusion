/**
 * agentMemoryService — Agent memory CRUD (profile, memories, settings)
 * Wraps /api/agents/memory/:userId/:agentId endpoints
 */

const API_BASE = '/api/agents/memory';

export interface MemoryProfile {
    name: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    language: string;
    profession: string;
    workplace: string;
    interests: string;
    hobbies: string;
    [key: string]: unknown;
}

export interface MemoryData {
    success: boolean;
    data?: {
        userProfile?: MemoryProfile;
        memories?: { id: string; type: string; content: string; importance: number; createdAt: string }[];
        memoryEnabled?: boolean;
    };
}

function buildUrl(userId: string, agentId: string, suffix?: string): string {
    return `${API_BASE}/${encodeURIComponent(userId)}/${encodeURIComponent(agentId)}${suffix || ''}`;
}

export const agentMemoryService = {
    /** Load all memory data (profile + memories + enabled flag) */
    async load(userId: string, agentId: string): Promise<MemoryData> {
        const res = await fetch(buildUrl(userId, agentId), {
            headers: { 'x-user-id': userId },
        });
        if (!res.ok) throw new Error(`Failed to load memory: ${res.statusText}`);
        return res.json();
    },

    /** Save/update memory profile */
    async saveProfile(userId: string, agentId: string, updates: Partial<MemoryProfile>): Promise<void> {
        const res = await fetch(buildUrl(userId, agentId, '/profile'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ updates }),
        });
        if (!res.ok) throw new Error(`Failed to save profile: ${res.status} ${res.statusText}`);
    },

    /** Delete memory profile (reset all fields to empty) */
    async deleteProfile(userId: string, agentId: string): Promise<void> {
        await fetch(buildUrl(userId, agentId, '/profile'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({
                updates: {
                    name: '', dateOfBirth: '', gender: '', nationality: '',
                    language: '', profession: '', workplace: '', interests: '', hobbies: '',
                },
            }),
        });
    },

    /** Toggle memory enabled/disabled */
    async toggleEnabled(userId: string, agentId: string, enabled: boolean, currentProfile: Partial<MemoryProfile>): Promise<void> {
        await fetch(buildUrl(userId, agentId, '/profile'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ updates: { ...currentProfile, _memoryEnabled: enabled } }),
        });
    },

    /** Clear all agent memories */
    async clearAll(userId: string, agentId: string): Promise<void> {
        await fetch(buildUrl(userId, agentId), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ clearAll: true }),
        });
    },

    /** Process conversation messages and extract learnings into memory */
    async learn(userId: string, agentId: string, messages: Array<{ role: string; content: string }>, conversationId?: string): Promise<void> {
        try {
            await fetch(buildUrl(userId, agentId, '/learn'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ messages, conversationId }),
            });
        } catch {
            // Fire-and-forget — don't block chat flow
        }
    },

    /** Manually add a memory entry */
    async addMemory(userId: string, agentId: string, memory: { type: string; content: string; importance?: number }): Promise<void> {
        const res = await fetch(buildUrl(userId, agentId, '/add'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify(memory),
        });
        if (!res.ok) throw new Error(`Failed to add memory: ${res.status}`);
    },
};

export default agentMemoryService;
