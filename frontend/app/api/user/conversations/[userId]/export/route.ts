import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const format = request.nextUrl.searchParams.get('format') || 'json';

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

    // Fetch all sessions with messages for export
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      include: {
        agent: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      // CSV export
      const rows = ['Session,Agent,Date,Role,Message'];
      for (const s of sessions) {
        const agentName = (s.agent?.name || s.agentId || 'Unknown').replace(/"/g, '""');
        const sessionName = (s.name || 'Untitled').replace(/"/g, '""');
        const sessionDate = s.createdAt.toISOString().split('T')[0];
        for (const m of s.messages) {
          const content = m.content.replace(/"/g, '""').replace(/\n/g, ' ');
          rows.push(`"${sessionName}","${agentName}","${sessionDate}","${m.role}","${content}"`);
        }
      }
      const csv = rows.join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="conversations_${dateStr}.csv"`,
        },
      });
    }

    // JSON export
    const data = sessions.map((s) => ({
      id: s.sessionId || s.id,
      name: s.name,
      agent: s.agent?.name || s.agentId || 'Unknown',
      createdAt: s.createdAt.toISOString(),
      messageCount: s.messages.length,
      messages: s.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt.toISOString(),
      })),
    }));

    const jsonStr = JSON.stringify({ conversations: data, exportedAt: new Date().toISOString() }, null, 2);

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="conversations_${dateStr}.json"`,
      },
    });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
