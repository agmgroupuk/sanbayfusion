import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

async function getUserFromSession() {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('session_id')?.value;
        if (!sessionId) return null;

        const session = await prisma.session.findFirst({
            where: { sessionId, isActive: true, lastActivity: { gt: new Date() } },
        });
        if (!session?.userId) return null;

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true },
        });
        return user || null;
    } catch (error) {
        console.error('Session lookup error:', error);
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const likes = await prisma.communityLike.findMany({
            where: { userId: user.id, postId: { not: null } },
            select: { postId: true },
        });

        const likedPostIds = likes.map((l: any) => l.postId).filter(Boolean);
        return NextResponse.json({ success: true, data: likedPostIds });
    } catch (error) {
        console.error('❌ Get liked posts error:', error);
        return NextResponse.json({ success: false, error: 'Failed to get liked posts' }, { status: 500 });
    }
}
