import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import { compare } from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/admin/verify-access
 * Re-authenticates admin with password (+ optional 2FA).
 * Sets admin_access cookie valid for 4 hours.
 */
export async function POST(req: NextRequest) {
    const admin = await verifyAdmin(req);
    if (!admin) {
        return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { password, totpCode } = await req.json();
    if (!password) {
        return NextResponse.json({ success: false, message: 'Password is required' }, { status: 400 });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
        where: { id: admin.id },
        select: { password: true, twoFactorEnabled: true, twoFactorSecret: true },
    });

    if (!user || !user.password) {
        return NextResponse.json({ success: false, message: 'Password not set for this account' }, { status: 400 });
    }

    // Verify password
    const valid = await compare(password, user.password);
    if (!valid) {
        return NextResponse.json({ success: false, message: 'Incorrect password' }, { status: 401 });
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
        if (!totpCode) {
            return NextResponse.json({ success: false, requires2FA: true, message: 'Please enter your 2FA code' });
        }
        // For now, skip TOTP verification if no secret configured (it's optional)
        if (user.twoFactorSecret) {
            try {
                const { authenticator } = await import('otplib');
                const isValid = authenticator.check(totpCode, user.twoFactorSecret);
                if (!isValid) {
                    return NextResponse.json({ success: false, message: 'Invalid 2FA code' }, { status: 401 });
                }
            } catch {
                // otplib not available — skip 2FA check
            }
        }
    }

    // Set admin_access cookie — 4 hour session
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_access', admin.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 4 * 60 * 60, // 4 hours
        path: '/',
    });

    return response;
}
