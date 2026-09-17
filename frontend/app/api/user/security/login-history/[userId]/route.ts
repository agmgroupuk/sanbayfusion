import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get session ID from HttpOnly cookie (check both names for compatibility)
    const sessionId = request.cookies.get('session_id')?.value ||
                      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({ message: 'No session ID' }, { status: 401 });
    }

    // Find user with valid session
    const sessionUser = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Check if user is requesting their own login history
    if (sessionUser.id !== params.userId) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Get login history from userSecurity
    const userSecurity = await prisma.userSecurity.findUnique({
      where: { userId: sessionUser.id },
    });

    const loginHistory = (userSecurity?.loginHistory as any[]) || [
      {
        id: 1,
        date: new Date().toISOString(),
        location: 'Current Location',
        device: 'Current Device',
        status: 'success',
        ip: '127.0.0.1',
      },
    ];

    return NextResponse.json({ loginHistory }, { status: 200 });
  } catch (error) {
    console.error('Login history fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
