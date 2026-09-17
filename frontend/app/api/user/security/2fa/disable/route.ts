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

    const { password } = await request.json();

    // Verify password before disabling 2FA
    if (password && sessionUser.password) {
      const isValidPassword = await bcrypt.compare(
        password,
        sessionUser.password
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, message: 'Invalid password' },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    // Disable 2FA in userSecurity
    await prisma.userSecurity.updateMany({
      where: { userId: sessionUser.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
        tempTwoFactorSecret: null,
        tempBackupCodes: [],
        updatedAt: now,
      },
    });

    // Also update the users table
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
        updatedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
