/**
 * GenCraft Types - Complete type definitions
 */

// Chat attachment metadata (persisted in history)
export interface ChatAttachmentMeta {
  name: string;
  size: number;
  type: string;        // MIME type
  url?: string;        // S3/CDN URL after upload
}

// Chat Messages
export interface FileAction {
  path: string;
  action: 'created' | 'modified' | 'deleted';
  lineCount?: number;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp: number;
  hasAudio?: boolean;
  attachments?: ChatAttachmentMeta[];
  fileActions?: FileAction[];
  thinking?: boolean;
}

// AI Providers (xAI primary, Mistral + OpenAI fallbacks)
export type ModelProvider = 'xAI' | 'Mistral' | 'OpenAI';

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  isThinking?: boolean;
  creditsPerUse?: number;
}

// View Modes
export enum ViewMode {
  PREVIEW = 'preview',
  CODE = 'code',
  SPLIT = 'split',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
}

// Generation State
export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  progressMessage: string;
  isThinking?: boolean;
}

// Generated App
export interface GeneratedApp {
  id: string;
  name: string;
  code: string;
  prompt: string;
  timestamp: number;
  history: ChatMessage[];
  language?: ProgrammingLanguage;
  provider?: string;
  modelId?: string;
  files?: ProjectFile[];
  thumbnail?: string;
  isFavorite?: boolean;
  deployedUrl?: string;
}

// Project Files
export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

// ==================== EDITOR BRIDGE TYPES ====================

// File node for tree structure (re-exported from editorBridge for convenience)
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
}

// Editor selection info
export interface EditorSelection {
  start: { line: number; column: number };
  end: { line: number; column: number };
  text: string;
}

// Editor cursor position
export interface EditorCursor {
  line: number;
  column: number;
}

// Agent command types for surgical edits
export type AgentCommand =
  | { type: 'insert'; path: string; position: { line: number; column: number }; text: string }
  | { type: 'replace'; path: string; start: { line: number; column: number }; end: { line: number; column: number }; text: string }
  | { type: 'replaceSelection'; text: string }
  | { type: 'createFile'; path: string; content: string }
  | { type: 'deleteFile'; path: string }
  | { type: 'renameFile'; oldPath: string; newPath: string }
  | { type: 'updateFile'; path: string; content: string }
  | { type: 'fullRegenerate'; code: string }
  // Multi-page commands
  | { type: 'createPage'; path: string; title: string; content: string }
  | { type: 'updateMultipleFiles'; files: { path: string; content: string }[] }
  // Deployment commands
  | { type: 'deploy'; platform: DeploymentPlatform; config?: Partial<DeploymentConfig> }
  | { type: 'fixBuildError'; error: string; file: string; suggestedFix: string };

// Agent response with possible commands
export interface AgentResponse {
  message: string;
  commands?: AgentCommand[];
  shouldBuild?: boolean;
  code?: string;
}

// ==================== DEPLOYMENT TYPES ====================

export type DeploymentPlatform = 'maula' | 'vercel' | 'railway' | 'netlify' | 'cloudflare';

export interface DeploymentCredentials {
  platform: DeploymentPlatform;
  token: string;
  teamId?: string;
  label?: string;
  addedAt: number;
}

export interface DeploymentConfig {
  platform: DeploymentPlatform;
  projectName: string;
  framework?: 'static' | 'react' | 'vue' | 'nextjs' | 'vite' | 'astro';
  buildCommand?: string;
  outputDir?: string;
  envVars?: Record<string, string>;
  rootDir?: string;
  nodeVersion?: string;
}

export interface DeploymentResult {
  success: boolean;
  platform: DeploymentPlatform;
  url?: string;
  deploymentId?: string;
  buildLogs?: string[];
  error?: string;
  errorType?: 'auth' | 'build' | 'config' | 'network' | 'quota';
  timestamp: number;
}

export interface DeploymentStatus {
  state: 'idle' | 'preparing' | 'uploading' | 'building' | 'deploying' | 'ready' | 'error';
  platform?: DeploymentPlatform;
  progress?: number;
  message: string;
  logs: string[];
  url?: string;
  error?: string;
}

// ==================== MULTI-PAGE PROJECT TYPES ====================

export interface ProjectPage {
  path: string;
  title: string;
  fileName: string;
  content: string;
}

export interface ProjectAsset {
  path: string;
  content: string;
  type: 'css' | 'js' | 'json' | 'image' | 'font' | 'other';
}

export interface MultiPageProject {
  name: string;
  framework: 'static' | 'react' | 'vue' | 'nextjs' | 'vite' | 'astro';
  pages: ProjectPage[];
  assets: ProjectAsset[];
  packageJson?: Record<string, unknown>;
  configFiles?: Record<string, string>;
  entryFile: string;
}

export interface ProjectBuildResult {
  success: boolean;
  files: Record<string, string>;
  errors?: BuildError[];
  warnings?: string[];
}

export interface BuildError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  fixable: boolean;
  suggestedFix?: string;
}

// Programming Languages - Full Stack Support
export type ProgrammingLanguage =
  // Frontend - Web
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'nextjs'
  | 'vue'
  | 'svelte'
  | 'angular'
  | 'tailwind'
  | 'sass'
  // Backend - Server
  | 'nodejs'
  | 'express'
  | 'python'
  | 'fastapi'
  | 'django'
  | 'flask'
  | 'java'
  | 'spring'
  | 'go'
  | 'rust'
  | 'csharp'
  | 'dotnet'
  | 'php'
  | 'laravel'
  | 'ruby'
  | 'rails'
  // Database
  | 'sql'
  | 'postgresql'
  | 'mongodb'
  | 'prisma'
  | 'graphql'
  // Mobile
  | 'reactnative'
  | 'flutter'
  | 'swift'
  | 'kotlin'
  // DevOps & Tools
  | 'docker'
  | 'kubernetes'
  | 'terraform'
  | 'bash'
  | 'powershell'
  // Data & Config
  | 'json'
  | 'yaml'
  | 'markdown'
  | 'xml'
  // AI & Data Science
  | 'jupyter'
  | 'r';

export interface LanguageOption {
  id: ProgrammingLanguage;
  name: string;
  icon: string;
  color: string;
  fileExtension: string;
  description: string;
}

// Templates
export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  language: ProgrammingLanguage;
  category: TemplateCategory;
  icon?: string;
  tags?: string[];
  previewCode?: string;
}

export type TemplateCategory =
  | 'landing'
  | 'dashboard'
  | 'ecommerce'
  | 'portfolio'
  | 'api'
  | 'database'
  | 'automation'
  | 'component'
  | 'fullstack'
  | 'mobile'
  | 'game';

// ═══════════════════════════════════════════════════════════════════
// Phase 2+ Types — Sandbox, Build, Deploy, Git, Assets, DB, Monitoring, Agent
// ═══════════════════════════════════════════════════════════════════

// ── Sandbox ────────────────────────────────────────────────────────

export type SandboxStatus = 'creating' | 'running' | 'stopped' | 'destroyed' | 'error';

export interface SandboxTemplate {
  id: string;
  name: string;
  description: string;
  runtime: string;
  icon?: string;
  defaultPort?: number;
}

export interface Sandbox {
  id: string;
  projectId: string;
  containerId?: string;
  status: SandboxStatus;
  port: number;
  memory: number;
  cpu: number;
  storageUsed: number;
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
}

// ── Build ──────────────────────────────────────────────────────────

export type BuildStageType = 'detect' | 'install' | 'lint' | 'test' | 'build' | 'security' | 'package';
export type BuildStageStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';
export type BuildStatusType = 'queued' | 'building' | 'testing' | 'deploying' | 'success' | 'failed' | 'cancelled';

export interface BuildStage {
  name: BuildStageType;
  status: BuildStageStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  output?: string;
}

export interface BuildConfig {
  framework?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDir?: string;
  env?: Record<string, string>;
}

export interface BuildLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stage?: BuildStageType;
}

export interface BuildRecord {
  id: string;
  projectId: string;
  branch: string;
  commitHash?: string;
  status: BuildStatusType;
  stages: BuildStage[];
  duration?: number;
  artifactUrl?: string;
  triggeredBy: string;
  createdAt: string;
}

// ── Git ────────────────────────────────────────────────────────────

export type GitFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  branch: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  lastCommit?: string;
  behind?: number;
  ahead?: number;
}

export interface GitDiff {
  path: string;
  status: GitFileStatus;
  additions: number;
  deletions: number;
  hunks?: string;
}

export interface GitStatusInfo {
  branch: string;
  staged: GitDiff[];
  unstaged: GitDiff[];
  untracked: string[];
  ahead: number;
  behind: number;
}

// ── Terminal ───────────────────────────────────────────────────────

export interface TerminalSession {
  id: string;
  sandboxId: string;
  cols: number;
  rows: number;
  cwd: string;
  isActive: boolean;
  createdAt: string;
}

export interface TerminalConfig {
  shell?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  fontFamily?: string;
  fontSize?: number;
}

// ── Assets ─────────────────────────────────────────────────────────

export type AssetType = 'image' | 'video' | 'font' | 'document' | 'other';

export interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  mimeType?: string;
}

export interface AssetUpload {
  file: File;
  projectId: string;
  onProgress?: (percent: number) => void;
}

export interface OptimizedAsset {
  id: string;
  type: AssetType;
  originalName: string;
  originalSize: number;
  optimizedSize: number;
  cdnUrl: string;
  thumbnailUrl?: string;
  variants?: Array<{ preset: string; url: string; size: number }>;
  metadata?: AssetMetadata;
  createdAt: string;
}

// ── Database ───────────────────────────────────────────────────────

export type DbEngine = 'postgresql' | 'mysql' | 'sqlite';
export type DbStatusType = 'creating' | 'active' | 'suspended' | 'destroyed' | 'error';

export interface ProjectDatabase {
  id: string;
  projectId: string;
  engine: DbEngine;
  host?: string;
  port?: number;
  name?: string;
  connectionUrl?: string;
  status: DbStatusType;
  sizeBytes: number;
  maxConnections: number;
  lastBackup?: string;
  createdAt: string;
}

export interface DbMigration {
  id: string;
  name: string;
  status: 'applied' | 'pending' | 'failed';
  appliedAt?: string;
  duration?: number;
}

export interface DbBackupRecord {
  id: string;
  key: string;
  sizeBytes: number;
  type: 'manual' | 'scheduled';
  createdAt: string;
}

export interface DbTableInfo {
  name: string;
  rowCount: number;
  sizeBytes: number;
  columns?: Array<{ name: string; type: string; nullable: boolean }>;
}

// ── Monitoring ─────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface MonitoringMetrics {
  cpu: number;
  memory: number;
  disk: number;
  requests: number;
  latency: number;
  uptime: number;
  errorRate: number;
  timestamp: string;
}

export interface ErrorGroup {
  fingerprint: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  stack?: string;
}

export interface HealthCheck {
  target: string;
  type: 'sandbox' | 'deployment' | 'database' | 'custom';
  healthy: boolean;
  latency: number;
  consecutiveFailures: number;
  lastChecked: string;
  uptime: number;
}

// ── Alerts ─────────────────────────────────────────────────────────

export type AlertType = 'error' | 'performance' | 'security' | 'uptime';
export type AlertChannel = 'email' | 'webhook' | 'slack';

export interface AlertRule {
  id: string;
  projectId: string;
  type: AlertType;
  condition: string;
  threshold: number;
  channel: AlertChannel;
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  type: AlertType;
  severity: EventSeverity;
  message: string;
  metadata?: Record<string, unknown>;
  acknowledged: boolean;
  timestamp: string;
}

// ── Project ────────────────────────────────────────────────────────

export type ProjectStatusType = 'active' | 'archived' | 'deleted';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  framework?: string;
  gitRepo?: string;
  defaultBranch?: string;
  sandboxId?: string;
  lastDeployId?: string;
  status: ProjectStatusType;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
  framework: string;
  buildCommand: string;
  devCommand: string;
  outputDir: string;
  installCommand: string;
  env: Record<string, string>;
  nodeVersion?: string;
}

// ── Agent ──────────────────────────────────────────────────────────

export type AgentIntent =
  | 'deploy' | 'build' | 'rollback' | 'debug' | 'scale'
  | 'database' | 'setup' | 'security' | 'status' | 'cost'
  | 'domain' | 'cleanup';

export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentAction {
  action: string;
  service: string;
  method: string;
  label: string;
  status: AgentStepStatus;
  result?: unknown;
  error?: string;
}

export interface AgentTask {
  id: string;
  projectId: string;
  intent: AgentIntent;
  input: string;
  plan: AgentAction[];
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  summary?: string;
  startedAt: string;
  completedAt?: string;
}

export interface AgentCapability {
  intent: AgentIntent;
  label: string;
  description: string;
  icon: string;
  examples: string[];
}
