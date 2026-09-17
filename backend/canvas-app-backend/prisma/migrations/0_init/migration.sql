-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "password" TEXT,
    "provider" TEXT DEFAULT 'email',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvas_apps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'html',
    "provider" TEXT,
    "modelId" TEXT,
    "thumbnail" TEXT,
    "history" TEXT DEFAULT '[]',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "deployedUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'standalone',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvas_projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Project',
    "description" TEXT,
    "code" TEXT,
    "thumbnail" TEXT,
    "tags" TEXT DEFAULT '[]',
    "metadata" TEXT DEFAULT '{}',
    "source" TEXT NOT NULL DEFAULT 'standalone',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_files" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvas_deploy_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'default',
    "token" TEXT NOT NULL,
    "teamId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'standalone',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_deploy_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvas_deploy_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error" TEXT,
    "source" TEXT NOT NULL DEFAULT 'standalone',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canvas_deploy_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandboxes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "containerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "template" TEXT,
    "port" INTEGER,
    "memory" INTEGER NOT NULL DEFAULT 256,
    "cpu" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "storageUsed" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sandboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builds" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branch" TEXT DEFAULT 'main',
    "commitHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "stages" TEXT DEFAULT '[]',
    "logs" TEXT,
    "duration" INTEGER,
    "artifactUrl" TEXT,
    "artifactSize" INTEGER,
    "triggeredBy" TEXT DEFAULT 'manual',
    "errorMessage" TEXT,
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'preview',
    "url" TEXT,
    "domain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'deploying',
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousDeployId" TEXT,
    "healthStatus" TEXT DEFAULT 'unknown',
    "sizeBytes" INTEGER DEFAULT 0,
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destroyedAt" TIMESTAMP(3),

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'file',
    "originalName" TEXT NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "optimizedSize" INTEGER,
    "s3Key" TEXT NOT NULL,
    "cdnUrl" TEXT,
    "thumbnailUrl" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_databases" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "engine" TEXT NOT NULL DEFAULT 'postgres',
    "host" TEXT,
    "port" INTEGER DEFAULT 5432,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "backupSchedule" TEXT DEFAULT 'daily',
    "lastBackup" TIMESTAMP(3),
    "connectionUrl" TEXT,
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destroyedAt" TIMESTAMP(3),

    CONSTRAINT "project_databases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_errors" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "source" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT DEFAULT '{}',

    CONSTRAINT "monitoring_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'deployment',
    "healthy" BOOLEAN NOT NULL DEFAULT true,
    "latency" INTEGER NOT NULL DEFAULT 0,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "uptime" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "plan" TEXT DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'running',
    "summary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orchestration_tasks" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "error" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orchestration_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "git_commits" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "hash" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "files" TEXT NOT NULL DEFAULT '[]',
    "stats" TEXT DEFAULT '{}',
    "isMerge" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "git_commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "git_branches" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headCommitId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "git_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "git_stashes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "message" TEXT,
    "snapshot" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "git_stashes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "git_tags" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commitId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "git_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "canvas_apps_userId_createdAt_idx" ON "canvas_apps"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "canvas_apps_userId_source_idx" ON "canvas_apps"("userId", "source");

-- CreateIndex
CREATE INDEX "canvas_projects_userId_createdAt_idx" ON "canvas_projects"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "project_files_projectId_idx" ON "project_files"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_files_projectId_path_key" ON "project_files"("projectId", "path");

-- CreateIndex
CREATE INDEX "canvas_deploy_credentials_userId_idx" ON "canvas_deploy_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "canvas_deploy_credentials_userId_platform_label_source_key" ON "canvas_deploy_credentials"("userId", "platform", "label", "source");

-- CreateIndex
CREATE INDEX "canvas_deploy_history_userId_createdAt_idx" ON "canvas_deploy_history"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "canvas_deploy_history_userId_source_idx" ON "canvas_deploy_history"("userId", "source");

-- CreateIndex
CREATE INDEX "sandboxes_projectId_idx" ON "sandboxes"("projectId");

-- CreateIndex
CREATE INDEX "sandboxes_userId_idx" ON "sandboxes"("userId");

-- CreateIndex
CREATE INDEX "builds_projectId_idx" ON "builds"("projectId");

-- CreateIndex
CREATE INDEX "builds_userId_idx" ON "builds"("userId");

-- CreateIndex
CREATE INDEX "builds_status_idx" ON "builds"("status");

-- CreateIndex
CREATE INDEX "deployments_projectId_idx" ON "deployments"("projectId");

-- CreateIndex
CREATE INDEX "deployments_userId_idx" ON "deployments"("userId");

-- CreateIndex
CREATE INDEX "deployments_status_idx" ON "deployments"("status");

-- CreateIndex
CREATE INDEX "assets_projectId_idx" ON "assets"("projectId");

-- CreateIndex
CREATE INDEX "assets_userId_idx" ON "assets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_databases_projectId_key" ON "project_databases"("projectId");

-- CreateIndex
CREATE INDEX "project_databases_projectId_idx" ON "project_databases"("projectId");

-- CreateIndex
CREATE INDEX "project_databases_userId_idx" ON "project_databases"("userId");

-- CreateIndex
CREATE INDEX "monitoring_errors_projectId_idx" ON "monitoring_errors"("projectId");

-- CreateIndex
CREATE INDEX "monitoring_errors_resolved_idx" ON "monitoring_errors"("resolved");

-- CreateIndex
CREATE INDEX "health_checks_projectId_idx" ON "health_checks"("projectId");

-- CreateIndex
CREATE INDEX "agent_tasks_projectId_idx" ON "agent_tasks"("projectId");

-- CreateIndex
CREATE INDEX "agent_tasks_userId_idx" ON "agent_tasks"("userId");

-- CreateIndex
CREATE INDEX "orchestration_tasks_status_idx" ON "orchestration_tasks"("status");

-- CreateIndex
CREATE INDEX "git_commits_projectId_branch_idx" ON "git_commits"("projectId", "branch");

-- CreateIndex
CREATE INDEX "git_commits_projectId_createdAt_idx" ON "git_commits"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "git_branches_projectId_idx" ON "git_branches"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "git_branches_projectId_name_key" ON "git_branches"("projectId", "name");

-- CreateIndex
CREATE INDEX "git_stashes_projectId_idx" ON "git_stashes"("projectId");

-- CreateIndex
CREATE INDEX "git_tags_projectId_idx" ON "git_tags"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "git_tags_projectId_name_key" ON "git_tags"("projectId", "name");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_apps" ADD CONSTRAINT "canvas_apps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_projects" ADD CONSTRAINT "canvas_projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_deploy_credentials" ADD CONSTRAINT "canvas_deploy_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_deploy_history" ADD CONSTRAINT "canvas_deploy_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandboxes" ADD CONSTRAINT "sandboxes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandboxes" ADD CONSTRAINT "sandboxes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_databases" ADD CONSTRAINT "project_databases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_databases" ADD CONSTRAINT "project_databases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "git_commits" ADD CONSTRAINT "git_commits_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "git_branches" ADD CONSTRAINT "git_branches_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "git_stashes" ADD CONSTRAINT "git_stashes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "git_tags" ADD CONSTRAINT "git_tags_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "canvas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

