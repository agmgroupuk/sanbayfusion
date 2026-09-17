import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');

  // Map common auth errors to user-friendly messages
  const errorMessages: { [key: string]: string } = {
    'CredentialsSignin': 'Invalid email or password',
    'EmailNotVerified': 'Please verify your email before signing in',
    'AccountNotLinked': 'Account with this email already exists',
    'Default': 'Authentication error occurred'
  };

  const message = error ? (errorMessages[error] || errorMessages['Default']) : 'Unknown authentication error';

  // Return 200 status to prevent console errors, but include error info in response
  return NextResponse.json({
    success: false,
    error: error || 'unknown',
    message
  }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const { error, message } = await request.json();
    
    // Return 200 status to prevent console errors, but include error info in response
    return NextResponse.json({
      success: false,
      error: error || 'unknown',
      message: message || 'Authentication error occurred'
    }, { status: 200 });
  } catch {
    return NextResponse.json({
      success: false,
      error: 'invalid_request',
      message: 'Invalid error request'
    }, { status: 200 });
  }
}