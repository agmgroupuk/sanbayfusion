import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// =====================================================
// Helper: Get User from Session Cookie
// =====================================================
async function getUserFromSession() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    if (!sessionId) {
      return null;
    }

    // Find user by session using Prisma
    const user = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error('Session lookup error:', error);
    return null;
  }
}

// =====================================================
// POST /api/community/posts/[id]/unlike - Unlike a post
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    // Get user from session
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in to unlike posts.' },
        { status: 401 }
      );
    }

    // Check if post exists
    const post = await prisma.communityPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if like exists
    const existingLike = await prisma.communityLike.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: postId
        }
      }
    });

    if (!existingLike) {
      return NextResponse.json(
        { success: false, error: 'You have not liked this post' },
        { status: 400 }
      );
    }

    // Remove like record and decrement likes count in a transaction
    const [_, updatedPost] = await prisma.$transaction([
      prisma.communityLike.delete({
        where: {
          userId_postId: {
            userId: user.id,
            postId: postId
          }
        }
      }),
      prisma.communityPost.update({
        where: { id: postId },
        data: { 
          likesCount: { 
            decrement: 1 
          } 
        }
      })
    ]);

    // Ensure likesCount doesn't go negative
    if (updatedPost.likesCount < 0) {
      await prisma.communityPost.update({
        where: { id: postId },
        data: { likesCount: 0 }
      });
    }

    console.log(`💔 Post ${postId} unliked by user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Post unliked successfully',
      data: {
        postId,
        liked: false,
        likesCount: Math.max(0, updatedPost.likesCount),
      },
    });
  } catch (error) {
    console.error('❌ Unlike post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unlike post' },
      { status: 500 }
    );
  }
}
