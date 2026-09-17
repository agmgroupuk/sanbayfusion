import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, checkAndUpdateAchievements, ACHIEVEMENT_DEFINITIONS } from '@/lib/rewards-engine';

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

    // Ensure achievements are up to date
    await checkAndUpdateAchievements(userId);

    // Fetch from DB
    const dbAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    // Map with full definitions
    const achievements = ACHIEVEMENT_DEFINITIONS.map(def => {
      const dbEntry = dbAchievements.find(a => a.achievementId === def.id);
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.source,
        icon: def.icon,
        points: def.points,
        rarity: def.target >= 500 ? 'legendary' : def.target >= 100 ? 'epic' : def.target >= 10 ? 'rare' : 'common',
        progress: {
          current: dbEntry?.progress || 0,
          target: def.target,
          percentage: dbEntry ? Math.min(Math.round((dbEntry.progress / def.target) * 100), 100) : 0,
        },
        completed: dbEntry?.completed || false,
        completedAt: dbEntry?.completedAt?.toISOString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      achievements,
      summary: {
        total: achievements.length,
        completed: achievements.filter(a => a.completed).length,
        inProgress: achievements.filter(a => !a.completed && a.progress.current > 0).length,
      },
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
