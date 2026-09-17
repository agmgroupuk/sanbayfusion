// Achievement Badge System - Complete gamification with 50+ badges

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'explorer' | 'communicator' | 'master' | 'legend'
  points: number
  unlockedAt?: Date
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  requirements: {
    type: string
    value: number
    metric?: string
  }
}

export interface UserAchievements {
  userId: string
  achievements: Achievement[]
  totalPoints: number
  totalUnlocked: number
  totalPossible: number
  progress: Map<string, number>
  lastUnlockedAt?: Date
  streakCount: number
}

// All 50+ Achievements
export const ACHIEVEMENTS: Record<string, Achievement> = {
  // Explorer Category (15 badges)
  'first-agent': {
    id: 'first-agent',
    name: 'Agent Whisperer',
    description: 'Use your first AI agent',
    icon: '🤖',
    category: 'explorer',
    points: 10,
    rarity: 'common',
    requirements: { type: 'agentUsage', value: 1 }
  },
  'all-agents-tried': {
    id: 'all-agents-tried',
    name: 'Agent Collector',
    description: 'Try all 18 AI agents',
    icon: '🎭',
    category: 'explorer',
    points: 50,
    rarity: 'rare',
    requirements: { type: 'uniqueAgents', value: 18 }
  },
  'explore-100-messages': {
    id: 'explore-100-messages',
    name: 'Conversationalist',
    description: 'Send 100 messages',
    icon: '💬',
    category: 'explorer',
    points: 25,
    rarity: 'uncommon',
    requirements: { type: 'totalMessages', value: 100 }
  },
  'early-bird': {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Use platform before 8 AM',
    icon: '🌅',
    category: 'explorer',
    points: 15,
    rarity: 'common',
    requirements: { type: 'timeOfDay', value: 8 }
  },
  'night-owl': {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Use platform after midnight',
    icon: '🌙',
    category: 'explorer',
    points: 15,
    rarity: 'common',
    requirements: { type: 'timeOfDay', value: 0 }
  },
  'weekly-warrior': {
    id: 'weekly-warrior',
    name: 'Weekly Warrior',
    description: 'Use platform 7 days in a week',
    icon: '⚔️',
    category: 'explorer',
    points: 40,
    rarity: 'uncommon',
    requirements: { type: 'weeklyDays', value: 7 }
  },
  'month-marathon': {
    id: 'month-marathon',
    name: 'Month Marathon',
    description: 'Use platform every day for a month',
    icon: '🏃',
    category: 'explorer',
    points: 100,
    rarity: 'rare',
    requirements: { type: 'monthlyDays', value: 30 }
  },
  'personality-enthusiast': {
    id: 'personality-enthusiast',
    name: 'Personality Enthusiast',
    description: 'Achieve 90%+ personality score 10 times',
    icon: '⭐',
    category: 'explorer',
    points: 60,
    rarity: 'rare',
    requirements: { type: 'highScoreCount', value: 10 }
  },
  'high-score-collector': {
    id: 'high-score-collector',
    name: 'Perfectionist',
    description: 'Get 100% personality score',
    icon: '💯',
    category: 'explorer',
    points: 75,
    rarity: 'epic',
    requirements: { type: 'perfectScore', value: 1 }
  },
  'speed-demon': {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Get 5 responses under 1 second',
    icon: '⚡',
    category: 'explorer',
    points: 20,
    rarity: 'uncommon',
    requirements: { type: 'fastResponses', value: 5 }
  },

  // Communicator Category (15 badges)
  'first-response': {
    id: 'first-response',
    name: 'Voice Heard',
    description: 'Send your first message',
    icon: '🎙️',
    category: 'communicator',
    points: 5,
    rarity: 'common',
    requirements: { type: 'firstMessage', value: 1 }
  },
  '1k-messages': {
    id: '1k-messages',
    name: 'Prolific Talker',
    description: 'Send 1,000 messages',
    icon: '📢',
    category: 'communicator',
    points: 100,
    rarity: 'epic',
    requirements: { type: 'totalMessages', value: 1000 }
  },
  'long-conversation': {
    id: 'long-conversation',
    name: 'Story Teller',
    description: 'Have a conversation with 50+ turns',
    icon: '📖',
    category: 'communicator',
    points: 35,
    rarity: 'uncommon',
    requirements: { type: 'conversationTurns', value: 50 }
  },
  'comedy-gold': {
    id: 'comedy-gold',
    name: 'Comedy Gold',
    description: 'Get 5 Comedy King responses scored 90+',
    icon: '😂',
    category: 'communicator',
    points: 50,
    rarity: 'rare',
    requirements: { type: 'agentHighScore', value: 5, metric: 'comedy-king' }
  },
  'emotional-connection': {
    id: 'emotional-connection',
    name: 'Emotional Connection',
    description: 'Get 5 Emma Emotional responses scored 90+',
    icon: '💖',
    category: 'communicator',
    points: 50,
    rarity: 'rare',
    requirements: { type: 'agentHighScore', value: 5, metric: 'emma-emotional' }
  },
  'wisdom-seeker': {
    id: 'wisdom-seeker',
    name: 'Wisdom Seeker',
    description: 'Get 5 Einstein responses scored 90+',
    icon: '🧠',
    category: 'communicator',
    points: 50,
    rarity: 'rare',
    requirements: { type: 'agentHighScore', value: 5, metric: 'einstein' }
  },
  'supportive-network': {
    id: 'supportive-network',
    name: 'Supportive Network',
    description: 'Use 5 different support agents 10+ times',
    icon: '🤝',
    category: 'communicator',
    points: 45,
    rarity: 'uncommon',
    requirements: { type: 'multiAgentUsage', value: 5 }
  },
  'variety-show': {
    id: 'variety-show',
    name: 'Variety Show',
    description: 'Use different agent categories equally',
    icon: '🎪',
    category: 'communicator',
    points: 55,
    rarity: 'rare',
    requirements: { type: 'balancedUsage', value: 18 }
  },

  // Master Category (12 badges)
  'personality-master': {
    id: 'personality-master',
    name: 'Personality Master',
    description: 'Maintain 85%+ average personality score',
    icon: '👑',
    category: 'master',
    points: 150,
    rarity: 'epic',
    requirements: { type: 'averageScore', value: 85 }
  },
  'consistency-king': {
    id: 'consistency-king',
    name: 'Consistency King',
    description: 'Get 50 responses with 80%+ score',
    icon: '📊',
    category: 'master',
    points: 120,
    rarity: 'epic',
    requirements: { type: 'consistentHighScores', value: 50 }
  },
  'zero-breaks': {
    id: 'zero-breaks',
    name: 'Character Lock',
    description: '100 messages with zero character breaks',
    icon: '🔐',
    category: 'master',
    points: 140,
    rarity: 'epic',
    requirements: { type: 'noCharacterBreaks', value: 100 }
  },
  'agent-specialist-1': {
    id: 'agent-specialist-1',
    name: 'Comedy Specialist',
    description: 'Use Comedy King 100+ times',
    icon: '🎭',
    category: 'master',
    points: 60,
    rarity: 'rare',
    requirements: { type: 'agentSpecialization', value: 100, metric: 'comedy-king' }
  },
  'agent-specialist-2': {
    id: 'agent-specialist-2',
    name: 'Tech Specialist',
    description: 'Use Tech Wizard 100+ times',
    icon: '🧙',
    category: 'master',
    points: 60,
    rarity: 'rare',
    requirements: { type: 'agentSpecialization', value: 100, metric: 'tech-wizard' }
  },
  'all-specialists': {
    id: 'all-specialists',
    name: 'Specialist Collector',
    description: 'Master 5 different agents',
    icon: '🎓',
    category: 'master',
    points: 180,
    rarity: 'legendary',
    requirements: { type: 'multipleSpecializations', value: 5 }
  },
  'teaching-master': {
    id: 'teaching-master',
    name: 'Teaching Master',
    description: 'Share 10 conversations publicly',
    icon: '📚',
    category: 'master',
    points: 100,
    rarity: 'rare',
    requirements: { type: 'publicShares', value: 10 }
  },

  // Legend Category (8 badges)
  'platform-legend': {
    id: 'platform-legend',
    name: 'Platform Legend',
    description: '500+ messages and 85%+ average score',
    icon: '⚜️',
    category: 'legend',
    points: 250,
    rarity: 'legendary',
    requirements: { type: 'legendaryStatus', value: 500 }
  },
  'achievement-hunter': {
    id: 'achievement-hunter',
    name: 'Achievement Hunter',
    description: 'Unlock 30+ achievements',
    icon: '🏆',
    category: 'legend',
    points: 200,
    rarity: 'legendary',
    requirements: { type: 'totalAchievements', value: 30 }
  },
  '100-day-streak': {
    id: '100-day-streak',
    name: 'Century Streak',
    description: '100 day usage streak',
    icon: '🔥',
    category: 'legend',
    points: 300,
    rarity: 'legendary',
    requirements: { type: 'streakDays', value: 100 }
  },
  'community-hero': {
    id: 'community-hero',
    name: 'Community Hero',
    description: 'Help 50+ other users',
    icon: '🦸',
    category: 'legend',
    points: 250,
    rarity: 'legendary',
    requirements: { type: 'helpedUsers', value: 50 }
  },
  'hall-of-fame': {
    id: 'hall-of-fame',
    name: 'Hall of Fame',
    description: 'Top 10 on leaderboard',
    icon: '🌟',
    category: 'legend',
    points: 200,
    rarity: 'legendary',
    requirements: { type: 'leaderboardRank', value: 10 }
  }
}

// Achievement categories with display info
export const ACHIEVEMENT_CATEGORIES = {
  explorer: {
    name: 'Explorer',
    description: 'Discover and explore the platform',
    color: '#3B82F6',
    icon: '🗺️'
  },
  communicator: {
    name: 'Communicator',
    description: 'Master the art of communication',
    color: '#8B5CF6',
    icon: '💬'
  },
  master: {
    name: 'Master',
    description: 'Achieve mastery with agents',
    color: '#D97706',
    icon: '🎖️'
  },
  legend: {
    name: 'Legend',
    description: 'Become a legend on the platform',
    color: '#DC2626',
    icon: '👑'
  }
}

// Rarity levels
export const RARITY_LEVELS = {
  common: { color: '#9CA3AF', multiplier: 1 },
  uncommon: { color: '#10B981', multiplier: 1.5 },
  rare: { color: '#3B82F6', multiplier: 2 },
  epic: { color: '#8B5CF6', multiplier: 2.5 },
  legendary: { color: '#F59E0B', multiplier: 3 }
}

/**
 * Check if user meets achievement requirements
 */
export function checkAchievementRequirement(
  achievement: Achievement,
  userStats: Record<string, any>
): boolean {
  const { type, value, metric } = achievement.requirements

  switch (type) {
    case 'agentUsage':
      return userStats.totalMessages >= value
    case 'uniqueAgents':
      return userStats.uniqueAgentsUsed >= value
    case 'totalMessages':
      return userStats.totalMessages >= value
    case 'timeOfDay':
      return new Date().getHours() >= value || new Date().getHours() < 8
    case 'weeklyDays':
      return userStats.activeDaysThisWeek >= value
    case 'monthlyDays':
      return userStats.activeDaysThisMonth >= value
    case 'highScoreCount':
      return userStats.highScoresCount >= value
    case 'perfectScore':
      return userStats.perfectScoreCount >= value
    case 'fastResponses':
      return userStats.fastResponsesCount >= value
    case 'firstMessage':
      return userStats.totalMessages >= value
    case 'conversationTurns':
      return userStats.longestConversationTurns >= value
    case 'agentHighScore':
      return userStats[`${metric}_high_scores`] >= value
    case 'multiAgentUsage':
      return userStats.uniqueAgentsUsed >= value
    case 'balancedUsage':
      return userStats.balancedAgentUsage
    case 'averageScore':
      return userStats.averagePersonalityScore >= value
    case 'consistentHighScores':
      return userStats.highScoresCount >= value
    case 'noCharacterBreaks':
      return userStats.messagesWithoutBreaks >= value
    case 'agentSpecialization':
      return userStats[`agent_${metric}_uses`] >= value
    case 'multipleSpecializations':
      return userStats.masterAgentCount >= value
    case 'publicShares':
      return userStats.publicConversationShares >= value
    case 'legendaryStatus':
      return userStats.totalMessages >= value && userStats.averagePersonalityScore >= 85
    case 'totalAchievements':
      return userStats.unlockedAchievements >= value
    case 'streakDays':
      return userStats.currentStreak >= value
    case 'helpedUsers':
      return userStats.usersHelped >= value
    case 'leaderboardRank':
      return userStats.leaderboardRank <= value
    default:
      return false
  }
}

/**
 * Calculate total achievement points
 */
export function calculateAchievementPoints(achievements: Achievement[]): number {
  return achievements.reduce((total, achievement) => {
    const rarityMultiplier = RARITY_LEVELS[achievement.rarity].multiplier
    return total + achievement.points * rarityMultiplier
  }, 0)
}

/**
 * Get achievement progress percentage
 */
export function getAchievementProgress(
  achievement: Achievement,
  userStats: Record<string, any>
): number {
  const { type, value, metric } = achievement.requirements

  let current = 0
  switch (type) {
    case 'totalMessages':
    case 'conversationTurns':
    case 'publicShares':
      current = userStats[type === 'conversationTurns' ? 'longestConversationTurns' : 'totalMessages'] || 0
      break
    case 'uniqueAgents':
      current = userStats.uniqueAgentsUsed || 0
      break
    case 'agentSpecialization':
      current = userStats[`agent_${metric}_uses`] || 0
      break
    case 'averageScore':
      current = userStats.averagePersonalityScore || 0
      break
    case 'streakDays':
      current = userStats.currentStreak || 0
      break
  }

  return Math.min((current / value) * 100, 100)
}

/**
 * Sort achievements by category and rarity
 */
export function sortAchievements(achievements: Achievement[]): Achievement[] {
  const categoryOrder = { explorer: 0, communicator: 1, master: 2, legend: 3 }
  const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }

  return achievements.sort((a, b) => {
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category]
    }
    return rarityOrder[b.rarity] - rarityOrder[a.rarity]
  })
}
