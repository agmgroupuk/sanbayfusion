/**
 * AI TOOLS ROUTES — Autofix, Explain, Refactor, Tests
 * Connected to project files via editorBridge sync.
 * Stores operation history in project metadata.
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  smartRequest,
  getFriendlyError,
} from '../lib/smart-ai-router.js';
import db from '../lib/db.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// ── Helpers ────────────────────────────────────────────────────────

function getToolsHistory(project) {
  try {
    const meta = project.metadata ? JSON.parse(project.metadata) : {};
    return meta.aiToolsHistory || [];
  } catch { return []; }
}

async function saveToolsHistory(projectId, history) {
  const project = await db.canvasProject.findUnique({ where: { id: projectId }, select: { metadata: true } });
  const meta = project?.metadata ? JSON.parse(project.metadata) : {};
  // Keep last 100 entries
  meta.aiToolsHistory = history.slice(-100);
  await db.canvasProject.update({ where: { id: projectId }, data: { metadata: JSON.stringify(meta) } });
}

async function getProjectFiles(projectId) {
  const rows = await db.projectFile.findMany({ where: { projectId }, select: { path: true, content: true } });
  const map = {};
  for (const r of rows) map[r.path] = r.content;
  return map;
}

async function callAI(prompt, systemPrompt, provider = 'mistral', modelId = 'mistral-medium-latest') {
  const result = await smartRequest(
    async (activeProvider, activeModel) => {
      // Import lazy — reuse getClientForProvider
      const OpenAI = (await import('openai')).default;
      let client;
      if (activeProvider === 'mistral') {
        client = new OpenAI({ apiKey: process.env.MISTRAL_API_KEY, baseURL: 'https://api.mistral.ai/v1' });
      } else if (activeProvider === 'xai') {
        client = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' });
      } else {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }
      const completion = await client.chat.completions.create({
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });
      return completion.choices[0]?.message?.content || '';
    },
    { provider, model: modelId, message: prompt, maxRetries: 2 }
  );
  if (!result.success) throw new Error('AI service unavailable');
  return result.result;
}

function parseJSON(text) {
  try {
    let s = text.trim();
    if (s.startsWith('```json')) s = s.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (s.startsWith('```')) s = s.replace(/^```\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ── POST /api/ai-tools/:projectId/autofix ─────────────────────────
// Analyzes all project files for errors, returns issues + suggested fixes

router.post('/:projectId/autofix', [
  param('projectId').notEmpty(),
  body('files').isObject().withMessage('files object required'),
  body('provider').optional().isString(),
  body('modelId').optional().isString(),
], validate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { files, provider, modelId } = req.body;

    const fileList = Object.entries(files).map(([path, content]) =>
      `=== ${path} ===\n${(content || '').toString().slice(0, 3000)}`
    ).join('\n\n');

    const systemPrompt = `You are an expert code reviewer. Analyze the provided code files for bugs, errors, anti-patterns, and potential issues. Return a JSON array of issues found.

Each issue must have:
- id: unique string
- file: file path
- line: approximate line number
- column: 1
- message: clear description of the issue
- severity: "error" or "warning"
- fixable: true/false
- suggestedFix: brief description of the fix
- fixedCode: the corrected code snippet (just the relevant portion)

If no issues found return an empty array: []
Return ONLY valid JSON array, no markdown, no explanation.`;

    const raw = await callAI(
      `Analyze these project files for bugs, errors, and issues:\n\n${fileList}`,
      systemPrompt, provider || 'mistral', modelId || 'mistral-medium-latest'
    );

    let issues = parseJSON(raw);
    if (!Array.isArray(issues)) issues = [];

    // Save to history
    const project = await db.canvasProject.findUnique({ where: { id: projectId }, select: { metadata: true } });
    if (project) {
      const history = getToolsHistory(project);
      history.push({
        id: Date.now().toString(),
        type: 'autofix',
        timestamp: new Date().toISOString(),
        summary: `Found ${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        issueCount: issues.length,
        filesAnalyzed: Object.keys(files).length,
      });
      await saveToolsHistory(projectId, history);
    }

    res.json({ success: true, issues });
  } catch (e) {
    console.error('[AI Tools] Autofix error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/ai-tools/:projectId/fix ─────────────────────────────
// Apply a specific fix — AI rewrites the file portion

router.post('/:projectId/fix', [
  param('projectId').notEmpty(),
  body('file').notEmpty(),
  body('content').isString(),
  body('issue').isObject(),
  body('provider').optional().isString(),
  body('modelId').optional().isString(),
], validate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { file, content, issue, provider, modelId } = req.body;

    const systemPrompt = `You are an expert code fixer. Fix the described issue in the provided code. Return ONLY the complete fixed file content — no explanation, no markdown fences, just the code.`;

    const fixedContent = await callAI(
      `Fix this issue in "${file}":\n\nIssue: ${issue.message}\nSuggested fix: ${issue.suggestedFix || 'Fix the issue'}\n\nCurrent file content:\n${content}`,
      systemPrompt, provider || 'mistral', modelId || 'mistral-medium-latest'
    );

    // Save fixed file to DB
    await db.projectFile.upsert({
      where: { projectId_path: { projectId, path: file } },
      update: { content: fixedContent },
      create: { projectId, path: file, content: fixedContent, language: file.split('.').pop() || 'text' },
    });

    // History
    const project = await db.canvasProject.findUnique({ where: { id: projectId }, select: { metadata: true } });
    if (project) {
      const history = getToolsHistory(project);
      history.push({
        id: Date.now().toString(),
        type: 'fix',
        timestamp: new Date().toISOString(),
        summary: `Fixed: ${issue.message}`,
        file,
      });
      await saveToolsHistory(projectId, history);
    }

    res.json({ success: true, file, content: fixedContent });
  } catch (e) {
    console.error('[AI Tools] Fix error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/ai-tools/:projectId/explain ─────────────────────────
// Explain selected code

router.post('/:projectId/explain', [
  param('projectId').notEmpty(),
  body('code').notEmpty(),
  body('file').optional().isString(),
  body('provider').optional().isString(),
  body('modelId').optional().isString(),
], validate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { code, file, provider, modelId } = req.body;

    const systemPrompt = `You are an expert code teacher. Explain the provided code clearly and concisely. Return a JSON object with:
- summary: 1-2 sentence overview
- detailed: thorough explanation (multiple paragraphs okay)
- complexity: time/space complexity if applicable, or general complexity assessment
- suggestions: array of improvement tips (max 5)
- relatedConcepts: array of related programming concepts (max 5)

Return ONLY valid JSON, no markdown fences.`;

    const raw = await callAI(
      `Explain this code${file ? ` from ${file}` : ''}:\n\n${code.slice(0, 5000)}`,
      systemPrompt, provider || 'mistral', modelId || 'mistral-medium-latest'
    );

    let explanation = parseJSON(raw);
    if (!explanation) explanation = { summary: raw.slice(0, 200), detailed: raw, complexity: null, suggestions: [], relatedConcepts: [] };

    // History
    const project = await db.canvasProject.findUnique({ where: { id: projectId }, select: { metadata: true } });
    if (project) {
      const history = getToolsHistory(project);
      history.push({
        id: Date.now().toString(),
        type: 'explain',
        timestamp: new Date().toISOString(),
        summary: explanation.summary?.slice(0, 100) || 'Code explained',
        file: file || 'selection',
        codePreview: code.slice(0, 80),
      });
      await saveToolsHistory(projectId, history);
    }

    res.json({ success: true, explanation });
  } catch (e) {
    console.error('[AI Tools] Explain error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/ai-tools/:projectId/refactor ────────────────────────
// Analyze code and suggest refactoring improvements

router.post('/:projectId/refactor', [
  param('projectId').notEmpty(),
  body('files').isObject(),
  body('provider').optional().isString(),
  body('modelId').optional().isString(),
], validate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { files, provider, modelId } = req.body;

    const fileList = Object.entries(files).map(([path, content]) =>
      `=== ${path} ===\n${(content || '').toString().slice(0, 3000)}`
    ).join('\n\n');

    const systemPrompt = `You are a senior code refactoring expert. Analyze the code and suggest concrete refactoring improvements. Return a JSON array of suggestions.

Each suggestion:
- id: unique string
- type: one of "extract", "rename", "simplify", "optimize", "modernize", "pattern"
- title: short title
- description: what and why to refactor
- file: specific file path
- lineRange: [startLine, endLine] approximate
- originalCode: the current code snippet
- refactoredCode: the improved code snippet
- impact: "high", "medium", or "low"

Return max 10 suggestions, sorted by impact. Return ONLY valid JSON array.`;

    const raw = await callAI(
      `Analyze these files for refactoring opportunities:\n\n${fileList}`,
      systemPrompt, provider || 'mistral', modelId || 'mistral-medium-latest'
    );

    let suggestions = parseJSON(raw);
    if (!Array.isArray(suggestions)) suggestions = [];

    // History
    const project = await db.canvasProject.findUnique({ where: { id: projectId }, select: { metadata: true } });
    if (project) {
      const history = getToolsHistory(project);
      history.push({
        id: Date.now().toString(),
        type: 'refactor',
        timestamp: new Date().toISOString(),
        summary: `${suggestions.length} refactoring suggestion${suggestions.length !== 1 ? 's' : ''}`,
        filesAnalyzed: Object.keys(files).length,
      });
      await saveToolsHistory(projectId, history);
    }

    res.json({ success: true, suggestions });
  } catch (e) {
    console.error('[AI Tools] Refactor error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/ai-tools/:projectId/refactor/apply ──────────────────
// Apply a specific refactoring suggestion

router.post('/:projectId/refactor/apply', [
  param('projectId').notEmpty(),
  body('file').notEmpty(),
  body('content').isString(),
  body('suggestion').isObject(),
  body('provider').optional().isString(),
  body('modelId').optional().isString(),
], validate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { file, content, suggestion, provider, modelId } = req.body;

    const systemPrompt = `You are an expert code refactorer. Apply the described refactoring to the provided code. Return ONLY the complete refactored file content — no explanation, no markdown fences.`;

    const refactored = await callAI(
      `Apply this refactoring to "${file}":\n\nTitle: ${suggestion.title}\nDescription: ${suggestion.description}\nOriginal code:\n${suggestion.originalCode}\nRefactored code:\n${suggestion.refactoredCode}\n\nFull current file:\n${content}`,
      systemPrompt, provider || 'mistral', modelId || 'mistral-medium-latest'
    );

    await db.projectFile.upsert({
      where: { projectId_path: { projectId, path: file } },
      update: { content: refactored },
      create: { projectId, path: file, content: refactored, language: file.split('.').pop() || 'text' },
    });

    const project = await db.canvasProject.findUnique({ where: { id: projectId }, select: { metadata: true } });
    if (project) {
      const history = getToolsHistory(project);
      history.push({
        id: Date.now().toString(),
        type: 'refactor-apply',
        timestamp: new Date().toISOString(),
        summary: `Applied: ${suggestion.title}`,
        file,
      });
      await saveToolsHistory(projectId, history);
    }

    res.json({ success: true, file, content: refactored });
  } catch (e) {
    console.error('[AI Tools] Refactor apply error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/ai-tools/:projectId/tests ───────────────────────────
// Generate tests for selected code

router.post('/:projectId/tests', [
  param('projectId').notEmpty(),
  body('code').notEmpty(),
  body('file').optional().isString(),
  body('framework').isIn(['jest', 'vitest', 'mocha', 'playwright']),
  body('testType').isIn(['unit', 'integration', 'e2e']),
  body('provider').optional().isString(),
  body('modelId').optional().isString(),
], validate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { code, file, framework, testType, provider, modelId } = req.body;

    const systemPrompt = `You are an expert test writer. Generate ${testType} tests using ${framework} for the provided code. Return a JSON array of test objects.

Each test:
- id: unique string
- name: descriptive test name
- code: complete test code (importable, runnable)
- type: "${testType}"
- framework: "${framework}"

Generate 3-6 meaningful tests covering key functionality, edge cases, and error scenarios. Return ONLY valid JSON array.`;

    const raw = await callAI(
      `Generate ${testType} tests using ${framework} for this code${file ? ` from ${file}` : ''}:\n\n${code.slice(0, 5000)}`,
      systemPrompt, provider || 'mistral', modelId || 'mistral-medium-latest'
    );

    let tests = parseJSON(raw);
    if (!Array.isArray(tests)) tests = [];

    // History
    const project = await db.canvasProject.findUnique({ where: { id: projectId }, select: { metadata: true } });
    if (project) {
      const history = getToolsHistory(project);
      history.push({
        id: Date.now().toString(),
        type: 'tests',
        timestamp: new Date().toISOString(),
        summary: `Generated ${tests.length} ${testType} test${tests.length !== 1 ? 's' : ''} (${framework})`,
        file: file || 'selection',
        framework,
        testType,
      });
      await saveToolsHistory(projectId, history);
    }

    res.json({ success: true, tests });
  } catch (e) {
    console.error('[AI Tools] Tests error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET /api/ai-tools/:projectId/history ──────────────────────────
// Get AI tools operation history

router.get('/:projectId/history', [
  param('projectId').notEmpty(),
], validate, async (req, res) => {
  try {
    const project = await db.canvasProject.findUnique({ where: { id: req.params.projectId }, select: { metadata: true } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const history = getToolsHistory(project);
    res.json({ success: true, history: history.reverse() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── DELETE /api/ai-tools/:projectId/history ───────────────────────
// Clear history

router.delete('/:projectId/history', [
  param('projectId').notEmpty(),
], validate, async (req, res) => {
  try {
    await saveToolsHistory(req.params.projectId, []);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
