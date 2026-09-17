import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendVerificationCodeEmail } from '@/lib/services/emailNotifications';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/resend-verification
 * Resend a new 6-digit verification code
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { message: 'User ID is required' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        if (user.emailVerified) {
            return NextResponse.json(
                { message: 'Email already verified' },
                { status: 400 }
            );
        }

        // Generate new 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerificationCode: verificationCode,
                emailVerificationExpires: codeExpiry,
            },
        });

        // Send verification email directly (no backend proxy)
        sendVerificationCodeEmail(
            user.email,
            user.name || user.email.split('@')[0],
            verificationCode
        ).catch((err) => console.error('Failed to send verification email:', err));

        return NextResponse.json(
            { success: true, message: 'Verification code resent' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Resend verification error:', error);
        return NextResponse.json(
            { message: 'Failed to resend verification code' },
            { status: 500 }
        );
    }
}
