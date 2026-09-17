import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force dynamic rendering so we always hit the database
export const dynamic = 'force-dynamic';

const DEFAULT_PREFERENCES = {
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  currency: 'USD',
  notifications: {
    email: {
      enabled: true,
      frequency: 'immediate',
      types: ['security', 'billing', 'updates'],
    },
    push: {
      enabled: true,
      types: ['messages', 'reminders'],
    },
    sms: {
      enabled: false,
      types: [],
    },
  },
  dashboard: {
    defaultView: 'overview',
    widgets: ['profile', 'security', 'rewards', 'analytics'],
    layout: 'grid',
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    screenReader: false,
  },
  privacy: {
    showOnlineStatus: true,
    allowDataCollection: true,
    shareUsageStats: false,
  },
  integrations: {},
};

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get session ID from HttpOnly cookie (support both cookie names)
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
        preferences: true,
        timezone: true,
      },
    });

    if (!sessionUser) {
      return NextResponse.json(
        { message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Merge user preferences with defaults
    const userPrefs = sessionUser.preferences as Record<string, any> || {};
    const preferences = {
      ...DEFAULT_PREFERENCES,
      ...userPrefs,
      timezone: sessionUser.timezone || DEFAULT_PREFERENCES.timezone,
    };

    return NextResponse.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Preferences error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const updateData = await request.json();

    // Get session ID from HttpOnly cookie
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

    // Get current preferences
    const currentPrefs = sessionUser.preferences as Record<string, any> || {};
    
    // Merge with update data
    const updatedPrefs = {
      ...currentPrefs,
      ...updateData,
    };

    // Update timezone if provided
    const updateFields: any = {
      preferences: updatedPrefs,
    };
    
    if (updateData.timezone) {
      updateFields.timezone = updateData.timezone;
    }

    // Update user
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateFields,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Preferences updated successfully',
      data: { ...DEFAULT_PREFERENCES, ...updatedPrefs }
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
