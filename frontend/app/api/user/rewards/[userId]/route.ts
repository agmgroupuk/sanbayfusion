import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getFullRewardsData, checkAndAwardBadges, checkAndUpdateAchievements } from '@/lib/rewards-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const sessionId = request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({ message: 'No session ID' }, { status: 401 });
    }

    const sessionUser = await getSessionUser(sessionId);
    if (!sessionUser) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const userId = sessionUser.id;

    // Ensure badges and achievements are up to date
    await checkAndAwardBadges(userId);
    await checkAndUpdateAchievements(userId);

    const data = await getFullRewardsData(userId);
    if (!data) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data, rewards: data });
  } catch (error) {
    console.error('Rewards fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
