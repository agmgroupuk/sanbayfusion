/**
 * MAULA AI — SANDBOX SERVER
 * Runs inside each ECS Fargate container
 * 
 * Provides:
 * - /__health        — Health check endpoint
 * - /__internal/exec — Execute shell commands
 * - /__internal/files — Write files to workspace
 * - /__internal/status — Container status
 * - /*               — Proxy to user's running app (port 3001+)
 */

const http = require('http');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);
const WORKSPACE = '/workspace';
const PORT = 3000;
const SANDBOX_ID = process.env.SANDBOX_ID || 'unknown';
const PROJECT_ID = process.env.PROJECT_ID || 'unknown';
const TEMPLATE = process.env.TEMPLATE || 'node-20';

let userAppPort = null;       // Port the user's app is running on
let userAppProcess = null;    // Spawn reference
let bootedAt = Date.now();
let lastActivity = Date.now();

// ── Helpers ────────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── Internal API Routes ────────────────────────────────────────────

async function handleHealth(req, res) {
  respond(res, 200, {
    status: 'healthy',
    sandboxId: SANDBOX_ID,
    projectId: PROJECT_ID,
    template: TEMPLATE,
    uptime: Math.round((Date.now() - bootedAt) / 1000),
    lastActivity: new Date(lastActivity).toISOString(),
    userAppRunning: !!userAppProcess,
    userAppPort,
  });
}

async function handleExec(req, res) {
  try {
    const { command } = await parseBody(req);
    if (!command) {
      return respond(res, 400, { error: 'command is required' });
    }

    lastActivity = Date.now();

    // Block dangerous commands
    const blocked = ['rm -rf /', 'mkfs', 'dd if=', ':(){', 'fork bomb'];
    if (blocked.some((b) => command.includes(b))) {
      return respond(res, 403, { error: 'Command blocked for safety' });
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: WORKSPACE,
      timeout: 30000,
      maxBuffer: 1024 * 1024, // 1MB
      env: { ...process.env, HOME: '/home/sandbox' },
    });

    respond(res, 200, {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    });
  } catch (error) {
    respond(res, 200, {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code || 1,
    });
  }
}

async function handleFiles(req, res) {
  try {
    const { files } = await parseBody(req);
    if (!files || !Array.isArray(files)) {
      return respond(res, 400, { error: 'files array is required' });
    }

    lastActivity = Date.now();
    let written = 0;

    for (const file of files) {
      const filePath = path.join(WORKSPACE, file.path);
      const dir = path.dirname(filePath);

      // Ensure directory exists
      await fs.promises.mkdir(dir, { recursive: true });

      // Write file
      await fs.promises.writeFile(filePath, file.content || '', 'utf-8');
      written++;
    }

    respond(res, 200, { success: true, filesWritten: written });
  } catch (error) {
    respond(res, 500, { error: `File sync failed: ${error.message}` });
  }
}

async function handleStatus(req, res) {
  const memUsage = process.memoryUsage();
  
  // Get workspace size
  let workspaceSize = '0';
  try {
    const { stdout } = await execAsync('du -sh /workspace 2>/dev/null || echo "0"');
    workspaceSize = stdout.split('\t')[0] || '0';
  } catch {}

  respond(res, 200, {
    sandboxId: SANDBOX_ID,
    projectId: PROJECT_ID,
    template: TEMPLATE,
    status: 'running',
    uptime: Math.round((Date.now() - bootedAt) / 1000),
    lastActivity: new Date(lastActivity).toISOString(),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    },
    workspaceSize,
    userApp: {
      running: !!userAppProcess,
      port: userAppPort,
      pid: userAppProcess?.pid || null,
    },
  });
}

async function handleStartApp(req, res) {
  try {
    const { command, port = 3001 } = await parseBody(req);
    
    // Kill existing app if running
    if (userAppProcess) {
      userAppProcess.kill('SIGTERM');
      userAppProcess = null;
      userAppPort = null;
    }

    const startCmd = command || 'npm start';
    userAppPort = port;
    lastActivity = Date.now();

    userAppProcess = spawn('sh', ['-c', startCmd], {
      cwd: WORKSPACE,
      env: { ...process.env, PORT: String(port), HOME: '/home/sandbox' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let startOutput = '';
    userAppProcess.stdout.on('data', (d) => (startOutput += d.toString()));
    userAppProcess.stderr.on('data', (d) => (startOutput += d.toString()));

    userAppProcess.on('exit', (code) => {
      console.log(`[Sandbox] User app exited with code ${code}`);
      userAppProcess = null;
      userAppPort = null;
    });

    // Wait a bit for the app to start
    await new Promise((r) => setTimeout(r, 3000));

    respond(res, 200, {
      success: true,
      port: userAppPort,
      pid: userAppProcess?.pid,
      output: startOutput.slice(-500),
    });
  } catch (error) {
    respond(res, 500, { error: `Failed to start app: ${error.message}` });
  }
}

async function handleStopApp(req, res) {
  if (userAppProcess) {
    userAppProcess.kill('SIGTERM');
    userAppProcess = null;
    userAppPort = null;
    respond(res, 200, { success: true, message: 'App stopped' });
  } else {
    respond(res, 200, { success: true, message: 'No app was running' });
  }
}

// ── Proxy to user app ──────────────────────────────────────────────

function proxyToUserApp(req, res) {
  if (!userAppPort) {
    respond(res, 503, {
      error: 'No application is running. Use /__internal/start-app to start one.',
    });
    return;
  }

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: userAppPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', () => {
    respond(res, 502, { error: 'Could not connect to user application' });
  });

  req.pipe(proxyReq);
}

// ── HTTP Server ────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = req.url.split('?')[0];

  try {
    // Internal API routes
    if (url === '/__health') return handleHealth(req, res);
    if (url === '/__internal/exec' && req.method === 'POST') return handleExec(req, res);
    if (url === '/__internal/files' && req.method === 'POST') return handleFiles(req, res);
    if (url === '/__internal/status') return handleStatus(req, res);
    if (url === '/__internal/start-app' && req.method === 'POST') return handleStartApp(req, res);
    if (url === '/__internal/stop-app' && req.method === 'POST') return handleStopApp(req, res);

    // Everything else proxies to user's app
    proxyToUserApp(req, res);
  } catch (error) {
    respond(res, 500, { error: error.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Sandbox] Server running on port ${PORT}`);
  console.log(`[Sandbox] ID: ${SANDBOX_ID}`);
  console.log(`[Sandbox] Template: ${TEMPLATE}`);
  console.log(`[Sandbox] Workspace: ${WORKSPACE}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Sandbox] SIGTERM received, shutting down...');
  if (userAppProcess) userAppProcess.kill('SIGTERM');
  server.close(() => process.exit(0));
});
