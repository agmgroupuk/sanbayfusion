// ============================================
// Maula Editor - Type Definitions
// ============================================

// File System Types
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
  language?: string;
}

export interface OpenFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
}

// Editor Types
export interface EditorTab {
  id: string;
  path: string;
  name: string;
  language: string;
  isActive: boolean;
}

// Terminal Types
export interface TerminalSession {
  id: string;
  name: string;
  isActive: boolean;
}

// Integrated Terminal Types
export type ShellType = 'bash' | 'zsh' | 'sh' | 'powershell' | 'cmd' | 'fish';
export type TerminalStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TerminalTab {
  id: string;
  name: string;
  shellType: ShellType;
  status: TerminalStatus;
  terminalId?: string;
  splitId?: string;
}

export interface TerminalSplit {
  id: string;
  orientation: 'horizontal' | 'vertical';
  leftTerminalId: string;
  rightTerminalId: string;
  splitRatio: number;
}

export interface TerminalConfig {
  defaultShell: ShellType;
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
  copyOnSelect: boolean;
  enableBell: boolean;
  lineHeight: number;
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

// AI Types
export type AIProvider = 'anthropic' | 'mistral' | 'xai' | 'cerebras' | 'groq' | 'gemini' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
}

// Editor Settings - Professional Configuration
export interface EditorSettings {
  // Basic
  fontSize: number;
  fontFamily: string;
  fontLigatures: boolean;
  lineHeight: number;
  letterSpacing: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;

  // Theme & Appearance
  theme: EditorTheme;
  iconTheme: IconTheme;
  customColorScheme?: ColorScheme;
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  smoothScrolling: boolean;
  mouseWheelZoom: boolean;

  // Multi-cursor & Selection
  multiCursorModifier: 'ctrlCmd' | 'alt';
  columnSelection: boolean;

  // Code Intelligence
  quickSuggestions: boolean;
  suggestOnTriggerCharacters: boolean;
  acceptSuggestionOnEnter: 'on' | 'off' | 'smart';
  parameterHints: boolean;
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoIndent: 'none' | 'keep' | 'brackets' | 'advanced' | 'full';
  formatOnPaste: boolean;
  formatOnType: boolean;

  // Display
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  renderControlCharacters: boolean;
  renderLineHighlight: 'none' | 'gutter' | 'line' | 'all';
  bracketPairColorization: boolean;
  guides: {
    indentation: boolean;
    bracketPairs: boolean;
    highlightActiveBracketPair: boolean;
  };

  // Performance (Large Files)
  largeFileOptimizations: boolean;
  maxTokenizationLineLength: number;

  // Diff Editor
  enableSplitViewResizing: boolean;
  renderSideBySide: boolean;

  // Terminal Settings
  terminal: {
    defaultShell: ShellType;
    fontSize: number;
    fontFamily: string;
    cursorStyle: 'block' | 'underline' | 'bar';
    cursorBlink: boolean;
    scrollback: number;
    copyOnSelect: boolean;
    enableBell: boolean;
    lineHeight: number;
  };
}

export type EditorTheme =
  | 'vs-dark'
  | 'vs-light'
  | 'hc-black'
  | 'monokai'
  | 'dracula'
  | 'github-dark'
  | 'one-dark-pro'
  | 'nord'
  | 'solarized-dark'
  | 'material-dark'
  | 'steel'
  | 'charcoal-aurora';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: MessageAttachment[];
  toolEvents?: ToolEvent[];
}

// SSE Streaming Types — Phase 8 Agentic IDE
export interface SSEEvent {
  type: 'status' | 'text' | 'tool_start' | 'tool_result' | 'file_write' | 'file_delete' | 'command_output' | 'image_result' | 'video_result' | 'archive_result' | 'backend_result' | 'code_result' | 'editor_command' | 'agent_memory_result' | 'agent_approval_request' | 'agent_ui_message' | 'agent_ui_question' | 'agent_ui_progress' | 'agent_ui_toast' | 'agent_ui_close' | 'agent_mode_change' | 'agent_status_change' | 'agent_task_started' | 'agent_task_completed' | 'agent_task_cancelled' | 'done' | 'error' | 'thinking' | 'credits' | 'usage' | 'agent_event' | 'worker_text';
  content?: string;
  message?: string;
  tool?: string;
  input?: any;
  success?: boolean;
  summary?: string;
  path?: string;
  error?: string;
  projectFiles?: Record<string, string>;
  // Image result fields
  imageUrl?: string;
  dataUrl?: string;
  imageUrls?: string[];
  dataUrls?: string[];
  width?: number;
  height?: number;
  format?: string;
  // Video result fields
  videoUrl?: string;
  videoUrls?: string[];
  duration?: number;
  thumbnailUrl?: string;
  thumbnailDataUrl?: string;
  outputPath?: string;
  metadata?: Record<string, any>;
  // Archive result fields
  archiveUrl?: string;
  s3Key?: string;
  entryCount?: number;
  size?: number;
  sizeFormatted?: string;
  operation?: string;
  resultCount?: number;
  succeeded?: number;
  failed?: number;
  safe?: boolean;
  fileCount?: number;
  findingCount?: number;
  // Editor command fields
  editorCommand?: 'setCursor' | 'setSelection' | 'insertAtCursor' | 'replaceSelection' | 'scrollToLine' | 'highlightRange';
  line?: number;
  column?: number;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  text?: string;
  // Agent memory fields
  key?: string;
  value?: string;
  scope?: 'session' | 'persistent';
  // Agent approval fields
  approvalId?: string;
  level?: 'safe' | 'moderate' | 'dangerous' | 'critical';
  context?: Record<string, any>;
  // Agent UI fields
  messageId?: string;
  messageType?: 'info' | 'warning' | 'error';
  title?: string;
  style?: string;
  question?: string;
  questionId?: string;
  inputType?: 'text' | 'choice' | 'confirm' | 'multiline';
  options?: string[];
  placeholder?: string;
  progress?: number;
  // Agent control fields
  previousMode?: string;
  newMode?: string;
  modeInfo?: { name: string; description: string; capabilities: string[] };
  taskId?: string;
  taskName?: string;
  taskDescription?: string;
  reason?: string;
  // Multi-agent fields
  agent?: string;
  name?: string;
  event?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
}

export interface ToolEvent {
  type: 'tool_start' | 'tool_result' | 'file_write' | 'file_delete' | 'command_output' | 'image_result' | 'video_result' | 'archive_result' | 'backend_result' | 'code_result' | 'editor_command' | 'agent_memory' | 'agent_approval' | 'agent_ui' | 'agent_control' | 'agent_event' | 'worker_text';
  tool?: string;
  input?: any;
  success?: boolean;
  summary?: string;
  path?: string;
  content?: string;
  // Image fields
  imageUrl?: string;
  dataUrl?: string;
  imageUrls?: string[];
  width?: number;
  height?: number;
  format?: string;
  // Video fields
  videoUrl?: string;
  videoUrls?: string[];
  thumbnailUrl?: string;
  duration?: number;
  // Multi-agent fields
  agent?: string;
  agentName?: string;
  event?: string;
  taskId?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  timestamp: number;
}

export interface ConsoleLine {
  text: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

export interface MessageAttachment {
  type: 'image' | 'file' | 'code';
  name: string;
  content: string;
  mimeType?: string;
}

// Template Types
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: TemplateCategory;
  files: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export type TemplateCategory =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'static'
  | 'python'
  | 'api';

// Extension Types
export interface Extension {
  id: string;
  name: string;
  description: string;
  icon?: string;
  version: string;
  category?: ExtensionCategory;
  enabled?: boolean;
  isBuiltIn?: boolean;
  commands?: ExtensionCommand[];
  actions?: ExtensionAction[];
  settings?: Record<string, any>;
}

export interface ExtensionCommand {
  id: string;
  name: string;
  shortcut?: string;
  handler: () => void | Promise<void>;
}

export interface ExtensionAction {
  id: string;
  label: string;
  icon?: string;
  context: 'editor' | 'file' | 'terminal' | 'global';
  handler: (target?: string) => void | Promise<void>;
}

export type ExtensionCategory =
  | 'Language'
  | 'Framework'
  | 'Formatters'
  | 'Snippets'
  | 'Source Control'
  | 'AI'
  | 'Themes'
  | 'Appearance'
  | 'Tools'
  | 'Testing'
  | 'Database'
  | 'Custom';

// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  template: string;
  files: FileNode[];
  createdAt: number;
  updatedAt: number;
  path?: string; // Server-side project directory path
}

// Workspace Types - Multiple project management
export interface Workspace {
  id: string;
  name: string;
  projectIds: string[];
  lastOpened: number;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

// Recent Project Entry
export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  template: string;
  fileCount: number;
}

// Search Types
export interface SearchMatch {
  fileId: string;
  filePath: string;
  fileName: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchOptions {
  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  isWholeWord: boolean;
  includePattern?: string;
  excludePattern?: string;
}

export interface SearchResult {
  file: FileNode;
  matches: SearchMatch[];
}

// File Operation Types
export interface FileOperation {
  type: 'create' | 'delete' | 'rename' | 'move' | 'copy';
  sourcePath: string;
  targetPath?: string;
  timestamp: number;
}

// Git Status Types (for enhanced Git panel)
export interface GitFileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked' | 'renamed' | 'conflicted';
  staged: boolean;
  originalPath?: string;
}

// Layout Types
export type PanelLayout = 'default' | 'zen' | 'preview-focus' | 'terminal-focus';
export type Theme = 'light' | 'dark' | 'high-contrast' | 'github-dark' | 'dracula' | 'nord' | 'monokai' | 'solarized-dark' | 'one-dark' | 'steel' | 'charcoal-aurora';
export type IconTheme = 'default' | 'material' | 'seti' | 'minimal' | 'vscode';

// Custom Color Scheme
export interface ColorScheme {
  name: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    sidebar: string;
    panel: string;
    border: string;
    selection: string;
    comment: string;
    string: string;
    keyword: string;
    function: string;
    variable: string;
  };
}

// UI Layout Configuration
export interface UILayout {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  terminalHeight: number;
  sidebarPosition: 'left' | 'right';
  panelPosition: 'bottom' | 'right';
  compactMode: boolean;
}

// App State
export interface AppState {
  // Project
  currentProject: Project | null;
  projects: Project[];

  // Files
  files: FileNode[];
  openFiles: OpenFile[];
  activeFileId: string | null;

  // UI
  theme: Theme;
  layout: PanelLayout;
  uiLayout: UILayout;
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  terminalOpen: boolean;

  // AI
  aiConfig: AIConfig;
  chatHistory: ChatMessage[];

  // Extensions
  extensions: Extension[];
}
