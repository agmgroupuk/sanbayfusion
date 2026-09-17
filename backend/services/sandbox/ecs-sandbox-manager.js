/**
 * ECS SANDBOX MANAGER
 * Cloud-scale sandbox management using AWS ECS Fargate
 * 
 * Replaces local Docker when SANDBOX_MODE=ecs
 * - Spin up Fargate tasks per sandbox
 * - Route traffic via ALB
 * - Auto-cleanup idle containers
 * - WebSocket output streaming
 * 
 * Flow:
 *   User code → POST /api/sandbox/start
 *     → RunTask on ECS Fargate
 *     → Node.js container boots (~15-30s)
 *     → Real npm install, real build, real server
 *     → Access via ALB DNS + path routing
 */

import {
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
  DescribeTasksCommand,
  ListTasksCommand,
} from '@aws-sdk/client-ecs';
import {
  ElasticLoadBalancingV2Client,
  RegisterTargetsCommand,
  DeregisterTargetsCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  EC2Client,
  DescribeNetworkInterfacesCommand,
} from '@aws-sdk/client-ec2';
import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';

// ── Config from environment ────────────────────────────────────────

const config = {
  cluster: process.env.SANDBOX_ECS_CLUSTER || 'maula-sandbox-cluster',
  taskDefinition: process.env.SANDBOX_TASK_DEFINITION || '',
  securityGroup: process.env.SANDBOX_SECURITY_GROUP || '',
  subnets: (process.env.SANDBOX_SUBNETS || '').split(',').filter(Boolean),
  vpcId: process.env.SANDBOX_VPC_ID || '',
  albArn: process.env.SANDBOX_ALB_ARN || '',
  targetGroupArn: process.env.SANDBOX_TARGET_GROUP_ARN || '',
  albDns: process.env.SANDBOX_ALB_DNS || '',
  ecrImage: process.env.SANDBOX_ECR_IMAGE || '',
  logGroup: process.env.SANDBOX_LOG_GROUP || '/ecs/maula-sandbox',
  s3Bucket: process.env.SANDBOX_S3_BUCKET || 'maula-hosted-apps',
  containerName: process.env.SANDBOX_CONTAINER_NAME || 'sandbox',
  containerMemory: parseInt(process.env.SANDBOX_CONTAINER_MEMORY || '512'),
  containerCpu: parseInt(process.env.SANDBOX_CONTAINER_CPU || '256'),
  idleTimeout: parseInt(process.env.SANDBOX_IDLE_TIMEOUT || '30'),
  maxPerUser: parseInt(process.env.SANDBOX_MAX_PER_USER || '5'),
  region: process.env.AWS_REGION || 'ap-southeast-1',
};

// ── Plan-based resource limits ─────────────────────────────────────

const ECS_PLAN_LIMITS = {
  weekly: {
    maxSandboxes: 2,
    memory: 512,       // MB (Fargate: 512, 1024, 2048, etc.)
    cpu: 256,           // CPU units (256 = 0.25 vCPU)
    idleTimeout: 30,    // minutes
  },
  monthly: {
    maxSandboxes: 5,
    memory: 1024,
    cpu: 512,           // 0.5 vCPU
    idleTimeout: 60,
  },
  yearly: {
    maxSandboxes: 10,
    memory: 2048,
    cpu: 1024,          // 1 vCPU
    idleTimeout: 120,
  },
};

// ── AWS Clients ────────────────────────────────────────────────────

const ecsClient = new ECSClient({ region: config.region });
const elbClient = new ElasticLoadBalancingV2Client({ region: config.region });
const logsClient = new CloudWatchLogsClient({ region: config.region });

// ── ECS Sandbox Manager Class ──────────────────────────────────────

class EcsSandboxManager {
  constructor() {
    this.cleanupInterval = null;
  }

  /**
   * Initialize — verify ECS config and start cleanup cron
   */
  async init() {
    try {
      if (!config.cluster || !config.taskDefinition) {
        console.warn('[EcsSandbox] Missing ECS config — cloud sandbox disabled');
        return false;
      }

      // Verify cluster exists by listing tasks
      const listCmd = new ListTasksCommand({
        cluster: config.cluster,
        maxResults: 1,
      });
      await ecsClient.send(listCmd);

      this.startCleanupCron();
      console.log(`[EcsSandbox] Initialized — cluster: ${config.cluster}`);
      return true;
    } catch (error) {
      console.error('[EcsSandbox] Init error:', error.message);
      return false;
    }
  }

  /**
   * Create a new ECS Fargate sandbox
   */
  async create({ projectId, userId, template = 'node-20', plan = 'weekly' }) {
    const limits = ECS_PLAN_LIMITS[plan] || ECS_PLAN_LIMITS.weekly;

    // Check sandbox count limit
    const activeSandboxes = await prisma.sandbox.count({
      where: { userId, status: { in: ['creating', 'running'] } },
    });

    if (activeSandboxes >= limits.maxSandboxes) {
      throw new Error(
        `Sandbox limit reached (${limits.maxSandboxes} for ${plan} plan). Stop an existing sandbox first.`
      );
    }

    const sandboxId = crypto.randomUUID();

    // Create DB record
    const sandbox = await prisma.sandbox.create({
      data: {
        id: sandboxId,
        projectId,
        userId,
        template,
        port: 3000, // Internal container port
        memory: limits.memory,
        cpu: limits.cpu,
        status: 'creating',
        expiresAt: new Date(Date.now() + limits.idleTimeout * 60 * 1000),
      },
    });

    try {
      // Run ECS Fargate task
      const runCmd = new RunTaskCommand({
        cluster: config.cluster,
        taskDefinition: config.taskDefinition,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: config.subnets,
            securityGroups: [config.securityGroup],
            assignPublicIp: 'ENABLED',
          },
        },
        overrides: {
          containerOverrides: [
            {
              name: config.containerName,
              environment: [
                { name: 'SANDBOX_ID', value: sandboxId },
                { name: 'PROJECT_ID', value: projectId },
                { name: 'USER_ID', value: userId },
                { name: 'TEMPLATE', value: template },
                { name: 'SANDBOX_MODE', value: 'ecs' },
              ],
              memory: limits.memory,
              cpu: limits.cpu,
            },
          ],
        },
        tags: [
          { key: 'sandbox-id', value: sandboxId },
          { key: 'user-id', value: userId },
          { key: 'project-id', value: projectId },
          { key: 'template', value: template },
        ],
      });

      const result = await ecsClient.send(runCmd);
      const task = result.tasks?.[0];

      if (!task || result.failures?.length > 0) {
        const failureReason = result.failures?.[0]?.reason || 'Unknown ECS error';
        throw new Error(`ECS task launch failed: ${failureReason}`);
      }

      const taskArn = task.taskArn;
      const taskId = taskArn.split('/').pop();

      // Update DB with task info
      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: {
          containerId: taskId, // Store ECS task ID as containerId
          status: 'creating',   // Still creating until task is RUNNING
          lastActivity: new Date(),
        },
      });

      // Start polling for task to become RUNNING
      this._pollTaskStatus(sandboxId, taskArn);

      console.log(`[EcsSandbox] Created sandbox ${sandboxId} → task ${taskId}`);

      return {
        id: sandboxId,
        containerId: taskId,
        taskArn,
        port: 3000,
        status: 'creating',
        url: config.albDns
          ? `https://${config.albDns}/sandbox/${sandboxId}`
          : null, // URL assigned once task gets public IP
        template,
        memory: limits.memory,
        cpu: limits.cpu,
        expiresAt: sandbox.expiresAt,
        estimatedBootTime: '15-30s',
      };
    } catch (error) {
      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { status: 'error' },
      });
      throw new Error(`Failed to create cloud sandbox: ${error.message}`);
    }
  }

  /**
   * Poll ECS task until it becomes RUNNING, then register with ALB
   */
  async _pollTaskStatus(sandboxId, taskArn, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000)); // Wait 5s between checks

      try {
        const describeCmd = new DescribeTasksCommand({
          cluster: config.cluster,
          tasks: [taskArn],
        });
        const result = await ecsClient.send(describeCmd);
        const task = result.tasks?.[0];

        if (!task) {
          console.warn(`[EcsSandbox] Task ${taskArn} not found`);
          break;
        }

        const status = task.lastStatus;

        if (status === 'RUNNING') {
          // Extract IPs from ENI attachment
          const eni = task.attachments?.find((a) => a.type === 'ElasticNetworkInterface');
          const privateIp = eni?.details?.find((d) => d.name === 'privateIPv4Address')?.value;
          const eniId = eni?.details?.find((d) => d.name === 'networkInterfaceId')?.value;
          let publicIp = eni?.details?.find((d) => d.name === 'publicIPv4Address')?.value;

          // ECS doesn't always include public IP in task details — look it up via EC2 ENI
          if (!publicIp && eniId) {
            try {
              const ec2Client = new EC2Client({ region: config.region });
              const eniResult = await ec2Client.send(
                new DescribeNetworkInterfacesCommand({ NetworkInterfaceIds: [eniId] })
              );
              publicIp = eniResult.NetworkInterfaces?.[0]?.Association?.PublicIp || null;
            } catch (ec2Err) {
              console.warn(`[EcsSandbox] ENI public IP lookup failed:`, ec2Err.message);
            }
          }

          // Register with ALB target group (if ALB mode)
          if (privateIp && config.targetGroupArn) {
            try {
              const registerCmd = new RegisterTargetsCommand({
                TargetGroupArn: config.targetGroupArn,
                Targets: [{ Id: privateIp, Port: 3000 }],
              });
              await elbClient.send(registerCmd);
            } catch (albError) {
              console.warn(`[EcsSandbox] ALB registration failed:`, albError.message);
            }
          }

          // Build the sandbox URL
          const sandboxUrl = config.albDns
            ? `https://${config.albDns}/sandbox/${sandboxId}`
            : publicIp
              ? `http://${publicIp}:3000`
              : null;

          await prisma.sandbox.update({
            where: { id: sandboxId },
            data: {
              status: 'running',
              lastActivity: new Date(),
              metadata: {
                url: sandboxUrl,
                publicIp: publicIp || null,
                privateIp: privateIp || null,
              },
            },
          });

          console.log(`[EcsSandbox] Sandbox ${sandboxId} is RUNNING (public: ${publicIp}, private: ${privateIp}, url: ${sandboxUrl})`);
          return;
        }

        if (status === 'STOPPED' || status === 'DEPROVISIONING') {
          const stopReason = task.stoppedReason || 'Unknown';
          await prisma.sandbox.update({
            where: { id: sandboxId },
            data: { status: 'error' },
          });
          console.error(`[EcsSandbox] Task stopped: ${stopReason}`);
          return;
        }

        // Still PROVISIONING or PENDING — keep waiting
      } catch (error) {
        console.warn(`[EcsSandbox] Poll error for ${sandboxId}:`, error.message);
      }
    }

    // Timeout — mark as error
    await prisma.sandbox.update({
      where: { id: sandboxId },
      data: { status: 'error' },
    });
    console.error(`[EcsSandbox] Sandbox ${sandboxId} timed out waiting for RUNNING state`);
  }

  /**
   * Get sandbox status with ECS task details
   */
  async getStatus(sandboxId) {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: { project: { select: { name: true, framework: true } } },
    });

    if (!sandbox) throw new Error('Sandbox not found');

    let taskStatus = null;
    if (sandbox.containerId && sandbox.status === 'running') {
      try {
        const taskArn = `arn:aws:ecs:${config.region}:*:task/${config.cluster}/${sandbox.containerId}`;
        const describeCmd = new DescribeTasksCommand({
          cluster: config.cluster,
          tasks: [sandbox.containerId],
        });
        const result = await ecsClient.send(describeCmd);
        const task = result.tasks?.[0];

        if (task) {
          taskStatus = {
            ecsStatus: task.lastStatus,
            healthStatus: task.healthStatus,
            cpu: task.cpu,
            memory: task.memory,
            startedAt: task.startedAt,
            connectivity: task.connectivity,
          };
        }
      } catch {
        // Task may have been stopped
      }
    }

    // Build URL — prefer stored URL in metadata, then ALB DNS, then public IP
    const meta = (typeof sandbox.metadata === 'object' && sandbox.metadata) || {};
    const sandboxUrl = sandbox.status === 'running'
      ? (meta.url || (config.albDns ? `https://${config.albDns}/sandbox/${sandbox.id}` : (meta.publicIp ? `http://${meta.publicIp}:3000` : null)))
      : null;

    return {
      id: sandbox.id,
      projectId: sandbox.projectId,
      projectName: sandbox.project?.name,
      status: sandbox.status,
      template: sandbox.template,
      url: sandboxUrl,
      publicIp: meta.publicIp,
      memory: sandbox.memory,
      cpu: sandbox.cpu,
      storageUsed: sandbox.storageUsed,
      lastActivity: sandbox.lastActivity,
      expiresAt: sandbox.expiresAt,
      taskStatus,
      mode: 'ecs',
    };
  }

  /**
   * Execute a command in a running ECS sandbox
   * Uses ECS Execute Command (requires enableExecuteCommand on task definition)
   */
  async exec(sandboxId, command) {
    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox || sandbox.status !== 'running') {
      throw new Error('Sandbox is not running');
    }

    // Update activity
    await prisma.sandbox.update({
      where: { id: sandboxId },
      data: { lastActivity: new Date() },
    });

    // For ECS, we use the sandbox's internal API endpoint
    // Prefer stored URL/public IP in metadata, fall back to ALB DNS
    const meta = (typeof sandbox.metadata === 'object' && sandbox.metadata) || {};
    try {
      const sandboxUrl = meta.url || (meta.publicIp ? `http://${meta.publicIp}:3000` : `https://${config.albDns}/sandbox/${sandboxId}`);
      const response = await fetch(`${sandboxUrl}/__internal/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Exec failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        stdout: '',
        stderr: `Cloud exec error: ${error.message}`,
        exitCode: 1,
      };
    }
  }

  /**
   * Sync files to a running ECS sandbox
   */
  async syncFiles(sandboxId, files) {
    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox || sandbox.status !== 'running') {
      throw new Error('Sandbox is not running');
    }

    const meta2 = (typeof sandbox.metadata === 'object' && sandbox.metadata) || {};
    try {
      const sandboxUrl = meta2.url || (meta2.publicIp ? `http://${meta2.publicIp}:3000` : `https://${config.albDns}/sandbox/${sandboxId}`);
      const response = await fetch(`${sandboxUrl}/__internal/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`File sync failed: ${response.status}`);
      }

      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { lastActivity: new Date() },
      });

      return await response.json();
    } catch (error) {
      throw new Error(`Cloud file sync error: ${error.message}`);
    }
  }

  /**
   * Get container logs from CloudWatch
   */
  async getLogs(sandboxId, { tail = 100 } = {}) {
    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox?.containerId) throw new Error('Sandbox not found');

    try {
      const logStream = `sandbox/${sandbox.containerId}`;
      const cmd = new GetLogEventsCommand({
        logGroupName: config.logGroup,
        logStreamName: logStream,
        limit: tail,
        startFromHead: false,
      });

      const result = await logsClient.send(cmd);
      const logs = (result.events || []).map((e) => e.message).join('\n');

      return { stdout: logs, stderr: '' };
    } catch (error) {
      return { stdout: '', stderr: `Logs unavailable: ${error.message}` };
    }
  }

  /**
   * Stop/destroy an ECS sandbox
   */
  async destroy(sandboxId) {
    const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
    if (!sandbox) throw new Error('Sandbox not found');

    try {
      if (sandbox.containerId && sandbox.status !== 'destroyed') {
        // Stop the ECS task
        const stopCmd = new StopTaskCommand({
          cluster: config.cluster,
          task: sandbox.containerId,
          reason: `User requested destruction of sandbox ${sandboxId}`,
        });

        await ecsClient.send(stopCmd).catch((e) => {
          console.warn(`[EcsSandbox] Stop task error (may already be stopped):`, e.message);
        });
      }

      // Update DB
      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { status: 'destroyed' },
      });

      console.log(`[EcsSandbox] Destroyed sandbox ${sandboxId}`);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to destroy cloud sandbox: ${error.message}`);
    }
  }

  /**
   * Stop a sandbox (keep task definition, just stop task)
   */
  async stop(sandboxId) {
    return this.destroy(sandboxId); // For ECS, stop = destroy
  }

  /**
   * List all sandboxes for a user
   */
  async listForUser(userId) {
    return prisma.sandbox.findMany({
      where: { userId, status: { in: ['creating', 'running', 'stopped'] } },
      include: { project: { select: { name: true, framework: true } } },
      orderBy: { lastActivity: 'desc' },
    });
  }

  /**
   * Cleanup idle sandboxes via ECS
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
          console.log(`[EcsSandbox] Auto-destroying idle sandbox ${sandbox.id}`);
          await this.destroy(sandbox.id).catch(() => { });
        }

        if (expired.length > 0) {
          console.log(`[EcsSandbox] Cleaned up ${expired.length} idle sandboxes`);
        }
      } catch (error) {
        console.error('[EcsSandbox] Cleanup error:', error.message);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop cleanup cron
   */
  stopCleanupCron() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Check if ECS sandbox mode is properly configured
   */
  isConfigured() {
    return !!(config.cluster && config.taskDefinition && config.subnets.length > 0 && config.securityGroup);
  }

  /**
   * Get cloud sandbox health/stats
   */
  async getClusterStats() {
    try {
      const listCmd = new ListTasksCommand({
        cluster: config.cluster,
        desiredStatus: 'RUNNING',
      });
      const result = await ecsClient.send(listCmd);

      return {
        mode: 'ecs',
        cluster: config.cluster,
        region: config.region,
        runningTasks: result.taskArns?.length || 0,
        albDns: config.albDns || '(direct IP mode)',
        networkMode: config.albDns ? 'alb' : 'direct-ip',
        configured: this.isConfigured(),
      };
    } catch (error) {
      return {
        mode: 'ecs',
        cluster: config.cluster,
        error: error.message,
        configured: false,
      };
    }
  }
}

// Singleton
const ecsSandboxManager = new EcsSandboxManager();
export default ecsSandboxManager;
export { EcsSandboxManager, ECS_PLAN_LIMITS, config as ecsConfig };
