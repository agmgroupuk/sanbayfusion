import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { sendWelcomeEmailDark } from '@/lib/services/emailNotifications';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/verify-email
 * Verify email with 6-digit code after signup
 */
export async function POST(request: NextRequest) {
    try {
        const { userId, code, turnstileToken } = await request.json();

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

        if (!userId || !code) {
            return NextResponse.json(
                { message: 'User ID and verification code are required' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.json(
                { message: 'Email already verified. Please login.' },
                { status: 400 }
            );
        }

        // Check code
        if (!user.emailVerificationCode || user.emailVerificationCode !== code) {
            return NextResponse.json(
                { message: 'Invalid verification code' },
                { status: 401 }
            );
        }

        // Check expiry
        if (!user.emailVerificationExpires || new Date() > new Date(user.emailVerificationExpires)) {
            return NextResponse.json(
                { message: 'Verification code has expired. Please request a new one.', expired: true },
                { status: 401 }
            );
        }

        // Code is valid — mark email as verified (NO session — user must login separately)
        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerified: new Date(),
                emailVerificationCode: null,
                emailVerificationExpires: null,
            },
        });

        // Send welcome email with coupon code
        sendWelcomeEmailDark(
            user.email,
            user.name || user.email.split('@')[0],
            'WELCOME1DAY'
        ).catch((err) => console.error('Failed to send welcome email:', err));

        return NextResponse.json(
            {
                success: true,
                message: 'Email verified successfully. Please sign in.',
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json(
            { message: 'Failed to verify email' },
            { status: 500 }
        );
    }
}
