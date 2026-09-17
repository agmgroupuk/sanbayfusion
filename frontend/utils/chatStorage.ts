/**
 * Chat Storage — 100% Database-backed via /api/sessions endpoints.
 * NO localStorage. All data persisted to PostgreSQL via Prisma.
 *
 * In-memory cache is used ONLY within the current page session for performance.
 * The database is the single source of truth.
 */
import { v4 as uuidv4 } from 'uuid';

export interface FileAttachment {
  name: string
  size: number
  type: string
  url?: string
  data?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  feedback?: 'positive' | 'negative' | null
  isStreaming?: boolean
  streamingComplete?: boolean
  attachments?: FileAttachment[]
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  lastUpdated: Date;
}

export interface AgentChatHistory {
  agentId: string;
  sessions: Record<string, ChatSession>;
  activeSessionId: string | null;
}

const MAX_MESSAGES_PER_AGENT = 100;

// ─────────────────────────────────────────────────────────────────
// In-memory cache (per page load only — NOT persistent)
// ─────────────────────────────────────────────────────────────────
let _cache: Record<string, AgentChatHistory> = {};
let _cacheLoaded = false;

/**
 * API helper — fetch with credentials (returns null on error)
 */
async function apiFetch(path: string, opts: RequestInit = {}): Promise<any> {
  try {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> || {}) },
      ...opts,
    });
    if (!res.ok) {
      if (res.status !== 401) {
        console.warn(`[ChatStorage] API ${opts.method || 'GET'} ${path} → ${res.status}`);
      }
      return null;
    }
    return res.json();
  } catch (err) {
    console.warn('[ChatStorage] API error:', err);
    return null;
  }
}

/**
 * Load all sessions from the database (one-time per page load)
 */
async function ensureCacheLoaded(): Promise<void> {
  if (_cacheLoaded) return;
  _cacheLoaded = true;

  try {
    const data = await apiFetch('/api/sessions/load?limit=100');
    if (!data?.success || !data.sessions) return;

    for (const s of data.sessions) {
      const agentId = s.agentId || '__default__';
      if (!_cache[agentId]) {
        _cache[agentId] = { agentId, sessions: {}, activeSessionId: null };
      }

      _cache[agentId].sessions[s.id] = {
        id: s.id,
        name: s.name || s.title || 'Chat',
        messages: (s.messages || []).map((m: any) => ({
          id: m.id || uuidv4(),
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content || m.text || '',
          timestamp: new Date(m.timestamp || m.createdAt),
          feedback: m.metadata?.feedback || null,
        })),
        lastUpdated: new Date(s.updatedAt || s.createdAt),
      };
    }

    if (data.activeSessionId) {
      for (const agentId of Object.keys(_cache)) {
        if (_cache[agentId].sessions[data.activeSessionId]) {
          _cache[agentId].activeSessionId = data.activeSessionId;
          break;
        }
      }
    }
  } catch (err) {
    console.warn('[ChatStorage] Failed to load from DB:', err);
  }
}

/**
 * Get all chat histories (from in-memory cache)
 */
function getAllChatHistories(): Record<string, AgentChatHistory> {
  if (!_cacheLoaded) {
    ensureCacheLoaded();
  }
  return _cache;
}

/**
 * Load chat history for a specific agent and session
 */
export function loadChatHistory(agentId: string, sessionId: string): ChatMessage[] {
  const histories = getAllChatHistories();
  return histories[agentId]?.sessions?.[sessionId]?.messages || [];
}

/**
 * Save chat history for a specific agent and session (cache + DB)
 */
export function saveChatHistory(agentId: string, sessionId: string, messages: ChatMessage[]): void {
  if (!_cache[agentId]) {
    _cache[agentId] = { agentId, sessions: {}, activeSessionId: sessionId };
  }
  if (!_cache[agentId].sessions) _cache[agentId].sessions = {};

  if (!_cache[agentId].sessions[sessionId]) {
    _cache[agentId].sessions[sessionId] = {
      id: sessionId,
      name: `Chat ${new Date().toLocaleString()}`,
      messages: [],
      lastUpdated: new Date(),
    };
  }

  _cache[agentId].sessions[sessionId].messages = messages.slice();
  _cache[agentId].sessions[sessionId].lastUpdated = new Date();
  _cache[agentId].activeSessionId = sessionId;

  // Persist to DB asynchronously
  _persistSessionToDB(agentId, sessionId, messages).catch(() => { });
}

/**
 * Persist session & messages to database
 */
async function _persistSessionToDB(agentId: string, sessionId: string, messages: ChatMessage[]): Promise<void> {
  const existing = await apiFetch(`/api/sessions/${sessionId}`);
  if (!existing?.success) {
    const createRes = await apiFetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        title: _cache[agentId]?.sessions?.[sessionId]?.name || 'Chat',
        agentId: agentId === '__default__' ? null : agentId,
        settings: { localSessionId: sessionId },
      }),
    });
    if (!createRes?.success) return;
  }

  // Add only new messages (avoid duplicates by checking existing)
  const dbSession = await apiFetch(`/api/sessions/${sessionId}`);
  const existingIds = new Set(
    (dbSession?.session?.messages || []).map((m: any) => m.metadata?.localId || m.id)
  );

  for (const msg of messages) {
    if (!existingIds.has(msg.id)) {
      await apiFetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          role: msg.role,
          content: msg.content,
          metadata: {
            localId: msg.id,
            feedback: msg.feedback,
            attachments: msg.attachments,
          },
        }),
      });
    }
  }
}

/**
 * Add a single message to an agent's chat history for a specific session
 */
export function addMessageToHistory(agentId: string, sessionId: string, message: ChatMessage): void {
  const currentMessages = loadChatHistory(agentId, sessionId);
  saveChatHistory(agentId, sessionId, [...currentMessages, message]);
}

/**
 * Update a specific message in an agent's chat history for a specific session
 */
export function updateMessageInHistory(agentId: string, sessionId: string, messageId: string, updates: Partial<ChatMessage>): void {
  const currentMessages = loadChatHistory(agentId, sessionId);
  const updatedMessages = currentMessages.map(msg =>
    msg.id === messageId ? { ...msg, ...updates } : msg
  );
  saveChatHistory(agentId, sessionId, updatedMessages);
}

/**
 * Clear chat history for a specific session
 */
export function clearChatHistory(agentId: string, sessionId: string): void {
  if (_cache[agentId]?.sessions?.[sessionId]) {
    _cache[agentId].sessions[sessionId].messages = [];
    _cache[agentId].sessions[sessionId].lastUpdated = new Date();
  }
  apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' }).catch(() => { });
}

/**
 * Clear all chat histories for a specific agent
 */
export function clearAgentChatHistory(agentId: string): void {
  const agentHistory = _cache[agentId];
  if (agentHistory?.sessions) {
    Object.keys(agentHistory.sessions).forEach(sid => {
      apiFetch(`/api/sessions/${sid}`, { method: 'DELETE' }).catch(() => { });
    });
  }
  delete _cache[agentId];
}

/**
 * Get all sessions for an agent
 */
export function getAgentSessions(agentId: string): ChatSession[] {
  const histories = getAllChatHistories();
  const agentHistory = histories[agentId];
  return agentHistory?.sessions
    ? Object.values(agentHistory.sessions).sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )
    : [];
}

/**
 * Get the active session ID for an agent
 */
export function getActiveSessionId(agentId: string): string | null {
  const histories = getAllChatHistories();
  const agentHistory = histories[agentId];
  if (agentHistory?.activeSessionId && agentHistory.sessions?.[agentHistory.activeSessionId]) {
    return agentHistory.activeSessionId;
  }
  if (agentHistory?.sessions && Object.keys(agentHistory.sessions).length > 0) {
    const sorted = Object.values(agentHistory.sessions).sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
    return sorted[0].id;
  }
  return null;
}

/**
 * Create a new chat session for an agent
 */
export function createNewSession(agentId: string, initialMessage?: ChatMessage): ChatSession {
  if (!_cache[agentId]) {
    _cache[agentId] = { agentId, sessions: {}, activeSessionId: null };
  }
  if (!_cache[agentId].sessions) _cache[agentId].sessions = {};

  const newSessionId = uuidv4();
  const newSession: ChatSession = {
    id: newSessionId,
    name: `New Chat ${Object.keys(_cache[agentId].sessions).length + 1}`,
    messages: initialMessage ? [initialMessage] : [],
    lastUpdated: new Date(),
  };

  _cache[agentId].sessions[newSessionId] = newSession;
  _cache[agentId].activeSessionId = newSessionId;

  // Create in DB
  apiFetch('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      title: newSession.name,
      agentId: agentId === '__default__' ? null : agentId,
    }),
  }).catch(() => { });

  // Set active session pointer in DB
  apiFetch('/api/sessions/active', {
    method: 'PUT',
    body: JSON.stringify({ sessionId: newSessionId }),
  }).catch(() => { });

  return newSession;
}

/**
 * Delete a chat session for an agent
 */
export function deleteSession(agentId: string, sessionId: string): void {
  if (_cache[agentId]?.sessions?.[sessionId]) {
    delete _cache[agentId].sessions[sessionId];
    if (_cache[agentId].activeSessionId === sessionId) {
      const remaining = Object.values(_cache[agentId].sessions).sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
      _cache[agentId].activeSessionId = remaining.length > 0 ? remaining[0].id : null;
    }
  }
  apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' }).catch(() => { });
}

/**
 * Rename a chat session for an agent
 */
export function renameSession(agentId: string, sessionId: string, newName: string): void {
  if (_cache[agentId]?.sessions?.[sessionId]) {
    _cache[agentId].sessions[sessionId].name = newName;
    _cache[agentId].sessions[sessionId].lastUpdated = new Date();
  }
  apiFetch(`/api/sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify({ title: newName }),
  }).catch(() => { });
}

/**
 * Clear all chat histories
 */
export function clearAllChatHistories(): void {
  Object.values(_cache).forEach(agentHistory => {
    if (agentHistory.sessions) {
      Object.keys(agentHistory.sessions).forEach(sid => {
        apiFetch(`/api/sessions/${sid}`, { method: 'DELETE' }).catch(() => { });
      });
    }
  });
  _cache = {};
}

/**
 * Get storage usage statistics
 */
export function getChatStorageInfo(): {
  totalAgents: number
  totalMessages: number
  totalSessions: number
  storageSize: number
} {
  const histories = getAllChatHistories();
  let totalMessages = 0;
  let totalSessions = 0;
  Object.values(histories).forEach(ah => {
    if (ah.sessions) {
      totalSessions += Object.keys(ah.sessions).length;
      Object.values(ah.sessions).forEach(s => { totalMessages += s.messages.length; });
    }
  });
  return { totalAgents: Object.keys(histories).length, totalMessages, totalSessions, storageSize: 0 };
}

/**
 * Export chat history for backup or sharing
 */
export function exportChatHistory(agentId?: string): string {
  const toExport: Record<string, AgentChatHistory> = {};
  const all = getAllChatHistories();
  if (agentId) {
    if (all[agentId]) toExport[agentId] = all[agentId];
  } else {
    Object.assign(toExport, all);
  }
  return JSON.stringify(toExport, null, 2);
}

/**
 * Import chat history from backup
 */
export function importChatHistory(jsonData: string): boolean {
  try {
    const imported = JSON.parse(jsonData);
    for (const agentId in imported) {
      const ah = imported[agentId];
      if (ah?.sessions) {
        if (!_cache[agentId]) _cache[agentId] = { agentId, sessions: {}, activeSessionId: null };
        for (const sid in ah.sessions) {
          const s = ah.sessions[sid];
          if (s?.id && s?.messages) {
            _cache[agentId].sessions[sid] = {
              ...s,
              lastUpdated: new Date(s.lastUpdated),
              messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
            };
            _persistSessionToDB(agentId, sid, _cache[agentId].sessions[sid].messages).catch(() => { });
          }
        }
        if (ah.activeSessionId) _cache[agentId].activeSessionId = ah.activeSessionId;
      }
    }
    return true;
  } catch (error) {
    console.error('Error importing chat history:', error);
    return false;
  }
}

/**
 * Initialize — load from DB. Call this early in app lifecycle.
 */
export async function initChatStorage(): Promise<void> {
  await ensureCacheLoaded();
}
