import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { REWARDS_CATALOG, getSessionUser, spendPoints, getUserLevel } from '@/lib/rewards-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const { rewardId } = await request.json();

    if (!rewardId) {
      return NextResponse.json(
        { success: false, message: 'Reward ID is required' },
        { status: 400 }
      );
    }

    const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
    if (!reward) {
      return NextResponse.json(
        { success: false, message: 'Invalid reward ID' },
        { status: 400 }
      );
    }

    // Check user's real points balance
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { pointsBalance: true, totalPointsEarned: true },
    });

    if (!user || user.pointsBalance < reward.cost) {
      return NextResponse.json(
        { success: false, message: `Insufficient points. You have ${user?.pointsBalance || 0} points, but this reward costs ${reward.cost} points.` },
        { status: 400 }
      );
    }

    // Check level requirements
    if (reward.requirements?.minLevel) {
      const level = getUserLevel(user.totalPointsEarned);
      if (level.level < reward.requirements.minLevel) {
        return NextResponse.json(
          { success: false, message: `You need to be level ${reward.requirements.minLevel} to redeem this reward. You are level ${level.level}.` },
          { status: 400 }
        );
      }
    }

    // Generate unique redemption code
    const code = `SANBAY-${rewardId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Spend points and create redemption record in a transaction
    await spendPoints(sessionUser.id, reward.cost, 'redemption', `Redeemed: ${reward.name}`, rewardId);

    const redemption = await prisma.rewardRedemption.create({
      data: {
        userId: sessionUser.id,
        rewardId,
        rewardName: reward.name,
        pointsCost: reward.cost,
        code,
        status: 'redeemed',
        redeemedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully redeemed ${reward.name}!`,
      transactionId: redemption.id,
      code,
      instructions: getRedemptionInstructions(rewardId),
      expiresAt: redemption.expiresAt?.toISOString(),
    });
  } catch (error: any) {
    console.error('Error redeeming reward:', error);
    if (error.message === 'Insufficient points') {
      return NextResponse.json(
        { success: false, message: 'Insufficient points' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}

function getRedemptionInstructions(rewardId: string): string {
  const instructions: Record<string, string> = {
    'discount_10': 'Your 10% discount will be automatically applied to your next billing cycle.',
    'discount_25': 'Your 25% discount will be automatically applied to your next billing cycle.',
    'extra_tokens_1000': 'Your bonus tokens have been added to your account balance.',
    'extra_tokens_5000': 'Your bonus tokens have been added to your account balance.',
    'priority_support': 'Your priority support status is now active. All support tickets will be prioritized.',
    'early_access': 'You now have early access to new features. Check the Lab section for exclusive previews.',
    'custom_agent': 'Our team will contact you within 48 hours to discuss your custom agent requirements.',
    'free_month': 'Your free month will be applied to your next billing cycle.',
  };
  return instructions[rewardId] || 'Your reward has been redeemed successfully.';
}
