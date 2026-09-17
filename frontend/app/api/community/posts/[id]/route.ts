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
            select: { id: true, name: true, avatar: true },
        });
        return user || null;
    } catch (error) {
        console.error('Session lookup error:', error);
        return null;
    }
}

// PUT /api/community/posts/[id] - Edit a post
export async function PUT(
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
        if (post.authorId !== user.id) {
            return NextResponse.json({ success: false, error: 'You can only edit your own posts' }, { status: 403 });
        }

        const body = await request.json();
        const { content, category } = body;

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
        }
        if (content.trim().length > 5000) {
            return NextResponse.json({ success: false, error: 'Content must be under 5000 characters' }, { status: 400 });
        }

        const data: any = { content: content.trim() };
        if (category && ['general', 'agents', 'ideas', 'help'].includes(category)) {
            data.category = category;
        }

        const updated = await prisma.communityPost.update({ where: { id: postId }, data });
        console.log(`✏️ Post ${postId} edited by ${user.name}`);
        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('❌ Edit post error:', error);
        return NextResponse.json({ success: false, error: 'Failed to edit post' }, { status: 500 });
    }
}

// DELETE /api/community/posts/[id] - Delete a post
export async function DELETE(
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
        if (post.authorId !== user.id) {
            return NextResponse.json({ success: false, error: 'You can only delete your own posts' }, { status: 403 });
        }

        await prisma.communityPost.delete({ where: { id: postId } });
        console.log(`🗑️ Post ${postId} deleted by ${user.name}`);
        return NextResponse.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('❌ Delete post error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete post' }, { status: 500 });
    }
}
