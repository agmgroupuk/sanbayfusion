import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Simple in-memory session store (resets on server restart)
// This is intentional for Studio - sessions are temporary and per-browser
const sessionStore = new Map<
  string,
  { messages: any[]; messageCount: number; createdAt: number }
>();
const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Generate a unique session key based on cookies (user-specific)
async function getSessionKey(req: NextRequest): Promise<string> {
  const cookieStore = await cookies();
  
  // First try authenticated user's session
  const sessionId = cookieStore.get('session_id')?.value || 
                    cookieStore.get('sessionId')?.value;
  if (sessionId) {
    return `studio_auth_${sessionId}`;
  }
  
  // Fallback: Generate a studio-specific session ID for this browser
  let studioSessionId = cookieStore.get('studio_session')?.value;
  if (!studioSessionId) {
    // Generate a new studio session ID (will be set in response)
    studioSessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }
  
  return `studio_guest_${studioSessionId}`;
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessionStore.entries()) {
    if (now - session.createdAt > SESSION_EXPIRY) {
      sessionStore.delete(key);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    cleanupExpiredSessions();
    const sessionKey = await getSessionKey(request);
    const session = sessionStore.get(sessionKey);

    if (!session) {
      return NextResponse.json({
        success: true,
        data: {
          isNew: true,
          messages: [],
          messageCount: 0,
          expired: false,
        },
      });
    }

    const now = Date.now();
    const expired = now - session.createdAt > SESSION_EXPIRY;

    if (expired) {
      sessionStore.delete(sessionKey);
      return NextResponse.json({
        success: true,
        data: {
          isNew: false,
          expired: true,
          messages: [],
          messageCount: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isNew: false,
        expired: false,
        messages: session.messages,
        messageCount: session.messageCount,
      },
    });
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionKey = await getSessionKey(request);

    const existingSession = sessionStore.get(sessionKey);
    const createdAt = existingSession?.createdAt || Date.now();

    sessionStore.set(sessionKey, {
      messages: body.messages || [],
      messageCount: body.messageCount || 0,
      createdAt,
    });

    // Set studio session cookie for guest users
    const cookieStore = await cookies();
    const existingStudioSession = cookieStore.get('studio_session')?.value;
    
    const response = NextResponse.json({
      success: true,
      message: 'Session saved',
    });
    
    // If no studio session exists and user isn't authenticated, set one
    if (!existingStudioSession && !cookieStore.get('session_id')?.value && !cookieStore.get('sessionId')?.value) {
      const newStudioSession = `${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      response.cookies.set('studio_session', newStudioSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 60, // 30 minutes
      });
    }
    
    return response;
  } catch (error) {
    console.error('Session POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionKey = await getSessionKey(request);
    sessionStore.delete(sessionKey);

    return NextResponse.json({
      success: true,
      message: 'Session cleared',
    });
  } catch (error) {
    console.error('Session DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}
