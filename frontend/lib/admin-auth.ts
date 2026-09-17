/**
 * Admin authentication helper for Next.js API routes.
 * Verifies session cookie + admin role.
 */
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_EMAILS = [
    'admin@maula.ai',
];

export interface AdminUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
}

/**
 * Verify the request is from an authenticated admin.
 * Returns the admin user or null.
 */
export async function verifyAdmin(req: NextRequest): Promise<AdminUser | null> {
    const sessionId =
        req.cookies.get('sessionId')?.value ||
        req.cookies.get('session_id')?.value;

    if (!sessionId) return null;

    const user = await prisma.user.findFirst({
        where: { sessionId },
        select: { id: true, email: true, name: true, role: true, sessionExpiry: true },
    });

    if (!user) return null;
    if (user.sessionExpiry && new Date(user.sessionExpiry) < new Date()) return null;
    if (user.role !== 'admin') return null;

    return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/**
 * Check if an email is on the admin allow-list.
 */
export function isAdminEmail(email: string): boolean {
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Helper to return 403 if not admin.
 */
export function forbidden(message = 'Admin access required') {
    return NextResponse.json({ success: false, error: message }, { status: 403 });
}
