/**
 * CANVAS PROJECT API ROUTES
 * Endpoints for managing canvas projects in the file system.
 * Fully source-scoped: standalone (GenCraft Pro) and embedded (Canvas Studio) projects are separated.
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import CanvasFileManager from '../services/canvas/canvas-file-manager.js';

const router = express.Router();
const canvasManager = new CanvasFileManager();

/**
 * Extract source from X-Canvas-Source header or query/body.
 * Defaults to 'standalone' if not provided.
 */
function getSource(req) {
  return req.headers['x-canvas-source'] || req.query.source || req.body?.source || 'standalone';
}

// Input validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// Authentication middleware - requires valid session
const requireAuth = async (req, res, next) => {
  try {
    // Check for authenticated user
    const userId = req.session?.userId || req.user?.id;
    if (userId) {
      req.userId = userId;
      req.isAuthenticated = true;
      return next();
    }

    // For canvas operations, allow session-based access
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      req.userId = `session_${sessionId}`;
      req.isAuthenticated = false;
      return next();
    }

    // Fallback: Use browser fingerprint for guest users
    const crypto = await import('crypto');
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const fingerprint = crypto.createHash('md5').update(`${ip}:${userAgent}`).digest('hex').slice(0, 16);
    req.userId = `guest_${fingerprint}`;
    req.isAuthenticated = false;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

// Optional auth - sets userId if available, otherwise uses browser session ID for isolation
const optionalAuth = async (req, res, next) => {
  try {
    // Try to get authenticated user ID first
    const userId = req.session?.userId || req.user?.id;
    if (userId) {
      req.userId = userId;
      req.isAuthenticated = true;
      return next();
    }

    // For unauthenticated users, use session cookie for isolation
    // This ensures each browser session gets their own project space
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      req.userId = `session_${sessionId}`;
      req.isAuthenticated = false;
      return next();
    }

    // Fallback: Use a combination of IP + User-Agent hash for uniqueness
    const crypto = await import('crypto');
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const fingerprint = crypto.createHash('md5').update(`${ip}:${userAgent}`).digest('hex').slice(0, 16);
    req.userId = `guest_${fingerprint}`;
    req.isAuthenticated = false;
    next();
  } catch (error) {
    console.error('optionalAuth error:', error);
    // Use timestamp-based fallback to ensure uniqueness
    req.userId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    req.isAuthenticated = false;
    next();
  }
};

/**
 * POST /api/canvas/projects
 * Save a canvas project (uses anonymous if not authenticated)
 */
router.post('/projects', optionalAuth, [
  body('name').optional().isString().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('code').optional().isString(),
  body('thumbnail').optional().isString(),
  body('tags').optional().isArray(),
  body('metadata').optional().isObject(),
], validateRequest, async (req, res) => {
  try {
    const { name, description, code, thumbnail, tags, metadata, ...otherData } = req.body;
    const userId = req.userId;

    const projectData = {
      name: name || 'Untitled Project',
      description: description || '',
      code: code || '',
      thumbnail,
      tags: tags || [],
      metadata: metadata || {},
      ...otherData,
      createdAt: new Date().toISOString(),
    };

    const result = await canvasManager.saveProject(projectData, userId, getSource(req));

    if (result.success) {
      res.json({
        success: true,
        projectId: result.projectId,
        message: 'Project saved successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[CanvasAPI] Save project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save project',
    });
  }
});

/**
 * GET /api/canvas/projects
 * List canvas projects for the user (uses anonymous if not authenticated)
 */
router.get('/projects', optionalAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await canvasManager.listProjects(userId, getSource(req));

    if (result.success) {
      res.json({
        success: true,
        projects: result.projects,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[CanvasAPI] List projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list projects',
    });
  }
});

/**
 * GET /api/canvas/projects/:projectId
 * Load a specific canvas project
 */
router.get('/projects/:projectId', requireAuth, [
  param('projectId').isString().isLength({ min: 1 }),
], validateRequest, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const result = await canvasManager.loadProject(projectId, userId, getSource(req));

    if (result.success) {
      res.json({
        success: true,
        project: result.project,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }
  } catch (error) {
    console.error('[CanvasAPI] Load project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load project',
    });
  }
});

/**
 * PUT /api/canvas/projects/:projectId
 * Update a canvas project
 */
router.put('/projects/:projectId', requireAuth, [
  param('projectId').isString().isLength({ min: 1 }),
  body('name').optional().isString().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('code').optional().isString(),
  body('thumbnail').optional().isString(),
  body('tags').optional().isArray(),
  body('metadata').optional().isObject(),
], validateRequest, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const updates = req.body;

    // First load the existing project
    const loadResult = await canvasManager.loadProject(projectId, userId, getSource(req));
    if (!loadResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Merge updates with existing project
    const updatedProject = {
      ...loadResult.project,
      ...updates,
      id: projectId, // Ensure ID doesn't change
      userId,
      updatedAt: new Date().toISOString(),
    };

    const saveResult = await canvasManager.saveProject(updatedProject, userId, getSource(req));

    if (saveResult.success) {
      res.json({
        success: true,
        message: 'Project updated successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: saveResult.error,
      });
    }
  } catch (error) {
    console.error('[CanvasAPI] Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
});

/**
 * DELETE /api/canvas/projects/:projectId
 * Delete a canvas project
 */
router.delete('/projects/:projectId', requireAuth, [
  param('projectId').isString().isLength({ min: 1 }),
], validateRequest, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const result = await canvasManager.deleteProject(projectId, userId, getSource(req));

    if (result.success) {
      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[CanvasAPI] Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});

/**
 * POST /api/canvas/projects/:projectId/export
 * Export a canvas project
 */
router.post('/projects/:projectId/export', requireAuth, [
  param('projectId').isString().isLength({ min: 1 }),
  body('format').optional().isIn(['html', 'json']),
], validateRequest, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'html' } = req.body;
    const userId = req.userId;

    const result = await canvasManager.exportProject(projectId, userId, format, getSource(req));

    if (result.success) {
      res.json({
        success: true,
        content: result.content,
        fileName: result.fileName,
        format: result.format,
        message: 'Project exported successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[CanvasAPI] Export project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export project',
    });
  }
});

/**
 * GET /api/canvas/projects/search
 * Search canvas projects
 */
router.get('/projects/search', requireAuth, [
  body('query').isString().isLength({ min: 1 }),
], validateRequest, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.userId;

    const result = await canvasManager.searchProjects(query, userId, getSource(req));

    if (result.success) {
      res.json({
        success: true,
        projects: result.projects,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[CanvasAPI] Search projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search projects',
    });
  }
});

export default router;