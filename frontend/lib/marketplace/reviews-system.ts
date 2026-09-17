/**
 * RATINGS & REVIEWS SYSTEM - Community feedback and moderation
 */

import { ToolReview, ToolRatingStats } from './types'

export interface ReviewWithMetadata extends ToolReview {
  helpful: number
  unhelpful: number
  flagged: boolean
  responses: ReviewResponse[]
}

export interface ReviewResponse {
  id: string
  authorId: string
  authorName: string
  content: string
  createdAt: Date
}

export interface ReviewModeration {
  reviewId: string
  reason: 'spam' | 'offensive' | 'fake' | 'irrelevant' | 'other'
  reportedBy: string
  reportedAt: Date
  resolved: boolean
  moderationNotes?: string
}

/**
 * Review Manager - Handle tool reviews and ratings
 */
export class ReviewManager {
  private reviews: Map<string, ReviewWithMetadata> = new Map()
  private toolReviews: Map<string, string[]> = new Map() // toolId -> reviewIds
  private userReviews: Map<string, string[]> = new Map() // userId -> reviewIds
  private helpfulVotes: Map<string, Set<string>> = new Map() // reviewId -> userIds who voted helpful
  private unhelpfulVotes: Map<string, Set<string>> = new Map() // reviewId -> userIds who voted unhelpful
  private moderation: Map<string, ReviewModeration> = new Map() // reviewId -> moderation records
  private ratings: Map<string, ToolRatingStats> = new Map() // toolId -> rating stats

  /**
   * Create review
   */
  async createReview(review: ToolReview): Promise<{ success: boolean; reviewId?: string; error?: string }> {
    try {
      // Validate review
      if (review.rating < 1 || review.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' }
      }

      if (!review.title || review.title.trim() === '') {
        return { success: false, error: 'Title is required' }
      }

      if (!review.content || review.content.trim() === '') {
        return { success: false, error: 'Review content is required' }
      }

      // Check for duplicate review
      const userToolReviews = this.userReviews.get(review.userId) || []
      const existingReview = userToolReviews.find(rid => {
        const r = this.reviews.get(rid)
        return r && r.toolId === review.toolId
      })

      if (existingReview) {
        return { success: false, error: 'You have already reviewed this tool' }
      }

      // Create review with metadata
      const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const reviewWithMeta: ReviewWithMetadata = {
        ...review,
        id: reviewId,
        helpful: 0,
        unhelpful: 0,
        flagged: false,
        responses: []
      }

      // Store review
      this.reviews.set(reviewId, reviewWithMeta)

      // Index by tool
      if (!this.toolReviews.has(review.toolId)) {
        this.toolReviews.set(review.toolId, [])
      }
      this.toolReviews.get(review.toolId)!.push(reviewId)

      // Index by user
      if (!this.userReviews.has(review.userId)) {
        this.userReviews.set(review.userId, [])
      }
      this.userReviews.get(review.userId)!.push(reviewId)

      // Update rating stats
      this.updateRatingStats(review.toolId)

      return { success: true, reviewId }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update review
   */
  updateReview(
    reviewId: string,
    updates: Partial<ToolReview>
  ): { success: boolean; error?: string } {
    try {
      const review = this.reviews.get(reviewId)
      if (!review) {
        return { success: false, error: 'Review not found' }
      }

      // Validate updates
      if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
        return { success: false, error: 'Rating must be between 1 and 5' }
      }

      Object.assign(review, updates)
      review.updatedAt = new Date()

      // Update rating stats
      this.updateRatingStats(review.toolId)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Delete review
   */
  deleteReview(reviewId: string): { success: boolean; error?: string } {
    try {
      const review = this.reviews.get(reviewId)
      if (!review) {
        return { success: false, error: 'Review not found' }
      }

      const toolId = review.toolId

      // Remove from tool index
      const toolReviews = this.toolReviews.get(toolId)
      if (toolReviews) {
        const index = toolReviews.indexOf(reviewId)
        if (index > -1) {
          toolReviews.splice(index, 1)
        }
      }

      // Remove from user index
      const userReviews = this.userReviews.get(review.userId)
      if (userReviews) {
        const index = userReviews.indexOf(reviewId)
        if (index > -1) {
          userReviews.splice(index, 1)
        }
      }

      // Clean up votes
      this.helpfulVotes.delete(reviewId)
      this.unhelpfulVotes.delete(reviewId)

      // Clean up moderation
      this.moderation.delete(reviewId)

      // Remove review
      this.reviews.delete(reviewId)

      // Update rating stats
      this.updateRatingStats(toolId)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Vote helpful
   */
  voteHelpful(reviewId: string, userId: string): { success: boolean; error?: string } {
    const review = this.reviews.get(reviewId)
    if (!review) {
      return { success: false, error: 'Review not found' }
    }

    // Check if user already voted
    if (this.helpfulVotes.get(reviewId)?.has(userId)) {
      return { success: false, error: 'You already voted helpful' }
    }

    // Remove from unhelpful if previously voted
    this.unhelpfulVotes.get(reviewId)?.delete(userId)

    // Add helpful vote
    if (!this.helpfulVotes.has(reviewId)) {
      this.helpfulVotes.set(reviewId, new Set())
    }
    this.helpfulVotes.get(reviewId)!.add(userId)

    // Update review counts
    review.helpful = this.helpfulVotes.get(reviewId)!.size
    review.unhelpful = this.unhelpfulVotes.get(reviewId)?.size || 0

    return { success: true }
  }

  /**
   * Vote unhelpful
   */
  voteUnhelpful(reviewId: string, userId: string): { success: boolean; error?: string } {
    const review = this.reviews.get(reviewId)
    if (!review) {
      return { success: false, error: 'Review not found' }
    }

    // Check if user already voted
    if (this.unhelpfulVotes.get(reviewId)?.has(userId)) {
      return { success: false, error: 'You already voted unhelpful' }
    }

    // Remove from helpful if previously voted
    this.helpfulVotes.get(reviewId)?.delete(userId)

    // Add unhelpful vote
    if (!this.unhelpfulVotes.has(reviewId)) {
      this.unhelpfulVotes.set(reviewId, new Set())
    }
    this.unhelpfulVotes.get(reviewId)!.add(userId)

    // Update review counts
    review.helpful = this.helpfulVotes.get(reviewId)?.size || 0
    review.unhelpful = this.unhelpfulVotes.get(reviewId)!.size

    return { success: true }
  }

  /**
   * Clear votes
   */
  clearVotes(reviewId: string, userId: string): { success: boolean; error?: string } {
    const review = this.reviews.get(reviewId)
    if (!review) {
      return { success: false, error: 'Review not found' }
    }

    const hadHelpful = this.helpfulVotes.get(reviewId)?.has(userId) || false
    const hadUnhelpful = this.unhelpfulVotes.get(reviewId)?.has(userId) || false

    if (!hadHelpful && !hadUnhelpful) {
      return { success: false, error: 'No vote to clear' }
    }

    this.helpfulVotes.get(reviewId)?.delete(userId)
    this.unhelpfulVotes.get(reviewId)?.delete(userId)

    // Update review counts
    review.helpful = this.helpfulVotes.get(reviewId)?.size || 0
    review.unhelpful = this.unhelpfulVotes.get(reviewId)?.size || 0

    return { success: true }
  }

  /**
   * Report review
   */
  reportReview(
    reviewId: string,
    reason: ReviewModeration['reason'],
    reportedBy: string
  ): { success: boolean; error?: string } {
    const review = this.reviews.get(reviewId)
    if (!review) {
      return { success: false, error: 'Review not found' }
    }

    const modRecord: ReviewModeration = {
      reviewId,
      reason,
      reportedBy,
      reportedAt: new Date(),
      resolved: false
    }

    this.moderation.set(`${reviewId}_${Date.now()}`, modRecord)
    review.flagged = true

    return { success: true }
  }

  /**
   * Add response to review
   */
  addResponse(
    reviewId: string,
    authorId: string,
    authorName: string,
    content: string
  ): { success: boolean; responseId?: string; error?: string } {
    const review = this.reviews.get(reviewId)
    if (!review) {
      return { success: false, error: 'Review not found' }
    }

    const response: ReviewResponse = {
      id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId,
      authorName,
      content,
      createdAt: new Date()
    }

    review.responses.push(response)

    return { success: true, responseId: response.id }
  }

  /**
   * Get tool reviews
   */
  getToolReviews(
    toolId: string,
    sortBy: 'helpful' | 'recent' | 'rating_high' | 'rating_low' = 'helpful',
    limit: number = 20,
    offset: number = 0
  ): {
    total: number
    reviews: ReviewWithMetadata[]
  } {
    const reviewIds = this.toolReviews.get(toolId) || []
    let reviews = reviewIds
      .map(rid => this.reviews.get(rid))
      .filter((r): r is ReviewWithMetadata => r !== undefined && !r.flagged)

    // Sort
    switch (sortBy) {
      case 'helpful':
        reviews.sort((a, b) => {
          const scoreA = a.helpful - a.unhelpful
          const scoreB = b.helpful - b.unhelpful
          return scoreB - scoreA
        })
        break
      case 'recent':
        reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        break
      case 'rating_high':
        reviews.sort((a, b) => b.rating - a.rating)
        break
      case 'rating_low':
        reviews.sort((a, b) => a.rating - b.rating)
        break
    }

    return {
      total: reviews.length,
      reviews: reviews.slice(offset, offset + limit)
    }
  }

  /**
   * Get user reviews
   */
  getUserReviews(userId: string, limit: number = 20, offset: number = 0): {
    total: number
    reviews: ReviewWithMetadata[]
  } {
    const reviewIds = this.userReviews.get(userId) || []
    const reviews = reviewIds
      .map(rid => this.reviews.get(rid))
      .filter((r): r is ReviewWithMetadata => r !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return {
      total: reviews.length,
      reviews: reviews.slice(offset, offset + limit)
    }
  }

  /**
   * Get rating statistics
   */
  getRatingStats(toolId: string): ToolRatingStats | null {
    return this.ratings.get(toolId) || null
  }

  /**
   * Get review
   */
  getReview(reviewId: string): ReviewWithMetadata | null {
    return this.reviews.get(reviewId) || null
  }

  /**
   * Get verified reviews count
   */
  getVerifiedReviewCount(toolId: string): number {
    const reviewIds = this.toolReviews.get(toolId) || []
    return reviewIds.filter(rid => {
      const review = this.reviews.get(rid)
      return review && review.verified
    }).length
  }

  /**
   * Get moderation reports
   */
  getModerationReports(resolved: boolean = false): ReviewModeration[] {
    return Array.from(this.moderation.values()).filter(
      mod => mod.resolved === resolved
    )
  }

  /**
   * Resolve moderation report
   */
  resolveModerationReport(
    reviewId: string,
    action: 'approve' | 'reject' | 'remove',
    moderatorNotes?: string
  ): { success: boolean; error?: string } {
    const reports = Array.from(this.moderation.values()).filter(
      r => r.reviewId === reviewId
    )

    if (reports.length === 0) {
      return { success: false, error: 'No reports found for this review' }
    }

    reports.forEach(report => {
      report.resolved = true
      report.moderationNotes = moderatorNotes
    })

    const review = this.reviews.get(reviewId)
    if (action === 'remove' && review) {
      this.deleteReview(reviewId)
    } else if (action === 'approve' && review) {
      review.flagged = false
    }

    return { success: true }
  }

  /**
   * Get flagged reviews
   */
  getFlaggedReviews(): ReviewWithMetadata[] {
    return Array.from(this.reviews.values()).filter(r => r.flagged)
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private updateRatingStats(toolId: string): void {
    const reviewIds = this.toolReviews.get(toolId) || []
    const reviews = reviewIds
      .map(rid => this.reviews.get(rid))
      .filter((r): r is ReviewWithMetadata => r !== undefined && !r.flagged)

    if (reviews.length === 0) {
      this.ratings.delete(toolId)
      return
    }

    // Calculate statistics
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
    const averageRating = totalRating / reviews.length

    // Distribution
    const distribution: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
    reviews.forEach(r => {
      distribution[r.rating.toString()]++
    })

    // Verified count
    const verifiedCount = reviews.filter(r => r.verified).length

    // Trend
    const recent = reviews.slice(-10) // Last 10 reviews
    const recentAvg = recent.reduce((sum, r) => sum + r.rating, 0) / recent.length
    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (recentAvg > averageRating + 0.5) trend = 'improving'
    else if (recentAvg < averageRating - 0.5) trend = 'declining'

    const stats: ToolRatingStats = {
      toolId,
      totalReviews: reviews.length,
      verifiedReviews: verifiedCount,
      averageRating,
      ratingDistribution: distribution as Record<'5' | '4' | '3' | '2' | '1', number>,
      recentTrend: trend,
      lastReviewDate: reviews[reviews.length - 1].createdAt
    }

    this.ratings.set(toolId, stats)
  }
}

export default {
  ReviewManager
}
