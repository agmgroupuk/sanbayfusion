import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

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

    // Generate secret and QR code for 2FA setup
    const secret = authenticator.generateSecret();
    const appName = 'Sanbay Fusion';
    const accountName = sessionUser.email;

    const otpauth = authenticator.keyuri(accountName, appName, secret);
    const qrCodeDataURL = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }

    const now = new Date();

    // Store the secret temporarily (not enabled yet until verified)
    await prisma.userSecurity.upsert({
      where: { userId: sessionUser.id },
      update: {
        tempTwoFactorSecret: secret,
        tempBackupCodes: backupCodes,
        updatedAt: now,
      },
      create: {
        userId: sessionUser.id,
        tempTwoFactorSecret: secret,
        tempBackupCodes: backupCodes,
        twoFactorEnabled: false,
      },
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataURL,
      secret: secret,
      backupCodes: backupCodes,
      manualEntryKey: secret,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify and enable 2FA
export async function PUT(request: NextRequest) {
  try {
    // Get session ID from HttpOnly cookie (check both names for compatibility)
    const sessionId = request.cookies.get('session_id')?.value ||
                      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({ message: 'No session ID' }, { status: 401 });
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
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { message: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Get temp secret from userSecurity
    const userSecurity = await prisma.userSecurity.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!userSecurity?.tempTwoFactorSecret) {
      return NextResponse.json(
        { message: 'No pending 2FA setup found. Please start setup again.' },
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
        { message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Enable 2FA permanently
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
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Disable 2FA
export async function DELETE(request: NextRequest) {
  try {
    // Get session ID from HttpOnly cookie (check both names for compatibility)
    const sessionId = request.cookies.get('session_id')?.value ||
                      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({ message: 'No session ID' }, { status: 401 });
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
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const { password } = await request.json();

    // Verify password before disabling 2FA
    const bcrypt = require('bcryptjs');
    const isValidPassword = sessionUser.password
      ? await bcrypt.compare(password, sessionUser.password)
      : false;

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid password' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Disable 2FA
    await prisma.userSecurity.updateMany({
      where: { userId: sessionUser.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
        updatedAt: now,
      },
    });

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
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
