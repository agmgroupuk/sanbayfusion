import { NextRequest } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const backendBase = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:3005';

/**
 * Server-Sent Events (SSE) endpoint for real-time status updates
 * Proxies to backend SSE stream for REAL data
 */
export async function GET(request: NextRequest) {
  const targetUrl = `${backendBase}/api/status/stream`;

  try {
    // Fetch from backend SSE endpoint
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        cookie: request.headers.get('cookie') || '',
      },
      // @ts-ignore - needed for streaming
      cache: 'no-store',
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Backend SSE unavailable' }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Stream the response directly from backend
    const body = response.body;
    if (!body) {
      return new Response(
        JSON.stringify({ success: false, error: 'No stream available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return the proxied SSE stream
    return new Response(body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error proxying SSE stream:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to connect to backend SSE',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
