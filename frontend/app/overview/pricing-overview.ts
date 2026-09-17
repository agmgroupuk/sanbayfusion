/**
 * Pricing Overview Logic - Subscription Module
 * Handles pricing plans display, comparison, and subscription management
 */

export interface PricingOverviewState {
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  success: boolean;
  plans: PricingPlan[];
  currentPlan: UserSubscription | null;
  billingCycle: 'monthly' | 'annually';
  currency: string;
  availableAddons: Addon[];
  promotions: Promotion[];
  usage: UsageMetrics;
  limits: PlanLimits;
  settings: PricingSettings;
}

export interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'free' | 'personal' | 'professional' | 'enterprise';
  tier: number;
  isPopular: boolean;
  isFeatured: boolean;
  pricing: PlanPricing;
  features: PlanFeature[];
  limits: PlanLimits;
  addons: string[];
  supportLevel: SupportLevel;
  sla?: ServiceLevelAgreement;
  customization: CustomizationOptions;
  metadata: PlanMetadata;
}

export interface PlanPricing {
  monthly: {
    amount: number;
    currency: string;
    originalAmount?: number; // For showing discounts
  };
  annually: {
    amount: number;
    currency: string;
    originalAmount?: number;
    discount?: number; // Percentage discount
  };
  setup?: {
    amount: number;
    currency: string;
  };
  perUser?: boolean;
  perAgent?: boolean;
  billingModel: 'subscription' | 'usage' | 'hybrid';
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  category:
    | 'ai'
    | 'storage'
    | 'collaboration'
    | 'security'
    | 'support'
    | 'integrations'
    | 'analytics';
  included: boolean | number | string; // true/false, number for limits, string for descriptions
  tooltip?: string;
  highlight?: boolean;
  comingSoon?: boolean;
  enterprise?: boolean;
}

export interface PlanLimits {
  aiAgents: number | 'unlimited';
  apiCalls: number | 'unlimited';
  storage: number | 'unlimited'; // GB
  users: number | 'unlimited';
  projects: number | 'unlimited';
  customModels: number | 'unlimited';
  dataRetention: number; // days
  concurrentSessions: number | 'unlimited';
  rateLimit: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
  };
  fileSize: number; // MB
  bandwidth: number | 'unlimited'; // GB/month
}

export interface SupportLevel {
  type: 'community' | 'email' | 'priority' | 'dedicated';
  responseTime: string;
  channels: string[];
  availability: string;
  includes: string[];
}

export interface ServiceLevelAgreement {
  uptime: number; // Percentage
  responseTime: string;
  penalties?: string[];
  credits?: boolean;
}

export interface CustomizationOptions {
  whiteLabel: boolean;
  customDomain: boolean;
  customBranding: boolean;
  apiAccess: 'basic' | 'advanced' | 'full';
  webhooks: boolean;
  ssoIntegration: boolean;
}

export interface PlanMetadata {
  targetAudience: string;
  useCases: string[];
  industry?: string[];
  teamSize?: string;
  complexity: 'basic' | 'intermediate' | 'advanced' | 'enterprise';
  onboarding: 'self-service' | 'assisted' | 'dedicated';
}

export interface UserSubscription {
  id: string;
  planId: string;
  planName: string;
  status:
    | 'active'
    | 'inactive'
    | 'cancelled'
    | 'expired'
    | 'trial'
    | 'suspended';
  billingCycle: 'monthly' | 'annually';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  addons: ActiveAddon[];
  usage: UsageMetrics;
  billing: BillingInfo;
  discounts: AppliedDiscount[];
}

export interface ActiveAddon {
  id: string;
  name: string;
  quantity: number;
  price: number;
  addedAt: string;
}

export interface UsageMetrics {
  period: {
    start: string;
    end: string;
  };
  aiAgents: {
    used: number;
    limit: number | 'unlimited';
    percentage: number;
  };
  apiCalls: {
    used: number;
    limit: number | 'unlimited';
    percentage: number;
  };
  storage: {
    used: number; // GB
    limit: number | 'unlimited';
    percentage: number;
  };
  users: {
    used: number;
    limit: number | 'unlimited';
    percentage: number;
  };
  bandwidth: {
    used: number; // GB
    limit: number | 'unlimited';
    percentage: number;
  };
  overages: UsageOverage[];
}

export interface UsageOverage {
  resource: string;
  amount: number;
  cost: number;
  currency: string;
  period: string;
}

export interface BillingInfo {
  nextBillingDate: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  billingAddress: BillingAddress;
  invoices: Invoice[];
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal' | 'crypto';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  taxId?: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'overdue' | 'void';
  downloadUrl?: string;
}

export interface AppliedDiscount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'trial';
  value: number;
  description: string;
  validUntil?: string;
  remainingUses?: number;
}

export interface Addon {
  id: string;
  name: string;
  description: string;
  category: 'storage' | 'users' | 'ai-agents' | 'api-calls' | 'features';
  pricing: AddonPricing;
  limits?: AddonLimits;
  compatibility: string[]; // Plan IDs
  popular?: boolean;
  metadata: AddonMetadata;
}

export interface AddonPricing {
  model: 'per-unit' | 'bulk' | 'tiered';
  basePrice: number;
  currency: string;
  billingCycle: 'monthly' | 'annually' | 'usage';
  tiers?: PricingTier[];
  minimumQuantity?: number;
  maximumQuantity?: number;
}

export interface PricingTier {
  from: number;
  to?: number;
  pricePerUnit: number;
}

export interface AddonLimits {
  minQuantity: number;
  maxQuantity?: number;
  stackable: boolean;
}

export interface AddonMetadata {
  description: string;
  benefits: string[];
  useCases: string[];
  setupRequired?: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  code?: string;
  description: string;
  type: 'discount' | 'trial' | 'bonus';
  value: number;
  conditions: PromotionConditions;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  targetPlans?: string[];
  maxRedemptions?: number;
  currentRedemptions: number;
}

export interface PromotionConditions {
  newCustomersOnly?: boolean;
  minimumCommitment?: number; // months
  applicablePlans?: string[];
  excludedPlans?: string[];
  requiresCode?: boolean;
  stackable?: boolean;
}

export interface PricingSettings {
  defaultCurrency: string;
  availableCurrencies: string[];
  taxIncluded: boolean;
  showPriceComparison: boolean;
  showUsageMetrics: boolean;
  requiresApproval: boolean;
  trialPeriod: number; // days
  gracePeriod: number; // days
  refundPolicy: string;
}

export interface PlanComparison {
  plans: string[];
  features: ComparisonFeature[];
  recommendation?: string;
}

export interface ComparisonFeature {
  category: string;
  features: {
    name: string;
    values: (boolean | number | string)[];
    highlight?: boolean;
  }[];
}

export interface SubscriptionQuote {
  planId: string;
  billingCycle: 'monthly' | 'annually';
  addons: QuoteAddon[];
  subtotal: number;
  discounts: QuoteDiscount[];
  taxes: QuoteTax[];
  total: number;
  currency: string;
  validUntil: string;
}

export interface QuoteAddon {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuoteDiscount {
  id: string;
  description: string;
  amount: number;
  type: 'percentage' | 'fixed';
}

export interface QuoteTax {
  name: string;
  rate: number;
  amount: number;
}

export class PricingOverviewLogic {
  private state: PricingOverviewState;

  constructor() {
    this.state = {
      isLoading: false,
      isProcessing: false,
      error: null,
      success: false,
      plans: [],
      currentPlan: null,
      billingCycle: 'monthly',
      currency: 'USD',
      availableAddons: [],
      promotions: [],
      usage: {
        period: {
          start: new Date().toISOString(),
          end: new Date().toISOString(),
        },
        aiAgents: { used: 0, limit: 0, percentage: 0 },
        apiCalls: { used: 0, limit: 0, percentage: 0 },
        storage: { used: 0, limit: 0, percentage: 0 },
        users: { used: 0, limit: 0, percentage: 0 },
        bandwidth: { used: 0, limit: 0, percentage: 0 },
        overages: [],
      },
      limits: {
        aiAgents: 0,
        apiCalls: 0,
        storage: 0,
        users: 0,
        projects: 0,
        customModels: 0,
        dataRetention: 30,
        concurrentSessions: 1,
        rateLimit: { requests: 100, period: 'hour' },
        fileSize: 100,
        bandwidth: 0,
      },
      settings: {
        defaultCurrency: 'USD',
        availableCurrencies: ['USD', 'EUR', 'GBP'],
        taxIncluded: false,
        showPriceComparison: true,
        showUsageMetrics: true,
        requiresApproval: false,
        trialPeriod: 14,
        gracePeriod: 3,
        refundPolicy: '30-day money-back guarantee',
      },
    };
  }

  /**
   * Initialize pricing overview
   */
  async initialize(userId?: string): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;

    try {
      const [plans, currentPlan, addons, promotions, usage, settings] =
        await Promise.all([
          this.fetchPricingPlans(),
          userId ? this.fetchCurrentSubscription(userId) : null,
          this.fetchAvailableAddons(),
          this.fetchActivePromotions(),
          userId ? this.fetchUsageMetrics(userId) : null,
          this.fetchPricingSettings(),
        ]);

      this.state.plans = plans;
      this.state.currentPlan = currentPlan;
      this.state.availableAddons = addons;
      this.state.promotions = promotions;

      if (usage) {
        this.state.usage = usage;
      }

      if (settings) {
        this.state.settings = { ...this.state.settings, ...settings };
        this.state.currency = settings.defaultCurrency || 'USD';
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load pricing information';
      this.state.error = message;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Switch billing cycle
   */
  setBillingCycle(cycle: 'monthly' | 'annually'): void {
    this.state.billingCycle = cycle;
    this.trackPricingEvent('billing_cycle_changed', { cycle });
  }

  /**
   * Change currency
   */
  async setCurrency(currency: string): Promise<void> {
    if (!this.state.settings.availableCurrencies.includes(currency)) {
      throw new Error('Currency not supported');
    }

    this.state.currency = currency;

    // Refetch plans with new currency
    try {
      this.state.plans = await this.fetchPricingPlans(currency);
      this.trackPricingEvent('currency_changed', { currency });
    } catch (error) {
      this.state.error = 'Failed to update pricing for selected currency';
    }
  }

  /**
   * Generate subscription quote
   */
  async generateQuote(
    planId: string,
    billingCycle: 'monthly' | 'annually',
    addons: { id: string; quantity: number }[] = [],
    promotionCode?: string
  ): Promise<SubscriptionQuote> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          addons,
          promotionCode,
          currency: this.state.currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate quote');
      }

      this.trackPricingEvent('quote_generated', {
        planId,
        billingCycle,
        addonsCount: addons.length,
        total: data.quote.total,
      });

      return data.quote;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate quote';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Start subscription
   */
  async startSubscription(
    planId: string,
    billingCycle: 'monthly' | 'annually',
    paymentMethodId: string,
    addons: { id: string; quantity: number }[] = [],
    promotionCode?: string
  ): Promise<UserSubscription> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          paymentMethodId,
          addons,
          promotionCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start subscription');
      }

      this.state.currentPlan = data.subscription;
      this.state.success = true;

      this.trackPricingEvent('subscription_started', {
        planId,
        billingCycle,
        amount: data.subscription.billing.amount,
      });

      return data.subscription;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start subscription';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Upgrade/downgrade plan
   */
  async changePlan(
    newPlanId: string,
    billingCycle?: 'monthly' | 'annually'
  ): Promise<UserSubscription> {
    if (!this.state.currentPlan) {
      throw new Error('No active subscription found');
    }

    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: this.state.currentPlan.id,
          newPlanId,
          billingCycle: billingCycle || this.state.currentPlan.billingCycle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change plan');
      }

      this.state.currentPlan = data.subscription;
      this.state.success = true;

      this.trackPricingEvent('plan_changed', {
        oldPlanId: this.state.currentPlan.planId,
        newPlanId,
        billingCycle,
      });

      return data.subscription;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to change plan';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Add addon to subscription
   */
  async addAddon(addonId: string, quantity: number = 1): Promise<void> {
    if (!this.state.currentPlan) {
      throw new Error('No active subscription found');
    }

    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: this.state.currentPlan.id,
          addonId,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add addon');
      }

      // Update current subscription with new addon
      this.state.currentPlan = data.subscription;
      this.state.success = true;

      this.trackPricingEvent('addon_added', {
        addonId,
        quantity,
        subscriptionId: this.state.currentPlan.id,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add addon';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Compare plans
   */
  comparePlans(planIds: string[]): PlanComparison {
    const selectedPlans = this.state.plans.filter((plan) =>
      planIds.includes(plan.id)
    );

    if (selectedPlans.length < 2) {
      throw new Error('At least 2 plans required for comparison');
    }

    // Group features by category
    const categoryMap = new Map<
      string,
      Map<string, (boolean | number | string)[]>
    >();

    selectedPlans.forEach((plan, index) => {
      plan.features.forEach((feature) => {
        if (!categoryMap.has(feature.category)) {
          categoryMap.set(feature.category, new Map());
        }

        const categoryFeatures = categoryMap.get(feature.category)!;
        if (!categoryFeatures.has(feature.name)) {
          categoryFeatures.set(
            feature.name,
            new Array(selectedPlans.length).fill(false)
          );
        }

        categoryFeatures.get(feature.name)![index] = feature.included;
      });
    });

    // Build comparison structure
    const features: ComparisonFeature[] = [];
    categoryMap.forEach((categoryFeatures, category) => {
      const featureList: {
        name: string;
        values: (boolean | number | string)[];
        highlight?: boolean;
      }[] = [];

      categoryFeatures.forEach((values, featureName) => {
        featureList.push({
          name: featureName,
          values,
          highlight: values.some(
            (v) => v === true || (typeof v === 'number' && v > 0)
          ),
        });
      });

      features.push({
        category,
        features: featureList,
      });
    });

    this.trackPricingEvent('plans_compared', {
      planIds,
      plansCount: selectedPlans.length,
    });

    return {
      plans: planIds,
      features,
      recommendation: this.generatePlanRecommendation(selectedPlans),
    };
  }

  /**
   * Apply promotion code
   */
  async applyPromotionCode(code: string): Promise<Promotion> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/promotions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid promotion code');
      }

      this.trackPricingEvent('promotion_applied', {
        code,
        promotionId: data.promotion.id,
        value: data.promotion.value,
      });

      return data.promotion;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to apply promotion code';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Get plan by ID
   */
  getPlanById(planId: string): PricingPlan | null {
    return this.state.plans.find((plan) => plan.id === planId) || null;
  }

  /**
   * Get addon by ID
   */
  getAddonById(addonId: string): Addon | null {
    return (
      this.state.availableAddons.find((addon) => addon.id === addonId) || null
    );
  }

  /**
   * Calculate savings for annual billing
   */
  calculateAnnualSavings(plan: PricingPlan): number {
    const monthlyTotal = plan.pricing.monthly.amount * 12;
    const annualAmount = plan.pricing.annually.amount;
    return monthlyTotal - annualAmount;
  }

  /**
   * Check if user can upgrade/downgrade to plan
   */
  canChangeToPlan(targetPlanId: string): { allowed: boolean; reason?: string } {
    if (!this.state.currentPlan) {
      return { allowed: true };
    }

    const currentPlan = this.getPlanById(this.state.currentPlan.planId);
    const targetPlan = this.getPlanById(targetPlanId);

    if (!currentPlan || !targetPlan) {
      return { allowed: false, reason: 'Plan not found' };
    }

    // Check if downgrade is allowed
    if (
      targetPlan.tier < currentPlan.tier &&
      !this.state.settings.allowDowngrades
    ) {
      return { allowed: false, reason: 'Downgrades not permitted' };
    }

    // Check if approval is required for enterprise plans
    if (
      targetPlan.category === 'enterprise' &&
      this.state.settings.requiresApproval
    ) {
      return { allowed: false, reason: 'Enterprise plans require approval' };
    }

    return { allowed: true };
  }

  /**
   * Private helper methods
   */
  private async fetchPricingPlans(currency?: string): Promise<PricingPlan[]> {
    try {
      const response = await fetch(
        `/api/subscription/plans?currency=${currency || this.state.currency}`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.plans || [];
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      return [];
    }
  }

  private async fetchCurrentSubscription(
    userId: string
  ): Promise<UserSubscription | null> {
    try {
      const response = await fetch(`/api/subscription/current/${userId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.subscription || null;
    } catch (error) {
      console.error('Error fetching current subscription:', error);
      return null;
    }
  }

  private async fetchAvailableAddons(): Promise<Addon[]> {
    try {
      const response = await fetch('/api/subscription/addons');
      if (!response.ok) return [];
      const data = await response.json();
      return data.addons || [];
    } catch (error) {
      console.error('Error fetching addons:', error);
      return [];
    }
  }

  private async fetchActivePromotions(): Promise<Promotion[]> {
    try {
      const response = await fetch('/api/subscription/promotions');
      if (!response.ok) return [];
      const data = await response.json();
      return data.promotions || [];
    } catch (error) {
      console.error('Error fetching promotions:', error);
      return [];
    }
  }

  private async fetchUsageMetrics(
    userId: string
  ): Promise<UsageMetrics | null> {
    try {
      const response = await fetch(`/api/subscription/usage/${userId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.usage || null;
    } catch (error) {
      console.error('Error fetching usage metrics:', error);
      return null;
    }
  }

  private async fetchPricingSettings(): Promise<Partial<PricingSettings> | null> {
    try {
      const response = await fetch('/api/subscription/settings');
      if (!response.ok) return null;
      const data = await response.json();
      return data.settings || null;
    } catch (error) {
      console.error('Error fetching pricing settings:', error);
      return null;
    }
  }

  private generatePlanRecommendation(plans: PricingPlan[]): string {
    // Simple recommendation logic based on plan tier and features
    const sortedPlans = plans.sort((a, b) => a.tier - b.tier);
    const middlePlan = sortedPlans[Math.floor(sortedPlans.length / 2)];

    if (middlePlan.isPopular) {
      return `${middlePlan.name} - Most popular choice with balanced features and pricing`;
    }

    return `${middlePlan.name} - Good balance of features and value`;
  }

  private trackPricingEvent(
    event: string,
    properties?: Record<string, any>
  ): void {
    try {
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Pricing Overview', {
          event,
          timestamp: new Date().toISOString(),
          ...properties,
        });
      }
    } catch (error) {
      console.error('Error tracking pricing event:', error);
    }
  }

  /**
   * Public getters
   */
  getState(): PricingOverviewState {
    return { ...this.state };
  }

  getPlans(): PricingPlan[] {
    return this.state.plans;
  }

  getCurrentPlan(): UserSubscription | null {
    return this.state.currentPlan;
  }

  getUsage(): UsageMetrics {
    return this.state.usage;
  }

  getPromotions(): Promotion[] {
    return this.state.promotions.filter((p) => p.isActive);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.state.error = null;
  }
}

// Export singleton instance
export const pricingOverviewLogic = new PricingOverviewLogic();

// Export utility functions
export const pricingOverviewUtils = {
  /**
   * Format currency amount
   */
  formatPrice(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Calculate monthly equivalent for annual plans
   */
  getMonthlyEquivalent(annualAmount: number): number {
    return Math.round((annualAmount / 12) * 100) / 100;
  },

  /**
   * Get plan category color
   */
  getPlanCategoryColor(category: string): string {
    const colors = {
      free: '#10B981',
      personal: '#3B82F6',
      professional: '#8B5CF6',
      enterprise: '#F59E0B',
    };
    return colors[category as keyof typeof colors] || '#6B7280';
  },

  /**
   * Format usage percentage
   */
  formatUsagePercentage(used: number, limit: number | 'unlimited'): string {
    if (limit === 'unlimited') return 'Unlimited';
    if (limit === 0) return '0%';

    const percentage = Math.round((used / limit) * 100);
    return `${percentage}%`;
  },

  /**
   * Get usage status color
   */
  getUsageStatusColor(percentage: number): string {
    if (percentage >= 90) return '#DC2626'; // Red - critical
    if (percentage >= 75) return '#F59E0B'; // Amber - warning
    if (percentage >= 50) return '#3B82F6'; // Blue - normal
    return '#10B981'; // Green - low usage
  },

  /**
   * Format feature value
   */
  formatFeatureValue(value: boolean | number | string): string {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    if (typeof value === 'number') {
      if (value === -1) return 'Unlimited';
      return value.toLocaleString();
    }
    return String(value);
  },

  /**
   * Calculate discount percentage
   */
  calculateDiscountPercentage(original: number, discounted: number): number {
    if (original === 0) return 0;
    return Math.round(((original - discounted) / original) * 100);
  },
};
