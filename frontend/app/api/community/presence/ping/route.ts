import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

// =====================================================
// POST /api/community/presence/ping - Update user presence
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    // Anonymous users get a random session-like ID based on request
    const anonymousId = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        `anon-${Date.now()}`;

    const presenceSessionId = sessionId || `anon-${Buffer.from(anonymousId).toString('base64').slice(0, 16)}`;

    let userName = 'Guest';
    let userId: string | null = null;
    let userAvatar = '👤';

    // Try to get user info from session
    if (sessionId) {
      const session = await prisma.session.findFirst({
        where: {
          sessionId,
          isActive: true,
        },
      });

      if (session && session.userId) {
        userId = session.userId;
        
        // Get user details
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              name: true,
              avatar: true,
            },
          });
          
          if (user) {
            userName = user.name || 'Member';
            userAvatar = user.avatar || '👤';
          }
        } catch {
          // User not found, use session info
        }
      }
    }

    // Parse body for additional info
    let page = '/community';
    let status = 'online';
    try {
      const body = await request.json();
      page = body.page || page;
      status = body.status || status;
    } catch {
      // No body or invalid JSON
    }

    // For presence tracking, we'll update the session's lastActivity
    if (userId) {
      await prisma.session.updateMany({
        where: { userId },
        data: {
          lastActivity: new Date(),
          isActive: true,
        },
      });
    }

    // Get online count (sessions active within last 60 seconds)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const onlineCount = await prisma.session.count({
      where: {
        lastActivity: { gte: oneMinuteAgo },
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Presence updated',
      data: {
        sessionId: presenceSessionId,
        status,
        onlineCount: Math.max(1, onlineCount),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Presence ping error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update presence' },
      { status: 500 }
    );
  }
}
