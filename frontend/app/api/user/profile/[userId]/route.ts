import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Authenticate via session cookie
    const sessionId =
      request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      );
    }

    const sessionUser = await prisma.user.findFirst({
      where: { sessionId, sessionExpiry: { gt: new Date() } },
      select: { id: true },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Look up the requested user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        avatar: true,
        bio: true,
        phoneNumber: true,
        location: true,
        timezone: true,
        profession: true,
        company: true,
        socialLinks: true,
        preferences: true,
        authMethod: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        isActive: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
      },
    });
  } catch (err: any) {
    console.error('[/api/user/profile/[userId]] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
