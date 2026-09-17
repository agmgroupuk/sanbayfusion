import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/rewards-engine';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const sessionId = request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionUser = await getSessionUser(sessionId);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    const userId = sessionUser.id;

    // Fetch real points transactions from DB
    const transactions = await prisma.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const history = transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balance: t.balance,
      description: t.description,
      category: t.source,
      timestamp: t.createdAt.toISOString(),
      metadata: t.metadata || {},
    }));

    // Calculate totals
    const [totalEarnedAgg, totalRedeemedAgg] = await Promise.all([
      prisma.pointsTransaction.aggregate({
        where: { userId, type: 'earned' },
        _sum: { amount: true },
      }),
      prisma.pointsTransaction.aggregate({
        where: { userId, type: 'spent' },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      history,
      summary: {
        totalTransactions: transactions.length,
        totalEarned: totalEarnedAgg._sum.amount || 0,
        totalRedeemed: Math.abs(totalRedeemedAgg._sum.amount || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching points history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch points history' },
      { status: 500 }
    );
  }
}
