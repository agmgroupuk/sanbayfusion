// Leaderboard System - Real-time rankings and tier progression
import { Achievement } from './achievement-system'

export type LeaderboardCategory = 'total-points' | 'achievements' | 'streak-days' | 'personality-score' | 'tool-mastery'
export type LeaderboardPeriod = 'all-time' | 'weekly' | 'monthly'
export type TierName = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export interface UserRank {
  userId: string
  username: string
  rank: number
  tier: TierName
  score: number
  change: number // +/- change from last period
  badges: number
  streakDays: number
  personalityScore: number
  masteredTools: number
  avatarUrl?: string
  isCurrentUser?: boolean
}

export interface LeaderboardData {
  category: LeaderboardCategory
  period: LeaderboardPeriod
  rankings: UserRank[]
  lastUpdated: Date
  userCurrentRank?: UserRank
}

export interface TierThreshold {
  tier: TierName
  minScore: number
  icon: string
  color: string
  rewards: TierReward[]
}

export interface TierReward {
  type: 'badge' | 'theme' | 'cosmetic' | 'points'
  value: string | number
  description: string
}

// Tier definitions - scores required to reach each tier
export const TIER_THRESHOLDS: Record<TierName, TierThreshold> = {
  bronze: {
    tier: 'bronze',
    minScore: 0,
    icon: '🥉',
    color: '#CD7F32',
    rewards: [
      { type: 'badge', value: 'bronze-medal', description: 'Bronze Medal Badge' },
      { type: 'theme', value: 'bronze-theme', description: 'Bronze Theme' }
    ]
  },
  silver: {
    tier: 'silver',
    minScore: 1000,
    icon: '🥈',
    color: '#C0C0C0',
    rewards: [
      { type: 'badge', value: 'silver-medal', description: 'Silver Medal Badge' },
      { type: 'theme', value: 'silver-theme', description: 'Silver Theme' },
      { type: 'points', value: 500, description: '500 Bonus Points' }
    ]
  },
  gold: {
    tier: 'gold',
    minScore: 5000,
    icon: '🥇',
    color: '#FFD700',
    rewards: [
      { type: 'badge', value: 'gold-medal', description: 'Gold Medal Badge' },
      { type: 'theme', value: 'gold-theme', description: 'Gold Theme' },
      { type: 'points', value: 1000, description: '1000 Bonus Points' },
      { type: 'cosmetic', value: 'gold-frame', description: 'Gold Profile Frame' }
    ]
  },
  platinum: {
    tier: 'platinum',
    minScore: 15000,
    icon: '💎',
    color: '#E5E4E2',
    rewards: [
      { type: 'badge', value: 'platinum-medal', description: 'Platinum Medal Badge' },
      { type: 'theme', value: 'platinum-theme', description: 'Platinum Theme' },
      { type: 'points', value: 2000, description: '2000 Bonus Points' },
      { type: 'cosmetic', value: 'platinum-frame', description: 'Platinum Profile Frame' },
      { type: 'cosmetic', value: 'platinum-badge', description: 'Platinum Badge Animated' }
    ]
  },
  diamond: {
    tier: 'diamond',
    minScore: 50000,
    icon: '💠',
    color: '#B9F3FC',
    rewards: [
      { type: 'badge', value: 'diamond-medal', description: 'Diamond Medal Badge' },
      { type: 'theme', value: 'diamond-theme', description: 'Diamond Theme' },
      { type: 'points', value: 5000, description: '5000 Bonus Points' },
      { type: 'cosmetic', value: 'diamond-frame', description: 'Diamond Profile Frame' },
      { type: 'cosmetic', value: 'diamond-badge', description: 'Diamond Badge Animated' },
      { type: 'cosmetic', value: 'diamond-glow', description: 'Diamond Glow Effect' }
    ]
  }
}

// Leaderboard category definitions
export const LEADERBOARD_CATEGORIES = {
  'total-points': {
    name: 'Total Points',
    description: 'Overall player ranking by total points earned',
    icon: '⭐',
    metric: 'totalPoints'
  },
  'achievements': {
    name: 'Achievements',
    description: 'Players who have unlocked the most badges',
    icon: '🏆',
    metric: 'achievementCount'
  },
  'streak-days': {
    name: 'Streak Days',
    description: 'Players with the longest usage streaks',
    icon: '🔥',
    metric: 'streakDays'
  },
  'personality-score': {
    name: 'Personality Score',
    description: 'Players with the highest personality consistency',
    icon: '💯',
    metric: 'personalityScore'
  },
  'tool-mastery': {
    name: 'Tool Mastery',
    description: 'Players who have mastered the most tools',
    icon: '⚙️',
    metric: 'masteredTools'
  }
}

/**
 * Determine tier based on score
 */
export function getTierFromScore(score: number): TierName {
  if (score >= TIER_THRESHOLDS.diamond.minScore) return 'diamond'
  if (score >= TIER_THRESHOLDS.platinum.minScore) return 'platinum'
  if (score >= TIER_THRESHOLDS.gold.minScore) return 'gold'
  if (score >= TIER_THRESHOLDS.silver.minScore) return 'silver'
  return 'bronze'
}

/**
 * Get next tier information
 */
export function getNextTier(currentTier: TierName): TierThreshold | null {
  const tiers: TierName[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  const currentIndex = tiers.indexOf(currentTier)
  if (currentIndex === -1 || currentIndex === tiers.length - 1) return null
  return TIER_THRESHOLDS[tiers[currentIndex + 1]]
}

/**
 * Calculate points until next tier
 */
export function getPointsUntilNextTier(currentScore: number, currentTier: TierName): number {
  const nextTier = getNextTier(currentTier)
  if (!nextTier) return 0
  return Math.max(0, nextTier.minScore - currentScore)
}

/**
 * Get tier progress percentage
 */
export function getTierProgress(currentScore: number, currentTier: TierName): number {
  const currentThreshold = TIER_THRESHOLDS[currentTier]
  const nextTier = getNextTier(currentTier)

  if (!nextTier) return 100 // Already at max tier

  const rangeStart = currentThreshold.minScore
  const rangeEnd = nextTier.minScore
  const progress = ((currentScore - rangeStart) / (rangeEnd - rangeStart)) * 100

  return Math.min(Math.max(progress, 0), 100)
}

/**
 * Calculate points for leaderboard based on category
 */
export function calculateLeaderboardScore(
  category: LeaderboardCategory,
  stats: Record<string, any>
): number {
  switch (category) {
    case 'total-points':
      return stats.totalPoints || 0

    case 'achievements':
      return stats.achievementCount * 50 // 50 points per achievement

    case 'streak-days':
      return stats.streakDays * 10 // 10 points per day

    case 'personality-score':
      return Math.round(stats.personalityScore * 100) // Scale to 0-10000

    case 'tool-mastery':
      return stats.masteredTools * 500 // 500 points per mastered tool

    default:
      return 0
  }
}

/**
 * Rank users based on scores
 */
export function rankUsers(users: UserRank[]): UserRank[] {
  const sorted = [...users].sort((a, b) => b.score - a.score)
  return sorted.map((user, index) => ({
    ...user,
    rank: index + 1,
    change: user.rank ? user.rank - (index + 1) : 0
  }))
}

/**
 * Get leaderboard slice with pagination
 */
export function getLeaderboardPage(
  rankings: UserRank[],
  page: number = 1,
  pageSize: number = 50
): UserRank[] {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return rankings.slice(start, end)
}

/**
 * Get user's position and surrounding users
 */
export function getUserLeaderboardContext(
  rankings: UserRank[],
  userId: string,
  contextSize: number = 5
): UserRank[] {
  const userIndex = rankings.findIndex(u => u.userId === userId)
  if (userIndex === -1) return []

  const start = Math.max(0, userIndex - contextSize)
  const end = Math.min(rankings.length, userIndex + contextSize + 1)

  return rankings.slice(start, end)
}

/**
 * Get tier distribution statistics
 */
export function getTierDistribution(rankings: UserRank[]): Record<TierName, number> {
  const distribution: Record<TierName, number> = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
    diamond: 0
  }

  rankings.forEach(user => {
    distribution[user.tier]++
  })

  return distribution
}

/**
 * Calculate tier percentile
 */
export function getTierPercentile(tier: TierName, totalUsers: number): number {
  const tiers: TierName[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  const tierIndex = tiers.indexOf(tier)

  if (tierIndex === -1) return 0
  if (tierIndex === 0) return 100 // Bronze is bottom tier

  // Rough estimation: each tier represents ~20% decrease
  const percentagePerTier = 100 / tiers.length
  return 100 - (tierIndex * percentagePerTier)
}

/**
 * Get users who just got promoted
 */
export function getRecentPromotions(
  previousRankings: UserRank[],
  currentRankings: UserRank[],
  tierDifference: number = 1
): UserRank[] {
  const promotions: UserRank[] = []

  currentRankings.forEach(currentUser => {
    const previousUser = previousRankings.find(u => u.userId === currentUser.userId)
    if (!previousUser) return

    const currentTierIndex = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(currentUser.tier)
    const previousTierIndex = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(previousUser.tier)

    if (currentTierIndex - previousTierIndex >= tierDifference) {
      promotions.push(currentUser)
    }
  })

  return promotions
}

/**
 * Get competitive insights
 */
export function getCompetitiveInsights(
  userRank: UserRank,
  rankings: UserRank[],
  topN: number = 10
): {
  positionInsight: string
  nextTargetScore: number
  nextTargetUser: UserRank | null
  percentileRank: number
} {
  const topUsers = rankings.slice(0, topN)
  const nextTarget = topUsers.find(u => u.rank > userRank.rank)
  const percentile = (userRank.rank / rankings.length) * 100

  let positionInsight = 'You are in the top rankings!'
  if (percentile > 50) positionInsight = 'Keep grinding to reach top 50!'
  if (percentile > 80) positionInsight = 'You\'re climbing! Almost in top 20!'
  if (percentile > 90) positionInsight = 'Incredible! Top 10 is within reach!'
  if (percentile > 95) positionInsight = 'Legendary status unlocked!'

  return {
    positionInsight,
    nextTargetScore: nextTarget?.score || 0,
    nextTargetUser: nextTarget || null,
    percentileRank: Math.round(100 - percentile)
  }
}
