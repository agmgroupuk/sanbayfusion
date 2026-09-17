/**
 * REAL-TIME METRICS TRACKING SERVICE
 * Captures and tracks actual user interactions across the platform
 * No dummy data - all metrics based on real user actions
 */

export interface UserMetrics {
  userId: string
  username: string

  // Core metrics
  totalMessagesEarned: number
  perfectResponseCount: number // 100% accuracy/satisfaction
  highScoreCount: number // 80%+ quality responses

  // Agent tracking
  agentsUsed: Set<string> // Actual agents interacted with
  agentUsageCount: Record<string, number> // Messages per agent

  // Conversation metrics
  longestConversation: number // Messages in single session
  totalConversationLength: number
  conversationSessions: ConversationSession[]

  // Timing metrics
  usageByHour: Record<number, number> // Hour -> count
  usageByDay: Record<string, number> // Day string -> count
  firstUsageToday: Date | null
  lastActivityTime: Date

  // Challenge & streak tracking
  currentStreak: number
  longestStreak: number
  lastChallengeTime: Date | null
  completedChallengesCount: number

  // Performance
  averageResponseTime: number
  averageConversationLength: number

  // Timestamps
  accountCreatedAt: Date
  lastUpdated: Date
}

export interface ConversationSession {
  startTime: Date
  endTime?: Date
  agentId: string
  messageCount: number
  isOngoing: boolean
}

export interface MetricsEvent {
  type: 'message-sent' | 'perfect-response' | 'high-score' | 'agent-switch' | 'session-end' | 'streak-update'
  timestamp: Date
  userId: string
  data: Record<string, any>
}

// Event listeners for real-time tracking
type MetricsEventListener = (event: MetricsEvent) => void
const eventListeners: MetricsEventListener[] = []

/**
 * Subscribe to metrics events
 */
export function onMetricsEvent(callback: MetricsEventListener): () => void {
  eventListeners.push(callback)
  return () => {
    const index = eventListeners.indexOf(callback)
    if (index > -1) eventListeners.splice(index, 1)
  }
}

/**
 * Emit metrics event
 */
export function emitMetricsEvent(event: MetricsEvent): void {
  eventListeners.forEach(listener => {
    try {
      listener(event)
    } catch (error) {
      console.error('Error in metrics listener:', error)
    }
  })
}

// Import API client for database-backed storage
import { gamificationStorage } from '../gamificationAPI'

// LOCAL STORAGE KEY (deprecated - using API now)
const METRICS_STORAGE_KEY = 'userRealTimeMetrics'
const PENDING_EVENTS_KEY = 'pendingMetricsEvents'

/**
 * Initialize user metrics (called on login/first visit)
 */
export function initializeUserMetrics(userId: string, username: string): UserMetrics {
  return {
    userId,
    username,
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
    lastUpdated: new Date()
  }
}

/**
 * Load user metrics from API (database-backed)
 */
export async function loadUserMetrics(userId: string): Promise<UserMetrics | null> {
  try {
    // First try to get from API
    const metrics = await gamificationStorage.getMetrics()

    if (!metrics) return null

    // Reconstruct Sets
    if (Array.isArray(metrics.agentsUsed)) {
      metrics.agentsUsed = new Set(metrics.agentsUsed)
    }

    // Convert date strings back to Date objects
    metrics.firstUsageToday = metrics.firstUsageToday ? new Date(metrics.firstUsageToday) : null
    metrics.lastActivityTime = new Date(metrics.lastActivityTime)
    metrics.lastChallengeTime = metrics.lastChallengeTime ? new Date(metrics.lastChallengeTime) : null
    metrics.accountCreatedAt = new Date(metrics.accountCreatedAt)
    metrics.lastUpdated = new Date(metrics.lastUpdated)

    metrics.conversationSessions = metrics.conversationSessions?.map((s: any) => ({
      ...s,
      startTime: new Date(s.startTime),
      endTime: s.endTime ? new Date(s.endTime) : undefined
    })) || []

    return metrics
  } catch (error) {
    console.error('Error loading user metrics from API:', error)
    return null
  }
}

/**
 * Save user metrics to API (database-backed)
 */
export async function saveUserMetrics(metrics: UserMetrics): Promise<void> {
  try {
    const serializable = {
      ...metrics,
      agentsUsed: Array.from(metrics.agentsUsed), // Convert Set to Array
      lastUpdated: new Date().toISOString()
    }

    // Save to API (database-backed)
    await gamificationStorage.setMetrics(serializable)
  } catch (error) {
    console.error('Error saving user metrics to API:', error)
  }
}

/**
 * REAL-TIME EVENT TRACKING
 * Track when user sends a message
 */
export async function trackMessageSent(
  userId: string,
  agentId: string,
  messageLength: number,
  metrics: UserMetrics
): Promise<UserMetrics> {
  const updated = { ...metrics }

  // Increment message count
  updated.totalMessagesEarned += 1

  // Track agent usage
  if (!updated.agentsUsed.has(agentId)) {
    updated.agentsUsed.add(agentId)
  }
  updated.agentUsageCount[agentId] = (updated.agentUsageCount[agentId] || 0) + 1

  // Update time tracking
  updated.lastActivityTime = new Date()

  const now = new Date()
  if (!updated.firstUsageToday) {
    updated.firstUsageToday = now
  }

  // Track by hour
  const hour = now.getHours()
  updated.usageByHour[hour] = (updated.usageByHour[hour] || 0) + 1

  // Track by day
  const day = now.toISOString().split('T')[0]
  updated.usageByDay[day] = (updated.usageByDay[day] || 0) + 1

  // Update total conversation length
  updated.totalConversationLength += 1

  // Emit event
  emitMetricsEvent({
    type: 'message-sent',
    timestamp: now,
    userId,
    data: { agentId, messageLength }
  })

  // Track event via API
  await gamificationStorage.trackEvent('message-sent', { agentId, messageLength })

  // Save immediately
  await saveUserMetrics(updated)

  return updated
}

/**
 * Track perfect response (100% satisfaction)
 */
export async function trackPerfectResponse(
  userId: string,
  agentId: string,
  responseTime: number,
  metrics: UserMetrics
): Promise<UserMetrics> {
  const updated = { ...metrics }

  updated.perfectResponseCount += 1

  // Perfect response is worth more XP (50 points)
  updated.totalMessagesEarned += 50

  // Update average response time
  if (updated.averageResponseTime === 0) {
    updated.averageResponseTime = responseTime
  } else {
    updated.averageResponseTime = (updated.averageResponseTime + responseTime) / 2
  }

  updated.lastActivityTime = new Date()

  emitMetricsEvent({
    type: 'perfect-response',
    timestamp: new Date(),
    userId,
    data: { agentId, responseTime }
  })

  // Track event via API
  await gamificationStorage.trackEvent('perfect-response', { agentId, responseTime })

  await saveUserMetrics(updated)
  return updated
}

/**
 * Track high score response (80%+)
 */
export function trackHighScore(
  userId: string,
  agentId: string,
  score: number,
  metrics: UserMetrics
): UserMetrics {
  const updated = { ...metrics }

  updated.highScoreCount += 1

  // High score worth 25 points
  updated.totalMessagesEarned += 25

  updated.lastActivityTime = new Date()

  emitMetricsEvent({
    type: 'high-score',
    timestamp: new Date(),
    userId,
    data: { agentId, score }
  })

  saveUserMetrics(updated)
  return updated
}

/**
 * Start conversation session
 */
export function startConversationSession(
  agentId: string,
  metrics: UserMetrics
): UserMetrics {
  const updated = { ...metrics }

  const session: ConversationSession = {
    startTime: new Date(),
    agentId,
    messageCount: 0,
    isOngoing: true
  }

  updated.conversationSessions.push(session)
  saveUserMetrics(updated)

  return updated
}

/**
 * End conversation session and track stats
 */
export function endConversationSession(
  userId: string,
  metrics: UserMetrics
): UserMetrics {
  const updated = { ...metrics }

  // Find the ongoing session
  const ongoingSession = updated.conversationSessions.find(s => s.isOngoing)

  if (ongoingSession) {
    ongoingSession.isOngoing = false
    ongoingSession.endTime = new Date()

    // Update longest conversation
    if (ongoingSession.messageCount > updated.longestConversation) {
      updated.longestConversation = ongoingSession.messageCount
    }

    // Update average
    const completedSessions = updated.conversationSessions.filter(s => !s.isOngoing)
    updated.averageConversationLength =
      completedSessions.reduce((sum, s) => sum + s.messageCount, 0) / completedSessions.length || 0

    emitMetricsEvent({
      type: 'session-end',
      timestamp: new Date(),
      userId,
      data: {
        duration: ongoingSession.endTime.getTime() - ongoingSession.startTime.getTime(),
        messageCount: ongoingSession.messageCount,
        agentId: ongoingSession.agentId
      }
    })

    saveUserMetrics(updated)
  }

  return updated
}

/**
 * Update streak - track daily usage
 */
export function updateStreak(userId: string, metrics: UserMetrics): UserMetrics {
  const updated = { ...metrics }

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Check if used today
  const usedToday = updated.usageByDay[today] && updated.usageByDay[today] > 0

  // Check if used yesterday
  const usedYesterday = updated.usageByDay[yesterday] && updated.usageByDay[yesterday] > 0

  if (usedToday) {
    if (usedYesterday || updated.currentStreak === 0) {
      // Streak continues or starts
      updated.currentStreak = (updated.currentStreak || 0) + 1
    } else {
      // Streak reset
      updated.currentStreak = 1
    }

    // Track longest streak
    if (updated.currentStreak > updated.longestStreak) {
      updated.longestStreak = updated.currentStreak
    }

    updated.lastUpdated = new Date()

    emitMetricsEvent({
      type: 'streak-update',
      timestamp: new Date(),
      userId,
      data: { currentStreak: updated.currentStreak, longestStreak: updated.longestStreak }
    })

    saveUserMetrics(updated)
  }

  return updated
}

/**
 * Track daily challenge completion
 */
export function trackChallengeCompletion(
  userId: string,
  challengeId: string,
  pointsEarned: number,
  metrics: UserMetrics
): UserMetrics {
  const updated = { ...metrics }

  updated.completedChallengesCount += 1
  updated.totalMessagesEarned += pointsEarned
  updated.lastChallengeTime = new Date()
  updated.lastActivityTime = new Date()

  emitMetricsEvent({
    type: 'session-end',
    timestamp: new Date(),
    userId,
    data: { challengeId, pointsEarned }
  })

  saveUserMetrics(updated)
  return updated
}

/**
 * Queue pending metrics events for backend sync (now using API directly)
 */
export async function queueMetricsForSync(userId: string, event: MetricsEvent): Promise<void> {
  try {
    // Try to send event directly to API first
    await gamificationStorage.trackEvent(event.type, event.data)
  } catch (error) {
    console.error('Error sending event to API:', error)
    // Events that fail to send are lost — the DB API is the only persistence layer
  }
}

/**
 * Get all pending metrics for sync (API-first approach)
 */
export async function getPendingMetrics(userId: string): Promise<MetricsEvent[]> {
  try {
    // Try to get from API first
    const syncData = await gamificationStorage.syncData()
    if (syncData?.success && syncData.data?.pendingEvents) {
      return syncData.data.pendingEvents
    }

    return []
  } catch (error) {
    console.error('Error getting pending metrics:', error)
    return []
  }
}

/**
 * Clear pending metrics after successful sync
 * NO localStorage — pending events are managed in-memory and via DB API only
 */
export function clearPendingMetrics(_userId: string): void {
  // No-op: pending events are no longer stored in localStorage.
  // The DB API handles clearing after successful sync.
}

/**
 * Get computed metrics from tracking data
 */
export function getComputedMetrics(metrics: UserMetrics): {
  totalPoints: number
  dailyActiveStreak: number
  agentMasteryLevel: Record<string, number>
  averageQuality: number
  totalActiveHours: number
} {
  // Compute total points from activities
  const totalPoints =
    metrics.totalMessagesEarned * 10 +
    metrics.perfectResponseCount * 50 +
    metrics.highScoreCount * 25 +
    metrics.completedChallengesCount * 100

  // Compute mastery per agent
  const agentMasteryLevel: Record<string, number> = {}
  metrics.agentsUsed.forEach(agentId => {
    const count = metrics.agentUsageCount[agentId] || 0
    agentMasteryLevel[agentId] = Math.min(Math.floor(count / 10), 5) // 0-5 levels
  })

  // Compute average quality
  const qualityResponses = metrics.perfectResponseCount + metrics.highScoreCount
  const averageQuality =
    metrics.totalMessagesEarned > 0
      ? Math.round((qualityResponses / metrics.totalMessagesEarned) * 100)
      : 0

  // Count active hours
  const activeHours = Object.keys(metrics.usageByHour).length

  return {
    totalPoints,
    dailyActiveStreak: metrics.currentStreak,
    agentMasteryLevel,
    averageQuality,
    totalActiveHours: activeHours
  }
}
