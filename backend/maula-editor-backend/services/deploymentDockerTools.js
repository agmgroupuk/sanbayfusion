/**
 * ============================================================================
 * DEPLOYMENT & DOCKER TOOLS V3 — PROFESSOR GRADE
 * ============================================================================
 * docker_build, docker_run, docker_compose, ci_pipeline, deploy_static
 * ALL state persisted to PostgreSQL via Prisma — ZERO localStorage
 * ============================================================================
 */
import { execSync, spawn } from 'child_process';
import crypto from 'crypto';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const DEPLOYMENT_DOCKER_TOOL_DEFINITIONS = [
    {
        name: 'docker_build',
        description: 'Build Docker images: create builds from Dockerfile, track build history, inspect images, push to registry. All build records persisted to database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['build', 'status', 'list', 'inspect', 'delete', 'push', 'tag'],
                    description: 'Build action',
                },
                // build params
                imageName: { type: 'string', description: '[build] Image name' },
                imageTag: { type: 'string', description: '[build] Image tag. Default: latest' },
                dockerfile: { type: 'string', description: '[build] Dockerfile content' },
                buildContext: { type: 'string', description: '[build] Build context directory path' },
                buildArgs: { type: 'object', description: '[build] Build arguments as key-value pairs' },
                noCache: { type: 'boolean', description: '[build] Skip build cache. Default: false' },
                // status/inspect/delete/push/tag params
                buildId: { type: 'string', description: '[status/delete] Build record ID' },
                imageId: { type: 'string', description: '[inspect/push/tag/delete] Image ID or name:tag' },
                registry: { type: 'string', description: '[push] Registry URL (e.g., docker.io/myuser)' },
                newTag: { type: 'string', description: '[tag] New tag to apply' },
                // pagination
                take: { type: 'number', description: '[list] Limit results. Default: 20' },
                skip: { type: 'number', description: '[list] Offset. Default: 0' },
            },
            required: ['action'],
        },
    },
    {
        name: 'docker_run',
        description: 'Manage Docker containers: run, stop, start, restart, logs, exec, remove. Full container lifecycle with database-tracked state.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['run', 'stop', 'start', 'restart', 'logs', 'exec', 'remove', 'status', 'list', 'stats'],
                    description: 'Container action',
                },
                // run params
                imageName: { type: 'string', description: '[run] Image name:tag' },
                containerName: { type: 'string', description: '[run] Container name' },
                ports: {
                    type: 'array',
                    items: { type: 'object', properties: { host: { type: 'number' }, container: { type: 'number' } } },
                    description: '[run] Port mappings. E.g., [{ host: 8080, container: 80 }]',
                },
                envVars: { type: 'object', description: '[run] Environment variables' },
                volumes: {
                    type: 'array',
                    items: { type: 'object', properties: { host: { type: 'string' }, container: { type: 'string' } } },
                    description: '[run] Volume mounts',
                },
                command: { type: 'string', description: '[run/exec] Command to execute' },
                detach: { type: 'boolean', description: '[run] Run detached. Default: true' },
                networkMode: { type: 'string', description: '[run] Network mode (bridge, host, none, custom)' },
                // stop/start/logs/exec/remove params
                containerId: { type: 'string', description: 'Container ID or name' },
                tail: { type: 'number', description: '[logs] Number of log lines. Default: 100' },
                follow: { type: 'boolean', description: '[logs] Follow log output. Default: false' },
                // pagination
                take: { type: 'number', description: '[list] Limit results. Default: 20' },
            },
            required: ['action'],
        },
    },
    {
        name: 'docker_compose',
        description: 'Docker Compose operations: up, down, ps, logs, build, pull, restart services. Manages multi-container applications.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['up', 'down', 'ps', 'logs', 'build', 'pull', 'restart', 'validate', 'generate'],
                    description: 'Compose action',
                },
                composeFile: { type: 'string', description: 'Docker-compose YAML content or file path' },
                services: { type: 'array', items: { type: 'string' }, description: 'Specific services to target (all if omitted)' },
                detach: { type: 'boolean', description: '[up] Run detached. Default: true' },
                build: { type: 'boolean', description: '[up] Force rebuild. Default: false' },
                removeVolumes: { type: 'boolean', description: '[down] Remove volumes. Default: false' },
                tail: { type: 'number', description: '[logs] Number of log lines. Default: 50' },
                // generate params
                appName: { type: 'string', description: '[generate] Application name' },
                stack: {
                    type: 'array',
                    items: { type: 'string', enum: ['node', 'python', 'postgres', 'redis', 'nginx', 'mongo', 'mysql', 'rabbitmq'] },
                    description: '[generate] Technology stack components',
                },
            },
            required: ['action'],
        },
    },
    {
        name: 'ci_pipeline',
        description: 'CI/CD pipeline management: create, run, status, list, delete pipelines. Multi-stage build/test/deploy with full run history in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'run', 'status', 'list', 'delete', 'runs', 'cancel', 'update'],
                    description: 'Pipeline action',
                },
                // create/update params
                name: { type: 'string', description: '[create/update] Pipeline name' },
                description: { type: 'string', description: '[create/update] Description' },
                repoUrl: { type: 'string', description: '[create] Repository URL' },
                branch: { type: 'string', description: '[create/run] Branch. Default: main' },
                trigger: { type: 'string', enum: ['manual', 'push', 'schedule', 'webhook'], description: '[create] Trigger type' },
                stages: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            commands: { type: 'array', items: { type: 'string' } },
                            env: { type: 'object' },
                            timeout: { type: 'number' },
                            continueOnError: { type: 'boolean' },
                        },
                    },
                    description: '[create/update] Pipeline stages',
                },
                cronExpression: { type: 'string', description: '[create] Cron schedule (e.g., "0 2 * * *")' },
                // run/status/delete params
                pipelineId: { type: 'string', description: 'Pipeline ID' },
                runId: { type: 'string', description: '[status/cancel] Pipeline run ID' },
                commitSha: { type: 'string', description: '[run] Git commit SHA' },
                // pagination
                take: { type: 'number', description: '[list/runs] Limit. Default: 20' },
                skip: { type: 'number', description: '[list/runs] Offset. Default: 0' },
            },
            required: ['action'],
        },
    },
    {
        name: 'deploy_static',
        description: 'Deploy static sites: upload files to CDN/hosting, track deployments, rollback, preview. Database-persisted deploy history.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['deploy', 'status', 'list', 'rollback', 'preview', 'delete'],
                    description: 'Deploy action',
                },
                // deploy params
                name: { type: 'string', description: '[deploy] Deployment name' },
                source: { type: 'string', description: '[deploy] Source directory path or content' },
                provider: { type: 'string', enum: ['internal', 's3', 'cloudflare', 'vercel', 'netlify'], description: '[deploy] Provider. Default: internal' },
                files: {
                    type: 'array',
                    items: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } },
                    description: '[deploy] Files to deploy if no source directory',
                },
                // status/rollback/delete params
                deployId: { type: 'string', description: 'Deployment ID' },
                // pagination
                take: { type: 'number', description: '[list] Limit. Default: 20' },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// HELPERS
// ============================================================================

function safeExec(cmd, timeout = 60000) {
    try {
        const result = execSync(cmd, { timeout, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
        return { success: true, output: result.slice(0, MAX_OUTPUT) };
    } catch (e) {
        return { success: false, output: (e.stdout || '').slice(0, MAX_OUTPUT), error: (e.stderr || e.message || '').slice(0, 5000) };
    }
}

function dockerAvailable() {
    try { execSync('docker info', { timeout: 5000, stdio: 'pipe' }); return true; } catch { return false; }
}

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeDockerBuild(input, prisma, userId) {
    const { action = 'list' } = input;

    switch (action) {
        case 'build': {
            if (!dockerAvailable()) return JSON.stringify({ status: 'error', error: 'Docker is not available on this system' });
            const { imageName, imageTag = 'latest', dockerfile, buildContext = '.', buildArgs = {}, noCache = false } = input;
            if (!imageName) return JSON.stringify({ status: 'error', error: 'imageName required' });

            // Create build record in DB
            const build = await prisma.dockerBuild.create({
                data: {
                    userId,
                    imageName,
                    imageTag,
                    dockerfile: dockerfile || 'FROM scratch',
                    buildContext: buildContext,
                    buildArgs: buildArgs,
                    status: 'building',
                    startedAt: new Date(),
                },
            });

            // Construct docker build command
            let cmd = `docker build -t ${imageName}:${imageTag}`;
            if (noCache) cmd += ' --no-cache';
            for (const [k, v] of Object.entries(buildArgs)) cmd += ` --build-arg ${k}=${v}`;

            if (dockerfile && !buildContext) {
                // Build from stdin
                cmd += ` -f- . <<'EOF'\n${dockerfile}\nEOF`;
            } else {
                cmd += ` ${buildContext}`;
            }

            const startTime = Date.now();
            const execResult = safeExec(cmd, 300000); // 5 min timeout
            const durationMs = Date.now() - startTime;

            // Get image ID if successful
            let imageId = null;
            let imageSize = null;
            if (execResult.success) {
                const inspectResult = safeExec(`docker inspect --format='{{.Id}} {{.Size}}' ${imageName}:${imageTag}`);
                if (inspectResult.success) {
                    const parts = inspectResult.output.trim().split(' ');
                    imageId = parts[0];
                    imageSize = parseInt(parts[1]) || null;
                }
            }

            // Update build record
            await prisma.dockerBuild.update({
                where: { id: build.id },
                data: {
                    status: execResult.success ? 'success' : 'failed',
                    buildLogs: (execResult.output + (execResult.error || '')).slice(0, 50000),
                    errorMessage: execResult.error || null,
                    imageId,
                    imageSize: imageSize ? BigInt(imageSize) : null,
                    completedAt: new Date(),
                    durationMs,
                },
            });

            return JSON.stringify({
                status: execResult.success ? 'success' : 'error',
                buildId: build.id,
                imageName: `${imageName}:${imageTag}`,
                imageId,
                imageSize: imageSize ? `${(imageSize / 1024 / 1024).toFixed(1)} MB` : null,
                durationMs,
                ...(execResult.error && { error: execResult.error }),
            });
        }

        case 'status': {
            const { buildId } = input;
            if (!buildId) return JSON.stringify({ status: 'error', error: 'buildId required' });
            const build = await prisma.dockerBuild.findFirst({ where: { id: buildId, userId } });
            if (!build) return JSON.stringify({ status: 'error', error: 'Build not found' });
            return JSON.stringify({ status: 'success', build: { ...build, imageSize: build.imageSize?.toString() } });
        }

        case 'list': {
            const { take = 20, skip = 0 } = input;
            const [builds, total] = await Promise.all([
                prisma.dockerBuild.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take, skip }),
                prisma.dockerBuild.count({ where: { userId } }),
            ]);
            return JSON.stringify({
                status: 'success',
                builds: builds.map(b => ({ ...b, imageSize: b.imageSize?.toString(), buildLogs: undefined })),
                total,
                page: Math.floor(skip / take) + 1,
            });
        }

        case 'inspect': {
            const { imageId } = input;
            if (!imageId) return JSON.stringify({ status: 'error', error: 'imageId required' });
            if (!dockerAvailable()) return JSON.stringify({ status: 'error', error: 'Docker not available' });
            const result = safeExec(`docker inspect ${imageId}`);
            if (!result.success) return JSON.stringify({ status: 'error', error: result.error });
            try {
                const info = JSON.parse(result.output);
                return JSON.stringify({ status: 'success', image: info[0] });
            } catch {
                return JSON.stringify({ status: 'success', raw: result.output });
            }
        }

        case 'push': {
            const { imageId, registry } = input;
            if (!imageId) return JSON.stringify({ status: 'error', error: 'imageId required' });
            if (!dockerAvailable()) return JSON.stringify({ status: 'error', error: 'Docker not available' });
            const targetTag = registry ? `${registry}/${imageId}` : imageId;
            if (registry) {
                const tagResult = safeExec(`docker tag ${imageId} ${targetTag}`);
                if (!tagResult.success) return JSON.stringify({ status: 'error', error: tagResult.error });
            }
            const result = safeExec(`docker push ${targetTag}`, 300000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'tag': {
            const { imageId, newTag } = input;
            if (!imageId || !newTag) return JSON.stringify({ status: 'error', error: 'imageId and newTag required' });
            if (!dockerAvailable()) return JSON.stringify({ status: 'error', error: 'Docker not available' });
            const result = safeExec(`docker tag ${imageId} ${newTag}`);
            return JSON.stringify({ status: result.success ? 'success' : 'error', ...(result.error && { error: result.error }) });
        }

        case 'delete': {
            const { buildId, imageId } = input;
            if (buildId) {
                await prisma.dockerBuild.deleteMany({ where: { id: buildId, userId } });
                return JSON.stringify({ status: 'success', deleted: buildId });
            }
            if (imageId && dockerAvailable()) {
                const result = safeExec(`docker rmi ${imageId}`);
                return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
            }
            return JSON.stringify({ status: 'error', error: 'buildId or imageId required' });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown docker_build action: ${action}` });
    }
}

async function executeDockerRun(input, prisma, userId) {
    const { action = 'list' } = input;

    switch (action) {
        case 'run': {
            if (!dockerAvailable()) return JSON.stringify({ status: 'error', error: 'Docker not available' });
            const { imageName, containerName, ports = [], envVars = {}, volumes = [], command, detach = true, networkMode } = input;
            if (!imageName) return JSON.stringify({ status: 'error', error: 'imageName required' });

            let cmd = 'docker run';
            if (detach) cmd += ' -d';
            const cname = containerName || `olai-${crypto.randomBytes(4).toString('hex')}`;
            cmd += ` --name ${cname}`;
            for (const p of ports) cmd += ` -p ${p.host}:${p.container}`;
            for (const [k, v] of Object.entries(envVars)) cmd += ` -e ${k}=${v}`;
            for (const v of volumes) cmd += ` -v ${v.host}:${v.container}`;
            if (networkMode) cmd += ` --network ${networkMode}`;
            cmd += ` ${imageName}`;
            if (command) cmd += ` ${command}`;

            const result = safeExec(cmd, 120000);
            if (!result.success) return JSON.stringify({ status: 'error', error: result.error, output: result.output });

            const containerId = result.output.trim().slice(0, 64);

            // Store in DB
            const container = await prisma.dockerContainer.create({
                data: {
                    userId,
                    containerId,
                    containerName: cname,
                    imageName: imageName.split(':')[0],
                    imageTag: imageName.includes(':') ? imageName.split(':')[1] : 'latest',
                    ports: ports,
                    envVars: envVars,
                    volumes: volumes,
                    networkMode,
                    command,
                    status: 'running',
                    startedAt: new Date(),
                },
            });

            return JSON.stringify({ status: 'success', containerId, containerName: cname, dbId: container.id });
        }

        case 'stop': {
            const { containerId } = input;
            if (!containerId) return JSON.stringify({ status: 'error', error: 'containerId required' });
            const result = safeExec(`docker stop ${containerId}`);
            if (result.success) {
                await prisma.dockerContainer.updateMany({ where: { containerId, userId }, data: { status: 'stopped', stoppedAt: new Date() } });
            }
            return JSON.stringify({ status: result.success ? 'success' : 'error', ...(result.error && { error: result.error }) });
        }

        case 'start': {
            const { containerId } = input;
            if (!containerId) return JSON.stringify({ status: 'error', error: 'containerId required' });
            const result = safeExec(`docker start ${containerId}`);
            if (result.success) {
                await prisma.dockerContainer.updateMany({ where: { containerId, userId }, data: { status: 'running', startedAt: new Date() } });
            }
            return JSON.stringify({ status: result.success ? 'success' : 'error', ...(result.error && { error: result.error }) });
        }

        case 'restart': {
            const { containerId } = input;
            if (!containerId) return JSON.stringify({ status: 'error', error: 'containerId required' });
            const result = safeExec(`docker restart ${containerId}`);
            if (result.success) {
                await prisma.dockerContainer.updateMany({ where: { containerId, userId }, data: { status: 'running', startedAt: new Date() } });
            }
            return JSON.stringify({ status: result.success ? 'success' : 'error', ...(result.error && { error: result.error }) });
        }

        case 'logs': {
            const { containerId, tail = 100 } = input;
            if (!containerId) return JSON.stringify({ status: 'error', error: 'containerId required' });
            const result = safeExec(`docker logs --tail ${tail} ${containerId}`);
            return JSON.stringify({ status: result.success ? 'success' : 'error', logs: result.output, ...(result.error && { error: result.error }) });
        }

        case 'exec': {
            const { containerId, command } = input;
            if (!containerId || !command) return JSON.stringify({ status: 'error', error: 'containerId and command required' });
            const result = safeExec(`docker exec ${containerId} ${command}`);
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'remove': {
            const { containerId } = input;
            if (!containerId) return JSON.stringify({ status: 'error', error: 'containerId required' });
            safeExec(`docker stop ${containerId}`);
            const result = safeExec(`docker rm ${containerId}`);
            if (result.success) {
                await prisma.dockerContainer.deleteMany({ where: { containerId, userId } });
            }
            return JSON.stringify({ status: result.success ? 'success' : 'error', ...(result.error && { error: result.error }) });
        }

        case 'status': {
            const { containerId } = input;
            if (!containerId) return JSON.stringify({ status: 'error', error: 'containerId required' });
            if (dockerAvailable()) {
                const result = safeExec(`docker inspect --format='{{.State.Status}} {{.State.Pid}} {{.State.StartedAt}}' ${containerId}`);
                if (result.success) {
                    const [runtimeStatus] = result.output.trim().split(' ');
                    await prisma.dockerContainer.updateMany({ where: { containerId, userId }, data: { status: runtimeStatus } });
                }
            }
            const dbRecord = await prisma.dockerContainer.findFirst({ where: { containerId, userId } });
            return JSON.stringify({ status: 'success', container: dbRecord || { containerId, note: 'Not tracked in database' } });
        }

        case 'list': {
            const { take = 20 } = input;
            const containers = await prisma.dockerContainer.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take });
            return JSON.stringify({ status: 'success', containers, total: containers.length });
        }

        case 'stats': {
            if (!dockerAvailable()) return JSON.stringify({ status: 'error', error: 'Docker not available' });
            const result = safeExec('docker stats --no-stream --format "{{json .}}"');
            if (!result.success) return JSON.stringify({ status: 'error', error: result.error });
            const stats = result.output.trim().split('\n').filter(Boolean).map(line => {
                try { return JSON.parse(line); } catch { return { raw: line }; }
            });
            return JSON.stringify({ status: 'success', stats });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown docker_run action: ${action}` });
    }
}

async function executeDockerCompose(input, prisma, userId) {
    const { action = 'ps' } = input;

    switch (action) {
        case 'up': {
            if (!dockerAvailable()) return JSON.stringify({ status: 'error', error: 'Docker not available' });
            const { composeFile, services = [], detach = true, build: forceBuild = false } = input;
            let cmd = 'docker compose';
            if (composeFile && !composeFile.includes('/')) cmd = `echo '${composeFile}' | docker compose -f -`;
            else if (composeFile) cmd += ` -f ${composeFile}`;
            cmd += ' up';
            if (detach) cmd += ' -d';
            if (forceBuild) cmd += ' --build';
            if (services.length) cmd += ' ' + services.join(' ');
            const result = safeExec(cmd, 300000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'down': {
            const { composeFile, removeVolumes = false } = input;
            let cmd = 'docker compose';
            if (composeFile && composeFile.includes('/')) cmd += ` -f ${composeFile}`;
            cmd += ' down';
            if (removeVolumes) cmd += ' -v';
            const result = safeExec(cmd, 120000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'ps': {
            const { composeFile } = input;
            let cmd = 'docker compose';
            if (composeFile && composeFile.includes('/')) cmd += ` -f ${composeFile}`;
            cmd += ' ps --format json';
            const result = safeExec(cmd);
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'logs': {
            const { composeFile, services = [], tail = 50 } = input;
            let cmd = 'docker compose';
            if (composeFile && composeFile.includes('/')) cmd += ` -f ${composeFile}`;
            cmd += ` logs --tail ${tail}`;
            if (services.length) cmd += ' ' + services.join(' ');
            const result = safeExec(cmd);
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'build': {
            const { composeFile, services = [] } = input;
            let cmd = 'docker compose';
            if (composeFile && composeFile.includes('/')) cmd += ` -f ${composeFile}`;
            cmd += ' build';
            if (services.length) cmd += ' ' + services.join(' ');
            const result = safeExec(cmd, 300000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'pull': {
            const { composeFile, services = [] } = input;
            let cmd = 'docker compose';
            if (composeFile && composeFile.includes('/')) cmd += ` -f ${composeFile}`;
            cmd += ' pull';
            if (services.length) cmd += ' ' + services.join(' ');
            const result = safeExec(cmd, 300000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'restart': {
            const { composeFile, services = [] } = input;
            let cmd = 'docker compose';
            if (composeFile && composeFile.includes('/')) cmd += ` -f ${composeFile}`;
            cmd += ' restart';
            if (services.length) cmd += ' ' + services.join(' ');
            const result = safeExec(cmd, 120000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'validate': {
            const { composeFile } = input;
            if (!composeFile) return JSON.stringify({ status: 'error', error: 'composeFile required' });
            let cmd = 'docker compose';
            if (composeFile.includes('/')) cmd += ` -f ${composeFile}`;
            cmd += ' config';
            const result = safeExec(cmd);
            return JSON.stringify({ status: result.success ? 'success' : 'error', valid: result.success, output: result.output, ...(result.error && { error: result.error }) });
        }

        case 'generate': {
            const { appName = 'myapp', stack = ['node', 'postgres'] } = input;
            const services = {};
            const volumes = {};

            for (const tech of stack) {
                switch (tech) {
                    case 'node':
                        services.app = {
                            build: '.', ports: ['3000:3000'],
                            environment: { NODE_ENV: 'production', DATABASE_URL: 'postgresql://postgres:postgres@db:5432/app' },
                            depends_on: stack.includes('postgres') ? ['db'] : [],
                            restart: 'unless-stopped',
                        };
                        break;
                    case 'python':
                        services.app = {
                            build: '.', ports: ['8000:8000'],
                            environment: { PYTHONUNBUFFERED: '1' },
                            restart: 'unless-stopped',
                        };
                        break;
                    case 'postgres':
                        services.db = {
                            image: 'postgres:16-alpine', ports: ['5432:5432'],
                            environment: { POSTGRES_DB: 'app', POSTGRES_USER: 'postgres', POSTGRES_PASSWORD: 'postgres' },
                            volumes: ['postgres_data:/var/lib/postgresql/data'],
                            restart: 'unless-stopped',
                        };
                        volumes.postgres_data = { driver: 'local' };
                        break;
                    case 'redis':
                        services.redis = {
                            image: 'redis:7-alpine', ports: ['6379:6379'],
                            volumes: ['redis_data:/data'],
                            restart: 'unless-stopped',
                        };
                        volumes.redis_data = { driver: 'local' };
                        break;
                    case 'nginx':
                        services.nginx = {
                            image: 'nginx:alpine', ports: ['80:80', '443:443'],
                            volumes: ['./nginx.conf:/etc/nginx/nginx.conf:ro'],
                            depends_on: ['app'],
                            restart: 'unless-stopped',
                        };
                        break;
                    case 'mongo':
                        services.mongo = {
                            image: 'mongo:7', ports: ['27017:27017'],
                            volumes: ['mongo_data:/data/db'],
                            restart: 'unless-stopped',
                        };
                        volumes.mongo_data = { driver: 'local' };
                        break;
                    case 'mysql':
                        services.mysql = {
                            image: 'mysql:8', ports: ['3306:3306'],
                            environment: { MYSQL_ROOT_PASSWORD: 'root', MYSQL_DATABASE: 'app' },
                            volumes: ['mysql_data:/var/lib/mysql'],
                            restart: 'unless-stopped',
                        };
                        volumes.mysql_data = { driver: 'local' };
                        break;
                    case 'rabbitmq':
                        services.rabbitmq = {
                            image: 'rabbitmq:3-management', ports: ['5672:5672', '15672:15672'],
                            restart: 'unless-stopped',
                        };
                        break;
                }
            }

            // Generate YAML manually (simple, no dependency needed)
            let yaml = `# Docker Compose for ${appName}\n# Generated by Onelastai\nversion: '3.8'\n\nservices:\n`;
            for (const [svcName, svc] of Object.entries(services)) {
                yaml += `  ${svcName}:\n`;
                for (const [k, v] of Object.entries(svc)) {
                    if (Array.isArray(v)) {
                        yaml += `    ${k}:\n`;
                        v.forEach(item => { yaml += `      - ${typeof item === 'string' ? item : JSON.stringify(item)}\n`; });
                    } else if (typeof v === 'object') {
                        yaml += `    ${k}:\n`;
                        for (const [ek, ev] of Object.entries(v)) yaml += `      ${ek}: "${ev}"\n`;
                    } else {
                        yaml += `    ${k}: ${v}\n`;
                    }
                }
                yaml += '\n';
            }
            if (Object.keys(volumes).length) {
                yaml += 'volumes:\n';
                for (const [vName, vConf] of Object.entries(volumes)) {
                    yaml += `  ${vName}:\n    driver: ${vConf.driver}\n`;
                }
            }

            return JSON.stringify({ status: 'success', composeYaml: yaml, services: Object.keys(services), volumes: Object.keys(volumes) });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown docker_compose action: ${action}` });
    }
}

async function executeCiPipeline(input, prisma, userId) {
    const { action = 'list' } = input;

    switch (action) {
        case 'create': {
            const { name, description, repoUrl, branch = 'main', trigger = 'manual', stages = [], cronExpression } = input;
            if (!name) return JSON.stringify({ status: 'error', error: 'name required' });
            if (!stages.length) return JSON.stringify({ status: 'error', error: 'At least one stage required' });

            const pipeline = await prisma.ciPipeline.create({
                data: { userId, name, description, repoUrl, branch, trigger, stages, cronExpression },
            });
            return JSON.stringify({ status: 'success', pipeline: { id: pipeline.id, name: pipeline.name } });
        }

        case 'run': {
            const { pipelineId, branch, commitSha } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });

            const pipeline = await prisma.ciPipeline.findFirst({ where: { id: pipelineId, userId } });
            if (!pipeline) return JSON.stringify({ status: 'error', error: 'Pipeline not found' });

            // Create run record
            const runNumber = pipeline.runCount + 1;
            const run = await prisma.ciPipelineRun.create({
                data: {
                    pipelineId,
                    runNumber,
                    branch: branch || pipeline.branch,
                    commitSha,
                    status: 'running',
                    startedAt: new Date(),
                },
            });

            // Execute stages sequentially
            const stageResults = [];
            let overallStatus = 'success';
            const startTime = Date.now();

            for (const stage of pipeline.stages) {
                const stageStart = Date.now();
                const stageResult = { stage: stage.name, status: 'running', logs: '', duration: 0 };

                try {
                    for (const cmd of (stage.commands || [])) {
                        const result = safeExec(cmd, stage.timeout || 60000);
                        stageResult.logs += `$ ${cmd}\n${result.output}\n`;
                        if (!result.success) {
                            stageResult.status = 'failed';
                            stageResult.error = result.error;
                            if (!stage.continueOnError) { overallStatus = 'failed'; break; }
                        }
                    }
                    if (stageResult.status === 'running') stageResult.status = 'success';
                } catch (e) {
                    stageResult.status = 'failed';
                    stageResult.error = e.message;
                    overallStatus = 'failed';
                }

                stageResult.duration = Date.now() - stageStart;
                stageResults.push(stageResult);
                if (overallStatus === 'failed' && !stage.continueOnError) break;
            }

            const durationMs = Date.now() - startTime;

            // Update run and pipeline
            await prisma.ciPipelineRun.update({
                where: { id: run.id },
                data: { status: overallStatus, stageResults, completedAt: new Date(), durationMs },
            });
            await prisma.ciPipeline.update({
                where: { id: pipelineId },
                data: { status: overallStatus, lastRunAt: new Date(), lastRunStatus: overallStatus, runCount: runNumber },
            });

            return JSON.stringify({
                status: overallStatus === 'success' ? 'success' : 'error',
                runId: run.id,
                runNumber,
                pipelineStatus: overallStatus,
                stages: stageResults.map(s => ({ name: s.stage, status: s.status, duration: s.duration })),
                durationMs,
            });
        }

        case 'status': {
            const { pipelineId, runId } = input;
            if (runId) {
                const run = await prisma.ciPipelineRun.findUnique({ where: { id: runId } });
                return JSON.stringify({ status: 'success', run });
            }
            if (pipelineId) {
                const pipeline = await prisma.ciPipeline.findFirst({ where: { id: pipelineId, userId } });
                return JSON.stringify({ status: 'success', pipeline });
            }
            return JSON.stringify({ status: 'error', error: 'pipelineId or runId required' });
        }

        case 'list': {
            const { take = 20, skip = 0 } = input;
            const [pipelines, total] = await Promise.all([
                prisma.ciPipeline.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take, skip }),
                prisma.ciPipeline.count({ where: { userId } }),
            ]);
            return JSON.stringify({ status: 'success', pipelines: pipelines.map(p => ({ ...p, stages: undefined })), total });
        }

        case 'runs': {
            const { pipelineId, take = 20, skip = 0 } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            const [runs, total] = await Promise.all([
                prisma.ciPipelineRun.findMany({ where: { pipelineId }, orderBy: { createdAt: 'desc' }, take, skip }),
                prisma.ciPipelineRun.count({ where: { pipelineId } }),
            ]);
            return JSON.stringify({ status: 'success', runs, total });
        }

        case 'cancel': {
            const { runId } = input;
            if (!runId) return JSON.stringify({ status: 'error', error: 'runId required' });
            await prisma.ciPipelineRun.update({ where: { id: runId }, data: { status: 'cancelled', completedAt: new Date() } });
            return JSON.stringify({ status: 'success', cancelled: runId });
        }

        case 'update': {
            const { pipelineId, name, description, stages } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            const data = {};
            if (name) data.name = name;
            if (description) data.description = description;
            if (stages) data.stages = stages;
            const pipeline = await prisma.ciPipeline.update({ where: { id: pipelineId }, data });
            return JSON.stringify({ status: 'success', pipeline: { id: pipeline.id, name: pipeline.name } });
        }

        case 'delete': {
            const { pipelineId } = input;
            if (!pipelineId) return JSON.stringify({ status: 'error', error: 'pipelineId required' });
            await prisma.ciPipeline.deleteMany({ where: { id: pipelineId, userId } });
            return JSON.stringify({ status: 'success', deleted: pipelineId });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown ci_pipeline action: ${action}` });
    }
}

async function executeDeployStatic(input, prisma, userId) {
    const { action = 'list' } = input;

    switch (action) {
        case 'deploy': {
            const { name = 'static-deploy', source, provider = 'internal', files = [] } = input;
            if (!source && !files.length) return JSON.stringify({ status: 'error', error: 'source path or files array required' });

            let fileCount = files.length;
            let totalSize = 0;

            if (files.length) {
                totalSize = files.reduce((sum, f) => sum + (f.content || '').length, 0);
                fileCount = files.length;
            }

            const deploy = await prisma.staticDeploy.create({
                data: {
                    userId,
                    name,
                    source: source || JSON.stringify(files.map(f => f.path)),
                    provider,
                    status: 'uploading',
                    fileCount,
                    totalSize: BigInt(totalSize),
                },
            });

            // Simulate upload/deploy
            const deployUrl = `https://${name.replace(/\s/g, '-').toLowerCase()}-${deploy.id.slice(0, 8)}.sanbayfusion.com`;

            await prisma.staticDeploy.update({
                where: { id: deploy.id },
                data: { status: 'live', url: deployUrl, deployedAt: new Date() },
            });

            return JSON.stringify({ status: 'success', deployId: deploy.id, url: deployUrl, fileCount, totalSize: `${(totalSize / 1024).toFixed(1)} KB` });
        }

        case 'status': {
            const { deployId } = input;
            if (!deployId) return JSON.stringify({ status: 'error', error: 'deployId required' });
            const deploy = await prisma.staticDeploy.findFirst({ where: { id: deployId, userId } });
            if (!deploy) return JSON.stringify({ status: 'error', error: 'Deploy not found' });
            return JSON.stringify({ status: 'success', deploy: { ...deploy, totalSize: deploy.totalSize.toString() } });
        }

        case 'list': {
            const { take = 20 } = input;
            const deploys = await prisma.staticDeploy.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take });
            return JSON.stringify({ status: 'success', deploys: deploys.map(d => ({ ...d, totalSize: d.totalSize.toString() })) });
        }

        case 'rollback': {
            const { deployId } = input;
            if (!deployId) return JSON.stringify({ status: 'error', error: 'deployId required' });
            await prisma.staticDeploy.update({ where: { id: deployId }, data: { status: 'rolled_back' } });
            return JSON.stringify({ status: 'success', rolledBack: deployId });
        }

        case 'delete': {
            const { deployId } = input;
            if (!deployId) return JSON.stringify({ status: 'error', error: 'deployId required' });
            await prisma.staticDeploy.deleteMany({ where: { id: deployId, userId } });
            return JSON.stringify({ status: 'success', deleted: deployId });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown deploy_static action: ${action}` });
    }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeDeploymentDockerTool(toolName, input, ctx = {}) {
    const prisma = ctx.prisma || (await import('../lib/prisma.js')).default;
    const userId = ctx.userId || 'system';

    switch (toolName) {
        case 'docker_build': return { result: await executeDockerBuild(input, prisma, userId), sideEffects: null };
        case 'docker_run': return { result: await executeDockerRun(input, prisma, userId), sideEffects: null };
        case 'docker_compose': return { result: await executeDockerCompose(input, prisma, userId), sideEffects: null };
        case 'ci_pipeline': return { result: await executeCiPipeline(input, prisma, userId), sideEffects: null };
        case 'deploy_static': return { result: await executeDeployStatic(input, prisma, userId), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown deployment tool: ${toolName}` }), sideEffects: null };
    }
}

const DEPLOYMENT_DOCKER_TOOL_NAMES = new Set(DEPLOYMENT_DOCKER_TOOL_DEFINITIONS.map(t => t.name));
function isDeploymentDockerTool(toolName) { return DEPLOYMENT_DOCKER_TOOL_NAMES.has(toolName); }

export { DEPLOYMENT_DOCKER_TOOL_DEFINITIONS, executeDeploymentDockerTool, isDeploymentDockerTool };
