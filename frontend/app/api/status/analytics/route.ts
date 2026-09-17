import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const backendBase = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:3005';

export async function GET(request: NextRequest) {
  try {
    const incomingUrl = new URL(request.url);
    const targetUrl = new URL('/api/status/analytics', backendBase);

    incomingUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'content-type':
          response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Error proxying /api/status/analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
