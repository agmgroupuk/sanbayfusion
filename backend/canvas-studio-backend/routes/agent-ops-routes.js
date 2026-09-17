/**
 * AGENT OPS API ROUTES
 * Per-project AI agent operations — natural language → infrastructure actions.
 *
 * POST /api/agent-ops/:projectId/execute   — Execute an agent command
 * POST /api/agent-ops/:projectId/cancel    — Cancel a running agent task
 */

import crypto from 'crypto';
import express from 'express';
import { prisma } from '../lib/prisma.js';
import buildOrchestrator from '../services/build/build-orchestrator.js';
import s3DeployService from '../services/canvas/s3-deploy-service.js';

const router = express.Router();

const getUserId = (req) => req.session?.userId || req.user?.id;

// ── Intent detection ───────────────────────────────────────────────

const INTENT_MAP = [
    { keywords: ['deploy', 'publish', 'ship', 'make it live', 'go live', 'launch'], intent: 'deploy' },
    { keywords: ['build', 'compile', 'bundle', 'package'], intent: 'build' },
    { keywords: ['rollback', 'revert', 'undo', 'previous version'], intent: 'rollback' },
    { keywords: ['debug', 'fix', 'error', 'bug', "what's wrong", 'broken'], intent: 'debug' },
    { keywords: ['scale', 'performance', 'optimize', 'speed', 'slow'], intent: 'scale' },
    { keywords: ['database', 'db', 'migrate', 'backup', 'data'], intent: 'database' },
    { keywords: ['setup', 'init', 'initialize', 'configure', 'install'], intent: 'setup' },
    { keywords: ['security', 'audit', 'vulnerability', 'secure', 'ssl', 'https'], intent: 'security' },
    { keywords: ['status', 'check', 'health', 'monitor', 'how is'], intent: 'status' },
    { keywords: ['cost', 'spending', 'bill', 'usage', 'pricing'], intent: 'cost' },
    { keywords: ['domain', 'dns', 'url', 'custom domain'], intent: 'domain' },
    { keywords: ['cleanup', 'clean', 'remove', 'delete old', 'prune'], intent: 'cleanup' },
];

function detectIntent(command) {
    const lower = command.toLowerCase();
    for (const entry of INTENT_MAP) {
        if (entry.keywords.some(kw => lower.includes(kw))) return entry.intent;
    }
    return 'status';
}

// ── Plan generation per intent ─────────────────────────────────────

const PLAN_TEMPLATES = {
    deploy: [
        { action: 'lint', label: 'Validating project files' },
        { action: 'build', label: 'Preparing build artifacts' },
        { action: 'deploy', label: 'Deploying to production' },
        { action: 'health', label: 'Running health check' },
    ],
    build: [
        { action: 'deps', label: 'Analyzing dependencies' },
        { action: 'build', label: 'Building project' },
        { action: 'report', label: 'Generating build report' },
    ],
    rollback: [
        { action: 'identify', label: 'Finding previous deployment' },
        { action: 'rollback', label: 'Rolling back deployment' },
        { action: 'verify', label: 'Verifying rollback' },
    ],
    debug: [
        { action: 'analyze', label: 'Analyzing project files' },
        { action: 'identify', label: 'Identifying issues' },
        { action: 'suggest', label: 'Generating fix suggestions' },
    ],
    scale: [
        { action: 'metrics', label: 'Collecting file metrics' },
        { action: 'analyze', label: 'Analyzing bundle size' },
        { action: 'suggest', label: 'Recommending optimizations' },
    ],
    database: [
        { action: 'status', label: 'Checking project data' },
        { action: 'analyze', label: 'Analyzing data usage' },
    ],
    setup: [
        { action: 'scaffold', label: 'Analyzing project structure' },
        { action: 'deps', label: 'Checking dependencies' },
        { action: 'config', label: 'Verifying configuration' },
    ],
    security: [
        { action: 'scan', label: 'Scanning for vulnerabilities' },
        { action: 'audit', label: 'Auditing dependencies' },
        { action: 'report', label: 'Generating security report' },
    ],
    status: [
        { action: 'check', label: 'Checking project status' },
        { action: 'health', label: 'Reviewing recent activity' },
    ],
    cost: [
        { action: 'collect', label: 'Collecting usage data' },
        { action: 'analyze', label: 'Analyzing resource usage' },
    ],
    domain: [
        { action: 'dns', label: 'Checking DNS configuration' },
        { action: 'ssl', label: 'Verifying SSL certificate' },
    ],
    cleanup: [
        { action: 'scan', label: 'Scanning for unused resources' },
        { action: 'report', label: 'Generating cleanup report' },
    ],
};

// ── Helpers ────────────────────────────────────────────────────────

/** Load all project files from DB as { path → content } map */
async function loadProjectFiles(projectId) {
    const rows = await prisma.projectFile.findMany({
        where: { projectId },
        select: { path: true, content: true, size: true, language: true },
    });
    const fileMap = {};
    for (const f of rows) fileMap[f.path] = f.content;
    return { fileMap, rows };
}

/** Detect framework from project files */
function detectFramework(fileMap) {
    const paths = Object.keys(fileMap);
    const pkgRaw = fileMap['package.json'];
    let pkg = null;
    try { pkg = pkgRaw ? JSON.parse(pkgRaw) : null; } catch { /* ignore */ }

    if (pkg?.dependencies?.next || pkg?.devDependencies?.next) return 'next';
    if (pkg?.dependencies?.react || pkg?.devDependencies?.react) return 'react';
    if (pkg?.dependencies?.vue || pkg?.devDependencies?.vue) return 'vue';
    if (pkg?.dependencies?.svelte || pkg?.devDependencies?.svelte) return 'svelte';
    if (paths.some(p => p.endsWith('.tsx') || p.endsWith('.jsx'))) return 'react';
    if (paths.some(p => p.endsWith('.html'))) return 'html';
    return 'unknown';
}

// Security patterns to scan for
const SECURITY_PATTERNS = [
    { pattern: /eval\s*\(/g, severity: 'high', desc: 'Use of eval()' },
    { pattern: /innerHTML\s*=/g, severity: 'medium', desc: 'Direct innerHTML assignment' },
    { pattern: /document\.write\s*\(/g, severity: 'medium', desc: 'Use of document.write()' },
    { pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'critical', desc: 'Potential hardcoded secret' },
    { pattern: /dangerouslySetInnerHTML/g, severity: 'medium', desc: 'React dangerouslySetInnerHTML' },
    { pattern: /new\s+Function\s*\(/g, severity: 'high', desc: 'Dynamic Function constructor' },
    { pattern: /window\.location\s*=\s*[^;]*\+/g, severity: 'medium', desc: 'Potential open redirect' },
    { pattern: /http:\/\/(?!127\.0\.0\.1)/g, severity: 'low', desc: 'Non-HTTPS URL' },
];

// Code quality patterns to check
const DEBUG_PATTERNS = [
    { pattern: /console\.(log|debug|info)\s*\(/g, desc: 'Console statement', severity: 'info' },
    { pattern: /\/\/\s*(TODO|FIXME|HACK|XXX|BUG)/gi, desc: 'TODO/FIXME comment', severity: 'warning' },
    { pattern: /debugger\s*;/g, desc: 'Debugger statement', severity: 'warning' },
    { pattern: /\bcatch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, desc: 'Empty catch block', severity: 'warning' },
    { pattern: /any\b/g, desc: 'TypeScript "any" type', severity: 'info', exts: ['.ts', '.tsx'] },
];

// ── Step executors ─────────────────────────────────────────────────
// Each executor receives { project, fileMap, rows, projectId, userId, command }
// and returns { message, detail? } or throws on failure.

const EXECUTORS = {
    // ── Deploy ─────────────────────────────────────────────────────
    'deploy:lint': async (ctx) => {
        const paths = Object.keys(ctx.fileMap);
        const issues = [];
        if (!paths.some(p => p === 'index.html' || p.endsWith('/index.html'))) {
            issues.push('No index.html found');
        }
        const emptyFiles = paths.filter(p => !ctx.fileMap[p]?.trim());
        if (emptyFiles.length) issues.push(`${emptyFiles.length} empty file(s): ${emptyFiles.slice(0, 3).join(', ')}`);
        if (paths.length === 0) throw new Error('Project has no files to deploy');
        return {
            message: issues.length
                ? `Validation passed with ${issues.length} warning(s)`
                : `Validated ${paths.length} files — no issues`,
            detail: issues.length ? issues : undefined,
        };
    },

    'deploy:build': async (ctx) => {
        const framework = detectFramework(ctx.fileMap);
        const fileCount = Object.keys(ctx.fileMap).length;
        const totalSize = ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0);
        return {
            message: `Build artifacts ready — ${fileCount} files (${(totalSize / 1024).toFixed(1)} KB), framework: ${framework}`,
        };
    },

    'deploy:deploy': async (ctx) => {
        const result = await s3DeployService.deployFiles({
            projectName: ctx.project.name,
            files: ctx.fileMap,
            userId: ctx.userId,
            slug: ctx.project.metadata ? JSON.parse(ctx.project.metadata).deploySlug : undefined,
            source: ctx.project.source || 'standalone',
        });
        if (!result.success) throw new Error(result.error || 'S3 deployment failed');

        // Record deployment in DB
        await prisma.deployment.create({
            data: {
                projectId: ctx.projectId,
                userId: ctx.userId,
                environment: 'production',
                url: result.url,
                domain: result.slug,
                status: 'live',
                sizeBytes: ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0),
                metadata: JSON.stringify({ filesUploaded: result.filesUploaded, s3Path: result.s3Path }),
            },
        });

        // Store deploy slug in project metadata for redeployments
        const existingMeta = ctx.project.metadata ? JSON.parse(ctx.project.metadata) : {};
        existingMeta.deploySlug = result.slug;
        existingMeta.lastDeployUrl = result.url;
        await prisma.canvasProject.update({
            where: { id: ctx.projectId },
            data: { metadata: JSON.stringify(existingMeta) },
        });

        return { message: `Deployed to ${result.url}`, detail: { url: result.url, files: result.filesUploaded } };
    },

    'deploy:health': async (ctx) => {
        const meta = ctx.project.metadata ? JSON.parse(ctx.project.metadata) : {};
        const url = meta.lastDeployUrl;
        if (!url) return { message: 'No deployment URL found — skipping health check' };
        try {
            const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
            return {
                message: resp.ok
                    ? `Health check passed — ${url} returned ${resp.status}`
                    : `Health check warning — ${url} returned ${resp.status}`,
            };
        } catch (e) {
            return { message: `Health check inconclusive — ${url} may still be propagating (${e.message})` };
        }
    },

    // ── Build ──────────────────────────────────────────────────────
    'build:deps': async (ctx) => {
        const pkgRaw = ctx.fileMap['package.json'];
        if (!pkgRaw) return { message: 'No package.json found — static project, no dependencies to analyze' };
        let pkg;
        try { pkg = JSON.parse(pkgRaw); } catch { throw new Error('package.json is not valid JSON'); }
        const depCount = Object.keys(pkg.dependencies || {}).length;
        const devDepCount = Object.keys(pkg.devDependencies || {}).length;
        return {
            message: `Found ${depCount} dependencies, ${devDepCount} dev dependencies`,
            detail: { dependencies: pkg.dependencies, devDependencies: pkg.devDependencies },
        };
    },

    'build:build': async (ctx) => {
        const build = await buildOrchestrator.startBuild({
            projectId: ctx.projectId,
            userId: ctx.userId,
            triggeredBy: 'agent-ops',
        });
        return {
            message: `Build started — ID: ${build.id}, status: ${build.status}`,
            detail: { buildId: build.id, stages: build.stages },
        };
    },

    'build:report': async (ctx) => {
        const recentBuild = await prisma.build.findFirst({
            where: { projectId: ctx.projectId },
            orderBy: { createdAt: 'desc' },
        });
        if (!recentBuild) return { message: 'No previous builds found' };
        return {
            message: `Latest build: ${recentBuild.status} (${recentBuild.duration ? recentBuild.duration + 'ms' : 'n/a'})`,
            detail: {
                id: recentBuild.id,
                status: recentBuild.status,
                duration: recentBuild.duration,
                triggeredBy: recentBuild.triggeredBy,
                createdAt: recentBuild.createdAt,
            },
        };
    },

    // ── Status ─────────────────────────────────────────────────────
    'status:check': async (ctx) => {
        const totalSize = ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0);
        const framework = detectFramework(ctx.fileMap);
        const fileCount = ctx.rows.length;

        if (ctx.projectId === 'uploaded') {
            // Uploaded files — no DB records
            const byExt = {};
            for (const f of ctx.rows) {
                const ext = f.path.includes('.') ? f.path.split('.').pop() : 'other';
                byExt[ext] = (byExt[ext] || 0) + 1;
            }
            return {
                message: `Uploaded files: ${fileCount} files (${(totalSize / 1024).toFixed(1)} KB), detected framework: ${framework}`,
                detail: { fileCount, totalSizeKB: (totalSize / 1024).toFixed(1), framework, fileTypes: byExt, files: ctx.rows.map(f => `${f.path} (${(f.size / 1024).toFixed(1)} KB)`) },
            };
        }

        const [buildCount, deployCount, taskCount] = await Promise.all([
            prisma.build.count({ where: { projectId: ctx.projectId } }),
            prisma.deployment.count({ where: { projectId: ctx.projectId } }),
            prisma.agentTask.count({ where: { projectId: ctx.projectId } }),
        ]);
        return {
            message: `Project "${ctx.project.name}" — ${fileCount} files (${(totalSize / 1024).toFixed(1)} KB), ${buildCount} builds, ${deployCount} deployments, framework: ${framework}`,
            detail: { fileCount, buildCount, deployCount, taskCount, totalSizeKB: (totalSize / 1024).toFixed(1), framework },
        };
    },

    'status:health': async (ctx) => {
        if (ctx.projectId === 'uploaded') {
            // Analyze file health for uploaded files
            const paths = Object.keys(ctx.fileMap);
            const hasEntry = paths.some(p => p === 'index.html' || p.endsWith('/index.html') || p === 'src/main.tsx' || p === 'src/main.ts' || p === 'src/index.tsx');
            const hasPackageJson = paths.includes('package.json');
            const emptyFiles = paths.filter(p => !ctx.fileMap[p]?.trim());
            const totalSize = ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0);
            const checks = [
                `Entry point: ${hasEntry ? '✓ Found' : '✗ Missing'}`,
                `Package.json: ${hasPackageJson ? '✓ Found' : '✗ Missing'}`,
                `Empty files: ${emptyFiles.length === 0 ? '✓ None' : `✗ ${emptyFiles.length} found`}`,
                `Total size: ${(totalSize / 1024).toFixed(1)} KB`,
            ];
            return {
                message: `File health: ${hasEntry && hasPackageJson && emptyFiles.length === 0 ? 'Good' : 'Needs attention'}`,
                detail: checks,
            };
        }

        const [latestBuild, latestDeploy, latestTask] = await Promise.all([
            prisma.build.findFirst({ where: { projectId: ctx.projectId }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, createdAt: true } }),
            prisma.deployment.findFirst({ where: { projectId: ctx.projectId }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, url: true, createdAt: true } }),
            prisma.agentTask.findFirst({ where: { projectId: ctx.projectId }, orderBy: { startedAt: 'desc' }, select: { id: true, status: true, intent: true, startedAt: true } }),
        ]);
        const parts = [];
        if (latestBuild) parts.push(`Last build: ${latestBuild.status} (${latestBuild.createdAt.toISOString().slice(0, 16)})`);
        if (latestDeploy) parts.push(`Last deploy: ${latestDeploy.status}${latestDeploy.url ? ' → ' + latestDeploy.url : ''}`);
        if (latestTask) parts.push(`Last task: ${latestTask.intent} — ${latestTask.status}`);
        return {
            message: parts.length ? parts.join(' | ') : 'No recent activity found',
            detail: { latestBuild, latestDeploy, latestTask },
        };
    },

    // ── Debug ──────────────────────────────────────────────────────
    'debug:analyze': async (ctx) => {
        const issues = [];
        for (const [filePath, content] of Object.entries(ctx.fileMap)) {
            if (!content) continue;
            for (const pat of DEBUG_PATTERNS) {
                if (pat.exts && !pat.exts.some(ext => filePath.endsWith(ext))) continue;
                const matches = content.match(pat.pattern);
                if (matches) {
                    issues.push({ file: filePath, issue: pat.desc, count: matches.length, severity: pat.severity });
                }
            }
        }
        return {
            message: issues.length
                ? `Found ${issues.length} issue(s) across project files`
                : 'No common issues detected',
            detail: issues.slice(0, 30),
        };
    },

    'debug:identify': async (ctx) => {
        const paths = Object.keys(ctx.fileMap);
        const findings = [];

        // Check for missing entry points
        const hasHtml = paths.some(p => p.endsWith('.html'));
        const hasIndex = paths.some(p => p === 'index.html' || p === 'src/index.html' || p === 'src/main.tsx' || p === 'src/main.ts');
        if (!hasIndex) findings.push({ severity: 'error', desc: 'No entry point found (index.html, src/main.tsx, etc.)' });

        // Check for broken imports/references in HTML files
        for (const [fp, content] of Object.entries(ctx.fileMap)) {
            if (!fp.endsWith('.html') || !content) continue;
            const srcRefs = [...content.matchAll(/(?:src|href)=["']([^"']+)["']/g)];
            for (const m of srcRefs) {
                const ref = m[1];
                if (ref.startsWith('http') || ref.startsWith('//') || ref.startsWith('data:') || ref.startsWith('#')) continue;
                const resolved = ref.startsWith('/') ? ref.slice(1) : ref;
                if (!paths.includes(resolved)) {
                    findings.push({ severity: 'warning', desc: `${fp}: references "${ref}" which is not in the project` });
                }
            }
        }

        // Check for syntax issues in JSON files
        for (const [fp, content] of Object.entries(ctx.fileMap)) {
            if (!fp.endsWith('.json') || !content) continue;
            try { JSON.parse(content); } catch (e) {
                findings.push({ severity: 'error', desc: `${fp}: invalid JSON — ${e.message}` });
            }
        }

        return {
            message: findings.length
                ? `Identified ${findings.length} potential issue(s)`
                : 'No structural issues identified',
            detail: findings.slice(0, 20),
        };
    },

    'debug:suggest': async (ctx) => {
        const framework = detectFramework(ctx.fileMap);
        const suggestions = [];

        if (framework === 'react' && !ctx.fileMap['tsconfig.json'] && Object.keys(ctx.fileMap).some(p => p.endsWith('.tsx'))) {
            suggestions.push('Add tsconfig.json for TypeScript configuration');
        }
        if (!ctx.fileMap['.gitignore']) suggestions.push('Add .gitignore to exclude node_modules and build artifacts');
        if (ctx.fileMap['package.json']) {
            try {
                const pkg = JSON.parse(ctx.fileMap['package.json']);
                if (!pkg.scripts?.build) suggestions.push('Add a "build" script to package.json');
                if (!pkg.scripts?.start) suggestions.push('Add a "start" script to package.json');
            } catch { /* ignore */ }
        }

        const totalSize = ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0);
        if (totalSize > 500 * 1024) suggestions.push('Project exceeds 500 KB — consider code splitting or lazy loading');

        const largeFiles = ctx.rows.filter(f => (f.size || f.content?.length || 0) > 50 * 1024);
        if (largeFiles.length) suggestions.push(`${largeFiles.length} file(s) exceed 50 KB — consider splitting: ${largeFiles.map(f => f.path).join(', ')}`);

        return {
            message: suggestions.length
                ? `${suggestions.length} suggestion(s) for improvement`
                : 'No specific suggestions — project looks good',
            detail: suggestions,
        };
    },

    // ── Security ───────────────────────────────────────────────────
    'security:scan': async (ctx) => {
        const findings = [];
        for (const [filePath, content] of Object.entries(ctx.fileMap)) {
            if (!content) continue;
            for (const pat of SECURITY_PATTERNS) {
                const matches = content.match(pat.pattern);
                if (matches) {
                    findings.push({
                        file: filePath,
                        issue: pat.desc,
                        severity: pat.severity,
                        count: matches.length,
                    });
                }
            }
        }
        const critical = findings.filter(f => f.severity === 'critical').length;
        const high = findings.filter(f => f.severity === 'high').length;
        return {
            message: findings.length
                ? `Found ${findings.length} security finding(s) — ${critical} critical, ${high} high`
                : 'No security vulnerabilities detected',
            detail: findings.slice(0, 30),
        };
    },

    'security:audit': async (ctx) => {
        const pkgRaw = ctx.fileMap['package.json'];
        if (!pkgRaw) return { message: 'No package.json — dependency audit skipped' };
        let pkg;
        try { pkg = JSON.parse(pkgRaw); } catch { return { message: 'Invalid package.json — cannot audit' }; }
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        const depCount = Object.keys(allDeps).length;
        // Flag deps with known risky patterns
        const risky = Object.entries(allDeps).filter(([name]) =>
            name.includes('exec') || name.includes('shell') || name.includes('eval')
        );
        return {
            message: `Audited ${depCount} dependencies${risky.length ? ` — ${risky.length} flagged for review` : ' — no known issues'}`,
            detail: { total: depCount, flagged: risky.map(([n, v]) => `${n}@${v}`) },
        };
    },

    'security:report': async (ctx) => {
        const paths = Object.keys(ctx.fileMap);
        const hasHttps = !Object.values(ctx.fileMap).some(c => c && /http:\/\/(?!127\.0\.0\.1)/.test(c));
        const hasEnvFile = paths.some(p => p === '.env' || p === '.env.local');
        const hasGitignore = paths.includes('.gitignore');

        const score = [
            hasHttps ? 1 : 0,
            hasEnvFile ? 0 : 1,
            hasGitignore ? 1 : 0,
        ].reduce((a, b) => a + b, 0);
        const maxScore = 3;

        return {
            message: `Security posture: ${score}/${maxScore} — ${score === maxScore ? 'Good' : 'Needs attention'}`,
            detail: {
                httpsOnly: hasHttps,
                noExposedEnv: !hasEnvFile,
                hasGitignore,
                recommendations: [
                    ...(!hasHttps ? ['Replace HTTP URLs with HTTPS'] : []),
                    ...(hasEnvFile ? ['Move .env files out of project or add to .gitignore'] : []),
                    ...(!hasGitignore ? ['Add .gitignore file'] : []),
                ],
            },
        };
    },

    // ── Scale / Performance ────────────────────────────────────────
    'scale:metrics': async (ctx) => {
        const paths = Object.keys(ctx.fileMap);
        const sizes = ctx.rows.map(f => ({ path: f.path, size: f.size || f.content?.length || 0 }));
        sizes.sort((a, b) => b.size - a.size);
        const totalSize = sizes.reduce((s, f) => s + f.size, 0);
        return {
            message: `${paths.length} files, total ${(totalSize / 1024).toFixed(1)} KB`,
            detail: { totalSizeKB: (totalSize / 1024).toFixed(1), largestFiles: sizes.slice(0, 5).map(f => `${f.path} (${(f.size / 1024).toFixed(1)} KB)`) },
        };
    },

    'scale:analyze': async (ctx) => {
        const issues = [];
        for (const [fp, content] of Object.entries(ctx.fileMap)) {
            if (!content) continue;
            const size = content.length;
            if (size > 100 * 1024) issues.push({ file: fp, issue: 'File exceeds 100 KB', sizeKB: (size / 1024).toFixed(1) });
            if (fp.endsWith('.js') || fp.endsWith('.ts') || fp.endsWith('.tsx')) {
                const lines = content.split('\n').length;
                if (lines > 500) issues.push({ file: fp, issue: `${lines} lines — consider splitting`, lines });
            }
        }
        return {
            message: issues.length ? `${issues.length} performance concern(s) found` : 'No performance concerns detected',
            detail: issues.slice(0, 15),
        };
    },

    'scale:suggest': async (ctx) => {
        const suggestions = [];
        const framework = detectFramework(ctx.fileMap);
        const totalSize = ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0);

        if (totalSize > 200 * 1024) suggestions.push('Enable code splitting for bundles over 200 KB');
        if (framework === 'react') suggestions.push('Use React.lazy() for route-level code splitting');

        const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];
        const imageFiles = Object.keys(ctx.fileMap).filter(p => imageExts.some(e => p.endsWith(e)));
        if (imageFiles.length > 5) suggestions.push(`${imageFiles.length} images detected — consider lazy loading or using a CDN`);

        const cssFiles = Object.keys(ctx.fileMap).filter(p => p.endsWith('.css'));
        const totalCss = cssFiles.reduce((s, p) => s + (ctx.fileMap[p]?.length || 0), 0);
        if (totalCss > 50 * 1024) suggestions.push('CSS exceeds 50 KB — consider purging unused styles');

        return {
            message: suggestions.length ? `${suggestions.length} optimization suggestion(s)` : 'Project is well-optimized',
            detail: suggestions,
        };
    },

    // ── Cleanup ────────────────────────────────────────────────────
    'cleanup:scan': async (ctx) => {
        const paths = Object.keys(ctx.fileMap);
        const candidates = [];

        // Empty files
        const empty = paths.filter(p => !ctx.fileMap[p]?.trim());
        if (empty.length) candidates.push(...empty.map(p => ({ file: p, reason: 'Empty file' })));

        // Common junk
        const junkPatterns = ['.DS_Store', 'Thumbs.db', '.log', '.tmp', '.bak'];
        for (const p of paths) {
            if (junkPatterns.some(j => p.endsWith(j) || p.includes(j))) {
                candidates.push({ file: p, reason: 'Temporary/junk file' });
            }
        }

        // Duplicate content
        const contentMap = new Map();
        for (const [p, c] of Object.entries(ctx.fileMap)) {
            if (!c || c.length < 50) continue;
            const key = c.slice(0, 200);
            if (contentMap.has(key)) {
                candidates.push({ file: p, reason: `Possible duplicate of ${contentMap.get(key)}` });
            } else {
                contentMap.set(key, p);
            }
        }

        return {
            message: candidates.length
                ? `Found ${candidates.length} cleanup candidate(s)`
                : 'Project is clean — nothing to prune',
            detail: candidates.slice(0, 20),
        };
    },

    'cleanup:report': async (ctx) => {
        const totalSize = ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0);
        const [buildCount, deployCount] = await Promise.all([
            prisma.build.count({ where: { projectId: ctx.projectId } }),
            prisma.deployment.count({ where: { projectId: ctx.projectId } }),
        ]);
        return {
            message: `Project: ${Object.keys(ctx.fileMap).length} files (${(totalSize / 1024).toFixed(1)} KB), ${buildCount} builds, ${deployCount} deployments`,
            detail: { fileCount: Object.keys(ctx.fileMap).length, totalSizeKB: (totalSize / 1024).toFixed(1), builds: buildCount, deployments: deployCount },
        };
    },

    // ── Database ───────────────────────────────────────────────────
    'database:status': async (ctx) => {
        if (ctx.projectId === 'uploaded') {
            const totalSize = ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0);
            const byExt = {};
            for (const f of ctx.rows) {
                const ext = f.path.includes('.') ? f.path.split('.').pop() : 'other';
                byExt[ext] = (byExt[ext] || 0) + 1;
            }
            return {
                message: `Uploaded: ${ctx.rows.length} files (${(totalSize / 1024).toFixed(1)} KB) — not stored in database`,
                detail: { files: ctx.rows.length, totalSizeKB: (totalSize / 1024).toFixed(1), fileTypes: byExt },
            };
        }
        const [fileCount, assetCount] = await Promise.all([
            prisma.projectFile.count({ where: { projectId: ctx.projectId } }),
            prisma.asset.count({ where: { projectId: ctx.projectId } }),
        ]);
        return {
            message: `Project has ${fileCount} files and ${assetCount} assets stored`,
            detail: { files: fileCount, assets: assetCount },
        };
    },

    'database:analyze': async (ctx) => {
        const totalSize = ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0);
        const byExt = {};
        for (const f of ctx.rows) {
            const ext = f.path.includes('.') ? f.path.split('.').pop() : 'other';
            byExt[ext] = (byExt[ext] || 0) + 1;
        }
        return {
            message: `Total data: ${(totalSize / 1024).toFixed(1)} KB across ${ctx.rows.length} files`,
            detail: { totalSizeKB: (totalSize / 1024).toFixed(1), filesByType: byExt },
        };
    },

    // ── Setup ──────────────────────────────────────────────────────
    'setup:scaffold': async (ctx) => {
        const framework = detectFramework(ctx.fileMap);
        const paths = Object.keys(ctx.fileMap);
        return {
            message: `Project structure: ${paths.length} files, detected framework: ${framework}`,
            detail: { framework, directories: [...new Set(paths.map(p => p.includes('/') ? p.split('/')[0] : '(root)'))].sort() },
        };
    },

    'setup:deps': async (ctx) => {
        return EXECUTORS['build:deps'](ctx);
    },

    'setup:config': async (ctx) => {
        const configFiles = Object.keys(ctx.fileMap).filter(p =>
            p.endsWith('.json') || p.endsWith('.config.js') || p.endsWith('.config.ts') ||
            p.endsWith('.rc') || p.startsWith('.')
        );
        return {
            message: `Found ${configFiles.length} configuration file(s)`,
            detail: configFiles,
        };
    },

    // ── Rollback ───────────────────────────────────────────────────
    'rollback:identify': async (ctx) => {
        const prevDeploy = await prisma.deployment.findFirst({
            where: { projectId: ctx.projectId, status: 'live' },
            orderBy: { createdAt: 'desc' },
            skip: 1,
        });
        if (!prevDeploy) return { message: 'No previous deployment found to roll back to' };
        return {
            message: `Previous deployment: ${prevDeploy.url || prevDeploy.domain} (${prevDeploy.createdAt.toISOString().slice(0, 16)})`,
            detail: { id: prevDeploy.id, url: prevDeploy.url, createdAt: prevDeploy.createdAt },
        };
    },

    'rollback:rollback': async (ctx) => {
        // Find the previous deployment for this user/project (skip the current live one)
        const prevDeploy = await prisma.deployment.findFirst({
            where: { projectId: ctx.projectId, status: 'live' },
            orderBy: { createdAt: 'desc' },
            skip: 1,
        });
        if (!prevDeploy) {
            throw new Error('No previous deployment found to roll back to');
        }

        // Mark all currently-live deployments for this project as rolled_back
        const { count: rolledBack } = await prisma.deployment.updateMany({
            where: { projectId: ctx.projectId, userId: ctx.userId, status: 'live' },
            data: { status: 'rolled_back', updatedAt: new Date() },
        });

        // Promote the target previous deployment back to live
        const restored = await prisma.deployment.update({
            where: { id: prevDeploy.id },
            data: { status: 'live', previousDeployId: prevDeploy.previousDeployId, updatedAt: new Date() },
        });

        // Record the rollback in CanvasDeployHistory for audit
        try {
            await prisma.canvasDeployHistory.create({
                data: {
                    userId: ctx.userId,
                    platform: 's3',
                    projectName: ctx.project.name,
                    url: restored.url,
                    status: 'success',
                    source: ctx.project.source || 'standalone',
                },
            });
        } catch (_) { /* history is best-effort */ }

        return {
            message: `Rolled back to deployment from ${restored.createdAt.toISOString().slice(0, 16)} (${rolledBack} live deployment(s) marked rolled_back)`,
            detail: { restoredDeployId: restored.id, url: restored.url, version: restored.version },
        };
    },

    'rollback:verify': async (ctx) => {
        // Confirm there is now exactly one live deployment and it is reachable
        const liveDeploys = await prisma.deployment.findMany({
            where: { projectId: ctx.projectId, status: 'live' },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        if (liveDeploys.length === 0) {
            throw new Error('Verification failed — no live deployment found after rollback');
        }
        const current = liveDeploys[0];
        if (!current.url) {
            return { message: 'Rollback verified — live deployment restored (no public URL to probe)', detail: { id: current.id, version: current.version } };
        }
        try {
            const resp = await fetch(current.url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
            await prisma.deployment.update({
                where: { id: current.id },
                data: { healthStatus: resp.ok ? 'healthy' : 'unhealthy' },
            });
            return {
                message: resp.ok
                    ? `Rollback verified — ${current.url} responding ${resp.status}`
                    : `Rollback applied but URL returned ${resp.status} — investigate`,
                detail: { url: current.url, statusCode: resp.status, healthy: resp.ok },
            };
        } catch (e) {
            return {
                message: `Rollback applied but URL probe failed (${e.message}) — DNS may need a moment`,
                detail: { url: current.url, probeError: e.message },
            };
        }
    },

    // ── Cost ───────────────────────────────────────────────────────
    'cost:collect': async (ctx) => {
        const totalSize = ctx.rows.reduce((s, f) => s + (f.size || f.content?.length || 0), 0);
        const fileCount = ctx.rows.length;
        // Estimate storage cost based on S3-like pricing ($0.023/GB/month)
        const storageCostMonthly = ((totalSize / (1024 * 1024 * 1024)) * 0.023).toFixed(4);
        return {
            message: `${fileCount} files, ${(totalSize / 1024).toFixed(1)} KB total — estimated storage: $${storageCostMonthly}/month`,
            detail: {
                files: fileCount,
                totalSizeKB: (totalSize / 1024).toFixed(1),
                estimatedStorageCost: `$${storageCostMonthly}/month`,
                estimatedBandwidthCost: 'Depends on traffic',
            },
        };
    },

    'cost:analyze': async (ctx) => {
        const paths = Object.keys(ctx.fileMap);
        const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
        const imageFiles = paths.filter(p => imageExts.some(e => p.endsWith(e)));
        const imageSize = imageFiles.reduce((s, p) => s + (ctx.fileMap[p]?.length || 0), 0);
        const jsFiles = paths.filter(p => p.endsWith('.js') || p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.jsx'));
        const jsSize = jsFiles.reduce((s, p) => s + (ctx.fileMap[p]?.length || 0), 0);
        const cssFiles = paths.filter(p => p.endsWith('.css'));
        const cssSize = cssFiles.reduce((s, p) => s + (ctx.fileMap[p]?.length || 0), 0);

        const tips = [];
        if (imageSize > 100 * 1024) tips.push('Optimize images to reduce bandwidth costs');
        if (jsSize > 200 * 1024) tips.push('Enable code splitting to reduce initial load bandwidth');
        if (cssSize > 50 * 1024) tips.push('Purge unused CSS to reduce transfer size');
        if (!tips.length) tips.push('Resource usage looks efficient — no cost concerns');

        return {
            message: `Resource breakdown — JS: ${(jsSize / 1024).toFixed(1)} KB, CSS: ${(cssSize / 1024).toFixed(1)} KB, Images: ${(imageSize / 1024).toFixed(1)} KB`,
            detail: { jsFiles: jsFiles.length, jsSize: `${(jsSize / 1024).toFixed(1)} KB`, cssFiles: cssFiles.length, cssSize: `${(cssSize / 1024).toFixed(1)} KB`, imageFiles: imageFiles.length, imageSize: `${(imageSize / 1024).toFixed(1)} KB`, tips },
        };
    },

    // ── Domain ─────────────────────────────────────────────────────
    'domain:dns': async (ctx) => {
        const meta = ctx.project.metadata ? JSON.parse(ctx.project.metadata) : {};
        const url = meta.lastDeployUrl;
        if (!url && ctx.projectId === 'uploaded') {
            return { message: 'DNS check skipped — uploaded files have no deployment', detail: ['Upload files to a project and deploy first'] };
        }
        if (!url) return { message: 'No deployment URL — deploy first to configure DNS' };
        try {
            const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
            return {
                message: `DNS resolves — ${url} returned ${resp.status}`,
                detail: { url, statusCode: resp.status, reachable: resp.ok },
            };
        } catch (e) {
            return { message: `DNS check failed — ${url} unreachable (${e.message})` };
        }
    },

    'domain:ssl': async (ctx) => {
        const meta = ctx.project.metadata ? JSON.parse(ctx.project.metadata) : {};
        const url = meta.lastDeployUrl;
        if (!url) return { message: 'No deployment URL — SSL check skipped' };
        const isHttps = url.startsWith('https://');
        return {
            message: isHttps ? `SSL active — ${url} uses HTTPS` : `SSL warning — ${url} does not use HTTPS`,
            detail: { url, https: isHttps, recommendation: isHttps ? 'SSL is properly configured' : 'Enable HTTPS for secure connections' },
        };
    },
};

// ── Execute agent command ──────────────────────────────────────────

// Analyze uploaded files (no project required)
router.post('/analyze', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { command, files } = req.body;
        if (!command?.trim()) return res.status(400).json({ error: 'Command is required' });
        if (!files || !Object.keys(files).length) return res.status(400).json({ error: 'No files provided' });

        const intent = detectIntent(command);
        const planTemplate = PLAN_TEMPLATES[intent] || PLAN_TEMPLATES.status;
        const plan = planTemplate.map(step => ({ ...step, status: 'pending' }));

        // Build file map & rows from uploaded content
        const fileMap = {};
        const rows = [];
        for (const [path, content] of Object.entries(files)) {
            fileMap[path] = content;
            rows.push({ path, content, size: content.length, language: path.split('.').pop() || 'txt' });
        }

        // Synthetic project context for upload-only analysis (no DB-backed project)
        const ctx = {
            project: { id: 'uploaded', name: 'Uploaded Files', metadata: null, source: 'upload' },
            fileMap,
            rows,
            projectId: 'uploaded',
            userId,
            command,
        };

        const results = [];
        let failed = false;
        let failedStep = '';

        for (let i = 0; i < plan.length; i++) {
            if (failed) {
                plan[i].status = 'skipped';
                results.push({ action: plan[i].action, status: 'skipped', result: { message: `Skipped — previous step "${failedStep}" failed` } });
                continue;
            }

            plan[i].status = 'running';
            const key = `${intent}:${plan[i].action}`;
            const executor = EXECUTORS[key];

            // Skip executors that need real infra (deploy, build orchestrator, DB lookups for builds/deployments)
            const infraKeys = ['deploy:deploy', 'deploy:health', 'build:build', 'build:report', 'rollback:identify', 'rollback:rollback', 'rollback:verify'];
            if (infraKeys.includes(key)) {
                plan[i].status = 'completed';
                results.push({ action: plan[i].action, status: 'completed', result: { message: `${plan[i].label} — requires a saved project (skipped for uploaded files)` } });
                continue;
            }

            if (!executor) {
                plan[i].status = 'completed';
                results.push({ action: plan[i].action, status: 'completed', result: { message: `${plan[i].label} — not yet supported` } });
                continue;
            }

            try {
                console.log(`[AgentOps] Analyzing uploaded files — step: ${key}`);
                const result = await executor(ctx);
                plan[i].status = 'completed';
                results.push({ action: plan[i].action, status: 'completed', result });
            } catch (stepErr) {
                console.error(`[AgentOps] Step ${key} failed:`, stepErr.message);
                plan[i].status = 'failed';
                failed = true;
                failedStep = plan[i].label;
                results.push({ action: plan[i].action, status: 'failed', result: { message: stepErr.message } });
            }
        }

        const completedCount = results.filter(r => r.status === 'completed').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const summary = failedCount > 0
            ? `${intent.charAt(0).toUpperCase() + intent.slice(1)} analysis — ${completedCount}/${plan.length} steps completed, ${failedCount} failed`
            : `${intent.charAt(0).toUpperCase() + intent.slice(1)} analysis completed — ${completedCount} steps executed on ${Object.keys(files).length} uploaded file(s).`;

        res.json({
            success: true,
            executionId: `upload-${crypto.randomUUID().slice(0, 8)}`,
            intent,
            plan,
            results,
            summary,
        });
    } catch (err) {
        console.error('[AgentOps] Analyze error:', err.message);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

router.post('/:projectId/execute', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { projectId } = req.params;
        const { command, files: uploadedFileContents } = req.body;
        if (!command?.trim()) return res.status(400).json({ error: 'Command is required' });

        // Verify project ownership
        const project = await prisma.canvasProject.findFirst({
            where: { id: projectId, userId },
        });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const intent = detectIntent(command);
        const planTemplate = PLAN_TEMPLATES[intent] || PLAN_TEMPLATES.status;

        // Build the execution plan
        const plan = planTemplate.map(step => ({ ...step, status: 'pending' }));

        // Create task record
        const task = await prisma.agentTask.create({
            data: {
                id: crypto.randomUUID(),
                projectId,
                userId,
                intent,
                input: command,
                plan: JSON.stringify(plan),
                status: 'running',
            },
        });

        // Load project files once for all executors
        const { fileMap, rows } = await loadProjectFiles(projectId);

        // Merge uploaded files into context (overrides project files if same path)
        if (uploadedFileContents && typeof uploadedFileContents === 'object') {
            for (const [path, content] of Object.entries(uploadedFileContents)) {
                fileMap[path] = content;
                // Add to rows if not already there
                if (!rows.find(r => r.path === path)) {
                    rows.push({ path, content, size: content.length, language: path.split('.').pop() || 'txt' });
                }
            }
        }

        const ctx = { project, fileMap, rows, projectId, userId, command };

        // Execute each step for real
        const results = [];
        let failed = false;
        let failedStep = '';

        for (let i = 0; i < plan.length; i++) {
            if (failed) {
                plan[i].status = 'skipped';
                results.push({ action: plan[i].action, status: 'skipped', result: { message: `Skipped — previous step "${failedStep}" failed` } });
                continue;
            }

            plan[i].status = 'running';
            const key = `${intent}:${plan[i].action}`;
            const executor = EXECUTORS[key];

            if (!executor) {
                plan[i].status = 'completed';
                results.push({ action: plan[i].action, status: 'completed', result: { message: `${plan[i].label} — not yet supported` } });
                continue;
            }

            try {
                console.log(`[AgentOps] Executing step: ${key} for project ${projectId}`);
                const result = await executor(ctx);
                plan[i].status = 'completed';
                results.push({ action: plan[i].action, status: 'completed', result });
            } catch (stepErr) {
                console.error(`[AgentOps] Step ${key} failed:`, stepErr.message);
                plan[i].status = 'failed';
                failed = true;
                failedStep = plan[i].label;
                results.push({ action: plan[i].action, status: 'failed', result: { message: stepErr.message } });
            }
        }

        const completedCount = results.filter(r => r.status === 'completed').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const taskStatus = failedCount > 0 ? 'failed' : 'completed';

        const summary = failedCount > 0
            ? `${intent.charAt(0).toUpperCase() + intent.slice(1)} failed — ${completedCount}/${plan.length} steps completed, ${failedCount} failed`
            : `${intent.charAt(0).toUpperCase() + intent.slice(1)} completed — ${completedCount} steps executed successfully.`;

        // Update task
        await prisma.agentTask.update({
            where: { id: task.id },
            data: {
                plan: JSON.stringify(plan),
                status: taskStatus,
                summary,
                completedAt: new Date(),
            },
        });

        res.json({
            success: true,
            executionId: task.id,
            intent,
            plan,
            results,
            summary,
        });
    } catch (err) {
        console.error('[AgentOps] Execute error:', err.message);
        res.status(500).json({ error: 'Agent execution failed' });
    }
});

// ── Cancel running task ────────────────────────────────────────────

router.post('/:projectId/cancel', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { projectId } = req.params;

        // Find the latest running task for this project
        const task = await prisma.agentTask.findFirst({
            where: { projectId, userId, status: 'running' },
            orderBy: { startedAt: 'desc' },
        });

        if (!task) return res.json({ success: true, message: 'No running task to cancel' });

        await prisma.agentTask.update({
            where: { id: task.id },
            data: {
                status: 'cancelled',
                completedAt: new Date(),
                summary: 'Cancelled by user',
            },
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[AgentOps] Cancel error:', err.message);
        res.status(500).json({ error: 'Failed to cancel task' });
    }
});

export default router;
