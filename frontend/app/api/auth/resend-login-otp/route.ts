import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendLoginOTPEmail } from '@/lib/services/emailNotifications';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { tempToken, userId } = await request.json();

        if (!tempToken || !userId) {
            return NextResponse.json(
                { success: false, message: 'Token and user ID are required' },
                { status: 400 }
            );
        }

        // Find user with valid temp token
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                tempToken,
                tempTokenExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Invalid or expired session. Please login again.' },
                { status: 401 }
            );
        }

        // Generate new OTP
        const loginOTPCode = Math.floor(100000 + Math.random() * 900000).toString();
        const loginOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationCode: loginOTPCode,
                emailVerificationExpires: loginOTPExpiry,
            },
        });

        // Send new OTP email
        sendLoginOTPEmail(user.email, user.name || user.email.split('@')[0], loginOTPCode).catch(
            (err) => console.error('Resend login OTP email error:', err.message)
        );

        return NextResponse.json({ success: true, message: 'New verification code sent' });
    } catch (error) {
        console.error('Resend login OTP error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to resend verification code' },
            { status: 500 }
        );
    }
}
