// Daily Challenges System - Engaging daily tasks with streaks and rewards

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'
export type ChallengeStatus = 'active' | 'completed' | 'expired' | 'failed'

export interface Challenge {
  id: string
  title: string
  description: string
  difficulty: ChallengeDifficulty
  icon: string
  basePoints: number
  targetMetric: string
  targetValue: number
  expiresAt: Date
  createdAt: Date
  category: 'agent' | 'personality' | 'exploration' | 'social'
}

export interface UserChallenge {
  userId: string
  challengeId: string
  challenge: Challenge
  status: ChallengeStatus
  progress: number
  completedAt?: Date
  pointsEarned: number
  streakBonus: number
}

export interface DailyChallengeSet {
  date: Date
  challenges: Challenge[]
  userProgress: UserChallenge[]
  completionCount: number
  streak: number
  bonusPoints: number
}

export interface ChallengeStreak {
  userId: string
  currentStreak: number
  longestStreak: number
  lastCompletedDate: Date
  totalCompleted: number
  totalPoints: number
}

// Challenge difficulty configuration
export const DIFFICULTY_CONFIG = {
  easy: {
    pointMultiplier: 1,
    streakBonus: 5,
    icon: '⭐',
    color: '#10B981'
  },
  medium: {
    pointMultiplier: 1.5,
    streakBonus: 10,
    icon: '⭐⭐',
    color: '#F59E0B'
  },
  hard: {
    pointMultiplier: 2,
    streakBonus: 25,
    icon: '⭐⭐⭐',
    color: '#DC2626'
  }
}

// Challenge categories
export const CHALLENGE_CATEGORIES = {
  agent: {
    name: 'Agent Challenges',
    description: 'Use specific agents or agent types',
    icon: '🤖',
    color: '#3B82F6'
  },
  personality: {
    name: 'Personality Challenges',
    description: 'Maintain high personality scores',
    icon: '💯',
    color: '#8B5CF6'
  },
  exploration: {
    name: 'Exploration Challenges',
    description: 'Explore new features and agents',
    icon: '🗺️',
    color: '#06B6D4'
  },
  social: {
    name: 'Social Challenges',
    description: 'Engage with community features',
    icon: '👥',
    color: '#EC4899'
  }
}

// Pre-defined challenge templates (rotate daily - 3 per day)
export const CHALLENGE_TEMPLATES: Record<string, Challenge> = {
  // Easy Challenges
  'first-chat-easy': {
    id: 'first-chat-easy',
    title: '🎙️ Break the Ice',
    description: 'Have your first chat with any agent',
    difficulty: 'easy',
    icon: '🎙️',
    basePoints: 50,
    targetMetric: 'dailyMessages',
    targetValue: 1,
    category: 'agent',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },
  'five-chats-easy': {
    id: 'five-chats-easy',
    title: '💬 Chatty',
    description: 'Have 5 conversations today',
    difficulty: 'easy',
    icon: '💬',
    basePoints: 100,
    targetMetric: 'dailyMessages',
    targetValue: 5,
    category: 'agent',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },
  'different-agents-easy': {
    id: 'different-agents-easy',
    title: '🎭 Agent Hopper',
    description: 'Chat with 3 different agents',
    difficulty: 'easy',
    icon: '🎭',
    basePoints: 75,
    targetMetric: 'dailyUniqueAgents',
    targetValue: 3,
    category: 'exploration',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },

  // Medium Challenges
  'personality-score-medium': {
    id: 'personality-score-medium',
    title: '⭐ Perfect Personality',
    description: 'Achieve 80%+ personality score 5 times',
    difficulty: 'medium',
    icon: '⭐',
    basePoints: 200,
    targetMetric: 'dailyHighScores80',
    targetValue: 5,
    category: 'personality',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },
  'consistency-medium': {
    id: 'consistency-medium',
    title: '📊 Consistent Performer',
    description: 'Get 10 messages with 75%+ personality score',
    difficulty: 'medium',
    icon: '📊',
    basePoints: 175,
    targetMetric: 'dailyConsistentScores',
    targetValue: 10,
    category: 'personality',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },
  'exploration-medium': {
    id: 'exploration-medium',
    title: '🗺️ Explorer',
    description: 'Use 5 different agents today',
    difficulty: 'medium',
    icon: '🗺️',
    basePoints: 150,
    targetMetric: 'dailyUniqueAgents',
    targetValue: 5,
    category: 'exploration',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },
  'social-medium': {
    id: 'social-medium',
    title: '👥 Social Butterfly',
    description: 'Share 2 conversations with community',
    difficulty: 'medium',
    icon: '👥',
    basePoints: 200,
    targetMetric: 'dailyShares',
    targetValue: 2,
    category: 'social',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },

  // Hard Challenges
  'perfect-score-hard': {
    id: 'perfect-score-hard',
    title: '💯 Perfect Run',
    description: 'Get 5 messages with 100% personality score',
    difficulty: 'hard',
    icon: '💯',
    basePoints: 350,
    targetMetric: 'dailyPerfectScores',
    targetValue: 5,
    category: 'personality',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },
  'master-all-agents-hard': {
    id: 'master-all-agents-hard',
    title: '🏆 Agent Master',
    description: 'Use all 18 agents today',
    difficulty: 'hard',
    icon: '🏆',
    basePoints: 400,
    targetMetric: 'dailyUniqueAgents',
    targetValue: 18,
    category: 'exploration',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },
  'legendary-hard': {
    id: 'legendary-hard',
    title: '⚜️ Legendary',
    description: '50 messages with 85%+ average score',
    difficulty: 'hard',
    icon: '⚜️',
    basePoints: 500,
    targetMetric: 'dailyLegendaryCount',
    targetValue: 50,
    category: 'personality',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  },
  'speedrunner-hard': {
    id: 'speedrunner-hard',
    title: '⚡ Speed Demon',
    description: '20 messages under 2 seconds each',
    difficulty: 'hard',
    icon: '⚡',
    basePoints: 300,
    targetMetric: 'dailyFastMessages',
    targetValue: 20,
    category: 'agent',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date()
  }
}

/**
 * Generate today's challenges (3 random from templates)
 */
export function generateTodaysChallenges(): Challenge[] {
  const templates = Object.values(CHALLENGE_TEMPLATES)
  const shuffled = [...templates].sort(() => Math.random() - 0.5)
  
  // Return 3 challenges: easy, medium, hard (1 each)
  const easy = shuffled.filter(c => c.difficulty === 'easy')[0]
  const medium = shuffled.filter(c => c.difficulty === 'medium')[0]
  const hard = shuffled.filter(c => c.difficulty === 'hard')[0]

  return [easy, medium, hard].filter(Boolean)
}

/**
 * Calculate points for completed challenge
 */
export function calculateChallengePoints(
  challenge: Challenge,
  streakDays: number = 0
): number {
  const diffConfig = DIFFICULTY_CONFIG[challenge.difficulty]
  const baseScore = challenge.basePoints * diffConfig.pointMultiplier
  const streakBonus = Math.floor((streakDays / 7) * diffConfig.streakBonus) // Bonus every 7-day streak
  return baseScore + streakBonus
}

/**
 * Calculate streak bonus
 */
export function calculateStreakBonus(currentStreak: number): number {
  // Bonus increases every 5 days
  const streakTier = Math.floor(currentStreak / 5)
  const baseBonus = 50 // Base bonus for maintaining streak

  if (streakTier === 0) return 0
  if (streakTier === 1) return baseBonus
  if (streakTier === 2) return baseBonus * 1.5
  if (streakTier === 3) return baseBonus * 2
  if (streakTier === 4) return baseBonus * 2.5
  return baseBonus * 3 // Max multiplier for 25+ days
}

/**
 * Check if user qualifies for next tier reward
 */
export function getStreakMilestones(streak: number): string[] {
  const milestones: string[] = []

  if (streak === 7) milestones.push('🔥 Week Warrior')
  if (streak === 14) milestones.push('💪 Fortnight Fighter')
  if (streak === 30) milestones.push('🌟 Monthly Master')
  if (streak === 60) milestones.push('👑 Bimonthly Boss')
  if (streak === 100) milestones.push('⚜️ Century Legend')
  if (streak % 50 === 0 && streak > 100) milestones.push(`🚀 ${streak}-Day Superstar`)

  return milestones
}

/**
 * Calculate challenge completion percentage
 */
export function getChallengeProgress(
  challenge: Challenge,
  userStats: Record<string, any>
): number {
  const current = userStats[challenge.targetMetric] || 0
  return Math.min((current / challenge.targetValue) * 100, 100)
}

/**
 * Get remaining time for challenge
 */
export function getChallengeTimeRemaining(expiresAt: Date): string {
  const now = new Date()
  const diffMs = expiresAt.getTime() - now.getTime()

  if (diffMs <= 0) return 'Expired'

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Check if challenge is completable today
 */
export function isChallengeActive(challenge: Challenge): boolean {
  const now = new Date()
  return now < challenge.expiresAt
}

/**
 * Get reward breakdown
 */
export function getChallengeRewards(
  challenges: Challenge[],
  completedCount: number,
  currentStreak: number
): {
  basePoints: number
  streakBonus: number
  totalPoints: number
  description: string
} {
  const basePoints = challenges
    .slice(0, completedCount)
    .reduce((sum, c) => sum + calculateChallengePoints(c), 0)

  const streakBonus = calculateStreakBonus(currentStreak)
  const totalPoints = basePoints + streakBonus

  let description = `${completedCount}/${challenges.length} challenges completed`
  if (completedCount === challenges.length) {
    description = '🎉 Perfect day! All challenges completed!'
  }

  return { basePoints, streakBonus, totalPoints, description }
}

/**
 * Update streak (called daily)
 */
export function updateStreak(
  previousStreak: ChallengeStreak,
  completedToday: number,
  totalChallenges: number
): ChallengeStreak {
  const today = new Date()
  const lastCompleted = new Date(previousStreak.lastCompletedDate)

  // Check if it's been exactly 1 day
  const daysDiff = Math.floor((today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24))

  let newStreak = previousStreak.currentStreak

  if (completedToday === totalChallenges) {
    // All challenges completed
    if (daysDiff === 1) {
      // Continuing streak
      newStreak = previousStreak.currentStreak + 1
    } else if (daysDiff > 1) {
      // Broke streak, start new one
      newStreak = 1
    } else if (daysDiff === 0) {
      // Same day, don't update
      newStreak = previousStreak.currentStreak
    }
  } else {
    // Not all completed - streak broken
    newStreak = 0
  }

  return {
    ...previousStreak,
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, previousStreak.longestStreak),
    lastCompletedDate: today,
    totalCompleted: previousStreak.totalCompleted + completedToday,
    totalPoints: previousStreak.totalPoints + completedToday * 100 // Rough estimate
  }
}

/**
 * Get motivational message based on streak
 */
export function getStreakMotivation(streak: number): string {
  if (streak === 0) return '🚀 Start your first streak today!'
  if (streak === 1) return '🔥 Great start! 1 day down!'
  if (streak < 7) return `💪 Keep it up! ${streak} days strong!`
  if (streak < 30) return `⭐ Amazing! ${streak} days! You\'re on fire!`
  if (streak < 60) return `👑 Legendary! ${streak} days! You\'re unstoppable!`
  return `⚜️ MYTHIC! ${streak} days! You are a LEGEND!`
}

/**
 * Get next milestone
 */
export function getNextMilestone(currentStreak: number): { milestone: string; daysUntil: number } {
  const milestones = [7, 14, 30, 60, 100, 150, 200, 365]
  const nextMilestone = milestones.find(m => m > currentStreak)

  if (!nextMilestone) {
    return { milestone: '✨ You\'ve reached the ultimate milestone!', daysUntil: 0 }
  }

  return {
    milestone: `🎯 ${nextMilestone}-Day Streak`,
    daysUntil: nextMilestone - currentStreak
  }
}
