import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const PLAN_TEMPLATES = [
  {
    key: 'daily',
    name: 'Daily Agent Access',
    description: '$1 per day per agent',
    defaultPrice: 0.99,
    billingPeriod: 'daily',
    interval: 'day',
  },
  {
    key: 'weekly',
    name: 'Weekly Agent Access',
    description: '$5 per week per agent',
    defaultPrice: 4.99,
    billingPeriod: 'weekly',
    interval: 'week',
  },
  {
    key: 'monthly',
    name: 'Monthly Agent Access',
    description: '$15 per month per agent',
    defaultPrice: 14.99,
    billingPeriod: 'monthly',
    interval: 'month',
  },
];

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const sessionId = request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({ message: 'No session ID' }, { status: 401 });
    }

    const sessionUser = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() },
      },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Get active agent subscriptions for this user
    let activeSubscriptions: any[] = [];
    try {
      activeSubscriptions = await prisma.agentSubscription.findMany({
        where: {
          userId: sessionUser.id,
          status: 'active',
          expiryDate: { gt: new Date() },
        },
        include: {
          agent: {
            select: {
              agentId: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      console.error('Billing: failed to fetch subscriptions:', e);
    }

    // Get recent transactions (may not exist for all users)
    let recentTransactions: any[] = [];
    try {
      recentTransactions = await prisma.transaction.findMany({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    } catch (e) {
      console.error('Billing: failed to fetch transactions:', e);
    }

    // Calculate totals
    const totalActiveSubscriptions = activeSubscriptions.length;
    const monthlyTotal = activeSubscriptions.reduce((sum: number, sub: any) => {
      if (sub.plan === 'monthly') return sum + sub.price;
      if (sub.plan === 'weekly') return sum + (sub.price * 4.33);
      if (sub.plan === 'daily') return sum + (sub.price * 30);
      return sum;
    }, 0);

    // Build plan options with status
    const planOptions = PLAN_TEMPLATES.map((template) => ({
      id: template.key,
      key: template.key,
      name: template.name,
      description: template.description,
      price: template.defaultPrice,
      currency: 'USD',
      billingPeriod: template.billingPeriod,
      interval: template.interval,
      status: 'not_active' as const,
      isActive: false,
    }));

    // Calculate next renewal date from active subscriptions
    const nextRenewalDate = activeSubscriptions.length > 0
      ? new Date(Math.min(...activeSubscriptions.map((s: any) => s.expiryDate.getTime())))
      : null;

    // Derive billing period from the most recent active subscription
    const primaryPlan = activeSubscriptions.length > 0 ? activeSubscriptions[0].plan : 'monthly';

    const billingData = {
      currentPlan: totalActiveSubscriptions > 0 ? {
        name: `${totalActiveSubscriptions} Active Agent${totalActiveSubscriptions > 1 ? 's' : ''}`,
        type: 'agent_subscriptions',
        price: monthlyTotal,
        currency: 'USD',
        period: primaryPlan,
        status: 'active',
        renewalDate: nextRenewalDate?.toISOString().split('T')[0] || null,
        daysUntilRenewal: nextRenewalDate
          ? Math.max(0, Math.ceil((nextRenewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0,
      } : {
        name: 'No Active Subscriptions',
        type: 'none',
        price: 0,
        currency: 'USD',
        period: 'monthly',
        status: 'inactive',
        renewalDate: null,
        daysUntilRenewal: 0,
      },
      planOptions,
      activeSubscriptions: activeSubscriptions.map((sub: any) => ({
        id: sub.id,
        agentId: sub.agentId,
        agentName: sub.agent?.name || sub.agentId,
        plan: sub.plan,
        price: sub.price,
        status: sub.status,
        startDate: sub.startDate?.toISOString().split('T')[0] || '',
        expiryDate: sub.expiryDate?.toISOString().split('T')[0] || '',
        autoRenew: sub.autoRenew,
      })),
      usage: {
        currentPeriod: {
          apiCalls: { used: 0, limit: 10000, percentage: 0 },
          storage: { used: 0, limit: 10240, percentage: 0, unit: 'MB' },
        },
        billingCycle: {
          start: new Date().toISOString().split('T')[0],
          end: nextRenewalDate?.toISOString().split('T')[0] ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      },
      invoices: [],
      paymentMethods: [],
      billingHistory: recentTransactions.map((tx: any) => ({
        id: tx.id,
        date: tx.createdAt?.toISOString().split('T')[0] || '',
        description: tx.notes || 'Agent Subscription',
        amount: `$${(tx.amount || 0).toFixed(2)}`,
        status: tx.status || 'completed',
        method: typeof tx.paymentMethod === 'string' ? tx.paymentMethod : (tx.paymentMethod?.type || 'card'),
      })),
      upcomingCharges: activeSubscriptions
        .filter((sub: any) => sub.autoRenew)
        .map((sub: any) => ({
          description: `${sub.agent?.name || sub.agentId} - ${sub.plan} renewal`,
          amount: `$${sub.price.toFixed(2)}`,
          date: sub.expiryDate?.toISOString().split('T')[0] || '',
        })),
      costBreakdown: {
        subscription: monthlyTotal,
        usage: 0,
        taxes: monthlyTotal * 0.08,
        total: monthlyTotal * 1.08,
      },
    };

    return NextResponse.json({ success: true, data: billingData });
  } catch (error) {
    console.error('Billing API error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
