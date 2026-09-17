import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import {
  notifyNewReply,
  notifyStatusChange,
  notifySlaBreach
} from '@/lib/services/emailNotifications';

// =====================================================
// Auth Check — session-based (same as all other routes)
// =====================================================
async function verifyAdmin(req: NextRequest): Promise<{ isAdmin: boolean; user?: any; error?: string }> {
  try {
    const sessionId =
      req.cookies.get('sessionId')?.value ||
      req.cookies.get('session_id')?.value;

    if (!sessionId) {
      return { isAdmin: false, error: 'Not authenticated' };
    }

    const user = await prisma.user.findFirst({
      where: { sessionId },
      select: { id: true, email: true, name: true, role: true, sessionExpiry: true },
    });

    if (!user || (user.sessionExpiry && new Date(user.sessionExpiry) < new Date())) {
      return { isAdmin: false, error: 'Session expired' };
    }

    if (user.role !== 'admin') {
      return { isAdmin: false, error: 'Admin access required' };
    }

    return { isAdmin: true, user };
  } catch (error) {
    return { isAdmin: false, error: 'Auth verification failed' };
  }
}

// =====================================================
// Email Notification Helper (use service)
// =====================================================
async function sendNotificationEmail(to: string, subject: string, body: string) {
  // Legacy function - now using emailNotifications service
  // Keeping for backwards compatibility
  console.log(`[EMAIL NOTIFICATION] To: ${to}, Subject: ${subject}`);
}

// =====================================================
// GET - Get All Tickets (Admin)
// =====================================================
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const slaBreached = searchParams.get('slaBreached') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Build Prisma where clause
    const where: any = {};

    if (status && status !== 'all') {
      // Map status to Prisma enum
      const statusMap: Record<string, string> = {
        'open': 'open',
        'in-progress': 'in_progress',
        'waiting-customer': 'waiting',
        'resolved': 'resolved',
        'closed': 'closed'
      };
      where.status = statusMap[status] || status;
    }

    if (priority && priority !== 'all') where.priority = priority;
    if (category && category !== 'all') where.category = category;

    // Note: SLA breach tracking would need to be stored in metadata JSON
    if (slaBreached) {
      where.metadata = {
        path: ['sla', 'breached'],
        equals: true
      };
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get tickets with Prisma
    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    // Get stats using Prisma aggregation
    const [total, openCount, inProgressCount, waitingCount, resolvedCount, closedCount, urgentCount] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.count({ where: { ...where, status: 'open' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'in_progress' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'waiting' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'resolved' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'closed' } }),
      prisma.supportTicket.count({ where: { ...where, priority: 'urgent' } })
    ]);

    const formattedStats = {
      total,
      open: openCount,
      inProgress: inProgressCount,
      waitingCustomer: waitingCount,
      resolved: resolvedCount,
      closed: closedCount,
      urgent: urgentCount,
      breachedSla: 0 // Would need to query metadata for this
    };

    // Format tickets for frontend — map Prisma response to expected interface
    const formattedTickets = tickets.map((t: any) => {
      const meta = (t.metadata as any) || {};
      // Map Prisma status back to frontend status format
      const statusMap: Record<string, string> = {
        'open': 'open',
        'in_progress': 'in-progress',
        'waiting': 'waiting-customer',
        'resolved': 'resolved',
        'closed': 'closed',
      };
      return {
        _id: t.id,
        ticketId: t.id,
        ticketNumber: meta.ticketNumber || 0,
        userId: t.userId || t.user?.id || '',
        userEmail: t.email || t.user?.email || '',
        userName: t.name || t.user?.name || '',
        subject: t.subject,
        description: t.description,
        category: t.category || 'general',
        priority: t.priority,
        status: statusMap[t.status] || t.status,
        assignedTo: t.assignedTo || undefined,
        assignedName: meta.assignedName || undefined,
        messages: meta.messages || [],
        sla: meta.sla || undefined,
        satisfaction: meta.satisfaction || undefined,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        lastActivityAt: t.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      tickets: formattedTickets,
      stats: formattedStats,
      pagination: {
        page,
        limit,
        total: formattedStats.total,
        totalPages: Math.ceil(formattedStats.total / limit)
      }
    });

  } catch (error) {
    console.error('Admin get tickets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Reply to Ticket / Update Status (Admin)
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { ticketId, message, isInternal, newStatus, assignTo, agentName } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Missing ticketId' },
        { status: 400 }
      );
    }

    // Find ticket first
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Get current metadata or initialize
    const currentMetadata = (ticket.metadata as any) || {};
    const messages = currentMetadata.messages || [];

    // Add message if provided
    if (message && message.trim()) {
      const newMessage = {
        sender: 'support',
        senderName: agentName || 'Support Team',
        message: message.trim(),
        isInternal: isInternal || false,
        createdAt: new Date().toISOString()
      };

      messages.push(newMessage);
      currentMetadata.messages = messages;
      currentMetadata.lastActivityAt = new Date().toISOString();

      // Mark first response for SLA
      if (!currentMetadata.sla?.firstResponseAt && !isInternal) {
        currentMetadata.sla = currentMetadata.sla || {};
        currentMetadata.sla.firstResponseAt = new Date().toISOString();
      }

      // Send email notification to customer (unless internal note)
      if (!isInternal && ticket.email) {
        await notifyNewReply({
          ticketNumber: currentMetadata.ticketNumber || ticket.id,
          ticketId: ticket.id,
          subject: ticket.subject,
          userName: ticket.name || 'Customer',
          userEmail: ticket.email,
          message: message.trim()
        });
      }
    }

    // Update status if changed
    if (newStatus && newStatus !== ticket.status) {
      // Map status format
      const statusMap: Record<string, string> = {
        'open': 'open',
        'in-progress': 'in_progress',
        'waiting-customer': 'waiting',
        'resolved': 'resolved',
        'closed': 'closed'
      };
      updateData.status = statusMap[newStatus] || newStatus;

      // Add system message for status change
      const statusMessage = {
        sender: 'system',
        senderName: 'System',
        message: `Ticket status changed to: ${newStatus.replace('-', ' ')}`,
        isInternal: false,
        createdAt: new Date().toISOString()
      };

      messages.push(statusMessage);
      currentMetadata.messages = messages;

      // Handle resolution
      if (newStatus === 'resolved') {
        currentMetadata.resolution = currentMetadata.resolution || {};
        currentMetadata.resolution.resolvedAt = new Date().toISOString();
        currentMetadata.resolution.resolvedBy = auth.user?.id;
        updateData.resolvedAt = new Date();

        // Send resolution email
        if (ticket.email) {
          await notifyStatusChange({
            ticketNumber: currentMetadata.ticketNumber || ticket.id,
            ticketId: ticket.id,
            subject: ticket.subject,
            userName: ticket.name || 'Customer',
            userEmail: ticket.email,
            status: 'resolved'
          });
        }
      }

      if (newStatus === 'waiting-customer' && ticket.email) {
        // Send email asking for response
        await notifyStatusChange({
          ticketNumber: currentMetadata.ticketNumber || ticket.id,
          ticketId: ticket.id,
          subject: ticket.subject,
          userName: ticket.name || 'Customer',
          userEmail: ticket.email,
          status: 'waiting-customer'
        });
      }
    }

    // Update assignment if changed
    if (assignTo !== undefined) {
      updateData.assignedTo = assignTo || null;
    }

    updateData.metadata = currentMetadata;

    // Apply update
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: { user: { select: { id: true, email: true, name: true } } }
    });

    // Format for frontend
    const meta = (updatedTicket.metadata as any) || {};
    const statusMapReverse: Record<string, string> = {
      'open': 'open',
      'in_progress': 'in-progress',
      'waiting': 'waiting-customer',
      'resolved': 'resolved',
      'closed': 'closed',
    };
    const formattedTicket = {
      _id: updatedTicket.id,
      ticketId: updatedTicket.id,
      ticketNumber: meta.ticketNumber || 0,
      userId: updatedTicket.userId || (updatedTicket as any).user?.id || '',
      userEmail: updatedTicket.email || (updatedTicket as any).user?.email || '',
      userName: updatedTicket.name || (updatedTicket as any).user?.name || '',
      subject: updatedTicket.subject,
      description: updatedTicket.description,
      category: updatedTicket.category || 'general',
      priority: updatedTicket.priority,
      status: statusMapReverse[updatedTicket.status] || updatedTicket.status,
      assignedTo: updatedTicket.assignedTo || undefined,
      assignedName: meta.assignedName || undefined,
      messages: meta.messages || [],
      sla: meta.sla || undefined,
      satisfaction: meta.satisfaction || undefined,
      createdAt: updatedTicket.createdAt,
      updatedAt: updatedTicket.updatedAt,
      lastActivityAt: updatedTicket.updatedAt,
    };

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket: formattedTicket
    });

  } catch (error) {
    console.error('Admin update ticket error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Check SLA Breaches (Cron/Manual)
// =====================================================
export async function PATCH(req: NextRequest) {
  try {
    // This can be called by a cron job or manually
    const auth = await verifyAdmin(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const now = new Date();

    // Find open tickets that might have breached SLA
    const openTickets = await prisma.supportTicket.findMany({
      where: {
        status: {
          notIn: ['resolved', 'closed']
        }
      }
    });

    const breachedIds: string[] = [];

    for (const ticket of openTickets) {
      const metadata = (ticket.metadata as any) || {};
      const sla = metadata.sla || {};

      // Check if SLA is breached
      const isBreached =
        (sla.firstResponseDue && new Date(sla.firstResponseDue) < now && !sla.firstResponseAt) ||
        (sla.resolutionDue && new Date(sla.resolutionDue) < now);

      if (isBreached && !sla.breached) {
        // Mark as breached
        metadata.sla = metadata.sla || {};
        metadata.sla.breached = true;
        metadata.messages = metadata.messages || [];
        metadata.messages.push({
          sender: 'system',
          senderName: 'System',
          message: '⚠️ SLA BREACHED - This ticket requires immediate attention!',
          isInternal: true,
          createdAt: new Date().toISOString()
        });

        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: {
            priority: 'urgent',
            metadata,
            updatedAt: new Date()
          }
        });

        breachedIds.push(ticket.id);

        // Send notification to admins
        if (ticket.email) {
          await notifySlaBreach({
            ticketNumber: metadata.ticketNumber || ticket.id,
            ticketId: ticket.id,
            subject: ticket.subject,
            userName: ticket.name || 'Customer',
            userEmail: ticket.email,
            priority: 'urgent'
          }, 'support@maula.ai');
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `SLA check complete. ${breachedIds.length} tickets breached.`,
      breachedTickets: breachedIds
    });

  } catch (error) {
    console.error('SLA check error:', error);
    return NextResponse.json(
      { error: 'Failed to check SLA' },
      { status: 500 }
    );
  }
}
