import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, checkAndAwardBadges, checkAndUpdateAchievements } from '@/lib/rewards-engine';

export const dynamic = 'force-dynamic';

export async function POST(
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

    // Check and award new badges + achievements
    const [newBadges, newlyCompletedIds] = await Promise.all([
      checkAndAwardBadges(userId),
      checkAndUpdateAchievements(userId),
    ]);

    const totalPointsEarned = newBadges.length * 50 + newlyCompletedIds.length * 100;

    return NextResponse.json({
      success: true,
      newBadges: newBadges.map(b => ({ id: b.id, name: b.name, icon: b.icon })),
      newAchievements: newlyCompletedIds,
      totalNewBadges: newBadges.length,
      totalNewAchievements: newlyCompletedIds.length,
      totalPointsEarned,
      message: (newBadges.length + newlyCompletedIds.length) > 0
        ? `Congratulations! You've unlocked ${newBadges.length} badge(s) and ${newlyCompletedIds.length} achievement(s)!`
        : 'No new achievements unlocked yet. Keep going!',
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check achievements' },
      { status: 500 }
    );
  }
}
