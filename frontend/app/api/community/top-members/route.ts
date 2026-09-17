import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// =====================================================
// GET /api/community/top-members - Get leaderboard
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Get all posts grouped by author for aggregation
    const posts = await prisma.communityPost.findMany({
      select: {
        authorId: true,
        authorName: true,
        authorAvatar: true,
        likesCount: true,
        category: true,
        createdAt: true,
      },
    });

    // Aggregate data by author
    const authorMap = new Map<string, {
      authorId: string | null;
      authorName: string;
      avatar: string;
      postsCount: number;
      totalLikes: number;
      lastPost: Date;
      categories: Set<string>;
    }>();

    for (const post of posts) {
      const key = post.authorId || post.authorName;
      const existing = authorMap.get(key);
      
      if (existing) {
        existing.postsCount++;
        existing.totalLikes += post.likesCount;
        if (post.createdAt > existing.lastPost) {
          existing.lastPost = post.createdAt;
        }
        existing.categories.add(post.category);
      } else {
        authorMap.set(key, {
          authorId: post.authorId,
          authorName: post.authorName,
          avatar: post.authorAvatar,
          postsCount: 1,
          totalLikes: post.likesCount,
          lastPost: post.createdAt,
          categories: new Set([post.category]),
        });
      }
    }

    // Convert to array and calculate scores
    const topPosters = Array.from(authorMap.values())
      .map(member => ({
        ...member,
        score: member.postsCount * 2 + member.totalLikes,
        categories: Array.from(member.categories),
      }))
      .sort((a, b) => b.score - a.score || b.postsCount - a.postsCount)
      .slice(0, limit);

    // Enrich with user data if available
    const enrichedMembers = await Promise.all(
      topPosters.map(async (member) => {
        let userData = null;
        if (member.authorId) {
          try {
            userData = await prisma.user.findUnique({
              where: { id: member.authorId },
              select: {
                name: true,
                avatar: true,
              },
            });
          } catch {
            // User not found
          }
        }

        return {
          _id: member.authorId || member.authorName,
          name: userData?.name || member.authorName || 'Anonymous',
          avatar: userData?.avatar || member.avatar || '👤',
          postsCount: member.postsCount,
          totalLikes: member.totalLikes,
          score: member.score,
          title: getBadgeTitle(member.postsCount, member.totalLikes),
          lastPost: member.lastPost,
          topCategories: member.categories.slice(0, 3),
        };
      })
    );

    console.log(`👥 Top members fetched: ${enrichedMembers.length} members`);

    return NextResponse.json({
      success: true,
      count: enrichedMembers.length,
      data: enrichedMembers,
    });
  } catch (error) {
    console.error('❌ Top members fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch top members' },
      { status: 500 }
    );
  }
}

// =====================================================
// Helper: Get badge title based on activity
// =====================================================
function getBadgeTitle(postsCount: number, totalLikes: number): string {
  const score = postsCount * 2 + totalLikes;

  if (score >= 500) return '🏆 Community Legend';
  if (score >= 200) return '⭐ Power Contributor';
  if (score >= 100) return '🚀 Rising Star';
  if (score >= 50) return '💎 Active Member';
  if (score >= 20) return '🔥 Regular';
  if (score >= 5) return '👋 Newcomer';
  return '🌱 New Member';
}
