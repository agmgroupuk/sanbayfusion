import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { sendWelcomeEmailDark, sendLoginAlertEmail } from '@/lib/services/emailNotifications';
import { verifyTurnstileToken } from '@/lib/turnstile';

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
        const { tempToken, userId, code, useBackupCode, turnstileToken } = await request.json();

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

        let isValid = false;
        let usedBackupCode = false;

        if (useBackupCode) {
            // Verify backup code
            const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const backupCodes = (user as any).backupCodes as string[] | null;
            if (backupCodes && backupCodes.includes(normalizedCode)) {
                isValid = true;
                usedBackupCode = true;
            }
        } else {
            // Verify TOTP code
            if (code.length !== 6 || !/^\d+$/.test(code)) {
                return NextResponse.json(
                    { success: false, message: 'Invalid verification code format' },
                    { status: 400 }
                );
            }

            isValid = speakeasy.totp.verify({
                secret: (user as any).twoFactorSecret || '',
                encoding: 'base32',
                token: code,
                window: 1,
            });
        }

        if (!isValid) {
            return NextResponse.json(
                {
                    success: false,
                    message: useBackupCode
                        ? 'Invalid backup code. Please try again.'
                        : 'Invalid verification code. Please try again.',
                },
                { status: 401 }
            );
        }

        // ── 2FA verified — create session ──
        const isFirstLogin = !user.lastLoginAt;
        const sessionId = crypto.randomBytes(32).toString('hex');
        const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const updateData: Record<string, any> = {
            sessionId,
            sessionExpiry,
            lastLoginAt: new Date(),
            tempToken: null,
            tempTokenExpiry: null,
        };

        // Remove used backup code
        if (usedBackupCode) {
            const backupCodes = (user as any).backupCodes as string[] | null;
            if (backupCodes) {
                updateData.backupCodes = backupCodes.filter(
                    (c: string) => c !== code.toUpperCase().replace(/[^A-Z0-9]/g, '')
                );
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: updateData,
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
        console.error('2FA verification error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to verify 2FA code' },
            { status: 500 }
        );
    }
}
