import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
      select: { id: true, email: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Deactivate account and clear personal data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: false,
        name: '[deleted]',
        bio: null,
        phoneNumber: null,
        location: null,
        avatar: null,
        image: null,
        socialLinks: {},
        sessionId: null,
        sessionExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
