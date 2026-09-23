/**
 * LIVE CHAT ROUTES — AI-powered live support chat
 * Includes smart agent-chat endpoint with user context + ticket tool calling
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { notifyAdminSupportTicket } from '../services/email.js';

const router = express.Router();

// Provider config for live chat (OpenAI primary, XAI fallback)
const PROVIDER_CONFIGS = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4o-mini',
  },
  xai: {
    baseURL: 'https://api.x.ai/v1',
    apiKey: process.env.XAI_API_KEY,
    defaultModel: 'grok-2-latest',
  },
};

async function callProviderSync(providerKey, messages, model, maxTokens = 800) {
  const config = PROVIDER_CONFIGS[providerKey] || PROVIDER_CONFIGS.openai;
  const resp = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ model: model || config.defaultModel, messages, max_tokens: maxTokens }),
  });
  const data = await resp.json();
  return { content: data.choices?.[0]?.message?.content || '' };
}

// ============================================
// GET /api/live-support/session/:userId - Get user's active chat session
// ============================================
router.get('/session/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    
    // Find active session for this user
    const session = await prisma.liveChatSession.findFirst({
      where: { userId, status: 'active' },
      orderBy: { startedAt: 'desc' },
    });
    
    if (session) {
      return res.json({
        success: true,
        sessionId: session.sessionId,
        messages: session.messages || [],
        startedAt: session.startedAt,
      });
    }
    
    return res.json({ success: true, sessionId: null, messages: [] });
  } catch (error) {
    console.error('[session] Error:', error);
    return res.json({ success: true, sessionId: null, messages: [] });
  }
});

// ============================================
// POST /api/live-support - AI live chat (original endpoint)
// ============================================
router.post('/', async (req, res) => {
  try {
    const { issue, context = {} } = req.body;
    if (!issue) return res.status(400).json({ error: 'Issue required' });

    const response = await callProviderSync('openai', [
      { role: 'system', content: 'You are a helpful customer support agent for Sanbay Fusion. Provide clear, concise solutions. Be friendly and professional.' },
      { role: 'user', content: issue },
    ], null, 800);

    return res.json({ success: true, response: response.content });
  } catch (error) {
    console.error('[live-support] Error:', error);
    return res.status(503).json({ error: 'Support service unavailable' });
  }
});

// ============================================
// POST /api/support/live-chat - Live chat (frontend calls this)
// ============================================
router.post('/live-chat', async (req, res) => {
  try {
    const { message, userId, conversationHistory = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Build messages array with conversation history
    const messages = [
      { role: 'system', content: 'You are a helpful customer support agent for Sanbay Fusion. You help users with their issues regarding AI tools, subscriptions, billing, and technical problems. Be friendly, professional, and thorough in your responses.' },
    ];

    // Add conversation history
    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-10).forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    messages.push({ role: 'user', content: message });

    const response = await callProviderSync('openai', messages, null, 1000);

    return res.json({ success: true, response: response.content });
  } catch (error) {
    console.error('[live-chat] Error:', error);
    return res.status(503).json({ error: 'Live chat service unavailable' });
  }
});

// ============================================
// Tool definition for OpenAI function calling
// ============================================
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_support_ticket',
      description:
        'Create a support ticket when the issue cannot be resolved through chat. Use this when the user asks to create a ticket, or when the problem requires human review (billing disputes, refund requests, account issues, bugs that need investigation).',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Short summary of the issue' },
          description: { type: 'string', description: 'Detailed description including all relevant context' },
          category: {
            type: 'string',
            enum: ['billing', 'subscription', 'technical', 'account', 'feature_request', 'bug_report', 'general'],
            description: 'Issue category',
          },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Issue priority' },
        },
        required: ['subject', 'description', 'category', 'priority'],
      },
    },
  },
];

// ============================================
// Build enriched system prompt with user context
// ============================================
function buildSystemPrompt(userContext) {
  const { name, email, subscriptions, recentTransactions, existingTickets, memberSince } = userContext;

  let subInfo = 'No active subscriptions.';
  if (subscriptions && subscriptions.length > 0) {
    const active = subscriptions.filter((s) => s.status === 'active');
    const expired = subscriptions.filter((s) => s.status !== 'active');
    const lines = [];
    if (active.length) {
      lines.push('Active subscriptions:');
      active.forEach((s) => {
        lines.push(`  • ${s.agentName} — ${s.plan} plan (expires ${new Date(s.expiryDate).toLocaleDateString()}, auto-renew: ${s.autoRenew ? 'ON' : 'OFF'})`);
      });
    }
    if (expired.length) {
      lines.push('Past/expired subscriptions:');
      expired.forEach((s) => {
        lines.push(`  • ${s.agentName} — ${s.plan} plan (${s.status})`);
      });
    }
    subInfo = lines.join('\n');
  }

  let txInfo = 'No recent transactions.';
  if (recentTransactions && recentTransactions.length > 0) {
    txInfo = 'Recent transactions:\n' + recentTransactions.map((t) =>
      `  • ${t.type} — $${t.amount} ${t.currency} — ${t.status}${t.error ? ' (Error: ' + t.error + ')' : ''} — ${new Date(t.date).toLocaleDateString()}`
    ).join('\n');
  }

  let ticketInfo = 'No existing support tickets.';
  if (existingTickets && existingTickets.length > 0) {
    ticketInfo = 'Existing support tickets:\n' + existingTickets.map((t) =>
      `  • ${t.ticketId} — "${t.subject}" — Status: ${t.status} — Priority: ${t.priority} — Created: ${new Date(t.createdAt).toLocaleDateString()}`
    ).join('\n');
  }

  return `You are Luna, the AI support agent for the Sanbay Fusion platform. You are warm, helpful, and knowledgeable.

IMPORTANT RULES:
- You already have all the user's account information below. Use it to answer questions directly — never ask the user for information you already have.
- If you can solve the issue (subscription questions, billing inquiries, how-to guidance, feature explanations), do so immediately.
- If the issue requires human review (billing disputes, refunds, account security, complex bugs, feature requests), use the create_support_ticket tool to create a ticket.
- When you create a ticket, clearly tell the user the ticket ID and that the support team will follow up via email.
- If the user has existing open tickets, proactively mention their status when relevant.
- Be concise but thorough. Use the user's name naturally.
- Never reveal raw technical data or database IDs. Speak in human-friendly terms.
- For subscription questions: explain plans, pricing, how to cancel/upgrade, renewal dates.
- For billing issues: reference their transaction history to help debug.

═══════════════════════════════════════
USER PROFILE
═══════════════════════════════════════
Name: ${name || 'Unknown'}
Email: ${email}
Member since: ${memberSince ? new Date(memberSince).toLocaleDateString() : 'Unknown'}

═══════════════════════════════════════
SUBSCRIPTION DETAILS
═══════════════════════════════════════
${subInfo}

═══════════════════════════════════════
BILLING / TRANSACTIONS
═══════════════════════════════════════
${txInfo}

═══════════════════════════════════════
SUPPORT TICKETS
═══════════════════════════════════════
${ticketInfo}

═══════════════════════════════════════
PLATFORM INFO
═══════════════════════════════════════
Sanbay Fusion is a platform offering AI agents for various tasks. Plans: daily, weekly, monthly, yearly, lifetime.
Website: https://sanbayfusion.com
Support email: support@sanbayfusion.com
Users can manage subscriptions at /dashboard/billing.`;
}

// ============================================
// POST /api/live-support/agent-chat — Smart AI Agent with user context + tool calling
// ============================================
router.post('/agent-chat', async (req, res) => {
  try {
    let { message, conversationHistory = [], userContext, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    if (!userContext || !userContext.userId) return res.status(400).json({ error: 'User context required' });

    // Get or create persistent session
    if (!sessionId) {
      // Try to find existing active session
      const existingSession = await prisma.liveChatSession.findFirst({
        where: { userId: userContext.userId, status: 'active' },
        orderBy: { startedAt: 'desc' },
      });
      if (existingSession) {
        sessionId = existingSession.sessionId;
        // Use stored conversation history if frontend didn't provide any
        if (conversationHistory.length === 0 && existingSession.messages) {
          conversationHistory = existingSession.messages;
        }
      } else {
        // Create new session ID
        sessionId = `session_${userContext.userId}_${Date.now()}`;
      }
    }

    // Build messages
    const systemPrompt = buildSystemPrompt(userContext);
    const messages = [{ role: 'system', content: systemPrompt }];

    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-15).forEach((msg) => {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }
    messages.push({ role: 'user', content: message });

    // Call OpenAI with tools
    const config = PROVIDER_CONFIGS.openai;
    const openaiRes = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.defaultModel,
        messages,
        max_tokens: 1200,
        tools: TOOLS,
        tool_choice: 'auto',
      }),
    });

    const openaiData = await openaiRes.json();
    const choice = openaiData.choices?.[0];

    if (!choice) {
      return res.status(503).json({ error: 'AI service returned empty response' });
    }

    const actions = [];

    // Handle tool calls (ticket creation)
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.function?.name === 'create_support_ticket') {
          let args;
          try {
            args = typeof toolCall.function.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
          } catch {
            continue;
          }

          // Create the ticket in the database
          const ticket = await prisma.supportTicket.create({
            data: {
              ticketId: `tkt_${Date.now()}_${uuidv4().slice(0, 8)}`,
              userId: userContext.userId,
              userEmail: userContext.email,
              userName: userContext.name,
              subject: args.subject,
              description: args.description,
              category: args.category || 'general',
              priority: args.priority || 'medium',
              status: 'open',
              messages: [
                {
                  sender: 'system',
                  senderId: 'luna-agent',
                  senderName: 'Luna (AI Agent)',
                  message: `Ticket created by AI agent.\n\nUser issue: ${args.description}`,
                  createdAt: new Date().toISOString(),
                },
              ],
              metadata: { createdBy: 'luna-agent', originalMessage: message },
            },
          });

          actions.push({
            type: 'ticket_created',
            ticketId: ticket.ticketId,
            ticketNumber: ticket.ticketNumber,
            subject: args.subject,
            category: args.category,
            priority: args.priority,
          });

          // Send admin email notification (non-blocking)
          notifyAdminSupportTicket({
            ticketId: ticket.ticketId,
            ticketNumber: ticket.ticketNumber,
            subject: args.subject,
            userName: userContext.name || 'Unknown',
            userEmail: userContext.email,
            category: args.category,
            priority: args.priority,
          }).catch((err) => console.error('Failed to send ticket email:', err));

          // Continue conversation with tool result
          messages.push(choice.message);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: true,
              ticketId: ticket.ticketId,
              ticketNumber: ticket.ticketNumber,
              message: `Ticket ${ticket.ticketId} created successfully.`,
            }),
          });
        }
      }

      // Get final response after tool execution
      if (actions.length > 0) {
        const followupRes = await fetch(`${config.baseURL}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({ model: config.defaultModel, messages, max_tokens: 800 }),
        });
        const followupData = await followupRes.json();
        const followupContent = followupData.choices?.[0]?.message?.content || '';

        // Save session after tool action
        const updatedMsgs = [
          ...conversationHistory.slice(-12),
          { role: 'user', content: message },
          { role: 'assistant', content: followupContent }
        ];
        await prisma.liveChatSession.upsert({
          where: { sessionId },
          create: {
            sessionId,
            userId: userContext.userId,
            messages: updatedMsgs,
            status: 'active',
            startedAt: new Date(),
          },
          update: { messages: updatedMsgs },
        }).catch((err) => console.error('[session save error]', err));

        return res.json({
          success: true,
          response: followupContent,
          actions,
          sessionId,
        });
      }
    }

    // Normal response (no tool call)
    const content = choice.message?.content || choice.message?.text || '';

    // Build updated message history
    const updatedMessages = [
      ...conversationHistory.slice(-14),
      { role: 'user', content: message },
      { role: 'assistant', content }
    ];

    // Save chat session
    await prisma.liveChatSession.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userId: userContext.userId,
        messages: updatedMessages,
        status: 'active',
        startedAt: new Date(),
      },
      update: {
        messages: updatedMessages,
      },
    }).catch((err) => console.error('[session save error]', err));

    return res.json({ success: true, response: content, actions, sessionId });
  } catch (error) {
    console.error('[agent-chat] Error:', error);

    // Fallback to XAI/Grok if OpenAI fails
    try {
      const { message, conversationHistory = [], userContext } = req.body;
      const systemPrompt = buildSystemPrompt(userContext || {});
      const messages = [{ role: 'system', content: systemPrompt }];
      if (Array.isArray(conversationHistory)) {
        conversationHistory.slice(-10).forEach((msg) => {
          if (msg.role && msg.content) messages.push({ role: msg.role, content: msg.content });
        });
      }
      messages.push({ role: 'user', content: message });

      const fallback = await callProviderSync('xai', messages, null, 1000);
      return res.json({ success: true, response: fallback.content, actions: [] });
    } catch {
      return res.status(503).json({ error: 'Support service unavailable' });
    }
  }
});

export default router;
