/**
 * Chat Session Routes — Database-backed session management
 *
 * Endpoints:
 *   POST   /api/sessions              → Create new session
 *   GET    /api/sessions              → List user's sessions
 *   GET    /api/sessions/:id          → Get session with messages
 *   PUT    /api/sessions/:id          → Update session (title, settings)
 *   DELETE /api/sessions/:id          → Delete session
 *   POST   /api/sessions/:id/messages → Add message to session
 *   POST   /api/sessions/sync         → Bulk sync from localStorage
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';
import { findUserById, findUserBySession } from '../lib/auth-prisma.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: Require authenticated user (with fallback to body/header userId)
// Uses auth-prisma to query the MAIN maulaai database for user lookups,
// since this backend's own database (ai_studio_demo) doesn't store users.
// After auth, ensures a minimal local user record exists for FK constraints.
// ─────────────────────────────────────────────────────────────────────────────

// Ensure a minimal user record exists in the LOCAL database for FK constraints
async function ensureLocalUser(user) {
  try {
    await prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email || `${user.id}@placeholder.local`, name: user.name || null },
      update: {},
    });
  } catch (e) {
    // Non-fatal: log but don't block the request
    console.error('[Sessions] ensureLocalUser error:', e.message);
  }
}

const requireAuth = async (req, res, next) => {
  // 1. Already set by upstream middleware
  if (req.user?.id) return next();

  // 2. Check userId from request body or header (for proxy calls from frontend)
  const userId = req.body?.userId || req.headers['x-user-id'];
  if (userId) {
    const user = await findUserById(userId);
    if (user) {
      await ensureLocalUser(user);
      req.user = { id: user.id };
      return next();
    }
  }

  // 3. Cookie-based session fallback (login stores sessionId on User record)
  const sessionId = req.cookies?.sessionId || req.cookies?.session_id;
  if (sessionId) {
    const user = await findUserBySession(sessionId);
    if (user) {
      await ensureLocalUser(user);
      req.user = { id: user.id };
      return next();
    }
  }

  return res.status(401).json({ success: false, error: 'Authentication required' });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/active — Get user's active session pointer
// ─────────────────────────────────────────────────────────────────────────────
router.get('/active', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = await prisma.chatSettings.findUnique({ where: { userId } });
    res.json({ success: true, activeSessionId: settings?.activeSessionId || null });
  } catch (error) {
    console.error('[Sessions] Get active error:', error);
    res.status(500).json({ success: false, error: 'Failed to get active session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/sessions/active — Set active session pointer
// ─────────────────────────────────────────────────────────────────────────────
router.put('/active', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;
    await prisma.chatSettings.upsert({
      where: { userId },
      create: { userId, activeSessionId: sessionId || null },
      update: { activeSessionId: sessionId || null },
    });
    res.json({ success: true, activeSessionId: sessionId });
  } catch (error) {
    console.error('[Sessions] Set active error:', error);
    res.status(500).json({ success: false, error: 'Failed to set active session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/guest/check — Server-side guest rate limiting
// ─────────────────────────────────────────────────────────────────────────────
router.post('/guest/check', async (req, res) => {
  try {
    const { guestId, fingerprint } = req.body;
    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip;

    if (!guestId) {
      return res.status(400).json({ success: false, error: 'guestId required' });
    }

    // Find or create guest session
    let guest = await prisma.guestSession.findUnique({ where: { guestId } });

    if (!guest) {
      // Also check if this IP already has a guest session (prevent multi-guest bypass)
      if (ipAddress) {
        const ipGuests = await prisma.guestSession.findMany({
          where: { ipAddress, expiresAt: { gt: new Date() } },
        });
        // Sum message counts from all sessions on this IP
        const totalFromIp = ipGuests.reduce((sum, g) => sum + g.messageCount, 0);
        if (totalFromIp >= 40) {
          return res.json({
            success: true,
            allowed: false,
            remaining: 0,
            messageCount: totalFromIp,
            reason: 'rate_limit_ip',
          });
        }
      }

      guest = await prisma.guestSession.create({
        data: {
          guestId,
          ipAddress,
          fingerprint: fingerprint || null,
          messageCount: 0,
          messageLimit: 20,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });
    }

    // Check if expired
    if (guest.expiresAt < new Date()) {
      // Reset expired session
      guest = await prisma.guestSession.update({
        where: { guestId },
        data: {
          messageCount: 0,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          ipAddress,
        },
      });
    }

    const allowed = guest.messageCount < guest.messageLimit;
    const remaining = Math.max(0, guest.messageLimit - guest.messageCount);

    res.json({
      success: true,
      allowed,
      remaining,
      messageCount: guest.messageCount,
      messageLimit: guest.messageLimit,
      expiresAt: guest.expiresAt,
    });
  } catch (error) {
    console.error('[Sessions] Guest check error:', error);
    // On error, allow (fail-open) so UX isn't blocked
    res.json({ success: true, allowed: true, remaining: 20, messageCount: 0 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/guest/increment — Increment guest message count
// ─────────────────────────────────────────────────────────────────────────────
router.post('/guest/increment', async (req, res) => {
  try {
    const { guestId } = req.body;
    if (!guestId) {
      return res.status(400).json({ success: false, error: 'guestId required' });
    }

    const guest = await prisma.guestSession.findUnique({ where: { guestId } });
    if (!guest) {
      return res.status(404).json({ success: false, error: 'Guest session not found' });
    }

    const updated = await prisma.guestSession.update({
      where: { guestId },
      data: { messageCount: guest.messageCount + 1, lastMessageAt: new Date() },
    });

    res.json({
      success: true,
      messageCount: updated.messageCount,
      remaining: Math.max(0, updated.messageLimit - updated.messageCount),
      allowed: updated.messageCount < updated.messageLimit,
    });
  } catch (error) {
    console.error('[Sessions] Guest increment error:', error);
    res.json({ success: true, allowed: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/files — Save virtual files for a session
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/files', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { files } = req.body; // Record<string, string> — path → content
    const userId = req.user.id;

    if (!files || typeof files !== 'object') {
      return res.status(400).json({ success: false, error: 'files object required' });
    }

    // Verify ownership
    const session = await prisma.chatSession.findFirst({ where: { sessionId: id, userId } });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Upsert each file
    const results = [];
    for (const [filePath, content] of Object.entries(files)) {
      const ext = filePath.split('.').pop() || 'txt';
      const existing = await prisma.chatCanvasFile.findFirst({
        where: { sessionId: id, fileName: filePath },
      });

      if (existing) {
        const updated = await prisma.chatCanvasFile.update({
          where: { id: existing.id },
          data: { content: String(content), version: existing.version + 1, updatedAt: new Date() },
        });
        results.push({ path: filePath, action: 'updated', id: updated.id });
      } else {
        const created = await prisma.chatCanvasFile.create({
          data: {
            sessionId: id,
            fileName: filePath,
            fileType: ext,
            content: String(content),
          },
        });
        results.push({ path: filePath, action: 'created', id: created.id });
      }
    }

    res.json({ success: true, results, count: results.length });
  } catch (error) {
    console.error('[Sessions] Save files error:', error);
    res.status(500).json({ success: false, error: 'Failed to save files' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:id/files — Load virtual files for a session
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/files', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await prisma.chatSession.findFirst({ where: { sessionId: id, userId } });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const dbFiles = await prisma.chatCanvasFile.findMany({
      where: { sessionId: id },
      orderBy: { updatedAt: 'desc' },
    });

    // Convert to Record<path, content>
    const files = {};
    for (const f of dbFiles) {
      files[f.fileName] = f.content;
    }

    res.json({ success: true, files, count: dbFiles.length });
  } catch (error) {
    console.error('[Sessions] Load files error:', error);
    res.status(500).json({ success: false, error: 'Failed to load files' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/load — Load sessions + messages from DB (DB-first for logged-in users)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/load', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agentId, limit = 50 } = req.query;

    const where = { userId, isArchived: false };
    if (agentId) where.agentId = agentId;

    const dbSessions = await prisma.chatSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit),
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Also get the active session pointer
    const settings = await prisma.chatSettings.findUnique({ where: { userId } });

    // Transform to frontend format
    const sessions = dbSessions.map((s) => ({
      id: s.sessionId,
      name: s.name,
      active: s.sessionId === settings?.activeSessionId,
      settings: s.settings || {},
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messages: s.messages.map((m) => ({
        id: m.id,
        sender: m.role === 'user' ? 'YOU' : m.role === 'assistant' ? 'AGENT' : 'SYSTEM',
        text: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString(),
        metadata: m.metadata,
      })),
    }));

    res.json({
      success: true,
      sessions,
      activeSessionId: settings?.activeSessionId || null,
      total: sessions.length,
    });
  } catch (error) {
    console.error('[Sessions] Load error:', error);
    res.status(500).json({ success: false, error: 'Failed to load sessions' });
  }
});

// Helper: Generate unique session ID
const generateSessionId = () => `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions — Create new chat session
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, agentId, settings } = req.body;
    const userId = req.user.id;

    // Get default agent if not specified
    let finalAgentId = agentId;
    if (!finalAgentId) {
      const defaultAgent = await prisma.agent.findFirst({
        where: { OR: [{ userId }, { isPublic: true }] },
      });
      finalAgentId = defaultAgent?.agentId || null;
    }

    const sessionId = generateSessionId();

    const session = await prisma.chatSession.create({
      data: {
        sessionId,
        userId,
        agentId: finalAgentId,
        name: title || 'New Chat',
        settings: settings || { temperature: 0.7, maxTokens: 2000, provider: 'free-tier' },
      },
      include: {
        agent: { select: { agentId: true, name: true, aiProvider: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    });

    // Transform for frontend compatibility
    res.json({
      success: true,
      session: {
        id: session.sessionId,
        title: session.name,
        settings: session.settings,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        agentId: session.agentId,
        agent: session.agent,
        messages: session.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
          metadata: m.metadata,
        })),
      },
    });
  } catch (error) {
    console.error('[Sessions] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions — List user's chat sessions
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const sessions = await prisma.chatSession.findMany({
      where: { userId, isArchived: false },
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        sessionId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
        agent: { select: { agentId: true, name: true, aiProvider: true } },
        _count: { select: { messages: true } },
      },
    });

    const total = await prisma.chatSession.count({ where: { userId, isArchived: false } });

    res.json({
      success: true,
      sessions: sessions.map((s) => ({
        id: s.sessionId,
        title: s.name,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        settings: s.settings,
        agent: s.agent,
        messageCount: s._count.messages,
      })),
      total,
    });
  } catch (error) {
    console.error('[Sessions] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to list sessions' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:id — Get session with messages
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await prisma.chatSession.findFirst({
      where: { sessionId: id, userId },
      include: {
        agent: { select: { agentId: true, name: true, aiProvider: true, systemPrompt: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({
      success: true,
      session: {
        id: session.sessionId,
        title: session.name,
        settings: session.settings,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        agentId: session.agentId,
        agent: session.agent,
        messages: session.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
          metadata: m.metadata,
        })),
      },
    });
  } catch (error) {
    console.error('[Sessions] Get error:', error);
    res.status(500).json({ success: false, error: 'Failed to get session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/sessions/:id — Update session
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, settings } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const existing = await prisma.chatSession.findFirst({ where: { sessionId: id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const session = await prisma.chatSession.update({
      where: { sessionId: id },
      data: {
        ...(title && { name: title }),
        ...(settings && { settings }),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      session: {
        id: session.sessionId,
        title: session.name,
        settings: session.settings,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Sessions] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/sessions/:id — Delete session (soft delete via archive)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const existing = await prisma.chatSession.findFirst({ where: { sessionId: id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Soft delete (archive)
    await prisma.chatSession.update({
      where: { sessionId: id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    res.json({ success: true, message: 'Session archived' });
  } catch (error) {
    console.error('[Sessions] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/messages — Add message to session
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content, metadata } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const session = await prisma.chatSession.findFirst({ where: { sessionId: id, userId } });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId: id,
        role: role.toLowerCase(), // Ensure matches enum: user, assistant, system
        content,
        metadata: metadata || {},
      },
    });

    // Update session timestamp and stats
    const currentStats = (session.stats || {});
    await prisma.chatSession.update({
      where: { sessionId: id },
      data: {
        updatedAt: new Date(),
        stats: {
          ...currentStats,
          messageCount: (currentStats.messageCount || 0) + 1,
        },
      },
    });

    res.json({
      success: true,
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.createdAt,
        metadata: message.metadata,
      },
    });
  } catch (error) {
    console.error('[Sessions] Add message error:', error);
    res.status(500).json({ success: false, error: 'Failed to add message' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/sync — Bulk sync from localStorage
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { sessions: localSessions } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(localSessions)) {
      return res.status(400).json({ success: false, error: 'sessions must be an array' });
    }

    const results = { created: 0, updated: 0, errors: [] };

    // Get default agent
    const defaultAgent = await prisma.agent.findFirst({
      where: { OR: [{ userId }, { isPublic: true }] },
    });

    for (const localSession of localSessions) {
      try {
        const { localId, title, messages, settings, createdAt, updatedAt } = localSession;

        // Check if session already synced (localId stored in settings)
        const existing = await prisma.chatSession.findFirst({
          where: {
            userId,
            settings: { path: ['localId'], equals: localId },
          },
        });

        if (existing) {
          // Add new messages only
          const existingMessages = await prisma.chatMessage.findMany({
            where: { sessionId: existing.sessionId },
            select: { metadata: true },
          });
          const existingLocalIds = new Set(
            existingMessages.map((m) => m.metadata?.localId).filter(Boolean)
          );

          const newMessages = (messages || []).filter((m) => m.localId && !existingLocalIds.has(m.localId));

          for (const m of newMessages) {
            await prisma.chatMessage.create({
              data: {
                sessionId: existing.sessionId,
                role: m.role?.toLowerCase() || 'user',
                content: m.content,
                metadata: { localId: m.localId, ...(m.metadata || {}) },
                createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
              },
            });
          }

          if (newMessages.length > 0) {
            await prisma.chatSession.update({
              where: { sessionId: existing.sessionId },
              data: { updatedAt: new Date() },
            });
          }
          results.updated++;
        } else {
          // Create new session
          const sessionId = generateSessionId();

          await prisma.chatSession.create({
            data: {
              sessionId,
              userId,
              agentId: defaultAgent?.agentId || null,
              name: title || 'Imported Chat',
              settings: { localId, ...(settings || {}) },
              createdAt: createdAt ? new Date(createdAt) : new Date(),
              updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
            },
          });

          // Add messages
          if (messages?.length > 0) {
            for (const m of messages) {
              await prisma.chatMessage.create({
                data: {
                  sessionId,
                  role: m.role?.toLowerCase() || 'user',
                  content: m.content,
                  metadata: { localId: m.localId, ...(m.metadata || {}) },
                  createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
                },
              });
            }
          }
          results.created++;
        }
      } catch (err) {
        results.errors.push({ localId: localSession.localId, error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('[Sessions] Sync error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync sessions' });
  }
});

export default router;
