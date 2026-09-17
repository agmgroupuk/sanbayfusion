/**
 * MONETIZATION SYSTEM - Simplified pricing and transaction manager
 */

import { ToolPricing, PricingTier, SubscriptionPlan, MarketplaceTransaction, DeveloperEarnings } from './types'

export const PLATFORM_FEE_PERCENT = 0.30
export const DEVELOPER_EARN_PERCENT = 0.70

/**
 * Transaction Manager - Handle marketplace transactions and revenue
 */
export class TransactionManager {
  private transactions: Map<string, MarketplaceTransaction> = new Map()
  private developerEarnings: Map<string, DeveloperEarnings> = new Map()

  /**
   * Create transaction
   */
  createTransaction(
    buyerId: string,
    sellerId: string,
    toolId: string,
    amount: number,
    currency: string,
    paymentMethodId: string
  ): { success: boolean; transaction?: MarketplaceTransaction; error?: string } {
    try {
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const marketplaceFee = amount * PLATFORM_FEE_PERCENT
      const developerEarnings = amount * DEVELOPER_EARN_PERCENT

      const transaction: MarketplaceTransaction = {
        id: transactionId,
        buyerId,
        sellerId,
        toolId,
        type: 'purchase',
        amount,
        currency,
        paymentMethodId,
        createdAt: new Date(),
        status: 'completed',
        toolPrice: amount,
        marketplaceFee,
        developerEarnings
      }

      this.transactions.set(transactionId, transaction)

      // Update developer earnings
      this.addDeveloperEarnings(sellerId, developerEarnings, toolId)

      return { success: true, transaction }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get transaction
   */
  getTransaction(transactionId: string): MarketplaceTransaction | null {
    return this.transactions.get(transactionId) || null
  }

  /**
   * Get transactions by seller
   */
  getSellerTransactions(sellerId: string, limit: number = 50, offset: number = 0): {
    total: number
    transactions: MarketplaceTransaction[]
  } {
    const sellerTransactions = Array.from(this.transactions.values())
      .filter(t => t.sellerId === sellerId && t.status === 'completed')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return {
      total: sellerTransactions.length,
      transactions: sellerTransactions.slice(offset, offset + limit)
    }
  }

  /**
   * Get tool revenue
   */
  getToolRevenue(toolId: string): {
    totalRevenue: number
    totalTransactions: number
    averageValue: number
  } {
    const toolTransactions = Array.from(this.transactions.values()).filter(
      t => t.toolId === toolId && t.status === 'completed'
    )

    const totalRevenue = toolTransactions.reduce((sum, t) => sum + t.amount, 0)

    return {
      totalRevenue,
      totalTransactions: toolTransactions.length,
      averageValue: toolTransactions.length > 0 ? totalRevenue / toolTransactions.length : 0
    }
  }

  /**
   * Get developer earnings
   */
  getDeveloperEarnings(developerId: string): DeveloperEarnings | null {
    return this.developerEarnings.get(developerId) || null
  }

  /**
   * Get all transactions
   */
  getAllTransactions(limit: number = 100, offset: number = 0): {
    total: number
    transactions: MarketplaceTransaction[]
  } {
    const allTransactions = Array.from(this.transactions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return {
      total: allTransactions.length,
      transactions: allTransactions.slice(offset, offset + limit)
    }
  }

  /**
   * Get marketplace statistics
   */
  getMarketplaceStats(): {
    totalRevenue: number
    totalTransactions: number
    totalDeveloperPayments: number
    activeDevelopers: number
  } {
    const allTransactions = Array.from(this.transactions.values()).filter(
      t => t.status === 'completed'
    )

    const totalRevenue = allTransactions.reduce((sum, t) => sum + t.amount, 0)
    const totalDeveloperPayments = allTransactions.reduce((sum, t) => sum + t.developerEarnings, 0)
    const uniqueSellers = new Set(allTransactions.map(t => t.sellerId))

    return {
      totalRevenue,
      totalTransactions: allTransactions.length,
      totalDeveloperPayments,
      activeDevelopers: uniqueSellers.size
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private addDeveloperEarnings(developerId: string, amount: number, toolId: string): void {
    let earnings = this.developerEarnings.get(developerId)

    if (!earnings) {
      earnings = {
        developerId,
        totalEarnings: amount,
        pendingEarnings: amount,
        totalTransactions: 1,
        monthlyEarnings: {},
        toolEarnings: {},
        payoutMethod: 'stripe',
        payoutSchedule: 'monthly'
      }
      this.developerEarnings.set(developerId, earnings)
    } else {
      earnings.totalEarnings += amount
      earnings.pendingEarnings += amount
      earnings.totalTransactions += 1
    }

    // Track by tool
    if (earnings) {
      const currentToolEarnings = earnings.toolEarnings[toolId] || 0
      earnings.toolEarnings[toolId] = currentToolEarnings + amount

      // Track by month
      const monthKey = new Date().toISOString().slice(0, 7) // YYYY-MM format
      const currentMonthEarnings = earnings.monthlyEarnings[monthKey] || 0
      earnings.monthlyEarnings[monthKey] = currentMonthEarnings + amount
    }
  }
}

export default {
  TransactionManager,
  PLATFORM_FEE_PERCENT,
  DEVELOPER_EARN_PERCENT
}
