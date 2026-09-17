// Unified Gamification System - Orchestrates all gamification features
import { Achievement, ACHIEVEMENTS, checkAchievementRequirement } from './achievement-system'
import { LeaderboardData, UserRank, LeaderboardCategory } from './leaderboard-system'
import { Challenge, UserChallenge, ChallengeStreak } from './daily-challenges'
import { ToolMastery, UserMastery } from './tool-mastery'
import { UserRewards, Transaction } from './rewards-shop'

export interface UserGamificationProfile {
  userId: string
  username: string
  totalPoints: number
  achievements: Achievement[]
  leaderboardRank: number
  currentStreak: number
  masteryLevel: string
  unlockedBadges: number
  rewards: UserRewards
}

export interface GamificationStats {
  totalUsers: number
  totalAchievements: number
  averagePoints: number
  medianStreak: number
  topCategories: string[]
}

export interface GamificationEvent {
  id: string
  name: string
  description: string
  icon: string
  startDate: Date
  endDate: Date
  pointMultiplier: number
  rewards: string[]
}

/**
 * Initialize user gamification profile
 */
export function initializeGamificationProfile(userId: string, username: string): UserGamificationProfile {
  return {
    userId,
    username,
    totalPoints: 0,
    achievements: [],
    leaderboardRank: 0,
    currentStreak: 0,
    masteryLevel: 'novice',
    unlockedBadges: 0,
    rewards: {
      userId,
      totalPoints: 0,
      availablePoints: 0,
      spentPoints: 0,
      inventory: [],
      transactions: [],
      activeCosmetics: {},
      stats: {
        totalEarned: 0,
        totalSpent: 0,
        itemsOwned: 0,
        refundsUsed: 0
      }
    }
  }
}

/**
 * Update user gamification profile with daily check
 */
export function updateUserProfile(
  profile: UserGamificationProfile,
  stats: Record<string, any>
): UserGamificationProfile {
  const updatedProfile = { ...profile }

  // Check for new achievements
  const newAchievements: Achievement[] = []
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    const alreadyUnlocked = profile.achievements.find(a => a.id === achievement.id)
    if (!alreadyUnlocked && checkAchievementRequirement(achievement, stats)) {
      newAchievements.push({
        ...achievement,
        unlockedAt: new Date()
      })
    }
  })

  updatedProfile.achievements = [...profile.achievements, ...newAchievements]
  updatedProfile.unlockedBadges = updatedProfile.achievements.length

  // Update total points based on achievements
  const achievementBonus = newAchievements.reduce((sum, a) => sum + a.points, 0)
  updatedProfile.totalPoints += achievementBonus
  updatedProfile.rewards.totalPoints += achievementBonus
  updatedProfile.rewards.availablePoints += achievementBonus

  return updatedProfile
}

/**
 * Process daily challenge completion
 */
export function processDailyChallenges(
  challenges: Challenge[],
  userProgress: UserChallenge[],
  currentStreak: number,
  profile: UserGamificationProfile
): {
  completedCount: number
  pointsEarned: number
  streakUpdated: number
  updatedProfile: UserGamificationProfile
} {
  const completedChallenges = userProgress.filter(p => p.status === 'completed')
  const completedCount = completedChallenges.length
  let pointsEarned = 0

  // Calculate points from challenges
  completedChallenges.forEach(challenge => {
    pointsEarned += challenge.pointsEarned + challenge.streakBonus
  })

  // Update streak
  let streakUpdated = currentStreak
  if (completedCount === challenges.length) {
    streakUpdated = currentStreak + 1
  } else if (completedCount > 0) {
    // Partial completion - maintain streak
    streakUpdated = currentStreak
  } else {
    // No completion - streak broken
    streakUpdated = 0
  }

  // Update profile
  const updatedProfile = { ...profile }
  updatedProfile.currentStreak = streakUpdated
  updatedProfile.totalPoints += pointsEarned
  updatedProfile.rewards.totalPoints += pointsEarned
  updatedProfile.rewards.availablePoints += pointsEarned

  return {
    completedCount,
    pointsEarned,
    streakUpdated,
    updatedProfile
  }
}

/**
 * Get comprehensive gamification dashboard
 */
export function getGamificationDashboard(
  profile: UserGamificationProfile,
  leaderboard: UserRank | null,
  challenges: Challenge[],
  mastery: UserMastery
): {
  overview: Record<string, any>
  recentAchievements: Achievement[]
  nextMilestones: Record<string, any>[]
  recommendations: string[]
} {
  const recentAchievements = profile.achievements
    .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0))
    .slice(0, 5)

  const nextMilestones = [
    { category: 'Achievements', current: profile.unlockedBadges, target: 30, type: 'achievement' },
    { category: 'Points', current: profile.totalPoints, target: 10000, type: 'points' },
    { category: 'Streak', current: profile.currentStreak, target: 30, type: 'streak' }
  ].map(m => ({
    ...m,
    progress: (m.current / m.target) * 100,
    remaining: Math.max(0, m.target - m.current)
  }))

  const recommendations: string[] = []

  if (profile.currentStreak < 7) {
    recommendations.push('🔥 Build a streak! Complete daily challenges for consistency.')
  }
  if (profile.unlockedBadges < 10) {
    recommendations.push('🏆 Unlock more badges to boost your achievement count!')
  }
  if (profile.totalPoints < 1000) {
    recommendations.push('💰 Earn more points to unlock shop items!')
  }
  if (leaderboard && leaderboard.rank > 100) {
    recommendations.push('📈 Climb the leaderboard! You\'re close to top 50!')
  }

  return {
    overview: {
      totalPoints: profile.totalPoints,
      achievements: profile.unlockedBadges,
      currentStreak: profile.currentStreak,
      leaderboardRank: leaderboard?.rank || 'N/A',
      masteredTools: mastery.masteredTools.length
    },
    recentAchievements,
    nextMilestones,
    recommendations
  }
}

/**
 * Get weekly gamification report
 */
export function getWeeklyReport(
  profile: UserGamificationProfile,
  transactions: Transaction[],
  userStats: Record<string, any>
): {
  pointsEarned: number
  achievementsUnlocked: number
  itemsPurchased: number
  challengesCompleted: number
  averageDailyPoints: number
  highlights: string[]
} {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const weekTransactions = transactions.filter(t => t.timestamp > weekAgo)
  const pointsEarned = weekTransactions
    .filter(t => t.type === 'earn' || t.type === 'bonus')
    .reduce((sum, t) => sum + t.amount, 0)

  const itemsPurchased = weekTransactions.filter(t => t.type === 'purchase').length
  const challengesCompleted = userStats.weeklyCompletedChallenges || 0
  const achievementsUnlocked = userStats.weeklyAchievements || 0

  const highlights: string[] = []

  if (challengesCompleted >= 21) highlights.push('🔥 Daily Challenge Master!')
  if (pointsEarned > 5000) highlights.push('💰 Major Point Earner!')
  if (achievementsUnlocked >= 5) highlights.push('🏆 Achievement Unlocked!')
  if (itemsPurchased >= 3) highlights.push('🎁 Shop Enthusiast!')

  return {
    pointsEarned,
    achievementsUnlocked,
    itemsPurchased,
    challengesCompleted,
    averageDailyPoints: Math.round(pointsEarned / 7),
    highlights
  }
}

/**
 * Get leaderboard insights for user
 */
export function getLeaderboardInsights(
  userRank: UserRank,
  topPlayers: UserRank[]
): {
  position: string
  nextTarget: UserRank | null
  scoreGap: number
  estDaysToReach: number
  percentile: number
} {
  let position = 'Outside Top 100'
  if (userRank.rank <= 100) position = 'Top 100'
  if (userRank.rank <= 50) position = 'Top 50'
  if (userRank.rank <= 10) position = 'Top 10'
  if (userRank.rank === 1) position = '#1 Ranked'

  const nextTarget = topPlayers.find(p => p.rank === userRank.rank - 1)
  const scoreGap = nextTarget ? nextTarget.score - userRank.score : 0
  // Estimate ~50 points per day average
  const estDaysToReach = nextTarget ? Math.ceil(scoreGap / 50) : 0

  return {
    position,
    nextTarget: nextTarget || null,
    scoreGap,
    estDaysToReach,
    percentile: Math.round((userRank.rank / topPlayers.length) * 100)
  }
}

/**
 * Get achievement completion percentage
 */
export function getAchievementCompletionPercentage(
  userAchievements: Achievement[]
): number {
  return (userAchievements.length / Object.values(ACHIEVEMENTS).length) * 100
}

/**
 * Generate motivation message based on profile
 */
export function getMotivationMessage(profile: UserGamificationProfile): string {
  if (profile.totalPoints < 500) {
    return '🚀 You\'re just getting started! Complete challenges and chat with agents to earn points!'
  }
  if (profile.unlockedBadges < 5) {
    return '🎯 You\'re making progress! Unlock more badges to reach the next tier!'
  }
  if (profile.currentStreak < 7) {
    return '🔥 Build momentum! Continue your streak for bonus rewards!'
  }
  if (profile.totalPoints < 5000) {
    return '💪 You\'re halfway there! Keep grinding to reach top tier rewards!'
  }
  if (profile.unlockedBadges < 30) {
    return '👑 You\'re becoming a legend! Collect more badges to reach collector status!'
  }
  return '⚜️ You\'ve reached legendary status! Keep maintaining your excellence!'
}

/**
 * Get seasonal event recommendations
 */
export function getSeasonalRecommendations(
  currentDate: Date = new Date()
): GamificationEvent[] {
  const month = currentDate.getMonth()
  const events: GamificationEvent[] = []

  // Summer event
  if (month >= 5 && month <= 7) {
    events.push({
      id: 'summer-event',
      name: '☀️ Summer Celebration',
      description: 'Double points all summer long!',
      icon: '☀️',
      startDate: new Date(currentDate.getFullYear(), 5, 1),
      endDate: new Date(currentDate.getFullYear(), 7, 31),
      pointMultiplier: 2,
      rewards: ['summer-badge', 'beach-theme', 'ice-cream-effect']
    })
  }

  // Holiday event
  if (month >= 10 && month <= 11) {
    events.push({
      id: 'holiday-event',
      name: '🎄 Holiday Festival',
      description: 'Triple points during holidays!',
      icon: '🎄',
      startDate: new Date(currentDate.getFullYear(), 10, 1),
      endDate: new Date(currentDate.getFullYear(), 11, 31),
      pointMultiplier: 3,
      rewards: ['holiday-badge', 'winter-theme', 'snowflake-effect']
    })
  }

  // New Year event
  if (month === 0) {
    events.push({
      id: 'newyear-event',
      name: '🎆 New Year, New Goals',
      description: 'Fresh start with bonus multiplier!',
      icon: '🎆',
      startDate: new Date(currentDate.getFullYear(), 0, 1),
      endDate: new Date(currentDate.getFullYear(), 0, 31),
      pointMultiplier: 2.5,
      rewards: ['newyear-badge', 'lucky-theme', 'fireworks-effect']
    })
  }

  return events
}

/**
 * Check tier upgrade eligibility
 */
export function checkTierUpgrade(
  currentPoints: number,
  previousPoints: number
): { upgraded: boolean; newTier: string } {
  const tiers = [
    { tier: 'Bronze', points: 0 },
    { tier: 'Silver', points: 1000 },
    { tier: 'Gold', points: 5000 },
    { tier: 'Platinum', points: 15000 },
    { tier: 'Diamond', points: 50000 }
  ]

  const currentTier = tiers.reverse().find(t => currentPoints >= t.points)?.tier || 'Bronze'
  const previousTier = tiers.find(t => previousPoints >= t.points)?.tier || 'Bronze'

  return {
    upgraded: currentTier !== previousTier,
    newTier: currentTier
  }
}

/**
 * Export user gamification data
 */
export function exportUserGamificationData(profile: UserGamificationProfile): string {
  const data = {
    profile,
    timestamp: new Date().toISOString(),
    format: 'gamification-v1'
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Get quick stats for profile card
 */
export function getQuickStats(profile: UserGamificationProfile): {
  stat1: { label: string; value: string | number; icon: string }
  stat2: { label: string; value: string | number; icon: string }
  stat3: { label: string; value: string | number; icon: string }
  stat4: { label: string; value: string | number; icon: string }
} {
  return {
    stat1: { label: 'Points', value: profile.totalPoints, icon: '⭐' },
    stat2: { label: 'Badges', value: profile.unlockedBadges, icon: '🏆' },
    stat3: { label: 'Streak', value: `${profile.currentStreak}d`, icon: '🔥' },
    stat4: { label: 'Level', value: profile.masteryLevel.toUpperCase(), icon: '⚙️' }
  }
}
