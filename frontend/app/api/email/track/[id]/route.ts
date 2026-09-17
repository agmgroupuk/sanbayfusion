import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 1x1 transparent PNG pixel
const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Strip .png extension if present
  const trackingId = id.replace(/\.png$/, '');

  // Update email log record (fire-and-forget, don't block response)
  if (trackingId) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
    const userAgent = req.headers.get('user-agent') || '';

    prisma.emailLog.update({
      where: { id: trackingId },
      data: {
        status: 'opened',
        openedAt: new Date(),
        openCount: { increment: 1 },
        userAgent,
        ip,
      },
    }).catch(() => {
      // Silently ignore — invalid tracking ID or DB error
    });
  }

  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(TRACKING_PIXEL.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
