/**
 * REAL-TIME ACHIEVEMENT VALIDATION SERVICE
 * Validates achievements against actual user metrics (not placeholders)
 * Integrates with realtime-metrics to use real data
 */

import { Achievement } from './achievement-system'
import { UserMetrics, getComputedMetrics } from './realtime-metrics'

export interface AchievementCheckResult {
  id: string
  unlocked: boolean
  progress: number // 0-100
  requirement: string
  currentValue: number
  targetValue: number
}

/**
 * CHECK REAL METRICS AGAINST ACHIEVEMENT REQUIREMENTS
 * Each achievement validator uses actual metrics data
 */

/**
 * Explorer Category Achievements
 */
export function validateExplorerAchievements(metrics: UserMetrics): AchievementCheckResult[] {
  const results: AchievementCheckResult[] = []
  const computed = getComputedMetrics(metrics)

  // First Agent
  results.push({
    id: 'first-agent',
    unlocked: metrics.totalMessagesEarned > 0,
    progress: metrics.totalMessagesEarned > 0 ? 100 : 0,
    requirement: 'Send your first message',
    currentValue: metrics.totalMessagesEarned,
    targetValue: 1
  })

  // Agent Collector (try all 18 agents)
  const agentsUsedCount = metrics.agentsUsed.size
  results.push({
    id: 'all-agents-tried',
    unlocked: agentsUsedCount >= 18,
    progress: (agentsUsedCount / 18) * 100,
    requirement: 'Try all 18 AI agents',
    currentValue: agentsUsedCount,
    targetValue: 18
  })

  // Conversationalist (100 messages)
  results.push({
    id: 'explore-100-messages',
    unlocked: metrics.totalMessagesEarned >= 100,
    progress: Math.min((metrics.totalMessagesEarned / 100) * 100, 100),
    requirement: 'Send 100 messages',
    currentValue: metrics.totalMessagesEarned,
    targetValue: 100
  })

  // Early Bird (use before 8 AM)
  const earlyMorningHours = Object.keys(metrics.usageByHour).filter(h => parseInt(h) < 8).length
  results.push({
    id: 'early-bird',
    unlocked: earlyMorningHours > 0,
    progress: earlyMorningHours > 0 ? 100 : 0,
    requirement: 'Use platform before 8 AM',
    currentValue: earlyMorningHours,
    targetValue: 1
  })

  // Night Owl (use after midnight)
  const nightHours = Object.keys(metrics.usageByHour).filter(h => parseInt(h) >= 0 && parseInt(h) < 6).length
  results.push({
    id: 'night-owl',
    unlocked: nightHours > 0,
    progress: nightHours > 0 ? 100 : 0,
    requirement: 'Use platform after midnight',
    currentValue: nightHours,
    targetValue: 1
  })

  // Weekly Warrior (use 7 days per week)
  const uniqueDays = Object.keys(metrics.usageByDay).length
  results.push({
    id: 'weekly-warrior',
    unlocked: uniqueDays >= 7,
    progress: Math.min((uniqueDays / 7) * 100, 100),
    requirement: 'Use platform 7 days in a week',
    currentValue: uniqueDays,
    targetValue: 7
  })

  // Month Marathon (daily for 30 days)
  results.push({
    id: 'month-marathon',
    unlocked: uniqueDays >= 30,
    progress: Math.min((uniqueDays / 30) * 100, 100),
    requirement: 'Use platform every day for a month',
    currentValue: uniqueDays,
    targetValue: 30
  })

  // Chatbot Companion (500 messages)
  results.push({
    id: 'chatbot-companion',
    unlocked: metrics.totalMessagesEarned >= 500,
    progress: Math.min((metrics.totalMessagesEarned / 500) * 100, 100),
    requirement: 'Send 500 messages',
    currentValue: metrics.totalMessagesEarned,
    targetValue: 500
  })

  // Conversation Master (1000 messages)
  results.push({
    id: 'conversation-master',
    unlocked: metrics.totalMessagesEarned >= 1000,
    progress: Math.min((metrics.totalMessagesEarned / 1000) * 100, 100),
    requirement: 'Send 1,000 messages',
    currentValue: metrics.totalMessagesEarned,
    targetValue: 1000
  })

  return results
}

/**
 * Communicator Category Achievements
 */
export function validateCommunicatorAchievements(metrics: UserMetrics): AchievementCheckResult[] {
  const results: AchievementCheckResult[] = []
  const computed = getComputedMetrics(metrics)

  // Quality Seeker (80%+ quality)
  results.push({
    id: 'quality-seeker',
    unlocked: computed.averageQuality >= 80,
    progress: Math.min(computed.averageQuality, 100),
    requirement: 'Maintain 80%+ response quality',
    currentValue: computed.averageQuality,
    targetValue: 80
  })

  // Perfectionist (10 perfect responses)
  results.push({
    id: 'perfectionist',
    unlocked: metrics.perfectResponseCount >= 10,
    progress: Math.min((metrics.perfectResponseCount / 10) * 100, 100),
    requirement: 'Get 10 perfect responses (100% quality)',
    currentValue: metrics.perfectResponseCount,
    targetValue: 10
  })

  // Excellence Badge (50 high scores)
  results.push({
    id: 'excellence-badge',
    unlocked: metrics.highScoreCount >= 50,
    progress: Math.min((metrics.highScoreCount / 50) * 100, 100),
    requirement: 'Achieve 50 high scores (80%+ quality)',
    currentValue: metrics.highScoreCount,
    targetValue: 50
  })

  // Response Master (100 quality responses)
  const totalQuality = metrics.perfectResponseCount + metrics.highScoreCount
  results.push({
    id: 'response-master',
    unlocked: totalQuality >= 100,
    progress: Math.min((totalQuality / 100) * 100, 100),
    requirement: 'Get 100 quality responses (80%+)',
    currentValue: totalQuality,
    targetValue: 100
  })

  // Streaker (3-day streak)
  results.push({
    id: 'streaker',
    unlocked: metrics.currentStreak >= 3,
    progress: Math.min((metrics.currentStreak / 3) * 100, 100),
    requirement: 'Maintain 3-day usage streak',
    currentValue: metrics.currentStreak,
    targetValue: 3
  })

  // Week Warrior (7-day streak)
  results.push({
    id: 'week-warrior',
    unlocked: metrics.currentStreak >= 7,
    progress: Math.min((metrics.currentStreak / 7) * 100, 100),
    requirement: 'Maintain 7-day usage streak',
    currentValue: metrics.currentStreak,
    targetValue: 7
  })

  // Marathon Runner (30-day streak)
  results.push({
    id: 'marathon-runner',
    unlocked: metrics.currentStreak >= 30,
    progress: Math.min((metrics.currentStreak / 30) * 100, 100),
    requirement: 'Maintain 30-day usage streak',
    currentValue: metrics.currentStreak,
    targetValue: 30
  })

  // Challenge Master (10 challenges completed)
  results.push({
    id: 'challenge-master',
    unlocked: metrics.completedChallengesCount >= 10,
    progress: Math.min((metrics.completedChallengesCount / 10) * 100, 100),
    requirement: 'Complete 10 daily challenges',
    currentValue: metrics.completedChallengesCount,
    targetValue: 10
  })

  // Long Talker (longest conversation 20+ messages)
  results.push({
    id: 'long-talker',
    unlocked: metrics.longestConversation >= 20,
    progress: Math.min((metrics.longestConversation / 20) * 100, 100),
    requirement: 'Maintain conversation with 20+ messages',
    currentValue: metrics.longestConversation,
    targetValue: 20
  })

  return results
}

/**
 * Master Category Achievements
 */
export function validateMasterAchievements(metrics: UserMetrics): AchievementCheckResult[] {
  const results: AchievementCheckResult[] = []
  const computed = getComputedMetrics(metrics)

  // Mastery Level 1 (100 total XP per agent)
  const masteryLevel1Count = Object.values(computed.agentMasteryLevel).filter(level => level >= 1).length
  results.push({
    id: 'mastery-level-1',
    unlocked: masteryLevel1Count >= 5,
    progress: Math.min((masteryLevel1Count / 5) * 100, 100),
    requirement: 'Reach Mastery Level 1 in 5 agents',
    currentValue: masteryLevel1Count,
    targetValue: 5
  })

  // Mastery Level 2 (200 total XP)
  const masteryLevel2Count = Object.values(computed.agentMasteryLevel).filter(level => level >= 2).length
  results.push({
    id: 'mastery-level-2',
    unlocked: masteryLevel2Count >= 10,
    progress: Math.min((masteryLevel2Count / 10) * 100, 100),
    requirement: 'Reach Mastery Level 2 in 10 agents',
    currentValue: masteryLevel2Count,
    targetValue: 10
  })

  // Specialist (max level in one agent)
  const maxLevelCount = Object.values(computed.agentMasteryLevel).filter(level => level >= 5).length
  results.push({
    id: 'specialist',
    unlocked: maxLevelCount >= 1,
    progress: maxLevelCount >= 1 ? 100 : Math.min((Math.max(...Object.values(computed.agentMasteryLevel)) / 5) * 100, 100),
    requirement: 'Reach maximum mastery in 1 agent',
    currentValue: maxLevelCount,
    targetValue: 1
  })

  // Polymath (max level in 3 agents)
  results.push({
    id: 'polymath',
    unlocked: maxLevelCount >= 3,
    progress: Math.min((maxLevelCount / 3) * 100, 100),
    requirement: 'Reach maximum mastery in 3 agents',
    currentValue: maxLevelCount,
    targetValue: 3
  })

  // Total XP milestone (1000 points)
  results.push({
    id: 'xp-milestone-1000',
    unlocked: computed.totalPoints >= 1000,
    progress: Math.min((computed.totalPoints / 1000) * 100, 100),
    requirement: 'Earn 1,000 total XP',
    currentValue: computed.totalPoints,
    targetValue: 1000
  })

  // Total XP milestone (5000 points)
  results.push({
    id: 'xp-milestone-5000',
    unlocked: computed.totalPoints >= 5000,
    progress: Math.min((computed.totalPoints / 5000) * 100, 100),
    requirement: 'Earn 5,000 total XP',
    currentValue: computed.totalPoints,
    targetValue: 5000
  })

  // Long Conversation (50+ messages in one session)
  results.push({
    id: 'conversation-length-50',
    unlocked: metrics.longestConversation >= 50,
    progress: Math.min((metrics.longestConversation / 50) * 100, 100),
    requirement: 'Maintain 50-message conversation',
    currentValue: metrics.longestConversation,
    targetValue: 50
  })

  // Speed Demon (100 messages in single day)
  const today = new Date().toISOString().split('T')[0]
  const todayMessages = metrics.usageByDay[today] || 0
  results.push({
    id: 'speed-demon',
    unlocked: todayMessages >= 100,
    progress: Math.min((todayMessages / 100) * 100, 100),
    requirement: 'Send 100 messages in a single day',
    currentValue: todayMessages,
    targetValue: 100
  })

  // All-Rounder (average 80%+ quality across 50+ messages)
  results.push({
    id: 'all-rounder',
    unlocked: computed.averageQuality >= 80 && metrics.totalMessagesEarned >= 50,
    progress: 
      metrics.totalMessagesEarned >= 50
        ? Math.min(computed.averageQuality, 100)
        : Math.min((metrics.totalMessagesEarned / 50) * 100, 100),
    requirement: 'Average 80%+ quality across 50+ messages',
    currentValue: computed.averageQuality,
    targetValue: 80
  })

  return results
}

/**
 * Legend Category Achievements (hardest)
 */
export function validateLegendAchievements(metrics: UserMetrics): AchievementCheckResult[] {
  const results: AchievementCheckResult[] = []
  const computed = getComputedMetrics(metrics)

  // Grand Master (100-day streak)
  results.push({
    id: 'grand-master',
    unlocked: metrics.longestStreak >= 100,
    progress: Math.min((metrics.longestStreak / 100) * 100, 100),
    requirement: 'Achieve 100-day usage streak',
    currentValue: metrics.longestStreak,
    targetValue: 100
  })

  // Sage (50,000 total XP)
  results.push({
    id: 'sage',
    unlocked: computed.totalPoints >= 50000,
    progress: Math.min((computed.totalPoints / 50000) * 100, 100),
    requirement: 'Earn 50,000 total XP',
    currentValue: computed.totalPoints,
    targetValue: 50000
  })

  // Perfect Record (10,000 consecutive messages at 95%+ quality)
  results.push({
    id: 'perfect-record',
    unlocked: computed.averageQuality >= 95 && metrics.totalMessagesEarned >= 10000,
    progress:
      metrics.totalMessagesEarned >= 10000
        ? Math.min(computed.averageQuality, 100)
        : Math.min((metrics.totalMessagesEarned / 10000) * 100, 100),
    requirement: 'Maintain 95%+ quality across 10,000+ messages',
    currentValue: computed.averageQuality,
    targetValue: 95
  })

  // Supreme Master (complete 1000 challenges)
  results.push({
    id: 'supreme-master',
    unlocked: metrics.completedChallengesCount >= 1000,
    progress: Math.min((metrics.completedChallengesCount / 1000) * 100, 100),
    requirement: 'Complete 1,000 daily challenges',
    currentValue: metrics.completedChallengesCount,
    targetValue: 1000
  })

  // Hall of Fame (rank #1 on leaderboard)
  // Note: This would be checked against actual leaderboard ranking
  results.push({
    id: 'hall-of-fame',
    unlocked: false, // Would be set true by backend after checking leaderboard
    progress: 0,
    requirement: 'Achieve #1 rank on global leaderboard',
    currentValue: 0,
    targetValue: 1
  })

  return results
}

/**
 * Validate ALL achievements at once
 */
export function validateAllAchievements(metrics: UserMetrics): AchievementCheckResult[] {
  return [
    ...validateExplorerAchievements(metrics),
    ...validateCommunicatorAchievements(metrics),
    ...validateMasterAchievements(metrics),
    ...validateLegendAchievements(metrics)
  ]
}

/**
 * Get newly unlocked achievements since last check
 */
export function getNewlyUnlockedAchievements(
  allResults: AchievementCheckResult[],
  previouslyUnlocked: Set<string>
): AchievementCheckResult[] {
  return allResults.filter(result => result.unlocked && !previouslyUnlocked.has(result.id))
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  allResults: AchievementCheckResult[],
  category: 'explorer' | 'communicator' | 'master' | 'legend'
): AchievementCheckResult[] {
  const categoryRanges = {
    explorer: { start: 0, end: 10 },
    communicator: { start: 10, end: 20 },
    master: { start: 20, end: 30 },
    legend: { start: 30, end: 35 }
  }

  const range = categoryRanges[category]
  return allResults.slice(range.start, range.end)
}

/**
 * Get achievement completion percentage (0-100)
 */
export function getOverallCompletionPercentage(allResults: AchievementCheckResult[]): number {
  if (allResults.length === 0) return 0

  const unlockedCount = allResults.filter(a => a.unlocked).length
  return Math.round((unlockedCount / allResults.length) * 100)
}
