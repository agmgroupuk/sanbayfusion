/**
 * USER HISTORY ROUTES — generic per-feature history persisted to DB.
 * Replaces localStorage for video / voice / image-to-code panels.
 *
 *   GET    /api/user-history/:kind         — list newest-first (limit query, default 100)
 *   POST   /api/user-history/:kind         — create one entry { data: object }
 *   PATCH  /api/user-history/:kind/:id     — partial-update data (merged)
 *   DELETE /api/user-history/:kind/:id     — delete one
 *   DELETE /api/user-history/:kind         — clear all for kind
 *
 * Allowed kinds: video, voice, image_to_code
 * Per-user-per-kind cap: 200 (oldest pruned on insert)
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';
import db from '../lib/db.js';

const router = express.Router();

const ALLOWED_KINDS = new Set(['video', 'voice', 'image_to_code']);
const MAX_PER_KIND = 200;

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
    console.error('[user-history] ensureLocalUser:', e.message);
  }
}

async function getUserId(req) {
  const userId = req.user?.id || req.session?.userId;
  if (userId) {
    await ensureLocalUser(req.user || { id: userId });
    return userId;
  }
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    try {
      const user = await db.User.findBySessionId(sessionId);
      if (user && (!user.sessionExpiry || new Date(user.sessionExpiry) >= new Date())) {
        req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
        await ensureLocalUser(req.user);
        return user.id;
      }
    } catch (err) {
      console.error('[user-history] session lookup:', err.message);
    }
  }
  return null;
}

function validateKind(kind) {
  return ALLOWED_KINDS.has(kind);
}

// GET /:kind
router.get('/:kind', async (req, res) => {
  const { kind } = req.params;
  if (!validateKind(kind)) return res.status(400).json({ success: false, message: 'invalid kind' });
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'unauthorized' });
  const limit = Math.min(MAX_PER_KIND, Math.max(1, parseInt(req.query.limit) || 100));
  const items = await prisma.userHistory.findMany({
    where: { userId, kind },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json({ success: true, items });
});

// POST /:kind
router.post('/:kind', async (req, res) => {
  const { kind } = req.params;
  if (!validateKind(kind)) return res.status(400).json({ success: false, message: 'invalid kind' });
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'unauthorized' });
  const data = req.body?.data;
  const clientId = typeof req.body?.id === 'string' && req.body.id.trim() ? req.body.id.trim() : undefined;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, message: 'data object required' });
  }
  const created = await prisma.userHistory.create({
    data: clientId
      ? { id: clientId, userId, kind, data }
      : { userId, kind, data },
  });
  // Prune oldest beyond cap
  const count = await prisma.userHistory.count({ where: { userId, kind } });
  if (count > MAX_PER_KIND) {
    const overflow = await prisma.userHistory.findMany({
      where: { userId, kind },
      orderBy: { createdAt: 'asc' },
      take: count - MAX_PER_KIND,
      select: { id: true },
    });
    if (overflow.length) {
      await prisma.userHistory.deleteMany({ where: { id: { in: overflow.map((o) => o.id) } } });
    }
  }
  res.json({ success: true, item: created });
});

// PATCH /:kind/:id
router.patch('/:kind/:id', async (req, res) => {
  const { kind, id } = req.params;
  if (!validateKind(kind)) return res.status(400).json({ success: false, message: 'invalid kind' });
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'unauthorized' });
  const patch = req.body?.data;
  if (!patch || typeof patch !== 'object') {
    return res.status(400).json({ success: false, message: 'data object required' });
  }
  const existing = await prisma.userHistory.findFirst({ where: { id, userId, kind } });
  if (!existing) return res.status(404).json({ success: false, message: 'not found' });
  const merged = { ...(existing.data || {}), ...patch };
  const updated = await prisma.userHistory.update({ where: { id }, data: { data: merged } });
  res.json({ success: true, item: updated });
});

// DELETE /:kind/:id
router.delete('/:kind/:id', async (req, res) => {
  const { kind, id } = req.params;
  if (!validateKind(kind)) return res.status(400).json({ success: false, message: 'invalid kind' });
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'unauthorized' });
  await prisma.userHistory.deleteMany({ where: { id, userId, kind } });
  res.json({ success: true });
});

// DELETE /:kind
router.delete('/:kind', async (req, res) => {
  const { kind } = req.params;
  if (!validateKind(kind)) return res.status(400).json({ success: false, message: 'invalid kind' });
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'unauthorized' });
  await prisma.userHistory.deleteMany({ where: { userId, kind } });
  res.json({ success: true });
});

export default router;
