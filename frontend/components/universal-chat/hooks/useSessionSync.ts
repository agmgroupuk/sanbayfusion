/**
 * useSessionSync Hook — Integrates sessionService with App.tsx
 *
 * Add this to App.tsx to enable database sync for logged-in users.
 * Guests use in-memory sessions only (ephemeral, lost on page refresh).
 */

import { useEffect, useCallback, useRef } from 'react';
import { sessionService, ChatSession as DBSession } from '../services/sessionService';
import type { ChatSession, Message } from '../types';

interface UseSessionSyncOptions {
  isLoggedIn: boolean;
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeSessionId?: string;
}

/**
 * Hook to sync sessions with database for logged-in users
 */
export function useSessionSync({
  isLoggedIn,
  sessions,
  setSessions,
  activeSessionId,
}: UseSessionSyncOptions) {
  const syncedRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  // Update sessionService auth state
  useEffect(() => {
    sessionService.setAuthenticated(isLoggedIn);
  }, [isLoggedIn]);

  // Initial sync when user logs in
  useEffect(() => {
    if (!isLoggedIn || syncedRef.current) return;

    const doSync = async () => {
      try {
        // Sync any in-memory sessions to DB
        await sessionService.syncToCloud();

        // Load sessions from DB
        const dbSessions = await sessionService.getSessions();

        if (dbSessions.length > 0) {
          // Convert to App.tsx format
          const converted = dbSessions.map((s, index) => convertToAppSession(s, index === 0));
          setSessions(converted);
        }

        syncedRef.current = true;
        lastSyncRef.current = Date.now();
      } catch (error) {
        console.error('[useSessionSync] Sync failed:', error);
      }
    };

    doSync();
  }, [isLoggedIn, setSessions]);

  // Reset sync flag on logout
  useEffect(() => {
    if (!isLoggedIn) {
      syncedRef.current = false;
    }
  }, [isLoggedIn]);

  /**
   * Sync a message to DB after it's added locally
   */
  const syncMessage = useCallback(
    async (sessionId: string, message: Message) => {
      if (!isLoggedIn) return;

      // Debounce - don't sync more than once per second
      const now = Date.now();
      if (now - lastSyncRef.current < 1000) return;
      lastSyncRef.current = now;

      try {
        const role = message.sender === 'YOU' ? 'user' : 'assistant';
        await sessionService.addMessage(sessionId, role, message.text, {
          timestamp: message.timestamp,
        });
      } catch (error) {
        console.error('[useSessionSync] Failed to sync message:', error);
      }
    },
    [isLoggedIn]
  );

  /**
   * Create a new session in DB
   */
  const createSession = useCallback(
    async (title: string, settings?: Record<string, unknown>) => {
      if (!isLoggedIn) return null;

      try {
        const dbSession = await sessionService.createSession(title, settings);
        return dbSession.id;
      } catch (error) {
        console.error('[useSessionSync] Failed to create session:', error);
        return null;
      }
    },
    [isLoggedIn]
  );

  /**
   * Update session title in DB
   */
  const updateSessionTitle = useCallback(
    async (sessionId: string, title: string) => {
      if (!isLoggedIn) return;

      try {
        await sessionService.updateSession(sessionId, { title });
      } catch (error) {
        console.error('[useSessionSync] Failed to update title:', error);
      }
    },
    [isLoggedIn]
  );

  /**
   * Delete session from DB
   */
  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!isLoggedIn) return;

      try {
        await sessionService.deleteSession(sessionId);
      } catch (error) {
        console.error('[useSessionSync] Failed to delete session:', error);
      }
    },
    [isLoggedIn]
  );

  return {
    syncMessage,
    createSession,
    updateSessionTitle,
    deleteSession,
    isSynced: syncedRef.current,
  };
}

/**
 * Convert DB session format to App.tsx format
 */
function convertToAppSession(dbSession: DBSession, isActive = false): ChatSession {
  return {
    id: dbSession.id,
    name: dbSession.title,
    active: isActive,
    messages: dbSession.messages.map((m) => ({
      id: m.id,
      sender: m.role === 'user' ? 'YOU' : 'AGENT',
      text: m.content,
      timestamp: new Date(m.timestamp).toLocaleTimeString(),
    })) as Message[],
    settings: {
      model: (dbSession.settings as Record<string, unknown>)?.model as string || 'gpt-4o',
      provider: (dbSession.settings as Record<string, unknown>)?.provider as string || 'openai',
      temperature: (dbSession.settings as Record<string, unknown>)?.temperature as number || 0.7,
      maxTokens: (dbSession.settings as Record<string, unknown>)?.maxTokens as number || 8192,
      customPrompt: (dbSession.settings as Record<string, unknown>)?.customPrompt as string || '',
      agentName: 'Nova',
      agentId: dbSession.agentId || '',
      activeTool: 'none',
      workspaceMode: 'CHAT',
      portalUrl: '',
      canvas: { content: '', type: 'text', title: 'Untitled' },
    },
  };
}

export default useSessionSync;
