/**
 * SANDBOX MANAGER
 * Orchestrates container lifecycle for isolated project environments
 * 
 * Dual mode:
 *   SANDBOX_MODE=docker → Local Docker containers (default, dev/small scale)
 *   SANDBOX_MODE=ecs    → AWS ECS Fargate (production, auto-scaling)
 * 
 * - Create/start/stop/destroy containers
 * - Resource limits (CPU/RAM/disk) per plan
 * - Auto-destroy on idle timeout
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { SandboxTemplates } from '../../../../packages/sandbox/sandbox-templates.js';
import { SandboxNetwork } from './sandbox-network.js';
import { SandboxStorage } from './sandbox-storage.js';

const execAsync = promisify(exec);

// ── Sandbox mode detection ─────────────────────────────────────────
const SANDBOX_MODE = process.env.SANDBOX_MODE || 'docker';

// ── Custom sandbox image override ────────────────────────────────
// When set, this image is used instead of the per-template default.
// Production: set to the app's own pre-built image (maula-sandbox-studio).
const SANDBOX_IMAGE_OVERRIDE = process.env.SANDBOX_IMAGE || null;

// Lazy-load ECS manager only when needed
let ecsSandboxManager = null;
async function getEcsManager() {
  if (!ecsSandboxManager) {
    const mod = await import('./ecs-sandbox-manager.js');
    ecsSandboxManager = mod.default;
  }
  return ecsSandboxManager;
}

// Plan-based resource limits
const PLAN_LIMITS = {
  weekly: {
    maxSandboxes: 2,
    memory: 256,       // MB
    cpu: 0.5,          // vCPU
    storage: 1024,     // MB
    idleTimeout: 30,   // minutes
  },
  monthly: {
    maxSandboxes: 5,
    memory: 512,
    cpu: 1,
    storage: 5120,
    idleTimeout: 60,
  },
  yearly: {
    maxSandboxes: 10,
    memory: 1024,
    cpu: 2,
    storage: 20480,
    idleTimeout: 120,
  },
};

class SandboxManager {
  constructor() {
    this.templates = new SandboxTemplates();
    this.network = new SandboxNetwork();
    this.storage = new SandboxStorage();
    this.cleanupInterval = null;
  }

  /**
   * Initialize the sandbox manager
   * - Detect mode (docker vs ecs)
   * - Start idle cleanup cron
   * - Verify availability
   */
  async init() {
    try {
      if (SANDBOX_MODE === 'ecs') {
        const ecs = await getEcsManager();
        const ready = await ecs.init();
        if (ready) {
          console.log('[SandboxManager] Running in ECS (cloud) mode');
          return;
        }
        console.warn('[SandboxManager] ECS init failed — falling back to Docker mode');
      }

      await this.verifyDocker();
      this.startCleanupCron();
      console.log(`[SandboxManager] Initialized in ${SANDBOX_MODE} mode`);
    } catch (error) {
      console.error('[SandboxManager] Init error:', error.message);
    }
  }

  /**
   * Check if running in ECS mode
   */
  isEcsMode() {
    return SANDBOX_MODE === 'ecs';
  }

  /**
   * Verify Docker is installed and running
   */
  async verifyDocker() {
    try {
      const { stdout } = await execAsync('docker info --format "{{.ServerVersion}}"');
      console.log(`[SandboxManager] Docker version: ${stdout.trim()}`);
      return true;
    } catch {
      console.warn('[SandboxManager] Docker not available — running in simulation mode');
      return false;
    }
  }

  /**
   * Create a new sandbox for a project
   * Delegates to ECS manager when in cloud mode
   */
  async create({ projectId, userId, template = 'node-20', plan = 'weekly' }) {
    // Delegate to ECS in cloud mode
    if (this.isEcsMode()) {
      const ecs = await getEcsManager();
      return ecs.create({ projectId, userId, template, plan });
    }

    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.weekly;

    // Check sandbox count limit
    const activeSandboxes = await prisma.sandbox.count({
      where: { userId, status: { in: ['creating', 'running'] } },
    });

    if (activeSandboxes >= limits.maxSandboxes) {
      throw new Error(`Sandbox limit reached (${limits.maxSandboxes} for ${plan} plan). Stop an existing sandbox first.`);
    }

    // Allocate port
    const port = await this.network.allocatePort();
    const sandboxId = crypto.randomUUID();

    // Create DB record
    const sandbox = await prisma.sandbox.create({
      data: {
        id: sandboxId,
        projectId,
        userId,
        template,
        port,
        memory: limits.memory,
        cpu: limits.cpu,
        status: 'creating',
        expiresAt: new Date(Date.now() + limits.idleTimeout * 60 * 1000),
      },
    });

    try {
      // Get the Docker image for this template (use app-specific image if configured)
      const image = SANDBOX_IMAGE_OVERRIDE || this.templates.getImage(template);

      // Create persistent volume
      const volumeName = await this.storage.createVolume(sandboxId);

      // Build docker run command
      const containerName = `sandbox-${sandboxId.slice(0, 8)}`;
      const dockerCmd = [
        'docker', 'run', '-d',
        '--name', containerName,
        '--memory', `${limits.memory}m`,
        '--cpus', `${limits.cpu}`,
        '--pids-limit', '256',
        '--network', 'sandbox-net',
        '-p', `${port}:3000`,
        '-v', `${volumeName}:/app`,
        '-e', `SANDBOX_ID=${sandboxId}`,
        '-e', `PROJECT_ID=${projectId}`,
        '--restart', 'unless-stopped',
        image,
      ].join(' ');

      const { stdout } = await execAsync(dockerCmd);
      const containerId = stdout.trim().slice(0, 12);

      // Update DB with container ID
      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: {
          containerId,
          status: 'running',
          lastActivity: new Date(),
        },
      });

      // Copy project files into container
      await this.syncProjectFiles(sandboxId, projectId);

      console.log(`[SandboxManager] Created sandbox ${sandboxId} on port ${port}`);

      return {
        id: sandboxId,
        containerId,
        port,
        status: 'running',
        url: `http://127.0.0.1:${port}`,
        template,
        memory: limits.memory,
        cpu: limits.cpu,
        expiresAt: sandbox.expiresAt,
      };
    } catch (error) {
      // Mark as error on failure
      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { status: 'error' },
      });

      // Release port
      this.network.releasePort(port);
      throw new Error(`Failed to create sandbox: ${error.message}`);
    }
  }

  /**
   * Get sandbox status and resource usage
   */
  async getStatus(sandboxId) {
    if (this.isEcsMode()) {
      const ecs = await getEcsManager();
      return ecs.getStatus(sandboxId);
    }

    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: { project: { select: { name: true, framework: true } } },
    });

    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    let containerStats = null;
    if (sandbox.containerId && sandbox.status === 'running') {
      try {
        const { stdout } = await execAsync(
          `docker stats ${sandbox.containerId} --no-stream --format "{{json .}}"`
        );
        containerStats = JSON.parse(stdout.trim());
      } catch {
        containerStats = null;
      }
    }

    return {
      id: sandbox.id,
      projectId: sandbox.projectId,
      projectName: sandbox.project?.name,
      status: sandbox.status,
      template: sandbox.template,
      port: sandbox.port,
      url: sandbox.port ? `http://127.0.0.1:${sandbox.port}` : null,
      memory: sandbox.memory,
      cpu: sandbox.cpu,
      storageUsed: sandbox.storageUsed,
      lastActivity: sandbox.lastActivity,
      expiresAt: sandbox.expiresAt,
      stats: containerStats ? {
        cpuPercent: containerStats.CPUPerc,
        memoryUsage: containerStats.MemUsage,
        memoryPercent: containerStats.MemPerc,
        netIO: containerStats.NetIO,
        blockIO: containerStats.BlockIO,
      } : null,
    };
  }

  /**
   * Execute a command inside a sandbox container
   */
  async exec(sandboxId, command, { timeout = 30000, stream = false } = {}) {
    if (this.isEcsMode()) {
      const ecs = await getEcsManager();
      return ecs.exec(sandboxId, command);
    }

    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox || sandbox.status !== 'running') {
      throw new Error('Sandbox is not running');
    }

    // Update activity timestamp
    await prisma.sandbox.update({
      where: { id: sandboxId },
      data: { lastActivity: new Date() },
    });

    try {
      if (stream) {
        // Return a child process for streaming output
        const child = spawn('docker', [
          'exec', sandbox.containerId, 'sh', '-c', command,
        ]);
        return child;
      }

      const { stdout, stderr } = await execAsync(
        `docker exec ${sandbox.containerId} sh -c "${command.replace(/"/g, '\\"')}"`,
        { timeout }
      );

      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
    } catch (error) {
      return {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message,
        exitCode: error.code || 1,
      };
    }
  }

  /**
   * Get container logs
   */
  async getLogs(sandboxId, { tail = 100, since } = {}) {
    if (this.isEcsMode()) {
      const ecs = await getEcsManager();
      return ecs.getLogs(sandboxId, { tail });
    }

    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox?.containerId) {
      throw new Error('Sandbox not found or no container');
    }

    let cmd = `docker logs ${sandbox.containerId} --tail ${tail}`;
    if (since) {
      cmd += ` --since ${since}`;
    }

    try {
      const { stdout, stderr } = await execAsync(cmd);
      return { stdout, stderr };
    } catch (error) {
      return { stdout: '', stderr: error.message };
    }
  }

  /**
   * Stop a sandbox container
   */
  async stop(sandboxId) {
    if (this.isEcsMode()) {
      const ecs = await getEcsManager();
      return ecs.stop(sandboxId);
    }

    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox?.containerId) throw new Error('Sandbox not found');

    try {
      await execAsync(`docker stop ${sandbox.containerId}`, { timeout: 15000 });
      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { status: 'stopped' },
      });
      console.log(`[SandboxManager] Stopped sandbox ${sandboxId}`);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to stop sandbox: ${error.message}`);
    }
  }

  /**
   * Restart a stopped sandbox
   */
  async restart(sandboxId) {
    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox?.containerId) throw new Error('Sandbox not found');

    try {
      await execAsync(`docker start ${sandbox.containerId}`);
      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { status: 'running', lastActivity: new Date() },
      });
      console.log(`[SandboxManager] Restarted sandbox ${sandboxId}`);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to restart sandbox: ${error.message}`);
    }
  }

  /**
   * Destroy a sandbox — kill container, remove volume, clean DB
   */
  async destroy(sandboxId) {
    if (this.isEcsMode()) {
      const ecs = await getEcsManager();
      return ecs.destroy(sandboxId);
    }

    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox) throw new Error('Sandbox not found');

    try {
      if (sandbox.containerId) {
        // Force remove container
        await execAsync(`docker rm -f ${sandbox.containerId}`).catch(() => { });
      }

      // Remove volume
      await this.storage.removeVolume(sandboxId).catch(() => { });

      // Release port
      if (sandbox.port) {
        this.network.releasePort(sandbox.port);
      }

      // Update DB
      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { status: 'destroyed' },
      });

      console.log(`[SandboxManager] Destroyed sandbox ${sandboxId}`);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to destroy sandbox: ${error.message}`);
    }
  }

  /**
   * Sync project files into the sandbox container
   */
  async syncProjectFiles(sandboxId, projectId) {
    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox?.containerId) return;

    const files = await prisma.projectFile.findMany({
      where: { projectId },
      select: { path: true, content: true },
    });

    for (const file of files) {
      try {
        // Ensure directory exists
        const dir = file.path.split('/').slice(0, -1).join('/');
        if (dir) {
          await execAsync(`docker exec ${sandbox.containerId} mkdir -p /app/${dir}`);
        }
        // Write file content
        const escaped = file.content.replace(/'/g, "'\\''");
        await execAsync(
          `docker exec ${sandbox.containerId} sh -c 'echo '"'"'${escaped}'"'"' > /app/${file.path}'`
        );
      } catch {
        console.warn(`[SandboxManager] Failed to sync file: ${file.path}`);
      }
    }
  }

  /**
   * Sync arbitrary files into a sandbox container
   * @param {string} sandboxId
   * @param {Array<{path: string, content: string}>} files
   */
  async syncFiles(sandboxId, files) {
    if (this.isEcsMode()) {
      const ecs = await getEcsManager();
      return ecs.syncFiles(sandboxId, files);
    }

    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox?.containerId || sandbox.status !== 'running') {
      throw new Error('Sandbox is not running');
    }

    // Update activity timestamp
    await prisma.sandbox.update({
      where: { id: sandboxId },
      data: { lastActivity: new Date() },
    });

    for (const file of files) {
      try {
        const dir = file.path.split('/').slice(0, -1).join('/');
        if (dir) {
          await execAsync(`docker exec ${sandbox.containerId} mkdir -p /app/${dir}`);
        }
        const escaped = file.content.replace(/'/g, "'\\''");
        await execAsync(
          `docker exec ${sandbox.containerId} sh -c 'echo '"'"'${escaped}'"'"' > /app/${file.path}'`
        );
      } catch {
        console.warn(`[SandboxManager] Failed to sync file: ${file.path}`);
      }
    }
  }

  /**
   * List all sandboxes for a user
   */
  async listForUser(userId) {
    if (this.isEcsMode()) {
      const ecs = await getEcsManager();
      return ecs.listForUser(userId);
    }

    return prisma.sandbox.findMany({
      where: { userId, status: { in: ['creating', 'running', 'stopped'] } },
      include: { project: { select: { name: true, framework: true } } },
      orderBy: { lastActivity: 'desc' },
    });
  }

  /**
   * Get the current sandbox mode and stats (DB-backed)
   */
  async getStats() {
    if (this.isEcsMode()) {
      const ecs = await getEcsManager();
      return ecs.getClusterStats();
    }

    const allocatedPorts = await this.network.getAllocatedPorts();
    const availablePorts = await this.network.getAvailableCount();

    return {
      mode: 'docker',
      dockerAvailable: await this.verifyDocker(),
      allocatedPorts: allocatedPorts.length,
      availablePorts,
    };
  }

  /**
   * Cleanup idle sandboxes — runs every 5 minutes
   */
  startCleanupCron() {
    this.cleanupInterval = setInterval(async () => {
      try {
        const expired = await prisma.sandbox.findMany({
          where: {
            status: 'running',
            expiresAt: { lt: new Date() },
          },
        });

        for (const sandbox of expired) {
          console.log(`[SandboxManager] Auto-destroying idle sandbox ${sandbox.id}`);
          await this.destroy(sandbox.id).catch(() => { });
        }

        if (expired.length > 0) {
          console.log(`[SandboxManager] Cleaned up ${expired.length} idle sandboxes`);
        }
      } catch (error) {
        console.error('[SandboxManager] Cleanup error:', error.message);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop cleanup cron (for graceful shutdown)
   */
  stopCleanupCron() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton
const sandboxManager = new SandboxManager();
export default sandboxManager;
export { SandboxManager, PLAN_LIMITS };
