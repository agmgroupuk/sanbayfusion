import { NextRequest, NextResponse } from 'next/server';

// ⚠️ SECURITY: Proxy-only route — routes to live-support-backend
// Get user's active chat session with message history

const LIVE_SUPPORT_API = process.env.LIVE_SUPPORT_API || 'http://127.0.0.1:3900';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const response = await fetch(
      `${LIVE_SUPPORT_API}/api/live-support/session/${userId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[/api/live-support/session] Error:', error);
    return NextResponse.json(
      { success: true, sessionId: null, messages: [] }
    );
  }
}
