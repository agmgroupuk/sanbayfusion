/**
 * Rewards Center Logic - Dashboard Module
 * Handles user rewards, points, achievements, badges, and redemption system
 */

export interface RewardsState {
  isLoading: boolean;
  isRedeeming: boolean;
  error: string | null;
  success: boolean;
  userRewards: UserRewards;
  availableRewards: Reward[];
  achievements: Achievement[];
  badges: Badge[];
  pointsHistory: PointsTransaction[];
  leaderboard: LeaderboardEntry[];
}

export interface UserRewards {
  totalPoints: number;
  availablePoints: number;
  level: number;
  levelProgress: number;
  nextLevelPoints: number;
  streak: {
    current: number;
    longest: number;
    multiplier: number;
  };
  statistics: {
    totalEarned: number;
    totalRedeemed: number;
    totalTransactions: number;
    joinedDate: string;
  };
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  category: 'discount' | 'feature' | 'merchandise' | 'upgrade' | 'exclusive';
  cost: number;
  value: string;
  type: 'percentage' | 'fixed' | 'service' | 'physical';
  availability: 'unlimited' | 'limited' | 'seasonal';
  stock?: number;
  expiresAt?: string;
  requirements?: {
    minLevel?: number;
    minStreak?: number;
    achievements?: string[];
  };
  image?: string;
  featured: boolean;
  popular: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'usage' | 'social' | 'milestone' | 'special' | 'seasonal';
  icon: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
  completed: boolean;
  completedAt?: string;
  requirements: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'achievement' | 'special' | 'seasonal';
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  displayOrder: number;
}

export interface PointsTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'penalty';
  amount: number;
  description: string;
  category: string;
  timestamp: string;
  relatedId?: string; // Achievement ID, Reward ID, etc.
  metadata?: Record<string, any>;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  points: number;
  level: number;
  badges: number;
  achievements: number;
  rank: number;
}

export interface RedemptionResult {
  success: boolean;
  message: string;
  rewardId: string;
  code?: string;
  instructions?: string;
  expiresAt?: string;
}

export class RewardsLogic {
  private state: RewardsState;

  constructor() {
    this.state = {
      isLoading: false,
      isRedeeming: false,
      error: null,
      success: false,
      userRewards: this.getDefaultUserRewards(),
      availableRewards: [],
      achievements: [],
      badges: [],
      pointsHistory: [],
      leaderboard: [],
    };
  }

  /**
   * Get default user rewards structure
   */
  private getDefaultUserRewards(): UserRewards {
    return {
      totalPoints: 0,
      availablePoints: 0,
      level: 1,
      levelProgress: 0,
      nextLevelPoints: 100,
      streak: {
        current: 0,
        longest: 0,
        multiplier: 1.0,
      },
      statistics: {
        totalEarned: 0,
        totalRedeemed: 0,
        totalTransactions: 0,
        joinedDate: new Date().toISOString(),
      },
    };
  }

  /**
   * Initialize rewards data
   */
  async initialize(userId: string): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;

    try {
      const [
        rewardsData,
        availableRewards,
        achievements,
        badges,
        pointsHistory,
        leaderboard,
      ] = await Promise.all([
        this.fetchUserRewards(userId),
        this.fetchAvailableRewards(),
        this.fetchAchievements(userId),
        this.fetchBadges(userId),
        this.fetchPointsHistory(userId),
        this.fetchLeaderboard(),
      ]);

      this.state.userRewards = rewardsData;
      this.state.availableRewards = availableRewards;
      this.state.achievements = achievements;
      this.state.badges = badges;
      this.state.pointsHistory = pointsHistory;
      this.state.leaderboard = leaderboard;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load rewards data';
      this.state.error = message;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Fetch user rewards data
   */
  private async fetchUserRewards(userId: string): Promise<UserRewards> {
    try {
      const response = await fetch(`/api/user/rewards/${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user rewards');
      }
      const data = await response.json();
      return { ...this.getDefaultUserRewards(), ...data.rewards };
    } catch (error) {
      console.error('Error fetching user rewards:', error);
      return this.getDefaultUserRewards();
    }
  }

  /**
   * Fetch available rewards catalog
   */
  private async fetchAvailableRewards(): Promise<Reward[]> {
    try {
      const response = await fetch('/api/rewards/catalog');
      if (!response.ok) return [];
      const data = await response.json();
      return data.rewards || [];
    } catch (error) {
      console.error('Error fetching available rewards:', error);
      return [];
    }
  }

  /**
   * Fetch user achievements
   */
  private async fetchAchievements(userId: string): Promise<Achievement[]> {
    try {
      const response = await fetch(`/api/user/achievements/${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.achievements || [];
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }
  }

  /**
   * Fetch user badges
   */
  private async fetchBadges(userId: string): Promise<Badge[]> {
    try {
      const response = await fetch(`/api/user/badges/${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.badges || [];
    } catch (error) {
      console.error('Error fetching badges:', error);
      return [];
    }
  }

  /**
   * Fetch points transaction history
   */
  private async fetchPointsHistory(
    userId: string
  ): Promise<PointsTransaction[]> {
    try {
      const response = await fetch(`/api/user/points-history/${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Error fetching points history:', error);
      return [];
    }
  }

  /**
   * Fetch leaderboard data
   */
  private async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const response = await fetch('/api/rewards/leaderboard');
      if (!response.ok) return [];
      const data = await response.json();
      return data.leaderboard || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Redeem a reward
   */
  async redeemReward(
    userId: string,
    rewardId: string
  ): Promise<RedemptionResult> {
    const reward = this.state.availableRewards.find((r) => r.id === rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }

    // Check if user has enough points
    if (this.state.userRewards.availablePoints < reward.cost) {
      throw new Error('Insufficient points to redeem this reward');
    }

    // Check requirements
    const requirementCheck = this.checkRewardRequirements(reward);
    if (!requirementCheck.eligible) {
      throw new Error(requirementCheck.reason || 'Requirements not met');
    }

    this.state.isRedeeming = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rewardId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to redeem reward');
      }

      // Update local state
      this.state.userRewards.availablePoints -= reward.cost;
      this.state.userRewards.statistics.totalRedeemed += reward.cost;

      // Add transaction to history
      const transaction: PointsTransaction = {
        id: data.transactionId || Date.now().toString(),
        type: 'redeemed',
        amount: -reward.cost,
        description: `Redeemed: ${reward.name}`,
        category: 'redemption',
        timestamp: new Date().toISOString(),
        relatedId: rewardId,
      };
      this.state.pointsHistory.unshift(transaction);

      this.state.success = true;
      this.trackRewardsEvent('reward_redeemed', {
        rewardId,
        rewardName: reward.name,
        cost: reward.cost,
      });

      return {
        success: true,
        message: data.message || 'Reward redeemed successfully',
        rewardId,
        code: data.code,
        instructions: data.instructions,
        expiresAt: data.expiresAt,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to redeem reward';
      this.state.error = message;
      this.trackRewardsEvent('reward_redemption_failed', {
        rewardId,
        error: message,
      });
      throw new Error(message);
    } finally {
      this.state.isRedeeming = false;
    }
  }

  /**
   * Check if user meets reward requirements
   */
  private checkRewardRequirements(reward: Reward): {
    eligible: boolean;
    reason?: string;
  } {
    if (!reward.requirements) {
      return { eligible: true };
    }

    const { minLevel, minStreak, achievements } = reward.requirements;

    if (minLevel && this.state.userRewards.level < minLevel) {
      return {
        eligible: false,
        reason: `Requires level ${minLevel} or higher`,
      };
    }

    if (minStreak && this.state.userRewards.streak.current < minStreak) {
      return {
        eligible: false,
        reason: `Requires ${minStreak} day streak`,
      };
    }

    if (achievements && achievements.length > 0) {
      const completedAchievements = this.state.achievements
        .filter((a) => a.completed)
        .map((a) => a.id);

      const missingAchievements = achievements.filter(
        (achievementId) => !completedAchievements.includes(achievementId)
      );

      if (missingAchievements.length > 0) {
        return {
          eligible: false,
          reason: `Requires specific achievements`,
        };
      }
    }

    return { eligible: true };
  }

  /**
   * Award points to user and persist to backend
   * Points are primarily earned through chat activity
   */
  async awardPoints(
    userId: string,
    points: number,
    reason: string,
    category: string = 'activity'
  ): Promise<void> {
    try {
      // Update local state - actual points are calculated from activity
      const multiplier = this.state.userRewards.streak.multiplier;
      const actualPoints = Math.floor(points * multiplier);

      this.state.userRewards.totalPoints += actualPoints;
      this.state.userRewards.availablePoints += actualPoints;
      this.state.userRewards.statistics.totalEarned += actualPoints;

      // Add transaction
      const transaction: PointsTransaction = {
        id: Date.now().toString(),
        type: 'earned',
        amount: actualPoints,
        description: reason,
        category,
        timestamp: new Date().toISOString(),
      };
      this.state.pointsHistory.unshift(transaction);

      // Check for level up
      this.checkLevelUp();

      // Persist to backend gamification metrics
      try {
        await fetch(`/api/gamification/metrics/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            totalMessagesEarned: this.state.userRewards.totalPoints,
            lastActivityTime: new Date().toISOString(),
          }),
        });
      } catch (persistErr) {
        console.error('Failed to persist points to backend:', persistErr);
      }

      this.trackRewardsEvent('points_awarded', {
        points: actualPoints,
        reason,
        category,
      });
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  }

  /**
   * Check for level up
   */
  private checkLevelUp(): void {
    const currentLevel = this.state.userRewards.level;
    const newLevel = this.calculateLevel(this.state.userRewards.totalPoints);

    if (newLevel > currentLevel) {
      this.state.userRewards.level = newLevel;
      this.state.userRewards.nextLevelPoints = this.getPointsForLevel(
        newLevel + 1
      );

      // Award level up bonus
      const bonusPoints = newLevel * 10;
      this.state.userRewards.availablePoints += bonusPoints;

      this.trackRewardsEvent('level_up', {
        oldLevel: currentLevel,
        newLevel,
        bonusPoints,
      });
    }

    // Update progress
    const currentLevelPoints = this.getPointsForLevel(
      this.state.userRewards.level
    );
    const nextLevelPoints = this.getPointsForLevel(
      this.state.userRewards.level + 1
    );
    const progressPoints =
      this.state.userRewards.totalPoints - currentLevelPoints;
    const neededPoints = nextLevelPoints - currentLevelPoints;

    this.state.userRewards.levelProgress =
      (progressPoints / neededPoints) * 100;
  }

  /**
   * Calculate level from total points
   */
  private calculateLevel(totalPoints: number): number {
    // Level calculation: 100 points for level 1, then +50 per level
    let level = 1;
    let pointsNeeded = 100;
    let pointsAccumulated = 0;

    while (totalPoints >= pointsAccumulated + pointsNeeded) {
      pointsAccumulated += pointsNeeded;
      level++;
      pointsNeeded += 50;
    }

    return level;
  }

  /**
   * Get points required for specific level
   */
  private getPointsForLevel(level: number): number {
    let totalPoints = 0;
    let pointsForLevel = 100;

    for (let i = 1; i < level; i++) {
      totalPoints += pointsForLevel;
      pointsForLevel += 50;
    }

    return totalPoints;
  }

  /**
   * Update daily streak
   */
  async updateStreak(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/user/streak/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.state.userRewards.streak = {
          current: data.currentStreak,
          longest: Math.max(
            data.currentStreak,
            this.state.userRewards.streak.longest
          ),
          multiplier: this.calculateStreakMultiplier(data.currentStreak),
        };

        this.trackRewardsEvent('streak_updated', {
          streak: data.currentStreak,
        });
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }

  /**
   * Calculate streak multiplier
   */
  private calculateStreakMultiplier(streakDays: number): number {
    if (streakDays < 3) return 1.0;
    if (streakDays < 7) return 1.1;
    if (streakDays < 14) return 1.2;
    if (streakDays < 30) return 1.3;
    return 1.5; // Max 1.5x multiplier
  }

  /**
   * Get filtered rewards by category
   */
  getRewardsByCategory(category?: string): Reward[] {
    if (!category) return this.state.availableRewards;
    return this.state.availableRewards.filter(
      (reward) => reward.category === category
    );
  }

  /**
   * Get achievements by category and completion status
   */
  getAchievements(category?: string, completed?: boolean): Achievement[] {
    let achievements = this.state.achievements;

    if (category) {
      achievements = achievements.filter((a) => a.category === category);
    }

    if (completed !== undefined) {
      achievements = achievements.filter((a) => a.completed === completed);
    }

    return achievements;
  }

  /**
   * Get recent points transactions
   */
  getRecentTransactions(limit: number = 10): PointsTransaction[] {
    return this.state.pointsHistory.slice(0, limit);
  }

  /**
   * Get user's leaderboard position
   */
  getUserLeaderboardPosition(userId: string): LeaderboardEntry | null {
    return (
      this.state.leaderboard.find((entry) => entry.userId === userId) || null
    );
  }

  /**
   * Format points with commas
   */
  formatPoints(points: number): string {
    return points.toLocaleString();
  }

  /**
   * Get rarity color
   */
  getRarityColor(rarity: string): string {
    const colors = {
      common: '#6B7280',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#F59E0B',
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  }

  /**
   * Get level title
   */
  getLevelTitle(level: number): string {
    const titles = [
      'Newcomer',
      'Explorer',
      'Enthusiast',
      'Expert',
      'Master',
      'Champion',
      'Legend',
      'Hero',
      'Elite',
      'Ultimate',
    ];

    const titleIndex = Math.min(Math.floor((level - 1) / 5), titles.length - 1);
    return titles[titleIndex];
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.state.error = null;
  }

  /**
   * Get current state
   */
  getState(): RewardsState {
    return { ...this.state };
  }

  /**
   * Track rewards events
   */
  private trackRewardsEvent(
    event: string,
    properties?: Record<string, any>
  ): void {
    try {
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Rewards', {
          event,
          timestamp: new Date().toISOString(),
          ...properties,
        });
      }
    } catch (error) {
      console.error('Error tracking rewards event:', error);
    }
  }

  /**
   * Export rewards report
   */
  exportRewardsReport(): void {
    const report = {
      generatedAt: new Date().toISOString(),
      userRewards: this.state.userRewards,
      achievementsCount: {
        total: this.state.achievements.length,
        completed: this.state.achievements.filter((a) => a.completed).length,
        inProgress: this.state.achievements.filter((a) => !a.completed).length,
      },
      badgesCount: this.state.badges.length,
      transactionsCount: this.state.pointsHistory.length,
      leaderboardPosition:
        this.getUserLeaderboardPosition('current-user')?.rank || null,
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `rewards-report-${new Date().toISOString().split('T')[0]
      }.json`;
    link.click();

    this.trackRewardsEvent('rewards_report_exported');
  }

  /**
   * Check for new achievements
   */
  async checkAchievements(userId: string): Promise<Achievement[]> {
    try {
      const response = await fetch(`/api/user/check-achievements/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const newAchievements = data.newAchievements || [];

        // Update local achievements
        newAchievements.forEach((achievement: Achievement) => {
          const index = this.state.achievements.findIndex(
            (a) => a.id === achievement.id
          );
          if (index >= 0) {
            this.state.achievements[index] = achievement;
          }
        });

        if (newAchievements.length > 0) {
          this.trackRewardsEvent('achievements_unlocked', {
            count: newAchievements.length,
            achievements: newAchievements.map((a: Achievement) => a.id),
          });
        }

        return newAchievements;
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }

    return [];
  }
}

// Export singleton instance
export const rewardsLogic = new RewardsLogic();

// Export utility functions
export const rewardsUtils = {
  /**
   * Format transaction timestamp
   */
  formatTransactionTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffHours < 1) {
        return 'Just now';
      } else if (diffHours < 24) {
        return `${Math.floor(diffHours)} hours ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return timestamp;
    }
  },

  /**
   * Get achievement progress bar color
   */
  getProgressColor(percentage: number): string {
    if (percentage >= 100) return '#10B981';
    if (percentage >= 75) return '#F59E0B';
    if (percentage >= 50) return '#3B82F6';
    return '#6B7280';
  },

  /**
   * Calculate estimated completion time
   */
  estimateCompletionTime(
    current: number,
    target: number,
    dailyRate: number
  ): string {
    const remaining = target - current;
    if (remaining <= 0) return 'Completed';
    if (dailyRate <= 0) return 'Unknown';

    const daysNeeded = Math.ceil(remaining / dailyRate);
    if (daysNeeded === 1) return '1 day';
    if (daysNeeded < 30) return `${daysNeeded} days`;
    if (daysNeeded < 365) return `${Math.ceil(daysNeeded / 30)} months`;
    return `${Math.ceil(daysNeeded / 365)} years`;
  },
};
