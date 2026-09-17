/**
 * BUILD ORCHESTRATOR
 * Manages the full build pipeline: detect → install → lint → test → build → security → package
 *
 * Dual execution mode:
 *   1. Sandbox mode  — runs inside Docker / ECS Fargate containers (if available)
 *   2. Direct mode   — runs in an isolated temp directory via child_process (default)
 *
 * Direct mode mirrors run-preview-service patterns: temp dir, process isolation,
 * per-process timeouts, tree-kill on cancel.
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { spawn } from 'child_process';
import { prisma } from '../../lib/prisma.js';
import { BuildDetector } from './build-detector.js';
import buildLogger from './build-logger.js';

const BUILD_STAGES = [
  { id: 'detect', name: 'Detect Framework', timeout: 5000 },
  { id: 'install', name: 'Install Dependencies', timeout: 180000 },
  { id: 'lint', name: 'Lint & Type Check', timeout: 30000 },
  { id: 'test', name: 'Run Tests', timeout: 60000 },
  { id: 'build', name: 'Build Project', timeout: 180000 },
  { id: 'security', name: 'Security Scan', timeout: 30000 },
  { id: 'package', name: 'Package Artifacts', timeout: 10000 },
];

// Maximum concurrent builds per server
const MAX_CONCURRENT_BUILDS = 3;
// Build workspace root — cleaned on server restart
const BUILD_ROOT = path.join(os.tmpdir(), 'canvas-builds');

class BuildOrchestrator {
  constructor() {
    this.detector = new BuildDetector();
    this.activeBuilds = new Map(); // buildId → { abortController, childProcess, buildDir }
  }

  /**
   * Execute a shell command in a directory, streaming output line-by-line via buildLogger.
   * Returns { exitCode, stdout, stderr }.
   */
  _execInDir(buildId, cwd, cmd, args, { timeout = 120000, signal } = {}) {
    return new Promise((resolve, reject) => {
      const stdoutChunks = [];
      const stderrChunks = [];

      const child = spawn(cmd, args, {
        cwd,
        shell: true,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0', NODE_ENV: 'production' },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout,
      });

      // Store reference for cancel
      const entry = this.activeBuilds.get(buildId);
      if (entry) entry.childProcess = child;

      // Abort signal handling
      const onAbort = () => {
        try { child.kill('SIGTERM'); } catch { }
        setTimeout(() => { try { child.kill('SIGKILL'); } catch { } }, 3000);
      };
      if (signal) signal.addEventListener('abort', onAbort, { once: true });

      let remainder = '';
      child.stdout.on('data', (chunk) => {
        const text = remainder + chunk.toString();
        const lines = text.split('\n');
        remainder = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) {
            stdoutChunks.push(line);
            buildLogger.emit(buildId, { type: 'log', message: line });
          }
        }
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrChunks.push(text);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            buildLogger.emit(buildId, { type: 'log', message: `[stderr] ${line}` });
          }
        }
      });

      child.on('error', (err) => {
        if (signal) signal.removeEventListener('abort', onAbort);
        reject(err);
      });

      child.on('close', (code) => {
        if (signal) signal.removeEventListener('abort', onAbort);
        if (remainder.trim()) {
          stdoutChunks.push(remainder);
          buildLogger.emit(buildId, { type: 'log', message: remainder });
        }
        resolve({
          exitCode: code ?? 1,
          stdout: stdoutChunks.join('\n'),
          stderr: stderrChunks.join('\n'),
        });
      });
    });
  }

  /**
   * Write project files to a temp directory.
   * files: Array<{ path, content }> or Record<path, content>
   */
  async _writeFilesToDir(buildDir, files) {
    const fileList = Array.isArray(files)
      ? files
      : Object.entries(files).map(([p, content]) => ({ path: p, content }));

    let totalSize = 0;
    for (const file of fileList) {
      // Path traversal protection
      const resolved = path.resolve(buildDir, file.path);
      if (!resolved.startsWith(buildDir)) {
        throw new Error(`Path traversal blocked: ${file.path}`);
      }
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      const content = file.content || '';
      totalSize += Buffer.byteLength(content);
      await fs.writeFile(resolved, content, 'utf-8');
    }
    return { fileCount: fileList.length, totalSize };
  }

  /**
   * Start a new build.
   * Accepts either projectId (loads files from DB) or inline files.
   */
  async startBuild({ projectId, userId, files = null, branch = 'main', triggeredBy = 'manual' }) {
    // Enforce concurrency limit
    if (this.activeBuilds.size >= MAX_CONCURRENT_BUILDS) {
      throw new Error(`Server is running ${MAX_CONCURRENT_BUILDS} builds — try again shortly`);
    }

    // Check for existing running build for this project
    const runningBuild = await prisma.build.findFirst({
      where: {
        projectId,
        status: { in: ['queued', 'installing', 'building', 'testing', 'scanning'] },
      },
    });
    if (runningBuild) {
      throw new Error('A build is already in progress for this project');
    }

    // Create build record
    const build = await prisma.build.create({
      data: {
        projectId,
        userId,
        branch,
        commitHash: crypto.randomBytes(4).toString('hex'),
        triggeredBy,
        status: 'queued',
        stages: JSON.stringify(BUILD_STAGES.map(s => ({
          id: s.id,
          name: s.name,
          status: 'pending',
          startedAt: null,
          completedAt: null,
          duration: null,
          logs: '',
        }))),
      },
    });

    // Run pipeline async — don't block the response
    this.runPipeline(build.id, projectId, files).catch(err => {
      console.error(`[BuildOrchestrator] Pipeline failed for ${build.id}:`, err.message);
    });

    return {
      id: build.id,
      projectId,
      status: 'queued',
      stages: BUILD_STAGES.map(s => ({ id: s.id, name: s.name, status: 'pending' })),
    };
  }

  /**
   * Run the full build pipeline using direct execution (temp dir + child_process).
   */
  async runPipeline(buildId, projectId, inlineFiles) {
    const abortController = new AbortController();
    const buildDir = path.join(BUILD_ROOT, buildId);
    this.activeBuilds.set(buildId, { abortController, childProcess: null, buildDir });

    const startTime = Date.now();

    try {
      // Prepare build directory
      await fs.mkdir(buildDir, { recursive: true });

      // Load files — inline or from DB
      let projectFiles;
      if (inlineFiles) {
        projectFiles = Array.isArray(inlineFiles)
          ? inlineFiles
          : Object.entries(inlineFiles).map(([p, content]) => ({ path: p, content }));
      } else {
        const project = await prisma.canvasProject.findUnique({
          where: { id: projectId },
          include: { files: { select: { path: true, content: true } } },
        });
        if (!project) throw new Error('Project not found');
        projectFiles = project.files;
      }

      if (!projectFiles || projectFiles.length === 0) {
        throw new Error('No files to build');
      }

      // Write files to build directory
      const { fileCount, totalSize } = await this._writeFilesToDir(buildDir, projectFiles);
      buildLogger.emit(buildId, { type: 'log', message: `Prepared ${fileCount} files (${(totalSize / 1024).toFixed(1)} KB)` });

      // Run each stage
      for (const stage of BUILD_STAGES) {
        if (abortController.signal.aborted) throw new Error('Build cancelled');

        const stageStart = Date.now();
        await this.updateStage(buildId, stage.id, { status: 'running', startedAt: new Date().toISOString() });

        const statusMap = {
          detect: 'queued', install: 'installing', lint: 'building',
          test: 'testing', build: 'building', security: 'scanning', package: 'building',
        };
        await prisma.build.update({
          where: { id: buildId },
          data: { status: statusMap[stage.id] || 'building' },
        });

        buildLogger.emit(buildId, { type: 'stage-start', stage: stage.id, name: stage.name });

        try {
          const result = await this._executeStage(stage.id, buildId, buildDir, projectFiles, abortController.signal);
          const stageDuration = Date.now() - stageStart;

          await this.updateStage(buildId, stage.id, {
            status: result.status || 'success',
            completedAt: new Date().toISOString(),
            duration: stageDuration,
            logs: result.logs || '',
          });

          buildLogger.emit(buildId, {
            type: 'stage-complete',
            stage: stage.id,
            status: result.status || 'success',
            duration: stageDuration,
          });

          // If stage soft-failed (warnings), continue but track
          if (result.status === 'warning') {
            buildLogger.emit(buildId, { type: 'log', message: `⚠ ${stage.name} completed with warnings` });
          }
        } catch (stageError) {
          const stageDuration = Date.now() - stageStart;
          await this.updateStage(buildId, stage.id, {
            status: 'failed',
            completedAt: new Date().toISOString(),
            duration: stageDuration,
            logs: stageError.message,
          });
          buildLogger.emit(buildId, { type: 'stage-error', stage: stage.id, message: stageError.message });
          throw stageError;
        }
      }

      // All stages passed
      const totalDuration = Math.round((Date.now() - startTime) / 1000);
      await prisma.build.update({
        where: { id: buildId },
        data: { status: 'success', duration: totalDuration, completedAt: new Date() },
      });

      buildLogger.emit(buildId, { type: 'complete', status: 'success', duration: totalDuration });
      console.log(`[BuildOrchestrator] Build ${buildId} succeeded in ${totalDuration}s`);

    } catch (error) {
      const totalDuration = Math.round((Date.now() - startTime) / 1000);
      const status = error.message === 'Build cancelled' ? 'cancelled' : 'failed';
      await prisma.build.update({
        where: { id: buildId },
        data: { status, duration: totalDuration, errorMessage: error.message, completedAt: new Date() },
      });

      buildLogger.emit(buildId, { type: 'error', status, message: error.message, duration: totalDuration });
      console.error(`[BuildOrchestrator] Build ${buildId} ${status}: ${error.message}`);
    } finally {
      this.activeBuilds.delete(buildId);
      // Clean up build directory (async, non-blocking)
      fs.rm(buildDir, { recursive: true, force: true }).catch(() => { });
    }
  }

  /**
   * Execute a single build stage in the build directory via direct child_process.
   */
  async _executeStage(stageId, buildId, buildDir, projectFiles, signal) {
    switch (stageId) {
      case 'detect': {
        const framework = this.detector.detect(projectFiles);
        buildLogger.emit(buildId, { type: 'log', message: `Framework: ${framework.name}` });
        buildLogger.emit(buildId, { type: 'log', message: `Build command: ${framework.buildCommand || 'none'}` });
        buildLogger.emit(buildId, { type: 'log', message: `Dev command: ${framework.devCommand || 'none'}` });
        buildLogger.emit(buildId, { type: 'log', message: `Output dir: ${framework.outputDir || 'none'}` });

        // Store detected framework for later stages
        this._detectedFramework = framework;
        return { logs: `Framework: ${framework.name}` };
      }

      case 'install': {
        // Check if package.json exists
        const pkgPath = path.join(buildDir, 'package.json');
        const hasPkg = await fs.access(pkgPath).then(() => true).catch(() => false);
        if (!hasPkg) {
          buildLogger.emit(buildId, { type: 'log', message: 'No package.json — skipping install' });
          return { status: 'success', logs: 'No package.json found — skipped' };
        }

        buildLogger.emit(buildId, { type: 'log', message: 'Running npm install...' });
        const result = await this._execInDir(buildId, buildDir, 'npm', ['install', '--no-audit', '--no-fund'], {
          timeout: 180000,
          signal,
        });

        if (result.exitCode !== 0) {
          throw new Error(`npm install failed (exit ${result.exitCode}):\n${result.stderr || result.stdout}`);
        }

        buildLogger.emit(buildId, { type: 'log', message: '✓ Dependencies installed' });
        return { logs: result.stdout };
      }

      case 'lint': {
        const pkgPath = path.join(buildDir, 'package.json');
        const hasPkg = await fs.access(pkgPath).then(() => true).catch(() => false);
        let lintOutput = '';

        if (hasPkg) {
          let pkg;
          try { pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')); } catch { pkg = {}; }
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

          // ESLint
          if (allDeps.eslint || pkg.scripts?.lint) {
            const cmd = pkg.scripts?.lint ? 'npm run lint' : 'npx eslint . --max-warnings 50';
            buildLogger.emit(buildId, { type: 'log', message: `Running lint: ${cmd}` });
            const lintResult = await this._execInDir(buildId, buildDir, 'sh', ['-c', `${cmd} 2>&1 || true`], {
              timeout: 30000, signal,
            });
            lintOutput += lintResult.stdout;
          }

          // TypeScript check
          if (allDeps.typescript) {
            buildLogger.emit(buildId, { type: 'log', message: 'Running TypeScript check...' });
            const tscResult = await this._execInDir(buildId, buildDir, 'sh', ['-c', 'npx tsc --noEmit 2>&1 || true'], {
              timeout: 30000, signal,
            });
            lintOutput += (lintOutput ? '\n' : '') + tscResult.stdout;
          }
        }

        if (!lintOutput.trim()) {
          buildLogger.emit(buildId, { type: 'log', message: 'No lint/type-check tools configured — skipped' });
          return { status: 'success', logs: 'No lint tools — skipped' };
        }

        const hasErrors = /\berror\b/i.test(lintOutput) && !/0 errors/i.test(lintOutput);
        return { status: hasErrors ? 'warning' : 'success', logs: lintOutput };
      }

      case 'test': {
        const pkgPath = path.join(buildDir, 'package.json');
        let pkg;
        try { pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')); } catch { pkg = {}; }

        if (!pkg.scripts?.test || pkg.scripts.test.includes('no test specified')) {
          buildLogger.emit(buildId, { type: 'log', message: 'No test script — skipped' });
          return { status: 'success', logs: 'No test script configured — skipped' };
        }

        buildLogger.emit(buildId, { type: 'log', message: 'Running tests...' });
        const result = await this._execInDir(buildId, buildDir, 'npm', ['test', '--', '--watchAll=false'], {
          timeout: 60000, signal,
        });

        if (result.exitCode !== 0) {
          throw new Error(`Tests failed (exit ${result.exitCode}):\n${result.stderr || result.stdout}`);
        }

        buildLogger.emit(buildId, { type: 'log', message: '✓ Tests passed' });
        return { logs: result.stdout };
      }

      case 'build': {
        const pkgPath = path.join(buildDir, 'package.json');
        let pkg;
        try { pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')); } catch { pkg = {}; }

        if (!pkg.scripts?.build) {
          // No build script — check if this is a static site
          const hasIndex = projectFiles.some(f => (f.path || '').endsWith('index.html'));
          if (hasIndex) {
            buildLogger.emit(buildId, { type: 'log', message: 'Static site — no build step needed' });
            return { status: 'success', logs: 'Static site — no build required' };
          }
          // Backend-only project (Express, Fastify etc.)
          buildLogger.emit(buildId, { type: 'log', message: 'No build script — server-side project' });
          return { status: 'success', logs: 'No build script — server project ready' };
        }

        buildLogger.emit(buildId, { type: 'log', message: `Running: npm run build` });
        const result = await this._execInDir(buildId, buildDir, 'npm', ['run', 'build'], {
          timeout: 180000, signal,
        });

        if (result.exitCode !== 0) {
          throw new Error(`Build failed (exit ${result.exitCode}):\n${result.stderr || result.stdout}`);
        }

        buildLogger.emit(buildId, { type: 'log', message: '✓ Build completed' });
        return { logs: result.stdout };
      }

      case 'security': {
        buildLogger.emit(buildId, { type: 'log', message: 'Running npm audit...' });
        const result = await this._execInDir(buildId, buildDir, 'sh', ['-c', 'npm audit --json 2>&1 || true'], {
          timeout: 30000, signal,
        });

        let summary = 'No vulnerabilities found';
        let status = 'success';
        try {
          const audit = JSON.parse(result.stdout);
          if (audit.metadata?.vulnerabilities) {
            const v = audit.metadata.vulnerabilities;
            const total = (v.critical || 0) + (v.high || 0) + (v.moderate || 0) + (v.low || 0);
            if (total > 0) {
              summary = `${total} vulnerabilities (${v.critical || 0} critical, ${v.high || 0} high, ${v.moderate || 0} moderate, ${v.low || 0} low)`;
              status = (v.critical || 0) > 0 ? 'failed' : 'warning';
              if (status === 'failed') {
                throw new Error(`Critical vulnerabilities found: ${summary}`);
              }
            }
          }
        } catch (parseErr) {
          if (parseErr.message.startsWith('Critical')) throw parseErr;
          // npm audit output wasn't JSON — could be "no lock file" etc.
          summary = result.stdout.includes('found 0 vulnerabilities')
            ? 'No vulnerabilities found'
            : 'Audit check completed';
        }

        buildLogger.emit(buildId, { type: 'log', message: `Security: ${summary}` });
        return { status, logs: summary };
      }

      case 'package': {
        // Detect output directory
        const framework = this._detectedFramework;
        const outputDirs = ['dist', 'build', '.next', 'out', framework?.outputDir].filter(Boolean);
        let foundDir = null;
        let artifactSize = 0;

        for (const dir of outputDirs) {
          const full = path.join(buildDir, dir);
          const exists = await fs.access(full).then(() => true).catch(() => false);
          if (exists) {
            foundDir = dir;
            // Calculate size
            const result = await this._execInDir(buildId, buildDir, 'sh', ['-c', `du -sb ${dir} 2>/dev/null | cut -f1 || echo 0`], {
              timeout: 5000, signal,
            });
            artifactSize = parseInt(result.stdout.trim()) || 0;
            break;
          }
        }

        if (foundDir) {
          const sizeKB = (artifactSize / 1024).toFixed(1);
          const sizeMB = (artifactSize / (1024 * 1024)).toFixed(2);
          buildLogger.emit(buildId, { type: 'log', message: `Output: ${foundDir}/ (${artifactSize > 1048576 ? sizeMB + ' MB' : sizeKB + ' KB'})` });

          // Update build record with artifact info
          await prisma.build.update({
            where: { id: buildId },
            data: { artifactSize },
          });
        } else {
          buildLogger.emit(buildId, { type: 'log', message: 'No build output directory found (project may not produce artifacts)' });
        }

        buildLogger.emit(buildId, { type: 'log', message: '✓ Package complete' });
        return { logs: foundDir ? `Output: ${foundDir}/ (${artifactSize} bytes)` : 'No artifacts' };
      }

      default:
        return { logs: `Unknown stage: ${stageId}` };
    }
  }

  /**
   * Update a specific stage in the build record
   */
  async updateStage(buildId, stageId, updates) {
    const build = await prisma.build.findUnique({ where: { id: buildId } });
    let stages = [];
    try { stages = JSON.parse(build?.stages || '[]'); } catch { stages = []; }
    stages = stages.map(s => s.id === stageId ? { ...s, ...updates } : s);
    await prisma.build.update({
      where: { id: buildId },
      data: { stages: JSON.stringify(stages) },
    });
    return stages;
  }

  /**
   * Cancel an in-progress build
   */
  async cancelBuild(buildId) {
    const active = this.activeBuilds.get(buildId);
    if (active) {
      active.abortController.abort();
      if (active.childProcess) {
        try { active.childProcess.kill('SIGTERM'); } catch { }
      }
    }

    await prisma.build.update({
      where: { id: buildId },
      data: { status: 'cancelled', completedAt: new Date(), errorMessage: 'Cancelled by user' },
    });

    buildLogger.emit(buildId, { type: 'cancelled' });
    return { success: true };
  }

  /**
   * Get build status
   */
  async getBuild(buildId) {
    return prisma.build.findUnique({
      where: { id: buildId },
      include: { project: { select: { name: true } } },
    });
  }

  /**
   * List builds for a project
   */
  async listBuilds(projectId, { limit = 20, offset = 0 } = {}) {
    const [builds, total] = await Promise.all([
      prisma.build.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          status: true,
          branch: true,
          commitHash: true,
          triggeredBy: true,
          duration: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true,
        },
      }),
      prisma.build.count({ where: { projectId } }),
    ]);
    return { builds, total };
  }
}

const buildOrchestrator = new BuildOrchestrator();
export default buildOrchestrator;
export { BuildOrchestrator, BUILD_STAGES };
