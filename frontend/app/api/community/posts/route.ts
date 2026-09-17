import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { awardPoints, checkAndAwardBadges, checkAndUpdateAchievements, POINTS_CONFIG } from '@/lib/rewards-engine';

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

    const session = await prisma.session.findFirst({
      where: {
        sessionId,
        isActive: true,
        lastActivity: { gt: new Date() },
      },
    });

    if (!session || !session.userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.name || 'Anonymous User',
      avatar: user.avatar || '👤',
    };
  } catch (error) {
    console.error('Session lookup error:', error);
    return null;
  }
}

// =====================================================
// GET /api/community/posts - Fetch community posts
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
    const before = searchParams.get('before'); // For pagination
    const author = searchParams.get('author');

    // Build where clause
    const where: any = {};

    if (category && ['general', 'agents', 'ideas', 'help'].includes(category)) {
      where.category = category;
    }

    if (search && search.trim()) {
      where.OR = [
        { content: { contains: search.trim(), mode: 'insensitive' } },
        { authorName: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (author) {
      where.authorName = { contains: author, mode: 'insensitive' };
    }

    // Cursor-based pagination
    if (before) {
      const date = new Date(before);
      if (!isNaN(date.getTime())) {
        where.createdAt = { lt: date };
      }
    }

    // Fetch posts sorted by pinned first, then by date
    const posts = await prisma.communityPost.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    console.log(`📋 Community posts fetched: ${posts.length} posts`);

    return NextResponse.json({
      success: true,
      count: posts.length,
      data: posts,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    console.error('❌ Community posts fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/community/posts - Create a new post
// =====================================================
export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in to post.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content, category = 'general' } = body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Post content is required' },
        { status: 400 }
      );
    }

    if (content.trim().length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Post content must be under 5000 characters' },
        { status: 400 }
      );
    }

    // Validate category
    if (!['general', 'agents', 'ideas', 'help'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Create the post
    const post = await prisma.communityPost.create({
      data: {
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatar || '👤',
        content: content.trim(),
        category,
        isPinned: false,
        likesCount: 0,
        repliesCount: 0,
      },
    });

    console.log(`✅ Community post created by ${user.name}: ${post.id}`);

    // Award points for community post (non-blocking)
    (async () => {
      try {
        await awardPoints(user.id, POINTS_CONFIG.community_post, 'community_post', post.id, 'Created a community post');
        await checkAndAwardBadges(user.id);
        await checkAndUpdateAchievements(user.id);
      } catch (e) {
        console.error('Rewards error (community post):', e);
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'Post created successfully',
      data: post,
    });
  } catch (error) {
    console.error('❌ Community post creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
