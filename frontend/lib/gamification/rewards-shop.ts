// Rewards & Points System - Shop, cosmetics, and transaction management
export type RewardType = 'cosmetic' | 'badge' | 'theme' | 'frame' | 'effect' | 'exclusive'
export type TransactionType = 'purchase' | 'earn' | 'refund' | 'bonus' | 'event'

export interface ShopItem {
  id: string
  name: string
  description: string
  type: RewardType
  price: number
  icon: string
  category: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  preview?: string
  owned: boolean
  limited: boolean
  expiresAt?: Date
}

export interface UserRewards {
  userId: string
  totalPoints: number
  availablePoints: number
  spentPoints: number
  inventory: ShopItem[]
  transactions: Transaction[]
  activeCosmetics: ActiveCosmetics
  stats: RewardStats
}

export interface ActiveCosmetics {
  profileFrame?: string
  profileTheme?: string
  nameEffect?: string
  achievements?: string[]
}

export interface Transaction {
  id: string
  timestamp: Date
  type: TransactionType
  amount: number
  description: string
  relatedItem?: string
  refundable: boolean
}

export interface RewardStats {
  totalEarned: number
  totalSpent: number
  itemsOwned: number
  refundsUsed: number
}

export interface EventBonus {
  eventId: string
  eventName: string
  multiplier: number
  activeUntil: Date
  description: string
}

// Cosmetic categories and items
export const COSMETIC_SHOP: Record<string, ShopItem[]> = {
  'profile-frames': [
    {
      id: 'frame-bronze',
      name: 'Bronze Frame',
      description: 'Classic bronze profile frame',
      type: 'frame',
      price: 500,
      icon: '🥉',
      category: 'profile-frames',
      rarity: 'common',
      owned: false,
      limited: false
    },
    {
      id: 'frame-silver',
      name: 'Silver Frame',
      description: 'Elegant silver profile frame',
      type: 'frame',
      price: 1000,
      icon: '🥈',
      category: 'profile-frames',
      rarity: 'uncommon',
      owned: false,
      limited: false
    },
    {
      id: 'frame-gold',
      name: 'Gold Frame',
      description: 'Shimmering gold profile frame',
      type: 'frame',
      price: 2500,
      icon: '🥇',
      category: 'profile-frames',
      rarity: 'rare',
      owned: false,
      limited: false
    },
    {
      id: 'frame-platinum',
      name: 'Platinum Frame',
      description: 'Premium platinum frame with shimmer',
      type: 'frame',
      price: 5000,
      icon: '💎',
      category: 'profile-frames',
      rarity: 'epic',
      owned: false,
      limited: false
    },
    {
      id: 'frame-diamond',
      name: 'Diamond Frame',
      description: 'Ultimate diamond frame with glow',
      type: 'frame',
      price: 10000,
      icon: '💠',
      category: 'profile-frames',
      rarity: 'legendary',
      owned: false,
      limited: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  ],
  'themes': [
    {
      id: 'theme-dark',
      name: 'Dark Mode Theme',
      description: 'Sleek dark theme for your profile',
      type: 'theme',
      price: 250,
      icon: '🌙',
      category: 'themes',
      rarity: 'common',
      owned: false,
      limited: false
    },
    {
      id: 'theme-neon',
      name: 'Neon Nights',
      description: 'Vibrant neon-colored theme',
      type: 'theme',
      price: 750,
      icon: '⚡',
      category: 'themes',
      rarity: 'uncommon',
      owned: false,
      limited: false
    },
    {
      id: 'theme-ocean',
      name: 'Ocean Waves',
      description: 'Calming blue ocean-themed profile',
      type: 'theme',
      price: 500,
      icon: '🌊',
      category: 'themes',
      rarity: 'common',
      owned: false,
      limited: false
    },
    {
      id: 'theme-forest',
      name: 'Forest Green',
      description: 'Natural forest-inspired theme',
      type: 'theme',
      price: 500,
      icon: '🌲',
      category: 'themes',
      rarity: 'common',
      owned: false,
      limited: false
    },
    {
      id: 'theme-sunset',
      name: 'Sunset Paradise',
      description: 'Warm sunset colors',
      type: 'theme',
      price: 1000,
      icon: '🌅',
      category: 'themes',
      rarity: 'rare',
      owned: false,
      limited: true,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'theme-galaxy',
      name: 'Galaxy Theme',
      description: 'Cosmic universe-themed profile',
      type: 'theme',
      price: 2000,
      icon: '🌌',
      category: 'themes',
      rarity: 'epic',
      owned: false,
      limited: false
    }
  ],
  'name-effects': [
    {
      id: 'effect-flame',
      name: 'Flame Effect',
      description: 'Your name glows with flames',
      type: 'effect',
      price: 1000,
      icon: '🔥',
      category: 'name-effects',
      rarity: 'uncommon',
      owned: false,
      limited: false
    },
    {
      id: 'effect-ice',
      name: 'Ice Effect',
      description: 'Icy cool name effect',
      type: 'effect',
      price: 1000,
      icon: '❄️',
      category: 'name-effects',
      rarity: 'uncommon',
      owned: false,
      limited: false
    },
    {
      id: 'effect-neon',
      name: 'Neon Glow',
      description: 'Electric neon glow effect',
      type: 'effect',
      price: 1500,
      icon: '⚡',
      category: 'name-effects',
      rarity: 'rare',
      owned: false,
      limited: false
    },
    {
      id: 'effect-rainbow',
      name: 'Rainbow Wave',
      description: 'Colorful rainbow wave effect',
      type: 'effect',
      price: 2000,
      icon: '🌈',
      category: 'name-effects',
      rarity: 'epic',
      owned: false,
      limited: false
    },
    {
      id: 'effect-cosmic',
      name: 'Cosmic Aura',
      description: 'Mystical cosmic aura',
      type: 'effect',
      price: 3000,
      icon: '✨',
      category: 'name-effects',
      rarity: 'legendary',
      owned: false,
      limited: true,
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
    }
  ],
  'exclusive-items': [
    {
      id: 'exclusive-vip',
      name: 'VIP Badge',
      description: 'Exclusive VIP member badge',
      type: 'exclusive',
      price: 5000,
      icon: '👑',
      category: 'exclusive-items',
      rarity: 'epic',
      owned: false,
      limited: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'exclusive-founder',
      name: 'Founder Badge',
      description: 'Limited founder member badge',
      type: 'exclusive',
      price: 10000,
      icon: '🏆',
      category: 'exclusive-items',
      rarity: 'legendary',
      owned: false,
      limited: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  ]
}

// Point earning sources
export const POINT_SOURCES = {
  message: 10,
  highScore80: 50,
  highScore90: 100,
  perfectScore: 200,
  challengeCompletion: 150,
  dailyStreak: 100,
  achievementUnlock: 200,
  leaderboardTop10: 500,
  leaderboardTop1: 1000,
  socialShare: 50,
  refShare: 25,
  communityHelp: 100,
  firstAgentUsage: 25,
  mastery100: 250
}

// Event bonuses (seasonal, limited time)
export const EVENT_BONUSES: EventBonus[] = [
  {
    eventId: 'summer-2024',
    eventName: 'Summer Celebration',
    multiplier: 1.5,
    activeUntil: new Date('2024-08-31'),
    description: '1.5x points all week!'
  },
  {
    eventId: 'holiday-2024',
    eventName: 'Holiday Special',
    multiplier: 2,
    activeUntil: new Date('2024-12-25'),
    description: '2x points during holidays!'
  }
]

/**
 * Calculate points earned from an action
 */
export function calculatePointsEarned(
  action: string,
  stats?: Record<string, any>,
  eventMultiplier: number = 1
): number {
  let basePoints = 0

  switch (action) {
    case 'message':
      basePoints = POINT_SOURCES.message
      break
    case 'highScore80':
      basePoints = POINT_SOURCES.highScore80
      break
    case 'highScore90':
      basePoints = POINT_SOURCES.highScore90
      break
    case 'perfectScore':
      basePoints = POINT_SOURCES.perfectScore
      break
    case 'challengeCompletion':
      basePoints = POINT_SOURCES.challengeCompletion
      break
    case 'dailyStreak':
      basePoints = POINT_SOURCES.dailyStreak * (stats?.streakDays || 1)
      break
    case 'achievementUnlock':
      basePoints = POINT_SOURCES.achievementUnlock
      break
    case 'leaderboardTop10':
      basePoints = POINT_SOURCES.leaderboardTop10
      break
    case 'leaderboardTop1':
      basePoints = POINT_SOURCES.leaderboardTop1
      break
  }

  return Math.floor(basePoints * eventMultiplier)
}

/**
 * Get all available shop items
 */
export function getAllShopItems(): ShopItem[] {
  return Object.values(COSMETIC_SHOP).flat()
}

/**
 * Get items by category
 */
export function getItemsByCategory(category: string): ShopItem[] {
  return COSMETIC_SHOP[category] || []
}

/**
 * Get affordable items for user
 */
export function getAffordableItems(items: ShopItem[], points: number): ShopItem[] {
  return items.filter(item => item.price <= points && !item.owned)
}

/**
 * Check if item is limited edition
 */
export function isItemAvailable(item: ShopItem): boolean {
  if (!item.limited) return true
  if (!item.expiresAt) return true
  return new Date() < item.expiresAt
}

/**
 * Get remaining time for limited item
 */
export function getLimitedItemTimeRemaining(item: ShopItem): string {
  if (!item.limited || !item.expiresAt) return 'Unlimited'

  const now = new Date()
  const diffMs = item.expiresAt.getTime() - now.getTime()

  if (diffMs <= 0) return 'Expired'

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

/**
 * Process a purchase
 */
export function processPurchase(
  item: ShopItem,
  currentPoints: number,
  inventory: ShopItem[]
): {
  success: boolean
  message: string
  newBalance: number
  updatedInventory: ShopItem[]
} {
  if (item.price > currentPoints) {
    return {
      success: false,
      message: `Not enough points. Need ${item.price - currentPoints} more!`,
      newBalance: currentPoints,
      updatedInventory: inventory
    }
  }

  if (!isItemAvailable(item)) {
    return {
      success: false,
      message: 'This item is no longer available',
      newBalance: currentPoints,
      updatedInventory: inventory
    }
  }

  if (inventory.find(i => i.id === item.id)) {
    return {
      success: false,
      message: 'You already own this item!',
      newBalance: currentPoints,
      updatedInventory: inventory
    }
  }

  const newBalance = currentPoints - item.price
  const purchasedItem = { ...item, owned: true }
  const updatedInventory = [...inventory, purchasedItem]

  return {
    success: true,
    message: `Successfully purchased ${item.name}!`,
    newBalance,
    updatedInventory
  }
}

/**
 * Process a refund
 */
export function processRefund(
  item: ShopItem,
  currentPoints: number,
  refund: number
): {
  success: boolean
  refundAmount: number
  newBalance: number
} {
  const refundAmount = Math.floor(item.price * (refund / 100))
  const newBalance = currentPoints + refundAmount

  return {
    success: true,
    refundAmount,
    newBalance
  }
}

/**
 * Create a transaction record
 */
export function createTransaction(
  type: TransactionType,
  amount: number,
  description: string,
  relatedItem?: string
): Transaction {
  return {
    id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    type,
    amount,
    description,
    relatedItem,
    refundable: type === 'purchase'
  }
}

/**
 * Get active event bonus
 */
export function getActiveEventBonus(): EventBonus | null {
  const now = new Date()
  return EVENT_BONUSES.find(event => now < event.activeUntil) || null
}

/**
 * Calculate total points with bonuses
 */
export function calculateTotalWithBonuses(
  basePoints: number,
  streakMultiplier: number = 1,
  eventMultiplier: number = 1
): number {
  return Math.floor(basePoints * streakMultiplier * eventMultiplier)
}

/**
 * Get reward tier name
 */
export function getRewardTierName(totalSpent: number): string {
  if (totalSpent < 1000) return 'Newcomer'
  if (totalSpent < 5000) return 'Collector'
  if (totalSpent < 10000) return 'Enthusiast'
  if (totalSpent < 25000) return 'Connoisseur'
  if (totalSpent < 50000) return 'Legend'
  return 'Mythic Spender'
}

/**
 * Get reward tier benefits
 */
export function getRewardTierBenefits(totalSpent: number): {
  tier: string
  discount: number
  monthlyBonus: number
  exclusiveItems: boolean
} {
  const tier = getRewardTierName(totalSpent)
  let discount = 0
  let monthlyBonus = 0
  let exclusiveItems = false

  if (totalSpent >= 1000) discount = 5
  if (totalSpent >= 5000) { discount = 10; monthlyBonus = 100 }
  if (totalSpent >= 10000) { discount = 15; monthlyBonus = 250; exclusiveItems = true }
  if (totalSpent >= 25000) { discount = 20; monthlyBonus = 500; exclusiveItems = true }
  if (totalSpent >= 50000) { discount = 25; monthlyBonus = 1000; exclusiveItems = true }

  return { tier, discount, monthlyBonus, exclusiveItems }
}

/**
 * Get purchase history summary
 */
export function getPurchaseHistorySummary(transactions: Transaction[]): {
  totalTransactions: number
  totalSpent: number
  totalRefunded: number
  netSpent: number
} {
  const purchases = transactions.filter(t => t.type === 'purchase')
  const refunds = transactions.filter(t => t.type === 'refund')

  const totalSpent = purchases.reduce((sum, t) => sum + t.amount, 0)
  const totalRefunded = refunds.reduce((sum, t) => sum + t.amount, 0)

  return {
    totalTransactions: transactions.length,
    totalSpent,
    totalRefunded,
    netSpent: totalSpent - totalRefunded
  }
}
