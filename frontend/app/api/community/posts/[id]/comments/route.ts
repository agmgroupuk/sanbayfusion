import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { awardPoints, checkAndAwardBadges, checkAndUpdateAchievements, POINTS_CONFIG } from '@/lib/rewards-engine';

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
            select: { id: true, name: true, avatar: true },
        });
        return user || null;
    } catch (error) {
        console.error('Session lookup error:', error);
        return null;
    }
}

// GET /api/community/posts/[id]/comments
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: postId } = await params;

        const comments = await prisma.communityComment.findMany({
            where: { postId },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ success: true, count: comments.length, data: comments });
    } catch (error) {
        console.error('❌ Fetch comments error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
    }
}

// POST /api/community/posts/[id]/comments
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: postId } = await params;

        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const post = await prisma.communityPost.findUnique({ where: { id: postId } });
        if (!post) {
            return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ success: false, error: 'Comment content is required' }, { status: 400 });
        }
        if (content.trim().length > 2000) {
            return NextResponse.json({ success: false, error: 'Comment must be under 2000 characters' }, { status: 400 });
        }

        const [comment] = await prisma.$transaction([
            prisma.communityComment.create({
                data: {
                    postId,
                    authorId: user.id,
                    authorName: user.name || 'Anonymous',
                    authorAvatar: user.avatar || '👤',
                    content: content.trim(),
                },
            }),
            prisma.communityPost.update({
                where: { id: postId },
                data: { repliesCount: { increment: 1 } },
            }),
        ]);

        console.log(`💬 Comment created on post ${postId} by ${user.name}`);

        // Award points for community comment (non-blocking)
        (async () => {
            try {
                await awardPoints(user.id, POINTS_CONFIG.community_comment, 'community_comment', comment.id, 'Posted a community comment');
                await checkAndAwardBadges(user.id);
                await checkAndUpdateAchievements(user.id);
            } catch (e) {
                console.error('Rewards error (community comment):', e);
            }
        })();

        return NextResponse.json({ success: true, data: comment });
    } catch (error) {
        console.error('❌ Create comment error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create comment' }, { status: 500 });
    }
}
