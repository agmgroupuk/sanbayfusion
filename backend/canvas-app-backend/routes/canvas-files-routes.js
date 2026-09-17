/**
 * CANVAS FILES API ROUTES
 * Endpoints for managing canvas project files in S3
 * Fully source-scoped: standalone (GenCraft Pro) and embedded (Canvas Studio) files are separated.
 * 
 * These routes handle:
 * - File CRUD operations
 * - Project file sync
 * - Presigned URLs for direct upload/download
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { canvasS3FileService } from '../services/canvas/canvas-s3-file-service.js';
import db from '../lib/db.js';

const router = express.Router();

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

// Authentication middleware - extract user ID
const requireAuth = async (req, res, next) => {
  try {
    // Check for authenticated user
    let userId = req.session?.userId || req.user?.id;
    if (userId) {
      req.userId = userId;
      req.isAuthenticated = true;
      return next();
    }

    // Fallback: cookie-based session (direct backend path via Nginx)
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      try {
        const user = await db.User.findBySessionId(sessionId);
        if (user && (!user.sessionExpiry || new Date(user.sessionExpiry) >= new Date())) {
          req.userId = user.id;
          req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
          req.isAuthenticated = true;
          return next();
        }
      } catch (err) {
        console.error('[canvas-files] Session lookup error:', err.message);
      }
    }
    
    // Require authentication for S3 file operations
    return res.status(401).json({
      success: false,
      error: 'Authentication required for file storage',
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

// Optional auth - allows guest access with session-based ID
const optionalAuth = async (req, res, next) => {
  try {
    const userId = req.session?.userId || req.user?.id;
    if (userId) {
      req.userId = userId;
      req.isAuthenticated = true;
      return next();
    }
    
    // For guests, use session cookie
    const sessionId = req.cookies?.sessionId || req.sessionID;
    if (sessionId) {
      req.userId = `session_${sessionId}`;
      req.isAuthenticated = false;
      return next();
    }
    
    // Fallback to IP hash
    const crypto = await import('crypto');
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const fingerprint = crypto.createHash('md5').update(`${ip}:${userAgent}`).digest('hex').slice(0, 16);
    req.userId = `guest_${fingerprint}`;
    req.isAuthenticated = false;
    next();
  } catch (error) {
    console.error('optionalAuth error:', error);
    req.userId = `guest_${Date.now()}`;
    req.isAuthenticated = false;
    next();
  }
};

// ==================== FILE OPERATIONS ====================

/**
 * GET /api/canvas/files/:projectId
 * List all files in a project
 */
router.get('/:projectId',
  optionalAuth,
  param('projectId').notEmpty().withMessage('Project ID is required'),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const source = getSource(req);
      const result = await canvasS3FileService.listProjectFiles(req.userId, projectId, source);
      
      if (result.success) {
        res.json({
          success: true,
          files: result.files,
          fileCount: result.fileCount,
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('[CanvasFilesAPI] List files error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/canvas/files/:projectId/file
 * Get a single file content
 * Query param: path=/path/to/file.js
 */
router.get('/:projectId/file',
  optionalAuth,
  param('projectId').notEmpty(),
  query('path').notEmpty().withMessage('File path is required'),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { path: filePath } = req.query;
      const source = getSource(req);
      
      const result = await canvasS3FileService.loadFile(req.userId, projectId, filePath, source);
      
      if (result.success) {
        res.json({
          success: true,
          path: filePath,
          content: result.content,
          contentType: result.contentType,
          size: result.size,
          lastModified: result.lastModified,
        });
      } else if (result.notFound) {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('[CanvasFilesAPI] Get file error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/canvas/files/:projectId/file
 * Save a single file
 */
router.post('/:projectId/file',
  optionalAuth,
  param('projectId').notEmpty(),
  body('path').notEmpty().withMessage('File path is required'),
  body('content').exists().withMessage('File content is required'),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { path: filePath, content } = req.body;
      const source = getSource(req);
      
      const result = await canvasS3FileService.saveFile(req.userId, projectId, filePath, content, source);
      
      if (result.success) {
        res.json({
          success: true,
          path: filePath,
          size: result.size,
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('[CanvasFilesAPI] Save file error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/canvas/files/:projectId/sync
 * Sync all project files (bulk save)
 */
router.post('/:projectId/sync',
  optionalAuth,
  param('projectId').notEmpty(),
  body('files').isArray().withMessage('Files array is required'),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { files } = req.body;
      const source = getSource(req);
      
      // Validate files array
      for (const file of files) {
        if (!file.path || file.content === undefined) {
          return res.status(400).json({
            success: false,
            error: 'Each file must have path and content',
          });
        }
      }
      
      const result = await canvasS3FileService.saveFiles(req.userId, projectId, files, source);
      
      res.json({
        success: result.success,
        saved: result.saved,
        failed: result.failed,
        errors: result.errors,
      });
    } catch (error) {
      console.error('[CanvasFilesAPI] Sync files error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/canvas/files/:projectId/load
 * Load all files for a project (full project load)
 */
router.get('/:projectId/load',
  optionalAuth,
  param('projectId').notEmpty(),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const source = getSource(req);
      
      const result = await canvasS3FileService.loadProject(req.userId, projectId, source);
      
      if (result.success) {
        res.json({
          success: true,
          files: result.files,
          fileCount: result.fileCount,
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('[CanvasFilesAPI] Load project error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/canvas/files/:projectId/file
 * Delete a single file
 */
router.delete('/:projectId/file',
  optionalAuth,
  param('projectId').notEmpty(),
  query('path').notEmpty().withMessage('File path is required'),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { path: filePath } = req.query;
      const source = getSource(req);
      
      const result = await canvasS3FileService.deleteFile(req.userId, projectId, filePath, source);
      
      res.json(result);
    } catch (error) {
      console.error('[CanvasFilesAPI] Delete file error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/canvas/files/:projectId
 * Delete all files for a project
 */
router.delete('/:projectId',
  optionalAuth,
  param('projectId').notEmpty(),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const source = getSource(req);
      
      const result = await canvasS3FileService.deleteProject(req.userId, projectId, source);
      
      res.json({
        success: result.success,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error('[CanvasFilesAPI] Delete project error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ==================== PRESIGNED URLs ====================

/**
 * POST /api/canvas/files/:projectId/upload-url
 * Get presigned URL for direct upload (for large files/images)
 */
router.post('/:projectId/upload-url',
  requireAuth,
  param('projectId').notEmpty(),
  body('path').notEmpty().withMessage('File path is required'),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { path: filePath } = req.body;
      const source = getSource(req);
      
      const result = await canvasS3FileService.getUploadUrl(req.userId, projectId, filePath, 3600, source);
      
      if (result.success) {
        res.json({
          success: true,
          uploadUrl: result.url,
          key: result.key,
          expiresIn: result.expiresIn,
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('[CanvasFilesAPI] Upload URL error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/canvas/files/:projectId/download-url
 * Get presigned URL for direct download
 */
router.post('/:projectId/download-url',
  optionalAuth,
  param('projectId').notEmpty(),
  body('path').notEmpty().withMessage('File path is required'),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { path: filePath } = req.body;
      const source = getSource(req);
      
      const result = await canvasS3FileService.getDownloadUrl(req.userId, projectId, filePath, 3600, source);
      
      if (result.success) {
        res.json({
          success: true,
          downloadUrl: result.url,
          expiresIn: result.expiresIn,
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('[CanvasFilesAPI] Download URL error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ==================== UTILITY ROUTES ====================

/**
 * POST /api/canvas/files/:projectId/copy
 * Copy/fork a project
 */
router.post('/:projectId/copy',
  requireAuth,
  param('projectId').notEmpty(),
  body('targetProjectId').notEmpty().withMessage('Target project ID is required'),
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { targetProjectId } = req.body;
      const source = getSource(req);
      
      const result = await canvasS3FileService.copyProject(req.userId, projectId, targetProjectId, source);
      
      res.json({
        success: result.success,
        copiedFiles: result.copiedFiles,
        errors: result.errors,
      });
    } catch (error) {
      console.error('[CanvasFilesAPI] Copy project error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/canvas/files/storage/usage
 * Get user's storage usage
 */
router.get('/storage/usage',
  requireAuth,
  async (req, res) => {
    try {
      const source = getSource(req);
      const result = await canvasS3FileService.getUserStorageUsage(req.userId, source);
      
      res.json({
        success: result.success,
        usage: {
          bytes: result.totalBytes,
          megabytes: result.totalMB,
          fileCount: result.fileCount,
        },
      });
    } catch (error) {
      console.error('[CanvasFilesAPI] Storage usage error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export default router;
