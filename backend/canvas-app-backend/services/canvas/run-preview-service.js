/**
 * RUN PREVIEW SERVICE
 * Spawns per-user backend processes (Node/Python/Go/PHP) for live preview
 * of agent-built server-side apps inside the Canvas editor.
 *
 * Flow:
 *   1. Client POSTs files + language → startPreview()
 *   2. Service writes files to /tmp/canvas-preview/<sessionId>/
 *   3. Installs deps (npm install / pip install)
 *   4. Spawns the server process with PORT env var
 *   5. Proxies /api/canvas/preview/:sessionId/** → http://127.0.0.1:<port>/**
 *   6. Auto-kills after IDLE_TIMEOUT_MS of no proxy activity
 */

import { spawn } from 'child_process';
import { mkdir, writeFile, rm, readFile, access, constants } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import net from 'net';
import crypto from 'crypto';
import http from 'http';
import { WebSocketServer } from 'ws';

// ── Constants ──────────────────────────────────────────────────────────────
const RUN_BASE_DIR = path.join(tmpdir(), 'canvas-preview');
const PORT_RANGE = { start: 13000, end: 13999 };
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const MAX_SESSIONS_PER_USER = 3;
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB per file
const MAX_FILES = 50;

// ── Language → runtime config ──────────────────────────────────────────────
const LANG_CONFIG = {
    // Node.js group
    nodejs: { group: 'node', entries: ['server.js', 'index.js', 'app.js', 'main.js'] },
    express: { group: 'node', entries: ['server.js', 'index.js', 'app.js', 'main.js'] },
    fastify: { group: 'node', entries: ['server.js', 'index.js', 'app.js', 'main.js'] },
    typescript: { group: 'node', entries: ['server.ts', 'index.ts', 'app.ts', 'server.js'] },
    // Python group
    python: { group: 'python', entries: ['app.py', 'main.py', 'server.py', 'run.py'] },
    flask: { group: 'python', entries: ['app.py', 'main.py', 'server.py'] },
    fastapi: { group: 'python', entries: ['main.py', 'app.py'] },
    django: { group: 'python', entries: ['manage.py'] },
    // Go
    go: { group: 'go', entries: ['main.go'] },
    // PHP
    php: { group: 'php', entries: ['index.php', 'server.php', 'app.php'] },
    laravel: { group: 'laravel', entries: ['artisan'] },
    // Ruby
    ruby: { group: 'ruby', entries: ['app.rb', 'server.rb', 'config.ru'] },
    rails: { group: 'ruby', entries: ['config.ru'] },
};

// ── In-memory session store ────────────────────────────────────────────────
const sessions = new Map(); // sessionId → Session
const usedPorts = new Set();

// ── Port helpers ───────────────────────────────────────────────────────────
async function isPortFree(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => { server.close(); resolve(true); });
        server.listen(port, '127.0.0.1');
    });
}

async function allocatePort() {
    for (let port = PORT_RANGE.start; port <= PORT_RANGE.end; port++) {
        if (usedPorts.has(port)) continue;
        if (await isPortFree(port)) {
            usedPorts.add(port);
            return port;
        }
    }
    throw new Error('No preview ports available (try stopping a running preview)');
}

function releasePort(port) {
    usedPorts.delete(port);
}

// ── File helpers ───────────────────────────────────────────────────────────
async function fileExists(filePath) {
    try { await access(filePath, constants.F_OK); return true; } catch { return false; }
}

async function findEntryPoint(dir, candidates) {
    for (const name of candidates) {
        if (await fileExists(path.join(dir, name))) return name;
    }
    return null;
}

// ── Install helper ─────────────────────────────────────────────────────────
function runInstallSync(cmd, args, cwd, timeoutMs) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        const stderr = [];
        proc.stderr?.on('data', d => stderr.push(d.toString()));
        const timer = setTimeout(() => {
            proc.kill('SIGTERM');
            reject(new Error(`Install timed out (${cmd} ${args.join(' ')})`));
        }, timeoutMs);
        proc.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) resolve();
            else reject(new Error(`Install failed: ${stderr.join('').slice(0, 400)}`));
        });
        proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
}

// ── Idle timer ─────────────────────────────────────────────────────────────
function resetIdleTimer(session) {
    if (session.idleTimer) clearTimeout(session.idleTimer);
    session.idleTimer = setTimeout(() => {
        stopPreview(session.sessionId).catch(() => { });
    }, IDLE_TIMEOUT_MS);
}

// ── startPreview ───────────────────────────────────────────────────────────
/**
 * Start a preview server for the given files + language.
 * @param {object} opts
 * @param {Record<string, string>} opts.files  path → content
 * @param {string}  opts.language  one of LANG_CONFIG keys
 * @param {string}  opts.appId     canvas app ID (used to find existing session)
 * @param {string}  opts.userId    caller user ID
 * @returns {{ sessionId, port, status, previewUrl }}
 */
export async function startPreview({ files, language, appId, userId }) {
    const langConfig = LANG_CONFIG[language];
    if (!langConfig) {
        throw new Error(`Language "${language}" is not supported for server preview`);
    }

    if (!files || typeof files !== 'object') {
        throw new Error('files must be a non-null object mapping path → content');
    }

    const fileEntries = Object.entries(files);
    if (fileEntries.length > MAX_FILES) {
        throw new Error(`Too many files (max ${MAX_FILES})`);
    }

    // Evict oldest session if at per-user limit
    const userSessions = [...sessions.values()].filter(s => s.userId === userId);
    if (userSessions.length >= MAX_SESSIONS_PER_USER) {
        const oldest = userSessions.sort((a, b) => a.startTime - b.startTime)[0];
        await stopPreview(oldest.sessionId).catch(() => { });
    }

    const sessionId = crypto.randomUUID();
    const dir = path.join(RUN_BASE_DIR, sessionId);
    await mkdir(dir, { recursive: true });

    // Write files safely (prevent path traversal)
    for (const [rawPath, content] of fileEntries) {
        if (typeof content !== 'string') continue;
        if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE_BYTES) {
            console.warn(`[RunPreview] Skipping large file: ${rawPath}`);
            continue;
        }
        // Strip leading slashes and collapse ".."
        const safeName = rawPath.replace(/\.\./g, '').replace(/^\/+/, '');
        if (!safeName) continue;
        const fullPath = path.join(dir, safeName);
        // Defense in depth: ensure the resolved path stays inside the session dir
        if (!fullPath.startsWith(dir + path.sep) && fullPath !== dir) continue;
        await mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content, 'utf-8');
    }

    const port = await allocatePort();

    const wss = new WebSocketServer({ noServer: true });
    const wsClients = new Set();
    wss.on('connection', (ws) => {
        wsClients.add(ws);
        ws.on('close', () => wsClients.delete(ws));
    });

    const session = {
        sessionId, userId, appId, language, port, dir,
        process: null, logs: [], status: 'installing',
        startTime: Date.now(), lastActivity: Date.now(), idleTimer: null,
        exitCode: null, error: null,
        wss, wsClients,
    };
    sessions.set(sessionId, session);

    try {
        // ── Install dependencies ───────────────────────────────────────────────
        if (langConfig.group === 'node') {
            if (await fileExists(path.join(dir, 'package.json'))) {
                session.logs.push({ stream: 'system', text: '> npm install\n', ts: Date.now() });
                await runInstallSync('npm', ['install', '--prefer-offline', '--no-audit'], dir, 90000);
                session.logs.push({ stream: 'system', text: '> dependencies installed\n', ts: Date.now() });
            }
        } else if (langConfig.group === 'python') {
            if (await fileExists(path.join(dir, 'requirements.txt'))) {
                session.logs.push({ stream: 'system', text: '> pip install -r requirements.txt\n', ts: Date.now() });
                await runInstallSync('pip3', ['install', '--break-system-packages', '-r', 'requirements.txt', '-q'], dir, 90000);
                session.logs.push({ stream: 'system', text: '> dependencies installed\n', ts: Date.now() });
            } else {
                // Install minimal framework deps
                const deps = {
                    flask: ['flask', 'flask-cors'],
                    python: ['flask', 'flask-cors'],
                    fastapi: ['fastapi', 'uvicorn[standard]'],
                    django: ['django'],
                }[language] || [];
                if (deps.length) {
                    session.logs.push({ stream: 'system', text: `> pip install ${deps.join(' ')}\n`, ts: Date.now() });
                    await runInstallSync('pip3', ['install', '--break-system-packages', '-q', ...deps], dir, 90000);
                }
            }
        }

        session.status = 'starting';

        // ── Find entry point ───────────────────────────────────────────────────
        const entry = await findEntryPoint(dir, langConfig.entries);
        if (!entry) {
            throw new Error(`No entry point found. Expected one of: ${langConfig.entries.join(', ')}`);
        }

        // ── Build process command ──────────────────────────────────────────────
        const env = {
            ...process.env,
            PORT: String(port),
            // Python / Flask env hints
            FLASK_RUN_PORT: String(port),
            FLASK_RUN_HOST: '0.0.0.0',
            FLASK_APP: entry,
            // Force stdout flushing (Python)
            PYTHONUNBUFFERED: '1',
        };

        let cmd, args;

        if (langConfig.group === 'node') {
            let hasStartScript = false;
            try {
                const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf-8'));
                hasStartScript = !!pkg.scripts?.start;
            } catch { /* no package.json or invalid JSON */ }

            if (hasStartScript) {
                cmd = 'npm'; args = ['start'];
            } else if (entry.endsWith('.ts')) {
                cmd = 'npx'; args = ['ts-node', entry];
            } else {
                cmd = 'node'; args = [entry];
            }
        } else if (langConfig.group === 'python') {
            if (language === 'fastapi') {
                cmd = 'python3';
                args = ['-m', 'uvicorn', `${entry.replace('.py', '')}:app`,
                    '--host', '0.0.0.0', '--port', String(port)];
            } else if (language === 'django') {
                cmd = 'python3'; args = ['manage.py', 'runserver', `0.0.0.0:${port}`];
            } else {
                // Flask / generic Python — run directly; app should use os.environ PORT
                cmd = 'python3'; args = [entry];
            }
        } else if (langConfig.group === 'go') {
            cmd = 'go'; args = ['run', '.'];
        } else if (langConfig.group === 'php') {
            cmd = 'php'; args = ['-S', `0.0.0.0:${port}`, '-t', '.'];
        } else if (langConfig.group === 'laravel') {
            cmd = 'php'; args = ['artisan', 'serve', '--host=0.0.0.0', `--port=${port}`];
        } else if (langConfig.group === 'ruby') {
            if (language === 'rails') {
                cmd = 'bundle'; args = ['exec', 'rails', 'server', '-b', '0.0.0.0', '-p', String(port)];
            } else {
                cmd = 'ruby'; args = [entry];
            }
        }

        // ── Spawn ──────────────────────────────────────────────────────────────
        const proc = spawn(cmd, args, {
            cwd: dir,
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        session.process = proc;

        const onData = (stream) => (data) => {
            const text = data.toString();
            session.logs.push({ stream, text, ts: Date.now() });
            if (session.logs.length > 300) session.logs.shift();
            // Detect "server ready" patterns
            if (/listening|running on|started|ready|Application startup|Uvicorn running|Server is running|app running/i.test(text)) {
                session.status = 'running';
            }
        };

        proc.stdout.on('data', onData('stdout'));
        proc.stderr.on('data', onData('stderr'));

        proc.on('exit', (code) => {
            session.status = code === 0 ? 'stopped' : 'error';
            session.exitCode = code;
            releasePort(port);
            if (session.idleTimer) clearTimeout(session.idleTimer);
            // Keep session entry for 5 min so client can read final logs
            setTimeout(() => {
                sessions.delete(sessionId);
                rm(dir, { recursive: true, force: true }).catch(() => { });
            }, 5 * 60 * 1000);
        });

        proc.on('error', (err) => {
            session.status = 'error';
            session.error = err.message;
            session.logs.push({ stream: 'system', text: `Process error: ${err.message}\n`, ts: Date.now() });
            releasePort(port);
        });

        // ── Wait for port to be listening (up to 20 s) ──────────────────────
        await waitForPort(port, 20000);
        if (session.status !== 'stopped' && session.status !== 'error') {
            session.status = 'running';
        }

        resetIdleTimer(session);
        return { sessionId, port, status: session.status, previewUrl: `/api/canvas/preview/${sessionId}` };

    } catch (err) {
        // Clean up on failure
        sessions.delete(sessionId);
        releasePort(port);
        await rm(dir, { recursive: true, force: true }).catch(() => { });
        throw err;
    }
}

// ── stopPreview ────────────────────────────────────────────────────────────
export async function stopPreview(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;

    if (session.idleTimer) clearTimeout(session.idleTimer);

    if (session.process && !['stopped', 'error'].includes(session.status)) {
        session.process.kill('SIGTERM');
        setTimeout(() => {
            try { session.process.kill('SIGKILL'); } catch { /* already dead */ }
        }, 5000);
    }

    // Close all live-reload WebSocket clients
    if (session.wsClients) {
        for (const ws of session.wsClients) {
            try { ws.terminate(); } catch { /* ignore */ }
        }
    }
    if (session.wss) session.wss.close();

    releasePort(session.port);
    sessions.delete(sessionId);
    await rm(session.dir, { recursive: true, force: true }).catch(() => { });
}

// ── triggerReload — push reload signal to all connected live-reload clients ──
export function triggerReload(sessionId, type = 'reload') {
    const session = sessions.get(sessionId);
    if (!session?.wsClients) return;
    for (const ws of session.wsClients) {
        if (ws.readyState === ws.OPEN) ws.send(type);
    }
}

// ── getSessionWss — returns the per-session WebSocketServer for upgrade routing ──
export function getSessionWss(sessionId) {
    return sessions.get(sessionId)?.wss;
}

// ── rebuildPreview — write new files, restart process, trigger reload ──────
/**
 * Called by the orchestration loop after the agent produces new files.
 * Rewrites changed files, kills+restarts the server process, then sends
 * a 'reload' signal to all connected live-reload browser clients.
 *
 * @param {string} sessionId
 * @param {Record<string, string>} newFiles
 * @param {string} [language]
 */
export async function rebuildPreview(sessionId, newFiles, language) {
    const session = sessions.get(sessionId);
    if (!session) return;

    const dir = session.dir;
    const lang = language || session.language;
    const langConfig = LANG_CONFIG[lang];
    if (!langConfig) return;

    // Write new/updated files safely
    for (const [rawPath, content] of Object.entries(newFiles)) {
        if (typeof content !== 'string') continue;
        const safeName = rawPath.replace(/\.\./g, '').replace(/^\/+/, '');
        if (!safeName) continue;
        const fullPath = path.join(dir, safeName);
        if (!fullPath.startsWith(dir + path.sep) && fullPath !== dir) continue;
        await mkdir(path.dirname(fullPath), { recursive: true }).catch(() => { });
        await writeFile(fullPath, content, 'utf-8').catch(() => { });
    }

    // Kill existing process
    if (session.process && !['stopped', 'error'].includes(session.status)) {
        session.process.kill('SIGTERM');
        session.process = null;
    }

    session.status = 'starting';
    session.logs.push({ stream: 'system', text: '> Rebuilding…\n', ts: Date.now() });

    // Find entry point
    const entry = await findEntryPoint(dir, langConfig.entries);
    if (!entry) {
        session.status = 'error';
        session.error = `No entry point found. Expected: ${langConfig.entries.join(', ')}`;
        return;
    }

    const env = {
        ...process.env,
        PORT: String(session.port),
        FLASK_RUN_PORT: String(session.port),
        FLASK_RUN_HOST: '0.0.0.0',
        FLASK_APP: entry,
        PYTHONUNBUFFERED: '1',
    };

    let cmd, args;
    if (langConfig.group === 'node') {
        let hasStartScript = false;
        try {
            const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf-8'));
            hasStartScript = !!pkg.scripts?.start;
        } catch { /* ignore */ }
        if (hasStartScript) { cmd = 'npm'; args = ['start']; }
        else if (entry.endsWith('.ts')) { cmd = 'npx'; args = ['ts-node', entry]; }
        else { cmd = 'node'; args = [entry]; }
    } else if (langConfig.group === 'python') {
        if (lang === 'fastapi') { cmd = 'python3'; args = ['-m', 'uvicorn', `${entry.replace('.py', '')}:app`, '--host', '0.0.0.0', '--port', String(session.port)]; }
        else if (lang === 'django') { cmd = 'python3'; args = ['manage.py', 'runserver', `0.0.0.0:${session.port}`]; }
        else { cmd = 'python3'; args = [entry]; }
    } else if (langConfig.group === 'go') {
        cmd = 'go'; args = ['run', '.'];
    } else if (langConfig.group === 'php') {
        cmd = 'php'; args = ['-S', `0.0.0.0:${session.port}`, '-t', '.'];
    } else if (langConfig.group === 'laravel') {
        cmd = 'php'; args = ['artisan', 'serve', '--host=0.0.0.0', `--port=${session.port}`];
    } else if (langConfig.group === 'ruby') {
        if (lang === 'rails') { cmd = 'bundle'; args = ['exec', 'rails', 'server', '-b', '0.0.0.0', '-p', String(session.port)]; }
        else { cmd = 'ruby'; args = [entry]; }
    } else {
        cmd = 'node'; args = [entry];
    }

    const proc = spawn(cmd, args, { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
    session.process = proc;

    const onData = (stream) => (data) => {
        const text = data.toString();
        session.logs.push({ stream, text, ts: Date.now() });
        if (session.logs.length > 300) session.logs.shift();
        if (/listening|running on|started|ready|Application startup|Uvicorn running|Server is running|app running/i.test(text)) {
            session.status = 'running';
        }
    };
    proc.stdout.on('data', onData('stdout'));
    proc.stderr.on('data', onData('stderr'));
    proc.on('exit', (code) => {
        session.status = code === 0 ? 'stopped' : 'error';
        session.exitCode = code;
    });
    proc.on('error', (err) => {
        session.status = 'error';
        session.error = err.message;
    });

    // Wait for process to bind its port, then trigger browser reload
    waitForPort(session.port, 15000).then(() => {
        if (session.status !== 'stopped' && session.status !== 'error') {
            session.status = 'running';
        }
        setTimeout(() => triggerReload(sessionId, 'reload'), 200);
    }).catch(() => {
        setTimeout(() => triggerReload(sessionId, 'reload'), 1500);
    });

    resetIdleTimer(session);
}

// ── proxyRequest ───────────────────────────────────────────────────────────
/**
 * HTTP reverse-proxy: forward req → session's server → res.
 * Injects <base> tag into HTML responses so relative paths resolve correctly.
 */
export function proxyRequest(sessionId, req, res) {
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Preview session not found' });
    }
    if (session.status === 'installing' || session.status === 'starting') {
        // Still booting — return a loading page
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(buildLoadingPage(sessionId, session));
    }
    if (session.status !== 'running') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(503).send(buildErrorPage(session));
    }

    // Touch idle timer
    session.lastActivity = Date.now();
    resetIdleTimer(session);

    // req.url inside a router.use('/preview/:sessionId') is the remaining path
    const targetPath = req.url || '/';
    const basePrefix = `/api/canvas/preview/${sessionId}`;

    const proxyOpts = {
        hostname: '127.0.0.1',
        port: session.port,
        path: targetPath,
        method: req.method,
        headers: {
            ...req.headers,
            host: `127.0.0.1:${session.port}`,
        },
    };
    // Remove potentially conflicting headers
    delete proxyOpts.headers['content-length'];

    const proxyReq = http.request(proxyOpts, (proxyRes) => {
        const contentType = proxyRes.headers['content-type'] || '';
        const isHtml = /text\/html/i.test(contentType);

        // For HTML responses, buffer and inject <base> tag + live-reload client
        if (isHtml) {
            const liveReloadPath = `/api/canvas/preview/${sessionId}/__livereload__`;
            const liveReloadScript = `<script>(function(){try{var p=location.protocol==='https:'?'wss:':'ws:';var ws=new WebSocket(p+'//'+location.host+'${liveReloadPath}');ws.onmessage=function(m){if(m.data==='reload')location.reload();if(m.data==='refreshcss')document.querySelectorAll('link[rel=stylesheet]').forEach(function(l){l.href=l.href.split('?')[0]+'?v='+Date.now();});};ws.onclose=function(){setTimeout(function(){location.reload();},2000);};}catch(e){}}());</script>`;
            const chunks = [];
            proxyRes.on('data', (c) => chunks.push(c));
            proxyRes.on('end', () => {
                let html = Buffer.concat(chunks).toString('utf-8');
                const baseTag = `<base href="${basePrefix}/">`;
                if (!html.includes('<base')) {
                    if (html.includes('<head>')) {
                        html = html.replace('<head>', `<head>\n${baseTag}`);
                    } else if (html.includes('<head')) {
                        html = html.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`);
                    } else {
                        html = `${baseTag}\n${html}`;
                    }
                }
                // Inject live-reload client before </body> (or append at end)
                if (html.includes('</body>')) {
                    html = html.replace('</body>', `${liveReloadScript}</body>`);
                } else {
                    html += liveReloadScript;
                }
                const responseHeaders = { ...proxyRes.headers };
                delete responseHeaders['content-encoding']; // we decoded it
                responseHeaders['content-length'] = Buffer.byteLength(html, 'utf-8').toString();
                res.writeHead(proxyRes.statusCode, responseHeaders);
                res.end(html);
            });
        } else {
            // Pass through non-HTML responses as-is
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        }
    });

    proxyReq.on('error', (err) => {
        if (!res.headersSent) {
            res.status(502).json({ error: 'Could not connect to preview server', message: err.message });
        }
    });

    // Pipe request body for POST/PUT/PATCH
    if (!['GET', 'HEAD'].includes(req.method)) {
        req.pipe(proxyReq, { end: true });
    } else {
        proxyReq.end();
    }
}

// ── Accessors ──────────────────────────────────────────────────────────────
export function getSession(sessionId) {
    return sessions.get(sessionId);
}

export function getSessionIdByAppId(appId) {
    for (const [id, s] of sessions) if (s.appId === appId) return id;
    return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function waitForPort(port, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await isPortListening(port)) return;
        await new Promise(r => setTimeout(r, 500));
    }
    // Don't throw — server may print logs before listening; let caller decide
}

async function isPortListening(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(500);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('error', () => resolve(false));
        socket.once('timeout', () => resolve(false));
        socket.connect(port, '127.0.0.1');
    });
}

function buildLoadingPage(sessionId, session) {
    const logs = session.logs.map(l => escapeHtml(l.text)).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Starting server…</title>
<style>body{background:#0a0a13;color:#e5e7eb;font-family:monospace;margin:0;padding:24px}
pre{background:#111827;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-all;font-size:12px;max-height:60vh;overflow:auto}
h2{color:#f87171}.spinner{display:inline-block;width:14px;height:14px;border:2px solid #374151;border-top-color:#f87171;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}</style>
<script>setTimeout(()=>location.reload(),2000);</script>
</head><body>
<h2><span class="spinner"></span>Starting server…</h2>
<pre>${logs || '(waiting for output…)'}</pre>
</body></html>`;
}

function buildErrorPage(session) {
    const logs = session.logs.slice(-30).map(l => escapeHtml(l.text)).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Server stopped</title>
<style>body{background:#0a0a13;color:#e5e7eb;font-family:monospace;margin:0;padding:24px}
pre{background:#111827;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-all;font-size:12px;max-height:60vh;overflow:auto}
h2{color:#f87171}</style>
</head><body>
<h2>Server ${session.status} (exit ${session.exitCode ?? '?'})</h2>
<pre>${logs || '(no output)'}</pre>
</body></html>`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Graceful cleanup on process termination
process.on('SIGTERM', () => {
    for (const s of sessions.values()) {
        try { if (s.process) s.process.kill('SIGTERM'); } catch { /* ignore */ }
    }
});

// ── execScript — run a script and return stdout/stderr (no HTTP server) ───
/**
 * Execute a script non-interactively — returns stdout, stderr and exitCode.
 * Used for plain Python scripts, Node.js scripts, etc. that produce output
 * rather than serving HTTP.
 *
 * @param {{ files: Record<string,string>, language: string }} opts
 * @returns {{ stdout: string, stderr: string, exitCode: number|null, timedOut: boolean }}
 */
export async function execScript({ files, language }) {
    const EXEC_TIMEOUT_MS = 30_000; // 30 seconds max

    // Language → command mapping
    const EXEC_CONFIG = {
        python: { cmd: 'python3', args: (e) => [e], entries: ['main.py', 'app.py', 'script.py', 'run.py', 'index.py'], deps: 'pip' },
        nodejs: { cmd: 'node', args: (e) => [e], entries: ['index.js', 'main.js', 'app.js', 'script.js'], deps: 'npm' },
        typescript: { cmd: 'npx', args: (e) => ['ts-node', e], entries: ['index.ts', 'main.ts', 'app.ts', 'script.ts'], deps: 'npm' },
        r: { cmd: 'Rscript', args: (e) => [e], entries: ['main.R', 'script.R', 'analysis.R'], deps: null },
    };

    const cfg = EXEC_CONFIG[language?.toLowerCase?.()] || EXEC_CONFIG.python;

    const dir = path.join(tmpdir(), 'canvas-exec', crypto.randomUUID());
    await mkdir(dir, { recursive: true });

    try {
        // Write files safely
        const fileEntries = Object.entries(files || {});
        for (const [rawPath, content] of fileEntries) {
            if (typeof content !== 'string') continue;
            if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE_BYTES) continue;
            const safeName = rawPath.replace(/\.\./g, '').replace(/^\/+/, '');
            if (!safeName) continue;
            const fullPath = path.join(dir, safeName);
            if (!fullPath.startsWith(dir + path.sep) && fullPath !== dir) continue;
            await mkdir(path.dirname(fullPath), { recursive: true });
            await writeFile(fullPath, content, 'utf-8');
        }

        // Find entry point
        const entry = await findEntryPoint(dir, cfg.entries);
        if (!entry) {
            throw new Error(`No entry point found. Expected one of: ${cfg.entries.join(', ')}`);
        }

        // Install dependencies
        if (cfg.deps === 'pip') {
            const reqTxt = path.join(dir, 'requirements.txt');
            if (await fileExists(reqTxt)) {
                await runInstallSync('pip3', ['install', '--break-system-packages', '-q', '-r', 'requirements.txt'], dir, 60_000)
                    .catch(() => { /* best-effort */ });
            }
        } else if (cfg.deps === 'npm') {
            const pkgJson = path.join(dir, 'package.json');
            if (await fileExists(pkgJson)) {
                await runInstallSync('npm', ['install', '--prefer-offline', '--no-audit', '--silent'], dir, 60_000)
                    .catch(() => { /* best-effort */ });
            }
        }

        // Spawn and collect output
        return await new Promise((resolve) => {
            const env = { ...process.env, PYTHONUNBUFFERED: '1', NODE_ENV: 'development' };
            const proc = spawn(cfg.cmd, cfg.args(entry), { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
            const stdoutChunks = [], stderrChunks = [];
            let outLen = 0;
            const MAX_OUTPUT = 512 * 1024; // 512 KB cap

            proc.stdout.on('data', (d) => {
                if (outLen < MAX_OUTPUT) { stdoutChunks.push(d.toString()); outLen += d.length; }
            });
            proc.stderr.on('data', (d) => {
                if (outLen < MAX_OUTPUT) { stderrChunks.push(d.toString()); outLen += d.length; }
            });

            const timeout = setTimeout(() => {
                try { proc.kill('SIGTERM'); } catch { /* ignore */ }
                resolve({ stdout: stdoutChunks.join(''), stderr: stderrChunks.join(''), exitCode: null, timedOut: true });
            }, EXEC_TIMEOUT_MS);

            proc.on('close', (code) => {
                clearTimeout(timeout);
                resolve({ stdout: stdoutChunks.join(''), stderr: stderrChunks.join(''), exitCode: code, timedOut: false });
            });

            proc.on('error', (err) => {
                clearTimeout(timeout);
                resolve({ stdout: '', stderr: err.message, exitCode: -1, timedOut: false });
            });
        });
    } finally {
        rm(dir, { recursive: true, force: true }).catch(() => { });
    }
}

