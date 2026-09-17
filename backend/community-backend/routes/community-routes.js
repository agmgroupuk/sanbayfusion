/**
 * COMMUNITY ROUTES — Posts, likes, presence, metrics
 * Ported from backend/routes/community.js → Direct Prisma calls
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// Activity logging helper
const logActivity = (action, resource, resourceId, userId = null, metadata = {}) => {
  console.log(`[COMMUNITY_ACTIVITY] ${action} ${resource} ${resourceId}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

// ============================================
// GET /api/community/posts - List community posts
// ============================================
router.get('/posts', async (req, res) => {
  try {
    const { category, search, limit = 20, before, author } = req.query;

    const where = {};
    if (category && ['general', 'agents', 'ideas', 'help'].includes(category)) {
      where.category = category;
    }
    if (before) {
      const date = new Date(before);
      if (!isNaN(date.getTime())) {
        where.createdAt = { lt: date };
      }
    }

    let posts = await prisma.communityPost.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(parseInt(limit) || 20, 50),
    });

    // Text search in JS (Prisma doesn't support regex like MongoDB)
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      posts = posts.filter(p =>
        (p.content && p.content.toLowerCase().includes(searchLower)) ||
        (p.authorName && p.authorName.toLowerCase().includes(searchLower))
      );
    }

    if (author) {
      const authorLower = author.toLowerCase();
      posts = posts.filter(p =>
        p.authorName && p.authorName.toLowerCase().includes(authorLower)
      );
    }

    logActivity('LIST', 'posts', 'multiple', null, { count: posts.length });

    res.json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    console.error('Community posts list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts', details: error.message });
  }
});

// ============================================
// POST /api/community/posts - Create new post
// ============================================
router.post('/posts', async (req, res) => {
  try {
    const { content, category = 'general', authorName, authorAvatar = '👤' } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    if (!['general', 'agents', 'ideas', 'help'].includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }
    if (!authorName) {
      return res.status(400).json({ success: false, error: 'Author name is required' });
    }

    const post = await prisma.communityPost.create({
      data: {
        authorName: String(authorName).slice(0, 80),
        authorAvatar: String(authorAvatar || '👤').slice(0, 8),
        content: content.trim(),
        category,
        isPinned: false,
      },
    });

    logActivity('CREATE', 'post', post.id, null, { category, authorName, contentLength: content.length });

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Community post creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// ============================================
// GET /api/community/posts/:id - Get specific post
// ============================================
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await prisma.communityPost.findUnique({
      where: { id: req.params.id },
      include: { comments: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    logActivity('VIEW', 'post', post.id, null);
    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Community post fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
  }
});

// ============================================
// GET /api/community/metrics - Get community metrics
// ============================================
router.get('/metrics', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;

    const totalPosts = await prisma.communityPost.count();
    const totalComments = await prisma.communityComment.count();
    const totalLikes = await prisma.communityLike.count();

    // Category breakdown
    const allPosts = await prisma.communityPost.findMany({ select: { category: true } });
    const categoryMap = {};
    allPosts.forEach(post => {
      const cat = post.category || 'uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const postsByCategory = Object.entries(categoryMap)
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => b.count - a.count);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPosts = await prisma.communityPost.count({ where: { createdAt: { gte: weekAgo } } });
    const recentComments = await prisma.communityComment.count({ where: { createdAt: { gte: weekAgo } } });

    const metrics = {
      overview: { totalPosts, totalComments, totalLikes, recentPosts, recentComments },
      categories: postsByCategory,
      period,
      generatedAt: new Date().toISOString(),
    };

    logActivity('VIEW', 'metrics', 'overview', null, { period });
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Community metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

// ============================================
// PUT /api/community/posts/:id - Edit a post
// ============================================
router.put('/posts/:id', async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    if (post.authorId !== userId) {
      return res.status(403).json({ success: false, error: 'You can only edit your own posts' });
    }

    const { content, category } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    if (content.trim().length > 5000) {
      return res.status(400).json({ success: false, error: 'Content must be under 5000 characters' });
    }

    const data = { content: content.trim() };
    if (category && ['general', 'agents', 'ideas', 'help'].includes(category)) {
      data.category = category;
    }

    const updated = await prisma.communityPost.update({ where: { id: postId }, data });
    logActivity('EDIT', 'post', postId, userId);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Edit post error:', error);
    res.status(500).json({ success: false, error: 'Failed to edit post' });
  }
});

// ============================================
// DELETE /api/community/posts/:id - Delete a post
// ============================================
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    if (post.authorId !== userId) {
      return res.status(403).json({ success: false, error: 'You can only delete your own posts' });
    }

    // Cascade delete handles comments and likes via schema
    await prisma.communityPost.delete({ where: { id: postId } });
    logActivity('DELETE', 'post', postId, userId);
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// ============================================
// GET /api/community/posts/:id/comments - List comments
// ============================================
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { id: postId } = req.params;
    const comments = await prisma.communityComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    console.error('List comments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
});

// ============================================
// POST /api/community/posts/:id/comments - Create comment
// ============================================
router.post('/posts/:id/comments', async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const { content, authorName, authorAvatar = '👤' } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    if (content.trim().length > 2000) {
      return res.status(400).json({ success: false, error: 'Comment must be under 2000 characters' });
    }

    const [comment] = await prisma.$transaction([
      prisma.communityComment.create({
        data: {
          postId,
          authorName: String(authorName || 'Anonymous').slice(0, 80),
          authorAvatar: String(authorAvatar).slice(0, 8),
          content: content.trim(),
        },
      }),
      prisma.communityPost.update({
        where: { id: postId },
        data: { repliesCount: { increment: 1 } },
      }),
    ]);

    logActivity('CREATE', 'comment', comment.id, userId, { postId });
    res.json({ success: true, data: comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create comment' });
  }
});

// ============================================
// DELETE /api/community/comments/:id - Delete comment
// ============================================
router.delete('/comments/:id', async (req, res) => {
  try {
    const { id: commentId } = req.params;
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const comment = await prisma.communityComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    if (comment.authorId !== userId) {
      return res.status(403).json({ success: false, error: 'You can only delete your own comments' });
    }

    await prisma.$transaction([
      prisma.communityComment.delete({ where: { id: commentId } }),
      prisma.communityPost.update({
        where: { id: comment.postId },
        data: { repliesCount: { decrement: 1 } },
      }),
    ]);

    logActivity('DELETE', 'comment', commentId, userId, { postId: comment.postId });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
});

// ============================================
// Presence — In-memory tracking
// ============================================
const presenceMap = new Map(); // userId → { name, avatar, status, lastSeen }
const PRESENCE_TTL = 60_000; // 60 seconds

function getActiveUsers() {
  const now = Date.now();
  const active = [];
  for (const [userId, info] of presenceMap) {
    if (now - info.lastSeen.getTime() <= PRESENCE_TTL) {
      active.push({ userId, name: info.name, avatar: info.avatar, status: 'online', lastSeen: info.lastSeen });
    } else {
      presenceMap.delete(userId);
    }
  }
  return active;
}

// GET /api/community/presence - Get active users
router.get('/presence', async (req, res) => {
  try {
    const activeUsers = getActiveUsers();
    res.json({ success: true, count: activeUsers.length, data: activeUsers });
  } catch (error) {
    console.error('Community presence error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch presence data' });
  }
});

// POST /api/community/presence/ping - Update user presence
router.post('/presence/ping', async (req, res) => {
  try {
    const { userName, userId, avatar = '👤' } = req.body;
    const uid = userId || req.headers['x-user-id'];
    if (!uid) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    presenceMap.set(uid, { name: userName || 'Anonymous', avatar, status: 'online', lastSeen: new Date() });
    logActivity('PING', 'presence', uid, uid, { status: 'online' });
    res.json({ success: true, data: { userId: uid, status: 'online', onlineCount: getActiveUsers().length, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Community presence ping error:', error);
    res.status(500).json({ success: false, error: 'Failed to update presence' });
  }
});

// ============================================
// GET /api/community/top-members - Top contributors
// ============================================
router.get('/top-members', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const allPosts = await prisma.communityPost.findMany({
      select: { authorName: true, authorAvatar: true, createdAt: true },
    });

    const authorMap = {};
    allPosts.forEach(post => {
      const author = post.authorName || 'Anonymous';
      if (!authorMap[author]) {
        authorMap[author] = { _id: author, posts: 0, avatar: post.authorAvatar, lastPost: post.createdAt };
      }
      authorMap[author].posts += 1;
      if (new Date(post.createdAt) > new Date(authorMap[author].lastPost)) {
        authorMap[author].lastPost = post.createdAt;
      }
    });

    const topPosters = Object.values(authorMap)
      .sort((a, b) => b.posts - a.posts)
      .slice(0, Math.min(parseInt(limit) || 10, 50));

    logActivity('VIEW', 'top_members', 'leaderboard', null);

    res.json({
      success: true,
      count: topPosters.length,
      data: topPosters.map(m => ({ name: m._id, avatar: m.avatar, posts: m.posts, lastPost: m.lastPost })),
    });
  } catch (error) {
    console.error('Community top members error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top members' });
  }
});

// ============================================
// GET /api/community/stream - Activity stream
// ============================================
router.get('/stream', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const recentPosts = await prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 20, 50),
      select: { id: true, authorName: true, authorAvatar: true, content: true, category: true, createdAt: true },
    });

    const activities = recentPosts.map(post => ({
      type: 'post',
      id: post.id,
      author: { name: post.authorName, avatar: post.authorAvatar },
      action: 'created a post',
      content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      category: post.category,
      timestamp: post.createdAt,
    }));

    logActivity('VIEW', 'activity_stream', 'recent', null);
    res.json({ success: true, count: activities.length, data: activities });
  } catch (error) {
    console.error('Community stream error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity stream' });
  }
});

// ============================================
// GET /api/community/posts/liked - User's liked post IDs
// ============================================
router.get('/posts/liked', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const likes = await prisma.communityLike.findMany({
      where: { userId },
      select: { postId: true },
    });
    const likedPostIds = likes.filter(l => l.postId).map(l => l.postId);

    res.json({ success: true, data: likedPostIds });
  } catch (error) {
    console.error('Get user likes error:', error);
    res.status(500).json({ success: false, error: 'Failed to get likes' });
  }
});

// ============================================
// POST /api/community/posts/:id/like - Like a post
// ============================================
router.post('/posts/:id/like', async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Check if already liked
    const existingLike = await prisma.communityLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existingLike) {
      return res.status(400).json({ success: false, error: 'Already liked' });
    }

    // Create like + increment count in transaction
    const [_, post] = await prisma.$transaction([
      prisma.communityLike.create({ data: { userId, postId } }),
      prisma.communityPost.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    logActivity('LIKE', 'post', postId, userId);
    res.json({ success: true, data: { postId, liked: true, likesCount: post.likesCount } });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ success: false, error: 'Failed to like post' });
  }
});

// ============================================
// POST /api/community/posts/:id/unlike - Unlike a post
// ============================================
router.post('/posts/:id/unlike', async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Delete like + decrement count in transaction
    try {
      const [_, post] = await prisma.$transaction([
        prisma.communityLike.delete({ where: { userId_postId: { userId, postId } } }),
        prisma.communityPost.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);

      logActivity('UNLIKE', 'post', postId, userId);
      res.json({ success: true, data: { postId, liked: false, likesCount: Math.max(0, post.likesCount) } });
    } catch (e) {
      if (e.code === 'P2025') {
        return res.status(400).json({ success: false, error: 'Not liked' });
      }
      throw e;
    }
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ success: false, error: 'Failed to unlike post' });
  }
});

export default router;
