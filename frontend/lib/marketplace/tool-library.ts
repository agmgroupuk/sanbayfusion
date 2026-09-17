/**
 * TOOL LIBRARY - Verified marketplace with search, discovery, and recommendations
 */

import { ToolMetadata, ToolDefinition, ToolVersion } from './types'

export interface LibraryTool {
  toolId: string
  metadata: ToolMetadata
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'flagged'
  verificationDate?: Date
  verifier?: string
  featured: boolean
  trendingScore: number // 0-100
  recommendationScore: number // Based on ratings and usage
  securityScore: number // 0-100
}

export interface SearchFilter {
  query?: string
  category?: string
  tags?: string[]
  minRating?: number
  maxRating?: number
  verified?: boolean
  featured?: boolean
  sortBy?: 'relevance' | 'rating' | 'downloads' | 'trending' | 'newest' | 'alphabetical'
  limit?: number
  offset?: number
}

export interface SearchResult {
  total: number
  results: LibraryTool[]
  suggestions?: string[]
}

export interface ToolStatistics {
  toolId: string
  downloads: number
  uses: number
  dailyDownloads: number
  weeklyDownloads: number
  monthlyDownloads: number
  averageRating: number
  reviewCount: number
  forks: number
}

export interface TrendingData {
  period: 'daily' | 'weekly' | 'monthly'
  timestamp: Date
  trendingTools: Array<{
    toolId: string
    score: number
    trend: 'rising' | 'stable' | 'falling'
  }>
}

/**
 * Tool Library Manager
 */
export class ToolLibrary {
  private tools: Map<string, LibraryTool> = new Map()
  private index: Map<string, Set<string>> = new Map() // Search index
  private statistics: Map<string, ToolStatistics> = new Map()
  private trendingCache: TrendingData | null = null
  private lastTrendingUpdate: Date = new Date(0)

  /**
   * Add tool to library
   */
  async addTool(tool: LibraryTool): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.tools.has(tool.toolId)) {
        return { success: false, error: 'Tool already exists in library' }
      }

      // Index the tool
      this.indexTool(tool)

      // Initialize statistics
      this.statistics.set(tool.toolId, {
        toolId: tool.toolId,
        downloads: 0,
        uses: 0,
        dailyDownloads: 0,
        weeklyDownloads: 0,
        monthlyDownloads: 0,
        averageRating: 0,
        reviewCount: 0,
        forks: 0
      })

      // Store tool
      this.tools.set(tool.toolId, tool)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Remove tool from library
   */
  removeTool(toolId: string): { success: boolean; error?: string } {
    try {
      const tool = this.tools.get(toolId)
      if (!tool) {
        return { success: false, error: 'Tool not found' }
      }

      // Remove from index
      this.deindexTool(tool)

      // Remove statistics
      this.statistics.delete(toolId)

      // Remove tool
      this.tools.delete(toolId)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update tool verification status
   */
  updateVerificationStatus(
    toolId: string,
    status: 'verified' | 'rejected' | 'flagged',
    verifier: string
  ): { success: boolean; error?: string } {
    const tool = this.tools.get(toolId)
    if (!tool) {
      return { success: false, error: 'Tool not found' }
    }

    tool.verificationStatus = status
    tool.verificationDate = new Date()
    tool.verifier = verifier

    // Recalculate security score based on status
    if (status === 'verified') {
      tool.securityScore = Math.min(100, tool.securityScore + 15)
    } else if (status === 'flagged') {
      tool.securityScore = Math.max(0, tool.securityScore - 30)
    }

    return { success: true }
  }

  /**
   * Feature/unfeature tool
   */
  setFeatured(toolId: string, featured: boolean): { success: boolean; error?: string } {
    const tool = this.tools.get(toolId)
    if (!tool) {
      return { success: false, error: 'Tool not found' }
    }

    tool.featured = featured

    return { success: true }
  }

  /**
   * Search tools
   */
  async search(filter: SearchFilter): Promise<SearchResult> {
    let results: LibraryTool[] = Array.from(this.tools.values())

    // Filter by query
    if (filter.query && filter.query.trim() !== '') {
      const query = filter.query.toLowerCase()
      results = results.filter(
        tool =>
          tool.metadata.name.toLowerCase().includes(query) ||
          tool.metadata.description.toLowerCase().includes(query) ||
          tool.metadata.tags.some(tag => tag.toLowerCase().includes(query)) ||
          tool.metadata.slug.includes(query)
      )
    }

    // Filter by category
    if (filter.category) {
      results = results.filter(tool => tool.metadata.category === filter.category)
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(tool =>
        filter.tags!.some(tag => tool.metadata.tags.includes(tag))
      )
    }

    // Filter by rating
    if (filter.minRating !== undefined) {
      results = results.filter(tool => this.calculateAverageRating(tool) >= filter.minRating!)
    }
    if (filter.maxRating !== undefined) {
      results = results.filter(tool => this.calculateAverageRating(tool) <= filter.maxRating!)
    }

    // Filter by verification
    if (filter.verified !== undefined) {
      results = results.filter(
        tool =>
          filter.verified! ? tool.verificationStatus === 'verified' : true
      )
    }

    // Filter by featured
    if (filter.featured !== undefined) {
      results = results.filter(tool => tool.featured === filter.featured)
    }

    // Sort
    const sortBy = filter.sortBy || 'relevance'
    switch (sortBy) {
      case 'rating':
        results.sort((a, b) => this.calculateAverageRating(b) - this.calculateAverageRating(a))
        break
      case 'downloads':
        results.sort((a, b) => b.metadata.downloads - a.metadata.downloads)
        break
      case 'trending':
        results.sort((a, b) => b.trendingScore - a.trendingScore)
        break
      case 'newest':
        results.sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime())
        break
      case 'alphabetical':
        results.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name))
        break
      case 'relevance':
      default:
        // Relevance sorting based on multiple factors
        results.sort((a, b) => {
          const scoreA = this.calculateRelevanceScore(a, filter.query || '')
          const scoreB = this.calculateRelevanceScore(b, filter.query || '')
          return scoreB - scoreA
        })
    }

    // Pagination
    const limit = filter.limit || 20
    const offset = filter.offset || 0
    const paginated = results.slice(offset, offset + limit)

    return {
      total: results.length,
      results: paginated,
      suggestions: this.generateSearchSuggestions(filter.query || '')
    }
  }

  /**
   * Get recommended tools
   */
  async getRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<LibraryTool[]> {
    // Get tools sorted by recommendation score
    const tools = Array.from(this.tools.values())
      .filter(t => t.verificationStatus === 'verified')
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit)

    return tools
  }

  /**
   * Get featured tools
   */
  getFeaturedTools(limit: number = 10): LibraryTool[] {
    return Array.from(this.tools.values())
      .filter(t => t.featured && t.verificationStatus === 'verified')
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit)
  }

  /**
   * Get trending tools
   */
  async getTrendingTools(
    period: 'daily' | 'weekly' | 'monthly' = 'weekly',
    limit: number = 10
  ): Promise<TrendingData> {
    // Check cache
    const now = new Date()
    const cacheAge = now.getTime() - this.lastTrendingUpdate.getTime()
    const cacheDuration = period === 'daily' ? 3600000 : period === 'weekly' ? 604800000 : 2592000000 // 1h, 7d, 30d

    if (this.trendingCache && cacheAge < cacheDuration) {
      return this.trendingCache
    }

    // Calculate trending
    const tools = Array.from(this.tools.values())
    const trending: Array<{ toolId: string; score: number; trend: 'rising' | 'stable' | 'falling' }> = []

    tools.forEach(tool => {
      const stats = this.statistics.get(tool.toolId)
      if (!stats) return

      // Calculate score based on recent downloads
      let recentDownloads = 0
      switch (period) {
        case 'daily':
          recentDownloads = stats.dailyDownloads
          break
        case 'weekly':
          recentDownloads = stats.weeklyDownloads
          break
        case 'monthly':
          recentDownloads = stats.monthlyDownloads
          break
      }

      const score = recentDownloads * 0.5 + tool.trendingScore * 0.3 + this.calculateAverageRating(tool) * 10

      // Determine trend
      let trend: 'rising' | 'stable' | 'falling' = 'stable'
      if (score > 75) trend = 'rising'
      else if (score < 25) trend = 'falling'

      trending.push({ toolId: tool.toolId, score, trend })
    })

    // Sort by score and limit
    trending.sort((a, b) => b.score - a.score)

    const result: TrendingData = {
      period,
      timestamp: now,
      trendingTools: trending.slice(0, limit)
    }

    // Update cache
    this.trendingCache = result
    this.lastTrendingUpdate = now

    return result
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(
    category: string,
    limit: number = 20,
    offset: number = 0
  ): { total: number; tools: LibraryTool[] } {
    const tools = Array.from(this.tools.values())
      .filter(t => t.metadata.category === category && t.verificationStatus === 'verified')
      .sort((a, b) => b.metadata.downloads - a.metadata.downloads)

    return {
      total: tools.length,
      tools: tools.slice(offset, offset + limit)
    }
  }

  /**
   * Update statistics
   */
  updateStatistics(
    toolId: string,
    updates: Partial<ToolStatistics>
  ): { success: boolean; error?: string } {
    const stats = this.statistics.get(toolId)
    if (!stats) {
      return { success: false, error: 'Statistics not found' }
    }

    Object.assign(stats, updates)

    // Update tool metadata
    const tool = this.tools.get(toolId)
    if (tool) {
      tool.metadata.downloads = stats.downloads
      tool.metadata.uses = stats.uses

      // Update recommendation score
      const baseScore =
        stats.downloads * 0.3 +
        stats.uses * 0.2 +
        stats.averageRating * 20 +
        stats.reviewCount * 0.5
      tool.recommendationScore = Math.min(100, baseScore)
    }

    return { success: true }
  }

  /**
   * Increment download count
   */
  incrementDownloads(toolId: string): { success: boolean; error?: string } {
    const stats = this.statistics.get(toolId)
    if (!stats) {
      return { success: false, error: 'Statistics not found' }
    }

    stats.downloads += 1
    stats.dailyDownloads += 1
    stats.weeklyDownloads += 1
    stats.monthlyDownloads += 1

    // Update trending
    const tool = this.tools.get(toolId)
    if (tool) {
      tool.trendingScore = Math.min(100, tool.trendingScore + 1)
    }

    return { success: true }
  }

  /**
   * Get tool statistics
   */
  getStatistics(toolId: string): ToolStatistics | null {
    return this.statistics.get(toolId) || null
  }

  /**
   * Get all categories
   */
  getCategories(): Array<{
    category: string
    count: number
    featured: number
  }> {
    const categories = new Map<string, { count: number; featured: number }>()

    this.tools.forEach(tool => {
      const cat = tool.metadata.category
      if (!categories.has(cat)) {
        categories.set(cat, { count: 0, featured: 0 })
      }

      const catData = categories.get(cat)!
      catData.count += 1
      if (tool.featured) catData.featured += 1
    })

    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      ...data
    }))
  }

  /**
   * Get all tags with usage count
   */
  getAllTags(): Array<{ tag: string; count: number }> {
    const tagCount = new Map<string, number>()

    this.tools.forEach(tool => {
      tool.metadata.tags.forEach(tag => {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
      })
    })

    return Array.from(tagCount.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): LibraryTool | null {
    return this.tools.get(toolId) || null
  }

  /**
   * Get tool by slug
   */
  getToolBySlug(slug: string): LibraryTool | null {
    const toolsArray = Array.from(this.tools.values())
    for (let i = 0; i < toolsArray.length; i++) {
      const tool = toolsArray[i]
      if (tool.metadata.slug === slug) {
        return tool
      }
    }
    return null
  }

  /**
   * Get all tools by author
   */
  getToolsByAuthor(
    authorId: string,
    limit: number = 20,
    offset: number = 0
  ): { total: number; tools: LibraryTool[] } {
    const tools = Array.from(this.tools.values())
      .filter(t => t.metadata.author.id === authorId)
      .sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime())

    return {
      total: tools.length,
      tools: tools.slice(offset, offset + limit)
    }
  }

  /**
   * Get verified tools count
   */
  getVerifiedCount(): number {
    return Array.from(this.tools.values()).filter(
      t => t.verificationStatus === 'verified'
    ).length
  }

  /**
   * Get pending verification count
   */
  getPendingCount(): number {
    return Array.from(this.tools.values()).filter(
      t => t.verificationStatus === 'pending'
    ).length
  }

  /**
   * Get flagged tools
   */
  getFlaggedTools(): LibraryTool[] {
    return Array.from(this.tools.values()).filter(
      t => t.verificationStatus === 'flagged'
    )
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private indexTool(tool: LibraryTool): void {
    // Index by category
    this.addToIndex(`category:${tool.metadata.category}`, tool.toolId)

    // Index by tags
    tool.metadata.tags.forEach(tag => {
      this.addToIndex(`tag:${tag.toLowerCase()}`, tool.toolId)
    })

    // Index by author
    this.addToIndex(`author:${tool.metadata.author.id}`, tool.toolId)
  }

  private deindexTool(tool: LibraryTool): void {
    // Remove from all index entries
    this.index.forEach(toolIds => {
      toolIds.delete(tool.toolId)
    })
  }

  private addToIndex(key: string, toolId: string): void {
    if (!this.index.has(key)) {
      this.index.set(key, new Set())
    }
    this.index.get(key)!.add(toolId)
  }

  private calculateRelevanceScore(tool: LibraryTool, query: string): number {
    if (!query) return 0

    const queryLower = query.toLowerCase()
    let score = 0

    // Name match (highest priority)
    if (tool.metadata.name.toLowerCase().includes(queryLower)) {
      score += 50
      if (tool.metadata.name.toLowerCase().startsWith(queryLower)) {
        score += 25
      }
    }

    // Description match
    if (tool.metadata.description.toLowerCase().includes(queryLower)) {
      score += 20
    }

    // Tag match
    if (tool.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
      score += 30
    }

    // Boost by popularity and stars
    score += tool.metadata.downloads / 100
    score += tool.metadata.stars * 5

    // Boost if verified
    if (tool.verificationStatus === 'verified') {
      score += 15
    }

    // Boost if featured
    if (tool.featured) {
      score += 20
    }

    return score
  }

  private generateSearchSuggestions(query: string): string[] {
    if (!query || query.length < 2) return []

    const queryLower = query.toLowerCase()
    const suggestions = new Set<string>()

    // Get suggestions from tool names and tags
    this.tools.forEach(tool => {
      if (tool.metadata.name.toLowerCase().startsWith(queryLower)) {
        suggestions.add(tool.metadata.name)
      }

      tool.metadata.tags.forEach(tag => {
        if (tag.toLowerCase().startsWith(queryLower)) {
          suggestions.add(tag)
        }
      })
    })

    return Array.from(suggestions).slice(0, 5)
  }

  private calculateAverageRating(tool: LibraryTool): number {
    if (tool.metadata.allVersions.length === 0) {
      return 0
    }

    const totalRating = tool.metadata.allVersions.reduce((sum, v) => sum + v.rating, 0)
    return totalRating / tool.metadata.allVersions.length
  }
}

export default {
  ToolLibrary
}
