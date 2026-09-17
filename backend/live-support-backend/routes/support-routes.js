/**
 * SUPPORT ROUTES — Tickets, consultations, contact messages
 * Ported from backend/routes/support.js → Direct Prisma calls
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import {
  notifyAdminContactForm,
  notifyAdminSupportTicket,
  notifyAdminConsultation,
  sendContactFormAutoReply,
} from '../services/email.js';

const router = express.Router();

// ============================================
// SUPPORT TICKETS
// ============================================

// POST /api/support/tickets - Create a new support ticket
router.post('/tickets', async (req, res) => {
  try {
    const { userId, userEmail, userName, subject, description, category, priority, relatedAgent, relatedSubscription } = req.body;

    if (!userId || !userEmail || !subject || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketId: `tkt_${Date.now()}_${uuidv4().slice(0, 8)}`,
        userId,
        userEmail,
        userName,
        subject,
        description,
        category,
        priority: priority || 'medium',
        status: 'open',
        messages: [
          { sender: 'customer', senderId: userId, senderName: userName, message: description, createdAt: new Date().toISOString() },
        ],
        metadata: { relatedAgent, relatedSubscription },
      },
    });

    // Send admin notification (non-blocking)
    notifyAdminSupportTicket({
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
      subject,
      userName: userName || 'Unknown',
      userEmail,
      category,
      priority: priority || 'medium',
    }).catch(err => console.error('Failed to send admin notification:', err));

    res.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
      message: 'Support ticket created successfully',
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// GET /api/support/tickets/user/:userId - Get user's tickets
router.get('/tickets/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        select: { ticketId: true, ticketNumber: true, subject: true, category: true, status: true, priority: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({
      success: true,
      tickets,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/support/tickets/:ticketId - Get single ticket
router.get('/tickets/:ticketId', async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { ticketId: req.params.ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// POST /api/support/tickets/:ticketId/messages - Add message to ticket
router.post('/tickets/:ticketId/messages', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { senderId, senderName, message, attachments } = req.body;

    const ticket = await prisma.supportTicket.findUnique({ where: { ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    messages.push({ sender: 'customer', senderId, senderName, message, attachments, createdAt: new Date().toISOString() });

    await prisma.supportTicket.update({
      where: { ticketId },
      data: { messages, lastActivityAt: new Date(), status: 'open' },
    });

    res.json({ success: true, message: 'Message added successfully' });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// POST /api/support/tickets/:ticketId/satisfaction - Submit rating
router.post('/tickets/:ticketId/satisfaction', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, feedback } = req.body;

    const ticket = await prisma.supportTicket.findUnique({ where: { ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await prisma.supportTicket.update({
      where: { ticketId },
      data: { satisfaction: { rating, feedback, ratedAt: new Date().toISOString() } },
    });

    res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (error) {
    console.error('Error submitting satisfaction:', error);
    res.status(500).json({ error: 'Failed to submit satisfaction' });
  }
});

// ============================================
// CONSULTATIONS
// ============================================

// POST /api/support/consultations - Request consultation
router.post('/consultations', async (req, res) => {
  try {
    const { userId, userEmail, userName, userPhone, consultationType, company, project, preferredDates, timezone, source } = req.body;

    if (!userEmail || !userName || !consultationType || !project?.description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const consultation = await prisma.consultation.create({
      data: {
        consultationId: `cons_${Date.now()}_${uuidv4().slice(0, 8)}`,
        userId,
        userEmail,
        userName,
        userPhone,
        consultationType,
        company: company || null,
        project: project || null,
        preferredDates: preferredDates || null,
        timezone: timezone || 'UTC',
        source,
        status: 'requested',
      },
    });

    notifyAdminConsultation({
      consultationId: consultation.consultationId,
      consultationNumber: consultation.consultationNumber || 0,
      userName,
      userEmail,
      userPhone,
      consultationType,
      projectDescription: project?.description || '',
    }).catch(err => console.error('Failed to send admin notification:', err));

    res.json({
      success: true,
      consultation: {
        consultationId: consultation.consultationId,
        status: consultation.status,
        createdAt: consultation.createdAt,
      },
      message: 'Consultation request submitted. We will contact you soon!',
    });
  } catch (error) {
    console.error('Error creating consultation:', error);
    res.status(500).json({ error: 'Failed to create consultation request' });
  }
});

// GET /api/support/consultations/user/:userId
router.get('/consultations/user/:userId', async (req, res) => {
  try {
    const consultations = await prisma.consultation.findMany({
      where: { userId: req.params.userId },
      select: { consultationId: true, consultationType: true, status: true, scheduledAt: true, meetingUrl: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, consultations });
  } catch (error) {
    console.error('Error fetching consultations:', error);
    res.status(500).json({ error: 'Failed to fetch consultations' });
  }
});

// GET /api/support/consultations/:consultationId
router.get('/consultations/:consultationId', async (req, res) => {
  try {
    const consultation = await prisma.consultation.findUnique({ where: { consultationId: req.params.consultationId } });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    res.json({ success: true, consultation });
  } catch (error) {
    console.error('Error fetching consultation:', error);
    res.status(500).json({ error: 'Failed to fetch consultation' });
  }
});

// POST /api/support/consultations/:consultationId/feedback
router.post('/consultations/:consultationId/feedback', async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { rating, comment, wouldRecommend } = req.body;

    const consultation = await prisma.consultation.findUnique({ where: { consultationId } });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });

    await prisma.consultation.update({
      where: { consultationId },
      data: { feedback: { rating, comment, wouldRecommend, submittedAt: new Date().toISOString() } },
    });

    res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ============================================
// CONTACT MESSAGES
// ============================================

// POST /api/support/contact (also handles /api/contact)
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message, agentName, category, priority } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
        agentName,
        category: category || 'general',
        priority: priority || 'normal',
        metadata: {
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          referrer: req.get('Referer'),
        },
      },
    });

    sendContactFormAutoReply(email, { name, subject, message, ticketId: contactMessage.ticketId })
      .catch(err => console.error('Failed to send auto-reply:', err));

    notifyAdminContactForm({ name, email, subject, message, ticketId: contactMessage.ticketId })
      .catch(err => console.error('Failed to send admin notification:', err));

    res.json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.',
      ticketId: contactMessage.ticketId,
    });
  } catch (error) {
    console.error('Error submitting contact message:', error);
    res.status(500).json({ error: 'Failed to submit message' });
  }
});

// GET /api/support/contact - Get contact messages (admin)
router.get('/contact', async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const [messages, totalDocs] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.contactMessage.count({ where }),
    ]);

    // Stats
    const allMessages = await prisma.contactMessage.findMany({ select: { status: true } });
    const stats = {
      total: allMessages.length,
      pending: allMessages.filter(m => m.status === 'pending').length,
      read: allMessages.filter(m => m.status === 'read').length,
      replied: allMessages.filter(m => m.status === 'replied').length,
      closed: allMessages.filter(m => m.status === 'closed').length,
    };

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(totalDocs / parseInt(limit)),
        total: totalDocs,
        limit: parseInt(limit),
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/support/contact/stats/overview
router.get('/contact/stats/overview', async (req, res) => {
  try {
    const allMessages = await prisma.contactMessage.findMany({
      select: { status: true, category: true, createdAt: true },
    });

    const total = allMessages.length;
    const pending = allMessages.filter(m => m.status === 'pending').length;
    const read = allMessages.filter(m => m.status === 'read').length;
    const replied = allMessages.filter(m => m.status === 'replied').length;
    const closed = allMessages.filter(m => m.status === 'closed').length;
    const responseRate = total > 0 ? (replied / total) * 100 : 0;

    const categoryMap = {};
    allMessages.forEach(m => {
      const cat = m.category || 'uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categoryStats = Object.entries(categoryMap)
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => b.count - a.count);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMessages = allMessages.filter(m => new Date(m.createdAt) >= thirtyDaysAgo);
    const dateMap = {};
    recentMessages.forEach(m => {
      const dateStr = new Date(m.createdAt).toISOString().split('T')[0];
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    });
    const recentStats = Object.entries(dateMap)
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => a._id.localeCompare(b._id));

    res.json({
      success: true,
      data: {
        overview: { total, pending, read, replied, closed, responseRate },
        categories: categoryStats,
        recentActivity: recentStats,
      },
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/support/contact/:id - Get specific contact message
router.get('/contact/:id', async (req, res) => {
  try {
    const message = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error fetching contact message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// PATCH /api/support/contact/:id/status
router.patch('/contact/:id/status', async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    const data = {};
    if (status) data.status = status;
    if (assignedTo) data.assignedTo = assignedTo;

    const message = await prisma.contactMessage.update({ where: { id: req.params.id }, data });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// POST /api/support/contact/:id/response
router.post('/contact/:id/response', async (req, res) => {
  try {
    const { content, respondedBy } = req.body;
    if (!content || !respondedBy) return res.status(400).json({ error: 'Missing required fields' });

    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: {
        response: { content, respondedBy, respondedAt: new Date().toISOString() },
        status: 'replied',
      },
    });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({ error: 'Failed to add response' });
  }
});

export default router;
