/**
 * Newsletter Confirmation API Route
 * Proxies request to backend email service
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstileToken } from '@/lib/turnstile';

const BACKEND_URL = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:3005';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, turnstileToken } = body;

    // Verify Turnstile token
    if (turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(turnstileToken);
      if (!turnstileResult.success) {
        return NextResponse.json(
          { success: false, error: 'Security verification failed' },
          { status: 403 }
        );
      }
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Call backend email API
    const response = await fetch(`${BACKEND_URL}/api/email/newsletter-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to send confirmation' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Newsletter confirmation sent' });
  } catch (error) {
    console.error('Newsletter confirmation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}
