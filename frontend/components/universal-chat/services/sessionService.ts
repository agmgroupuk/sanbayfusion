/**
 * Session Service — DB-first with in-memory cache
 *
 * NO localStorage. Database is the single source of truth for logged-in users.
 * Guest sessions are ephemeral (in-memory only — lost on page refresh).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  localId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SessionSettings {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
  localId?: string;
  agentId?: string;
  agentName?: string;
  activeTool?: string;
  workspaceMode?: string;
  portalUrl?: string;
  canvas?: Record<string, unknown>;
  pinnedMessageIds?: string[];
}

export interface ChatSession {
  id: string;
  localId?: string;
  title: string;
  messages: ChatMessage[];
  settings: SessionSettings;
  createdAt: Date;
  updatedAt: Date;
  synced?: boolean;
  agentId?: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  errors: { localId: string; error: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Cache (replaces all localStorage usage)
// ─────────────────────────────────────────────────────────────────────────────

let _memSessions: ChatSession[] = [];
let _memActiveId: string | null = null;
let _memSyncQueue: SyncQueueItem[] = [];

function getLocalSessions(): ChatSession[] {
  return _memSessions;
}

function saveLocalSessions(sessions: ChatSession[]): void {
  _memSessions = sessions;
}

function getActiveSessionId(): string | null {
  return _memActiveId;
}

function setActiveSessionId(id: string | null): void {
  _memActiveId = id;
}

function generateId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync Queue (for offline support)
// ─────────────────────────────────────────────────────────────────────────────

interface SyncQueueItem {
  action: 'create' | 'update' | 'addMessage' | 'delete';
  sessionId: string;
  data?: unknown;
  timestamp: number;
}

function getSyncQueue(): SyncQueueItem[] {
  return _memSyncQueue;
}

function addToSyncQueue(item: Omit<SyncQueueItem, 'timestamp'>): void {
  _memSyncQueue.push({ ...item, timestamp: Date.now() });
}

function clearSyncQueue(): void {
  _memSyncQueue = [];
}

// ─────────────────────────────────────────────────────────────────────────────
// API Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Service Class
// ─────────────────────────────────────────────────────────────────────────────

class SessionService {
  private isAuthenticated = false;
  private syncInProgress = false;

  /**
   * Set authentication state
   */
  setAuthenticated(auth: boolean): void {
    this.isAuthenticated = auth;
    if (auth) {
      // Auto-sync when user logs in
      this.syncToCloud().catch(console.error);
    }
  }

  /**
   * Get all sessions (from in-memory cache, or merged with DB if authenticated)
   */
  async getSessions(): Promise<ChatSession[]> {
    const local = getLocalSessions();

    if (!this.isAuthenticated) {
      return local;
    }

    // Try to get from API
    const result = await apiFetch<{ sessions: ChatSession[] }>('/sessions');
    if (!result.success || !result.data) {
      return local; // Fallback to local
    }

    // Merge: DB sessions + any unsynced local sessions
    const dbSessions = result.data.sessions.map((s) => ({
      ...s,
      synced: true,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      messages: s.messages?.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })) || [],
    }));

    const unsyncedLocal = local.filter((l) => !l.synced && !dbSessions.some((d) => d.id === l.id));

    const merged = [...dbSessions, ...unsyncedLocal].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    // Update local cache
    saveLocalSessions(merged);
    return merged;
  }

  /**
   * Get single session by ID
   */
  async getSession(id: string): Promise<ChatSession | null> {
    // Check local first
    const local = getLocalSessions();
    const localSession = local.find((s) => s.id === id || s.localId === id);

    if (!this.isAuthenticated) {
      return localSession || null;
    }

    // Try API
    const result = await apiFetch<{ session: ChatSession }>(`/sessions/${id}`);
    if (result.success && result.data) {
      const session = {
        ...result.data.session,
        synced: true,
        createdAt: new Date(result.data.session.createdAt),
        updatedAt: new Date(result.data.session.updatedAt),
        messages: result.data.session.messages.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      };

      // Update local cache
      this.updateLocalCache(session);
      return session;
    }

    return localSession || null;
  }

  /**
   * Create new session
   */
  async createSession(title = 'New Chat', settings: SessionSettings = {}): Promise<ChatSession> {
    const localId = generateId();
    const now = new Date();

    const session: ChatSession = {
      id: localId,
      localId,
      title,
      messages: [],
      settings: { ...settings, localId },
      createdAt: now,
      updatedAt: now,
      synced: false,
    };

    // Save locally first
    const sessions = getLocalSessions();
    sessions.unshift(session);
    saveLocalSessions(sessions);
    setActiveSessionId(session.id);

    // Sync to DB if authenticated
    if (this.isAuthenticated) {
      const result = await apiFetch<{ session: ChatSession }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ title, settings: { ...settings, localId } }),
      });

      if (result.success && result.data) {
        const dbSession = {
          ...result.data.session,
          localId,
          synced: true,
          createdAt: new Date(result.data.session.createdAt),
          updatedAt: new Date(result.data.session.updatedAt),
          messages: [],
        };

        // Update local with DB ID
        this.updateLocalCache(dbSession);
        setActiveSessionId(dbSession.id);
        return dbSession;
      } else {
        // Queue for later sync
        addToSyncQueue({ action: 'create', sessionId: localId, data: { title, settings } });
      }
    }

    return session;
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<ChatMessage> {
    const localId = generateId();
    const message: ChatMessage = {
      id: localId,
      localId,
      role,
      content,
      timestamp: new Date(),
      metadata,
    };

    // Update local first
    const sessions = getLocalSessions();
    const sessionIndex = sessions.findIndex((s) => s.id === sessionId || s.localId === sessionId);

    if (sessionIndex >= 0) {
      sessions[sessionIndex].messages.push(message);
      sessions[sessionIndex].updatedAt = new Date();
      saveLocalSessions(sessions);
    }

    // Sync to DB if authenticated
    if (this.isAuthenticated) {
      const session = sessions[sessionIndex];
      const dbSessionId = session?.synced ? session.id : null;

      if (dbSessionId) {
        const result = await apiFetch<{ message: ChatMessage }>(`/sessions/${dbSessionId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ role, content, metadata: { localId, ...metadata } }),
        });

        if (result.success && result.data) {
          message.id = result.data.message.id;
        } else {
          addToSyncQueue({ action: 'addMessage', sessionId, data: { role, content, metadata } });
        }
      }
    }

    return message;
  }

  /**
   * Update session (title, settings)
   */
  async updateSession(sessionId: string, updates: { title?: string; settings?: SessionSettings }): Promise<void> {
    // Update local
    const sessions = getLocalSessions();
    const sessionIndex = sessions.findIndex((s) => s.id === sessionId || s.localId === sessionId);

    if (sessionIndex >= 0) {
      if (updates.title) sessions[sessionIndex].title = updates.title;
      if (updates.settings) {
        sessions[sessionIndex].settings = { ...sessions[sessionIndex].settings, ...updates.settings };
      }
      sessions[sessionIndex].updatedAt = new Date();
      saveLocalSessions(sessions);
    }

    // Sync to DB if authenticated
    if (this.isAuthenticated && sessions[sessionIndex]?.synced) {
      const result = await apiFetch(`/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!result.success) {
        addToSyncQueue({ action: 'update', sessionId, data: updates });
      }
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Remove from local
    const sessions = getLocalSessions();
    const sessionIndex = sessions.findIndex((s) => s.id === sessionId || s.localId === sessionId);
    const session = sessions[sessionIndex];

    if (sessionIndex >= 0) {
      sessions.splice(sessionIndex, 1);
      saveLocalSessions(sessions);
    }

    // Clear active if it was this one
    if (getActiveSessionId() === sessionId) {
      setActiveSessionId(sessions[0]?.id || null);
    }

    // Delete from DB if authenticated and synced
    if (this.isAuthenticated && session?.synced) {
      await apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
    }
  }

  /**
   * Sync all local sessions to cloud
   */
  async syncToCloud(): Promise<SyncResult> {
    if (!this.isAuthenticated || this.syncInProgress) {
      return { created: 0, updated: 0, errors: [] };
    }

    this.syncInProgress = true;

    try {
      const local = getLocalSessions();
      const unsyncedSessions = local.filter((s) => !s.synced);

      if (unsyncedSessions.length === 0) {
        // Process any queued operations
        await this.processSyncQueue();
        return { created: 0, updated: 0, errors: [] };
      }

      // Bulk sync
      const result = await apiFetch<{ results: SyncResult }>('/sessions/sync', {
        method: 'POST',
        body: JSON.stringify({
          sessions: unsyncedSessions.map((s) => ({
            localId: s.localId || s.id,
            title: s.title,
            settings: s.settings,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            messages: s.messages.map((m) => ({
              localId: m.localId || m.id,
              role: m.role,
              content: m.content,
              createdAt: m.timestamp,
              metadata: m.metadata,
            })),
          })),
        }),
      });

      if (result.success && result.data) {
        // Mark synced sessions
        const updated = local.map((s) => {
          if (!s.synced && unsyncedSessions.some((u) => u.id === s.id)) {
            return { ...s, synced: true };
          }
          return s;
        });
        saveLocalSessions(updated);

        // Process any remaining queue items
        await this.processSyncQueue();

        return result.data.results;
      }

      return { created: 0, updated: 0, errors: [{ localId: 'bulk', error: result.error || 'Sync failed' }] };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process queued sync operations (for offline support)
   */
  private async processSyncQueue(): Promise<void> {
    const queue = getSyncQueue();
    if (queue.length === 0) return;

    const newQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        switch (item.action) {
          case 'addMessage': {
            const { role, content, metadata } = item.data as { role: string; content: string; metadata?: Record<string, unknown> };
            await apiFetch(`/sessions/${item.sessionId}/messages`, {
              method: 'POST',
              body: JSON.stringify({ role, content, metadata }),
            });
            break;
          }
          case 'update': {
            await apiFetch(`/sessions/${item.sessionId}`, {
              method: 'PUT',
              body: JSON.stringify(item.data),
            });
            break;
          }
          case 'delete': {
            await apiFetch(`/sessions/${item.sessionId}`, { method: 'DELETE' });
            break;
          }
        }
      } catch {
        // Keep in queue for retry
        newQueue.push(item);
      }
    }

    if (newQueue.length > 0) {
      _memSyncQueue = newQueue;
    } else {
      clearSyncQueue();
    }
  }

  /**
   * Get active session ID
   */
  getActiveSessionId(): string | null {
    return getActiveSessionId();
  }

  /**
   * Set active session ID
   */
  setActiveSessionId(id: string | null): void {
    setActiveSessionId(id);
  }

  /**
   * Update local cache with a session
   */
  private updateLocalCache(session: ChatSession): void {
    const sessions = getLocalSessions();
    const index = sessions.findIndex((s) => s.id === session.id || s.localId === session.localId);

    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }

    saveLocalSessions(sessions);
  }

  /**
   * Clear all in-memory data (for logout)
   * NO localStorage — data is only in memory
   */
  clearLocal(): void {
    _memSessions = [];
    _memActiveId = null;
    _memSyncQueue = [];
  }
}

// Export singleton
export const sessionService = new SessionService();
export default sessionService;
