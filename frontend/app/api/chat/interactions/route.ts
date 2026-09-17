import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { awardPoints, checkAndAwardBadges, checkAndUpdateAchievements, POINTS_CONFIG } from '@/lib/rewards-engine';

// Helper to authenticate user from session cookie
async function authenticateUser(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value ||
    request.cookies.get('sessionId')?.value;

  if (!sessionId) {
    return null;
  }

  try {
    // Session is stored directly on the user document
    const user = await prisma.user.findFirst({
      where: {
        sessionId: sessionId,
        sessionExpiry: { gt: new Date() }
      }
    });

    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// POST /api/chat/interactions - Save chat interaction
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { conversationId, agentId, messages, summary, metrics } = body;

    // Validate required fields
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'conversationId is required' },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'messages array is required' },
        { status: 400 }
      );
    }

    // Create interaction document using Prisma
    const interaction = await prisma.chatAnalyticsInteraction.create({
      data: {
        conversationId,
        userId: user.id,
        agentId: agentId || null,
        messages: messages.map(
          (msg: { role: string; content: string; timestamp?: number }) => ({
            role: msg.role,
            content: msg.content,
            createdAt: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
          })
        ),
        status: 'active',
        startedAt: new Date(),
        durationMs: metrics?.durationMs || 0,
        totalTokens: metrics?.totalTokens || 0,
        turnCount: messages.length
      }
    });

    // Award points for chat interaction (non-blocking)
    (async () => {
      try {
        await awardPoints(user.id, POINTS_CONFIG.chat_interaction, 'chat_interaction', interaction.id, `Chat interaction with ${agentId || 'agent'}`);
        await checkAndAwardBadges(user.id);
        await checkAndUpdateAchievements(user.id);
      } catch (e) {
        console.error('Rewards error (chat):', e);
      }
    })();

    return NextResponse.json(
      {
        success: true,
        interaction: {
          id: interaction.id,
          conversationId,
          messageCount: messages.length,
          createdAt: interaction.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving chat interaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save chat interaction' },
      { status: 500 }
    );
  }
}

// GET /api/chat/interactions - Get user's chat interactions
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build Prisma query
    const where: any = { userId: user.id };
    if (conversationId) {
      where.conversationId = conversationId;
    }

    const interactions = await prisma.chatAnalyticsInteraction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({
      success: true,
      interactions: interactions.map((i: typeof interactions[0]) => ({
        id: i.id,
        conversationId: i.conversationId,
        agentId: i.agentId,
        messageCount: (i.messages as any[])?.length || 0,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching chat interactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chat interactions' },
      { status: 500 }
    );
  }
}
