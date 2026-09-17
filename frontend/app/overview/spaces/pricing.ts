/**
 * Main Pricing Logic - Subscription Module
 * Handles overall pricing functionality, plan comparisons, and subscription management
 */

export interface PricingState {
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  success: boolean;
  currentView: 'overview' | 'per-agent' | 'enterprise' | 'comparison';
  selectedPlans: string[];
  activeSubscriptions: Subscription[];
  billingHistory: BillingHistory[];
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  settings: PricingSettings;
  currency: string;
  locale: string;
}

export interface Subscription {
  id: string;
  type: 'platform' | 'per-agent' | 'enterprise';
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
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  nextBillingDate: string;
  paymentMethodId: string;
  discounts: SubscriptionDiscount[];
  addons: SubscriptionAddon[];
  metadata: SubscriptionMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDiscount {
  id: string;
  code?: string;
  name: string;
  type: 'percentage' | 'fixed' | 'trial';
  value: number;
  description: string;
  appliedAt: string;
  validUntil?: string;
  remainingUses?: number;
}

export interface SubscriptionAddon {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedAt: string;
}

export interface SubscriptionMetadata {
  source: string;
  campaign?: string;
  referrer?: string;
  salesRep?: string;
  customFields: Record<string, any>;
}

export interface BillingHistory {
  id: string;
  subscriptionId: string;
  subscriptionType: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  billingDate: string;
  paidAt?: string;
  paymentMethodId: string;
  invoiceId: string;
  description: string;
  breakdown: BillingBreakdown;
  failureReason?: string;
}

export interface BillingBreakdown {
  subtotal: number;
  discounts: number;
  taxes: number;
  credits: number;
  total: number;
  items: BillingItem[];
}

export interface BillingItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'subscription' | 'addon' | 'usage' | 'overage' | 'setup';
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal' | 'crypto';
  isDefault: boolean;
  details: PaymentMethodDetails;
  billingAddress: BillingAddress;
  createdAt: string;
  lastUsed?: string;
}

export interface PaymentMethodDetails {
  // For cards
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;

  // For bank accounts
  bankName?: string;
  accountLast4?: string;
  accountType?: 'checking' | 'savings';

  // For PayPal
  paypalEmail?: string;

  // For crypto
  walletAddress?: string;
  cryptocurrency?: string;
}

export interface BillingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  taxId?: string;
  businessName?: string;
}

export interface Invoice {
  id: string;
  number: string;
  subscriptionId: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  description: string;
  lineItems: InvoiceLineItem[];
  taxes: InvoiceTax[];
  discounts: InvoiceDiscount[];
  downloadUrl?: string;
  paymentUrl?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  period?: {
    start: string;
    end: string;
  };
}

export interface InvoiceTax {
  name: string;
  rate: number;
  amount: number;
  inclusive: boolean;
}

export interface InvoiceDiscount {
  id: string;
  name: string;
  amount: number;
  type: 'percentage' | 'fixed';
}

export interface PricingSettings {
  defaultCurrency: string;
  supportedCurrencies: string[];
  taxCalculation: 'inclusive' | 'exclusive' | 'auto';
  invoiceGeneration: 'automatic' | 'manual';
  paymentRetry: boolean;
  dunningManagement: boolean;
  proration: boolean;
  gracePeriod: number; // days
  trialPeriod: number; // days
  refundPolicy: RefundPolicy;
  notifications: NotificationSettings;
}

export interface RefundPolicy {
  enabled: boolean;
  periodDays: number;
  proRated: boolean;
  conditions: string[];
  automaticApproval: boolean;
}

export interface NotificationSettings {
  paymentSuccess: boolean;
  paymentFailure: boolean;
  subscriptionExpiry: boolean;
  trialExpiry: boolean;
  invoiceGeneration: boolean;
  usageAlerts: boolean;
  planChanges: boolean;
}

export interface PricingComparison {
  plans: PlanComparisonData[];
  categories: ComparisonCategory[];
  recommendations: PlanRecommendation[];
}

export interface PlanComparisonData {
  id: string;
  name: string;
  type: 'platform' | 'per-agent';
  pricing: {
    monthly: number;
    annually: number;
    currency: string;
  };
  features: Record<string, boolean | number | string>;
  limitations: Record<string, number | string>;
  highlights: string[];
}

export interface ComparisonCategory {
  name: string;
  features: ComparisonFeature[];
}

export interface ComparisonFeature {
  name: string;
  description: string;
  values: Record<string, boolean | number | string>;
  important: boolean;
}

export interface PlanRecommendation {
  planId: string;
  score: number;
  reasons: string[];
  bestFor: string[];
  considerations: string[];
}

export interface SubscriptionAnalytics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  churnRate: number;
  averageRevenuePerUser: number;
  lifetimeValue: number;
  conversionRate: number;
  trialConversionRate: number;
  subscriptionGrowth: GrowthMetrics;
  revenueBreakdown: RevenueBreakdown;
  planDistribution: PlanDistribution[];
}

export interface GrowthMetrics {
  period: string;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  upgrades: number;
  downgrades: number;
  netGrowth: number;
  growthRate: number;
}

export interface RevenueBreakdown {
  subscriptions: number;
  addons: number;
  usage: number;
  oneTime: number;
  refunds: number;
  net: number;
}

export interface PlanDistribution {
  planId: string;
  planName: string;
  count: number;
  percentage: number;
  revenue: number;
}

export class PricingLogic {
  private state: PricingState;

  constructor() {
    this.state = {
      isLoading: false,
      isProcessing: false,
      error: null,
      success: false,
      currentView: 'overview',
      selectedPlans: [],
      activeSubscriptions: [],
      billingHistory: [],
      paymentMethods: [],
      invoices: [],
      settings: {
        defaultCurrency: 'USD',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        taxCalculation: 'auto',
        invoiceGeneration: 'automatic',
        paymentRetry: true,
        dunningManagement: true,
        proration: true,
        gracePeriod: 3,
        trialPeriod: 14,
        refundPolicy: {
          enabled: true,
          periodDays: 30,
          proRated: true,
          conditions: ['No usage above trial limits', 'Within refund period'],
          automaticApproval: false,
        },
        notifications: {
          paymentSuccess: true,
          paymentFailure: true,
          subscriptionExpiry: true,
          trialExpiry: true,
          invoiceGeneration: true,
          usageAlerts: true,
          planChanges: true,
        },
      },
      currency: 'USD',
      locale: 'en-US',
    };
  }

  /**
   * Initialize pricing system
   */
  async initialize(userId?: string): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;

    try {
      const [
        subscriptions,
        billingHistory,
        paymentMethods,
        invoices,
        settings,
      ] = await Promise.all([
        userId ? this.fetchActiveSubscriptions(userId) : [],
        userId ? this.fetchBillingHistory(userId) : [],
        userId ? this.fetchPaymentMethods(userId) : [],
        userId ? this.fetchInvoices(userId) : [],
        this.fetchPricingSettings(),
      ]);

      this.state.activeSubscriptions = subscriptions;
      this.state.billingHistory = billingHistory;
      this.state.paymentMethods = paymentMethods;
      this.state.invoices = invoices;

      if (settings) {
        this.state.settings = { ...this.state.settings, ...settings };
        this.state.currency = settings.defaultCurrency || 'USD';
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to initialize pricing system';
      this.state.error = message;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Set current view
   */
  setCurrentView(
    view: 'overview' | 'per-agent' | 'enterprise' | 'comparison'
  ): void {
    this.state.currentView = view;
    this.trackPricingEvent('view_changed', { view });
  }

  /**
   * Add plan to comparison
   */
  addPlanToComparison(planId: string): void {
    if (!this.state.selectedPlans.includes(planId)) {
      this.state.selectedPlans.push(planId);
      this.trackPricingEvent('plan_added_to_comparison', { planId });
    }
  }

  /**
   * Remove plan from comparison
   */
  removePlanFromComparison(planId: string): void {
    this.state.selectedPlans = this.state.selectedPlans.filter(
      (id) => id !== planId
    );
    this.trackPricingEvent('plan_removed_from_comparison', { planId });
  }

  /**
   * Clear comparison
   */
  clearComparison(): void {
    const previousCount = this.state.selectedPlans.length;
    this.state.selectedPlans = [];
    this.trackPricingEvent('comparison_cleared', { previousCount });
  }

  /**
   * Generate comprehensive pricing comparison
   */
  async generatePricingComparison(
    planIds?: string[]
  ): Promise<PricingComparison> {
    const plansToCompare = planIds || this.state.selectedPlans;

    if (plansToCompare.length < 2) {
      throw new Error('At least 2 plans required for comparison');
    }

    this.state.isLoading = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planIds: plansToCompare,
          currency: this.state.currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to generate pricing comparison'
        );
      }

      this.trackPricingEvent('pricing_comparison_generated', {
        planCount: plansToCompare.length,
        planIds: plansToCompare,
      });

      return data.comparison;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate pricing comparison';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
    reason?: string
  ): Promise<void> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch(
        `/api/subscription/${subscriptionId}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancelAtPeriodEnd,
            reason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel subscription');
      }

      // Update subscription in state
      const subscriptionIndex = this.state.activeSubscriptions.findIndex(
        (sub) => sub.id === subscriptionId
      );
      if (subscriptionIndex >= 0) {
        this.state.activeSubscriptions[subscriptionIndex].cancelAtPeriodEnd =
          cancelAtPeriodEnd;
        if (!cancelAtPeriodEnd) {
          this.state.activeSubscriptions[subscriptionIndex].status =
            'cancelled';
        }
      }

      this.state.success = true;

      this.trackPricingEvent('subscription_cancelled', {
        subscriptionId,
        cancelAtPeriodEnd,
        reason,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to cancel subscription';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch(
        `/api/subscription/${subscriptionId}/reactivate`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reactivate subscription');
      }

      // Update subscription in state
      const subscriptionIndex = this.state.activeSubscriptions.findIndex(
        (sub) => sub.id === subscriptionId
      );
      if (subscriptionIndex >= 0) {
        this.state.activeSubscriptions[subscriptionIndex].cancelAtPeriodEnd =
          false;
        this.state.activeSubscriptions[subscriptionIndex].status = 'active';
      }

      this.state.success = true;

      this.trackPricingEvent('subscription_reactivated', { subscriptionId });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to reactivate subscription';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    subscriptionId: string,
    paymentMethodId: string
  ): Promise<void> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch(
        `/api/subscription/${subscriptionId}/payment-method`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethodId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update payment method');
      }

      // Update subscription in state
      const subscriptionIndex = this.state.activeSubscriptions.findIndex(
        (sub) => sub.id === subscriptionId
      );
      if (subscriptionIndex >= 0) {
        this.state.activeSubscriptions[subscriptionIndex].paymentMethodId =
          paymentMethodId;
      }

      this.state.success = true;

      this.trackPricingEvent('payment_method_updated', {
        subscriptionId,
        paymentMethodId,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update payment method';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    paymentMethodData: Omit<PaymentMethod, 'id' | 'createdAt' | 'lastUsed'>
  ): Promise<PaymentMethod> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/subscription/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentMethodData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add payment method');
      }

      const newPaymentMethod = data.paymentMethod;

      // Set as default if it's the first payment method
      if (
        paymentMethodData.isDefault ||
        this.state.paymentMethods.length === 0
      ) {
        // Remove default from other payment methods
        this.state.paymentMethods.forEach((pm) => (pm.isDefault = false));
        newPaymentMethod.isDefault = true;
      }

      this.state.paymentMethods.push(newPaymentMethod);
      this.state.success = true;

      this.trackPricingEvent('payment_method_added', {
        type: newPaymentMethod.type,
        isDefault: newPaymentMethod.isDefault,
      });

      return newPaymentMethod;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add payment method';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    this.state.isProcessing = true;
    this.state.error = null;

    try {
      const response = await fetch(
        `/api/subscription/payment-methods/${paymentMethodId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove payment method');
      }

      // Remove from state
      this.state.paymentMethods = this.state.paymentMethods.filter(
        (pm) => pm.id !== paymentMethodId
      );

      this.trackPricingEvent('payment_method_removed', { paymentMethodId });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to remove payment method';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Download invoice
   */
  async downloadInvoice(invoiceId: string): Promise<void> {
    try {
      const response = await fetch(
        `/api/subscription/invoices/${invoiceId}/download`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoiceId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.trackPricingEvent('invoice_downloaded', { invoiceId });
      }
    } catch (error) {
      console.error('Invoice download failed:', error);
      this.state.error = 'Failed to download invoice';
    }
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics(
    period: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<SubscriptionAnalytics> {
    this.state.isLoading = true;

    try {
      const response = await fetch(
        `/api/subscription/analytics?period=${period}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch subscription analytics');
      }

      const data = await response.json();

      this.trackPricingEvent('analytics_viewed', { period });

      return data.analytics;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch subscription analytics';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Update pricing settings
   */
  async updateSettings(newSettings: Partial<PricingSettings>): Promise<void> {
    this.state.settings = { ...this.state.settings, ...newSettings };

    try {
      await fetch('/api/subscription/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.state.settings),
      });

      this.trackPricingEvent('settings_updated', {
        changes: Object.keys(newSettings),
      });
    } catch (error) {
      console.error('Failed to save pricing settings:', error);
    }
  }

  /**
   * Private helper methods
   */
  private async fetchActiveSubscriptions(
    userId: string
  ): Promise<Subscription[]> {
    try {
      const response = await fetch(`/api/subscription/subscriptions/${userId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.subscriptions || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  private async fetchBillingHistory(userId: string): Promise<BillingHistory[]> {
    try {
      const response = await fetch(
        `/api/subscription/billing-history/${userId}`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Error fetching billing history:', error);
      return [];
    }
  }

  private async fetchPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const response = await fetch(
        `/api/subscription/payment-methods/${userId}`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.paymentMethods || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  private async fetchInvoices(userId: string): Promise<Invoice[]> {
    try {
      const response = await fetch(`/api/subscription/invoices/${userId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.invoices || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
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

  private trackPricingEvent(
    event: string,
    properties?: Record<string, any>
  ): void {
    try {
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Pricing System', {
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
  getState(): PricingState {
    return { ...this.state };
  }

  getActiveSubscriptions(): Subscription[] {
    return this.state.activeSubscriptions;
  }

  getBillingHistory(): BillingHistory[] {
    return this.state.billingHistory;
  }

  getPaymentMethods(): PaymentMethod[] {
    return this.state.paymentMethods;
  }

  getDefaultPaymentMethod(): PaymentMethod | null {
    return this.state.paymentMethods.find((pm) => pm.isDefault) || null;
  }

  getInvoices(): Invoice[] {
    return this.state.invoices;
  }

  getUnpaidInvoices(): Invoice[] {
    return this.state.invoices.filter((invoice) =>
      ['open', 'draft'].includes(invoice.status)
    );
  }

  getSelectedPlans(): string[] {
    return [...this.state.selectedPlans];
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.state.error = null;
  }
}

// Export singleton instance
export const pricingLogic = new PricingLogic();

// Export utility functions
export const pricingUtils = {
  /**
   * Format currency amount
   */
  formatCurrency(
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US'
  ): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  },

  /**
   * Calculate annual savings
   */
  calculateAnnualSavings(
    monthlyPrice: number,
    annualPrice: number
  ): {
    amount: number;
    percentage: number;
  } {
    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - annualPrice;
    const percentage = Math.round((savings / monthlyTotal) * 100);

    return {
      amount: savings,
      percentage,
    };
  },

  /**
   * Get subscription status color
   */
  getSubscriptionStatusColor(status: string): string {
    const colors = {
      active: '#10B981',
      trial: '#3B82F6',
      inactive: '#6B7280',
      cancelled: '#EF4444',
      expired: '#F59E0B',
      suspended: '#DC2626',
    };
    return colors[status as keyof typeof colors] || '#6B7280';
  },

  /**
   * Format billing cycle
   */
  formatBillingCycle(cycle: string): string {
    return cycle === 'monthly' ? 'Monthly' : 'Annual';
  },

  /**
   * Get next billing date
   */
  getNextBillingDate(currentPeriodEnd: string): string {
    const date = new Date(currentPeriodEnd);
    return date.toLocaleDateString();
  },

  /**
   * Calculate days until billing
   */
  getDaysUntilBilling(nextBillingDate: string): number {
    const now = new Date();
    const billing = new Date(nextBillingDate);
    const diffTime = billing.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Format payment method
   */
  formatPaymentMethod(paymentMethod: PaymentMethod): string {
    switch (paymentMethod.type) {
      case 'card':
        return `${paymentMethod.details.brand?.toUpperCase()} ••••${
          paymentMethod.details.last4
        }`;
      case 'bank_account':
        return `${paymentMethod.details.bankName} ••••${paymentMethod.details.accountLast4}`;
      case 'paypal':
        return `PayPal (${paymentMethod.details.paypalEmail})`;
      case 'crypto':
        return `${paymentMethod.details.cryptocurrency} Wallet`;
      default:
        return 'Payment Method';
    }
  },

  /**
   * Get invoice status badge
   */
  getInvoiceStatusBadge(status: string): { color: string; label: string } {
    const statusMap = {
      draft: { color: '#6B7280', label: 'Draft' },
      open: { color: '#F59E0B', label: 'Pending' },
      paid: { color: '#10B981', label: 'Paid' },
      void: { color: '#EF4444', label: 'Void' },
      uncollectible: { color: '#DC2626', label: 'Uncollectible' },
    };
    return (
      statusMap[status as keyof typeof statusMap] || {
        color: '#6B7280',
        label: 'Unknown',
      }
    );
  },

  /**
   * Calculate refund amount
   */
  calculateRefundAmount(
    subscription: Subscription,
    refundPolicy: RefundPolicy,
    requestDate: Date = new Date()
  ): { amount: number; eligible: boolean; reason?: string } {
    if (!refundPolicy.enabled) {
      return { amount: 0, eligible: false, reason: 'Refunds not allowed' };
    }

    const subscriptionStart = new Date(subscription.currentPeriodStart);
    const daysSinceStart = Math.floor(
      (requestDate.getTime() - subscriptionStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceStart > refundPolicy.periodDays) {
      return { amount: 0, eligible: false, reason: 'Refund period expired' };
    }

    let refundAmount = subscription.amount;

    if (refundPolicy.proRated) {
      const periodDays = Math.floor(
        (new Date(subscription.currentPeriodEnd).getTime() -
          subscriptionStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const remainingDays = Math.max(0, periodDays - daysSinceStart);
      refundAmount = (subscription.amount / periodDays) * remainingDays;
    }

    return {
      amount: Math.round(refundAmount * 100) / 100,
      eligible: true,
    };
  },
};
