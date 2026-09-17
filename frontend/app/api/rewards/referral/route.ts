import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getOrCreateReferralCode } from '@/lib/rewards-engine';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — Get or create user's referral code + stats
export async function GET(request: NextRequest) {
    try {
        const sessionId = request.cookies.get('session_id')?.value ||
            request.cookies.get('sessionId')?.value;

        if (!sessionId) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const sessionUser = await getSessionUser(sessionId);
        if (!sessionUser) {
            return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
        }

        const referralCode = await getOrCreateReferralCode(sessionUser.id);

        const referrals = await prisma.referral.findMany({
            where: { referrerId: sessionUser.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        return NextResponse.json({
            success: true,
            referral: {
                code: referralCode.code,
                totalReferrals: referralCode.totalReferrals,
                totalPointsEarned: referralCode.totalPointsEarned,
                isActive: referralCode.isActive,
                shareUrl: `https://sanbayfusion.com/signup?ref=${referralCode.code}`,
                recentReferrals: referrals.map(r => ({
                    id: r.id,
                    status: r.status,
                    pointsAwarded: r.pointsAwarded,
                    createdAt: r.createdAt.toISOString(),
                    completedAt: r.completedAt?.toISOString() || null,
                })),
            },
        });
    } catch (error) {
        console.error('Error fetching referral code:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch referral data' }, { status: 500 });
    }
}
