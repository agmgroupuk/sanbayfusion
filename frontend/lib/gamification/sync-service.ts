/**
 * GAMIFICATION SYNC SERVICE
 * Handles real-time synchronization between frontend and backend
 * Ensures all metrics are persisted and achievements update live
 */

import { UserMetrics } from './realtime-metrics'
import { gamificationStorage, gamificationAPI } from '../gamificationAPI'

export interface SyncConfig {
  syncInterval: number // ms between syncs (default 5 min)
  autoSync: boolean // Enable automatic periodic sync
  optimisticUpdates: boolean // Show updates immediately, sync later
  retryAttempts: number
  retryDelay: number // ms between retries
}

export interface SyncResult {
  success: boolean
  timestamp: Date
  synced: number // Number of events synced
  errors: string[]
  newAchievements: any[]
  updatedStats: Record<string, any>
}

const defaultConfig: SyncConfig = {
  syncInterval: 5 * 60 * 1000, // 5 minutes
  autoSync: true,
  optimisticUpdates: true,
  retryAttempts: 3,
  retryDelay: 1000
}

export class GamificationSyncService {
  private static config: SyncConfig = defaultConfig
  private static syncTimer: ReturnType<typeof setInterval> | null = null
  private static lastSyncTime: Map<string, Date> = new Map()
  private static pendingEvents: Map<string, any[]> = new Map()
  private static isSyncing: Map<string, boolean> = new Map()

  /**
   * Initialize sync service
   */
  static initialize(config: Partial<SyncConfig> = {}): void {
    this.config = { ...defaultConfig, ...config }

    if (this.config.autoSync) {
      this.startAutoSync()
    }

    console.log('[GamificationSync] Service initialized', this.config)
  }

  /**
   * Start automatic periodic sync
   */
  private static startAutoSync(): void {
    this.syncTimer = setInterval(() => {
      // Get all user IDs from localStorage
      const userIds = this.getAllTrackedUserIds()
      userIds.forEach(userId => {
        this.syncUser(userId)
      })
    }, this.config.syncInterval)

    console.log(`[GamificationSync] Auto-sync started (interval: ${this.config.syncInterval}ms)`)
  }

  /**
   * Stop automatic sync
   */
  static stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
      console.log('[GamificationSync] Auto-sync stopped')
    }
  }

  /**
   * Manually sync a user's data
   */
  static async syncUser(userId: string): Promise<SyncResult> {
    // Prevent concurrent syncs for same user
    if (this.isSyncing.get(userId)) {
      console.log(`[GamificationSync] Sync already in progress for user ${userId}`)
      return {
        success: false,
        timestamp: new Date(),
        synced: 0,
        errors: ['Sync already in progress'],
        newAchievements: [],
        updatedStats: {}
      }
    }

    this.isSyncing.set(userId, true)

    try {
      // Using session-based auth now, no need for localStorage token

      // Get pending events for this user (now from API)
      const pendingEventsResult = await gamificationAPI.syncData(userId)
      const pendingEvents = pendingEventsResult?.data?.pendingEvents || []

      if (pendingEvents.length === 0) {
        console.log(`[GamificationSync] No pending events for user ${userId}`)
        this.isSyncing.set(userId, false)
        return {
          success: true,
          timestamp: new Date(),
          synced: 0,
          errors: [],
          newAchievements: [],
          updatedStats: {}
        }
      }

      // Send all pending events
      const result = await this.sendEventsToBackend(userId, pendingEvents, authToken)

      if (result.success) {
        // Clear pending events on success
        this.clearPendingEvents(userId)
        this.lastSyncTime.set(userId, new Date())

        console.log(
          `[GamificationSync] Successfully synced ${result.synced} events for user ${userId}`
        )

        return result
      } else {
        // Keep events for retry
        console.warn(`[GamificationSync] Sync failed for user ${userId}`, result.errors)
        return result
      }
    } catch (error) {
      console.error(`[GamificationSync] Error syncing user ${userId}:`, error)
      return {
        success: false,
        timestamp: new Date(),
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        newAchievements: [],
        updatedStats: {}
      }
    } finally {
      this.isSyncing.set(userId, false)
    }
  }

  /**
   * Add event to pending queue
   */
  static queueEvent(userId: string, event: any): void {
    if (!this.pendingEvents.has(userId)) {
      this.pendingEvents.set(userId, [])
    }

    const events = this.pendingEvents.get(userId)!
    events.push({
      ...event,
      queuedAt: new Date()
    })

    // Keep max 1000 events per user
    if (events.length > 1000) {
      events.shift()
    }

    console.log(`[GamificationSync] Event queued for user ${userId}. Queue size: ${events.length}`)
  }

  /**
   * Get all pending events for a user
   */
  private static getPendingEvents(userId: string): any[] {
    return this.pendingEvents.get(userId) || []
  }

  /**
   * Clear pending events for a user
   */
  private static clearPendingEvents(userId: string): void {
    this.pendingEvents.delete(userId)
  }

  /**
   * Send events to backend with retry logic
   */
  private static async sendEventsToBackend(
    userId: string,
    events: any[],
    authToken: string,
    attempt: number = 1
  ): Promise<SyncResult> {
    try {
      const response = await fetch('/api/gamification/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'x-user-id': userId,
          'x-event-count': String(events.length)
        },
        body: JSON.stringify({
          events,
          batchSize: events.length,
          timestamp: new Date()
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please log in again')
        }

        // Retry on server errors
        if (response.status >= 500 && attempt < this.config.retryAttempts) {
          console.warn(
            `[GamificationSync] Server error (${response.status}), retrying attempt ${attempt + 1}/${this.config.retryAttempts}`
          )
          await this.delay(this.config.retryDelay * attempt)
          return this.sendEventsToBackend(userId, events, authToken, attempt + 1)
        }

        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()

      return {
        success: true,
        timestamp: new Date(),
        synced: events.length,
        errors: [],
        newAchievements: result.newAchievements || [],
        updatedStats: result.updatedStats || {}
      }
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        console.warn(
          `[GamificationSync] Error on attempt ${attempt}, retrying...`,
          error
        )
        await this.delay(this.config.retryDelay * attempt)
        return this.sendEventsToBackend(userId, events, authToken, attempt + 1)
      }

      throw error
    }
  }

  /**
   * Get sync status for a user
   */
  static getSyncStatus(userId: string): {
    lastSync: Date | null
    pendingCount: number
    isSyncing: boolean
    timeSinceLastSync: string
  } {
    const lastSync = this.lastSyncTime.get(userId) || null
    const pendingCount = this.getPendingEvents(userId).length
    const isSyncing = this.isSyncing.get(userId) || false

    let timeSinceLastSync = 'Never'
    if (lastSync) {
      const diff = Date.now() - lastSync.getTime()
      if (diff < 60000) {
        timeSinceLastSync = `${Math.round(diff / 1000)}s ago`
      } else if (diff < 3600000) {
        timeSinceLastSync = `${Math.round(diff / 60000)}m ago`
      } else {
        timeSinceLastSync = `${Math.round(diff / 3600000)}h ago`
      }
    }

    return {
      lastSync,
      pendingCount,
      isSyncing,
      timeSinceLastSync
    }
  }

  /**
   * Force immediate sync for urgent events
   */
  static async forceSyncUrgent(userId: string): Promise<SyncResult> {
    console.log(`[GamificationSync] Force sync urgent for user ${userId}`)
    return this.syncUser(userId)
  }

  /**
   * Get all tracked user IDs
   * NO localStorage — only in-memory pending events are tracked
   */
  private static getAllTrackedUserIds(): string[] {
    const userIds = new Set<string>()

    // Get from pending events (in-memory only)
    this.pendingEvents.forEach((_, userId) => userIds.add(userId))

    return Array.from(userIds)
  }

  /**
   * Pull latest data from backend
   */
  static async pullFromBackend(userId: string): Promise<any> {
    try {
      // Using session-based auth and new API structure
      const response = await fetch(`/api/gamification/sync/${userId}`, {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to pull from backend: ${response.status}`)
      }

      const data = await response.json()
      console.log(`[GamificationSync] Data pulled from backend for user ${userId}`)
      return data

    } catch (error) {
      console.error(`[GamificationSync] Error pulling from backend:`, error)
      throw error
    }
  }

  /**
   * Get sync statistics
   */
  static getStatistics(): {
    totalPendingEvents: number
    totalTrackedUsers: number
    activeSyncs: number
    lastSyncTimes: Record<string, string>
  } {
    const userIds = this.getAllTrackedUserIds()
    let totalPending = 0
    this.pendingEvents.forEach(events => {
      totalPending += events.length
    })

    let activeSyncs = 0
    this.isSyncing.forEach(isSyncing => {
      if (isSyncing) activeSyncs++
    })

    const lastSyncTimes: Record<string, string> = {}
    this.lastSyncTime.forEach((date, userId) => {
      const diff = Date.now() - date.getTime()
      lastSyncTimes[userId] = `${Math.round(diff / 1000)}s ago`
    })

    return {
      totalPendingEvents: totalPending,
      totalTrackedUsers: userIds.length,
      activeSyncs,
      lastSyncTimes
    }
  }

  /**
   * Reset all sync state (useful for testing)
   */
  static reset(): void {
    this.stopAutoSync()
    this.lastSyncTime.clear()
    this.pendingEvents.clear()
    this.isSyncing.clear()
    console.log('[GamificationSync] All sync state cleared')
  }

  /**
   * Helper: Delay for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * USAGE:
 *
 * // Initialize when app starts
 * GamificationSyncService.initialize({
 *   syncInterval: 5 * 60 * 1000, // 5 minutes
 *   autoSync: true,
 *   retryAttempts: 3
 * })
 *
 * // Queue events as they happen
 * GamificationSyncService.queueEvent(userId, {
 *   type: 'message-sent',
 *   agentId: '...',
 *   timestamp: new Date()
 * })
 *
 * // Force sync when needed
 * GamificationSyncService.forceSyncUrgent(userId)
 *
 * // Check status
 * const status = GamificationSyncService.getSyncStatus(userId)
 * console.log(`Pending: ${status.pendingCount}, Syncing: ${status.isSyncing}`)
 */
