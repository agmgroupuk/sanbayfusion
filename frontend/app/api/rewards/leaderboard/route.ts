import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserLevel } from '@/lib/rewards-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get top users by real points balance from DB
    const topUsers = await prisma.user.findMany({
      where: { totalPointsEarned: { gt: 0 } },
      select: {
        id: true,
        name: true,
        avatar: true,
        totalPointsEarned: true,
        _count: {
          select: {
            earnedBadges: true,
            earnedAchievements: true,
          },
        },
      },
      orderBy: { totalPointsEarned: 'desc' },
      take: 20,
    });

    const leaderboard = topUsers.map((user, index) => {
      const level = getUserLevel(user.totalPointsEarned);
      return {
        userId: user.id,
        username: user.name || `User ${user.id.slice(0, 6)}`,
        avatar: user.avatar,
        points: user.totalPointsEarned,
        level: level.level,
        levelName: level.name,
        badges: user._count.earnedBadges,
        achievements: user._count.earnedAchievements,
        rank: index + 1,
      };
    });

    return NextResponse.json({
      success: true,
      leaderboard,
      total: leaderboard.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
