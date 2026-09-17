/**
 * Gamification API Client - Database-backed replacement for localStorage
 */

// User ID management (replace with proper session-based user management)
let currentUserId: string | null = null;

export const setGamificationUserId = (userId: string) => {
  currentUserId = userId;
};

export const getCurrentUserId = (): string => {
  if (!currentUserId) {
    // For now, generate a temporary user ID - in production, get from session
    currentUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  return currentUserId;
};

// API client for gamification endpoints
class GamificationAPI {
  private baseUrl = '/api/gamification';

  async getMetrics(userId?: string): Promise<any> {
    const id = userId || getCurrentUserId();
    const response = await fetch(`${this.baseUrl}/metrics/${id}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get metrics: ${response.status}`);
    }

    return response.json();
  }

  async updateMetrics(metrics: any, userId?: string): Promise<any> {
    const id = userId || getCurrentUserId();
    const response = await fetch(`${this.baseUrl}/metrics/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(metrics),
    });

    if (!response.ok) {
      throw new Error(`Failed to update metrics: ${response.status}`);
    }

    return response.json();
  }

  async trackEvent(type: string, data: any = {}, userId?: string): Promise<any> {
    const id = userId || getCurrentUserId();
    const response = await fetch(`${this.baseUrl}/events/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ type, data }),
    });

    if (!response.ok) {
      throw new Error(`Failed to track event: ${response.status}`);
    }

    return response.json();
  }

  async syncData(userId?: string): Promise<any> {
    const id = userId || getCurrentUserId();
    const response = await fetch(`${this.baseUrl}/sync/${id}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to sync data: ${response.status}`);
    }

    return response.json();
  }

  async bulkSync(metrics: any, events: any[] = [], userId?: string): Promise<any> {
    const id = userId || getCurrentUserId();
    const response = await fetch(`${this.baseUrl}/bulk-sync/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ metrics, events }),
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk sync: ${response.status}`);
    }

    return response.json();
  }
}

export const gamificationAPI = new GamificationAPI();

// Replacement functions for localStorage usage in gamification system
export class GamificationStorage {
  private static instance: GamificationStorage;
  private cache: Map<string, any> = new Map();

  static getInstance(): GamificationStorage {
    if (!GamificationStorage.instance) {
      GamificationStorage.instance = new GamificationStorage();
    }
    return GamificationStorage.instance;
  }

  async getMetrics(): Promise<any> {
    try {
      const result = await gamificationAPI.getMetrics();
      if (result.success) {
        this.cache.set('metrics', result.data);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get metrics from API:', error);
      return this.cache.get('metrics') || null;
    }
  }

  async setMetrics(metrics: any): Promise<void> {
    try {
      this.cache.set('metrics', metrics);
      await gamificationAPI.updateMetrics(metrics);
    } catch (error) {
      console.error('Failed to update metrics via API:', error);
      // Keep in cache for later sync
    }
  }

  async trackEvent(type: string, data: any = {}): Promise<void> {
    try {
      await gamificationAPI.trackEvent(type, data);
    } catch (error) {
      console.error('Failed to track event via API:', error);
      // Could queue for later sync
    }
  }

  async getUserStats(): Promise<any> {
    const metrics = await this.getMetrics();
    return metrics || {
      totalMessagesEarned: 0,
      perfectResponseCount: 0,
      highScoreCount: 0,
      agentsUsed: [],
      longestConversation: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }

  async incrementStat(statName: string, amount: number = 1): Promise<void> {
    const metrics = await this.getMetrics();
    if (metrics) {
      metrics[statName] = (metrics[statName] || 0) + amount;
      await this.setMetrics(metrics);
    }
  }

  async addAgentUsed(agentId: string): Promise<void> {
    const metrics = await this.getMetrics();
    if (metrics) {
      if (!metrics.agentsUsed) metrics.agentsUsed = [];
      if (!metrics.agentsUsed.includes(agentId)) {
        metrics.agentsUsed.push(agentId);
      }
      
      if (!metrics.agentUsageCount) metrics.agentUsageCount = {};
      metrics.agentUsageCount[agentId] = (metrics.agentUsageCount[agentId] || 0) + 1;
      
      await this.setMetrics(metrics);
    }
  }

  async updateConversationStats(messageCount: number): Promise<void> {
    const metrics = await this.getMetrics();
    if (metrics) {
      metrics.longestConversation = Math.max(metrics.longestConversation || 0, messageCount);
      metrics.totalConversationLength = (metrics.totalConversationLength || 0) + messageCount;
      
      // Calculate average
      if (!metrics.conversationSessions) metrics.conversationSessions = [];
      metrics.conversationSessions.push(messageCount);
      metrics.averageConversationLength = metrics.conversationSessions.reduce((a, b) => a + b, 0) / metrics.conversationSessions.length;
      
      await this.setMetrics(metrics);
    }
  }

  async updateStreak(streakCount: number): Promise<void> {
    const metrics = await this.getMetrics();
    if (metrics) {
      metrics.currentStreak = streakCount;
      metrics.longestStreak = Math.max(metrics.longestStreak || 0, streakCount);
      await this.setMetrics(metrics);
      await this.trackEvent('streak-update', { streakCount });
    }
  }
}

export const gamificationStorage = GamificationStorage.getInstance();