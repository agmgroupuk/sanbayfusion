import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// =====================================================
// GET Handler - Get User's Tickets
// =====================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const ticketId = searchParams.get('ticketId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }
    
    // Get specific ticket
    if (ticketId) {
      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          userId,
        },
      });
      
      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        ticket
      });
    }
    
    // Build where clause
    const where: any = { userId };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Get total count
    const totalCount = await prisma.supportTicket.count({ where });
    
    // Get tickets with pagination
    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        subject: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });
    
    // Get status counts using groupBy
    const statusGroups = await prisma.supportTicket.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });
    
    const counts: Record<string, number> = {
      total: totalCount,
      open: 0,
      in_progress: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
    };
    
    statusGroups.forEach((item: any) => {
      if (item.status in counts) {
        counts[item.status] = item._count;
      }
    });
    
    return NextResponse.json({
      success: true,
      tickets,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      counts
    });
    
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json(
      { error: 'Failed to get tickets' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST Handler - Add Reply to Ticket
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, userId, message, userName } = body;
    
    if (!ticketId || !userId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketId, userId, message' },
        { status: 400 }
      );
    }
    
    // Find the ticket
    const existingTicket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
    });
    
    if (!existingTicket) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }
    
    // Update ticket with new message in metadata
    const existingMetadata = (existingTicket.metadata as any) || {};
    const existingMessages = existingMetadata.messages || [];
    
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'open', // Reopen if was waiting
        updatedAt: new Date(),
        metadata: {
          ...existingMetadata,
          messages: [
            ...existingMessages,
            {
              sender: 'customer',
              senderId: userId,
              senderName: userName || 'Customer',
              message,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Reply added successfully',
      ticket: {
        ticketId: ticket.id,
        status: ticket.status,
        updatedAt: ticket.updatedAt,
      }
    });
    
  } catch (error) {
    console.error('Add reply error:', error);
    return NextResponse.json(
      { error: 'Failed to add reply' },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH Handler - Rate Ticket / Close Ticket
// =====================================================
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, userId, action, rating, feedback } = body;
    
    if (!ticketId || !userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketId, userId, action' },
        { status: 400 }
      );
    }
    
    // Find the ticket
    const existingTicket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
    });
    
    if (!existingTicket) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }
    
    const existingMetadata = (existingTicket.metadata as any) || {};
    let updateData: any = {
      updatedAt: new Date(),
    };
    
    if (action === 'rate') {
      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Invalid rating. Must be between 1 and 5' },
          { status: 400 }
        );
      }
      
      updateData.metadata = {
        ...existingMetadata,
        satisfaction: {
          rating,
          feedback: feedback || '',
          ratedAt: new Date().toISOString(),
        },
      };
    } else if (action === 'close') {
      updateData.status = 'closed';
      updateData.resolvedAt = new Date();
    } else if (action === 'reopen') {
      updateData.status = 'open';
      updateData.resolvedAt = null;
    }
    
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });
    
    return NextResponse.json({
      success: true,
      message: `Ticket ${action}d successfully`,
      ticket: {
        ticketId: ticket.id,
        status: ticket.status,
        metadata: ticket.metadata,
      }
    });
    
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
