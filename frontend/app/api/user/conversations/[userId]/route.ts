import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search') || '';

    // Authenticate via session cookie
    const sessionId =
      request.cookies.get('session_id')?.value ||
      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { message: 'No session ID' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { sessionId, sessionExpiry: { gt: new Date() } },
    });

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build where clause
    const where: any = { userId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and paginated sessions
    const [total, sessions] = await Promise.all([
      prisma.chatSession.count({ where }),
      prisma.chatSession.findMany({
        where,
        select: {
          id: true,
          sessionId: true,
          name: true,
          description: true,
          agentId: true,
          createdAt: true,
          updatedAt: true,
          isActive: true,
          agent: {
            select: { name: true },
          },
          _count: {
            select: { messages: true },
          },
          messages: {
            select: { content: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Map to expected ConversationItem shape
    const conversations = sessions.map((s) => {
      const lastMsg = s.messages[0] || null;
      const duration = s.updatedAt
        ? `${Math.round((s.updatedAt.getTime() - s.createdAt.getTime()) / 60000)}m`
        : '0m';

      return {
        id: s.sessionId || s.id,
        agent: s.agent?.name || s.agentId || 'Unknown Agent',
        topic: s.name || 'Untitled Conversation',
        date: s.createdAt.toISOString(),
        duration,
        messageCount: s._count.messages,
        lastMessage: lastMsg
          ? { content: lastMsg.content, timestamp: lastMsg.createdAt.toISOString() }
          : null,
      };
    });

    return NextResponse.json({
      data: {
        conversations,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
