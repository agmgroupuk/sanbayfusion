/**
 * Next.js Middleware — API usage tracking
 * Logs every /api/* request to the ApiUsage table for dashboard monitoring.
 * Runs at the edge, so we fire-and-forget a tracking call after the response.
 */
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/api/:path*',
};

export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();

  // Skip tracking the tracking endpoint itself to avoid infinite loops
  // Also skip admin endpoints to reduce noise
  if (request.nextUrl.pathname.startsWith('/api/analytics/track') ||
      request.nextUrl.pathname.startsWith('/api/admin/')) {
    return response;
  }

  // Fire-and-forget: log API usage after the response
  const visitorId = request.cookies.get('_vid')?.value || 'anon';
  const endpoint = request.nextUrl.pathname;
  const method = request.method;
  const ua = request.headers.get('user-agent') || '';
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0';

  // Use waitUntil if available (Vercel/Edge), otherwise setTimeout
  const trackPayload = {
    visitorId,
    sessionId: 'api',
    endpoint,
    method,
    statusCode: 200, // middleware can't see final status, default 200
    responseTime: Date.now() - start,
    userAgent: ua,
    ipAddress: ip,
  };

  // Schedule the tracking call as a non-blocking fetch
  const origin = request.nextUrl.origin;
  try {
    // Edge-compatible: use fetch to our own tracking endpoint
    fetch(`${origin}/api/analytics/track/api-usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackPayload),
    }).catch(() => {});
  } catch {
    // Silent fail
  }

  return response;
}
