import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST /api/user/security/2fa/backup-codes
 * Regenerate backup codes for 2FA
 */
export async function POST(request: NextRequest) {
  try {
    // Get session ID from HttpOnly cookie
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

    // Check if 2FA is enabled
    if (!sessionUser.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, message: '2FA must be enabled to regenerate backup codes' },
        { status: 400 }
      );
    }

    const { password } = await request.json();

    // Verify password before regenerating
    if (!password || !sessionUser.password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, sessionUser.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 400 }
      );
    }

    // Generate new backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }

    const now = new Date();

    // Update userSecurity table
    await prisma.userSecurity.updateMany({
      where: { userId: sessionUser.id },
      data: {
        backupCodes,
        updatedAt: now,
      },
    });

    // Update user table
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        backupCodes,
        updatedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      backupCodes,
      message: 'Backup codes regenerated successfully',
    });
  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
