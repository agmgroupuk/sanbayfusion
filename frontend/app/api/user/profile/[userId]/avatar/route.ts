import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB to allow higher quality avatars
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const sessionId = request.cookies.get('session_id')?.value ||
                      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({ message: 'No session ID' }, { status: 401 });
    }

    const sessionUser = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const sessionUserId = sessionUser.id;

    if (params.userId && params.userId !== sessionUserId) {
      console.warn('Avatar upload mismatch. Using session user.', {
        sessionUserId,
        requestedUserId: params.userId,
      });
    }

    const targetUserId = sessionUserId;

    const formData = await request.formData();
    const avatar = formData.get('avatar');

    if (!avatar || typeof avatar === 'string') {
      return NextResponse.json(
        { message: 'No avatar file uploaded' },
        { status: 400 }
      );
    }

    const fileArrayBuffer = await avatar.arrayBuffer();
    const fileSize = fileArrayBuffer.byteLength;

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          message:
            'File too large. Max size is 5MB. Please compress the image.',
        },
        { status: 413 }
      );
    }

    const mimeType = avatar.type || 'image/png';

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { message: 'Unsupported file type. Use PNG, JPEG, or WEBP.' },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(fileArrayBuffer).toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        avatar: dataUrl,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        avatar: true,
      },
    });

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Avatar updated successfully',
        avatar: updatedUser.avatar,
        avatarUrl: updatedUser.avatar,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Profile avatar upload error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
