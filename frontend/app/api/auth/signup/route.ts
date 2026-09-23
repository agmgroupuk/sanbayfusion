import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendVerificationCodeEmail, notifyAdminNewUser } from '@/lib/services/emailNotifications';
import { awardPoints, processReferralSignup, checkAndAwardBadges, POINTS_CONFIG } from '@/lib/rewards-engine';
import { verifyTurnstileToken } from '@/lib/turnstile';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signup
 * Register a new user with email and password
 *
 * Body:
 * {
 *   email: string
 *   name: string
 *   password: string
 *   authMethod: 'password'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name, password, authMethod, referralCode, turnstileToken } = await request.json();

    // Verify Turnstile token
    if (turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(turnstileToken);
      if (!turnstileResult.success) {
        return NextResponse.json(
          { message: 'Security verification failed. Please try again.' },
          { status: 403 }
        );
      }
    }

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists using Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit email verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new user with Prisma (no session yet — requires email verification)
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        password: hashedPassword,
        authMethod: authMethod === 'passwordless' ? 'passwordless' : 'password',
        emailVerificationCode: verificationCode,
        emailVerificationExpires: codeExpiry,
      }
    });

    // Award signup bonus points + process referral (async, don't block response)
    (async () => {
      try {
        await awardPoints(newUser.id, POINTS_CONFIG.signup_bonus, 'signup', 'Welcome bonus for joining Sanbay Fusion');
        await checkAndAwardBadges(newUser.id);
        if (referralCode && typeof referralCode === 'string') {
          await processReferralSignup(newUser.id, referralCode.trim().toUpperCase());
        }
      } catch (err) {
        console.error('Failed to process signup rewards:', err);
      }
    })();

    // Send admin notification email (async, don't block response)
    notifyAdminNewUser({
      email: newUser.email,
      name: newUser.name || '',
    }).catch((err) => console.error('Failed to send admin notification:', err));

    // Send verification code email directly (no backend proxy)
    sendVerificationCodeEmail(
      newUser.email,
      newUser.name || newUser.email.split('@')[0],
      verificationCode
    ).catch((err) => console.error('Failed to send verification email:', err));

    return NextResponse.json(
      {
        message: 'Please verify your email',
        success: true,
        requiresVerification: true,
        userId: newUser.id,
        email: newUser.email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Failed to create account' },
      { status: 500 }
    );
  }
}
