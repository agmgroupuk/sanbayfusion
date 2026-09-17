import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAsync } from '@/lib/validateAuth';

// Get user from session cookie via backend verification
async function getUserFromRequest(request: NextRequest) {
  const result = await verifyRequestAsync(request);
  if (!result.ok || !result.user) return null;
  return result.user;
}

// GET /api/canvas/apps/[appId] - Get a specific canvas app
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    const { appId } = await params;

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const app = await prisma.canvasApp.findFirst({
      where: {
        id: appId,
        OR: [
          { userId: user.id },
          { isPublic: true }
        ]
      }
    });

    if (!app) {
      return NextResponse.json({
        success: false,
        error: 'Canvas app not found'
      }, { status: 404 });
    }

    // viewCount removed — field does not exist on CanvasApp model

    return NextResponse.json({
      success: true,
      app
    });
  } catch (error) {
    console.error('[Canvas Apps API] GET Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch canvas app'
    }, { status: 500 });
  }
}

// PATCH /api/canvas/apps/[appId] - Update a canvas app
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    const { appId } = await params;

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Verify ownership
    const existingApp = await prisma.canvasApp.findFirst({
      where: {
        id: appId,
        userId: user.id
      }
    });

    if (!existingApp) {
      return NextResponse.json({
        success: false,
        error: 'Canvas app not found or unauthorized'
      }, { status: 404 });
    }

    const body = await request.json();
    const { name, prompt, code, language, thumbnail, history, metadata, isFavorite, isPublic } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (prompt !== undefined) updateData.prompt = prompt;
    if (code !== undefined) updateData.code = code;
    if (language !== undefined) updateData.language = language;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (history !== undefined) updateData.history = history;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const app = await prisma.canvasApp.update({
      where: { id: appId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      app
    });
  } catch (error) {
    console.error('[Canvas Apps API] PATCH Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update canvas app'
    }, { status: 500 });
  }
}

// DELETE /api/canvas/apps/[appId] - Delete a canvas app
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    const { appId } = await params;

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Verify ownership and delete
    const app = await prisma.canvasApp.deleteMany({
      where: {
        id: appId,
        userId: user.id
      }
    });

    if (app.count === 0) {
      return NextResponse.json({
        success: false,
        error: 'Canvas app not found or unauthorized'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Canvas app deleted'
    });
  } catch (error) {
    console.error('[Canvas Apps API] DELETE Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete canvas app'
    }, { status: 500 });
  }
}
