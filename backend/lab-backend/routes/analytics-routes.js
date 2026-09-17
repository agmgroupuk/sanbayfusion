/**
 * ANALYTICS ROUTES — Lab analytics stats
 * Ported from backend/routes/analytics.js (lab/stats section)
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// ============================================
// GET LAB ANALYTICS STATS (Real-time)
// ============================================
router.get('/lab/stats', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Get platform-wide active sessions in last 5 minutes
    const platformActiveSessions = await prisma.session.count({
      where: {
        isActive: true,
        lastActivity: { gte: fiveMinutesAgo },
      },
    });

    // Get unique lab experiment sessions in last 5 minutes
    const labActiveSessions = await prisma.labExperiment.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
        sessionId: { not: null },
      },
      distinct: ['sessionId'],
      select: { sessionId: true },
    });

    // Get total tests today
    const testsToday = await prisma.labExperiment.count({
      where: { createdAt: { gte: today } },
    });

    // Get total tests all time
    const totalTestsAllTime = await prisma.labExperiment.count();

    // Get average session duration from recent experiments
    const avgDurationResult = await prisma.labExperiment.aggregate({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        processingTime: { gt: 0 },
      },
      _avg: { processingTime: true },
    });
    const avgSessionMs = avgDurationResult._avg?.processingTime || 0;
    const avgMinutes = Math.floor(avgSessionMs / 60000);
    const avgSeconds = Math.floor((avgSessionMs % 60000) / 1000);

    // Experiment types mapping
    const experimentTypes = [
      { id: 'image-playground', name: 'AI Image Playground', color: 'from-pink-500 to-rose-500' },
      { id: 'story-weaver', name: 'AI Story Weaver', color: 'from-green-500 to-emerald-500' },
      { id: 'neural-art', name: 'Neural Art Studio', color: 'from-orange-500 to-amber-500' },
      { id: 'voice-cloning', name: 'Voice Cloning Studio', color: 'from-purple-500 to-indigo-500' },
      { id: 'emotion-visualizer', name: 'Emotion Visualizer', color: 'from-red-500 to-pink-500' },
      { id: 'personality-mirror', name: 'Personality Mirror', color: 'from-teal-500 to-cyan-500' },
      { id: 'music-generator', name: 'AI Music Generator', color: 'from-blue-500 to-cyan-500' },
      { id: 'battle-arena', name: 'AI Battle Arena', color: 'from-yellow-500 to-orange-500' },
      { id: 'dream-interpreter', name: 'Dream Interpreter', color: 'from-violet-500 to-purple-500' },
      { id: 'future-predictor', name: 'Future Predictor', color: 'from-indigo-500 to-blue-500' },
    ];

    // Get stats for each experiment type
    const experimentStats = await Promise.all(
      experimentTypes.map(async (exp) => {
        const totalTests = await prisma.labExperiment.count({
          where: { experimentType: exp.id },
        });

        const activeNow = await prisma.labExperiment.findMany({
          where: {
            experimentType: exp.id,
            createdAt: { gte: fiveMinutesAgo },
            sessionId: { not: null },
          },
          distinct: ['sessionId'],
          select: { sessionId: true },
        });

        const durationResult = await prisma.labExperiment.aggregate({
          where: {
            experimentType: exp.id,
            processingTime: { gt: 0 },
          },
          _avg: { processingTime: true },
        });
        const avgMs = durationResult._avg?.processingTime || 0;
        const mins = Math.floor(avgMs / 60000);
        const secs = Math.floor((avgMs % 60000) / 1000);

        const last24h = await prisma.labExperiment.count({
          where: {
            experimentType: exp.id,
            createdAt: { gte: twentyFourHoursAgo },
          },
        });
        const prev24h = await prisma.labExperiment.count({
          where: {
            experimentType: exp.id,
            createdAt: { gte: fortyEightHoursAgo, lt: twentyFourHoursAgo },
          },
        });

        let trendValue = 0;
        let trend = 'stable';
        if (prev24h > 0) {
          trendValue = ((last24h - prev24h) / prev24h) * 100;
          trend = trendValue > 2 ? 'up' : trendValue < -2 ? 'down' : 'stable';
        } else if (last24h > 0) {
          trendValue = 100;
          trend = 'up';
        }

        return {
          id: exp.id,
          name: exp.name,
          tests: totalTests,
          activeUsers: activeNow.length,
          avgDuration: `${mins}m ${secs.toString().padStart(2, '0')}s`,
          trend,
          trendValue: parseFloat(trendValue.toFixed(1)),
          color: exp.color,
        };
      }),
    );

    experimentStats.sort((a, b) => b.tests - a.tests);

    res.json({
      success: true,
      data: {
        realtime: {
          totalUsers: platformActiveSessions,
          labActiveUsers: labActiveSessions.length,
          activeExperiments: 10,
          testsToday,
          totalTestsAllTime,
          avgSessionTime: `${avgMinutes}m ${avgSeconds.toString().padStart(2, '0')}s`,
        },
        experiments: experimentStats,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting lab stats:', error);
    res.status(500).json({ error: 'Failed to get lab stats' });
  }
});

// ============================================================================
// GET RECENT LAB ACTIVITY
// ============================================================================
router.get('/lab/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recent = await prisma.labExperiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        experimentType: true,
        sessionId: true,
        processingTime: true,
        createdAt: true,
      },
    });
    const activity = recent.map(e => ({
      id: e.id,
      type: e.experimentType,
      duration: e.processingTime,
      timestamp: e.createdAt,
    }));
    res.json({ success: true, activity });
  } catch (error) {
    console.error('Error getting lab activity:', error);
    res.status(500).json({ error: 'Failed to get lab activity' });
  }
});

export default router;
