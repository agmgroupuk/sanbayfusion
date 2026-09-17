import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// =====================================================
// Fetch Real Metrics from Database
// =====================================================
async function fetchMetrics() {
  try {
    // Total members (users)
    const totalMembers = await prisma.user.count();

    // Online now (sessions active within last 60 seconds)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const onlineNow = await prisma.session.count({
      where: {
        lastActivity: { gte: oneMinuteAgo },
        isActive: true,
      },
    });

    // Total posts
    const totalPosts = await prisma.communityPost.count();

    // Posts this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const postsThisWeek = await prisma.communityPost.count({
      where: {
        createdAt: { gte: weekAgo },
      },
    });

    // Active replies (sum of repliesCount from all posts)
    const replyAgg = await prisma.communityPost.aggregate({
      _sum: {
        repliesCount: true,
      },
    });
    const activeReplies = replyAgg._sum.repliesCount || 0;

    // New members this week
    const newMembersWeek = await prisma.user.count({
      where: {
        createdAt: { gte: weekAgo },
      },
    });

    return {
      totalMembers,
      onlineNow: Math.max(1, onlineNow), // At least 1 if someone is viewing
      totalPosts,
      postsThisWeek,
      activeReplies,
      newMembersWeek,
    };
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return {
      totalMembers: 0,
      onlineNow: 1,
      totalPosts: 0,
      postsThisWeek: 0,
      activeReplies: 0,
      newMembersWeek: 0,
    };
  }
}

// =====================================================
// GET /api/community/stream - Server-Sent Events for real-time updates
// =====================================================
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let isConnected = true;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Community stream connected' })}\n\n`)
      );

      // Send initial metrics immediately
      try {
        const metrics = await fetchMetrics();
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'metrics', data: metrics })}\n\n`)
        );
      } catch (error) {
        console.error('Initial metrics error:', error);
      }

      // Update metrics every 15 seconds
      const metricsInterval = setInterval(async () => {
        if (!isConnected) {
          clearInterval(metricsInterval);
          return;
        }
        try {
          const metrics = await fetchMetrics();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'metrics', data: metrics })}\n\n`)
          );
        } catch (error) {
          console.error('Metrics update error:', error);
        }
      }, 15000);

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (!isConnected) {
          clearInterval(heartbeatInterval);
          return;
        }
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`)
          );
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        isConnected = false;
        clearInterval(metricsInterval);
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable NGINX buffering for SSE
    },
  });
}
