/**
 * Get User Agent Subscriptions API
 * Returns all agent subscriptions for a specific user
 * Queries Prisma directly — no backend proxy needed
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Canvas apps have their own billing section — exclude them from agent subscriptions
    const CANVAS_AGENT_IDS = ['gencraft-pro', 'canvas-studio'];

    const subscriptions = await prisma.agentSubscription.findMany({
      where: {
        userId,
        agentId: { notIn: CANVAS_AGENT_IDS },
      },
      include: {
        agent: {
          select: {
            agentId: true,
            name: true,
            description: true,
            avatarUrl: true,
            specialty: true,
            color: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, subscriptions });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch subscriptions',
        subscriptions: [],
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
