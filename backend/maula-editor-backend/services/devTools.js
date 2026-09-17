/**
 * ============================================================================
 * DEVELOPER TOOLS V2
 * ============================================================================
 * dev_filesystem, dev_search, dev_intelligence, dev_debug,
 * dev_test, dev_git, dev_npm, dev_docker
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const DEV_TOOL_DEFINITIONS = [
    {
        name: 'dev_filesystem',
        description: 'Project filesystem operations: tree view, file stats, diff files, find duplicates, disk usage analysis.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['tree', 'stats', 'diff', 'duplicates', 'disk_usage', 'recent', 'largest'],
                    description: 'Action to perform',
                },
                path: { type: 'string', description: 'Target path (file or directory)' },
                path2: { type: 'string', description: '[diff] Second file path for comparison' },
                depth: { type: 'number', description: '[tree] Max depth. Default: 3' },
                pattern: { type: 'string', description: '[tree/recent/largest] Glob pattern filter. E.g. "*.ts"' },
                limit: { type: 'number', description: '[recent/largest/duplicates] Max results. Default: 20' },
                ignoreNodeModules: { type: 'boolean', description: 'Skip node_modules. Default: true' },
            },
            required: ['action', 'path'],
        },
    },
    {
        name: 'dev_search',
        description: 'Code search: grep with context, find by name/content/regex, bulk find-and-replace across files.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['grep', 'find_by_name', 'find_by_content', 'find_replace', 'count_lines', 'find_todos'],
                    description: 'Search action',
                },
                path: { type: 'string', description: 'Directory to search in' },
                pattern: { type: 'string', description: 'Search pattern (regex for grep, glob for find_by_name)' },
                replacement: { type: 'string', description: '[find_replace] Replacement text' },
                context: { type: 'number', description: '[grep] Lines of context around matches. Default: 2' },
                caseSensitive: { type: 'boolean', description: 'Case sensitive search. Default: false' },
                filePattern: { type: 'string', description: 'Filter by file extension. E.g. "*.ts", "*.js"' },
                maxResults: { type: 'number', description: 'Max results. Default: 50' },
                dryRun: { type: 'boolean', description: '[find_replace] Preview without changing. Default: true' },
            },
            required: ['action', 'path', 'pattern'],
        },
    },
    {
        name: 'dev_intelligence',
        description: 'Code intelligence: extract symbols/functions/classes, find references, detect language/framework, analyze imports/exports.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['symbols', 'references', 'definitions', 'detect_language', 'imports', 'exports', 'detect_framework', 'dependencies'],
                    description: 'Intelligence action',
                },
                path: { type: 'string', description: 'File or directory path' },
                symbol: { type: 'string', description: '[references/definitions] Symbol name to search for' },
                language: { type: 'string', description: 'Force language (auto-detected if omitted)' },
            },
            required: ['action', 'path'],
        },
    },
    {
        name: 'dev_debug',
        description: 'Debug assistance: parse error messages, analyze stack traces, lint code, audit dependencies, find dead code, extract TODOs/FIXMEs.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['parse_error', 'stack_trace', 'lint', 'dependency_audit', 'dead_code', 'todos', 'env_check'],
                    description: 'Debug action',
                },
                path: { type: 'string', description: 'File or directory path' },
                error: { type: 'string', description: '[parse_error/stack_trace] Error message or stack trace text' },
                fix: { type: 'boolean', description: '[lint] Auto-fix issues. Default: false' },
            },
            required: ['action'],
        },
    },
    {
        name: 'dev_test',
        description: 'Testing: run tests, generate mocks, check coverage, produce reports. Supports Jest, Vitest, Pytest.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['run', 'run_file', 'coverage', 'list', 'watch', 'generate_mock'],
                    description: 'Test action',
                },
                path: { type: 'string', description: 'Test file or directory' },
                testName: { type: 'string', description: '[run] Specific test name/pattern to run' },
                framework: { type: 'string', enum: ['jest', 'vitest', 'pytest', 'mocha', 'auto'], description: 'Test framework. Default: auto' },
                timeout: { type: 'number', description: 'Timeout in seconds. Default: 30' },
            },
            required: ['action', 'path'],
        },
    },
    {
        name: 'dev_git',
        description: 'Git operations: clone, commit, push, pull, branch, merge, log, blame, diff, stash, PR creation.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['status', 'log', 'diff', 'blame', 'commit', 'push', 'pull', 'branch', 'checkout', 'merge', 'stash', 'clone', 'init', 'remote', 'tag', 'reset', 'cherry_pick'],
                    description: 'Git action',
                },
                path: { type: 'string', description: 'Repository path. Default: current directory' },
                message: { type: 'string', description: '[commit] Commit message' },
                branch: { type: 'string', description: '[branch/checkout/merge] Branch name' },
                files: { type: 'array', items: { type: 'string' }, description: '[commit] Files to stage (or "." for all)' },
                url: { type: 'string', description: '[clone/remote] Repository URL' },
                limit: { type: 'number', description: '[log] Number of commits. Default: 10' },
                file: { type: 'string', description: '[blame/log] Specific file' },
                tag: { type: 'string', description: '[tag] Tag name' },
                ref: { type: 'string', description: '[reset/cherry_pick] Commit ref' },
            },
            required: ['action'],
        },
    },
    {
        name: 'dev_npm',
        description: 'NPM/package management: install, update, audit, run scripts, check outdated, version, publish.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['install', 'uninstall', 'update', 'audit', 'outdated', 'list', 'run_script', 'init', 'version', 'search', 'info'],
                    description: 'NPM action',
                },
                path: { type: 'string', description: 'Project directory. Default: current' },
                packages: { type: 'array', items: { type: 'string' }, description: '[install/uninstall/update/info] Package names' },
                dev: { type: 'boolean', description: '[install] Install as devDependency. Default: false' },
                script: { type: 'string', description: '[run_script] Script name from package.json' },
                fix: { type: 'boolean', description: '[audit] Auto-fix vulnerabilities. Default: false' },
            },
            required: ['action'],
        },
    },
    {
        name: 'dev_docker',
        description: 'Docker operations: build images, run containers, compose up/down, push to registry, health checks.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['build', 'run', 'stop', 'ps', 'logs', 'compose_up', 'compose_down', 'images', 'pull', 'push', 'exec', 'inspect', 'prune', 'health'],
                    description: 'Docker action',
                },
                path: { type: 'string', description: 'Dockerfile/compose path or context dir' },
                image: { type: 'string', description: '[build/run/pull/push] Image name:tag' },
                container: { type: 'string', description: '[stop/logs/exec/inspect] Container name/id' },
                command: { type: 'string', description: '[exec] Command to run in container' },
                ports: { type: 'array', items: { type: 'string' }, description: '[run] Port mappings. E.g. ["3000:3000"]' },
                env: { type: 'object', description: '[run] Environment variables' },
                detach: { type: 'boolean', description: '[run/compose_up] Run in background. Default: true' },
                tail: { type: 'number', description: '[logs] Number of log lines. Default: 100' },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// EXECUTORS
// ============================================================================

function safeExec(cmd, cwd, timeout = 30000) {
    try {
        const result = execSync(cmd, { cwd, timeout, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
        return { success: true, output: result.slice(0, MAX_OUTPUT) };
    } catch (e) {
        return { success: false, output: (e.stdout || '').slice(0, MAX_OUTPUT), error: (e.stderr || e.message || '').slice(0, 5000) };
    }
}

async function executeDevFilesystem(input) {
    const { action, path: targetPath, path2, depth = 3, pattern, limit = 20, ignoreNodeModules = true } = input;

    switch (action) {
        case 'tree': {
            const tree = buildTree(targetPath, depth, pattern, ignoreNodeModules);
            return JSON.stringify({ status: 'success', tree });
        }
        case 'stats': {
            const stat = fs.statSync(targetPath);
            const result = {
                name: path.basename(targetPath),
                path: targetPath,
                isFile: stat.isFile(),
                isDirectory: stat.isDirectory(),
                size: stat.size,
                sizeHuman: humanSize(stat.size),
                created: stat.birthtime,
                modified: stat.mtime,
                permissions: stat.mode.toString(8),
            };
            if (stat.isFile()) {
                const content = fs.readFileSync(targetPath, 'utf-8');
                result.lines = content.split('\n').length;
                result.encoding = 'utf-8';
                result.extension = path.extname(targetPath);
            }
            if (stat.isDirectory()) {
                const entries = fs.readdirSync(targetPath);
                result.childCount = entries.length;
                result.files = entries.filter(e => fs.statSync(path.join(targetPath, e)).isFile()).length;
                result.folders = entries.filter(e => fs.statSync(path.join(targetPath, e)).isDirectory()).length;
            }
            return JSON.stringify({ status: 'success', ...result });
        }
        case 'diff': {
            if (!path2) return JSON.stringify({ status: 'error', error: 'path2 required for diff' });
            const file1 = fs.readFileSync(targetPath, 'utf-8').split('\n');
            const file2 = fs.readFileSync(path2, 'utf-8').split('\n');
            const diffs = simpleDiff(file1, file2);
            return JSON.stringify({ status: 'success', file1: targetPath, file2: path2, changes: diffs.length, diff: diffs.slice(0, 200) });
        }
        case 'duplicates': {
            const crypto = await import('crypto');
            const hashes = {};
            walkFiles(targetPath, ignoreNodeModules, (fp) => {
                try {
                    const hash = crypto.createHash('md5').update(fs.readFileSync(fp)).digest('hex');
                    if (!hashes[hash]) hashes[hash] = [];
                    hashes[hash].push(fp);
                } catch { }
            });
            const dupes = Object.values(hashes).filter(v => v.length > 1).slice(0, limit);
            return JSON.stringify({ status: 'success', duplicateGroups: dupes.length, duplicates: dupes });
        }
        case 'disk_usage': {
            const result = safeExec(`du -sh "${targetPath}" 2>/dev/null || echo "unknown"`, path.dirname(targetPath));
            return JSON.stringify({ status: 'success', usage: result.output.trim() });
        }
        case 'recent': {
            const files = [];
            walkFiles(targetPath, ignoreNodeModules, (fp) => {
                try {
                    const stat = fs.statSync(fp);
                    if (!pattern || fp.endsWith(pattern.replace('*', ''))) {
                        files.push({ path: fp, modified: stat.mtime, size: stat.size });
                    }
                } catch { }
            });
            files.sort((a, b) => b.modified - a.modified);
            return JSON.stringify({ status: 'success', files: files.slice(0, limit) });
        }
        case 'largest': {
            const files = [];
            walkFiles(targetPath, ignoreNodeModules, (fp) => {
                try {
                    const stat = fs.statSync(fp);
                    if (!pattern || fp.endsWith(pattern.replace('*', ''))) {
                        files.push({ path: fp, size: stat.size, sizeHuman: humanSize(stat.size) });
                    }
                } catch { }
            });
            files.sort((a, b) => b.size - a.size);
            return JSON.stringify({ status: 'success', files: files.slice(0, limit) });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown filesystem action: ${action}` });
    }
}

async function executeDevSearch(input) {
    const { action, path: targetPath, pattern, replacement, context = 2, caseSensitive = false, filePattern, maxResults = 50, dryRun = true } = input;

    switch (action) {
        case 'grep': {
            const flags = caseSensitive ? '' : '-i';
            const fileFilter = filePattern ? `--include="${filePattern}"` : '';
            const cmd = `grep -rn ${flags} -C ${context} ${fileFilter} "${pattern}" "${targetPath}" 2>/dev/null | head -${maxResults * 5}`;
            const result = safeExec(cmd, targetPath);
            const matches = result.output.split('\n').filter(l => l.trim());
            return JSON.stringify({ status: 'success', matchCount: matches.length, matches: matches.slice(0, maxResults) });
        }
        case 'find_by_name': {
            const cmd = `find "${targetPath}" -name "${pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -${maxResults}`;
            const result = safeExec(cmd, targetPath);
            const files = result.output.split('\n').filter(l => l.trim());
            return JSON.stringify({ status: 'success', count: files.length, files });
        }
        case 'find_by_content': {
            const flags = caseSensitive ? '' : '-i';
            const fileFilter = filePattern ? `--include="${filePattern}"` : '';
            const cmd = `grep -rl ${flags} ${fileFilter} "${pattern}" "${targetPath}" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -${maxResults}`;
            const result = safeExec(cmd, targetPath);
            const files = result.output.split('\n').filter(l => l.trim());
            return JSON.stringify({ status: 'success', count: files.length, files });
        }
        case 'find_replace': {
            const files = [];
            walkFiles(targetPath, true, (fp) => {
                if (filePattern && !fp.endsWith(filePattern.replace('*', ''))) return;
                try {
                    const content = fs.readFileSync(fp, 'utf-8');
                    const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
                    const matches = content.match(regex);
                    if (matches && matches.length > 0) {
                        const newContent = content.replace(regex, replacement);
                        if (!dryRun) fs.writeFileSync(fp, newContent);
                        files.push({ file: fp, replacements: matches.length });
                    }
                } catch { }
            });
            return JSON.stringify({ status: 'success', dryRun, filesChanged: files.length, files: files.slice(0, maxResults) });
        }
        case 'count_lines': {
            let total = 0;
            const byExt = {};
            walkFiles(targetPath, true, (fp) => {
                try {
                    const ext = path.extname(fp) || 'no_ext';
                    const lines = fs.readFileSync(fp, 'utf-8').split('\n').length;
                    total += lines;
                    byExt[ext] = (byExt[ext] || 0) + lines;
                } catch { }
            });
            return JSON.stringify({ status: 'success', totalLines: total, byExtension: byExt });
        }
        case 'find_todos': {
            const cmd = `grep -rn "TODO\\|FIXME\\|HACK\\|XXX\\|BUG\\|OPTIMIZE" "${targetPath}" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -${maxResults}`;
            const result = safeExec(cmd, targetPath);
            const todos = result.output.split('\n').filter(l => l.trim()).map(line => {
                const match = line.match(/^(.+?):(\d+):(.+)$/);
                if (!match) return { raw: line };
                return { file: match[1], line: parseInt(match[2]), text: match[3].trim() };
            });
            return JSON.stringify({ status: 'success', count: todos.length, todos });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown search action: ${action}` });
    }
}

async function executeDevIntelligence(input) {
    const { action, path: targetPath, symbol, language } = input;

    switch (action) {
        case 'symbols': {
            const content = fs.readFileSync(targetPath, 'utf-8');
            const lang = language || detectLanguage(targetPath);
            const symbols = extractSymbols(content, lang);
            return JSON.stringify({ status: 'success', language: lang, file: targetPath, symbols });
        }
        case 'references': {
            if (!symbol) return JSON.stringify({ status: 'error', error: 'symbol required' });
            const cmd = `grep -rn "\\b${symbol}\\b" "${targetPath}" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -50`;
            const result = safeExec(cmd, path.dirname(targetPath));
            const refs = result.output.split('\n').filter(l => l.trim());
            return JSON.stringify({ status: 'success', symbol, count: refs.length, references: refs });
        }
        case 'definitions': {
            if (!symbol) return JSON.stringify({ status: 'error', error: 'symbol required' });
            const patterns = [
                `function\\s+${symbol}`, `const\\s+${symbol}`, `let\\s+${symbol}`, `var\\s+${symbol}`,
                `class\\s+${symbol}`, `interface\\s+${symbol}`, `type\\s+${symbol}`, `def\\s+${symbol}`,
                `export.*${symbol}`,
            ];
            const cmd = `grep -rn "${patterns.join('\\|')}" "${targetPath}" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -20`;
            const result = safeExec(cmd, path.dirname(targetPath));
            const defs = result.output.split('\n').filter(l => l.trim());
            return JSON.stringify({ status: 'success', symbol, count: defs.length, definitions: defs });
        }
        case 'detect_language': {
            if (fs.statSync(targetPath).isFile()) {
                return JSON.stringify({ status: 'success', file: targetPath, language: detectLanguage(targetPath) });
            }
            const langs = {};
            walkFiles(targetPath, true, (fp) => {
                const lang = detectLanguage(fp);
                langs[lang] = (langs[lang] || 0) + 1;
            });
            const sorted = Object.entries(langs).sort((a, b) => b[1] - a[1]);
            return JSON.stringify({ status: 'success', primary: sorted[0]?.[0], languages: Object.fromEntries(sorted) });
        }
        case 'imports': {
            const content = fs.readFileSync(targetPath, 'utf-8');
            const imports = [...content.matchAll(/(?:import\s+.*?from\s+['"](.+?)['"]|require\(\s*['"](.+?)['"]\s*\)|from\s+(\S+)\s+import)/g)]
                .map(m => m[1] || m[2] || m[3]);
            return JSON.stringify({ status: 'success', file: targetPath, count: imports.length, imports });
        }
        case 'exports': {
            const content = fs.readFileSync(targetPath, 'utf-8');
            const exports = [...content.matchAll(/export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)?\s*(\w+)/g)]
                .map(m => m[1]);
            const moduleExports = [...content.matchAll(/module\.exports\s*=\s*\{([^}]+)\}/g)]
                .flatMap(m => m[1].split(',').map(s => s.trim().split(':')[0].trim()));
            return JSON.stringify({ status: 'success', file: targetPath, exports: [...exports, ...moduleExports] });
        }
        case 'detect_framework': {
            const pkgPath = path.join(targetPath, 'package.json');
            if (!fs.existsSync(pkgPath)) return JSON.stringify({ status: 'success', framework: 'unknown', message: 'No package.json found' });
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            const frameworks = [];
            if (deps.react) frameworks.push('React');
            if (deps.next) frameworks.push('Next.js');
            if (deps.vue) frameworks.push('Vue');
            if (deps.nuxt) frameworks.push('Nuxt');
            if (deps.angular || deps['@angular/core']) frameworks.push('Angular');
            if (deps.svelte) frameworks.push('Svelte');
            if (deps.express) frameworks.push('Express');
            if (deps.fastify) frameworks.push('Fastify');
            if (deps.nestjs || deps['@nestjs/core']) frameworks.push('NestJS');
            if (deps.django) frameworks.push('Django');
            if (deps.flask) frameworks.push('Flask');
            if (deps.tailwindcss) frameworks.push('Tailwind CSS');
            if (deps.prisma || deps['@prisma/client']) frameworks.push('Prisma');
            if (deps.typescript) frameworks.push('TypeScript');
            return JSON.stringify({ status: 'success', frameworks, packageName: pkg.name, version: pkg.version });
        }
        case 'dependencies': {
            const pkgPath = fs.statSync(targetPath).isDirectory() ? path.join(targetPath, 'package.json') : targetPath;
            if (!fs.existsSync(pkgPath)) return JSON.stringify({ status: 'error', error: 'package.json not found' });
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            return JSON.stringify({
                status: 'success',
                dependencies: Object.keys(pkg.dependencies || {}),
                devDependencies: Object.keys(pkg.devDependencies || {}),
                totalDeps: Object.keys(pkg.dependencies || {}).length,
                totalDevDeps: Object.keys(pkg.devDependencies || {}).length,
            });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown intelligence action: ${action}` });
    }
}

async function executeDevDebug(input) {
    const { action, path: targetPath, error: errorText, fix = false } = input;

    switch (action) {
        case 'parse_error': {
            if (!errorText) return JSON.stringify({ status: 'error', error: 'error text required' });
            const parsed = parseErrorMessage(errorText);
            return JSON.stringify({ status: 'success', ...parsed });
        }
        case 'stack_trace': {
            if (!errorText) return JSON.stringify({ status: 'error', error: 'stack trace text required' });
            const frames = parseStackTrace(errorText);
            return JSON.stringify({ status: 'success', errorType: frames.errorType, message: frames.message, frames: frames.frames });
        }
        case 'lint': {
            const result = safeExec(`npx eslint "${targetPath}" --format json 2>/dev/null || echo "[]"`, path.dirname(targetPath));
            try {
                const lintResults = JSON.parse(result.output);
                const issues = (Array.isArray(lintResults) ? lintResults : []).flatMap(f =>
                    (f.messages || []).map(m => ({ file: f.filePath, line: m.line, col: m.column, severity: m.severity === 2 ? 'error' : 'warning', message: m.message, rule: m.ruleId }))
                );
                return JSON.stringify({ status: 'success', issueCount: issues.length, issues: issues.slice(0, 50) });
            } catch {
                return JSON.stringify({ status: 'success', raw: result.output.slice(0, 5000) });
            }
        }
        case 'dependency_audit': {
            const result = safeExec('npm audit --json 2>/dev/null', targetPath);
            try {
                const audit = JSON.parse(result.output);
                return JSON.stringify({
                    status: 'success',
                    vulnerabilities: audit.metadata?.vulnerabilities || {},
                    totalDeps: audit.metadata?.totalDependencies,
                    advisories: Object.values(audit.advisories || {}).slice(0, 20).map(a => ({
                        title: a.title, severity: a.severity, module: a.module_name, recommendation: a.recommendation,
                    })),
                });
            } catch {
                return JSON.stringify({ status: 'success', raw: result.output.slice(0, 5000) });
            }
        }
        case 'dead_code': {
            const result = safeExec(`grep -rn "export" "${targetPath}" --include="*.ts" --include="*.js" --exclude-dir=node_modules 2>/dev/null`, targetPath);
            const exports = result.output.split('\n').filter(l => l.trim());
            const unused = [];
            for (const exp of exports.slice(0, 100)) {
                const match = exp.match(/export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*(\w+)/);
                if (match) {
                    const sym = match[1];
                    const refs = safeExec(`grep -rn "\\b${sym}\\b" "${targetPath}" --exclude-dir=node_modules --include="*.ts" --include="*.js" 2>/dev/null | wc -l`, targetPath);
                    if (parseInt(refs.output.trim()) <= 1) unused.push({ symbol: sym, file: exp.split(':')[0] });
                }
            }
            return JSON.stringify({ status: 'success', potentiallyUnused: unused.length, symbols: unused.slice(0, 30) });
        }
        case 'todos': {
            const cmd = `grep -rn "TODO\\|FIXME\\|HACK\\|XXX\\|BUG\\|OPTIMIZE\\|DEPRECATED" "${targetPath}" --exclude-dir=node_modules --exclude-dir=.git --include="*.ts" --include="*.js" --include="*.py" --include="*.tsx" --include="*.jsx" 2>/dev/null | head -100`;
            const result = safeExec(cmd, targetPath);
            const todos = result.output.split('\n').filter(l => l.trim()).map(line => {
                const match = line.match(/^(.+?):(\d+):(.+)$/);
                if (!match) return { raw: line };
                const type = match[3].match(/(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|DEPRECATED)/i)?.[1]?.toUpperCase() || 'OTHER';
                return { file: match[1], line: parseInt(match[2]), type, text: match[3].trim() };
            });
            const byType = {};
            todos.forEach(t => { byType[t.type] = (byType[t.type] || 0) + 1; });
            return JSON.stringify({ status: 'success', total: todos.length, byType, items: todos });
        }
        case 'env_check': {
            const envPath = path.join(targetPath, '.env');
            const envExamplePath = path.join(targetPath, '.env.example');
            const envVars = {};
            if (fs.existsSync(envPath)) {
                fs.readFileSync(envPath, 'utf-8').split('\n').forEach(l => {
                    const m = l.match(/^(\w+)=(.*)$/);
                    if (m) envVars[m[1]] = m[2] ? 'set' : 'empty';
                });
            }
            const required = {};
            if (fs.existsSync(envExamplePath)) {
                fs.readFileSync(envExamplePath, 'utf-8').split('\n').forEach(l => {
                    const m = l.match(/^(\w+)=/);
                    if (m) required[m[1]] = envVars[m[1]] || 'missing';
                });
            }
            return JSON.stringify({ status: 'success', envFile: fs.existsSync(envPath), envVars: Object.keys(envVars).length, required });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown debug action: ${action}` });
    }
}

async function executeDevTest(input) {
    const { action, path: targetPath, testName, framework = 'auto', timeout = 30 } = input;

    const fw = framework === 'auto' ? detectTestFramework(targetPath) : framework;

    switch (action) {
        case 'run': {
            const cmds = {
                jest: `npx jest ${testName ? `--testNamePattern="${testName}"` : ''} --no-coverage --forceExit`,
                vitest: `npx vitest run ${testName ? `--reporter=verbose -t "${testName}"` : ''}`,
                pytest: `python -m pytest ${targetPath} ${testName ? `-k "${testName}"` : ''} -v`,
                mocha: `npx mocha ${targetPath} ${testName ? `--grep "${testName}"` : ''}`,
            };
            const result = safeExec(cmds[fw] || cmds.jest, targetPath, timeout * 1000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', framework: fw, output: result.output, error: result.error });
        }
        case 'run_file': {
            const cmds = { jest: `npx jest "${targetPath}" --forceExit`, vitest: `npx vitest run "${targetPath}"`, pytest: `python -m pytest "${targetPath}" -v`, mocha: `npx mocha "${targetPath}"` };
            const result = safeExec(cmds[fw] || cmds.jest, path.dirname(targetPath), timeout * 1000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', framework: fw, output: result.output, error: result.error });
        }
        case 'coverage': {
            const cmds = { jest: 'npx jest --coverage --forceExit', vitest: 'npx vitest run --coverage', pytest: 'python -m pytest --cov --cov-report=term' };
            const result = safeExec(cmds[fw] || cmds.jest, targetPath, timeout * 1000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', framework: fw, output: result.output });
        }
        case 'list': {
            const cmds = { jest: 'npx jest --listTests', vitest: 'npx vitest list', pytest: 'python -m pytest --collect-only -q' };
            const result = safeExec(cmds[fw] || cmds.jest, targetPath, timeout * 1000);
            const tests = result.output.split('\n').filter(l => l.trim());
            return JSON.stringify({ status: 'success', framework: fw, count: tests.length, tests });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown test action: ${action}` });
    }
}

async function executeDevGit(input) {
    const { action, path: targetPath = '.', message, branch, files, url, limit = 10, file, tag, ref } = input;
    const cwd = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath);

    const cmds = {
        status: 'git status --porcelain',
        log: `git log --oneline --decorate -${limit}${file ? ` -- "${file}"` : ''}`,
        diff: `git diff${file ? ` -- "${file}"` : ''}`,
        blame: file ? `git blame "${file}"` : 'echo "file parameter required"',
        commit: `git add ${files ? files.join(' ') : '.'} && git commit -m "${message || 'auto commit'}"`,
        push: 'git push',
        pull: 'git pull',
        branch: branch ? `git branch "${branch}"` : 'git branch -a',
        checkout: `git checkout "${branch || 'main'}"`,
        merge: `git merge "${branch}"`,
        stash: 'git stash',
        clone: `git clone "${url}" "${targetPath}"`,
        init: 'git init',
        remote: 'git remote -v',
        tag: tag ? `git tag "${tag}"` : 'git tag -l',
        reset: `git reset ${ref || 'HEAD~1'}`,
        cherry_pick: `git cherry-pick ${ref}`,
    };

    const result = safeExec(cmds[action] || `echo "Unknown: ${action}"`, cwd);
    return JSON.stringify({ status: result.success ? 'success' : 'error', action, output: result.output, error: result.error });
}

async function executeDevNpm(input) {
    const { action, path: targetPath = '.', packages = [], dev = false, script, fix = false } = input;

    const cmds = {
        install: packages.length > 0 ? `npm install ${dev ? '-D' : ''} ${packages.join(' ')}` : 'npm install',
        uninstall: `npm uninstall ${packages.join(' ')}`,
        update: packages.length > 0 ? `npm update ${packages.join(' ')}` : 'npm update',
        audit: fix ? 'npm audit fix' : 'npm audit',
        outdated: 'npm outdated --json',
        list: 'npm list --depth=0 --json',
        run_script: `npm run ${script || 'start'}`,
        init: 'npm init -y',
        version: 'npm version',
        search: `npm search ${packages[0] || ''} --json`,
        info: `npm info ${packages[0] || ''} --json`,
    };

    const result = safeExec(cmds[action] || `echo "Unknown: ${action}"`, targetPath, 60000);
    return JSON.stringify({ status: result.success ? 'success' : 'error', action, output: result.output.slice(0, MAX_OUTPUT), error: result.error });
}

async function executeDevDocker(input) {
    const { action, path: targetPath = '.', image, container, command, ports, env, detach = true, tail = 100 } = input;

    let cmd;
    switch (action) {
        case 'build': cmd = `docker build -t ${image || 'app:latest'} "${targetPath}"`; break;
        case 'run': {
            const portFlags = (ports || []).map(p => `-p ${p}`).join(' ');
            const envFlags = env ? Object.entries(env).map(([k, v]) => `-e ${k}=${v}`).join(' ') : '';
            cmd = `docker run ${detach ? '-d' : ''} ${portFlags} ${envFlags} ${image}`; break;
        }
        case 'stop': cmd = `docker stop ${container}`; break;
        case 'ps': cmd = 'docker ps --format "table {{.ID}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}\\t{{.Names}}"'; break;
        case 'logs': cmd = `docker logs --tail ${tail} ${container}`; break;
        case 'compose_up': cmd = `docker compose -f "${targetPath}" up ${detach ? '-d' : ''}`; break;
        case 'compose_down': cmd = `docker compose -f "${targetPath}" down`; break;
        case 'images': cmd = 'docker images --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}\\t{{.CreatedAt}}"'; break;
        case 'pull': cmd = `docker pull ${image}`; break;
        case 'push': cmd = `docker push ${image}`; break;
        case 'exec': cmd = `docker exec ${container} ${command || 'sh'}`; break;
        case 'inspect': cmd = `docker inspect ${container}`; break;
        case 'prune': cmd = 'docker system prune -f'; break;
        case 'health': cmd = 'docker system df && echo "---" && docker ps -a --format "{{.Names}}: {{.Status}}"'; break;
        default: cmd = `echo "Unknown docker action: ${action}"`;
    }

    const result = safeExec(cmd, targetPath, 60000);
    return JSON.stringify({ status: result.success ? 'success' : 'error', action, output: result.output, error: result.error });
}

// ============================================================================
// HELPERS
// ============================================================================

function buildTree(dir, maxDepth, pattern, ignoreNM, depth = 0) {
    if (depth >= maxDepth) return '...';
    if (!fs.existsSync(dir)) return `[not found: ${dir}]`;
    const entries = fs.readdirSync(dir);
    const lines = [];
    for (const e of entries) {
        if (ignoreNM && (e === 'node_modules' || e === '.git')) continue;
        const fp = path.join(dir, e);
        const stat = fs.statSync(fp);
        const prefix = '  '.repeat(depth);
        if (stat.isDirectory()) {
            lines.push(`${prefix}📁 ${e}/`);
            lines.push(buildTree(fp, maxDepth, pattern, ignoreNM, depth + 1));
        } else {
            if (!pattern || e.match(new RegExp(pattern.replace('*', '.*')))) {
                lines.push(`${prefix}📄 ${e} (${humanSize(stat.size)})`);
            }
        }
    }
    return lines.join('\n');
}

function walkFiles(dir, ignoreNM, cb) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    const entries = fs.readdirSync(dir);
    for (const e of entries) {
        if (ignoreNM && (e === 'node_modules' || e === '.git' || e === '.next' || e === 'dist')) continue;
        const fp = path.join(dir, e);
        try {
            const stat = fs.statSync(fp);
            if (stat.isFile()) cb(fp);
            else if (stat.isDirectory()) walkFiles(fp, ignoreNM, cb);
        } catch { }
    }
}

function humanSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
}

function simpleDiff(lines1, lines2) {
    const changes = [];
    const max = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < max; i++) {
        if (lines1[i] !== lines2[i]) {
            changes.push({ line: i + 1, old: lines1[i] || '(empty)', new: lines2[i] || '(empty)' });
        }
    }
    return changes;
}

function detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = { '.js': 'javascript', '.ts': 'typescript', '.tsx': 'typescript-react', '.jsx': 'javascript-react', '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.java': 'java', '.cpp': 'c++', '.c': 'c', '.cs': 'c#', '.php': 'php', '.swift': 'swift', '.kt': 'kotlin', '.dart': 'dart', '.html': 'html', '.css': 'css', '.scss': 'scss', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.md': 'markdown', '.sql': 'sql', '.sh': 'bash', '.bash': 'bash', '.zsh': 'zsh', '.prisma': 'prisma' };
    return map[ext] || 'unknown';
}

function extractSymbols(content, language) {
    const symbols = { functions: [], classes: [], variables: [], interfaces: [], types: [], exports: [] };
    if (['javascript', 'typescript', 'typescript-react', 'javascript-react'].includes(language)) {
        symbols.functions = [...content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g)].map(m => m[1]);
        symbols.classes = [...content.matchAll(/(?:export\s+)?class\s+(\w+)/g)].map(m => m[1]);
        symbols.variables = [...content.matchAll(/(?:export\s+)?(?:const|let|var)\s+(\w+)/g)].map(m => m[1]).slice(0, 50);
        symbols.interfaces = [...content.matchAll(/(?:export\s+)?interface\s+(\w+)/g)].map(m => m[1]);
        symbols.types = [...content.matchAll(/(?:export\s+)?type\s+(\w+)/g)].map(m => m[1]);
    } else if (language === 'python') {
        symbols.functions = [...content.matchAll(/def\s+(\w+)/g)].map(m => m[1]);
        symbols.classes = [...content.matchAll(/class\s+(\w+)/g)].map(m => m[1]);
    }
    return symbols;
}

function detectTestFramework(targetPath) {
    const dir = fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath);
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.vitest) return 'vitest';
        if (deps.jest) return 'jest';
        if (deps.mocha) return 'mocha';
    }
    if (fs.existsSync(path.join(dir, 'pytest.ini')) || fs.existsSync(path.join(dir, 'setup.py'))) return 'pytest';
    return 'jest';
}

function parseErrorMessage(text) {
    const type = text.match(/^(\w+Error):/)?.[1] || text.match(/(\w+Error)/)?.[1] || 'Error';
    const message = text.split('\n')[0];
    const fileLine = text.match(/at\s+.*\((.+):(\d+):(\d+)\)/);
    return { type, message, file: fileLine?.[1], line: fileLine ? parseInt(fileLine[2]) : null, column: fileLine ? parseInt(fileLine[3]) : null };
}

function parseStackTrace(text) {
    const lines = text.split('\n');
    const firstLine = lines[0] || '';
    const colonIdx = firstLine.indexOf(':');
    const errorType = colonIdx > 0 ? firstLine.slice(0, colonIdx) : 'Error';
    const message = colonIdx > 0 ? firstLine.slice(colonIdx + 1).trim() : firstLine;
    const frames = lines.slice(1).map(line => {
        const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
        if (!match) return null;
        return { function: match[1], file: match[2], line: parseInt(match[3]), column: parseInt(match[4]) };
    }).filter(Boolean);
    return { errorType, message, frames };
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeDevTool(toolName, input, ctx = {}) {
    switch (toolName) {
        case 'dev_filesystem': return { result: await executeDevFilesystem(input), sideEffects: null };
        case 'dev_search': return { result: await executeDevSearch(input), sideEffects: null };
        case 'dev_intelligence': return { result: await executeDevIntelligence(input), sideEffects: null };
        case 'dev_debug': return { result: await executeDevDebug(input), sideEffects: null };
        case 'dev_test': return { result: await executeDevTest(input), sideEffects: null };
        case 'dev_git': return { result: await executeDevGit(input), sideEffects: null };
        case 'dev_npm': return { result: await executeDevNpm(input), sideEffects: null };
        case 'dev_docker': return { result: await executeDevDocker(input), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown dev tool: ${toolName}` }), sideEffects: null };
    }
}

const DEV_TOOL_NAMES = new Set(DEV_TOOL_DEFINITIONS.map(t => t.name));
function isDevTool(toolName) { return DEV_TOOL_NAMES.has(toolName); }

export { DEV_TOOL_DEFINITIONS, executeDevTool, isDevTool };
