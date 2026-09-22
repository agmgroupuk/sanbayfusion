/**
 * AgentSubscription - Prisma Types
 */
export type { AgentSubscription } from '@prisma/client';

export interface IAgentSubscription {
  id: string;
  userId: string;
  agentId: string;
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly';
  price: number;
  status: 'active' | 'expired' | 'cancelled';
  startDate: Date;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function calculateExpiryDate(plan: string, startDate: Date = new Date()): Date {
  const date = new Date(startDate);
  switch (plan) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  return date;
}

export function isSubscriptionValid(subscription: IAgentSubscription): boolean {
  return subscription.status === 'active' && new Date(subscription.expiryDate) > new Date();
}
