import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionId =
      request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { message: 'No session ID' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { sessionId, sessionExpiry: { gt: new Date() } },
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
        { message: 'Invalid or expired session' },
        { status: 401 }
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
  } catch (error) {
    console.error('Error in /api/user/profile (GET):', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionId =
      request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { message: 'No session ID' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { sessionId, sessionExpiry: { gt: new Date() } },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Only allow updating safe fields
    const allowedFields: Record<string, unknown> = {};
    const safeKeys = [
      'name',
      'bio',
      'phoneNumber',
      'location',
      'timezone',
      'profession',
      'company',
      'socialLinks',
      'preferences',
      'avatar',
      'image',
    ];
    for (const key of safeKeys) {
      if (body[key] !== undefined) {
        allowedFields[key] = body[key];
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: allowedFields,
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

    return NextResponse.json({
      success: true,
      profile: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        lastLoginAt: updated.lastLoginAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error in /api/user/profile (PUT):', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
