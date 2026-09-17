import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    // Verify session
    const sessionUser = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() },
      },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    const userId = sessionUser.id;

    // Get user's last login to calculate streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const lastLogin = user.lastLoginAt || user.createdAt;
    
    // Calculate days since last login
    const lastLoginDate = new Date(lastLogin);
    const daysSinceLastLogin = Math.floor(
      (now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Streak logic:
    // - If last login was today: streak continues
    // - If last login was yesterday: streak +1
    // - If last login was >1 day ago: streak resets to 1
    
    // For now, calculate approximate streak based on account age and activity
    const accountAgeDays = Math.floor(
      (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Get recent interactions count (last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await prisma.chatAnalyticsInteraction.count({
      where: {
        userId,
        createdAt: { gte: weekAgo },
      },
    });

    // Estimate streak based on recent activity
    let currentStreak = 1;
    if (recentActivity >= 7) {
      currentStreak = 7;
    } else if (recentActivity >= 5) {
      currentStreak = 5;
    } else if (recentActivity >= 3) {
      currentStreak = 3;
    } else if (recentActivity >= 1) {
      currentStreak = daysSinceLastLogin <= 1 ? 2 : 1;
    }

    // Update last login
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: now },
    });

    // Calculate multiplier
    let multiplier = 1.0;
    if (currentStreak >= 30) multiplier = 1.5;
    else if (currentStreak >= 14) multiplier = 1.3;
    else if (currentStreak >= 7) multiplier = 1.2;
    else if (currentStreak >= 3) multiplier = 1.1;

    return NextResponse.json({
      success: true,
      currentStreak,
      longestStreak: Math.max(currentStreak, accountAgeDays > 30 ? 7 : currentStreak),
      multiplier,
      streakBonusPoints: currentStreak >= 7 ? 50 : currentStreak >= 3 ? 20 : 0,
      message: currentStreak >= 7 
        ? 'Amazing! 🔥 You\'re on fire with a 7+ day streak!' 
        : currentStreak >= 3 
          ? 'Great job! Keep your streak going!'
          : 'Welcome back! Start building your streak.',
    });
  } catch (error) {
    console.error('Error updating streak:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update streak' },
      { status: 500 }
    );
  }
}

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

    const sessionUser = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() },
      },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }

    // Return current streak info
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { lastLoginAt: true, createdAt: true },
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await prisma.chatAnalyticsInteraction.count({
      where: {
        userId: sessionUser.id,
        createdAt: { gte: weekAgo },
      },
    });

    const currentStreak = Math.min(recentActivity, 7);

    return NextResponse.json({
      success: true,
      currentStreak,
      longestStreak: currentStreak,
      multiplier: currentStreak >= 7 ? 1.2 : currentStreak >= 3 ? 1.1 : 1.0,
    });
  } catch (error) {
    console.error('Error fetching streak:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch streak' },
      { status: 500 }
    );
  }
}
