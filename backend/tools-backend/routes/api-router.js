/**
 * API ROUTER — Tools Backend
 * Most tools are self-contained in Next.js API routes.
 * This backend provides health checks and usage tracking for future expansion.
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';
import { healthCheck } from '../lib/prisma.js';

const router = express.Router();

// Health check
router.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();
  res.json({ status: 'ok', service: 'tools-backend', database: dbHealth, timestamp: new Date().toISOString() });
});

// Track tool usage (for analytics)
// Helper: Award rewards points via Next.js API (non-blocking)
function awardRewardsPoints(userId, action, metadata = {}) {
  if (!userId) return;
  fetch('http://127.0.0.1:3000/api/rewards/earn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, action, metadata }),
  }).catch(e => console.error('[rewards] Error:', e.message));
}

router.post('/tools/track', async (req, res) => {
  try {
    const { toolId, toolName, userId, sessionId, input, output, duration } = req.body;
    if (!toolId || !toolName) {
      return res.status(400).json({ error: 'toolId and toolName required' });
    }

    const usage = await prisma.toolUsage.create({
      data: {
        toolId,
        toolName,
        userId: userId || null,
        sessionId: sessionId || null,
        input: input || {},
        output: output || null,
        duration: duration || 0,
      },
    });

    // Award points for tool usage
    awardRewardsPoints(userId, 'tool_usage', { toolId, toolName });

    return res.json({ success: true, id: usage.id });
  } catch (error) {
    console.error('[tools/track] Error:', error);
    return res.status(500).json({ error: 'Failed to track tool usage' });
  }
});

// Get tool usage stats
router.get('/tools/stats', async (req, res) => {
  try {
    const { toolId, days = 7 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const where = { createdAt: { gte: since } };
    if (toolId) where.toolId = toolId;

    const totalUsage = await prisma.toolUsage.count({ where });
    const uniqueUsers = await prisma.toolUsage.findMany({
      where: { ...where, userId: { not: null } },
      distinct: ['userId'],
      select: { userId: true },
    });

    return res.json({
      success: true,
      data: {
        totalUsage,
        uniqueUsers: uniqueUsers.length,
        period: `${days} days`,
        since: since.toISOString(),
      },
    });
  } catch (error) {
    console.error('[tools/stats] Error:', error);
    return res.status(500).json({ error: 'Failed to get tool stats' });
  }
});

export default router;
