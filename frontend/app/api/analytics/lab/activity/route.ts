import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3005';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';
    
    const response = await fetch(`${BACKEND_URL}/api/analytics/lab/activity?limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      // If backend doesn't have this endpoint, return empty activity
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          activity: [],
          message: 'No activity data available'
        });
      }
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching lab activity:', error);
    // Return empty activity on error to prevent UI breaking
    return NextResponse.json({
      success: true,
      activity: [],
      message: 'Activity data temporarily unavailable'
    });
  }
}
