/**
 * Maula Editor — User Preferences, Extensions, Workspaces API
 *
 * Replaces all frontend localStorage. Realtime sync, DB-backed.
 *
 * GET    /api/editor/preferences          — Fetch user preferences (creates default if missing)
 * PUT    /api/editor/preferences          — Patch preferences (theme, aiConfig, editorSettings, recentProjects, activeWorkspaceId, uiState)
 *
 * GET    /api/editor/extensions           — List installed extensions for the user
 * PUT    /api/editor/extensions           — Bulk upsert extensions (full sync — used on enable/disable/install)
 * POST   /api/editor/extensions/:id       — Install or update one extension
 * PATCH  /api/editor/extensions/:id       — Toggle enabled / patch settings
 * DELETE /api/editor/extensions/:id       — Uninstall extension
 *
 * GET    /api/editor/workspaces           — List user's workspaces
 * POST   /api/editor/workspaces           — Create workspace
 * PUT    /api/editor/workspaces/:id       — Update workspace
 * DELETE /api/editor/workspaces/:id       — Delete workspace
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ────────── PREFERENCES ──────────

router.get('/preferences', requireAuth, async (req, res) => {
  try {
    let prefs = await prisma.editorPreferences.findUnique({ where: { userId: req.user.id } });
    if (!prefs) {
      prefs = await prisma.editorPreferences.create({ data: { userId: req.user.id } });
    }
    res.json({ preferences: prefs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/preferences', requireAuth, async (req, res) => {
  try {
    const { theme, aiConfig, editorSettings, recentProjects, activeWorkspaceId, uiState } = req.body || {};
    const data = {};
    if (theme !== undefined) data.theme = String(theme);
    if (aiConfig !== undefined) data.aiConfig = aiConfig;
    if (editorSettings !== undefined) data.editorSettings = editorSettings;
    if (recentProjects !== undefined) data.recentProjects = recentProjects;
    if (activeWorkspaceId !== undefined) data.activeWorkspaceId = activeWorkspaceId;
    if (uiState !== undefined) data.uiState = uiState;

    const prefs = await prisma.editorPreferences.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...data },
    });
    res.json({ preferences: prefs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────── EXTENSIONS ──────────

router.get('/extensions', requireAuth, async (req, res) => {
  try {
    const rows = await prisma.editorExtension.findMany({
      where: { userId: req.user.id },
      orderBy: { installedAt: 'asc' },
    });
    res.json({ extensions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/extensions', requireAuth, async (req, res) => {
  try {
    const { extensions } = req.body || {};
    if (!Array.isArray(extensions)) {
      return res.status(400).json({ error: 'extensions must be an array' });
    }
    await prisma.$transaction(
      extensions.map((ext) =>
        prisma.editorExtension.upsert({
          where: { userId_extensionId: { userId: req.user.id, extensionId: String(ext.id || ext.extensionId) } },
          update: {
            manifest: ext.manifest || ext,
            enabled: ext.enabled !== false,
            settings: ext.settings || {},
          },
          create: {
            userId: req.user.id,
            extensionId: String(ext.id || ext.extensionId),
            manifest: ext.manifest || ext,
            enabled: ext.enabled !== false,
            settings: ext.settings || {},
          },
        }),
      ),
    );
    const rows = await prisma.editorExtension.findMany({
      where: { userId: req.user.id },
      orderBy: { installedAt: 'asc' },
    });
    res.json({ extensions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/extensions/:id', requireAuth, async (req, res) => {
  try {
    const extensionId = req.params.id;
    const { manifest, enabled, settings } = req.body || {};
    const row = await prisma.editorExtension.upsert({
      where: { userId_extensionId: { userId: req.user.id, extensionId } },
      update: {
        ...(manifest !== undefined ? { manifest } : {}),
        ...(enabled !== undefined ? { enabled: !!enabled } : {}),
        ...(settings !== undefined ? { settings } : {}),
      },
      create: {
        userId: req.user.id,
        extensionId,
        manifest: manifest || {},
        enabled: enabled !== false,
        settings: settings || {},
      },
    });
    res.json({ extension: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/extensions/:id', requireAuth, async (req, res) => {
  try {
    const extensionId = req.params.id;
    const { enabled, settings, manifest } = req.body || {};
    const data = {};
    if (enabled !== undefined) data.enabled = !!enabled;
    if (settings !== undefined) data.settings = settings;
    if (manifest !== undefined) data.manifest = manifest;
    const row = await prisma.editorExtension.update({
      where: { userId_extensionId: { userId: req.user.id, extensionId } },
      data,
    });
    res.json({ extension: row });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Extension not installed' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/extensions/:id', requireAuth, async (req, res) => {
  try {
    await prisma.editorExtension.delete({
      where: { userId_extensionId: { userId: req.user.id, extensionId: req.params.id } },
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Extension not installed' });
    res.status(500).json({ error: err.message });
  }
});

// ────────── WORKSPACES ──────────

router.get('/workspaces', requireAuth, async (req, res) => {
  try {
    const rows = await prisma.editorWorkspace.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ workspaces: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/workspaces', requireAuth, async (req, res) => {
  try {
    const { name, description, projectIds, settings, isActive } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const row = await prisma.editorWorkspace.create({
      data: {
        userId: req.user.id,
        name: String(name),
        description: description || null,
        projectIds: Array.isArray(projectIds) ? projectIds : [],
        settings: settings || {},
        isActive: !!isActive,
      },
    });
    res.status(201).json({ workspace: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/workspaces/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.editorWorkspace.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Workspace not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const { name, description, projectIds, settings, isActive } = req.body || {};
    const data = {};
    if (name !== undefined) data.name = String(name);
    if (description !== undefined) data.description = description;
    if (projectIds !== undefined) data.projectIds = projectIds;
    if (settings !== undefined) data.settings = settings;
    if (isActive !== undefined) data.isActive = !!isActive;

    const row = await prisma.editorWorkspace.update({ where: { id: req.params.id }, data });
    res.json({ workspace: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/workspaces/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.editorWorkspace.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Workspace not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    await prisma.editorWorkspace.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
