import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { checkLockout, recordFailedAttempt, resetLockoutOnSuccess } from '@/lib/account-lockout';
import { sendLoginOTPEmail } from '@/lib/services/emailNotifications';
import { verifyTurnstileToken } from '@/lib/turnstile';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password, turnstileToken } = await request.json();

    // Verify Turnstile token
    if (turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(turnstileToken);
      if (!turnstileResult.success) {
        return NextResponse.json(
          { success: false, message: 'Security verification failed. Please try again.' },
          { status: 403 }
        );
      }
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // ── Check lockout FIRST ──
    const lockStatus = checkLockout(normalizedEmail);
    if (lockStatus.locked) {
      const status = lockStatus.permanent ? 423 : 429;
      return NextResponse.json(
        {
          success: false,
          message: lockStatus.message,
          ...(lockStatus.retryAfter && { retryAfter: lockStatus.retryAfter }),
          ...(lockStatus.permanent && { permanent: true }),
        },
        { status }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      recordFailedAttempt(normalizedEmail);
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password
    const isValid = user.password
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!isValid) {
      const failResult = recordFailedAttempt(normalizedEmail);
      const statusCode = failResult.locked
        ? failResult.permanent
          ? 423
          : 429
        : 401;
      return NextResponse.json(
        {
          success: false,
          message: failResult.message || 'Invalid credentials',
          ...(failResult.retryAfter && { retryAfter: failResult.retryAfter }),
          ...(failResult.permanent && { permanent: true }),
          ...(failResult.attemptsRemaining !== undefined && {
            attemptsRemaining: failResult.attemptsRemaining,
          }),
        },
        { status: statusCode }
      );
    }

    // ── Password valid — reset lockout ──
    resetLockoutOnSuccess(normalizedEmail);

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please verify your email before logging in.',
          requiresVerification: true,
          userId: user.id,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // ── Check if 2FA (TOTP) is enabled ──
    if (user.twoFactorEnabled) {
      const tempToken = crypto.randomBytes(32).toString('hex');
      const tempTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { tempToken, tempTokenExpiry },
      });

      return NextResponse.json({
        success: true,
        requires2FA: true,
        tempToken,
        userId: user.id,
        message: '2FA verification required',
      });
    }

    // ── No TOTP — require email OTP ──
    const loginOTPCode = Math.floor(100000 + Math.random() * 900000).toString();
    const loginOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const tempToken = crypto.randomBytes(32).toString('hex');
    const tempTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: loginOTPCode,
        emailVerificationExpires: loginOTPExpiry,
        tempToken,
        tempTokenExpiry,
      },
    });

    // Send login OTP email (fire & forget)
    sendLoginOTPEmail(user.email, user.name || user.email.split('@')[0], loginOTPCode).catch(
      (err) => console.error('Login OTP email error:', err.message)
    );

    return NextResponse.json({
      success: true,
      requiresEmailOTP: true,
      tempToken,
      userId: user.id,
      email: user.email,
      message: 'Email verification code sent',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to login' },
      { status: 500 }
    );
  }
}
