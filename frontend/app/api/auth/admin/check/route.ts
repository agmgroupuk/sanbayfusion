import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdmin, isAdminEmail } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/admin/check
 * Checks if the logged-in user is allowed to access admin panel.
 * Returns { alreadyVerified } if admin_access cookie is valid, else { allowed, twoFactorEnabled }.
 */
export async function POST(req: NextRequest) {
    const admin = await verifyAdmin(req);
    if (!admin) {
        return NextResponse.json({ success: false, allowed: false });
    }

    // Check if admin_access cookie exists (means already verified with password)
    const adminAccess = req.cookies.get('admin_access')?.value;
    if (adminAccess === admin.id) {
        return NextResponse.json({ success: true, alreadyVerified: true, user: admin });
    }

    // Check 2FA status
    const userSecurity = await prisma.user.findUnique({
        where: { id: admin.id },
        select: { twoFactorEnabled: true, email: true },
    });

    return NextResponse.json({
        success: true,
        allowed: true,
        alreadyVerified: false,
        twoFactorEnabled: userSecurity?.twoFactorEnabled || false,
        user: { email: userSecurity?.email },
    });
}
