import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function detectDeviceName(userAgent: string) {
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android Device';
  if (userAgent.includes('Macintosh')) return 'MacBook';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Linux')) return 'Linux Computer';
  return 'Unknown Device';
}

function detectDeviceType(userAgent: string) {
  if (userAgent.includes('Mobile') || userAgent.includes('iPhone'))
    return 'mobile';
  if (userAgent.includes('iPad') || userAgent.includes('Tablet'))
    return 'tablet';
  return 'desktop';
}

function detectBrowser(userAgent: string) {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
    return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown Browser';
}

function getRequestIp(request: NextRequest): string {
  const prioritizedHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
  ];

  for (const header of prioritizedHeaders) {
    const value = request.headers.get(header);
    if (value) {
      return value.split(',')[0].trim();
    }
  }

  return 'unknown';
}

function calculateSecurityScore(user: any) {
  let score = 50;

  // 2FA enabled: +25
  if (user.twoFactorEnabled) score += 25;

  // Password age check
  const updatedAt = user.updatedAt ? new Date(user.updatedAt) : new Date();
  const passwordAge = Date.now() - updatedAt.getTime();
  const daysOld = passwordAge / (1000 * 60 * 60 * 24);
  if (daysOld < 90) score += 15;
  else if (daysOld < 180) score += 10;
  else if (daysOld < 365) score += 5;

  // No failed login attempts: +5
  if ((user.loginAttempts || 0) === 0) score += 5;
  
  // Not locked: +5
  if (!user.lockUntil || new Date(user.lockUntil) < new Date()) score += 5;

  return Math.min(100, Math.max(0, score));
}

function generateSecurityRecommendations(user: any) {
  const recommendations: any[] = [];

  if (!user.twoFactorEnabled) {
    recommendations.push({
      id: 1,
      type: 'warning',
      title: 'Enable Two-Factor Authentication',
      description: 'Secure your account with 2FA for better protection',
      priority: 'high',
    });
  }

  const updatedAt = user.updatedAt ? new Date(user.updatedAt) : new Date();
  const passwordAge = Date.now() - updatedAt.getTime();
  const daysOld = passwordAge / (1000 * 60 * 60 * 24);
  if (daysOld > 180) {
    recommendations.push({
      id: 2,
      type: 'info',
      title: 'Update Your Password',
      description: 'Your password is over 6 months old. Consider updating it.',
      priority: 'medium',
    });
  }

  if ((user.loginAttempts || 0) > 3) {
    recommendations.push({
      id: 3,
      type: 'warning',
      title: 'Recent Failed Login Attempts',
      description: 'Someone may be trying to access your account',
      priority: 'high',
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: 4,
      type: 'success',
      title: 'Great Security Posture!',
      description: 'Your account security is well configured',
      priority: 'low',
    });
  }

  return recommendations;
}

export async function GET(
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
        emailVerified: true,
        authMethod: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        twoFactorEnabled: true,
        backupCodes: true,
        loginAttempts: true,
        lockUntil: true,
      },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown Browser';
    const userIP = getRequestIp(request);

    // Build current device info
    const currentDevice = {
      id: `device-${Date.now()}`,
      name: detectDeviceName(userAgent),
      type: detectDeviceType(userAgent),
      lastSeen: new Date().toISOString(),
      location: 'Current Session',
      browser: detectBrowser(userAgent),
      current: true,
      ipAddress: userIP,
    };

    // Build current session info
    const currentSession = {
      id: sessionId,
      createdAt: sessionUser.lastLoginAt || sessionUser.createdAt,
      lastActivity: new Date(),
      ipAddress: userIP,
      userAgent,
      isCurrent: true,
    };

    const isLocked = sessionUser.lockUntil && new Date(sessionUser.lockUntil) > new Date();

    const securityData = {
      email: sessionUser.email,
      emailVerified: !!sessionUser.emailVerified,
      authMethod: sessionUser.authMethod || 'password',
      lastLoginAt: sessionUser.lastLoginAt,
      accountCreatedAt: sessionUser.createdAt,
      passwordLastChanged: sessionUser.updatedAt,
      twoFactorEnabled: sessionUser.twoFactorEnabled || false,
      twoFactorMethod: 'authenticator',
      backupCodes: sessionUser.backupCodes || [],
      trustedDevices: [currentDevice],
      loginHistory: [{
        id: `login-${Date.now()}`,
        date: sessionUser.lastLoginAt?.toISOString() || new Date().toISOString(),
        device: `${detectBrowser(userAgent)} on ${detectDeviceName(userAgent)}`,
        location: 'Current Session',
        status: 'success',
        ip: userIP,
      }],
      activeSessions: [currentSession],
      failedLoginAttempts: sessionUser.loginAttempts || 0,
      accountLocked: isLocked,
      securityScore: calculateSecurityScore(sessionUser),
      recommendations: generateSecurityRecommendations(sessionUser),
    };

    return NextResponse.json({ success: true, data: securityData });
  } catch (error) {
    console.error('Security fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}

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
    });

    if (!sessionUser) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (action === 'revoke_session') {
      // Revoke the user's session
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: {
          sessionId: null,
          sessionExpiry: null,
        },
      });
      return NextResponse.json(
        { success: true, message: 'Session revoked successfully' },
        { status: 200 }
      );
    }

    if (action === 'enable_2fa') {
      return NextResponse.json(
        { message: 'Two-factor authentication setup not yet implemented' },
        { status: 501 }
      );
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Security action error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
