/**
 * MONITORING API ROUTES
 * Per-project monitoring — logs, errors, health checks.
 *
 * GET  /api/monitoring/logs/:projectId            — Get project logs
 * GET  /api/monitoring/errors/:projectId          — Get unresolved errors
 * GET  /api/monitoring/health/:projectId          — Get health status
 * POST /api/monitoring/errors/:projectId/resolve  — Resolve an error
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

const getUserId = (req) => req.session?.userId || req.user?.id;

// ── Helper: verify project ownership ───────────────────────────────

async function verifyProject(userId, projectId) {
  return prisma.canvasProject.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
}

// ════════════════════════════════════════════════════════════════════
// LOGS
// ════════════════════════════════════════════════════════════════════

router.get('/logs/:projectId', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { projectId } = req.params;
    const project = await verifyProject(userId, projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const level = req.query.level;
    const search = req.query.search;

    // Fetch monitoring errors as log entries (they serve dual purpose)
    const where = { projectId };
    if (level && level !== 'all') {
      // Map log levels to severity-like categories
      const severityMap = { error: ['critical', 'error'], warning: ['warning'], info: ['info'], debug: ['debug'] };
      // MonitoringError doesn't have a severity field, so we filter by resolved status + message content
    }

    const errors = await prisma.monitoringError.findMany({
      where: {
        projectId,
        ...(search ? { message: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { lastSeen: 'desc' },
      take: limit,
    });

    // Map errors to log entries format the frontend expects
    const logs = errors.map(e => ({
      id: e.id,
      severity: e.resolved ? 'info' : 'error',
      message: e.message,
      createdAt: e.lastSeen.toISOString(),
      metadata: e.metadata ? JSON.parse(e.metadata) : undefined,
    }));

    // Also fetch recent health checks as info logs
    const healthLogs = await prisma.healthCheck.findMany({
      where: { projectId },
      orderBy: { lastChecked: 'desc' },
      take: 20,
    });

    const healthEntries = healthLogs.map(h => ({
      id: h.id,
      severity: h.healthy ? 'info' : 'warning',
      message: `Health check: ${h.target} — ${h.healthy ? 'healthy' : 'unhealthy'} (${h.latency}ms)`,
      createdAt: h.lastChecked.toISOString(),
    }));

    const allLogs = [...logs, ...healthEntries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    // Filter by level if specified
    let filtered = allLogs;
    if (level && level !== 'all') {
      filtered = allLogs.filter(l => l.severity === level);
    }

    res.json({ success: true, logs: filtered });
  } catch (err) {
    console.error('[Monitoring] Logs error:', err.message);
    res.status(500).json({ error: 'Failed to load logs' });
  }
});

// ════════════════════════════════════════════════════════════════════
// ERRORS
// ════════════════════════════════════════════════════════════════════

router.get('/errors/:projectId', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { projectId } = req.params;
    const project = await verifyProject(userId, projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const resolved = req.query.resolved === 'true';

    const errors = await prisma.monitoringError.findMany({
      where: { projectId, resolved },
      orderBy: { lastSeen: 'desc' },
      take: 100,
    });

    // Group by message fingerprint
    const groups = errors.map(e => ({
      fingerprint: e.id,
      message: e.message,
      severity: 'error',
      count: e.count,
      firstSeen: e.firstSeen.toISOString(),
      lastSeen: e.lastSeen.toISOString(),
      resolved: e.resolved,
    }));

    res.json({ success: true, groups });
  } catch (err) {
    console.error('[Monitoring] Errors error:', err.message);
    res.status(500).json({ error: 'Failed to load errors' });
  }
});

// ── Resolve error ──────────────────────────────────────────────────

router.post('/errors/:projectId/resolve', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { projectId } = req.params;
    const { fingerprint } = req.body;
    if (!fingerprint) return res.status(400).json({ error: 'fingerprint is required' });

    const project = await verifyProject(userId, projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await prisma.monitoringError.update({
      where: { id: fingerprint },
      data: { resolved: true },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Monitoring] Resolve error:', err.message);
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

// ════════════════════════════════════════════════════════════════════
// HEALTH
// ════════════════════════════════════════════════════════════════════

router.get('/health/:projectId', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { projectId } = req.params;
    const project = await verifyProject(userId, projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Get health checks
    const healthChecks = await prisma.healthCheck.findMany({
      where: { projectId },
      orderBy: { lastChecked: 'desc' },
    });

    // Get sandboxes for this project
    const sandboxes = await prisma.sandbox.findMany({
      where: { projectId, status: { in: ['creating', 'running', 'stopped'] } },
      select: { id: true, status: true },
    });

    // Get deployments for this project
    const deployments = await prisma.deployment.findMany({
      where: { projectId, status: 'live' },
      select: { id: true, url: true, status: true },
    });

    // Get recent errors
    const recentEvents = await prisma.monitoringError.findMany({
      where: { projectId },
      orderBy: { lastSeen: 'desc' },
      take: 10,
    });

    // Determine overall health
    const hasUnhealthyChecks = healthChecks.some(h => !h.healthy);
    const hasUnresolvedErrors = recentEvents.some(e => !e.resolved);

    res.json({
      success: true,
      status: hasUnhealthyChecks || hasUnresolvedErrors ? 'unhealthy' : 'healthy',
      sandboxes: sandboxes.map(s => ({
        id: s.id,
        healthy: s.status === 'running',
      })),
      deployments: deployments.map(d => ({
        id: d.id,
        url: d.url,
        healthy: d.status === 'live',
      })),
      recentEvents: recentEvents.map(e => ({
        id: e.id,
        severity: e.resolved ? 'info' : 'error',
        message: e.message,
        createdAt: e.lastSeen.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[Monitoring] Health error:', err.message);
    res.status(500).json({ error: 'Failed to load health status' });
  }
});

export default router;
