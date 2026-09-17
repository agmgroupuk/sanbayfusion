/**
 * STUDIO HUB API ROUTES
 * Cross-project aggregation endpoints for the Studio Hub panel.
 * Provides media, builds, deployments, databases, monitoring,
 * storage, sandboxes, and agent task data across all user projects.
 *
 * GET    /api/studio-hub/summary                  — Dashboard summary counts
 * GET    /api/studio-hub/assets                   — All user assets
 * DELETE /api/studio-hub/assets/:id               — Delete an asset
 * GET    /api/studio-hub/builds                   — All user builds
 * POST   /api/studio-hub/builds/:id/cancel        — Cancel a build
 * GET    /api/studio-hub/deployments              — All user deployments
 * DELETE /api/studio-hub/deployments/:id          — Destroy a deployment
 * GET    /api/studio-hub/databases                — All user project databases
 * POST   /api/studio-hub/databases                — Create a project database
 * DELETE /api/studio-hub/databases/:id            — Delete a project database
 * GET    /api/studio-hub/sandboxes                — All user sandboxes
 * DELETE /api/studio-hub/sandboxes/:id            — Destroy a sandbox
 * GET    /api/studio-hub/monitoring               — Errors + health checks
 * POST   /api/studio-hub/monitoring/:id/resolve   — Resolve an error
 * GET    /api/studio-hub/storage                  — Storage usage
 * GET    /api/studio-hub/agent-tasks              — Agent tasks history
 * POST   /api/studio-hub/generate-image           — AI image generation
 * POST   /api/studio-hub/generate-video           — AI video generation
 */

import crypto from 'crypto';
import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// ── Auth helper ────────────────────────────────────────────────────
const getUserId = (req) => req.session?.userId || req.user?.id;

// ════════════════════════════════════════════════════════════════════
// SUMMARY — Dashboard counts
// ════════════════════════════════════════════════════════════════════
router.get('/summary', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const [projects, apps, assets, builds, deployments, databases, sandboxes, errors] = await Promise.all([
            prisma.canvasProject.count({ where: { userId } }),
            prisma.canvasApp.count({ where: { userId } }),
            prisma.asset.count({ where: { userId } }),
            prisma.build.count({ where: { userId } }),
            prisma.deployment.count({ where: { userId, status: 'live' } }),
            prisma.projectDatabase.count({ where: { userId, status: { not: 'destroyed' } } }),
            prisma.sandbox.count({ where: { userId, status: { in: ['creating', 'running'] } } }),
            prisma.monitoringError.count({ where: { resolved: false, projectId: { in: (await prisma.canvasProject.findMany({ where: { userId }, select: { id: true } })).map(p => p.id) } } }),
        ]);

        res.json({ projects, apps, assets, builds, deployments, databases, sandboxes, unresolvedErrors: errors });
    } catch (err) {
        console.error('[StudioHub] Summary error:', err.message);
        res.status(500).json({ error: 'Failed to load summary' });
    }
});

// ════════════════════════════════════════════════════════════════════
// ASSETS — Cross-project media gallery
// ════════════════════════════════════════════════════════════════════
router.get('/assets', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const assets = await prisma.asset.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { project: { select: { name: true } } },
        });

        res.json({ assets });
    } catch (err) {
        console.error('[StudioHub] Assets error:', err.message);
        res.status(500).json({ error: 'Failed to load assets' });
    }
});

router.delete('/assets/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        await prisma.asset.deleteMany({ where: { id: req.params.id, userId } });
        res.json({ success: true });
    } catch (err) {
        console.error('[StudioHub] Delete asset error:', err.message);
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});

// ════════════════════════════════════════════════════════════════════
// BUILDS — Cross-project build history
// ════════════════════════════════════════════════════════════════════
router.get('/builds', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const builds = await prisma.build.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { project: { select: { name: true } } },
        });

        res.json({ builds });
    } catch (err) {
        console.error('[StudioHub] Builds error:', err.message);
        res.status(500).json({ error: 'Failed to load builds' });
    }
});

router.post('/builds/:id/cancel', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const build = await prisma.build.findFirst({ where: { id: req.params.id, userId } });
        if (!build) return res.status(404).json({ error: 'Build not found' });

        await prisma.build.update({
            where: { id: req.params.id },
            data: { status: 'cancelled', completedAt: new Date() },
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[StudioHub] Cancel build error:', err.message);
        res.status(500).json({ error: 'Failed to cancel build' });
    }
});

// ════════════════════════════════════════════════════════════════════
// DEPLOYMENTS — Cross-project deployment management
// ════════════════════════════════════════════════════════════════════
router.get('/deployments', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const deployments = await prisma.deployment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { project: { select: { name: true } } },
        });

        res.json({ deployments });
    } catch (err) {
        console.error('[StudioHub] Deployments error:', err.message);
        res.status(500).json({ error: 'Failed to load deployments' });
    }
});

router.delete('/deployments/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        await prisma.deployment.updateMany({
            where: { id: req.params.id, userId },
            data: { status: 'destroyed', destroyedAt: new Date() },
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[StudioHub] Destroy deployment error:', err.message);
        res.status(500).json({ error: 'Failed to destroy deployment' });
    }
});

// ════════════════════════════════════════════════════════════════════
// DATABASES — Project database management
// ════════════════════════════════════════════════════════════════════
router.get('/databases', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const databases = await prisma.projectDatabase.findMany({
            where: { userId, status: { not: 'destroyed' } },
            orderBy: { createdAt: 'desc' },
            include: { project: { select: { name: true } } },
        });

        res.json({ databases });
    } catch (err) {
        console.error('[StudioHub] Databases error:', err.message);
        res.status(500).json({ error: 'Failed to load databases' });
    }
});

router.post('/databases', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { projectId, engine = 'postgres', name } = req.body;
        if (!projectId) return res.status(400).json({ error: 'projectId required' });

        // Verify project ownership
        const project = await prisma.canvasProject.findFirst({ where: { id: projectId, userId } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Check if project already has a database
        const existing = await prisma.projectDatabase.findUnique({ where: { projectId } });
        if (existing && existing.status !== 'destroyed') {
            return res.status(409).json({ error: 'Project already has a database' });
        }

        const db = await prisma.projectDatabase.create({
            data: {
                id: crypto.randomUUID(),
                projectId,
                userId,
                engine,
                name: name || `${project.name}_db`,
                status: 'creating',
                host: process.env.DATABASE_URL?.match(/@([^:]+):/)?.[1] || 'db.maula.ai',
                port: engine === 'mysql' ? 3306 : 5432,
            },
        });

        // Mark as active (in production this would trigger actual provisioning)
        await prisma.projectDatabase.update({
            where: { id: db.id },
            data: { status: 'active' },
        });

        res.status(201).json({ database: { ...db, status: 'active' } });
    } catch (err) {
        console.error('[StudioHub] Create database error:', err.message);
        res.status(500).json({ error: 'Failed to create database' });
    }
});

router.delete('/databases/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        await prisma.projectDatabase.updateMany({
            where: { id: req.params.id, userId },
            data: { status: 'destroyed', destroyedAt: new Date() },
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[StudioHub] Delete database error:', err.message);
        res.status(500).json({ error: 'Failed to delete database' });
    }
});

// ════════════════════════════════════════════════════════════════════
// SANDBOXES — Cross-project sandbox listing
// ════════════════════════════════════════════════════════════════════
router.get('/sandboxes', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const sandboxes = await prisma.sandbox.findMany({
            where: { userId, status: { in: ['creating', 'running', 'stopped'] } },
            orderBy: { lastActivity: 'desc' },
            take: 20,
            include: { project: { select: { name: true } } },
        });

        res.json({ sandboxes });
    } catch (err) {
        console.error('[StudioHub] Sandboxes error:', err.message);
        res.status(500).json({ error: 'Failed to load sandboxes' });
    }
});

router.delete('/sandboxes/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        await prisma.sandbox.updateMany({
            where: { id: req.params.id, userId },
            data: { status: 'destroyed' },
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[StudioHub] Destroy sandbox error:', err.message);
        res.status(500).json({ error: 'Failed to destroy sandbox' });
    }
});

// ════════════════════════════════════════════════════════════════════
// MONITORING — Errors + Health Checks
// ════════════════════════════════════════════════════════════════════
router.get('/monitoring', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const projectIds = (await prisma.canvasProject.findMany({ where: { userId }, select: { id: true } })).map(p => p.id);

        const [errors, healthChecks] = await Promise.all([
            prisma.monitoringError.findMany({
                where: { projectId: { in: projectIds } },
                orderBy: { lastSeen: 'desc' },
                take: 50,
            }),
            prisma.healthCheck.findMany({
                where: { projectId: { in: projectIds } },
                orderBy: { lastChecked: 'desc' },
            }),
        ]);

        res.json({ errors, healthChecks });
    } catch (err) {
        console.error('[StudioHub] Monitoring error:', err.message);
        res.status(500).json({ error: 'Failed to load monitoring data' });
    }
});

router.post('/monitoring/:id/resolve', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        // Verify ownership through project
        const err = await prisma.monitoringError.findUnique({ where: { id: req.params.id } });
        if (!err) return res.status(404).json({ error: 'Error not found' });

        const project = await prisma.canvasProject.findFirst({ where: { id: err.projectId, userId } });
        if (!project) return res.status(403).json({ error: 'Not authorized' });

        await prisma.monitoringError.update({
            where: { id: req.params.id },
            data: { resolved: true },
        });

        res.json({ success: true });
    } catch (e) {
        console.error('[StudioHub] Resolve error:', e.message);
        res.status(500).json({ error: 'Failed to resolve error' });
    }
});

// ════════════════════════════════════════════════════════════════════
// STORAGE — Usage stats
// ════════════════════════════════════════════════════════════════════
router.get('/storage', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const [assetStats, dbStats, sandboxStats] = await Promise.all([
            prisma.asset.aggregate({ where: { userId }, _sum: { originalSize: true, optimizedSize: true }, _count: true }),
            prisma.projectDatabase.aggregate({ where: { userId, status: { not: 'destroyed' } }, _sum: { sizeBytes: true }, _count: true }),
            prisma.sandbox.aggregate({ where: { userId, status: { in: ['creating', 'running', 'stopped'] } }, _sum: { storageUsed: true }, _count: true }),
        ]);

        res.json({
            assets: { count: assetStats._count, totalBytes: assetStats._sum.originalSize || 0, optimizedBytes: assetStats._sum.optimizedSize || 0 },
            databases: { count: dbStats._count, totalBytes: dbStats._sum.sizeBytes || 0 },
            sandboxes: { count: sandboxStats._count, totalBytes: sandboxStats._sum.storageUsed || 0 },
            totalBytes: (assetStats._sum.originalSize || 0) + (dbStats._sum.sizeBytes || 0) + (sandboxStats._sum.storageUsed || 0),
        });
    } catch (err) {
        console.error('[StudioHub] Storage error:', err.message);
        res.status(500).json({ error: 'Failed to load storage data' });
    }
});

// ════════════════════════════════════════════════════════════════════
// AGENT TASKS — History
// ════════════════════════════════════════════════════════════════════
router.get('/agent-tasks', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const tasks = await prisma.agentTask.findMany({
            where: { userId },
            orderBy: { startedAt: 'desc' },
            take: 50,
            include: { project: { select: { name: true } } },
        });

        res.json({ tasks });
    } catch (err) {
        console.error('[StudioHub] Agent tasks error:', err.message);
        res.status(500).json({ error: 'Failed to load agent tasks' });
    }
});

// ════════════════════════════════════════════════════════════════════
// AI IMAGE GENERATION — Proxy to canvas tool execution
// ════════════════════════════════════════════════════════════════════
router.post('/generate-image', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { prompt, style = 'vivid', size = '1024x1024' } = req.body;
        if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt is required' });

        // Use the internal agent-tools-service for image generation
        const { default: agentToolsService } = await import('../lib/agent-tools-service.js');
        const result = await agentToolsService.executeImageTool({
            action: 'generate',
            prompt: prompt.substring(0, 1000),
            style,
            size,
            userId,
        });

        res.json({ success: true, result });
    } catch (err) {
        console.error('[StudioHub] Image generation error:', err.message);
        res.status(500).json({ error: 'Image generation failed: ' + err.message });
    }
});

// ════════════════════════════════════════════════════════════════════
// AI VIDEO GENERATION — Proxy to video tool execution
// ════════════════════════════════════════════════════════════════════
router.post('/generate-video', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { prompt, duration = 5 } = req.body;
        if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt is required' });

        const { default: agentToolsService } = await import('../lib/agent-tools-service.js');
        const result = await agentToolsService.executeVideoTool({
            action: 'generate',
            prompt: prompt.substring(0, 1000),
            duration,
            userId,
        });

        res.json({ success: true, result });
    } catch (err) {
        console.error('[StudioHub] Video generation error:', err.message);
        res.status(500).json({ error: 'Video generation failed: ' + err.message });
    }
});

export default router;
