/**
 * CHAT INTEGRATION SERVICE
 * Hooks into chat system to capture real-time metrics
 * Tracks every actual user interaction
 */

import {
  UserMetrics,
  trackMessageSent,
  trackPerfectResponse,
  trackHighScore,
  startConversationSession,
  endConversationSession,
  updateStreak,
  trackChallengeCompletion,
  onMetricsEvent,
  emitMetricsEvent,
  MetricsEvent,
  saveUserMetrics,
  loadUserMetrics,
} from './realtime-metrics';
import { gamificationStorage } from '../gamificationAPI';

export interface ChatSession {
  sessionId: string;
  userId: string;
  agentId: string;
  startTime: Date;
  messages: ChatMessage[];
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quality?: number; // 0-100 rating
}

export class ChatIntegrationService {
  private static activeSessions: Map<string, ChatSession> = new Map();
  private static metricsCache: Map<string, UserMetrics> = new Map();

  /**
   * Initialize metrics for a user
   */
  static initializeUserMetrics(userId: string): UserMetrics {
    const cached = this.metricsCache.get(userId);
    if (cached) return cached;

    let metrics = loadUserMetrics(userId);
    if (!metrics) {
      // Create new metrics - this is real data, not demo
      metrics = {
        userId,
        username: '',
        totalMessagesEarned: 0,
        perfectResponseCount: 0,
        highScoreCount: 0,
        agentsUsed: new Set(),
        agentUsageCount: {},
        longestConversation: 0,
        totalConversationLength: 0,
        conversationSessions: [],
        usageByHour: {},
        usageByDay: {},
        firstUsageToday: null,
        lastActivityTime: new Date(),
        currentStreak: 0,
        longestStreak: 0,
        lastChallengeTime: null,
        completedChallengesCount: 0,
        averageResponseTime: 0,
        averageConversationLength: 0,
        accountCreatedAt: new Date(),
        lastUpdated: new Date(),
      };
      saveUserMetrics(metrics);
    }

    this.metricsCache.set(userId, metrics);
    return metrics;
  }

  /**
   * Start a new chat session (when user selects an agent)
   */
  static startChatSession(userId: string, agentId: string): ChatSession {
    const sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const session: ChatSession = {
      sessionId,
      userId,
      agentId,
      startTime: new Date(),
      messages: [],
      isActive: true,
    };

    this.activeSessions.set(sessionId, session);

    // Track in metrics
    const metrics = this.metricsCache.get(userId);
    if (metrics) {
      const updated = startConversationSession(agentId, metrics);
      this.metricsCache.set(userId, updated);
    }

    console.log(
      `[ChatIntegration] Session started: ${sessionId} for agent ${agentId}`
    );

    return session;
  }

  /**
   * CORE: Track user message sent (REAL interaction)
   * This is called every time user sends a message
   */
  static onUserMessageSent(
    userId: string,
    sessionId: string,
    message: string,
    agentId: string
  ): void {
    const metrics = this.metricsCache.get(userId);
    if (!metrics) return;

    // TRACK: Message sent
    const updated1 = trackMessageSent(userId, agentId, message.length, metrics);
    this.metricsCache.set(userId, updated1);

    // Update session
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.messages.push({
        id: `msg_${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
      });
    }

    // SYNC: Send to backend for persistence
    this.syncMetricsToBackend(userId, {
      type: 'message-sent',
      timestamp: new Date(),
      userId,
      data: { agentId, messageLength: message.length },
    });

    console.log(
      `[ChatIntegration] Message tracked for user ${userId}: "${message.substring(
        0,
        50
      )}..."`
    );
  }

  /**
   * CORE: Track assistant response received
   * Called when AI responds
   */
  static onAssistantResponseReceived(
    userId: string,
    sessionId: string,
    response: string,
    responseTimeMs: number,
    quality: number = 0.75 // 0-1 quality score
  ): void {
    const metrics = this.metricsCache.get(userId);
    if (!metrics) return;

    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Add message to session
    session.messages.push({
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      quality: Math.round(quality * 100),
    });

    // TRACK: Quality-based points
    if (quality === 1.0) {
      // Perfect response (100% quality)
      const updated = trackPerfectResponse(
        userId,
        session.agentId,
        responseTimeMs,
        metrics
      );
      this.metricsCache.set(userId, updated);

      this.syncMetricsToBackend(userId, {
        type: 'perfect-response',
        timestamp: new Date(),
        userId,
        data: { agentId: session.agentId, responseTime: responseTimeMs },
      });

      console.log(`[ChatIntegration] Perfect response tracked for ${userId}`);
    } else if (quality >= 0.8) {
      // High score (80%+ quality)
      const updated = trackHighScore(
        userId,
        session.agentId,
        quality * 100,
        metrics
      );
      this.metricsCache.set(userId, updated);

      this.syncMetricsToBackend(userId, {
        type: 'high-score',
        timestamp: new Date(),
        userId,
        data: { agentId: session.agentId, score: quality * 100 },
      });

      console.log(`[ChatIntegration] High score tracked for ${userId}`);
    }
  }

  /**
   * End chat session (when user closes or switches agent)
   */
  static endChatSession(
    userId: string,
    sessionId: string
  ): { sessionLength: number; messagesExchanged: number } {
    const session = this.activeSessions.get(sessionId);
    if (!session) return { sessionLength: 0, messagesExchanged: 0 };

    const endTime = new Date();
    const sessionLength = endTime.getTime() - session.startTime.getTime();
    const messagesExchanged = session.messages.length;

    // TRACK: End session
    const metrics = this.metricsCache.get(userId);
    if (metrics) {
      const updated = endConversationSession(userId, metrics);
      this.metricsCache.set(userId, updated);

      this.syncMetricsToBackend(userId, {
        type: 'session-end',
        timestamp: new Date(),
        userId,
        data: {
          sessionLength,
          messagesExchanged,
          agentId: session.agentId,
        },
      });
    }

    this.activeSessions.delete(sessionId);

    console.log(
      `[ChatIntegration] Session ended: ${sessionId}. Length: ${Math.round(
        sessionLength / 1000
      )}s, Messages: ${messagesExchanged}`
    );

    return { sessionLength, messagesExchanged };
  }

  /**
   * Track challenge completion (when user completes daily challenge)
   */
  static trackChallengeCompletion(
    userId: string,
    challengeId: string,
    pointsEarned: number
  ): void {
    const metrics = this.metricsCache.get(userId);
    if (!metrics) return;

    // TRACK: Challenge completion
    const updated = trackChallengeCompletion(
      userId,
      challengeId,
      pointsEarned,
      metrics
    );
    this.metricsCache.set(userId, updated);

    // SYNC: Send to backend
    this.syncMetricsToBackend(userId, {
      type: 'session-end', // Reuse for challenge
      timestamp: new Date(),
      userId,
      data: { challengeId, pointsEarned },
    });

    console.log(
      `[ChatIntegration] Challenge completed: ${challengeId}, points earned: ${pointsEarned}`
    );
  }

  /**
   * Track streak update (daily)
   */
  static updateDailyStreak(userId: string): number {
    const metrics = this.metricsCache.get(userId);
    if (!metrics) return 0;

    // TRACK: Update streak
    const updated = updateStreak(userId, metrics);
    this.metricsCache.set(userId, updated);

    // SYNC: Send to backend
    this.syncMetricsToBackend(userId, {
      type: 'streak-update',
      timestamp: new Date(),
      userId,
      data: {
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
      },
    });

    console.log(
      `[ChatIntegration] Streak updated: ${updated.currentStreak} days`
    );

    return updated.currentStreak;
  }

  /**
   * Get current user metrics
   */
  static getUserMetrics(userId: string): UserMetrics | null {
    return this.metricsCache.get(userId) || loadUserMetrics(userId);
  }

  /**
   * Get session stats
   */
  static getSessionStats(userId: string): {
    activeSessions: number;
    totalMessagesInActiveSessions: number;
    longestActiveSession: number;
  } {
    const sessions = Array.from(this.activeSessions.values()).filter(
      (s) => s.userId === userId && s.isActive
    );

    return {
      activeSessions: sessions.length,
      totalMessagesInActiveSessions: sessions.reduce(
        (sum, s) => sum + s.messages.length,
        0
      ),
      longestActiveSession: Math.max(
        ...sessions.map((s) => Date.now() - s.startTime.getTime()),
        0
      ),
    };
  }

  /**
   * BACKEND SYNC
   * Send metrics to backend for persistence
   */
  private static async syncMetricsToBackend(
    userId: string,
    event: MetricsEvent
  ): Promise<void> {
    try {
      // Using session-based auth and new API structure
      const response = await fetch(`/api/gamification/events/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: event.type,
          data: event.data,
        }),
      });

      if (!response.ok) {
        console.warn(
          `[ChatIntegration] Failed to sync metrics: ${response.status}`
        );
      } else {
        const result = await response.json();
        console.log(
          `[ChatIntegration] Metrics synced successfully`,
          result.data
        );

        // Update local cache with server response
        if (result.data.newAchievements) {
          console.log(
            `[ChatIntegration] New achievements unlocked:`,
            result.data.newAchievements
          );
        }
      }
    } catch (error) {
      console.error('[ChatIntegration] Error syncing metrics:', error);
    }
  }

  /**
   * Force sync all metrics immediately
   */
  static async forceSync(userId: string): Promise<boolean> {
    try {
      const metrics = this.metricsCache.get(userId);
      if (!metrics) return false;

      // Using session-based auth and new API structure
      const response = await fetch(`/api/gamification/metrics/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(metrics),
      });

      return response.ok;
    } catch (error) {
      console.error('[ChatIntegration] Error forcing sync:', error);
      return false;
    }
  }

  /**
   * Subscribe to metrics changes
   */
  static onMetricsChange(callback: (metrics: UserMetrics) => void): () => void {
    // Listen to all metrics events
    const unsubscribe = onMetricsEvent(() => {
      // Get updated metrics from cache
      // This would need a better pattern in production
    });

    return unsubscribe;
  }

  /**
   * Clear local cache (useful for logout)
   */
  static clearCache(userId: string): void {
    this.metricsCache.delete(userId);

    // Clear active sessions for user
    const userSessions = Array.from(this.activeSessions.entries())
      .filter(([_, session]) => session.userId === userId)
      .map(([sessionId]) => sessionId);

    userSessions.forEach((sessionId) => this.activeSessions.delete(sessionId));

    console.log(`[ChatIntegration] Cache cleared for user ${userId}`);
  }
}

/**
 * USAGE EXAMPLE:
 *
 * // Initialize when user logs in
 * ChatIntegrationService.initializeUserMetrics(userId)
 *
 * // Start chat session when user picks an agent
 * const session = ChatIntegrationService.startChatSession(userId, agentId)
 *
 * // Track user message
 * ChatIntegrationService.onUserMessageSent(userId, session.sessionId, message, agentId)
 *
 * // Track AI response
 * ChatIntegrationService.onAssistantResponseReceived(userId, session.sessionId, response, responseTime, quality)
 *
 * // End session when chat closes
 * ChatIntegrationService.endChatSession(userId, session.sessionId)
 *
 * // Get metrics anytime
 * const metrics = ChatIntegrationService.getUserMetrics(userId)
 */
