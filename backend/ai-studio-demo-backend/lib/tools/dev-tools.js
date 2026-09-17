/**
 * DEVELOPER TOOLS (8 tools)
 * dev_filesystem, dev_search, dev_intelligence, dev_debug,
 * dev_test, dev_git, dev_npm, dev_docker
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const TIMEOUT = 30000;

// ── dev_filesystem ──────────────────────────────────────────────
async function devFilesystem(params) {
    const { action = 'tree', dir = '.', ...opts } = params;
    try {
        switch (action) {
            case 'tree': {
                const maxDepth = opts.depth || 4;
                const result = buildTree(dir, maxDepth, 0, opts.ignore || ['node_modules', '.git', 'dist', '.next']);
                return { success: true, tree: result, root: path.resolve(dir) };
            }
            case 'stats': {
                const stat = fs.statSync(dir);
                return {
                    success: true,
                    path: path.resolve(dir),
                    size: stat.size,
                    isFile: stat.isFile(),
                    isDir: stat.isDirectory(),
                    created: stat.birthtime,
                    modified: stat.mtime,
                    permissions: `0${(stat.mode & 0o777).toString(8)}`,
                };
            }
            case 'diff': {
                const { file1, file2 } = opts;
                if (!file1 || !file2) return { success: false, error: 'file1 and file2 required' };
                const a = fs.readFileSync(file1, 'utf-8').split('\n');
                const b = fs.readFileSync(file2, 'utf-8').split('\n');
                const changes = simpleDiff(a, b);
                return { success: true, changes, file1, file2 };
            }
            case 'duplicates': {
                const files = collectFiles(dir, opts.extensions || ['.js', '.ts', '.jsx', '.tsx']);
                const hashes = {};
                const crypto = await import('crypto');
                for (const f of files) {
                    const content = fs.readFileSync(f);
                    const hash = crypto.createHash('md5').update(content).digest('hex');
                    if (!hashes[hash]) hashes[hash] = [];
                    hashes[hash].push(f);
                }
                const duplicates = Object.values(hashes).filter(g => g.length > 1);
                return { success: true, duplicates, totalChecked: files.length };
            }
            case 'disk_usage': {
                const files = collectFiles(dir);
                let total = 0;
                const byExt = {};
                for (const f of files) {
                    const sz = fs.statSync(f).size;
                    total += sz;
                    const ext = path.extname(f) || '(no ext)';
                    byExt[ext] = (byExt[ext] || 0) + sz;
                }
                return {
                    success: true,
                    totalBytes: total,
                    totalHuman: humanSize(total),
                    byExtension: Object.entries(byExt).sort((a, b) => b[1] - a[1]).map(([ext, sz]) => ({ ext, bytes: sz, human: humanSize(sz) })),
                };
            }
            default:
                return { success: false, error: `Unknown dev_filesystem action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── dev_search ──────────────────────────────────────────────────
async function devSearch(params) {
    const { action = 'grep', dir = '.', ...opts } = params;
    try {
        switch (action) {
            case 'grep': {
                const { pattern, extensions, maxResults = 50, caseSensitive = false } = opts;
                if (!pattern) return { success: false, error: 'pattern is required' };
                const files = collectFiles(dir, extensions);
                const results = [];
                const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
                for (const f of files) {
                    if (results.length >= maxResults) break;
                    try {
                        const content = fs.readFileSync(f, 'utf-8');
                        const lines = content.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            if (regex.test(lines[i])) {
                                results.push({ file: f, line: i + 1, text: lines[i].trim().slice(0, 200) });
                                if (results.length >= maxResults) break;
                            }
                            regex.lastIndex = 0;
                        }
                    } catch { /* skip binary */ }
                }
                return { success: true, pattern, results, total: results.length };
            }
            case 'find': {
                const { name, extensions, maxResults = 100 } = opts;
                const files = collectFiles(dir, extensions);
                const regex = name ? new RegExp(name, 'i') : null;
                const matches = regex ? files.filter(f => regex.test(path.basename(f))) : files;
                return { success: true, matches: matches.slice(0, maxResults), total: matches.length };
            }
            case 'find_replace': {
                const { pattern, replacement, extensions, dryRun = true } = opts;
                if (!pattern || replacement === undefined) return { success: false, error: 'pattern and replacement required' };
                const files = collectFiles(dir, extensions);
                const regex = new RegExp(pattern, 'g');
                const changes = [];
                for (const f of files) {
                    try {
                        const content = fs.readFileSync(f, 'utf-8');
                        const matches = content.match(regex);
                        if (matches && matches.length > 0) {
                            changes.push({ file: f, count: matches.length });
                            if (!dryRun) {
                                fs.writeFileSync(f, content.replace(regex, replacement));
                            }
                        }
                    } catch { /* skip binary */ }
                }
                return { success: true, dryRun, changes, totalFiles: changes.length, totalReplacements: changes.reduce((s, c) => s + c.count, 0) };
            }
            default:
                return { success: false, error: `Unknown dev_search action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── dev_intelligence ────────────────────────────────────────────
async function devIntelligence(params) {
    const { action = 'symbols', file, dir = '.', ...opts } = params;
    try {
        switch (action) {
            case 'symbols': {
                if (!file) return { success: false, error: 'file is required' };
                const content = fs.readFileSync(file, 'utf-8');
                const symbols = extractSymbols(content, path.extname(file));
                return { success: true, file, symbols };
            }
            case 'imports': {
                if (!file) return { success: false, error: 'file is required' };
                const content = fs.readFileSync(file, 'utf-8');
                const imports = extractImports(content);
                return { success: true, file, imports };
            }
            case 'exports': {
                if (!file) return { success: false, error: 'file is required' };
                const content = fs.readFileSync(file, 'utf-8');
                const exports = extractExports(content);
                return { success: true, file, exports };
            }
            case 'language': {
                if (!file) return { success: false, error: 'file is required' };
                const ext = path.extname(file).toLowerCase();
                const langMap = {
                    '.js': 'javascript', '.jsx': 'javascript (JSX)', '.ts': 'typescript', '.tsx': 'typescript (TSX)',
                    '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.java': 'java',
                    '.c': 'c', '.cpp': 'c++', '.h': 'c/c++ header', '.cs': 'c#', '.swift': 'swift',
                    '.kt': 'kotlin', '.php': 'php', '.sh': 'bash', '.sql': 'sql', '.html': 'html',
                    '.css': 'css', '.scss': 'scss', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
                    '.md': 'markdown', '.xml': 'xml', '.toml': 'toml', '.ini': 'ini',
                };
                return { success: true, file, language: langMap[ext] || 'unknown', extension: ext };
            }
            case 'framework': {
                const files = collectFiles(dir, ['.json', '.js', '.ts']);
                const frameworks = [];
                try {
                    const pkgPath = path.join(dir, 'package.json');
                    if (fs.existsSync(pkgPath)) {
                        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
                        if (deps.next) frameworks.push('Next.js');
                        if (deps.react) frameworks.push('React');
                        if (deps.vue) frameworks.push('Vue');
                        if (deps.angular || deps['@angular/core']) frameworks.push('Angular');
                        if (deps.express) frameworks.push('Express');
                        if (deps.fastify) frameworks.push('Fastify');
                        if (deps.prisma || deps['@prisma/client']) frameworks.push('Prisma');
                        if (deps.tailwindcss) frameworks.push('Tailwind CSS');
                        if (deps.typescript) frameworks.push('TypeScript');
                    }
                } catch { /* */ }
                if (fs.existsSync(path.join(dir, 'requirements.txt'))) frameworks.push('Python');
                if (fs.existsSync(path.join(dir, 'Cargo.toml'))) frameworks.push('Rust');
                if (fs.existsSync(path.join(dir, 'go.mod'))) frameworks.push('Go');
                return { success: true, frameworks };
            }
            default:
                return { success: false, error: `Unknown dev_intelligence action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── dev_debug ───────────────────────────────────────────────────
async function devDebug(params) {
    const { action = 'error_parse', ...opts } = params;
    try {
        switch (action) {
            case 'error_parse': {
                const { error: errorText } = opts;
                if (!errorText) return { success: false, error: 'error text is required' };
                const parsed = parseErrorMessage(errorText);
                return { success: true, ...parsed };
            }
            case 'stack_trace': {
                const { trace } = opts;
                if (!trace) return { success: false, error: 'trace text is required' };
                const frames = parseStackTrace(trace);
                return { success: true, frames, count: frames.length };
            }
            case 'todos': {
                const { dir = '.', extensions } = opts;
                const files = collectFiles(dir, extensions || ['.js', '.ts', '.jsx', '.tsx', '.py']);
                const todos = [];
                for (const f of files) {
                    try {
                        const content = fs.readFileSync(f, 'utf-8');
                        const lines = content.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            const match = lines[i].match(/(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]+(.+)/i);
                            if (match) {
                                todos.push({ file: f, line: i + 1, type: match[1].toUpperCase(), text: match[2].trim() });
                            }
                        }
                    } catch { /* skip binary */ }
                }
                return { success: true, todos, total: todos.length };
            }
            case 'dead_code': {
                const { dir = '.', extensions } = opts;
                const files = collectFiles(dir, extensions || ['.js', '.ts']);
                // Find exported functions that are never imported anywhere
                const allExports = [];
                const allImportRefs = new Set();
                for (const f of files) {
                    try {
                        const content = fs.readFileSync(f, 'utf-8');
                        for (const exp of extractExports(content)) allExports.push({ ...exp, file: f });
                        for (const imp of extractImports(content)) {
                            if (imp.specifiers) imp.specifiers.forEach(s => allImportRefs.add(s));
                        }
                    } catch { /* skip */ }
                }
                const dead = allExports.filter(e => e.name && !allImportRefs.has(e.name) && e.name !== 'default');
                return { success: true, deadExports: dead.slice(0, 100), total: dead.length };
            }
            default:
                return { success: false, error: `Unknown dev_debug action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── dev_test ────────────────────────────────────────────────────
async function devTest(params) {
    const { action = 'run', ...opts } = params;
    try {
        switch (action) {
            case 'run': {
                const { framework = 'auto', testFile, filter } = opts;
                let cmd;
                if (framework === 'jest' || (framework === 'auto' && fs.existsSync('jest.config.js'))) {
                    cmd = `npx jest ${testFile || ''} ${filter ? `--testNamePattern="${filter}"` : ''} --json --no-coverage 2>&1`;
                } else if (framework === 'vitest' || (framework === 'auto' && fs.existsSync('vitest.config.ts'))) {
                    cmd = `npx vitest run ${testFile || ''} --reporter=json 2>&1`;
                } else {
                    cmd = `npx jest ${testFile || ''} --json --no-coverage 2>&1`;
                }
                const { stdout } = await execAsync(cmd, { timeout: TIMEOUT, cwd: opts.dir || '.' });
                try {
                    const result = JSON.parse(stdout);
                    return { success: true, ...result };
                } catch {
                    return { success: true, output: stdout.slice(0, 5000) };
                }
            }
            case 'coverage': {
                const { stdout } = await execAsync('npx jest --coverage --json 2>&1', { timeout: 60000, cwd: opts.dir || '.' });
                try {
                    return { success: true, ...JSON.parse(stdout) };
                } catch {
                    return { success: true, output: stdout.slice(0, 5000) };
                }
            }
            default:
                return { success: false, error: `Unknown dev_test action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message, output: err.stdout?.slice(0, 5000) || '' };
    }
}

// ── dev_git ─────────────────────────────────────────────────────
async function devGit(params) {
    const { action = 'status', dir = '.', ...opts } = params;
    const run = (cmd) => execAsync(cmd, { timeout: TIMEOUT, cwd: dir }).then(r => r.stdout.trim());
    try {
        switch (action) {
            case 'status': return { success: true, status: await run('git status --porcelain') };
            case 'log': {
                const n = opts.count || 10;
                const log = await run(`git log --oneline -${n}`);
                return { success: true, commits: log.split('\n').map(l => { const [hash, ...msg] = l.split(' '); return { hash, message: msg.join(' ') }; }) };
            }
            case 'diff': return { success: true, diff: (await run(`git diff ${opts.ref || 'HEAD'}`)).slice(0, 10000) };
            case 'branch': return { success: true, branches: (await run('git branch -a')).split('\n').map(b => b.trim()) };
            case 'blame': {
                if (!opts.file) return { success: false, error: 'file required' };
                return { success: true, blame: (await run(`git blame --line-porcelain ${opts.file}`)).slice(0, 10000) };
            }
            case 'commit': {
                if (!opts.message) return { success: false, error: 'message required' };
                if (opts.addAll) await run('git add -A');
                return { success: true, result: await run(`git commit -m "${opts.message.replace(/"/g, '\\"')}"`) };
            }
            case 'clone': {
                if (!opts.url) return { success: false, error: 'url required' };
                return { success: true, result: await run(`git clone ${opts.url} ${opts.target || ''}`) };
            }
            case 'history': {
                if (!opts.file) return { success: false, error: 'file required' };
                const log = await run(`git log --oneline -${opts.count || 20} -- ${opts.file}`);
                return { success: true, history: log.split('\n').filter(Boolean) };
            }
            default:
                return { success: false, error: `Unknown dev_git action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── dev_npm ─────────────────────────────────────────────────────
async function devNpm(params) {
    const { action = 'list', dir = '.', ...opts } = params;
    const run = (cmd) => execAsync(cmd, { timeout: 60000, cwd: dir }).then(r => r.stdout.trim());
    try {
        switch (action) {
            case 'list': return { success: true, packages: await run('npm list --depth=0 --json 2>/dev/null') };
            case 'install': {
                if (!opts.packages) return { success: false, error: 'packages required' };
                const pkgs = Array.isArray(opts.packages) ? opts.packages.join(' ') : opts.packages;
                return { success: true, result: await run(`npm install ${pkgs} ${opts.dev ? '--save-dev' : ''}`) };
            }
            case 'update': return { success: true, result: await run('npm update') };
            case 'audit': return { success: true, audit: await run('npm audit --json 2>/dev/null || true') };
            case 'outdated': return { success: true, outdated: await run('npm outdated --json 2>/dev/null || true') };
            case 'run': {
                if (!opts.script) return { success: false, error: 'script name required' };
                return { success: true, output: (await run(`npm run ${opts.script} 2>&1`)).slice(0, 5000) };
            }
            default:
                return { success: false, error: `Unknown dev_npm action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── dev_docker ──────────────────────────────────────────────────
async function devDocker(params) {
    const { action = 'ps', dir = '.', ...opts } = params;
    const run = (cmd) => execAsync(cmd, { timeout: TIMEOUT, cwd: dir }).then(r => r.stdout.trim());
    try {
        switch (action) {
            case 'ps': return { success: true, containers: await run('docker ps --format json 2>/dev/null || echo "Docker not available"') };
            case 'images': return { success: true, images: await run('docker images --format json 2>/dev/null || echo "Docker not available"') };
            case 'build': {
                const tag = opts.tag || 'app:latest';
                return { success: true, output: (await run(`docker build -t ${tag} ${opts.context || '.'} 2>&1`)).slice(0, 5000) };
            }
            case 'run': {
                if (!opts.image) return { success: false, error: 'image required' };
                const ports = opts.ports ? `-p ${opts.ports}` : '';
                const env = opts.env ? Object.entries(opts.env).map(([k, v]) => `-e ${k}=${v}`).join(' ') : '';
                return { success: true, output: await run(`docker run -d ${ports} ${env} ${opts.image}`) };
            }
            case 'compose': {
                const file = opts.file ? `-f ${opts.file}` : '';
                const subcmd = opts.command || 'up -d';
                return { success: true, output: (await run(`docker compose ${file} ${subcmd} 2>&1`)).slice(0, 5000) };
            }
            case 'logs': {
                if (!opts.container) return { success: false, error: 'container required' };
                return { success: true, logs: (await run(`docker logs --tail ${opts.lines || 100} ${opts.container}`)).slice(0, 5000) };
            }
            case 'health': {
                if (!opts.container) return { success: false, error: 'container required' };
                return { success: true, health: await run(`docker inspect --format='{{.State.Health.Status}}' ${opts.container} 2>/dev/null || echo "no healthcheck"`) };
            }
            default:
                return { success: false, error: `Unknown dev_docker action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function buildTree(dir, maxDepth, depth, ignore) {
    if (depth >= maxDepth) return { name: path.basename(dir), type: 'dir', children: ['...'] };
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter(e => !ignore.includes(e.name));
    return {
        name: path.basename(dir),
        type: 'dir',
        children: entries.slice(0, 100).map(e => {
            if (e.isDirectory()) return buildTree(path.join(dir, e.name), maxDepth, depth + 1, ignore);
            return { name: e.name, type: 'file', size: fs.statSync(path.join(dir, e.name)).size };
        }),
    };
}

function collectFiles(dir, extensions, result = []) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (['node_modules', '.git', 'dist', '.next', '__pycache__'].includes(e.name)) continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) collectFiles(full, extensions, result);
            else if (!extensions || extensions.length === 0 || extensions.includes(path.extname(e.name))) result.push(full);
        }
    } catch { /* access denied */ }
    return result;
}

function simpleDiff(a, b) {
    const changes = [];
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
        if (a[i] !== b[i]) {
            changes.push({ line: i + 1, old: a[i] || '(empty)', new: b[i] || '(empty)' });
        }
    }
    return changes;
}

function humanSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${bytes.toFixed(1)} ${units[i]}`;
}

function extractSymbols(content, ext) {
    const symbols = { functions: [], classes: [], variables: [], types: [] };
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Functions
        const fnMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
        if (fnMatch) symbols.functions.push({ name: fnMatch[1], line: i + 1 });
        // Arrow functions
        const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/);
        if (arrowMatch) symbols.functions.push({ name: arrowMatch[1], line: i + 1 });
        // Classes
        const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
        if (classMatch) symbols.classes.push({ name: classMatch[1], line: i + 1 });
        // TypeScript types/interfaces
        const typeMatch = line.match(/(?:export\s+)?(?:type|interface)\s+(\w+)/);
        if (typeMatch) symbols.types.push({ name: typeMatch[1], line: i + 1 });
    }
    return symbols;
}

function extractImports(content) {
    const imports = [];
    const lines = content.split('\n');
    for (const line of lines) {
        const match = line.match(/import\s+(?:({[^}]+})|(\w+)|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/);
        if (match) {
            const specifiers = match[1] ? match[1].replace(/[{}]/g, '').split(',').map(s => s.trim().split(/\s+as\s+/).pop()) : match[2] ? [match[2]] : match[3] ? [match[3]] : [];
            imports.push({ source: match[4], specifiers });
        }
        const reqMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/);
        if (reqMatch) imports.push({ source: reqMatch[2], specifiers: [reqMatch[1]] });
    }
    return imports;
}

function extractExports(content) {
    const exports = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const namedMatch = line.match(/export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/);
        if (namedMatch) exports.push({ name: namedMatch[1], line: i + 1, type: 'named' });
        if (line.match(/export\s+default/)) exports.push({ name: 'default', line: i + 1, type: 'default' });
    }
    return exports;
}

function parseErrorMessage(text) {
    const type = text.match(/^(\w*Error|TypeError|ReferenceError|SyntaxError|RangeError)/)?.[1] || 'Error';
    const message = text.split('\n')[0];
    const fileMatch = text.match(/at\s+.+?\((.+?):(\d+):(\d+)\)/);
    return {
        type,
        message,
        file: fileMatch?.[1] || null,
        line: fileMatch ? parseInt(fileMatch[2]) : null,
        column: fileMatch ? parseInt(fileMatch[3]) : null,
    };
}

function parseStackTrace(trace) {
    const frames = [];
    const lines = trace.split('\n');
    for (const line of lines) {
        const match = line.match(/at\s+(?:(\S+)\s+)?\((.+?):(\d+):(\d+)\)/);
        if (match) frames.push({ function: match[1] || '(anonymous)', file: match[2], line: parseInt(match[3]), column: parseInt(match[4]) });
    }
    return frames;
}

export default {
    devFilesystem,
    devSearch,
    devIntelligence,
    devDebug,
    devTest,
    devGit,
    devNpm,
    devDocker,
};
