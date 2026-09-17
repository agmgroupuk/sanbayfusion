import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAsync, unauthorizedResponse } from '@/lib/validateAuth';

// Get user from session cookie via backend verification
async function getUserFromRequest(request: NextRequest) {
  const result = await verifyRequestAsync(request);
  if (!result.ok || !result.user) return null;
  return result.user;
}

// GET /api/canvas/apps - List all canvas apps for the user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const favorite = searchParams.get('favorite');

    const where: any = {
      userId: user.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { prompt: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (favorite === 'true') {
      where.isFavorite = true;
    }

    const [apps, total] = await Promise.all([
      prisma.canvasApp.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          prompt: true,
          code: true,
          language: true,
          provider: true,
          modelId: true,
          thumbnail: true,
          isFavorite: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      prisma.canvasApp.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      apps,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Canvas Apps API] GET Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch canvas apps'
    }, { status: 500 });
  }
}

// POST /api/canvas/apps - Create a new canvas app
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { name, prompt, code, language, provider, modelId, thumbnail, history, metadata } = body;

    if (!prompt || !code) {
      return NextResponse.json({
        success: false,
        error: 'Prompt and code are required'
      }, { status: 400 });
    }

    const app = await prisma.canvasApp.create({
      data: {
        userId: user.id,
        name: name || `App ${new Date().toLocaleDateString()}`,
        prompt,
        code,
        language: language || 'html',
        provider: provider || null,
        modelId: modelId || null,
        thumbnail: thumbnail || null,
        history: history || [],
        metadata: metadata || {},
      }
    });

    return NextResponse.json({
      success: true,
      app
    });
  } catch (error) {
    console.error('[Canvas Apps API] POST Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create canvas app'
    }, { status: 500 });
  }
}

// DELETE /api/canvas/apps - Bulk delete canvas apps (clear all)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids'); // comma-separated IDs

    if (ids) {
      // Delete specific apps
      const idList = ids.split(',').filter(Boolean);
      await prisma.canvasApp.deleteMany({
        where: {
          userId: user.id,
          id: { in: idList }
        }
      });
    } else {
      // Delete all apps for user
      await prisma.canvasApp.deleteMany({
        where: { userId: user.id }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Canvas apps deleted'
    });
  } catch (error) {
    console.error('[Canvas Apps API] DELETE Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete canvas apps'
    }, { status: 500 });
  }
}
