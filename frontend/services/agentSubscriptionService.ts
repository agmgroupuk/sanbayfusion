/**
 * Agent Subscription Service
 * Handles subscription operations via API calls to backend
 */

const API_BASE = '/api';

export interface AgentSubscription {
  _id: string;
  userId: string;
  agentId: string;
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly';
  price: number;
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  expiryDate: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  period: string;
  description: string;
  priceFormatted: string;
  originalPriceFormatted?: string;
  discount?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'daily',
    name: 'daily',
    displayName: 'Daily Plan',
    price: 1,
    period: 'day',
    description: 'Perfect for short-term projects',
    priceFormatted: '$1.00',
  },
  {
    id: 'weekly',
    name: 'weekly',
    displayName: 'Weekly Plan',
    price: 5,
    period: 'week',
    description: 'Great for weekly projects — 50% OFF!',
    priceFormatted: '$5.00',
    originalPriceFormatted: '$10.00',
    discount: '50% OFF',
  },
  {
    id: 'monthly',
    name: 'monthly',
    displayName: 'Monthly Plan',
    price: 15,
    period: 'month',
    description: 'Best value for ongoing work — 50% OFF!',
    priceFormatted: '$15.00',
    originalPriceFormatted: '$30.00',
    discount: '50% OFF',
  },
  {
    id: 'yearly',
    name: 'yearly',
    displayName: 'Yearly Plan',
    price: 150,
    period: 'year',
    description: 'Ultimate savings - full year access — 50% OFF!',
    priceFormatted: '$150.00',
    originalPriceFormatted: '$300.00',
    discount: '50% OFF',
  },
];

class AgentSubscriptionService {
  // Check if user has active subscription for agent
  async checkSubscription(
    userId: string,
    agentId: string
  ): Promise<{
    hasActiveSubscription: boolean;
    subscription: AgentSubscription | null;
  }> {
    try {
      const response = await fetch(
        `${API_BASE}/agent/subscriptions/check/${userId}/${agentId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to check subscription: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking subscription:', error);
      return { hasActiveSubscription: false, subscription: null };
    }
  }

  // Create new subscription
  async createSubscription(
    userId: string,
    agentId: string,
    plan: string
  ): Promise<AgentSubscription> {
    try {
      const response = await fetch(
        `${API_BASE}/agent/subscriptions/subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, agentId, plan }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
          `Failed to create subscription: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Get user's all subscriptions
  async getUserSubscriptions(userId: string): Promise<AgentSubscription[]> {
    try {
      const response = await fetch(
        `${API_BASE}/agent/subscriptions/user/${userId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get subscriptions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.subscriptions || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE}/agent/subscriptions/${subscriptionId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to cancel subscription: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Update subscription
  async updateSubscription(
    subscriptionId: string,
    updates: {
      status?: string;
      plan?: string;
    }
  ): Promise<AgentSubscription> {
    try {
      const response = await fetch(
        `${API_BASE}/agent/subscriptions/${subscriptionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
          `Failed to update subscription: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.subscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  // Get plan by ID
  getPlan(planId: string): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
  }

  // Format expiry date
  formatExpiryDate(expiryDate: string): string {
    const date = new Date(expiryDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Check if subscription is expiring soon (within 24 hours)
  isExpiringSoon(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const timeDiff = expiry.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    return hoursDiff > 0 && hoursDiff <= 24;
  }
}

export const agentSubscriptionService = new AgentSubscriptionService();
