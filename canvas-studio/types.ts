export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  hasAudio?: boolean;
}

export type ModelProvider = 'xai' | 'mistral' | 'openai' | string;

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  isThinking?: boolean;
}

// File system types for Editor Bridge
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: FileNode[];
  size?: number;
  mimeType?: string;
  createdAt?: number;
  modifiedAt?: number;
}

export interface FileMetadata {
  path: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  mimeType: string;
  language?: string;
  createdAt: number;
  modifiedAt: number;
  permissions: FilePermissions;
}

export interface FilePermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
  execute: boolean;
}

export interface ImageData {
  path: string;
  width: number;
  height: number;
  format: string;
  dataUrl: string;
  size: number;
}

export interface SearchResult {
  path: string;
  matches: { line: number; text: string }[];
}

export interface ApprovalRequest {
  action: string;
  path?: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

export interface EditorSelection {
  path: string;
  start: number;
  end: number;
  text: string;
  lineStart: number;
  lineEnd: number;
}

export interface EditorCursor {
  path: string;
  position: number;
  line: number;
  column: number;
}

export interface GeneratedApp {
  id: string;
  name: string;
  code: string;
  prompt: string;
  timestamp: number;
  history: ChatMessage[];
  language?: string;   // Primary language (html, react, python, etc.)
  provider?: string;   // AI provider used (openai, anthropic, etc.)
  modelId?: string;    // Model ID used (gpt-4o, claude-3, etc.)
  files?: FileNode[];  // Multi-file support
}

export enum ViewMode {
  PREVIEW = 'PREVIEW',
  CODE = 'CODE',
  SPLIT = 'SPLIT',
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  progressMessage: string;
  isThinking?: boolean;
}

// Agent command types for surgical edits
export type AgentCommand =
  | { type: 'insert'; path: string; position: number; content: string }
  | { type: 'replace'; path: string; start: number; end: number; content: string }
  | { type: 'replaceSelection'; content: string }
  | { type: 'createFile'; path: string; content: string }
  | { type: 'deleteFile'; path: string }
  | { type: 'renameFile'; oldPath: string; newPath: string }
  | { type: 'updateFile'; path: string; content: string }
  | { type: 'fullRegenerate'; content: string }
  // Multi-page commands
  | { type: 'createPage'; path: string; title: string; content: string }
  | { type: 'updateMultipleFiles'; files: { path: string; content: string }[] }
  // Deployment commands
  | { type: 'deploy'; platform: DeploymentPlatform; config?: Partial<DeploymentConfig> }
  | { type: 'fixBuildError'; error: string; file: string; suggestedFix: string };

export interface AgentResponse {
  message: string;
  commands?: AgentCommand[];
  code?: string; // For backward compatibility (full code)
}

// ==================== DEPLOYMENT TYPES ====================

export type DeploymentPlatform = 'maula' | 'vercel' | 'railway' | 'netlify' | 'cloudflare';

export interface DeploymentCredentials {
  platform: DeploymentPlatform;
  token: string;
  teamId?: string; // Vercel team, Railway project, etc.
  label?: string; // User-friendly name for this credential
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
  path: string; // e.g., '/', '/about', '/contact'
  title: string;
  fileName: string; // e.g., 'index.html', 'about.html'
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
  configFiles?: Record<string, string>; // e.g., vite.config.ts, tailwind.config.js
  entryFile: string; // Main entry point
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
