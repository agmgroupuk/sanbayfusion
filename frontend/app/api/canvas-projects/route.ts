import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3005';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    const response = await fetch(`${BACKEND_URL}/api/canvas-projects/projects`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    if (!response.ok) {
      // For auth errors, return empty projects gracefully (fallback to localStorage)
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({
          success: true,
          projects: [],
          message: 'Using local storage for projects'
        });
      }
      const error = await response.text();
      console.error('[Canvas Projects API] List error:', error);
      return NextResponse.json({
        success: true,
        projects: [],
        error: 'Failed to fetch projects'
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Canvas Projects API] Error:', error);
    // Return empty projects on error so localStorage fallback works
    return NextResponse.json({
      success: true,
      projects: [],
      error: 'Backend unavailable'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/canvas-projects/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Canvas Projects API] Save error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to save project'
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Canvas Projects API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save project'
    }, { status: 500 });
  }
}
