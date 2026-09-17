import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyTicketCreated } from '@/lib/services/emailNotifications';

// =====================================================
// Determine Category from Issue
// =====================================================
function determineCategory(issue: string): string {
  const lowerIssue = issue.toLowerCase();
  
  if (lowerIssue.includes('payment') || lowerIssue.includes('charge') || lowerIssue.includes('refund') || lowerIssue.includes('billing') || lowerIssue.includes('invoice')) {
    return 'billing';
  }
  if (lowerIssue.includes('subscription') || lowerIssue.includes('plan') || lowerIssue.includes('expire') || lowerIssue.includes('renew')) {
    return 'subscription';
  }
  if (lowerIssue.includes('agent') || lowerIssue.includes('einstein') || lowerIssue.includes('wizard')) {
    return 'agents';
  }
  if (lowerIssue.includes('account') || lowerIssue.includes('login') || lowerIssue.includes('password') || lowerIssue.includes('profile')) {
    return 'account';
  }
  if (lowerIssue.includes('bug') || lowerIssue.includes('error') || lowerIssue.includes('crash') || lowerIssue.includes('not working')) {
    return 'bug-report';
  }
  if (lowerIssue.includes('feature') || lowerIssue.includes('suggestion') || lowerIssue.includes('request')) {
    return 'feature-request';
  }
  if (lowerIssue.includes('technical') || lowerIssue.includes('api') || lowerIssue.includes('integration')) {
    return 'technical';
  }
  
  return 'general';
}

// =====================================================
// Determine Priority from Issue
// =====================================================
function determinePriority(issue: string): 'low' | 'medium' | 'high' | 'urgent' {
  const lowerIssue = issue.toLowerCase();
  
  if (lowerIssue.includes('urgent') || lowerIssue.includes('emergency') || lowerIssue.includes('critical') || lowerIssue.includes('immediately')) {
    return 'urgent';
  }
  if (lowerIssue.includes('important') || lowerIssue.includes('asap') || lowerIssue.includes('soon')) {
    return 'high';
  }
  if (lowerIssue.includes('not urgent') || lowerIssue.includes('whenever') || lowerIssue.includes('low priority')) {
    return 'low';
  }
  
  return 'medium';
}

// =====================================================
// POST Handler - Create Support Ticket
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      chatId,
      userId, 
      userEmail, 
      userName,
      subject,
      description,
      issue, // Alternative to description
      category,
      priority,
      messages = [], // Chat messages to include
      relatedAgent,
      relatedSubscription
    } = body;
    
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userEmail' },
        { status: 400 }
      );
    }
    
    const ticketDescription = description || issue || 'No description provided';
    const ticketSubject = subject || (ticketDescription.length > 50 
      ? ticketDescription.substring(0, 50) + '...' 
      : ticketDescription);
    
    // Create the ticket using Prisma
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        email: userEmail,
        name: userName,
        subject: ticketSubject,
        description: ticketDescription,
        category: category || determineCategory(ticketDescription),
        priority: priority || determinePriority(ticketDescription),
        status: 'open',
        metadata: {
          relatedAgent,
          relatedSubscription,
          relatedChatId: chatId,
          chatMessages: messages,
          tags: ['live-support', 'ai-escalated'],
        },
      },
    });
    
    // Send email notification to customer
    try {
      await notifyTicketCreated({
        ticketNumber: parseInt(ticket.id.slice(-6), 36), // Generate a numeric ticket number from ID
        ticketId: ticket.id,
        subject: ticket.subject,
        userName: userName || 'Customer',
        userEmail,
        priority: ticket.priority,
      });
    } catch (emailError) {
      console.error('Failed to send ticket notification email:', emailError);
      // Don't fail the request if email fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        ticketId: ticket.id,
        ticketNumber: parseInt(ticket.id.slice(-6), 36),
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
      }
    });
    
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}
