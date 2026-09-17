import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendWelcomeEmailDark, sendLoginAlertEmail } from '@/lib/services/emailNotifications';

export const dynamic = 'force-dynamic';

/** Extract client info from request headers */
function getClientInfo(request: NextRequest) {
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'Unknown';
    const device = request.headers.get('user-agent') || 'Unknown';
    return { ip, device };
}

export async function POST(request: NextRequest) {
    try {
        const { tempToken, userId, code } = await request.json();

        if (!tempToken || !userId || !code) {
            return NextResponse.json(
                { success: false, message: 'Token, user ID, and verification code are required' },
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
                { success: false, message: 'Invalid or expired verification session. Please login again.' },
                { status: 401 }
            );
        }

        // Verify the OTP code
        if (!user.emailVerificationCode || user.emailVerificationCode !== code) {
            return NextResponse.json(
                { success: false, message: 'Invalid verification code. Please try again.' },
                { status: 401 }
            );
        }

        // Check expiry
        if (!user.emailVerificationExpires || new Date() > new Date(user.emailVerificationExpires)) {
            return NextResponse.json(
                { success: false, message: 'Verification code has expired. Please request a new one.', expired: true },
                { status: 401 }
            );
        }

        // ── OTP verified — create session ──
        const isFirstLogin = !user.lastLoginAt;
        const sessionId = crypto.randomBytes(32).toString('hex');
        const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                sessionId,
                sessionExpiry,
                lastLoginAt: new Date(),
                tempToken: null,
                tempTokenExpiry: null,
                emailVerificationCode: null,
                emailVerificationExpires: null,
            },
        });

        // Determine production mode
        const isProduction =
            request.headers.get('x-forwarded-proto') === 'https' ||
            request.url.startsWith('https://');

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: (user as any).avatar,
            },
        });

        // Set session cookies
        response.cookies.set('session_id', sessionId, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
            domain: isProduction ? '.maula.ai' : undefined,
        });
        response.cookies.set('sessionId', sessionId, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
            domain: isProduction ? '.maula.ai' : undefined,
        });

        // Send welcome email on first login (with coupon code for free 1-day agent access)
        if (isFirstLogin) {
            sendWelcomeEmailDark(user.email, user.name || user.email.split('@')[0], 'WELCOME1DAY').catch(
                (err) => console.error('Welcome email error:', err.message)
            );
        }

        // Send login alert (fire & forget)
        const clientInfo = getClientInfo(request);
        sendLoginAlertEmail(user.email, user.name || user.email.split('@')[0], {
            ip: clientInfo.ip,
            userAgent: clientInfo.device,
            timestamp: new Date().toISOString(),
        }).catch((err) => console.error('Login alert email error:', err.message));

        return response;
    } catch (error) {
        console.error('Login OTP verification error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to verify login code' },
            { status: 500 }
        );
    }
}
