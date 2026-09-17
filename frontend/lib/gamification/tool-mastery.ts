// Tool Mastery System - 5-level progression with XP and skill unlocks
export type MasteryLevel = 'novice' | 'expert' | 'master' | 'legendary' | 'mythic'

export interface ToolMastery {
  toolId: string
  toolName: string
  currentLevel: MasteryLevel
  currentXP: number
  totalXP: number
  levelXP: number // XP in current level
  progress: number // 0-100%
  skillsUnlocked: string[]
  stats: {
    totalUsage: number
    averageScore: number
    perfectScores: number
    totalTime: number
  }
}

export interface MasteryLevel_Config {
  level: MasteryLevel
  requiredXP: number
  icon: string
  color: string
  title: string
  description: string
  rewards: MasteryReward[]
  unlocks: string[]
}

export interface MasteryReward {
  type: 'badge' | 'cosmetic' | 'points' | 'feature'
  value: string | number
  description: string
}

export interface UserMastery {
  userId: string
  masteredTools: ToolMastery[]
  totalMasteryPoints: number
  masteryRank: number
  averageMasteryLevel: number
}

// 5-level mastery progression
export const MASTERY_LEVELS: Record<MasteryLevel, MasteryLevel_Config> = {
  novice: {
    level: 'novice',
    requiredXP: 0,
    icon: '🌱',
    color: '#6EE7B7',
    title: 'Novice',
    description: 'Just starting your journey',
    rewards: [
      { type: 'badge', value: 'novice-badge', description: 'Novice Badge' }
    ],
    unlocks: ['basic-stats', 'usage-tracking']
  },
  expert: {
    level: 'expert',
    requiredXP: 1000,
    icon: '⭐',
    color: '#60A5FA',
    title: 'Expert',
    description: 'Developing real proficiency',
    rewards: [
      { type: 'badge', value: 'expert-badge', description: 'Expert Badge' },
      { type: 'points', value: 500, description: '500 Bonus Points' },
      { type: 'cosmetic', value: 'expert-frame', description: 'Expert Profile Frame' }
    ],
    unlocks: ['advanced-stats', 'strategy-tips', 'performance-metrics']
  },
  master: {
    level: 'master',
    requiredXP: 5000,
    icon: '🏆',
    color: '#FBBF24',
    title: 'Master',
    description: 'True mastery achieved',
    rewards: [
      { type: 'badge', value: 'master-badge', description: 'Master Badge' },
      { type: 'points', value: 1500, description: '1500 Bonus Points' },
      { type: 'cosmetic', value: 'master-frame', description: 'Master Profile Frame' },
      { type: 'feature', value: 'mastery-showcase', description: 'Featured on Leaderboard' }
    ],
    unlocks: ['expert-analysis', 'personalized-challenges', 'mastery-showcase']
  },
  legendary: {
    level: 'legendary',
    requiredXP: 15000,
    icon: '👑',
    color: '#F87171',
    title: 'Legendary',
    description: 'Legendary status unlocked',
    rewards: [
      { type: 'badge', value: 'legendary-badge', description: 'Legendary Badge' },
      { type: 'points', value: 3000, description: '3000 Bonus Points' },
      { type: 'cosmetic', value: 'legendary-frame', description: 'Legendary Profile Frame' },
      { type: 'cosmetic', value: 'legendary-glow', description: 'Legendary Glow Effect' },
      { type: 'feature', value: 'exclusive-challenges', description: 'Exclusive Challenges' }
    ],
    unlocks: ['elite-community', 'exclusive-events', 'coaching-mode']
  },
  mythic: {
    level: 'mythic',
    requiredXP: 50000,
    icon: '⚜️',
    color: '#A78BFA',
    title: 'Mythic',
    description: 'Ultimate mastery - Legendary status',
    rewards: [
      { type: 'badge', value: 'mythic-badge', description: 'Mythic Badge' },
      { type: 'points', value: 10000, description: '10000 Bonus Points' },
      { type: 'cosmetic', value: 'mythic-frame', description: 'Mythic Profile Frame' },
      { type: 'cosmetic', value: 'mythic-glow', description: 'Mythic Ultimate Glow' },
      { type: 'cosmetic', value: 'mythic-badge', description: 'Mythic Badge Animated' },
      { type: 'feature', value: 'mythic-status', description: 'Mythic Status Badge' },
      { type: 'feature', value: 'legendary-mentor', description: 'Can Mentor Other Users' }
    ],
    unlocks: ['all-features', 'legendary-mentor', 'exclusive-cosmetics', 'vip-support']
  }
}

// XP multipliers for different actions
export const XP_MULTIPLIERS = {
  messageStart: 10, // Base XP per message
  highScoreBonus: 25, // +25 XP for 80%+ score
  perfectScoreBonus: 50, // +50 XP for 100% score
  consistencyBonus: 15, // +15 XP for maintaining streak
  challengeCompletion: 100, // Bonus for completing daily challenges
  longerConversation: 5, // +5 XP per additional turn in conversation
  rareInteraction: 40 // Bonus for rare interactions
}

// All 18 agents with mastery info
export const AGENT_MASTERY_CONFIGS = [
  'ben-sega',
  'bishop-burger',
  'chef-biew',
  'chess-player',
  'comedy-king',
  'drama-queen',
  'einstein',
  'emma-emotional',
  'fitness-guru',
  'julie-girlfriend',
  'knight-logic',
  'lazy-pawn',
  'mrs-boss',
  'nid-gaming',
  'professor-astrology',
  'random',
  'rook-jokey',
  'tech-wizard'
]

/**
 * Calculate XP gained from a conversation
 */
export function calculateXPGain(stats: {
  messageLength: number
  personalityScore: number
  conversationLength: number
  isNewAgent: boolean
  completedChallenge?: boolean
}): number {
  let xp = XP_MULTIPLIERS.messageStart

  // Perfect score bonus
  if (stats.personalityScore === 100) {
    xp += XP_MULTIPLIERS.perfectScoreBonus
  } else if (stats.personalityScore >= 80) {
    // High score bonus
    xp += XP_MULTIPLIERS.highScoreBonus
  }

  // Longer conversation bonus
  if (stats.conversationLength > 5) {
    xp += Math.floor((stats.conversationLength - 5) * XP_MULTIPLIERS.longerConversation)
  }

  // Challenge completion bonus
  if (stats.completedChallenge) {
    xp += XP_MULTIPLIERS.challengeCompletion
  }

  return Math.floor(xp)
}

/**
 * Get mastery level from XP
 */
export function getMasteryLevelFromXP(totalXP: number): MasteryLevel {
  if (totalXP >= MASTERY_LEVELS.mythic.requiredXP) return 'mythic'
  if (totalXP >= MASTERY_LEVELS.legendary.requiredXP) return 'legendary'
  if (totalXP >= MASTERY_LEVELS.master.requiredXP) return 'master'
  if (totalXP >= MASTERY_LEVELS.expert.requiredXP) return 'expert'
  return 'novice'
}

/**
 * Calculate progress to next level
 */
export function getMasteryProgress(totalXP: number): {
  currentLevel: MasteryLevel
  nextLevel: MasteryLevel | null
  currentXP: number
  requiredXP: number
  progress: number
} {
  const currentLevel = getMasteryLevelFromXP(totalXP)
  const currentLevelXP = MASTERY_LEVELS[currentLevel].requiredXP
  const levels: MasteryLevel[] = ['novice', 'expert', 'master', 'legendary', 'mythic']
  const currentIndex = levels.indexOf(currentLevel)
  const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null
  const nextLevelXP = nextLevel ? MASTERY_LEVELS[nextLevel].requiredXP : totalXP + 1

  const levelProgress = totalXP - currentLevelXP
  const levelRequirement = nextLevelXP - currentLevelXP
  const progress = (levelProgress / levelRequirement) * 100

  return {
    currentLevel,
    nextLevel,
    currentXP: levelProgress,
    requiredXP: levelRequirement,
    progress: Math.min(progress, 100)
  }
}

/**
 * Get XP needed to reach next level
 */
export function getXPToNextLevel(totalXP: number): number {
  const { nextLevel, requiredXP } = getMasteryProgress(totalXP)
  if (!nextLevel) return 0
  return Math.max(0, requiredXP - totalXP)
}

/**
 * Get all unlocked skills at mastery level
 */
export function getUnlockedSkills(masteryLevel: MasteryLevel): string[] {
  const levels: MasteryLevel[] = ['novice', 'expert', 'master', 'legendary', 'mythic']
  const levelIndex = levels.indexOf(masteryLevel)

  let skills: string[] = []
  for (let i = 0; i <= levelIndex; i++) {
    skills = [...skills, ...MASTERY_LEVELS[levels[i]].unlocks]
  }

  return Array.from(new Set(skills)) // Remove duplicates
}

/**
 * Get rewards for reaching mastery level
 */
export function getRewardsForLevel(masteryLevel: MasteryLevel): MasteryReward[] {
  return MASTERY_LEVELS[masteryLevel].rewards
}

/**
 * Calculate total mastery score across all tools
 */
export function calculateTotalMasteryScore(tools: ToolMastery[]): number {
  const levels: MasteryLevel[] = ['novice', 'expert', 'master', 'legendary', 'mythic']
  const levelValues = { novice: 1, expert: 2, master: 3, legendary: 4, mythic: 5 }

  return tools.reduce((total, tool) => {
    const levelValue = levelValues[tool.currentLevel]
    const xpBonus = Math.floor(tool.totalXP / 1000)
    return total + (levelValue * 100) + xpBonus
  }, 0)
}

/**
 * Get mastery statistics
 */
export function getMasteryStats(tools: ToolMastery[]): {
  totalMasteredTools: number
  averageLevel: number
  highestLevel: MasteryLevel
  totalXP: number
  completion: number
} {
  const masteredTools = tools.filter(t => t.currentLevel !== 'novice')
  const totalXP = tools.reduce((sum, t) => sum + t.totalXP, 0)
  const levels: MasteryLevel[] = ['novice', 'expert', 'master', 'legendary', 'mythic']
  const levelValues = { novice: 1, expert: 2, master: 3, legendary: 4, mythic: 5 }

  const avgLevel = tools.length > 0
    ? tools.reduce((sum, t) => sum + levelValues[t.currentLevel], 0) / tools.length
    : 0

  const highestLevel = tools.reduce((highest, tool) => {
    const toolIndex = levels.indexOf(tool.currentLevel)
    const highestIndex = levels.indexOf(highest)
    return toolIndex > highestIndex ? tool.currentLevel : highest
  }, 'novice' as MasteryLevel)

  const completion = (tools.filter(t => levelValues[t.currentLevel] > 1).length / tools.length) * 100

  return {
    totalMasteredTools: masteredTools.length,
    averageLevel: Math.round(avgLevel * 100) / 100,
    highestLevel,
    totalXP,
    completion: Math.round(completion)
  }
}

/**
 * Get next mastery milestone
 */
export function getNextMilestone(currentXP: number): {
  milestone: string
  daysUntil: number
  xpRequired: number
} {
  const milestones = [
    { xp: 1000, name: 'Expert' },
    { xp: 5000, name: 'Master' },
    { xp: 15000, name: 'Legendary' },
    { xp: 50000, name: 'Mythic' }
  ]

  const nextMilestone = milestones.find(m => m.xp > currentXP)

  if (!nextMilestone) {
    return {
      milestone: '⚜️ You\'ve reached Mythic status!',
      daysUntil: 0,
      xpRequired: 0
    }
  }

  const xpRequired = nextMilestone.xp - currentXP
  // Estimate ~100 XP per day for average player
  const daysUntil = Math.ceil(xpRequired / 100)

  return {
    milestone: `🎯 ${nextMilestone.name} Status`,
    daysUntil,
    xpRequired
  }
}

/**
 * Get mastery comparison
 */
export function compareMastery(userTools: ToolMastery[], leaderboardAverage: number): {
  isAboveAverage: boolean
  difference: number
  rank: string
} {
  const userScore = calculateTotalMasteryScore(userTools)
  const isAboveAverage = userScore > leaderboardAverage
  const difference = Math.abs(userScore - leaderboardAverage)

  let rank = 'Average'
  if (isAboveAverage && difference > 500) rank = 'Above Average'
  if (isAboveAverage && difference > 1000) rank = 'Excellent'
  if (isAboveAverage && difference > 2000) rank = 'Outstanding'
  if (!isAboveAverage && difference > 500) rank = 'Needs Improvement'

  return { isAboveAverage, difference, rank }
}

/**
 * Get recommended tools for next mastery focus
 */
export function getRecommendedFocus(tools: ToolMastery[], limit: number = 3): ToolMastery[] {
  return tools
    .sort((a, b) => {
      // Prioritize tools with lowest mastery
      const aLevel = ['novice', 'expert', 'master', 'legendary', 'mythic'].indexOf(a.currentLevel)
      const bLevel = ['novice', 'expert', 'master', 'legendary', 'mythic'].indexOf(b.currentLevel)

      if (aLevel !== bLevel) return aLevel - bLevel
      // Secondary: least XP progress
      return a.progress - b.progress
    })
    .slice(0, limit)
}
