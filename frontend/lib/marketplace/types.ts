/**
 * API MARKETPLACE - Core Data Models & Types
 * Defines the structure for tools, plugins, reviews, and monetization
 */

// ============================================================================
// TOOL & PLUGIN CORE TYPES
// ============================================================================

export interface ToolVersion {
  versionId: string
  version: string // semver format (1.0.0)
  releaseDate: Date
  description: string
  changelog: string
  isStable: boolean
  downloads: number
  rating: number // Average rating for this version
}

export interface ToolMetadata {
  id: string
  name: string
  slug: string // URL-friendly name
  description: string
  longDescription?: string
  category: 'data-processing' | 'integration' | 'analytics' | 'automation' | 'utility' | 'ai' | 'custom'
  tags: string[]
  icon: string // URL or emoji
  banner?: string // URL
  
  // Versioning
  currentVersion: string
  allVersions: ToolVersion[]
  
  // Metadata
  author: {
    id: string
    name: string
    avatar: string
    verified: boolean
  }
  
  homepage?: string
  documentation?: string
  repository?: string
  
  createdAt: Date
  updatedAt: Date
  
  // Discovery
  downloads: number
  stars: number
  uses: number // How many times installed
}

export interface ToolDefinition {
  id: string
  metadata: ToolMetadata
  
  // Tool Configuration
  config: {
    inputs: ToolInput[]
    outputs: ToolOutput[]
    settings?: ToolSetting[]
    requirements?: string[]
  }
  
  // Plugin System
  hooks: ToolHook[]
  dependencies: ToolDependency[]
  
  // Code
  codeUrl: string // Where the tool code lives
  mainFunction: string // Entry point function name
  
  // Status
  published: boolean
  verified: boolean // Marketplace verified
  featured: boolean
  
  // Permissions & Security
  requiredPermissions: string[]
  sandboxed: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

export interface ToolInput {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file' | 'multiselect'
  description: string
  required: boolean
  defaultValue?: any
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    min?: number
    max?: number
  }
  options?: Array<{ label: string; value: string }>
}

export interface ToolOutput {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file'
  description: string
}

export interface ToolSetting {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'select'
  description: string
  defaultValue: any
  options?: Array<{ label: string; value: string }>
}

export interface ToolHook {
  name: string
  event: 'on:execute' | 'on:success' | 'on:error' | 'on:init' | 'on:destroy'
  handler: string // Function name
}

export interface ToolDependency {
  toolId: string
  version: string
  optional: boolean
}

// ============================================================================
// PLUGIN SYSTEM TYPES
// ============================================================================

export interface Plugin {
  id: string
  name: string
  version: string
  
  // Plugin Info
  description: string
  author: string
  homepage?: string
  
  // Loading & Execution
  mainFile: string
  enabled: boolean
  loadOrder: number
  
  // Hooks & Filters
  hooks: Record<string, string[]> // Hook name -> handler functions
  filters: Record<string, string[]> // Filter name -> handler functions
  
  // Capabilities
  capabilities: string[]
  
  // Configuration
  config: Record<string, any>
  
  // Permissions
  permissions: string[]
}

export interface PluginHookPayload {
  hookName: string
  data: Record<string, any>
  context: ExecutionContext
}

export interface ExecutionContext {
  userId: string
  toolId: string
  sessionId: string
  timestamp: Date
  metadata: Record<string, any>
}

// ============================================================================
// REVIEW & RATING TYPES
// ============================================================================

export interface ToolReview {
  id: string
  toolId: string
  userId: string
  
  // Review Content
  title: string
  content: string
  rating: number // 1-5 stars
  
  // Review Details
  verified: boolean // User actually used the tool
  usedForMonths: number
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  
  // Engagement
  helpfulCount: number
  unhelpfulCount: number
  
  // Status
  approved: boolean
  flagged: boolean
  flagReason?: string
}

export interface ToolRatingStats {
  toolId: string
  totalReviews: number
  verifiedReviews: number
  averageRating: number
  
  // Distribution
  ratingDistribution: {
    '5': number
    '4': number
    '3': number
    '2': number
    '1': number
  }
  
  // Trends
  recentTrend: 'improving' | 'stable' | 'declining'
  lastReviewDate: Date
}

// ============================================================================
// MONETIZATION TYPES
// ============================================================================

export interface ToolPricing {
  toolId: string
  pricingModel: 'free' | 'freemium' | 'paid' | 'subscription'
  
  // Pricing Tiers
  tiers: PricingTier[]
  
  // Subscription
  subscriptionPlans?: SubscriptionPlan[]
  
  // Revenue
  currency: string
  basePrice?: number
  
  // Trial
  trialDays: number
  trialFeatures?: string[]
}

export interface PricingTier {
  id: string
  name: string
  price: number
  currency: string
  
  // Features
  features: string[]
  maxInstalls?: number
  maxUsers?: number
  
  // Support
  support: 'community' | 'email' | 'priority'
  
  // Limits
  requestsPerDay?: number
  storageGB?: number
}

export interface SubscriptionPlan {
  id: string
  name: string
  interval: 'month' | 'year'
  price: number
  currency: string
  
  // Details
  features: string[]
  renewsAt?: Date
  cancellableAnytime: boolean
}

export interface MarketplaceTransaction {
  id: string
  toolId: string
  buyerId: string
  sellerId: string
  
  // Transaction Details
  type: 'purchase' | 'subscription' | 'refund'
  amount: number
  currency: string
  
  // Payment Processing
  paymentMethodId: string
  stripeTransactionId?: string
  
  // Dates
  createdAt: Date
  completedAt?: Date
  expiresAt?: Date
  
  // Status
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  
  // Breakdown
  toolPrice: number
  marketplaceFee: number // 30% default
  developerEarnings: number
}

export interface DeveloperEarnings {
  developerId: string
  totalEarnings: number
  pendingEarnings: number
  totalTransactions: number
  
  // Monthly breakdown
  monthlyEarnings: Record<string, number> // "2025-10": 1234.50
  
  // Breakdown by tool
  toolEarnings: Record<string, number> // toolId: earnings
  
  // Payout info
  payoutMethod: 'stripe' | 'paypal' | 'wire'
  payoutSchedule: 'monthly' | 'weekly'
  lastPayoutDate?: Date
}

// ============================================================================
// MARKETPLACE LISTING TYPES
// ============================================================================

export interface MarketplaceListing {
  id: string
  toolId: string
  status: 'draft' | 'published' | 'featured' | 'archived' | 'rejected'
  
  // Marketing
  title: string
  description: string
  shortDescription: string
  
  // Discovery
  category: string
  tags: string[]
  searchKeywords: string[]
  
  // Media
  screenshots: string[] // URLs
  videoUrl?: string
  
  // Stats
  views: number
  installs: number
  rating: number
  
  // Dates
  publishedAt?: Date
  archivedAt?: Date
  
  // Review Status
  reviewStatus: 'pending' | 'approved' | 'rejected'
  reviewNotes?: string
}

// ============================================================================
// TOOL BUILDER TYPES
// ============================================================================

export interface ToolBuilderProject {
  id: string
  userId: string
  name: string
  description: string
  
  // Tool Configuration
  toolDefinition: ToolDefinition
  
  // Development
  codeSnippets: ToolCodeSnippet[]
  testCases: ToolTestCase[]
  
  // Status
  status: 'draft' | 'testing' | 'ready' | 'published'
  
  // Dates
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface ToolCodeSnippet {
  id: string
  language: string
  code: string
  description?: string
}

export interface ToolTestCase {
  id: string
  name: string
  inputs: Record<string, any>
  expectedOutputs: Record<string, any>
  passed?: boolean
  error?: string
}

// ============================================================================
// USER & INSTALLATION TYPES
// ============================================================================

export interface ToolInstallation {
  id: string
  toolId: string
  userId: string
  
  // Installation Info
  installedAt: Date
  lastUsedAt?: Date
  uninstalledAt?: Date
  
  // Status
  active: boolean
  version: string
  
  // Configuration
  config: Record<string, any>
  
  // Usage
  usageCount: number
  executionTime: number // Total ms
}

export interface UserMarketplaceProfile {
  userId: string
  
  // Profile
  displayName: string
  avatar: string
  bio?: string
  website?: string
  
  // Developer Info
  isDeveloper: boolean
  developedTools: string[] // Tool IDs
  publishedTools: number
  totalDownloads: number
  totalEarnings: number
  
  // User Stats
  installedTools: string[] // Tool IDs
  savedTools: string[]
  reviews: ToolReview[]
  
  // Badges
  badges: string[] // 'top-developer', 'verified', etc
  reputationScore: number
}

// ============================================================================
// SEARCH & DISCOVERY TYPES
// ============================================================================

export interface MarketplaceSearch {
  query: string
  category?: string
  tags?: string[]
  minRating?: number
  sortBy: 'relevance' | 'downloads' | 'rating' | 'newest' | 'trending'
  filters: {
    verified?: boolean
    hasTrial?: boolean
    maxPrice?: number
    minRating?: number
  }
  page: number
  pageSize: number
}

export interface SearchResult {
  tools: ToolMetadata[]
  total: number
  page: number
  pages: number
  facets: {
    categories: Record<string, number>
    tags: Record<string, number>
    prices: { free: number; paid: number }
  }
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface MarketplaceNotification {
  id: string
  userId: string
  type: 'tool-update' | 'new-review' | 'payout' | 'listing-approved' | 'listing-rejected'
  
  title: string
  message: string
  data: Record<string, any>
  
  read: boolean
  createdAt: Date
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface ToolAnalytics {
  toolId: string
  date: Date
  
  // Traffic
  views: number
  clicks: number
  
  // Installations
  installs: number
  uninstalls: number
  
  // Usage
  activeUsers: number
  executionCount: number
  averageExecutionTime: number
  
  // Revenue
  revenue: number
  transactions: number
}

export interface DeveloperDashboard {
  totalTools: number
  totalDownloads: number
  totalReviews: number
  averageRating: number
  
  // Revenue
  totalEarnings: number
  thisMonthEarnings: number
  
  // Trends
  weeklyInstalls: number[]
  weeklyRevenue: number[]
  
  // Top Tools
  topTools: Array<{
    toolId: string
    downloads: number
    revenue: number
    rating: number
  }>
}
