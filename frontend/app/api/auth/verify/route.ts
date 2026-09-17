import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Session verification — queries the database directly via Prisma.
 * No dependency on the old backend (port 3005).
 */
async function verifySession(request: NextRequest) {
  // Read sessionId from cookies (OAuth + login both set this)
  const sessionId = request.cookies.get('sessionId')?.value || request.cookies.get('session_id')?.value;

  if (!sessionId) {
    return NextResponse.json(
      { valid: false, success: true, user: null },
      { status: 200 }
    );
  }

  try {
    const user = await prisma.user.findFirst({
      where: { sessionId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        sessionExpiry: true,
      },
    });

    // Check session exists and hasn't expired
    if (!user || (user.sessionExpiry && new Date(user.sessionExpiry) < new Date())) {
      // Clear stale cookies
      const response = NextResponse.json(
        { valid: false, success: true, user: null },
        { status: 200 }
      );
      response.cookies.set('sessionId', '', { maxAge: 0, path: '/' });
      response.cookies.set('session_id', '', { maxAge: 0, path: '/' });
      return response;
    }

    return NextResponse.json(
      {
        valid: true,
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[auth/verify] Database error:', error);
    return NextResponse.json(
      { valid: false, success: false, message: 'Session verification failed' },
      { status: 200 }
    );
  }
}

export async function GET(request: NextRequest) {
  return verifySession(request);
}

// Keep POST for AuthContext compatibility
export async function POST(request: NextRequest) {
  return verifySession(request);
}
