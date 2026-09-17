import { NextRequest, NextResponse } from 'next/server';

// ⚠️ SECURITY: Proxy-only route — routes to live-support-backend
// Agent-chat endpoint with full user context for personalized support

const LIVE_SUPPORT_API = process.env.LIVE_SUPPORT_API || 'http://127.0.0.1:3900';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }
    
    if (!body.userContext?.userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 400 });
    }

    const response = await fetch(`${LIVE_SUPPORT_API}/api/live-support/agent-chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: body.message,
        conversationHistory: body.conversationHistory || [],
        userContext: body.userContext,
        sessionId: body.sessionId || null,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to get response' }, 
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[/api/live-support/agent-chat] Error:', error);
    return NextResponse.json(
      { error: 'Support service unavailable. Please try again.' }, 
      { status: 503 }
    );
  }
}
