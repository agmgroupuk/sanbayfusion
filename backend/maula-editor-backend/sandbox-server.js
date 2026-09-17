/**
 * =============================================================================
 * Maula Editor - Cloud Sandbox Server
 * =============================================================================
 * Runs inside each ECS Fargate container to:
 * - Accept code files via API
 * - Install dependencies (npm install)
 * - Build projects (vite build, npm run build)
 * - Run dev servers (npm run dev)
 * - Execute commands
 * - Stream output via WebSocket
 * =============================================================================
 */

import express from 'express';
import { createLogger } from './lib/logger.js';
const log = createLogger('SandboxServer');
import { WebSocketServer } from 'ws';
import { spawn, exec } from 'child_process';
import { createServer } from 'http';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;
const WORKSPACE = '/app/workspace';
const TIMEOUT = parseInt(process.env.SANDBOX_TIMEOUT) || 300000; // 5 minutes

// State
let activeProcess = null;
let wsClients = new Set();
let previewPort = null;
let sessionId = null;

// Middleware
app.use(express.json({ limit: '50mb' }));

// Allowed origins for CORS
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://maula.onelastai.co').split(',');

// CORS for sandbox — restricted to known domains
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID, X-API-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// API key authentication middleware
const SANDBOX_API_KEY = process.env.SANDBOX_API_KEY;
app.use('/api', (req, res, next) => {
  if (!SANDBOX_API_KEY) return next(); // Skip if no key configured (dev mode)
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (key !== SANDBOX_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
});

// =============================================================================
// WEBSOCKET - Stream output to clients
// =============================================================================

wss.on('connection', (ws) => {
  log.info('[WS] Client connected');
  wsClients.add(ws);

  ws.on('close', () => {
    log.info('[WS] Client disconnected');
    wsClients.delete(ws);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'stdin' && activeProcess?.stdin) {
        activeProcess.stdin.write(msg.data);
      }
    } catch (e) { }
  });
});

function broadcast(type, data) {
  const msg = JSON.stringify({ type, ...data, timestamp: Date.now() });
  wsClients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    sessionId,
    previewPort,
    hasActiveProcess: !!activeProcess,
    uptime: process.uptime()
  });
});

// Get sandbox info
app.get('/info', async (req, res) => {
  try {
    const files = await listFiles(WORKSPACE);
    res.json({
      sessionId,
      previewPort,
      hasActiveProcess: !!activeProcess,
      files,
      workspace: WORKSPACE
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize session with files
app.post('/init', async (req, res) => {
  try {
    const { files, sessionId: sid } = req.body;
    sessionId = sid || `sandbox-${Date.now()}`;

    log.info(`[Init] Session ${sessionId} with ${files?.length || 0} files`);

    // Clear workspace
    await execAsync(`rm -rf ${WORKSPACE}/*`);

    // Write files
    if (files && files.length > 0) {
      for (const file of files) {
        const filePath = path.join(WORKSPACE, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content || '');
        log.info(`[Init] Wrote: ${file.path}`);
      }
    }

    broadcast('init', { sessionId, fileCount: files?.length || 0 });

    res.json({
      success: true,
      sessionId,
      fileCount: files?.length || 0
    });
  } catch (error) {
    log.error('[Init] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Write a single file
app.post('/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    const fullPath = path.join(WORKSPACE, filePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);

    broadcast('file_write', { path: filePath });
    res.json({ success: true, path: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read a file
app.get('/read/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(WORKSPACE, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ content, path: filePath });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

// Delete a file
app.delete('/file/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(WORKSPACE, filePath);
    await fs.unlink(fullPath);
    broadcast('file_delete', { path: filePath });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List files
app.get('/files', async (req, res) => {
  try {
    const files = await listFiles(WORKSPACE);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run a command
app.post('/exec', async (req, res) => {
  try {
    const { command, args = [], cwd } = req.body;
    const workDir = cwd ? path.join(WORKSPACE, cwd) : WORKSPACE;

    log.info(`[Exec] Running: ${command} ${args.join(' ')}`);
    broadcast('command_start', { command, args });

    // Kill existing process if any
    if (activeProcess) {
      activeProcess.kill('SIGTERM');
      activeProcess = null;
    }

    const proc = spawn(command, args, {
      cwd: workDir,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    activeProcess = proc;
    let output = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      broadcast('stdout', { data: text });

      // Detect dev server ready
      detectServerReady(text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      broadcast('stderr', { data: text });

      // Some servers log to stderr
      detectServerReady(text);
    });

    proc.on('close', (code) => {
      broadcast('command_end', { code, command });
      if (activeProcess === proc) activeProcess = null;
    });

    // For quick commands, wait for completion
    if (!['npm', 'node', 'python', 'yarn', 'pnpm'].some(c => command.includes(c) && args.some(a => a.includes('dev') || a.includes('start')))) {
      await new Promise((resolve) => {
        proc.on('close', resolve);
        setTimeout(resolve, TIMEOUT);
      });
    }

    res.json({
      success: true,
      pid: proc.pid,
      output: output.substring(0, 10000) // Limit response size
    });
  } catch (error) {
    log.error('[Exec] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Install dependencies
app.post('/install', async (req, res) => {
  try {
    const { packageManager = 'npm' } = req.body;

    log.info(`[Install] Running ${packageManager} install`);
    broadcast('install_start', { packageManager });

    const { stdout, stderr } = await execAsync(
      `${packageManager} install`,
      { cwd: WORKSPACE, timeout: 120000 }
    );

    broadcast('install_end', { success: true });

    res.json({
      success: true,
      output: stdout + stderr
    });
  } catch (error) {
    broadcast('install_end', { success: false, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Build project
app.post('/build', async (req, res) => {
  try {
    const { command = 'npm run build' } = req.body;

    log.info(`[Build] Running: ${command}`);
    broadcast('build_start', { command });

    const { stdout, stderr } = await execAsync(command, {
      cwd: WORKSPACE,
      timeout: 180000
    });

    // Check for dist/build output
    let outputDir = null;
    for (const dir of ['dist', 'build', 'out', '.next', '.output']) {
      try {
        await fs.access(path.join(WORKSPACE, dir));
        outputDir = dir;
        break;
      } catch { }
    }

    broadcast('build_end', { success: true, outputDir });

    res.json({
      success: true,
      output: stdout + stderr,
      outputDir
    });
  } catch (error) {
    broadcast('build_end', { success: false, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Start dev server
app.post('/dev', async (req, res) => {
  try {
    const { command = 'npm run dev', port = 3001 } = req.body;

    // Kill existing
    if (activeProcess) {
      activeProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 1000));
    }

    log.info(`[Dev] Starting: ${command}`);
    broadcast('dev_start', { command, port });

    const proc = spawn(command, [], {
      cwd: WORKSPACE,
      shell: true,
      env: {
        ...process.env,
        PORT: port.toString(),
        VITE_PORT: port.toString(),
        FORCE_COLOR: '1'
      }
    });

    activeProcess = proc;
    previewPort = port;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      broadcast('stdout', { data: text });
      detectServerReady(text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      broadcast('stderr', { data: text });
      detectServerReady(text);
    });

    proc.on('close', (code) => {
      broadcast('dev_end', { code });
      if (activeProcess === proc) {
        activeProcess = null;
        previewPort = null;
      }
    });

    res.json({
      success: true,
      pid: proc.pid,
      port,
      previewUrl: `/preview/${sessionId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop running process
app.post('/stop', (req, res) => {
  if (activeProcess) {
    activeProcess.kill('SIGTERM');
    activeProcess = null;
    previewPort = null;
    broadcast('process_stopped', {});
    res.json({ success: true });
  } else {
    res.json({ success: true, message: 'No process running' });
  }
});

// Get build output (for deployment)
app.get('/output', async (req, res) => {
  try {
    // Find output directory
    let outputDir = null;
    for (const dir of ['dist', 'build', 'out', '.next/static', '.output/public']) {
      try {
        await fs.access(path.join(WORKSPACE, dir));
        outputDir = dir;
        break;
      } catch { }
    }

    if (!outputDir) {
      return res.status(404).json({ error: 'No build output found' });
    }

    const files = await listFilesRecursive(path.join(WORKSPACE, outputDir), outputDir);

    // Read all files
    const output = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(WORKSPACE, file.path), 'utf-8');
      output.push({ path: file.path.replace(outputDir + '/', ''), content });
    }

    res.json({ outputDir, files: output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// HELPERS
// =============================================================================

async function listFiles(dir, prefix = '') {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;

    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push({ name: entry.name, type: 'folder', path: fullPath });
      const subFiles = await listFiles(path.join(dir, entry.name), fullPath);
      files.push(...subFiles);
    } else {
      files.push({ name: entry.name, type: 'file', path: fullPath });
    }
  }

  return files;
}

async function listFilesRecursive(dir, prefix = '') {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const subFiles = await listFilesRecursive(path.join(dir, entry.name), fullPath);
      files.push(...subFiles);
    } else {
      files.push({ name: entry.name, path: fullPath });
    }
  }

  return files;
}

function detectServerReady(text) {
  // Common patterns for dev server ready
  const patterns = [
    /Local:\s*(https?:\/\/[^\s]+)/i,
    /running at\s*(https?:\/\/[^\s]+)/i,
    /server started at\s*(https?:\/\/[^\s]+)/i,
    /listening on\s*(https?:\/\/[^\s]+|port\s*\d+)/i,
    /ready in \d+/i,
    /VITE.*ready/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      broadcast('server_ready', { port: previewPort, text });
      return;
    }
  }
}

// =============================================================================
// START SERVER
// =============================================================================

server.listen(PORT, '0.0.0.0', () => {
  log.info(`🚀 Sandbox server running on port ${PORT}`);
  log.info(`📁 Workspace: ${WORKSPACE}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('Received SIGTERM, shutting down...');
  if (activeProcess) activeProcess.kill('SIGTERM');
  server.close(() => process.exit(0));
});
