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

    // Check if user is requesting their own device info
    if (sessionUser.id !== params.userId) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Get devices from userSecurity
    const userSecurity = await prisma.userSecurity.findUnique({
      where: { userId: sessionUser.id },
    });

    const devices = (userSecurity?.trustedDevices as any[]) || [
      {
        id: 1,
        name: 'Current Device',
        type: 'desktop',
        lastSeen: new Date().toISOString(),
        location: 'Current Location',
        browser: 'Current Browser',
        current: true,
      },
    ];

    return NextResponse.json({ devices }, { status: 200 });
  } catch (error) {
    console.error('Devices fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if user is managing their own devices
    if (sessionUser.id !== params.userId) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    const { deviceId } = await request.json();

    // Get current security data
    const userSecurity = await prisma.userSecurity.findUnique({
      where: { userId: sessionUser.id },
    });

    if (userSecurity) {
      const trustedDevices = (userSecurity.trustedDevices as any[]) || [];
      const updatedDevices = trustedDevices.filter(
        (device: any) => device.id !== deviceId
      );

      await prisma.userSecurity.update({
        where: { userId: sessionUser.id },
        data: {
          trustedDevices: updatedDevices,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      { message: 'Device removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Device removal error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
