/**
 * AGENT MEMORY API ROUTES
 * Backend endpoints for agent memory operations
 */

import express from 'express';
import { isValidId } from '../lib/validation-utils.js';
import AgentMemory from '../models/AgentMemory.js';
import memoryService from '../services/agent-memory-service.js';
import agentTools from '../services/agent-tools-service.js';

const router = express.Router();

/**
 * GET /api/agents/memory/:userId/:agentId
 * Get memory stats for a user-agent pair
 */
router.get('/memory/:userId/:agentId', async (req, res) => {
  try {
    const { userId, agentId } = req.params;

    console.log('[Memory Load] GET userId:', userId, 'agentId:', agentId);

    if (!isValidId(userId)) {
      console.log('[Memory Load] Invalid userId:', userId);
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    if (!isValidId(agentId) || agentId === 'default') {
      console.log('[Memory Load] Invalid agentId:', agentId);
      return res.status(400).json({ success: false, error: 'Invalid agent ID' });
    }

    const stats = await memoryService.getMemoryStats(userId, agentId);
    console.log('[Memory Load] Exists:', stats.exists, 'Profile keys:', Object.keys(stats.userProfile || {}));
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Memory Load] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agents/memory/:userId/:agentId/learn
 * Process a conversation and extract learnings
 */
router.post('/memory/:userId/:agentId/learn', async (req, res) => {
  try {
    const { userId, agentId } = req.params;
    const { messages, conversationId } = req.body;

    if (!isValidId(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    if (!isValidId(agentId) || agentId === 'default') {
      return res.status(400).json({ success: false, error: 'Invalid agent ID' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'Messages array required' });
    }

    const result = await memoryService.processConversation(
      userId,
      agentId,
      messages,
      conversationId,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing learnings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/agents/memory/:userId/:agentId/context
 * Get enhanced system prompt with memory context
 */
router.get('/memory/:userId/:agentId/context', async (req, res) => {
  try {
    const { userId, agentId } = req.params;
    const { basePrompt } = req.query;

    if (!isValidId(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    if (!isValidId(agentId) || agentId === 'default') {
      return res.status(400).json({ success: false, error: 'Invalid agent ID' });
    }

    const enhancedPrompt = await memoryService.buildEnhancedSystemPrompt(
      userId,
      agentId,
      basePrompt || '',
    );

    res.json({ success: true, data: { enhancedPrompt } });
  } catch (error) {
    console.error('Error building context:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agents/memory/:userId/:agentId/profile
 * Update user profile for an agent
 */
router.post('/memory/:userId/:agentId/profile', async (req, res) => {
  try {
    const { userId, agentId } = req.params;
    const { updates } = req.body;

    console.log('[Memory Profile] POST userId:', userId, 'agentId:', agentId, 'updates:', JSON.stringify(updates)?.substring(0, 200));

    if (!isValidId(userId)) {
      console.log('[Memory Profile] Invalid userId:', userId);
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    if (!isValidId(agentId) || agentId === 'default') {
      console.log('[Memory Profile] Invalid agentId:', agentId);
      return res.status(400).json({ success: false, error: 'Invalid agent ID' });
    }

    const result = await memoryService.updateUserProfile(userId, agentId, updates);
    console.log('[Memory Profile] Result:', JSON.stringify(result));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Memory Profile] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/agents/memory/:userId/:agentId
 * Clear memories for a user-agent pair
 */
router.delete('/memory/:userId/:agentId', async (req, res) => {
  try {
    const { userId, agentId } = req.params;
    const { clearAll, memoryType, olderThan } = req.body || {};

    if (!isValidId(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    if (!isValidId(agentId) || agentId === 'default') {
      return res.status(400).json({ success: false, error: 'Invalid agent ID' });
    }

    const result = await memoryService.clearMemories(userId, agentId, {
      clearAll,
      memoryType,
      olderThan,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error clearing memories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agents/memory/:userId/:agentId/add
 * Manually add a memory
 */
router.post('/memory/:userId/:agentId/add', async (req, res) => {
  try {
    const { userId, agentId } = req.params;
    const { type, content, importance, tags, data } = req.body;

    if (!isValidId(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    if (!type || !content) {
      return res.status(400).json({ success: false, error: 'Type and content required' });
    }

    const memory = await AgentMemory.getOrCreate(userId, agentId);
    await memory.addMemory({
      type,
      content,
      importance: importance || 5,
      tags: tags || [],
      data: data || {},
      source: { timestamp: new Date() },
    });

    res.json({ success: true, data: { totalMemories: memory.memories.length } });
  } catch (error) {
    console.error('Error adding memory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// AGENT TOOLS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/agents/tools/search
 * Web search
 */
router.post('/tools/search', async (req, res) => {
  try {
    const { query, numResults } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query required' });
    }

    const result = await agentTools.executeTool('web_search', { query, num_results: numResults || 5 });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in web search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agents/tools/fetch-url
 * Fetch URL content
 */
router.post('/tools/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL required' });
    }

    const result = await agentTools.executeTool('fetch_url', { url });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agents/tools/calculate
 * Mathematical calculation
 */
router.post('/tools/calculate', async (req, res) => {
  try {
    const { expression } = req.body;

    if (!expression) {
      return res.status(400).json({ success: false, error: 'Expression required' });
    }

    const result = await agentTools.executeTool('calculate', { expression });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error calculating:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/agents/tools/time
 * Get current time
 */
router.get('/tools/time', async (req, res) => {
  const { timezone } = req.query;
  const result = await agentTools.executeTool('get_current_time', { timezone: timezone || 'UTC' });
  res.json({ success: true, data: result });
});

/**
 * POST /api/agents/tools/execute
 * Execute a tool by name
 */
router.post('/tools/execute', async (req, res) => {
  try {
    const { tool, params } = req.body;

    if (!tool) {
      return res.status(400).json({ success: false, error: 'Tool name required' });
    }

    const result = await agentTools.executeTool(tool, params || {});
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error executing tool:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/agents/tools/available
 * Get list of available tools
 */
router.get('/tools/available', (req, res) => {
  res.json({
    success: true,
    data: {
      tools: agentTools.AVAILABLE_TOOLS,
      descriptions: agentTools.getToolDescriptions(),
    },
  });
});

// ═══════════════════════════════════════════════════════════════════
// FILE OPERATION ROUTES - PostgreSQL file storage
// ═══════════════════════════════════════════════════════════════════

import AgentFile from '../models/AgentFile.js';


/**
 * GET /api/agents/files/download
 * Download a file from PostgreSQL storage
 */
router.get('/files/download', async (req, res) => {
  try {
    const { path: filePath, filename, userId = 'default' } = req.query;

    if (!filePath && !filename) {
      return res.status(400).json({ success: false, error: 'File path or filename required' });
    }

    // Find file in database
    const searchPath = filePath || (filename.startsWith('/') ? filename : `/${filename}`);
    const file = await AgentFile.findOne({
      userId,
      $or: [
        { path: searchPath },
        { filename: filename || searchPath.split('/').pop() },
      ],
      isDeleted: false,
    });

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Note: lastAccessedAt is not in schema, so we skip updating it

    const downloadFilename = file.filename || file.fileName || file.originalName || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Type', file.mimeType || file.contentType || 'application/octet-stream');

    // Check storage type
    {
      // Serve from database
      const contentSize = file.fileSize || file.size || (file.content ? Buffer.byteLength(file.content) : 0);
      res.setHeader('Content-Length', contentSize);
      res.send(file.content);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/agents/files/list
 * List files in agent workspace
 */
router.get('/files/list', async (req, res) => {
  try {
    const { folder = '', userId = 'default' } = req.query;
    const result = await agentTools.listFiles(folder, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agents/files/create
 * Create a file in agent workspace
 */
router.post('/files/create', async (req, res) => {
  try {
    const { filename, content, folder = '', userId = 'default' } = req.body;

    if (!filename || content === undefined) {
      return res.status(400).json({ success: false, error: 'Filename and content required' });
    }

    const result = await agentTools.createFile(filename, content, folder, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/agents/files/read
 * Read a file from agent workspace
 */
router.get('/files/read', async (req, res) => {
  try {
    const { filename, userId = 'default' } = req.query;

    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename required' });
    }

    const result = await agentTools.readFile(filename, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/agents/files/modify
 * Modify a file in agent workspace
 */
router.put('/files/modify', async (req, res) => {
  try {
    const { filename, content, mode = 'replace', userId = 'default' } = req.body;

    if (!filename || content === undefined) {
      return res.status(400).json({ success: false, error: 'Filename and content required' });
    }

    const result = await agentTools.modifyFile(filename, content, mode, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error modifying file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/agents/files/delete
 * Delete a file from agent workspace
 */
router.delete('/files/delete', async (req, res) => {
  try {
    const { filename, userId = 'default' } = req.query;

    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename required' });
    }

    const result = await agentTools.deleteFile(filename, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// LINK PREVIEW — Fetch Open Graph metadata for URL preview cards
// ============================================================================
router.get('/tools/link-preview', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL required' });
    }

    // Basic URL validation
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch { return res.status(400).json({ success: false, error: 'Invalid URL' }); }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ success: false, error: 'Only HTTP/HTTPS URLs allowed' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'MaulaAI-LinkPreview/1.0' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();

    // Extract OG metadata
    const getMetaContent = (property) => {
      const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1];
      }
      return '';
    };

    const title = getMetaContent('og:title') || getMetaContent('twitter:title') || (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim();
    const description = getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description');
    const image = getMetaContent('og:image') || getMetaContent('twitter:image');
    const siteName = getMetaContent('og:site_name') || parsedUrl.hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`;

    res.json({
      success: true,
      data: {
        title: title.substring(0, 200),
        description: description.substring(0, 300),
        image,
        siteName,
        favicon,
        url,
        domain: parsedUrl.hostname,
      },
    });
  } catch (error) {
    res.json({
      success: false,
      data: { title: '', description: '', image: '', siteName: '', url: req.query.url || '', domain: '' },
    });
  }
});

export default router;
