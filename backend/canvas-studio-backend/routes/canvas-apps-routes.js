/**
 * CANVAS APPS CRUD ROUTES
 * Handles saving, listing, updating, and deleting user-generated canvas apps.
 * Fully source-scoped: standalone (GenCraft Pro) and embedded (Canvas Studio) are separated.
 * Maps to frontend canvasAppsService.ts endpoints:
 *   GET    /api/canvas/apps          — list user's apps
 *   POST   /api/canvas/apps          — create new app
 *   PATCH  /api/canvas/apps/:id      — update app
 *   DELETE /api/canvas/apps/:id      — delete single app
 *   DELETE /api/canvas/apps          — delete all user's apps
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';
import db from '../lib/db.js';

const router = express.Router();

// ── Ensure local user exists for FK constraints ────────────────────
// The canvas_studio database has its own `users` table, but auth comes
// from the main maulaai database.  Before any CRUD that references userId
// we upsert a minimal mirror row so the FK is satisfied.
async function ensureLocalUser(user) {
  if (!user?.id) return;
  try {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email || `${user.id}@noreply.maula.ai`,
        name: user.name || null,
      },
      update: { updatedAt: new Date() },
    });
  } catch (e) {
    // Non-fatal — log but don't block the request
    console.error('[canvas-apps] ensureLocalUser error:', e.message);
  }
}

// ── Auth helper ────────────────────────────────────────────────────
async function getUserId(req) {
  const userId = req.user?.id || req.session?.userId;
  if (userId) {
    // Ensure user exists locally before returning
    await ensureLocalUser(req.user || { id: userId });
    return userId;
  }

  // Fallback: cookie-based session (direct backend path via Nginx)
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    try {
      const user = await db.User.findBySessionId(sessionId);
      if (user && (!user.sessionExpiry || new Date(user.sessionExpiry) >= new Date())) {
        req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
        // Ensure user exists locally before returning
        await ensureLocalUser(req.user);
        return user.id;
      }
    } catch (err) {
      console.error('[canvas-apps] Session lookup error:', err.message);
    }
  }
  return null;
}

/**
 * Extract source from X-Canvas-Source header or query/body.
 * Defaults to 'standalone' if not provided.
 */
function getSource(req) {
  return req.headers['x-canvas-source'] || req.query.source || req.body?.source || 'standalone';
}

// ── GET /api/canvas/apps ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const source = getSource(req); // Always scope by source — prevents cross-source data leaks

    const where = { userId, source };

    const [apps, total] = await Promise.all([
      prisma.canvasApp.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.canvasApp.count({ where }),
    ]);

    // Parse history JSON strings back to arrays for the frontend
    const parsedApps = apps.map(app => ({
      ...app,
      history: (() => { try { return JSON.parse(app.history || '[]'); } catch { return []; } })(),
    }));

    res.json({
      success: true,
      apps: parsedApps,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[CanvasApps] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch apps' });
  }
});

// ── POST /api/canvas/apps ──────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { name, prompt, code, language, provider, modelId, history, source } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const app = await prisma.canvasApp.create({
      data: {
        userId,
        name: name.substring(0, 200),
        prompt: prompt || '',
        code: code || '',
        language: language || 'html',
        provider: provider || null,
        modelId: modelId || null,
        history: JSON.stringify(history || []),
        source: source || 'standalone',
      },
    });

    // Parse history back for frontend
    const responseApp = { ...app, history: (() => { try { return JSON.parse(app.history || '[]'); } catch { return []; } })() };

    res.status(201).json({ success: true, app: responseApp });
  } catch (error) {
    console.error('[CanvasApps] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to save app' });
  }
});

// ── PATCH /api/canvas/apps/:id ─────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { id } = req.params;
    const source = getSource(req);

    // Verify ownership AND source scope
    const existing = await prisma.canvasApp.findFirst({
      where: { id, userId, source },
    });

    if (!existing) {
      // The frontend creates apps with Date.now() IDs locally and the POST
      // may still be in-flight when auto-save fires a PATCH.  Create the
      // record here so the update isn't lost.
      const { name, prompt, code, language, history } = req.body;
      if (code || (history && history.length > 0)) {
        const app = await prisma.canvasApp.create({
          data: {
            userId,
            name: (name || 'Untitled').substring(0, 200),
            prompt: prompt || '',
            code: code || '',
            language: language || 'html',
            history: JSON.stringify(history || []),
            source,
          },
        });
        const responseApp = { ...app, history: (() => { try { return JSON.parse(app.history || '[]'); } catch { return []; } })() };
        return res.status(201).json({ success: true, app: responseApp });
      }
      return res.status(404).json({ success: false, error: 'App not found' });
    }

    const allowedFields = ['name', 'prompt', 'code', 'language', 'history', 'isFavorite', 'isPublic', 'thumbnail', 'deployedUrl'];
    const data = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // history is stored as JSON string in the database
        data[field] = field === 'history' ? JSON.stringify(req.body[field]) : req.body[field];
      }
    }

    const app = await prisma.canvasApp.update({
      where: { id },
      data,
    });

    // Parse history back for frontend
    const responseApp = { ...app, history: (() => { try { return JSON.parse(app.history || '[]'); } catch { return []; } })() };

    res.json({ success: true, app: responseApp });
  } catch (error) {
    console.error('[CanvasApps] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update app' });
  }
});

// ── DELETE /api/canvas/apps/:id ────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { id } = req.params;
    const source = getSource(req);

    // Verify ownership AND source scope
    const existing = await prisma.canvasApp.findFirst({
      where: { id, userId, source },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }

    await prisma.canvasApp.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('[CanvasApps] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete app' });
  }
});

// ── DELETE /api/canvas/apps (clear all) ────────────────────────────
router.delete('/', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const source = getSource(req); // Only clear apps from the requesting source
    const where = { userId, source };

    const result = await prisma.canvasApp.deleteMany({ where });

    res.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('[CanvasApps] Clear all error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear apps' });
  }
});

export default router;
