/**
 * SUGGESTIONS ROUTES — Direct Prisma
 * Ported from backend/routes/suggestions.js
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// ============================================
// POST /api/suggestions - Submit new suggestion
// ============================================
router.post('/', async (req, res) => {
  try {
    const { userId, userEmail, userName, isAnonymous, title, description, category, relatedTo, userPriority, tags } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const suggestion = await prisma.communitySuggestion.create({
      data: {
        suggestionId: `sug_${Date.now()}_${uuidv4().slice(0, 8)}`,
        userId,
        userEmail: isAnonymous ? null : userEmail,
        userName: isAnonymous ? null : userName,
        isAnonymous: isAnonymous || false,
        title,
        description,
        category,
        relatedTo,
        userPriority: userPriority || 'would-be-helpful',
        tags: tags || [],
        status: 'pending',
      },
    });

    res.json({
      success: true,
      suggestion: {
        suggestionId: suggestion.suggestionId,
        title: suggestion.title,
        status: suggestion.status,
        createdAt: suggestion.createdAt,
      },
      message: 'Thank you for your suggestion!',
    });
  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Failed to submit suggestion' });
  }
});

// ============================================
// GET /api/suggestions - Get all suggestions
// ============================================
router.get('/', async (req, res) => {
  try {
    const { category, status, sort = 'votes', page = 1, limit = 20 } = req.query;

    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;

    let orderBy = {};
    switch (sort) {
      case 'votes': orderBy = { votesUp: 'desc' }; break;
      case 'newest': orderBy = { createdAt: 'desc' }; break;
      case 'oldest': orderBy = { createdAt: 'asc' }; break;
      default: orderBy = { votesUp: 'desc' };
    }

    const [suggestions, total] = await Promise.all([
      prisma.communitySuggestion.findMany({
        where,
        select: {
          id: true, suggestionId: true, title: true, description: true,
          category: true, status: true, votesUp: true, votesDown: true,
          userPriority: true, createdAt: true, updatedAt: true,
        },
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.communitySuggestion.count({ where }),
    ]);

    res.json({
      success: true,
      suggestions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// ============================================
// GET /api/suggestions/:suggestionId - Single suggestion
// ============================================
router.get('/:suggestionId', async (req, res) => {
  try {
    const { suggestionId } = req.params;

    const suggestion = await prisma.communitySuggestion.findUnique({
      where: { suggestionId },
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Hide internal notes
    const { internal, ...publicData } = suggestion;
    res.json({ success: true, suggestion: publicData });
  } catch (error) {
    console.error('Error fetching suggestion:', error);
    res.status(500).json({ error: 'Failed to fetch suggestion' });
  }
});

// ============================================
// POST /api/suggestions/:suggestionId/vote
// ============================================
router.post('/:suggestionId/vote', async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const { userId, vote } = req.body;

    if (!userId || ![1, -1].includes(vote)) {
      return res.status(400).json({ error: 'Invalid vote' });
    }

    const suggestion = await prisma.communitySuggestion.findUnique({
      where: { suggestionId },
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Parse voters JSON
    let voters = [];
    try { voters = typeof suggestion.voters === 'string' ? JSON.parse(suggestion.voters) : (suggestion.voters || []); }
    catch { voters = []; }

    const existingVoteIndex = voters.findIndex(v => v.userId === userId);

    let votesUpDelta = 0;
    let votesDownDelta = 0;

    if (existingVoteIndex >= 0) {
      const oldVote = voters[existingVoteIndex].vote;
      if (oldVote === 1) votesUpDelta -= 1;
      else votesDownDelta -= 1;

      if (oldVote === vote) {
        voters.splice(existingVoteIndex, 1);
      } else {
        voters[existingVoteIndex].vote = vote;
        if (vote === 1) votesUpDelta += 1;
        else votesDownDelta += 1;
      }
    } else {
      voters.push({ userId, vote, votedAt: new Date().toISOString() });
      if (vote === 1) votesUpDelta += 1;
      else votesDownDelta += 1;
    }

    const updated = await prisma.communitySuggestion.update({
      where: { suggestionId },
      data: {
        votesUp: { increment: votesUpDelta },
        votesDown: { increment: votesDownDelta },
        voters: voters,
      },
    });

    res.json({ success: true, votes: { up: updated.votesUp, down: updated.votesDown } });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// ============================================
// POST /api/suggestions/:suggestionId/comments
// ============================================
router.post('/:suggestionId/comments', async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const { userId, userName, text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Comment text required' });
    }

    const suggestion = await prisma.communitySuggestion.findUnique({
      where: { suggestionId },
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    let comments = [];
    try { comments = typeof suggestion.comments === 'string' ? JSON.parse(suggestion.comments) : (suggestion.comments || []); }
    catch { comments = []; }

    comments.push({
      userId,
      userName,
      text,
      isOfficial: false,
      createdAt: new Date().toISOString(),
    });

    await prisma.communitySuggestion.update({
      where: { suggestionId },
      data: { comments },
    });

    res.json({ success: true, message: 'Comment added' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ============================================
// GET /api/suggestions/user/:userId
// ============================================
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const suggestions = await prisma.communitySuggestion.findMany({
      where: { userId },
      select: {
        suggestionId: true, title: true, category: true, status: true,
        votesUp: true, votesDown: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

export default router;
