import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
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
      select: {
        id: true,
        email: true,
        name: true,
        preferences: true,
      },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const sessionUserId = sessionUser.id;

    if (params.userId && params.userId !== sessionUserId) {
      console.warn('Preferences update mismatch. Using session user.', {
        sessionUserId,
        requestedUserId: params.userId,
      });
    }

    const targetUserId = sessionUserId;

    const body = await request.json();
    const preferences = body.preferences || {};

    const allowedPreferenceKeys: Array<
      | 'emailNotifications'
      | 'smsNotifications'
      | 'marketingEmails'
      | 'productUpdates'
    > = [
      'emailNotifications',
      'smsNotifications',
      'marketingEmails',
      'productUpdates',
    ];

    const sanitizedPreferences: Record<string, boolean> = {};

    for (const key of allowedPreferenceKeys) {
      const value = preferences[key];
      if (typeof value === 'boolean') {
        sanitizedPreferences[key] = value;
      }
    }

    if (!Object.keys(sanitizedPreferences).length) {
      return NextResponse.json(
        { message: 'No valid preferences supplied' },
        { status: 400 }
      );
    }

    const existingPreferences = (sessionUser.preferences as Record<string, any>) || {};
    const mergedPreferences = {
      ...existingPreferences,
      ...sanitizedPreferences,
    };

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        preferences: mergedPreferences,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        preferences: true,
      },
    });

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Preferences updated successfully',
        preferences: mergedPreferences,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Profile preferences update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
