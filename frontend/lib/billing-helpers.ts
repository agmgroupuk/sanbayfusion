/**
 * Billing Helpers - Invoice and Payment Record Creation
 *
 * Creates invoice and payment records when subscriptions are purchased
 * Uses Prisma for database operations
 */

import prisma from '@/lib/prisma';
import Stripe from 'stripe';

export interface InvoiceRecord {
  id?: string;
  userId: string;
  email: string;
  stripeInvoiceId?: string;
  stripeSubscriptionId: string;
  agentId: string;
  agentName: string;
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly';
  amount: number; // In dollars
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'void';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  id?: string;
  userId: string;
  email: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeInvoiceId?: string;
  stripeSubscriptionId: string;
  agentId: string;
  agentName: string;
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly';
  amount: number; // In dollars
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  paymentMethod: string; // e.g., 'card', 'apple_pay'
  last4?: string; // Last 4 digits of card
  brand?: string; // e.g., 'visa', 'mastercard'
  paidAt: Date;
  createdAt: Date;
}

/**
 * Create an invoice record when a subscription is purchased
 * Uses Prisma Transaction model for storing invoice/billing data
 */
export async function createInvoiceRecord(params: {
  userId: string;
  email: string;
  stripeSubscriptionId: string;
  stripeInvoiceId?: string;
  agentId: string;
  agentName: string;
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly';
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  paidAt?: Date;
}): Promise<InvoiceRecord> {
  const transaction = await prisma.transaction.create({
    data: {
      userId: params.userId,
      type: 'invoice',
      amount: params.amount,
      currency: params.currency,
      status: params.status === 'paid' ? 'completed' : params.status === 'failed' ? 'failed' : 'pending',
      stripePaymentIntentId: params.stripeSubscriptionId,
      metadata: {
        email: params.email,
        stripeInvoiceId: params.stripeInvoiceId,
        stripeSubscriptionId: params.stripeSubscriptionId,
        agentId: params.agentId,
        agentName: params.agentName,
        plan: params.plan,
        paidAt: params.paidAt?.toISOString(),
      },
    },
  });

  console.log('✅ Invoice record created:', transaction.id);

  return {
    id: transaction.id,
    userId: params.userId,
    email: params.email,
    stripeInvoiceId: params.stripeInvoiceId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    agentId: params.agentId,
    agentName: params.agentName,
    plan: params.plan,
    amount: params.amount,
    currency: params.currency,
    status: params.status,
    paidAt: params.paidAt || new Date(),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

/**
 * Create a payment record when a payment is successful
 * Uses Prisma Transaction model for storing payment data
 */
export async function createPaymentRecord(params: {
  userId: string;
  email: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeInvoiceId?: string;
  stripeSubscriptionId: string;
  agentId: string;
  agentName: string;
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly';
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  paymentMethod: string;
  last4?: string;
  brand?: string;
}): Promise<PaymentRecord> {
  const transaction = await prisma.transaction.create({
    data: {
      userId: params.userId,
      type: 'payment',
      amount: params.amount,
      currency: params.currency,
      status: params.status === 'succeeded' ? 'completed' : params.status === 'failed' ? 'failed' : 'pending',
      stripePaymentIntentId: params.stripePaymentIntentId,
      metadata: {
        email: params.email,
        stripeChargeId: params.stripeChargeId,
        stripeInvoiceId: params.stripeInvoiceId,
        stripeSubscriptionId: params.stripeSubscriptionId,
        agentId: params.agentId,
        agentName: params.agentName,
        plan: params.plan,
        paymentMethod: params.paymentMethod,
        last4: params.last4,
        brand: params.brand,
      },
    },
  });

  console.log('✅ Payment record created:', transaction.id);

  return {
    id: transaction.id,
    userId: params.userId,
    email: params.email,
    stripePaymentIntentId: params.stripePaymentIntentId,
    stripeChargeId: params.stripeChargeId,
    stripeInvoiceId: params.stripeInvoiceId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    agentId: params.agentId,
    agentName: params.agentName,
    plan: params.plan,
    amount: params.amount,
    currency: params.currency,
    status: params.status,
    paymentMethod: params.paymentMethod,
    last4: params.last4,
    brand: params.brand,
    paidAt: new Date(),
    createdAt: transaction.createdAt,
  };
}

/**
 * Create billing history entry
 * Uses Prisma Transaction model for storing billing records
 */
export async function createBillingRecord(params: {
  userId: string;
  email: string;
  type: 'subscription' | 'renewal' | 'cancellation' | 'refund';
  stripeSubscriptionId: string;
  agentId: string;
  agentName: string;
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly';
  amount?: number;
  currency?: string;
  description: string;
}): Promise<void> {
  const transaction = await prisma.transaction.create({
    data: {
      userId: params.userId,
      type: params.type,
      amount: params.amount || 0,
      currency: params.currency || 'usd',
      status: 'completed',
      stripePaymentIntentId: params.stripeSubscriptionId,
      metadata: {
        email: params.email,
        stripeSubscriptionId: params.stripeSubscriptionId,
        agentId: params.agentId,
        agentName: params.agentName,
        plan: params.plan,
        description: params.description,
      },
    },
  });

  console.log('✅ Billing record created:', transaction.id);
}

/**
 * Helper to extract payment details from Stripe subscription
 */
export async function getPaymentDetailsFromSubscription(
  stripe: Stripe,
  subscriptionId: string
): Promise<{
  paymentMethod?: string;
  last4?: string;
  brand?: string;
  invoiceId?: string;
  chargeId?: string;
  paymentIntentId?: string;
} | null> {
  try {
    // Get the subscription with expanded invoice data
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice'],
    });

    const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;

    if (!latestInvoice) {
      console.warn('No latest invoice found for subscription:', subscriptionId);
      return null;
    }

    const charge = latestInvoice.charge as Stripe.Charge | null;
    const paymentIntent =
      latestInvoice.payment_intent as Stripe.PaymentIntent | null;

    // Extract payment method details
    let paymentMethod = 'card';
    let last4: string | undefined;
    let brand: string | undefined;

    if (charge?.payment_method_details) {
      paymentMethod = charge.payment_method_details.type;
      if (charge.payment_method_details.card) {
        last4 = charge.payment_method_details.card.last4;
        brand = charge.payment_method_details.card.brand;
      }
    }

    return {
      invoiceId: latestInvoice.id,
      chargeId: typeof charge === 'string' ? charge : charge?.id,
      paymentIntentId:
        typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id,
      paymentMethod,
      last4,
      brand,
    };
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return null;
  }
}
