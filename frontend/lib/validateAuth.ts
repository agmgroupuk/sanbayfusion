import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify request using HttpOnly session cookie.
 * This checks if the session cookie exists - actual validation happens on backend.
 * Supports both 'session_id' and 'sessionId' cookie names for compatibility.
 */
export function verifyRequest(request: NextRequest) {
  // Check for session cookie (HttpOnly session-based auth)
  // Support both naming conventions for compatibility
  const sessionId = request.cookies.get('session_id')?.value 
    || request.cookies.get('sessionId')?.value;

  if (!sessionId) {
    return { ok: false, error: 'No session found' };
  }

  // Session exists - backend will validate it when we proxy the request
  return { ok: true, sessionId };
}

/**
 * Async version that actually verifies the session with the backend.
 * Use this when you need to get user data from the session.
 */
export async function verifyRequestAsync(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value
    || request.cookies.get('sessionId')?.value;

  if (!sessionId) {
    return { ok: false, error: 'No session found' };
  }

  try {
    const backendBase = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:3005';
    // Backend endpoint is /api/auth/session (returns { success, user })
    const response = await fetch(`${backendBase}/api/auth/session`, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { ok: false, error: 'Invalid or expired session' };
    }

    const data = await response.json();
    // Backend returns { success: true, user: {...} | null }
    if (!data.success || !data.user) {
      return { ok: false, error: data.message || 'Session not valid' };
    }

    return { ok: true, user: data.user, sessionId };
  } catch (err: any) {
    return { ok: false, error: 'Session verification failed' };
  }
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}
