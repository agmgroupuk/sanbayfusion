/**
 * Per Agent Pricing Logic - Subscription Module
 * Handles per-agent subscription model, agent management, and usage-based billing
 */

export interface PerAgentPricingState {
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  success: boolean;
  agentPlans: AgentPlan[];
  userAgents: UserAgent[];
  agentUsage: AgentUsageMetrics[];
  billingCycle: 'monthly' | 'annually';
  currency: string;
  agentLimits: AgentLimits;
  pricingTiers: PricingTier[];
  bulkDiscounts: BulkDiscount[];
  settings: PerAgentSettings;
}

export interface AgentPlan {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'standard' | 'premium' | 'enterprise';
  agentType:
    | 'conversational'
    | 'analytical'
    | 'creative'
    | 'specialized'
    | 'custom';
  pricing: AgentPricing;
  features: AgentFeature[];
  capabilities: AgentCapability[];
  limits: AgentLimits;
  performance: PerformanceMetrics;
  deployment: DeploymentOptions;
  support: AgentSupport;
  compliance: ComplianceFeatures;
  customization: AgentCustomization;
  metadata: AgentPlanMetadata;
}

export interface AgentPricing {
  basePrice: {
    monthly: number;
    annually: number;
    currency: string;
  };
  usagePricing: {
    interactions: {
      included: number;
      overage: number; // per interaction
    };
    computeTime: {
      included: number; // minutes
      overage: number; // per minute
    };
    storage: {
      included: number; // GB
      overage: number; // per GB
    };
    api: {
      included: number;
      overage: number; // per API call
    };
  };
  setupFee?: number;
  minimumCommitment?: number; // months
  volumeDiscounts: VolumeDiscount[];
}

export interface VolumeDiscount {
  minAgents: number;
  maxAgents?: number;
  discountPercentage: number;
  description: string;
}

export interface AgentFeature {
  id: string;
  name: string;
  description: string;
  category:
    | 'nlp'
    | 'ml'
    | 'integration'
    | 'security'
    | 'customization'
    | 'analytics';
  included: boolean;
  premium?: boolean;
  configurable?: boolean;
}

export interface AgentCapability {
  name: string;
  description: string;
  type: 'text' | 'voice' | 'vision' | 'multimodal';
  accuracy: number; // percentage
  latency: number; // milliseconds
  languages: string[];
  models: string[];
}

export interface AgentLimits {
  maxInteractions: number | 'unlimited';
  maxComputeTime: number | 'unlimited'; // minutes per month
  maxStorage: number | 'unlimited'; // GB
  maxApiCalls: number | 'unlimited';
  concurrentSessions: number;
  responseTime: number; // milliseconds
  dataRetention: number; // days
  customModels: number;
  integrations: number;
  webhooks: number;
}

export interface PerformanceMetrics {
  averageLatency: number; // ms
  uptime: number; // percentage
  accuracy: number; // percentage
  throughput: number; // requests per second
  availability: string;
  sla: ServiceLevel;
}

export interface ServiceLevel {
  uptime: number;
  responseTime: number;
  resolution: string;
  support: string;
}

export interface DeploymentOptions {
  cloud: boolean;
  onPremise: boolean;
  hybrid: boolean;
  regions: string[];
  scalingOptions: ScalingOption[];
  backup: boolean;
  monitoring: boolean;
}

export interface ScalingOption {
  type: 'auto' | 'manual' | 'scheduled';
  minInstances: number;
  maxInstances: number;
  triggers: string[];
}

export interface AgentSupport {
  level: 'community' | 'standard' | 'premium' | 'enterprise';
  channels: string[];
  hours: string;
  responseTime: string;
  training: boolean;
  onboarding: boolean;
  customization: boolean;
}

export interface ComplianceFeatures {
  gdpr: boolean;
  hipaa: boolean;
  sox: boolean;
  iso27001: boolean;
  encryption: EncryptionLevel;
  auditLogs: boolean;
  dataLocation: string[];
  retention: RetentionPolicy;
}

export interface EncryptionLevel {
  atRest: boolean;
  inTransit: boolean;
  keyManagement: string;
  algorithm: string;
}

export interface RetentionPolicy {
  defaultDays: number;
  configurableRetention: boolean;
  automaticDeletion: boolean;
  backupRetention: number;
}

export interface AgentCustomization {
  personality: boolean;
  branding: boolean;
  workflows: boolean;
  integration: boolean;
  customModels: boolean;
  apiAccess: 'basic' | 'advanced' | 'full';
  webhooks: boolean;
  whiteLabel: boolean;
}

export interface AgentPlanMetadata {
  targetUseCase: string[];
  industry: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  technicalLevel: 'no-code' | 'low-code' | 'developer' | 'enterprise';
  popularFor: string[];
  integrations: string[];
}

export interface UserAgent {
  id: string;
  name: string;
  planId: string;
  planName: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: string;
  lastActiveAt: string;
  configuration: AgentConfiguration;
  usage: AgentUsageMetrics;
  billing: AgentBilling;
  performance: AgentPerformanceStats;
  deployment: AgentDeploymentStatus;
}

export interface AgentConfiguration {
  personality: string;
  instructions: string;
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat: string;
  enabledFeatures: string[];
  integrations: string[];
  customizations: Record<string, any>;
}

export interface AgentUsageMetrics {
  period: {
    start: string;
    end: string;
  };
  interactions: {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
  };
  computeTime: {
    used: number; // minutes
    limit: number | 'unlimited';
    percentage: number;
  };
  storage: {
    used: number; // GB
    limit: number | 'unlimited';
    percentage: number;
  };
  apiCalls: {
    used: number;
    limit: number | 'unlimited';
    percentage: number;
  };
  overages: AgentOverage[];
  trends: UsageTrend[];
}

export interface AgentOverage {
  type: 'interactions' | 'computeTime' | 'storage' | 'api';
  amount: number;
  cost: number;
  currency: string;
  period: string;
}

export interface UsageTrend {
  date: string;
  interactions: number;
  computeTime: number;
  responseTime: number;
  errorRate: number;
}

export interface AgentBilling {
  currentPeriodStart: string;
  currentPeriodEnd: string;
  baseCost: number;
  usageCost: number;
  overageCost: number;
  discounts: number;
  totalCost: number;
  currency: string;
  nextBillingDate: string;
  billingHistory: BillingRecord[];
}

export interface BillingRecord {
  id: string;
  period: string;
  amount: number;
  currency: string;
  breakdown: BillingBreakdown;
  paidAt?: string;
  status: 'pending' | 'paid' | 'overdue';
}

export interface BillingBreakdown {
  baseCost: number;
  interactionsCost: number;
  computeCost: number;
  storageCost: number;
  apiCost: number;
  discounts: number;
  taxes: number;
}

export interface AgentPerformanceStats {
  uptime: number; // percentage
  averageResponseTime: number; // ms
  successRate: number; // percentage
  userSatisfaction: number; // 1-5 rating
  errorRate: number; // percentage
  topErrors: ErrorStats[];
  peakUsageHours: number[];
}

export interface ErrorStats {
  type: string;
  count: number;
  percentage: number;
  lastOccurrence: string;
}

export interface AgentDeploymentStatus {
  status: 'deployed' | 'deploying' | 'failed' | 'stopped';
  version: string;
  region: string;
  instances: number;
  lastUpdated: string;
  health: HealthStatus;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  cpu: number; // percentage
  memory: number; // percentage
  disk: number; // percentage
  network: number; // percentage
}

export interface PricingTier {
  name: string;
  minAgents: number;
  maxAgents?: number;
  discountPercentage: number;
  benefits: string[];
  popular?: boolean;
}

export interface BulkDiscount {
  id: string;
  name: string;
  description: string;
  minQuantity: number;
  discountType: 'percentage' | 'fixed' | 'tiered';
  value: number;
  validUntil?: string;
  applicablePlans: string[];
}

export interface PerAgentSettings {
  defaultBillingCycle: 'monthly' | 'annually';
  allowUsageOverage: boolean;
  overageNotificationThreshold: number; // percentage
  autoScaling: boolean;
  defaultRegion: string;
  billingAlerts: boolean;
  performanceMonitoring: boolean;
  usageAnalytics: boolean;
  costOptimization: boolean;
}

export interface AgentSubscriptionQuote {
  agentPlanId: string;
  quantity: number;
  billingCycle: 'monthly' | 'annually';
  baseCost: number;
  estimatedUsage: EstimatedUsage;
  estimatedOverage: number;
  volumeDiscount: number;
  subtotal: number;
  taxes: number;
  total: number;
  currency: string;
  validUntil: string;
}

export interface EstimatedUsage {
  interactions: number;
  computeTime: number;
  storage: number;
  apiCalls: number;
  basedOn: 'historical' | 'projected' | 'provided';
}

export class PerAgentPricingLogic {
  private state: PerAgentPricingState;

  constructor() {
    this.state = {
      isLoading: false,
      isProcessing: false,
      error: null,
      success: false,
      agentPlans: [],
      userAgents: [],
      agentUsage: [],
      billingCycle: 'monthly',
      currency: 'USD',
      agentLimits: {
        maxInteractions: 0,
        maxComputeTime: 0,
        maxStorage: 0,
        maxApiCalls: 0,
        concurrentSessions: 1,
        responseTime: 1000,
        dataRetention: 30,
        customModels: 0,
        integrations: 0,
        webhooks: 0,
      },
      pricingTiers: [],
      bulkDiscounts: [],
      settings: {
        defaultBillingCycle: 'monthly',
        allowUsageOverage: true,
        overageNotificationThreshold: 80,
        autoScaling: false,
        defaultRegion: 'us-east-1',
        billingAlerts: true,
        performanceMonitoring: true,
        usageAnalytics: true,
        costOptimization: true,
      },
    };
  }

  /**
   * Initialize per-agent pricing
   */
  async initialize(userId?: string): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;

    try {
      const [
        agentPlans,
        userAgents,
        agentUsage,
        pricingTiers,
        bulkDiscounts,
        settings,
      ] = await Promise.all([
        this.fetchAgentPlans(),
        userId ? this.fetchUserAgents(userId) : [],
        userId ? this.fetchAgentUsage(userId) : [],
        this.fetchPricingTiers(),
        this.fetchBulkDiscounts(),
        this.fetchPerAgentSettings(),
      ]);

      this.state.agentPlans = agentPlans;
      this.state.userAgents = userAgents;
      this.state.agentUsage = agentUsage;
      this.state.pricingTiers = pricingTiers;
      this.state.bulkDiscounts = bulkDiscounts;

      if (settings) {
        this.state.settings = { ...this.state.settings, ...settings };
        this.state.billingCycle = settings.defaultBillingCycle || 'monthly';
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load per-agent pricing';
      this.state.error = message;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Generate quote for agent subscription
   */
  async generateAgentQuote(
    agentPlanId: string,
    quantity: number,
    billingCycle: 'monthly' | 'annually',
    estimatedUsage?: Partial<EstimatedUsage>
  ): Promise<AgentSubscriptionQuote> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/per-agent/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPlanId,
          quantity,
          billingCycle,
          estimatedUsage,
          currency: this.state.currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate agent quote');
      }

      this.trackPerAgentEvent('agent_quote_generated', {
        agentPlanId,
        quantity,
        billingCycle,
        total: data.quote.total,
      });

      return data.quote;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate agent quote';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Subscribe to agent plan
   */
  async subscribeToAgentPlan(
    agentPlanId: string,
    quantity: number,
    billingCycle: 'monthly' | 'annually',
    paymentMethodId: string,
    agentConfigs?: Partial<AgentConfiguration>[]
  ): Promise<UserAgent[]> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/per-agent/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPlanId,
          quantity,
          billingCycle,
          paymentMethodId,
          agentConfigs,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to subscribe to agent plan');
      }

      // Add new agents to state
      this.state.userAgents.push(...data.agents);
      this.state.success = true;

      this.trackPerAgentEvent('agent_plan_subscribed', {
        agentPlanId,
        quantity,
        billingCycle,
        agentsCreated: data.agents.length,
      });

      return data.agents;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to subscribe to agent plan';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Create additional agent
   */
  async createAgent(
    agentPlanId: string,
    configuration: Partial<AgentConfiguration>
  ): Promise<UserAgent> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/per-agent/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPlanId,
          configuration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create agent');
      }

      const newAgent = data.agent;
      this.state.userAgents.push(newAgent);
      this.state.success = true;

      this.trackPerAgentEvent('agent_created', {
        agentId: newAgent.id,
        agentPlanId,
        name: configuration.personality,
      });

      return newAgent;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create agent';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfiguration(
    agentId: string,
    updates: Partial<AgentConfiguration>
  ): Promise<void> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch(
        `/api/subscription/per-agent/agents/${agentId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configuration: updates }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update agent configuration');
      }

      // Update agent in state
      const agentIndex = this.state.userAgents.findIndex(
        (agent) => agent.id === agentId
      );
      if (agentIndex >= 0) {
        this.state.userAgents[agentIndex].configuration = {
          ...this.state.userAgents[agentIndex].configuration,
          ...updates,
        };
      }

      this.state.success = true;

      this.trackPerAgentEvent('agent_updated', {
        agentId,
        updatedFields: Object.keys(updates),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update agent configuration';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Pause/resume agent
   */
  async toggleAgentStatus(
    agentId: string,
    status: 'active' | 'inactive'
  ): Promise<void> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch(
        `/api/subscription/per-agent/agents/${agentId}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update agent status');
      }

      // Update agent status in state
      const agentIndex = this.state.userAgents.findIndex(
        (agent) => agent.id === agentId
      );
      if (agentIndex >= 0) {
        this.state.userAgents[agentIndex].status = status;
      }

      this.trackPerAgentEvent('agent_status_changed', {
        agentId,
        status,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update agent status';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch(
        `/api/subscription/per-agent/agents/${agentId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete agent');
      }

      // Remove agent from state
      this.state.userAgents = this.state.userAgents.filter(
        (agent) => agent.id !== agentId
      );

      this.trackPerAgentEvent('agent_deleted', { agentId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete agent';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Calculate pricing for multiple agents
   */
  calculateBulkPricing(
    agentPlanId: string,
    quantity: number,
    billingCycle: 'monthly' | 'annually'
  ): { baseCost: number; discount: number; total: number } {
    const plan = this.getAgentPlanById(agentPlanId);
    if (!plan) {
      throw new Error('Agent plan not found');
    }

    const unitPrice =
      billingCycle === 'monthly'
        ? plan.pricing.basePrice.monthly
        : plan.pricing.basePrice.annually;

    const baseCost = unitPrice * quantity;

    // Find applicable volume discount
    const applicableDiscount = plan.pricing.volumeDiscounts
      .filter(
        (discount) =>
          quantity >= discount.minAgents &&
          (!discount.maxAgents || quantity <= discount.maxAgents)
      )
      .sort((a, b) => b.discountPercentage - a.discountPercentage)[0];

    const discount = applicableDiscount
      ? (baseCost * applicableDiscount.discountPercentage) / 100
      : 0;
    const total = baseCost - discount;

    return { baseCost, discount, total };
  }

  /**
   * Get usage analytics
   */
  getUsageAnalytics(agentId?: string): {
    totalInteractions: number;
    averageResponseTime: number;
    totalComputeTime: number;
    costBreakdown: { base: number; usage: number; overage: number };
    trends: UsageTrend[];
  } {
    const targetAgents = agentId
      ? this.state.userAgents.filter((agent) => agent.id === agentId)
      : this.state.userAgents;

    const totalInteractions = targetAgents.reduce(
      (sum, agent) => sum + agent.usage.interactions.total,
      0
    );

    const averageResponseTime =
      targetAgents.reduce(
        (sum, agent) => sum + agent.usage.interactions.avgResponseTime,
        0
      ) / Math.max(targetAgents.length, 1);

    const totalComputeTime = targetAgents.reduce(
      (sum, agent) => sum + agent.usage.computeTime.used,
      0
    );

    const costBreakdown = targetAgents.reduce(
      (acc, agent) => ({
        base: acc.base + agent.billing.baseCost,
        usage: acc.usage + agent.billing.usageCost,
        overage: acc.overage + agent.billing.overageCost,
      }),
      { base: 0, usage: 0, overage: 0 }
    );

    // Combine trends from all agents
    const trendsMap = new Map<string, UsageTrend>();
    targetAgents.forEach((agent) => {
      agent.usage.trends.forEach((trend) => {
        const existing = trendsMap.get(trend.date);
        if (existing) {
          existing.interactions += trend.interactions;
          existing.computeTime += trend.computeTime;
          existing.responseTime =
            (existing.responseTime + trend.responseTime) / 2;
          existing.errorRate = (existing.errorRate + trend.errorRate) / 2;
        } else {
          trendsMap.set(trend.date, { ...trend });
        }
      });
    });

    const trends = Array.from(trendsMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      totalInteractions,
      averageResponseTime,
      totalComputeTime,
      costBreakdown,
      trends,
    };
  }

  /**
   * Get agent plan by ID
   */
  getAgentPlanById(planId: string): AgentPlan | null {
    return this.state.agentPlans.find((plan) => plan.id === planId) || null;
  }

  /**
   * Get user agent by ID
   */
  getUserAgentById(agentId: string): UserAgent | null {
    return this.state.userAgents.find((agent) => agent.id === agentId) || null;
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings: Partial<PerAgentSettings>): Promise<void> {
    this.state.settings = { ...this.state.settings, ...newSettings };

    try {
      await fetch('/api/subscription/per-agent/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.state.settings),
      });

      this.trackPerAgentEvent('settings_updated', {
        changes: Object.keys(newSettings),
      });
    } catch (error) {
      console.error('Failed to save per-agent settings:', error);
    }
  }

  /**
   * Private helper methods
   */
  private async fetchAgentPlans(): Promise<AgentPlan[]> {
    try {
      const response = await fetch('/api/subscription/per-agent/plans');
      if (!response.ok) return [];
      const data = await response.json();
      return data.plans || [];
    } catch (error) {
      console.error('Error fetching agent plans:', error);
      return [];
    }
  }

  private async fetchUserAgents(userId: string): Promise<UserAgent[]> {
    try {
      const response = await fetch(
        `/api/subscription/per-agent/agents/${userId}`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.agents || [];
    } catch (error) {
      console.error('Error fetching user agents:', error);
      return [];
    }
  }

  private async fetchAgentUsage(userId: string): Promise<AgentUsageMetrics[]> {
    try {
      const response = await fetch(
        `/api/subscription/per-agent/usage/${userId}`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.usage || [];
    } catch (error) {
      console.error('Error fetching agent usage:', error);
      return [];
    }
  }

  private async fetchPricingTiers(): Promise<PricingTier[]> {
    try {
      const response = await fetch('/api/subscription/per-agent/tiers');
      if (!response.ok) return [];
      const data = await response.json();
      return data.tiers || [];
    } catch (error) {
      console.error('Error fetching pricing tiers:', error);
      return [];
    }
  }

  private async fetchBulkDiscounts(): Promise<BulkDiscount[]> {
    try {
      const response = await fetch(
        '/api/subscription/per-agent/bulk-discounts'
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.discounts || [];
    } catch (error) {
      console.error('Error fetching bulk discounts:', error);
      return [];
    }
  }

  private async fetchPerAgentSettings(): Promise<Partial<PerAgentSettings> | null> {
    try {
      const response = await fetch('/api/subscription/per-agent/settings');
      if (!response.ok) return null;
      const data = await response.json();
      return data.settings || null;
    } catch (error) {
      console.error('Error fetching per-agent settings:', error);
      return null;
    }
  }

  private trackPerAgentEvent(
    event: string,
    properties?: Record<string, any>
  ): void {
    try {
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Per Agent Pricing', {
          event,
          timestamp: new Date().toISOString(),
          ...properties,
        });
      }
    } catch (error) {
      console.error('Error tracking per-agent event:', error);
    }
  }

  /**
   * Public getters
   */
  getState(): PerAgentPricingState {
    return { ...this.state };
  }

  getAgentPlans(): AgentPlan[] {
    return this.state.agentPlans;
  }

  getUserAgents(): UserAgent[] {
    return this.state.userAgents;
  }

  getActiveAgents(): UserAgent[] {
    return this.state.userAgents.filter((agent) => agent.status === 'active');
  }

  getPricingTiers(): PricingTier[] {
    return this.state.pricingTiers;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.state.error = null;
  }
}

// Export singleton instance
export const perAgentPricingLogic = new PerAgentPricingLogic();

// Export utility functions
export const perAgentPricingUtils = {
  /**
   * Format agent price
   */
  formatAgentPrice(
    price: number,
    currency: string = 'USD',
    period: 'monthly' | 'annually' = 'monthly'
  ): string {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);

    return `${formattedPrice}/${period === 'monthly' ? 'mo' : 'year'}`;
  },

  /**
   * Calculate usage percentage
   */
  calculateUsagePercentage(used: number, limit: number | 'unlimited'): number {
    if (limit === 'unlimited') return 0;
    if (limit === 0) return 100;
    return Math.min(Math.round((used / limit) * 100), 100);
  },

  /**
   * Get performance status color
   */
  getPerformanceColor(percentage: number): string {
    if (percentage >= 95) return '#10B981'; // Green - excellent
    if (percentage >= 85) return '#3B82F6'; // Blue - good
    if (percentage >= 70) return '#F59E0B'; // Amber - fair
    return '#EF4444'; // Red - poor
  },

  /**
   * Format compute time
   */
  formatComputeTime(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  },

  /**
   * Get agent status badge info
   */
  getAgentStatusBadge(status: string): { color: string; label: string } {
    const statusMap = {
      active: { color: '#10B981', label: 'Active' },
      inactive: { color: '#6B7280', label: 'Inactive' },
      suspended: { color: '#EF4444', label: 'Suspended' },
      pending: { color: '#F59E0B', label: 'Pending' },
    };
    return (
      statusMap[status as keyof typeof statusMap] || {
        color: '#6B7280',
        label: 'Unknown',
      }
    );
  },

  /**
   * Calculate overage costs
   */
  calculateOverageCosts(
    usage: AgentUsageMetrics,
    pricing: AgentPricing
  ): {
    interactions: number;
    computeTime: number;
    storage: number;
    api: number;
    total: number;
  } {
    const overages = {
      interactions: Math.max(
        0,
        usage.interactions.total - pricing.usagePricing.interactions.included
      ),
      computeTime: Math.max(
        0,
        usage.computeTime.used - pricing.usagePricing.computeTime.included
      ),
      storage: Math.max(
        0,
        usage.storage.used - pricing.usagePricing.storage.included
      ),
      api: Math.max(0, usage.apiCalls.used - pricing.usagePricing.api.included),
    };

    const costs = {
      interactions:
        overages.interactions * pricing.usagePricing.interactions.overage,
      computeTime:
        overages.computeTime * pricing.usagePricing.computeTime.overage,
      storage: overages.storage * pricing.usagePricing.storage.overage,
      api: overages.api * pricing.usagePricing.api.overage,
      total: 0,
    };

    costs.total =
      costs.interactions + costs.computeTime + costs.storage + costs.api;

    return costs;
  },
};
