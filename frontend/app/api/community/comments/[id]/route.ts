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

// DELETE /api/community/comments/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: commentId } = await params;

        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const comment = await prisma.communityComment.findUnique({ where: { id: commentId } });
        if (!comment) {
            return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
        }
        if (comment.authorId !== user.id) {
            return NextResponse.json({ success: false, error: 'You can only delete your own comments' }, { status: 403 });
        }

        await prisma.$transaction([
            prisma.communityComment.delete({ where: { id: commentId } }),
            prisma.communityPost.update({
                where: { id: comment.postId },
                data: { repliesCount: { decrement: 1 } },
            }),
        ]);

        console.log(`🗑️ Comment ${commentId} deleted by user ${user.id}`);
        return NextResponse.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        console.error('❌ Delete comment error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete comment' }, { status: 500 });
    }
}
