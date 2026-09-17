import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, checkAndAwardBadges } from '@/lib/rewards-engine';

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

    // Ensure badges are up to date
    await checkAndAwardBadges(userId);

    // Fetch from DB
    const badges = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      badges: badges.map((b, i) => ({
        id: b.badgeId,
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: 'achievement',
        earnedAt: b.earnedAt.toISOString(),
        rarity: b.rarity,
        displayOrder: i + 1,
      })),
      total: badges.length,
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}
