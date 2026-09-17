// ─────────────────────────────────────────────────────────────
//  Cloud Control Tools  –  V5
//  Tools: cloud_deploy, cloud_scale, cloud_logs, cloud_secrets, cloud_cost,
//         cloud_monitor, cloud_backup, cloud_network, cloud_iam,
//         cloud_registry, cloud_queue, cloud_cdn
// ─────────────────────────────────────────────────────────────
import prisma from '../lib/prisma.js';

/* ───── provider specs ───── */
const INSTANCE_TYPES = {
    // AWS-style
    't3.micro': { vcpu: 2, memGb: 1, costHr: 0.0104, provider: 'aws' },
    't3.small': { vcpu: 2, memGb: 2, costHr: 0.0208, provider: 'aws' },
    't3.medium': { vcpu: 2, memGb: 4, costHr: 0.0416, provider: 'aws' },
    'm5.large': { vcpu: 2, memGb: 8, costHr: 0.096, provider: 'aws' },
    'm5.xlarge': { vcpu: 4, memGb: 16, costHr: 0.192, provider: 'aws' },
    'c5.large': { vcpu: 2, memGb: 4, costHr: 0.085, provider: 'aws' },
    'c5.xlarge': { vcpu: 4, memGb: 8, costHr: 0.17, provider: 'aws' },
    'r5.large': { vcpu: 2, memGb: 16, costHr: 0.126, provider: 'aws' },
    'g4dn.xlarge': { vcpu: 4, memGb: 16, costHr: 0.526, provider: 'aws', gpu: true },
    // GCP-style
    'e2-micro': { vcpu: 0.25, memGb: 1, costHr: 0.0084, provider: 'gcp' },
    'e2-standard-2': { vcpu: 2, memGb: 8, costHr: 0.067, provider: 'gcp' },
    'n2-standard-4': { vcpu: 4, memGb: 16, costHr: 0.194, provider: 'gcp' },
    // Azure-style
    'Standard_B1s': { vcpu: 1, memGb: 1, costHr: 0.0104, provider: 'azure' },
    'Standard_D2s_v3': { vcpu: 2, memGb: 8, costHr: 0.096, provider: 'azure' },
    'Standard_D4s_v3': { vcpu: 4, memGb: 16, costHr: 0.192, provider: 'azure' },
};

const REGIONS = {
    aws: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'],
    gcp: ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1', 'asia-east1'],
    azure: ['eastus', 'westus2', 'westeurope', 'southeastasia', 'japaneast'],
};

/* ───── tool definitions ───── */
export const CLOUD_CONTROL_TOOL_DEFINITIONS = [
    // 1 ─ Cloud Deploy
    {
        name: 'cloud_deploy',
        description: 'Deploy applications to cloud infrastructure. Supports container deployments, serverless functions, static sites, and full-stack apps across AWS, GCP, and Azure with rollback capability.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['deploy', 'rollback', 'status', 'list', 'destroy'], description: 'Action to perform' },
                name: { type: 'string', description: 'Deployment name' },
                provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
                region: { type: 'string', description: 'Deployment region' },
                type: { type: 'string', enum: ['container', 'serverless', 'static', 'vm', 'kubernetes'], description: 'Deployment type' },
                instanceType: { type: 'string', description: 'Instance type for VM deployments' },
                replicas: { type: 'number', description: 'Number of replicas (default: 1)' },
                image: { type: 'string', description: 'Container image or source path' },
                envVars: { type: 'object', description: 'Environment variables' },
                deploymentId: { type: 'string', description: 'Deployment ID for status/rollback/destroy' },
                version: { type: 'string', description: 'Version to rollback to' },
            },
            required: ['action'],
        },
    },
    // 2 ─ Cloud Scale
    {
        name: 'cloud_scale',
        description: 'Scale cloud resources horizontally and vertically. Configure auto-scaling policies, set min/max instances, monitor scaling events, and optimize resource allocation.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['scale', 'autoscale', 'status', 'recommendations'], description: 'Action to perform' },
                deploymentId: { type: 'string', description: 'Deployment to scale' },
                replicas: { type: 'number', description: 'Target replica count' },
                instanceType: { type: 'string', description: 'Target instance type (vertical scaling)' },
                minReplicas: { type: 'number', description: 'Minimum replicas for autoscale' },
                maxReplicas: { type: 'number', description: 'Maximum replicas for autoscale' },
                targetCpuPercent: { type: 'number', description: 'Target CPU % for autoscale trigger (default 70)' },
                targetMemPercent: { type: 'number', description: 'Target memory % for autoscale trigger (default 80)' },
            },
            required: ['action'],
        },
    },
    // 3 ─ Cloud Logs
    {
        name: 'cloud_logs',
        description: 'Query, stream, and analyze cloud application logs. Supports log levels, time-range filtering, pattern matching, error aggregation, and log-based alerting.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['query', 'stream', 'analyze', 'alert', 'export'], description: 'Action to perform' },
                deploymentId: { type: 'string', description: 'Deployment to get logs for' },
                level: { type: 'string', enum: ['debug', 'info', 'warn', 'error', 'fatal'], description: 'Minimum log level' },
                search: { type: 'string', description: 'Search pattern / keyword' },
                since: { type: 'string', description: 'Time range (e.g., "1h", "24h", "7d")' },
                limit: { type: 'number', description: 'Max log entries (default: 100)' },
                alertPattern: { type: 'string', description: 'Pattern to alert on' },
                alertThreshold: { type: 'number', description: 'Number of matches before alert triggers' },
            },
            required: ['action'],
        },
    },
    // 4 ─ Cloud Secrets
    {
        name: 'cloud_secrets',
        description: 'Manage cloud secrets and configuration. Store, retrieve, rotate, and audit access to sensitive values like API keys, database credentials, and certificates.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['store', 'get', 'list', 'rotate', 'delete', 'audit'], description: 'Action to perform' },
                key: { type: 'string', description: 'Secret key name' },
                value: { type: 'string', description: 'Secret value (for store action)' },
                description: { type: 'string', description: 'Description of the secret' },
                expiresInDays: { type: 'number', description: 'Auto-expire after N days' },
                deploymentId: { type: 'string', description: 'Link to deployment' },
            },
            required: ['action'],
        },
    },
    // 5 ─ Cloud Cost
    {
        name: 'cloud_cost',
        description: 'Monitor and optimize cloud infrastructure costs. Track spending by service, forecast costs, identify waste, compare pricing across providers, and generate cost reports.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['report', 'forecast', 'optimize', 'compare', 'budget'], description: 'Action to perform' },
                periodDays: { type: 'number', description: 'Report period in days (default: 30)' },
                provider: { type: 'string', description: 'Filter by provider' },
                budget: { type: 'number', description: 'Monthly budget in USD' },
                workload: { type: 'object', description: '{ vcpu, memGb, storageGb, hoursPerMonth } for comparison' },
            },
            required: ['action'],
        },
    },
    // 6 ─ Cloud Monitor
    {
        name: 'cloud_monitor',
        description: 'Monitor cloud infrastructure health, uptime, latency, error rates. Create dashboards, set alert thresholds, and get real-time status of all resources.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['status', 'metrics', 'alerts', 'dashboard', 'incidents', 'uptime'], description: 'Action to perform' },
                deploymentId: { type: 'string', description: 'Deployment to monitor' },
                metric: { type: 'string', enum: ['cpu', 'memory', 'disk', 'network', 'requests', 'latency', 'errors'], description: 'Metric to query' },
                period: { type: 'string', description: 'Time period (e.g., "1h", "24h", "7d")' },
                threshold: { type: 'number', description: 'Alert threshold value' },
                condition: { type: 'string', enum: ['above', 'below', 'equals'], description: 'Alert condition' },
            },
            required: ['action'],
        },
    },
    // 7 ─ Cloud Backup
    {
        name: 'cloud_backup',
        description: 'Create, schedule, restore, and manage cloud backups. Supports full/incremental/snapshot backups, cross-region replication, and retention policies.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['create', 'restore', 'list', 'schedule', 'delete', 'policy'], description: 'Action to perform' },
                resourceId: { type: 'string', description: 'Resource to backup (deployment/database ID)' },
                resourceType: { type: 'string', enum: ['deployment', 'database', 'storage', 'config'], description: 'Type of resource' },
                backupId: { type: 'string', description: 'Backup ID for restore/delete' },
                type: { type: 'string', enum: ['full', 'incremental', 'snapshot'], description: 'Backup type' },
                schedule: { type: 'string', description: 'Cron schedule (e.g., "0 2 * * *" for daily at 2am)' },
                retentionDays: { type: 'number', description: 'Keep backups for N days (default: 30)' },
                crossRegion: { type: 'boolean', description: 'Enable cross-region backup replication' },
            },
            required: ['action'],
        },
    },
    // 8 ─ Cloud Network
    {
        name: 'cloud_network',
        description: 'Manage cloud networking: VPCs, subnets, security groups, firewall rules, load balancers, and peering connections.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['vpc_create', 'vpc_list', 'firewall', 'loadbalancer', 'peering', 'diagram'], description: 'Action to perform' },
                name: { type: 'string', description: 'Resource name' },
                cidr: { type: 'string', description: 'CIDR block (e.g., 10.0.0.0/16)' },
                subnets: { type: 'array', items: { type: 'object' }, description: 'Subnet definitions [{ name, cidr, zone }]' },
                rules: { type: 'array', items: { type: 'object' }, description: 'Firewall rules [{ port, protocol, source, action }]' },
                provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
                targets: { type: 'array', items: { type: 'string' }, description: 'Backend target IDs for load balancer' },
                vpcId: { type: 'string', description: 'VPC ID for operations' },
            },
            required: ['action'],
        },
    },
    // 9 ─ Cloud IAM
    {
        name: 'cloud_iam',
        description: 'Manage cloud identity and access management. Create roles, policies, service accounts, and audit access permissions across cloud providers.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['role_create', 'role_list', 'policy_create', 'policy_attach', 'service_account', 'audit', 'whoami'], description: 'Action to perform' },
                name: { type: 'string', description: 'Role or policy name' },
                permissions: { type: 'array', items: { type: 'string' }, description: 'Permission strings (e.g., ["s3:GetObject", "ec2:DescribeInstances"])' },
                principal: { type: 'string', description: 'User/service to attach policy to' },
                resourceArn: { type: 'string', description: 'Resource ARN to scope permissions' },
                provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
            },
            required: ['action'],
        },
    },
    // 10 ─ Cloud Registry
    {
        name: 'cloud_registry',
        description: 'Manage container image registries. Push, pull, tag, scan for vulnerabilities, and manage image lifecycle across ECR/GCR/ACR.',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['push', 'pull', 'list', 'tag', 'scan', 'delete', 'lifecycle'], description: 'Action to perform' },
                repository: { type: 'string', description: 'Repository name' },
                image: { type: 'string', description: 'Image name with optional tag' },
                tag: { type: 'string', description: 'Image tag' },
                provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Registry provider (ECR/GCR/ACR)' },
                retainCount: { type: 'number', description: 'Number of images to retain in lifecycle policy' },
            },
            required: ['action'],
        },
    },
    // 11 ─ Cloud Queue
    {
        name: 'cloud_queue',
        description: 'Manage cloud message queues and event streams. Create queues, publish/consume messages, manage dead letter queues, and monitor throughput (SQS/Pub-Sub/Service Bus).',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['create', 'publish', 'consume', 'list', 'stats', 'dlq', 'purge'], description: 'Action to perform' },
                queueName: { type: 'string', description: 'Queue name' },
                message: { type: 'object', description: 'Message payload to publish' },
                messages: { type: 'array', items: { type: 'object' }, description: 'Batch messages to publish' },
                maxMessages: { type: 'number', description: 'Max messages to consume (default: 10)' },
                visibilityTimeout: { type: 'number', description: 'Seconds before message becomes visible again (default: 30)' },
                provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Queue provider (SQS/Pub-Sub/Service Bus)' },
            },
            required: ['action'],
        },
    },
    // 12 ─ Cloud CDN
    {
        name: 'cloud_cdn',
        description: 'Manage content delivery networks. Configure distributions, cache policies, origins, invalidate caches, and monitor CDN analytics (CloudFront/Cloud CDN/Azure CDN).',
        category: 'cloud_control',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['create', 'list', 'invalidate', 'stats', 'origins', 'cache_policy'], description: 'Action to perform' },
                name: { type: 'string', description: 'Distribution name' },
                origin: { type: 'string', description: 'Origin domain or bucket' },
                paths: { type: 'array', items: { type: 'string' }, description: 'Paths to invalidate (e.g., ["/images/*", "/index.html"])' },
                cacheTtl: { type: 'number', description: 'Default cache TTL in seconds (default: 86400)' },
                provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'CDN provider' },
                distributionId: { type: 'string', description: 'Distribution ID for operations' },
            },
            required: ['action'],
        },
    },
];

/* ═══════════════════════════════════════════════════════════════
   EXECUTORS
   ═══════════════════════════════════════════════════════════════ */

// ── 1. cloud_deploy ────────────────────────────────────────────
async function executeCloudDeploy(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'deploy') {
        const {
            name = 'app-' + Date.now().toString(36),
            provider = 'aws',
            region = REGIONS[provider]?.[0] || 'us-east-1',
            type = 'container',
            instanceType = 't3.small',
            replicas = 1,
            image = 'nginx:latest',
            envVars = {},
        } = input;

        const spec = INSTANCE_TYPES[instanceType] || INSTANCE_TYPES['t3.small'];
        const monthlyCost = spec.costHr * 730 * replicas; // 730 hours/month

        const deployment = await db.cloudDeployment.create({
            data: {
                userId,
                name,
                provider,
                region,
                type,
                instanceType,
                replicas,
                image,
                envVars,
                status: 'deploying',
                version: '1',
                config: {
                    vcpu: spec.vcpu * replicas,
                    memGb: spec.memGb * replicas,
                    costPerHr: spec.costHr * replicas,
                    estimatedMonthlyCost: Math.round(monthlyCost * 100) / 100,
                    gpu: spec.gpu || false,
                },
                history: [{ version: '1', timestamp: new Date().toISOString(), action: 'deploy', status: 'deploying' }],
            },
        });

        // Simulate deployment completion
        await db.cloudDeployment.update({
            where: { id: deployment.id },
            data: { status: 'running' },
        });

        return {
            result: JSON.stringify({
                deploymentId: deployment.id,
                name,
                provider,
                region,
                type,
                instanceType,
                replicas,
                status: 'running',
                version: '1',
                resources: { vcpu: spec.vcpu * replicas, memGb: spec.memGb * replicas, gpu: spec.gpu || false },
                estimatedMonthlyCost: `$${Math.round(monthlyCost * 100) / 100}`,
                endpoint: `https://${name}.${region}.${provider}.example.com`,
                message: `Deployment "${name}" is running on ${provider} ${region} (${replicas}x ${instanceType})`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'rollback') {
        const { deploymentId, version } = input;
        if (!deploymentId) return { result: JSON.stringify({ error: 'deploymentId required' }), sideEffects: null };

        const dep = await db.cloudDeployment.findUnique({ where: { id: deploymentId } });
        if (!dep) return { result: JSON.stringify({ error: 'Deployment not found' }), sideEffects: null };

        const targetVersion = version || String(Math.max(1, parseInt(dep.version) - 1));
        const history = dep.history || [];
        history.push({ version: targetVersion, timestamp: new Date().toISOString(), action: 'rollback', from: dep.version });

        await db.cloudDeployment.update({
            where: { id: deploymentId },
            data: { version: targetVersion, status: 'running', history },
        });

        return {
            result: JSON.stringify({
                deploymentId, name: dep.name, rolledBackFrom: dep.version, rolledBackTo: targetVersion,
                status: 'running', message: `Rolled back to version ${targetVersion}`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'status') {
        const { deploymentId } = input;
        if (!deploymentId) return { result: JSON.stringify({ error: 'deploymentId required' }), sideEffects: null };
        const dep = await db.cloudDeployment.findUnique({ where: { id: deploymentId } });
        if (!dep) return { result: JSON.stringify({ error: 'Deployment not found' }), sideEffects: null };

        const uptime = Date.now() - new Date(dep.createdAt).getTime();
        return {
            result: JSON.stringify({
                id: dep.id, name: dep.name, provider: dep.provider, region: dep.region,
                type: dep.type, instanceType: dep.instanceType, replicas: dep.replicas,
                status: dep.status, version: dep.version,
                config: dep.config,
                uptimeMs: uptime,
                uptimeHuman: uptime > 86400000 ? `${Math.floor(uptime / 86400000)}d ${Math.floor((uptime % 86400000) / 3600000)}h` : `${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m`,
                createdAt: dep.createdAt,
                deploymentHistory: (dep.history || []).slice(-10),
            }),
            sideEffects: null,
        };
    }

    if (action === 'list') {
        const deps = await db.cloudDeployment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
        const totalMonthlyCost = deps.filter(d => d.status === 'running').reduce((s, d) => s + ((d.config || {}).estimatedMonthlyCost || 0), 0);

        return {
            result: JSON.stringify({
                count: deps.length,
                running: deps.filter(d => d.status === 'running').length,
                totalEstimatedMonthlyCost: `$${Math.round(totalMonthlyCost * 100) / 100}`,
                deployments: deps.map(d => ({
                    id: d.id, name: d.name, provider: d.provider, region: d.region,
                    type: d.type, replicas: d.replicas, status: d.status, version: d.version,
                    monthlyCost: `$${(d.config || {}).estimatedMonthlyCost || 0}`,
                    createdAt: d.createdAt,
                })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'destroy') {
        const { deploymentId } = input;
        if (!deploymentId) return { result: JSON.stringify({ error: 'deploymentId required' }), sideEffects: null };
        const dep = await db.cloudDeployment.update({
            where: { id: deploymentId },
            data: { status: 'destroyed' },
        });
        return {
            result: JSON.stringify({ deploymentId, name: dep.name, status: 'destroyed', message: `Deployment "${dep.name}" destroyed` }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 2. cloud_scale ─────────────────────────────────────────────
async function executeCloudScale(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'scale') {
        const { deploymentId, replicas, instanceType } = input;
        if (!deploymentId) return { result: JSON.stringify({ error: 'deploymentId required' }), sideEffects: null };

        const dep = await db.cloudDeployment.findUnique({ where: { id: deploymentId } });
        if (!dep) return { result: JSON.stringify({ error: 'Deployment not found' }), sideEffects: null };

        const update = {};
        const changes = [];

        if (replicas != null && replicas !== dep.replicas) {
            changes.push({ type: 'horizontal', from: dep.replicas, to: replicas });
            update.replicas = replicas;
        }

        if (instanceType && instanceType !== dep.instanceType) {
            const newSpec = INSTANCE_TYPES[instanceType];
            if (!newSpec) return { result: JSON.stringify({ error: `Unknown instance type: ${instanceType}` }), sideEffects: null };
            changes.push({ type: 'vertical', from: dep.instanceType, to: instanceType });
            update.instanceType = instanceType;
        }

        const finalReplicas = update.replicas || dep.replicas;
        const finalType = update.instanceType || dep.instanceType;
        const spec = INSTANCE_TYPES[finalType] || { costHr: 0.02, vcpu: 2, memGb: 4 };
        const monthlyCost = spec.costHr * 730 * finalReplicas;

        update.config = {
            ...(dep.config || {}),
            vcpu: spec.vcpu * finalReplicas,
            memGb: spec.memGb * finalReplicas,
            costPerHr: spec.costHr * finalReplicas,
            estimatedMonthlyCost: Math.round(monthlyCost * 100) / 100,
        };

        const history = dep.history || [];
        history.push({ timestamp: new Date().toISOString(), action: 'scale', changes });

        await db.cloudDeployment.update({
            where: { id: deploymentId },
            data: { ...update, history },
        });

        return {
            result: JSON.stringify({
                deploymentId, name: dep.name,
                changes,
                newConfig: { replicas: finalReplicas, instanceType: finalType, vcpu: spec.vcpu * finalReplicas, memGb: spec.memGb * finalReplicas },
                estimatedMonthlyCost: `$${Math.round(monthlyCost * 100) / 100}`,
                message: `Scaled "${dep.name}": ${changes.map(c => `${c.type} ${c.from} → ${c.to}`).join(', ')}`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'autoscale') {
        const { deploymentId, minReplicas = 1, maxReplicas = 10, targetCpuPercent = 70, targetMemPercent = 80 } = input;
        if (!deploymentId) return { result: JSON.stringify({ error: 'deploymentId required' }), sideEffects: null };

        const dep = await db.cloudDeployment.findUnique({ where: { id: deploymentId } });
        if (!dep) return { result: JSON.stringify({ error: 'Deployment not found' }), sideEffects: null };

        const config = dep.config || {};
        config.autoscale = { enabled: true, minReplicas, maxReplicas, targetCpuPercent, targetMemPercent };

        const spec = INSTANCE_TYPES[dep.instanceType] || { costHr: 0.02 };
        const minCost = spec.costHr * 730 * minReplicas;
        const maxCost = spec.costHr * 730 * maxReplicas;

        await db.cloudDeployment.update({ where: { id: deploymentId }, data: { config } });

        return {
            result: JSON.stringify({
                deploymentId, name: dep.name, autoscale: config.autoscale,
                costRange: { min: `$${Math.round(minCost * 100) / 100}/mo`, max: `$${Math.round(maxCost * 100) / 100}/mo` },
                message: `Autoscaling enabled: ${minReplicas}–${maxReplicas} replicas (CPU target ${targetCpuPercent}%, Mem target ${targetMemPercent}%)`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'status') {
        const { deploymentId } = input;
        if (!deploymentId) return { result: JSON.stringify({ error: 'deploymentId required' }), sideEffects: null };
        const dep = await db.cloudDeployment.findUnique({ where: { id: deploymentId } });
        if (!dep) return { result: JSON.stringify({ error: 'Deployment not found' }), sideEffects: null };

        // Simulate current metrics
        const cpuUtilization = Math.round(30 + Math.random() * 50);
        const memUtilization = Math.round(40 + Math.random() * 40);

        return {
            result: JSON.stringify({
                deploymentId, name: dep.name,
                currentReplicas: dep.replicas,
                instanceType: dep.instanceType,
                autoscale: (dep.config || {}).autoscale || null,
                metrics: { cpuPercent: cpuUtilization, memPercent: memUtilization },
                scaleRecommendation: cpuUtilization > 80 ? 'Scale up – high CPU' : cpuUtilization < 20 ? 'Scale down – low utilization' : 'Current scale appropriate',
            }),
            sideEffects: null,
        };
    }

    if (action === 'recommendations') {
        const deps = await db.cloudDeployment.findMany({ where: { userId, status: 'running' } });
        const recommendations = deps.map(dep => {
            const spec = INSTANCE_TYPES[dep.instanceType] || {};
            const suggestions = [];

            if (dep.replicas === 1) suggestions.push({ type: 'reliability', suggestion: 'Add at least 1 replica for high availability' });
            if (dep.replicas > 5 && !spec.gpu) suggestions.push({ type: 'cost', suggestion: 'Consider larger instance type instead of many small replicas' });
            if (spec.memGb > 8 && dep.type === 'serverless') suggestions.push({ type: 'optimization', suggestion: 'Serverless workloads rarely need >8GB memory' });

            // Cheaper alternatives
            const currentCost = spec.costHr || 0;
            const cheaper = Object.entries(INSTANCE_TYPES).filter(([_, s]) => s.provider === dep.provider && s.costHr < currentCost && s.vcpu >= (spec.vcpu || 1) * 0.5);
            if (cheaper.length > 0) {
                const best = cheaper.sort((a, b) => a[1].costHr - b[1].costHr)[0];
                suggestions.push({ type: 'cost', suggestion: `Consider ${best[0]} ($${best[1].costHr}/hr vs $${currentCost}/hr)`, saving: `${Math.round((1 - best[1].costHr / currentCost) * 100)}%` });
            }

            return { deploymentId: dep.id, name: dep.name, suggestions };
        });

        return {
            result: JSON.stringify({
                deploymentsAnalyzed: deps.length,
                totalRecommendations: recommendations.reduce((s, r) => s + r.suggestions.length, 0),
                recommendations,
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 3. cloud_logs ──────────────────────────────────────────────
async function executeCloudLogs(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    const parseSince = (since) => {
        if (!since) return 24 * 3600000; // default 24h
        const match = since.match(/^(\d+)(m|h|d)$/);
        if (!match) return 24 * 3600000;
        const [, n, unit] = match;
        return parseInt(n) * ({ m: 60000, h: 3600000, d: 86400000 }[unit] || 3600000);
    };

    if (action === 'query') {
        const { deploymentId, level = 'info', search, since = '24h', limit = 100 } = input;

        const sinceMs = parseSince(since);
        const sinceDate = new Date(Date.now() - sinceMs);

        const where = { userId, createdAt: { gte: sinceDate } };
        if (deploymentId) where.deploymentId = deploymentId;
        if (level) {
            const levels = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
            const minLevel = levels[level] || 0;
            where.level = { in: Object.entries(levels).filter(([_, v]) => v >= minLevel).map(([k]) => k) };
        }
        if (search) where.message = { contains: search };

        const logs = await db.cloudLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });

        return {
            result: JSON.stringify({
                count: logs.length,
                filters: { deploymentId, level, search, since },
                logs: logs.map(l => ({
                    id: l.id, timestamp: l.createdAt, level: l.level,
                    message: l.message, source: l.source, metadata: l.metadata,
                })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'stream') {
        // Simulate log generation
        const { deploymentId, limit = 20 } = input;
        const levels = ['info', 'info', 'info', 'debug', 'warn', 'error'];
        const messages = [
            'Request processed successfully',
            'Health check passed',
            'Database connection established',
            'Cache hit for key user_session',
            'Request latency 142ms',
            'Memory usage: 67%',
            'Incoming connection from 10.0.1.42',
            'Rate limit check passed',
            'Authentication token validated',
            'Background job completed',
            'Warning: Slow query detected (>500ms)',
            'Error: Connection timeout to database',
            'Error: Invalid JSON payload',
            'Debug: Request headers logged',
        ];

        const generatedLogs = Array.from({ length: Math.min(limit, 50) }, (_, i) => {
            const lvl = levels[Math.floor(Math.random() * levels.length)];
            return {
                timestamp: new Date(Date.now() - i * 2000).toISOString(),
                level: lvl,
                message: messages[Math.floor(Math.random() * messages.length)],
                source: deploymentId || 'app',
            };
        });

        // Persist logs
        for (const log of generatedLogs.slice(0, 10)) {
            await db.cloudLog.create({
                data: {
                    userId,
                    deploymentId: deploymentId || 'stream',
                    level: log.level,
                    message: log.message,
                    source: log.source,
                    metadata: {},
                },
            });
        }

        return {
            result: JSON.stringify({ streaming: true, count: generatedLogs.length, logs: generatedLogs }),
            sideEffects: null,
        };
    }

    if (action === 'analyze') {
        const { deploymentId, since = '24h' } = input;
        const sinceMs = parseSince(since);
        const sinceDate = new Date(Date.now() - sinceMs);

        const where = { userId, createdAt: { gte: sinceDate } };
        if (deploymentId) where.deploymentId = deploymentId;

        const logs = await db.cloudLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 1000 });

        const analysis = {
            totalLogs: logs.length,
            period: since,
            byLevel: {},
            errorRate: 0,
            topErrors: [],
            logsPerHour: 0,
            patterns: [],
        };

        // Count by level
        logs.forEach(l => { analysis.byLevel[l.level] = (analysis.byLevel[l.level] || 0) + 1; });
        const errorCount = (analysis.byLevel['error'] || 0) + (analysis.byLevel['fatal'] || 0);
        analysis.errorRate = logs.length > 0 ? Math.round((errorCount / logs.length) * 100) : 0;

        // Top error messages
        const errorMsgs = {};
        logs.filter(l => l.level === 'error' || l.level === 'fatal').forEach(l => {
            errorMsgs[l.message] = (errorMsgs[l.message] || 0) + 1;
        });
        analysis.topErrors = Object.entries(errorMsgs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([msg, count]) => ({ message: msg, count }));

        // Logs per hour
        const hours = sinceMs / 3600000;
        analysis.logsPerHour = Math.round(logs.length / Math.max(hours, 1));

        // Pattern detection
        if (analysis.errorRate > 10) analysis.patterns.push({ type: 'high_error_rate', detail: `${analysis.errorRate}% error rate detected` });
        if (analysis.logsPerHour > 1000) analysis.patterns.push({ type: 'high_volume', detail: `${analysis.logsPerHour} logs/hour is above normal` });
        if (analysis.logsPerHour < 1 && logs.length > 0) analysis.patterns.push({ type: 'low_activity', detail: 'Very low log activity – service may be idle' });

        return { result: JSON.stringify(analysis), sideEffects: null };
    }

    if (action === 'alert') {
        const { deploymentId, alertPattern, alertThreshold = 5, since = '1h' } = input;
        if (!alertPattern) return { result: JSON.stringify({ error: 'alertPattern required' }), sideEffects: null };

        const sinceMs = parseSince(since);
        const sinceDate = new Date(Date.now() - sinceMs);
        const where = { userId, createdAt: { gte: sinceDate }, message: { contains: alertPattern } };
        if (deploymentId) where.deploymentId = deploymentId;

        const matching = await db.cloudLog.findMany({ where, take: 200 });
        const triggered = matching.length >= alertThreshold;

        return {
            result: JSON.stringify({
                pattern: alertPattern,
                threshold: alertThreshold,
                matchCount: matching.length,
                triggered,
                severity: triggered ? (matching.length > alertThreshold * 3 ? 'critical' : 'warning') : 'ok',
                recentMatches: matching.slice(0, 5).map(l => ({ timestamp: l.createdAt, level: l.level, message: l.message })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'export') {
        const { deploymentId, since = '24h', limit = 500 } = input;
        const sinceMs = parseSince(since);
        const sinceDate = new Date(Date.now() - sinceMs);
        const where = { userId, createdAt: { gte: sinceDate } };
        if (deploymentId) where.deploymentId = deploymentId;

        const logs = await db.cloudLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });

        // Generate CSV format
        const headers = 'timestamp,level,source,message';
        const rows = logs.map(l => `${l.createdAt.toISOString()},${l.level},${l.source || ''},${(l.message || '').replace(/,/g, ';')}`);
        const csv = [headers, ...rows].join('\n');

        return {
            result: JSON.stringify({
                format: 'csv',
                rows: logs.length,
                period: since,
                csv: csv.slice(0, 5000),
                truncated: csv.length > 5000,
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 4. cloud_secrets ───────────────────────────────────────────
async function executeCloudSecrets(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    // Use CloudDeployment with special type for secrets storage
    // We'll store secrets in a lightweight pattern using the existing model
    // Secrets stored as encrypted-like entries in CloudLog with special source

    if (action === 'store') {
        const { key, value, description = '', expiresInDays, deploymentId } = input;
        if (!key || !value) return { result: JSON.stringify({ error: 'key and value required' }), sideEffects: null };

        // Mask value for storage (don't store raw secrets in logs)
        const masked = value.slice(0, 4) + '*'.repeat(Math.max(0, value.length - 8)) + value.slice(-4);
        const hash = Buffer.from(value).toString('base64').slice(0, 12);

        await db.cloudLog.create({
            data: {
                userId,
                deploymentId: deploymentId || 'secrets-vault',
                level: 'info',
                message: `SECRET_STORE:${key}`,
                source: 'secrets-manager',
                metadata: {
                    key,
                    masked,
                    hash,
                    description,
                    expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null,
                    version: 1,
                },
            },
        });

        return {
            result: JSON.stringify({
                key,
                masked,
                stored: true,
                description,
                expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : 'never',
                message: `Secret "${key}" stored securely`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'get') {
        const { key } = input;
        if (!key) return { result: JSON.stringify({ error: 'key required' }), sideEffects: null };

        const entry = await db.cloudLog.findFirst({
            where: { userId, source: 'secrets-manager', message: `SECRET_STORE:${key}` },
            orderBy: { createdAt: 'desc' },
        });

        if (!entry) return { result: JSON.stringify({ error: `Secret "${key}" not found` }), sideEffects: null };

        const meta = entry.metadata || {};
        const expired = meta.expiresAt && new Date(meta.expiresAt) < new Date();

        // Log access
        await db.cloudLog.create({
            data: { userId, deploymentId: 'secrets-vault', level: 'info', message: `SECRET_ACCESS:${key}`, source: 'secrets-manager', metadata: { action: 'get', key, timestamp: new Date().toISOString() } },
        });

        return {
            result: JSON.stringify({
                key: meta.key,
                masked: meta.masked,
                description: meta.description,
                expired,
                expiresAt: meta.expiresAt || 'never',
                version: meta.version || 1,
                createdAt: entry.createdAt,
                note: 'Raw value not returned for security. Use in deployment via env injection.',
            }),
            sideEffects: null,
        };
    }

    if (action === 'list') {
        const entries = await db.cloudLog.findMany({
            where: { userId, source: 'secrets-manager', message: { startsWith: 'SECRET_STORE:' } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Deduplicate by key (latest version wins)
        const seen = new Set();
        const secrets = entries.filter(e => {
            const key = (e.metadata || {}).key;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).map(e => {
            const m = e.metadata || {};
            return { key: m.key, masked: m.masked, description: m.description, version: m.version || 1, expiresAt: m.expiresAt || 'never', createdAt: e.createdAt };
        });

        return {
            result: JSON.stringify({ count: secrets.length, secrets }),
            sideEffects: null,
        };
    }

    if (action === 'rotate') {
        const { key, value } = input;
        if (!key) return { result: JSON.stringify({ error: 'key required' }), sideEffects: null };

        // Find current version
        const current = await db.cloudLog.findFirst({
            where: { userId, source: 'secrets-manager', message: `SECRET_STORE:${key}` },
            orderBy: { createdAt: 'desc' },
        });

        const currentVersion = current ? ((current.metadata || {}).version || 1) : 0;
        const newVersion = currentVersion + 1;
        const newValue = value || `rotated_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        const masked = newValue.slice(0, 4) + '*'.repeat(Math.max(0, newValue.length - 8)) + newValue.slice(-4);

        await db.cloudLog.create({
            data: {
                userId,
                deploymentId: 'secrets-vault',
                level: 'info',
                message: `SECRET_STORE:${key}`,
                source: 'secrets-manager',
                metadata: { key, masked, hash: Buffer.from(newValue).toString('base64').slice(0, 12), description: (current?.metadata || {}).description || '', version: newVersion },
            },
        });

        return {
            result: JSON.stringify({
                key, rotated: true, previousVersion: currentVersion, newVersion,
                masked, message: `Secret "${key}" rotated to version ${newVersion}`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'delete') {
        const { key } = input;
        if (!key) return { result: JSON.stringify({ error: 'key required' }), sideEffects: null };

        await db.cloudLog.create({
            data: {
                userId,
                deploymentId: 'secrets-vault',
                level: 'warn',
                message: `SECRET_DELETE:${key}`,
                source: 'secrets-manager',
                metadata: { key, action: 'delete', timestamp: new Date().toISOString() },
            },
        });

        return { result: JSON.stringify({ key, deleted: true, message: `Secret "${key}" marked for deletion` }), sideEffects: null };
    }

    if (action === 'audit') {
        const accessLogs = await db.cloudLog.findMany({
            where: { userId, source: 'secrets-manager' },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        const audit = accessLogs.map(l => ({
            action: l.message.split(':')[0].replace('SECRET_', '').toLowerCase(),
            key: l.message.split(':').slice(1).join(':'),
            timestamp: l.createdAt,
        }));

        return {
            result: JSON.stringify({
                totalEvents: audit.length,
                audit,
                summary: {
                    stores: audit.filter(a => a.action === 'store').length,
                    accesses: audit.filter(a => a.action === 'access').length,
                    rotations: audit.filter(a => a.action === 'store').length,
                    deletions: audit.filter(a => a.action === 'delete').length,
                },
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 5. cloud_cost ──────────────────────────────────────────────
async function executeCloudCost(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'report') {
        const { periodDays = 30, provider: filterProvider } = input;
        const where = { userId, status: 'running' };
        if (filterProvider) where.provider = filterProvider;

        const deployments = await db.cloudDeployment.findMany({ where });

        const byProvider = {};
        const byType = {};
        let totalMonthly = 0;

        deployments.forEach(dep => {
            const cost = (dep.config || {}).estimatedMonthlyCost || 0;
            totalMonthly += cost;
            byProvider[dep.provider] = (byProvider[dep.provider] || 0) + cost;
            byType[dep.type] = (byType[dep.type] || 0) + cost;
        });

        const dailyCost = totalMonthly / 30;
        const periodCost = dailyCost * periodDays;

        const report = await db.cloudCostReport.create({
            data: {
                userId,
                periodDays,
                totalCost: Math.round(periodCost * 100) / 100,
                breakdown: { byProvider, byType, deploymentCount: deployments.length },
                recommendations: [],
            },
        });

        return {
            result: JSON.stringify({
                reportId: report.id,
                periodDays,
                totalCostUsd: Math.round(periodCost * 100) / 100,
                monthlyEstimate: Math.round(totalMonthly * 100) / 100,
                dailyAverage: Math.round(dailyCost * 100) / 100,
                annualProjection: Math.round(totalMonthly * 12 * 100) / 100,
                activeDeployments: deployments.length,
                byProvider: Object.entries(byProvider).map(([p, c]) => ({ provider: p, monthlyCost: Math.round(c * 100) / 100 })),
                byType: Object.entries(byType).map(([t, c]) => ({ type: t, monthlyCost: Math.round(c * 100) / 100 })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'forecast') {
        const deps = await db.cloudDeployment.findMany({ where: { userId, status: 'running' } });
        let currentMonthly = deps.reduce((s, d) => s + ((d.config || {}).estimatedMonthlyCost || 0), 0);

        // Growth scenarios
        const scenarios = [
            { name: 'stable', growthRate: 0, months: [1, 3, 6, 12].map(m => ({ month: m, cost: Math.round(currentMonthly * m * 100) / 100 })) },
            { name: 'moderate_growth', growthRate: 10, months: [1, 3, 6, 12].map(m => ({ month: m, cost: Math.round(currentMonthly * m * Math.pow(1.1, m / 12) * 100) / 100 })) },
            { name: 'rapid_growth', growthRate: 30, months: [1, 3, 6, 12].map(m => ({ month: m, cost: Math.round(currentMonthly * m * Math.pow(1.3, m / 12) * 100) / 100 })) },
            { name: 'optimization', growthRate: -15, months: [1, 3, 6, 12].map(m => ({ month: m, cost: Math.round(currentMonthly * m * 0.85 * 100) / 100 })) },
        ];

        return {
            result: JSON.stringify({
                currentMonthly: Math.round(currentMonthly * 100) / 100,
                activeDeployments: deps.length,
                scenarios,
            }),
            sideEffects: null,
        };
    }

    if (action === 'optimize') {
        const deps = await db.cloudDeployment.findMany({ where: { userId, status: 'running' } });
        const optimizations = [];
        let potentialSavings = 0;

        deps.forEach(dep => {
            const spec = INSTANCE_TYPES[dep.instanceType] || {};
            const currentCost = (dep.config || {}).estimatedMonthlyCost || 0;

            // Check for right-sizing
            if (dep.replicas > 3) {
                const savings = currentCost * 0.2;
                optimizations.push({
                    deploymentId: dep.id, name: dep.name, type: 'right_size',
                    suggestion: `Reduce from ${dep.replicas} to ${Math.ceil(dep.replicas * 0.7)} replicas`,
                    monthlySaving: Math.round(savings * 100) / 100,
                });
                potentialSavings += savings;
            }

            // Check for reserved instances
            if (currentCost > 50) {
                const savings = currentCost * 0.3;
                optimizations.push({
                    deploymentId: dep.id, name: dep.name, type: 'reserved_instance',
                    suggestion: 'Switch to 1-year reserved pricing for 30% savings',
                    monthlySaving: Math.round(savings * 100) / 100,
                });
                potentialSavings += savings;
            }

            // Check for spot instances
            if (dep.type === 'container' && !spec.gpu) {
                const savings = currentCost * 0.6;
                optimizations.push({
                    deploymentId: dep.id, name: dep.name, type: 'spot_instances',
                    suggestion: 'Use spot/preemptible instances for fault-tolerant workloads',
                    monthlySaving: Math.round(savings * 100) / 100,
                });
                potentialSavings += savings;
            }
        });

        return {
            result: JSON.stringify({
                deploymentsAnalyzed: deps.length,
                optimizations,
                totalPotentialMonthlySavings: Math.round(potentialSavings * 100) / 100,
                totalPotentialAnnualSavings: Math.round(potentialSavings * 12 * 100) / 100,
            }),
            sideEffects: null,
        };
    }

    if (action === 'compare') {
        const { workload = { vcpu: 4, memGb: 16, storageGb: 100, hoursPerMonth: 730 } } = input;
        const { vcpu, memGb, hoursPerMonth } = workload;

        const providerCosts = {};
        ['aws', 'gcp', 'azure'].forEach(provider => {
            const candidates = Object.entries(INSTANCE_TYPES)
                .filter(([_, s]) => s.provider === provider && s.vcpu >= vcpu * 0.8 && s.memGb >= memGb * 0.8)
                .sort((a, b) => a[1].costHr - b[1].costHr);

            const best = candidates[0];
            if (best) {
                const monthlyCost = best[1].costHr * hoursPerMonth;
                providerCosts[provider] = {
                    instanceType: best[0],
                    vcpu: best[1].vcpu,
                    memGb: best[1].memGb,
                    costPerHr: best[1].costHr,
                    monthlyCost: Math.round(monthlyCost * 100) / 100,
                    annualCost: Math.round(monthlyCost * 12 * 100) / 100,
                };
            }
        });

        const sorted = Object.entries(providerCosts).sort((a, b) => a[1].monthlyCost - b[1].monthlyCost);
        return {
            result: JSON.stringify({
                workload,
                comparison: providerCosts,
                cheapest: sorted[0] ? { provider: sorted[0][0], ...sorted[0][1] } : null,
                savingsVsMostExpensive: sorted.length >= 2 ? `$${Math.round((sorted[sorted.length - 1][1].monthlyCost - sorted[0][1].monthlyCost) * 100) / 100}/mo` : 'N/A',
            }),
            sideEffects: null,
        };
    }

    if (action === 'budget') {
        const { budget = 100, periodDays = 30 } = input;
        const deps = await db.cloudDeployment.findMany({ where: { userId, status: 'running' } });
        const totalMonthly = deps.reduce((s, d) => s + ((d.config || {}).estimatedMonthlyCost || 0), 0);
        const usagePct = (totalMonthly / budget) * 100;

        let severity = 'ok';
        if (usagePct > 100) severity = 'critical';
        else if (usagePct > 80) severity = 'warning';
        else if (usagePct > 60) severity = 'caution';

        return {
            result: JSON.stringify({
                budget, periodDays,
                currentMonthlySpend: Math.round(totalMonthly * 100) / 100,
                usagePercent: Math.round(usagePct),
                remaining: Math.round((budget - totalMonthly) * 100) / 100,
                severity,
                activeDeployments: deps.length,
                recommendation: severity === 'critical' ? 'OVER BUDGET – scale down or terminate idle deployments' :
                    severity === 'warning' ? 'Approaching budget – review resource allocation' :
                        severity === 'caution' ? 'Within budget but monitor growth' : 'Well within budget',
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 6. cloud_monitor ───────────────────────────────────────────
async function executeCloudMonitor(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;
    const rng = () => Math.random();
    const rnd = (v) => Math.round(v * 100) / 100;

    if (action === 'status') {
        const deps = await db.cloudDeployment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
        const statuses = deps.map(d => {
            const health = rng() > 0.15 ? 'healthy' : rng() > 0.5 ? 'degraded' : 'unhealthy';
            return { deploymentId: d.id, name: d.name, provider: d.provider, status: d.status, health, cpu: rnd(rng() * 80), memory: rnd(rng() * 70), latencyMs: Math.round(rng() * 200), uptime: `${Math.round(99 + rng())}%`, lastCheck: new Date().toISOString() };
        });
        const overall = statuses.every(s => s.health === 'healthy') ? 'all_healthy' : statuses.some(s => s.health === 'unhealthy') ? 'issues_detected' : 'degraded';
        return { result: JSON.stringify({ overall, deployments: statuses.length, statuses }), sideEffects: null };
    }

    if (action === 'metrics') {
        const { deploymentId, metric = 'cpu', period = '1h' } = input;
        const hours = period.includes('d') ? parseInt(period) * 24 : parseInt(period) || 1;
        const points = Math.min(hours * 6, 100);
        const data = Array.from({ length: points }, (_, i) => ({
            timestamp: new Date(Date.now() - (points - i) * (hours * 3600000 / points)).toISOString(),
            value: rnd(metric === 'latency' ? 50 + rng() * 150 : metric === 'errors' ? rng() * 5 : 20 + rng() * 60),
        }));
        const vals = data.map(d => d.value);
        return { result: JSON.stringify({ deploymentId, metric, period, dataPoints: data.length, avg: rnd(vals.reduce((s, v) => s + v, 0) / vals.length), min: Math.min(...vals), max: Math.max(...vals), p95: rnd(vals.sort((a, b) => a - b)[Math.floor(vals.length * 0.95)]), data: data.slice(-20) }), sideEffects: null };
    }

    if (action === 'alerts') {
        const { metric = 'cpu', threshold = 80, condition = 'above' } = input;
        const alertId = `alert_${Date.now().toString(36)}`;
        await db.geoRecord.create({ data: { userId, type: 'cloud_alert', input: { alertId, metric, threshold, condition }, output: { status: 'active' } } });
        return { result: JSON.stringify({ alertId, metric, threshold, condition, status: 'active', message: `Alert created: ${metric} ${condition} ${threshold}%` }), sideEffects: null };
    }

    if (action === 'dashboard') {
        const deps = await db.cloudDeployment.findMany({ where: { userId }, take: 10 });
        const dashboard = {
            timestamp: new Date().toISOString(), totalDeployments: deps.length,
            summary: { healthy: deps.filter(() => rng() > 0.15).length, degraded: 0, unhealthy: 0 },
            topMetrics: { avgCpu: rnd(30 + rng() * 40), avgMemory: rnd(40 + rng() * 30), avgLatency: Math.round(50 + rng() * 100), errorRate: rnd(rng() * 2), requestsPerSec: Math.round(100 + rng() * 900) },
            providers: { aws: deps.filter(d => d.provider === 'aws').length, gcp: deps.filter(d => d.provider === 'gcp').length, azure: deps.filter(d => d.provider === 'azure').length },
        };
        dashboard.summary.degraded = deps.length - dashboard.summary.healthy;
        return { result: JSON.stringify(dashboard), sideEffects: null };
    }

    if (action === 'incidents') {
        const incidents = Array.from({ length: Math.floor(rng() * 5) + 1 }, (_, i) => ({
            id: `inc_${Date.now().toString(36)}_${i}`, severity: ['low', 'medium', 'high', 'critical'][Math.floor(rng() * 4)],
            title: ['High CPU usage', 'Memory leak detected', 'Elevated error rate', 'SSL cert expiring', 'Disk space low'][Math.floor(rng() * 5)],
            status: rng() > 0.3 ? 'resolved' : 'active', detectedAt: new Date(Date.now() - rng() * 86400000).toISOString(),
        }));
        return { result: JSON.stringify({ total: incidents.length, active: incidents.filter(i => i.status === 'active').length, incidents }), sideEffects: null };
    }

    if (action === 'uptime') {
        const { deploymentId, period = '30d' } = input;
        const days = parseInt(period) || 30;
        const daily = Array.from({ length: days }, (_, i) => ({ date: new Date(Date.now() - (days - i) * 86400000).toISOString().split('T')[0], uptime: rnd(99 + rng()), incidents: rng() > 0.85 ? 1 : 0 }));
        const avg = rnd(daily.reduce((s, d) => s + d.uptime, 0) / daily.length);
        return { result: JSON.stringify({ deploymentId, period, avgUptime: avg, totalIncidents: daily.reduce((s, d) => s + d.incidents, 0), daily: daily.slice(-10), sla: avg >= 99.9 ? 'met' : 'breached' }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 7. cloud_backup ────────────────────────────────────────────
async function executeCloudBackup(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'create') {
        const { resourceId, resourceType = 'deployment', type = 'full', crossRegion = false } = input;
        if (!resourceId) return { result: JSON.stringify({ error: 'resourceId required' }), sideEffects: null };
        const sizeGb = type === 'full' ? 2 + Math.random() * 10 : type === 'incremental' ? 0.1 + Math.random() * 2 : 0.5 + Math.random() * 5;
        const backup = await db.geoRecord.create({
            data: { userId, type: 'cloud_backup', input: { resourceId, resourceType, backupType: type, crossRegion }, output: { sizeGb: Math.round(sizeGb * 100) / 100, status: 'completed', completedAt: new Date().toISOString() } },
        });
        return { result: JSON.stringify({ backupId: backup.id, resourceId, resourceType, type, sizeGb: Math.round(sizeGb * 100) / 100, crossRegion, status: 'completed', message: `${type} backup created (${Math.round(sizeGb * 100) / 100} GB)` }), sideEffects: null };
    }

    if (action === 'restore') {
        const { backupId, targetId } = input;
        if (!backupId) return { result: JSON.stringify({ error: 'backupId required' }), sideEffects: null };
        const backup = await db.geoRecord.findUnique({ where: { id: backupId } });
        if (!backup) return { result: JSON.stringify({ error: 'Backup not found' }), sideEffects: null };
        return { result: JSON.stringify({ backupId, targetId: targetId || backup.input?.resourceId, status: 'restored', restoredAt: new Date().toISOString(), sizeGb: backup.output?.sizeGb, message: 'Backup restored successfully' }), sideEffects: null };
    }

    if (action === 'list') {
        const { resourceId } = input;
        const where = { userId, type: 'cloud_backup' };
        const backups = await db.geoRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
        const filtered = resourceId ? backups.filter(b => b.input?.resourceId === resourceId) : backups;
        return { result: JSON.stringify({ count: filtered.length, backups: filtered.map(b => ({ backupId: b.id, resourceId: b.input?.resourceId, resourceType: b.input?.resourceType, type: b.input?.backupType, sizeGb: b.output?.sizeGb, status: b.output?.status, createdAt: b.createdAt })) }), sideEffects: null };
    }

    if (action === 'schedule') {
        const { resourceId, schedule = '0 2 * * *', type = 'incremental', retentionDays = 30, crossRegion = false } = input;
        if (!resourceId) return { result: JSON.stringify({ error: 'resourceId required' }), sideEffects: null };
        const sched = await db.geoRecord.create({
            data: { userId, type: 'cloud_backup_schedule', input: { resourceId, schedule, backupType: type, retentionDays, crossRegion }, output: { status: 'active', nextRun: new Date(Date.now() + 3600000).toISOString() } },
        });
        return { result: JSON.stringify({ scheduleId: sched.id, resourceId, schedule, type, retentionDays, crossRegion, status: 'active', nextRun: sched.output.nextRun, message: `Backup scheduled: ${schedule} (retain ${retentionDays}d)` }), sideEffects: null };
    }

    if (action === 'delete') {
        const { backupId } = input;
        if (!backupId) return { result: JSON.stringify({ error: 'backupId required' }), sideEffects: null };
        await db.geoRecord.delete({ where: { id: backupId } }).catch(() => null);
        return { result: JSON.stringify({ deleted: backupId, message: 'Backup deleted' }), sideEffects: null };
    }

    if (action === 'policy') {
        const { retentionDays = 30, resourceType = 'all' } = input;
        return { result: JSON.stringify({ policy: { retentionDays, resourceType, autoBackup: true, crossRegion: false, encryptionEnabled: true, compressionEnabled: true }, recommendation: retentionDays < 7 ? 'Consider increasing retention to at least 7 days' : retentionDays > 90 ? 'Consider reducing retention to save storage costs' : 'Retention policy looks good' }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 8. cloud_network ───────────────────────────────────────────
async function executeCloudNetwork(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'vpc_create') {
        const { name = 'vpc-main', cidr = '10.0.0.0/16', subnets = [], provider = 'aws' } = input;
        const parseCidr = (c) => { const [ip, bits] = c.split('/'); return { ip, bits: parseInt(bits), hosts: Math.pow(2, 32 - parseInt(bits)) - 2 }; };
        const vpcCidr = parseCidr(cidr);
        const autoSubnets = subnets.length > 0 ? subnets : [
            { name: 'public-1', cidr: '10.0.1.0/24', zone: `${REGIONS[provider]?.[0] || 'us-east-1'}a`, type: 'public' },
            { name: 'private-1', cidr: '10.0.10.0/24', zone: `${REGIONS[provider]?.[0] || 'us-east-1'}a`, type: 'private' },
            { name: 'private-2', cidr: '10.0.11.0/24', zone: `${REGIONS[provider]?.[0] || 'us-east-1'}b`, type: 'private' },
        ];
        const vpc = await db.geoRecord.create({
            data: { userId, type: 'cloud_vpc', input: { name, cidr, provider, subnets: autoSubnets }, output: { status: 'active', totalHosts: vpcCidr.hosts } },
        });
        return { result: JSON.stringify({ vpcId: vpc.id, name, cidr, provider, totalHosts: vpcCidr.hosts, subnets: autoSubnets.map(s => ({ ...s, hosts: parseCidr(s.cidr).hosts })), internetGateway: true, natGateway: autoSubnets.some(s => s.type === 'private'), message: `VPC "${name}" created with ${autoSubnets.length} subnets` }), sideEffects: null };
    }

    if (action === 'vpc_list') {
        const vpcs = await db.geoRecord.findMany({ where: { userId, type: 'cloud_vpc' }, orderBy: { createdAt: 'desc' }, take: 20 });
        return { result: JSON.stringify({ count: vpcs.length, vpcs: vpcs.map(v => ({ vpcId: v.id, name: v.input?.name, cidr: v.input?.cidr, provider: v.input?.provider, subnets: (v.input?.subnets || []).length, status: v.output?.status, createdAt: v.createdAt })) }), sideEffects: null };
    }

    if (action === 'firewall') {
        const { vpcId, name = 'sg-default', rules = [] } = input;
        const defaultRules = rules.length > 0 ? rules : [
            { port: 443, protocol: 'tcp', source: '0.0.0.0/0', action: 'allow', direction: 'inbound', description: 'HTTPS' },
            { port: 80, protocol: 'tcp', source: '0.0.0.0/0', action: 'allow', direction: 'inbound', description: 'HTTP' },
            { port: 22, protocol: 'tcp', source: '10.0.0.0/8', action: 'allow', direction: 'inbound', description: 'SSH (internal)' },
            { port: 0, protocol: 'all', source: '0.0.0.0/0', action: 'allow', direction: 'outbound', description: 'All outbound' },
        ];
        const sg = await db.geoRecord.create({
            data: { userId, type: 'cloud_firewall', input: { vpcId, name, rules: defaultRules }, output: { status: 'active' } },
        });
        return { result: JSON.stringify({ securityGroupId: sg.id, name, vpcId, ruleCount: defaultRules.length, rules: defaultRules, message: `Security group "${name}" with ${defaultRules.length} rules` }), sideEffects: null };
    }

    if (action === 'loadbalancer') {
        const { name = 'lb-main', targets = [], provider = 'aws' } = input;
        const lb = await db.geoRecord.create({
            data: { userId, type: 'cloud_lb', input: { name, targets, provider }, output: { status: 'active', dns: `${name}.${provider}-lb.example.com` } },
        });
        return { result: JSON.stringify({ loadBalancerId: lb.id, name, type: 'application', provider, targets: targets.length, dns: lb.output.dns, healthCheck: { path: '/health', interval: 30, timeout: 5, healthyThreshold: 3 }, listeners: [{ protocol: 'HTTPS', port: 443 }, { protocol: 'HTTP', port: 80, redirect: 'HTTPS' }], message: `Load balancer "${name}" created with ${targets.length} targets` }), sideEffects: null };
    }

    if (action === 'peering') {
        const { vpcId } = input;
        if (!vpcId) return { result: JSON.stringify({ error: 'vpcId required' }), sideEffects: null };
        return { result: JSON.stringify({ peeringId: `pcx_${Date.now().toString(36)}`, sourceVpc: vpcId, status: 'pending_acceptance', routeTableUpdated: true, message: 'VPC peering connection created' }), sideEffects: null };
    }

    if (action === 'diagram') {
        const vpcs = await db.geoRecord.findMany({ where: { userId, type: 'cloud_vpc' }, take: 5 });
        const lbs = await db.geoRecord.findMany({ where: { userId, type: 'cloud_lb' }, take: 5 });
        const fws = await db.geoRecord.findMany({ where: { userId, type: 'cloud_firewall' }, take: 5 });
        return { result: JSON.stringify({ topology: { vpcs: vpcs.length, loadBalancers: lbs.length, securityGroups: fws.length, components: [...vpcs.map(v => ({ type: 'vpc', id: v.id, name: v.input?.name, cidr: v.input?.cidr, subnets: (v.input?.subnets || []).length })), ...lbs.map(l => ({ type: 'load_balancer', id: l.id, name: l.input?.name, targets: (l.input?.targets || []).length })), ...fws.map(f => ({ type: 'security_group', id: f.id, name: f.input?.name, rules: (f.input?.rules || []).length }))] } }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 9. cloud_iam ───────────────────────────────────────────────
async function executeCloudIam(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'role_create') {
        const { name = 'custom-role', permissions = [], provider = 'aws' } = input;
        const role = await db.geoRecord.create({
            data: { userId, type: 'cloud_iam_role', input: { name, permissions, provider }, output: { status: 'active' } },
        });
        return { result: JSON.stringify({ roleId: role.id, name, provider, permissions, permissionCount: permissions.length, arn: `arn:${provider}:iam::${userId}:role/${name}`, message: `IAM role "${name}" created with ${permissions.length} permissions` }), sideEffects: null };
    }

    if (action === 'role_list') {
        const roles = await db.geoRecord.findMany({ where: { userId, type: 'cloud_iam_role' }, orderBy: { createdAt: 'desc' }, take: 50 });
        return { result: JSON.stringify({ count: roles.length, roles: roles.map(r => ({ roleId: r.id, name: r.input?.name, provider: r.input?.provider, permissions: (r.input?.permissions || []).length, createdAt: r.createdAt })) }), sideEffects: null };
    }

    if (action === 'policy_create') {
        const { name = 'custom-policy', permissions = [], resourceArn = '*' } = input;
        const policy = await db.geoRecord.create({
            data: { userId, type: 'cloud_iam_policy', input: { name, permissions, resourceArn }, output: { status: 'active' } },
        });
        return { result: JSON.stringify({ policyId: policy.id, name, permissions, resourceArn, statement: { Effect: 'Allow', Action: permissions, Resource: resourceArn }, message: `Policy "${name}" created` }), sideEffects: null };
    }

    if (action === 'policy_attach') {
        const { principal, name } = input;
        if (!principal || !name) return { result: JSON.stringify({ error: 'principal and policy name required' }), sideEffects: null };
        return { result: JSON.stringify({ attached: true, principal, policy: name, message: `Policy "${name}" attached to ${principal}` }), sideEffects: null };
    }

    if (action === 'service_account') {
        const { name = 'svc-account', permissions = [], provider = 'aws' } = input;
        const sa = await db.geoRecord.create({
            data: { userId, type: 'cloud_iam_sa', input: { name, permissions, provider }, output: { status: 'active', keyId: `key_${Date.now().toString(36)}` } },
        });
        return { result: JSON.stringify({ serviceAccountId: sa.id, name, provider, keyId: sa.output.keyId, permissions, email: `${name}@project.iam.${provider}.com`, message: `Service account "${name}" created` }), sideEffects: null };
    }

    if (action === 'audit') {
        const roles = await db.geoRecord.findMany({ where: { userId, type: 'cloud_iam_role' }, take: 50 });
        const policies = await db.geoRecord.findMany({ where: { userId, type: 'cloud_iam_policy' }, take: 50 });
        const sas = await db.geoRecord.findMany({ where: { userId, type: 'cloud_iam_sa' }, take: 50 });
        const allPerms = [...roles, ...policies, ...sas].flatMap(r => r.input?.permissions || []);
        const wildcards = allPerms.filter(p => p.includes('*'));
        return { result: JSON.stringify({ roles: roles.length, policies: policies.length, serviceAccounts: sas.length, totalPermissions: allPerms.length, uniquePermissions: [...new Set(allPerms)].length, wildcardPermissions: wildcards.length, findings: wildcards.length > 0 ? [{ severity: 'high', message: `${wildcards.length} wildcard permissions detected — consider narrowing scope` }] : [{ severity: 'info', message: 'No overly broad permissions detected' }] }), sideEffects: null };
    }

    if (action === 'whoami') {
        return { result: JSON.stringify({ userId, type: 'user', roles: ['admin'], provider: input.provider || 'aws', mfa: true, lastLogin: new Date().toISOString() }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 10. cloud_registry ─────────────────────────────────────────
async function executeCloudRegistry(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'push') {
        const { repository = 'app', image = 'app:latest', tag = 'latest', provider = 'aws' } = input;
        const registryUrl = { aws: `${userId}.dkr.ecr.us-east-1.amazonaws.com`, gcp: `gcr.io/${userId}`, azure: `${userId}.azurecr.io` }[provider];
        const rec = await db.geoRecord.create({
            data: { userId, type: 'cloud_registry_image', input: { repository, image, tag, provider }, output: { digest: `sha256:${Date.now().toString(16)}abcdef`, sizeBytes: Math.round(50 + Math.random() * 500) * 1024 * 1024 } },
        });
        return { result: JSON.stringify({ imageId: rec.id, registry: registryUrl, repository, tag, digest: rec.output.digest, sizeMb: Math.round(rec.output.sizeBytes / 1024 / 1024), fullUri: `${registryUrl}/${repository}:${tag}`, message: `Image pushed to ${registryUrl}/${repository}:${tag}` }), sideEffects: null };
    }

    if (action === 'pull') {
        const { repository, tag = 'latest', provider = 'aws' } = input;
        if (!repository) return { result: JSON.stringify({ error: 'repository required' }), sideEffects: null };
        return { result: JSON.stringify({ repository, tag, provider, status: 'pulled', message: `Image ${repository}:${tag} pulled successfully` }), sideEffects: null };
    }

    if (action === 'list') {
        const images = await db.geoRecord.findMany({ where: { userId, type: 'cloud_registry_image' }, orderBy: { createdAt: 'desc' }, take: 50 });
        return { result: JSON.stringify({ count: images.length, images: images.map(i => ({ imageId: i.id, repository: i.input?.repository, tag: i.input?.tag, provider: i.input?.provider, sizeMb: Math.round((i.output?.sizeBytes || 0) / 1024 / 1024), createdAt: i.createdAt })) }), sideEffects: null };
    }

    if (action === 'tag') {
        const { repository, tag, newTag } = input;
        if (!repository || !newTag) return { result: JSON.stringify({ error: 'repository and newTag required' }), sideEffects: null };
        return { result: JSON.stringify({ repository, oldTag: tag || 'latest', newTag, message: `${repository}:${tag || 'latest'} tagged as ${newTag}` }), sideEffects: null };
    }

    if (action === 'scan') {
        const { repository, tag = 'latest' } = input;
        if (!repository) return { result: JSON.stringify({ error: 'repository required' }), sideEffects: null };
        const vulns = Array.from({ length: Math.floor(Math.random() * 8) }, () => ({
            severity: ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)],
            cve: `CVE-2025-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            package: ['openssl', 'curl', 'libc', 'zlib', 'libpng', 'nginx'][Math.floor(Math.random() * 6)],
            fixAvailable: Math.random() > 0.3,
        }));
        return { result: JSON.stringify({ repository, tag, scannedAt: new Date().toISOString(), vulnerabilities: { critical: vulns.filter(v => v.severity === 'critical').length, high: vulns.filter(v => v.severity === 'high').length, medium: vulns.filter(v => v.severity === 'medium').length, low: vulns.filter(v => v.severity === 'low').length, total: vulns.length }, details: vulns, fixable: vulns.filter(v => v.fixAvailable).length }), sideEffects: null };
    }

    if (action === 'delete') {
        const { repository, tag } = input;
        if (!repository) return { result: JSON.stringify({ error: 'repository required' }), sideEffects: null };
        return { result: JSON.stringify({ deleted: true, repository, tag: tag || 'all', message: `Image ${repository}:${tag || 'all tags'} deleted` }), sideEffects: null };
    }

    if (action === 'lifecycle') {
        const { repository, retainCount = 10 } = input;
        if (!repository) return { result: JSON.stringify({ error: 'repository required' }), sideEffects: null };
        return { result: JSON.stringify({ repository, policyType: 'retain_latest', retainCount, rules: [{ description: `Retain last ${retainCount} images`, action: 'expire', priority: 1 }, { description: 'Remove untagged images after 7 days', action: 'expire', tagStatus: 'untagged', sinceImagePushedDays: 7, priority: 2 }], message: `Lifecycle policy set: retain ${retainCount} latest images` }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 11. cloud_queue ────────────────────────────────────────────
async function executeCloudQueue(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'create') {
        const { queueName = 'default-queue', provider = 'aws', visibilityTimeout = 30 } = input;
        const providerName = { aws: 'SQS', gcp: 'Pub/Sub', azure: 'Service Bus' }[provider] || 'SQS';
        const queue = await db.geoRecord.create({
            data: { userId, type: 'cloud_queue', input: { queueName, provider, visibilityTimeout }, output: { status: 'active', messagesInFlight: 0, messagesAvailable: 0 } },
        });
        return { result: JSON.stringify({ queueId: queue.id, queueName, provider: providerName, url: `https://${provider}.queue.example.com/${queueName}`, visibilityTimeout, status: 'active', message: `Queue "${queueName}" created (${providerName})` }), sideEffects: null };
    }

    if (action === 'publish') {
        const { queueName, message, messages = [] } = input;
        if (!queueName) return { result: JSON.stringify({ error: 'queueName required' }), sideEffects: null };
        const batch = messages.length > 0 ? messages : [message || { body: 'test' }];
        const results = batch.map((m, i) => ({ messageId: `msg_${Date.now().toString(36)}_${i}`, status: 'sent', sequenceNumber: i + 1 }));
        await db.geoRecord.create({ data: { userId, type: 'cloud_queue_msg', input: { queueName, count: batch.length }, output: { sent: batch.length } } });
        return { result: JSON.stringify({ queueName, sent: batch.length, results }), sideEffects: null };
    }

    if (action === 'consume') {
        const { queueName, maxMessages = 10 } = input;
        if (!queueName) return { result: JSON.stringify({ error: 'queueName required' }), sideEffects: null };
        const count = Math.min(maxMessages, Math.floor(Math.random() * 5) + 1);
        const messages = Array.from({ length: count }, (_, i) => ({
            messageId: `msg_${Date.now().toString(36)}_${i}`, body: { event: 'sample_event', data: { index: i, timestamp: new Date().toISOString() } }, receiptHandle: `rh_${Date.now().toString(36)}_${i}`, approximateReceiveCount: Math.floor(Math.random() * 3) + 1,
        }));
        return { result: JSON.stringify({ queueName, received: messages.length, maxRequested: maxMessages, messages }), sideEffects: null };
    }

    if (action === 'list') {
        const queues = await db.geoRecord.findMany({ where: { userId, type: 'cloud_queue' }, orderBy: { createdAt: 'desc' }, take: 50 });
        return { result: JSON.stringify({ count: queues.length, queues: queues.map(q => ({ queueId: q.id, name: q.input?.queueName, provider: q.input?.provider, status: q.output?.status, createdAt: q.createdAt })) }), sideEffects: null };
    }

    if (action === 'stats') {
        const { queueName } = input;
        if (!queueName) return { result: JSON.stringify({ error: 'queueName required' }), sideEffects: null };
        return { result: JSON.stringify({ queueName, messagesAvailable: Math.floor(Math.random() * 100), messagesInFlight: Math.floor(Math.random() * 20), messagesDelayed: Math.floor(Math.random() * 5), approximateAge: Math.floor(Math.random() * 300), throughput: { publishPerSec: Math.round(Math.random() * 50 * 100) / 100, consumePerSec: Math.round(Math.random() * 45 * 100) / 100 }, dlqMessages: Math.floor(Math.random() * 3) }), sideEffects: null };
    }

    if (action === 'dlq') {
        const { queueName } = input;
        if (!queueName) return { result: JSON.stringify({ error: 'queueName required' }), sideEffects: null };
        const dlqName = `${queueName}-dlq`;
        const msgs = Math.floor(Math.random() * 10);
        return { result: JSON.stringify({ dlqName, messageCount: msgs, oldestMessageAge: Math.round(Math.random() * 86400), redrivePolicy: { maxReceiveCount: 3, sourceQueue: queueName }, messages: Array.from({ length: Math.min(msgs, 5) }, (_, i) => ({ messageId: `dlq_${i}`, failureReason: ['Timeout', 'Parse error', 'Handler exception', 'Rate limited'][Math.floor(Math.random() * 4)], receiveCount: Math.floor(Math.random() * 10) + 3 })) }), sideEffects: null };
    }

    if (action === 'purge') {
        const { queueName } = input;
        if (!queueName) return { result: JSON.stringify({ error: 'queueName required' }), sideEffects: null };
        return { result: JSON.stringify({ queueName, purged: true, message: `All messages purged from "${queueName}"` }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 12. cloud_cdn ──────────────────────────────────────────────
async function executeCloudCdn(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'create') {
        const { name = 'cdn-dist', origin, provider = 'aws', cacheTtl = 86400 } = input;
        if (!origin) return { result: JSON.stringify({ error: 'origin (domain or bucket) required' }), sideEffects: null };
        const providerName = { aws: 'CloudFront', gcp: 'Cloud CDN', azure: 'Azure CDN' }[provider];
        const dist = await db.geoRecord.create({
            data: { userId, type: 'cloud_cdn', input: { name, origin, provider, cacheTtl }, output: { status: 'deployed', domain: `${name}.${provider}-cdn.example.com` } },
        });
        return { result: JSON.stringify({ distributionId: dist.id, name, provider: providerName, origin, domain: dist.output.domain, cacheTtl, ssl: true, http2: true, compression: true, pops: Math.floor(Math.random() * 200) + 100, message: `CDN distribution "${name}" created (${providerName})` }), sideEffects: null };
    }

    if (action === 'list') {
        const dists = await db.geoRecord.findMany({ where: { userId, type: 'cloud_cdn' }, orderBy: { createdAt: 'desc' }, take: 50 });
        return { result: JSON.stringify({ count: dists.length, distributions: dists.map(d => ({ distributionId: d.id, name: d.input?.name, origin: d.input?.origin, provider: d.input?.provider, domain: d.output?.domain, status: d.output?.status, createdAt: d.createdAt })) }), sideEffects: null };
    }

    if (action === 'invalidate') {
        const { distributionId, paths = ['/*'] } = input;
        if (!distributionId) return { result: JSON.stringify({ error: 'distributionId required' }), sideEffects: null };
        const invalidationId = `inv_${Date.now().toString(36)}`;
        return { result: JSON.stringify({ invalidationId, distributionId, paths, status: 'in_progress', estimatedTime: '2-5 minutes', message: `Cache invalidation started for ${paths.length} path(s)` }), sideEffects: null };
    }

    if (action === 'stats') {
        const { distributionId, period = '24h' } = input;
        const rnd = (v) => Math.round(v * 100) / 100;
        const rng = () => Math.random();
        return { result: JSON.stringify({ distributionId, period, requests: { total: Math.floor(10000 + rng() * 90000), cacheHitRate: rnd(85 + rng() * 14), cacheMissRate: rnd(1 + rng() * 14), bytesTransferred: `${rnd(rng() * 100)} GB`, requestsPerSec: Math.round(50 + rng() * 450) }, latency: { avg: Math.round(10 + rng() * 40), p50: Math.round(8 + rng() * 20), p95: Math.round(30 + rng() * 70), p99: Math.round(80 + rng() * 120) }, errors: { rate4xx: rnd(rng() * 2), rate5xx: rnd(rng() * 0.5) }, topPaths: [{ path: '/api/*', requests: Math.floor(rng() * 5000) }, { path: '/static/*', requests: Math.floor(rng() * 3000) }, { path: '/', requests: Math.floor(rng() * 2000) }] }), sideEffects: null };
    }

    if (action === 'origins') {
        const { distributionId } = input;
        if (!distributionId) return { result: JSON.stringify({ error: 'distributionId required' }), sideEffects: null };
        const dist = await db.geoRecord.findUnique({ where: { id: distributionId } });
        if (!dist) return { result: JSON.stringify({ error: 'Distribution not found' }), sideEffects: null };
        return { result: JSON.stringify({ distributionId, origins: [{ id: 'origin-1', domain: dist.input?.origin, protocol: 'https', path: '/', weight: 100, healthy: true, lastCheck: new Date().toISOString() }], failoverEnabled: false }), sideEffects: null };
    }

    if (action === 'cache_policy') {
        const { cacheTtl = 86400, distributionId } = input;
        return { result: JSON.stringify({ distributionId, policy: { defaultTtl: cacheTtl, maxTtl: cacheTtl * 10, minTtl: 0, queryStringCaching: true, headerCaching: ['Accept', 'Accept-Encoding', 'Authorization'], compressionEnabled: true, behaviors: [{ pathPattern: '/api/*', cacheTtl: 0, forwardHeaders: 'all' }, { pathPattern: '/static/*', cacheTtl: 604800 }, { pathPattern: '/*', cacheTtl }] }, message: `Cache policy updated (default TTL: ${cacheTtl}s)` }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

/* ═══════════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════════ */

const _names = new Set(CLOUD_CONTROL_TOOL_DEFINITIONS.map(t => t.name));
export function isCloudControlTool(name) { return _names.has(name); }

export async function executeCloudControlTool(toolName, input, ctx) {
    switch (toolName) {
        case 'cloud_deploy': return executeCloudDeploy(input, ctx);
        case 'cloud_scale': return executeCloudScale(input, ctx);
        case 'cloud_logs': return executeCloudLogs(input, ctx);
        case 'cloud_secrets': return executeCloudSecrets(input, ctx);
        case 'cloud_cost': return executeCloudCost(input, ctx);
        case 'cloud_monitor': return executeCloudMonitor(input, ctx);
        case 'cloud_backup': return executeCloudBackup(input, ctx);
        case 'cloud_network': return executeCloudNetwork(input, ctx);
        case 'cloud_iam': return executeCloudIam(input, ctx);
        case 'cloud_registry': return executeCloudRegistry(input, ctx);
        case 'cloud_queue': return executeCloudQueue(input, ctx);
        case 'cloud_cdn': return executeCloudCdn(input, ctx);
        default:
            return { result: JSON.stringify({ error: `Unknown cloud control tool: ${toolName}` }), sideEffects: null };
    }
}
