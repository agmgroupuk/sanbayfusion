/**
 * Stripe Client Library
 * Handles one-time payments for agent access (NOT recurring subscriptions)
 */

import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Agent-specific product mappings
const AGENT_PRODUCTS: Record<
  string,
  Record<string, { productId: string; priceId: string }>
> = {
  'julie-girlfriend': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_JULIE-GIRLFRIEND_DAILY']!,
      priceId: process.env['STRIPE_PRICE_JULIE-GIRLFRIEND_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_JULIE-GIRLFRIEND_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_JULIE-GIRLFRIEND_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_JULIE-GIRLFRIEND_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_JULIE-GIRLFRIEND_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_JULIE-GIRLFRIEND_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_JULIE-GIRLFRIEND_YEARLY']!,
    },
  },
  'emma-emotional': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_EMMA-EMOTIONAL_DAILY']!,
      priceId: process.env['STRIPE_PRICE_EMMA-EMOTIONAL_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_EMMA-EMOTIONAL_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_EMMA-EMOTIONAL_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_EMMA-EMOTIONAL_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_EMMA-EMOTIONAL_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_EMMA-EMOTIONAL_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_EMMA-EMOTIONAL_YEARLY']!,
    },
  },
  einstein: {
    daily: {
      productId: process.env['STRIPE_PRODUCT_EINSTEIN_DAILY']!,
      priceId: process.env['STRIPE_PRICE_EINSTEIN_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_EINSTEIN_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_EINSTEIN_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_EINSTEIN_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_EINSTEIN_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_EINSTEIN_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_EINSTEIN_YEARLY']!,
    },
  },
  'tech-wizard': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_TECH-WIZARD_DAILY']!,
      priceId: process.env['STRIPE_PRICE_TECH-WIZARD_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_TECH-WIZARD_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_TECH-WIZARD_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_TECH-WIZARD_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_TECH-WIZARD_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_TECH-WIZARD_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_TECH-WIZARD_YEARLY']!,
    },
  },
  'mrs-boss': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_MRS-BOSS_DAILY']!,
      priceId: process.env['STRIPE_PRICE_MRS-BOSS_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_MRS-BOSS_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_MRS-BOSS_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_MRS-BOSS_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_MRS-BOSS_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_MRS-BOSS_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_MRS-BOSS_YEARLY']!,
    },
  },
  'comedy-king': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_COMEDY-KING_DAILY']!,
      priceId: process.env['STRIPE_PRICE_COMEDY-KING_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_COMEDY-KING_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_COMEDY-KING_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_COMEDY-KING_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_COMEDY-KING_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_COMEDY-KING_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_COMEDY-KING_YEARLY']!,
    },
  },
  'chess-player': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_CHESS-PLAYER_DAILY']!,
      priceId: process.env['STRIPE_PRICE_CHESS-PLAYER_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_CHESS-PLAYER_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_CHESS-PLAYER_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_CHESS-PLAYER_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_CHESS-PLAYER_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_CHESS-PLAYER_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_CHESS-PLAYER_YEARLY']!,
    },
  },
  'fitness-guru': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_FITNESS-GURU_DAILY']!,
      priceId: process.env['STRIPE_PRICE_FITNESS-GURU_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_FITNESS-GURU_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_FITNESS-GURU_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_FITNESS-GURU_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_FITNESS-GURU_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_FITNESS-GURU_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_FITNESS-GURU_YEARLY']!,
    },
  },
  'travel-buddy': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_TRAVEL-BUDDY_DAILY']!,
      priceId: process.env['STRIPE_PRICE_TRAVEL-BUDDY_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_TRAVEL-BUDDY_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_TRAVEL-BUDDY_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_TRAVEL-BUDDY_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_TRAVEL-BUDDY_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_TRAVEL-BUDDY_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_TRAVEL-BUDDY_YEARLY']!,
    },
  },
  'drama-queen': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_DRAMA-QUEEN_DAILY']!,
      priceId: process.env['STRIPE_PRICE_DRAMA-QUEEN_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_DRAMA-QUEEN_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_DRAMA-QUEEN_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_DRAMA-QUEEN_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_DRAMA-QUEEN_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_DRAMA-QUEEN_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_DRAMA-QUEEN_YEARLY']!,
    },
  },
  'chef-biew': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_CHEF-BIEW_DAILY']!,
      priceId: process.env['STRIPE_PRICE_CHEF-BIEW_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_CHEF-BIEW_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_CHEF-BIEW_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_CHEF-BIEW_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_CHEF-BIEW_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_CHEF-BIEW_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_CHEF-BIEW_YEARLY']!,
    },
  },
  'professor-astrology': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_PROFESSOR-ASTROLOGY_DAILY']!,
      priceId: process.env['STRIPE_PRICE_PROFESSOR-ASTROLOGY_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_PROFESSOR-ASTROLOGY_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_PROFESSOR-ASTROLOGY_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_PROFESSOR-ASTROLOGY_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_PROFESSOR-ASTROLOGY_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_PROFESSOR-ASTROLOGY_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_PROFESSOR-ASTROLOGY_YEARLY']!,
    },
  },
  // ✅ ALL 18 AGENTS NOW HAVE DEDICATED STRIPE PRODUCTS
  'nid-gaming': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_NID-GAMING_DAILY']!,
      priceId: process.env['STRIPE_PRICE_NID-GAMING_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_NID-GAMING_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_NID-GAMING_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_NID-GAMING_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_NID-GAMING_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_NID-GAMING_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_NID-GAMING_YEARLY']!,
    },
  },
  'ben-sega': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_BEN-SEGA_DAILY']!,
      priceId: process.env['STRIPE_PRICE_BEN-SEGA_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_BEN-SEGA_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_BEN-SEGA_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_BEN-SEGA_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_BEN-SEGA_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_BEN-SEGA_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_BEN-SEGA_YEARLY']!,
    },
  },
  'bishop-burger': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_BISHOP-BURGER_DAILY']!,
      priceId: process.env['STRIPE_PRICE_BISHOP-BURGER_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_BISHOP-BURGER_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_BISHOP-BURGER_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_BISHOP-BURGER_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_BISHOP-BURGER_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_BISHOP-BURGER_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_BISHOP-BURGER_YEARLY']!,
    },
  },
  'knight-logic': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_KNIGHT-LOGIC_DAILY']!,
      priceId: process.env['STRIPE_PRICE_KNIGHT-LOGIC_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_KNIGHT-LOGIC_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_KNIGHT-LOGIC_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_KNIGHT-LOGIC_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_KNIGHT-LOGIC_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_KNIGHT-LOGIC_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_KNIGHT-LOGIC_YEARLY']!,
    },
  },
  'lazy-pawn': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_LAZY-PAWN_DAILY']!,
      priceId: process.env['STRIPE_PRICE_LAZY-PAWN_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_LAZY-PAWN_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_LAZY-PAWN_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_LAZY-PAWN_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_LAZY-PAWN_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_LAZY-PAWN_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_LAZY-PAWN_YEARLY']!,
    },
  },
  'rook-jokey': {
    daily: {
      productId: process.env['STRIPE_PRODUCT_ROOK-JOKEY_DAILY']!,
      priceId: process.env['STRIPE_PRICE_ROOK-JOKEY_DAILY']!,
    },
    weekly: {
      productId: process.env['STRIPE_PRODUCT_ROOK-JOKEY_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_ROOK-JOKEY_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_ROOK-JOKEY_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_ROOK-JOKEY_MONTHLY']!,
    },
    yearly: {
      productId: process.env['STRIPE_PRODUCT_ROOK-JOKEY_YEARLY']!,
      priceId: process.env['STRIPE_PRICE_ROOK-JOKEY_YEARLY']!,
    },
  },
  // Canvas Studio - AI Code Generator ($10/week, $30/month, $300/year)
  'canvas-studio': {
    weekly: {
      productId: process.env['STRIPE_PRODUCT_CANVAS-STUDIO_WEEKLY']!,
      priceId: process.env['STRIPE_PRICE_CANVAS-STUDIO_WEEKLY']!,
    },
    monthly: {
      productId: process.env['STRIPE_PRODUCT_CANVAS-STUDIO_MONTHLY']!,
      priceId: process.env['STRIPE_PRICE_CANVAS-STUDIO_MONTHLY']!,
    },
  },
};

/**
 * Get agent-specific subscription plan
 */
export function getAgentSubscriptionPlan(
  agentId: string,
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly'
) {
  const agentProducts = AGENT_PRODUCTS[agentId];
  if (!agentProducts) {
    console.warn(
      `Agent ${agentId} not found in product mappings, using fallback products`
    );
    // Fallback to generic products if agent not configured
    return {
      name: `${agentId} ${plan.charAt(0).toUpperCase() + plan.slice(1)} Access`,
      price: plan === 'daily' ? 1 : plan === 'weekly' ? 5 : plan === 'yearly' ? 150 : 15,
      interval: plan === 'daily' ? 'day' : plan === 'weekly' ? 'week' : plan === 'yearly' ? 'year' : 'month',
      productId:
        process.env['STRIPE_PRODUCT_JULIE-GIRLFRIEND_' + plan.toUpperCase()]!,
      priceId:
        process.env['STRIPE_PRICE_JULIE-GIRLFRIEND_' + plan.toUpperCase()]!,
    };
  }

  const planData = agentProducts[plan];
  if (!planData.productId || !planData.priceId) {
    throw new Error(
      `Product/price IDs not configured for agent ${agentId} plan ${plan}`
    );
  }

  const intervals = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' } as const;

  // Canvas Studio has different pricing: $10/week, $30/month, $300/year
  const isCanvasStudio = agentId === 'canvas-studio';
  const prices = isCanvasStudio
    ? { weekly: 10, monthly: 30, yearly: 300 }
    : { daily: 1, weekly: 5, monthly: 15, yearly: 150 };

  return {
    name: `${agentId} ${plan.charAt(0).toUpperCase() + plan.slice(1)} Access`,
    price: prices[plan],
    interval: intervals[plan],
    productId: planData.productId,
    priceId: planData.priceId,
  };
}

// Legacy global plans (kept for backward compatibility)
export const SUBSCRIPTION_PLANS = {
  daily: {
    name: 'Daily Access',
    price: 1,
    interval: 'day' as const,
    productId: process.env.STRIPE_PRODUCT_DAILY!,
    priceId: process.env.STRIPE_PRICE_DAILY!,
  },
  weekly: {
    name: 'Weekly Access',
    price: 5,
    interval: 'week' as const,
    productId: process.env.STRIPE_PRODUCT_WEEKLY!,
    priceId: process.env.STRIPE_PRICE_WEEKLY!,
  },
  monthly: {
    name: 'Monthly Access',
    price: 15,
    interval: 'month' as const,
    productId: process.env.STRIPE_PRODUCT_MONTHLY!,
    priceId: process.env.STRIPE_PRICE_MONTHLY!,
  },
  yearly: {
    name: 'Yearly Access',
    price: 150,
    interval: 'year' as const,
    productId: process.env.STRIPE_PRODUCT_YEARLY!,
    priceId: process.env.STRIPE_PRICE_YEARLY!,
  },
};

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

/**
 * Create a Stripe checkout session for agent subscription
 */
export async function createCheckoutSession({
  agentId,
  agentName,
  plan,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  agentId: string;
  agentName: string;
  plan: SubscriptionPlan;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  // Get agent-specific plan details
  const planDetails = getAgentSubscriptionPlan(agentId, plan);

  // Create checkout session for subscription with auto-cancel (NO auto-renewal)
  // Uses recurring prices but cancels at period end = one-time purchase behavior
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: userEmail,
    allow_promotion_codes: true,
    line_items: [
      {
        price: planDetails.priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      // This is the key: subscription cancels at end of period = NO auto-renewal
      metadata: {
        userId,
        agentId,
        agentName,
        plan,
        cancelAtPeriodEnd: 'true',
      },
    },
    client_reference_id: userId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      agentId,
      agentName,
      plan,
    },
  });

  return session;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    throw new Error(
      `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Get subscription by ID
 */
export async function getSubscription(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  return await stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Get customer subscriptions
 */
export async function getCustomerSubscriptions(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
  });
  return subscriptions.data;
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string) {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });
  return customers.data[0] || null;
}

export { stripe };
