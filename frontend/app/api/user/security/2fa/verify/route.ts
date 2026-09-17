import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticator } from 'otplib';

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

    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        {
          success: false,
          message: 'Valid 6-digit verification code is required',
        },
        { status: 400 }
      );
    }

    // Get temp secret from userSecurity
    const userSecurity = await prisma.userSecurity.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!userSecurity?.tempTwoFactorSecret) {
      return NextResponse.json(
        {
          success: false,
          message: 'No pending 2FA setup found. Please start setup again.',
        },
        { status: 400 }
      );
    }

    // Verify the code using the temporary secret
    const isValid = authenticator.verify({
      token: code,
      secret: userSecurity.tempTwoFactorSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid verification code. Please try again.',
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Enable 2FA permanently - update userSecurity
    await prisma.userSecurity.update({
      where: { userId: sessionUser.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: userSecurity.tempTwoFactorSecret,
        backupCodes: userSecurity.tempBackupCodes || [],
        tempTwoFactorSecret: null,
        tempBackupCodes: [],
        updatedAt: now,
      },
    });

    // Also update the users table
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: userSecurity.tempTwoFactorSecret,
        backupCodes: userSecurity.tempBackupCodes || [],
        updatedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes: userSecurity.tempBackupCodes || [],
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
