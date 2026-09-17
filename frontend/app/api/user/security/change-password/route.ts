import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Get session ID from HttpOnly cookie (check both names for compatibility)
    const sessionId = request.cookies.get('session_id')?.value ||
                      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'No session ID' },
        { status: 401 }
      );
    }

    // Find user with valid session
    const sessionUser = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() },
      },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Current password and new password are required',
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'New password must be at least 8 characters long',
        },
        { status: 400 }
      );
    }

    // Verify current password
    if (!sessionUser.password) {
      return NextResponse.json(
        { success: false, message: 'No password set for this account' },
        { status: 400 }
      );
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      sessionUser.password
    );
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    const now = new Date();

    // Update password in users table
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        password: hashedNewPassword,
        updatedAt: now,
      },
    });

    // Update passwordLastChanged in userSecurity table
    await prisma.userSecurity.upsert({
      where: { userId: sessionUser.id },
      update: {
        passwordLastChanged: now,
        updatedAt: now,
      },
      create: {
        userId: sessionUser.id,
        passwordLastChanged: now,
        twoFactorEnabled: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Password changed successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
