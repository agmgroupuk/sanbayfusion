import { createLogger } from './logger';
const log = createLogger('editorBridge.ts');
/**
 * MAULA EDITOR - EDITOR BRIDGE
 * Standalone editor state management and bridge for AI agent integration
 * NOTE: This is completely independent from canvas-studio and neural-chat
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export type AgentMode = 'chat' | 'dev' | 'review';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  language?: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

export interface UIMessage {
  type: 'info' | 'warning' | 'error';
  text: string;
  timestamp: number;
}

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'method' | 'property';
  location: { line: number; column: number };
  path: string;
}

export interface DiffResult {
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }>;
  additions: number;
  deletions: number;
}

export interface EditorError {
  path: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface LogEntry {
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface EditorState {
  activeFile: string | null;
  files: Map<string, string>;
  fileLanguages: Map<string, string>;
  cursor: CursorPosition;
  selection: Selection | null;
  projectTree: FileNode[];
  language: string;
  isDirty: boolean;
}

export interface EditOperation {
  type: 'insert' | 'delete' | 'replace';
  position?: CursorPosition;
  endPosition?: CursorPosition;
  text?: string;
  length?: number;
}

export interface EditorBridgeAPI {
  // ===== FILE OPERATIONS =====
  getFile(path: string): string | null;
  writeFile(path: string, content: string): void;
  updateFile(path: string, diff: string): boolean;
  createFile(path: string, content: string, language?: string): void;
  deleteFile(path: string): void;
  renameFile(oldPath: string, newPath: string): void;
  fileExists(path: string): boolean;
  setActiveFile(path: string): void;
  openFile(path: string): void;
  
  // ===== DIRECTORY OPERATIONS =====
  listFiles(directory: string): string[];
  getProjectTree(): FileNode[];
  getAllFiles(): Map<string, string>;
  getOpenFiles(): string[];
  getActiveFile(): string | null;
  
  // ===== CURSOR & SELECTION =====
  getCursor(): CursorPosition;
  setCursor(position: CursorPosition): void;
  getCursorPosition(): CursorPosition;
  setCursorPosition(position: CursorPosition): void;
  getSelection(): Selection | null;
  setSelection(start: CursorPosition, end: CursorPosition): void;
  getSelectedText(): string | null;
  replaceSelection(text: string): void;
  insertAtCursor(text: string): void;
  
  // ===== EDIT OPERATIONS =====
  insertAt(position: CursorPosition, text: string): void;
  replaceRange(start: CursorPosition, end: CursorPosition, text: string): void;
  replaceAll(searchPattern: string, replaceWith: string): void;
  deleteLine(lineNumber: number): void;
  deleteLines(startLine: number, endLine: number): void;
  applyEdits(operations: EditOperation[]): void;
  
  // ===== SEARCH =====
  searchInFiles(query: string): Array<{ path: string; line: number; text: string; match: string }>;
  findFileByName(name: string): string[];
  
  // ===== CODE INTELLIGENCE =====
  getLanguage(path?: string): string;
  setLanguage(lang: string): void;
  getSymbols(path: string): SymbolInfo[];
  findReferences(symbol: string): Array<{ path: string; line: number; column: number }>;
  goToDefinition(symbol: string): { path: string; line: number; column: number } | null;
  
  // ===== COMMANDS & EXECUTION =====
  runCommand(command: string): Promise<{ success: boolean; output: string; error?: string }>;
  runTests(): Promise<{ passed: number; failed: number; errors: string[] }>;
  getErrors(): EditorError[];
  getLogs(): LogEntry[];
  clearLogs(): void;
  
  // ===== DIFF OPERATIONS =====
  generateDiff(oldCode: string, newCode: string): DiffResult;
  showDiff(path: string, diff: DiffResult): void;
  applyDiff(path: string, diff: DiffResult): boolean;
  
  // ===== PROJECT INFO =====
  getDependencies(): Record<string, string>;
  getPackageJson(): Record<string, any> | null;
  getConfigFiles(): string[];
  getEnvInfo(): { nodeVersion?: string; npmVersion?: string; env: Record<string, string> };
  
  // ===== MEMORY/STATE PERSISTENCE =====
  saveMemory(key: string, value: any): void;
  getMemory(key: string): any;
  clearMemory(): void;
  
  // ===== PERMISSIONS =====
  requestApproval(action: string, details?: string): Promise<boolean>;
  checkPermission(action: string): boolean;
  
  // ===== UI MESSAGES =====
  showMessage(text: string): void;
  showWarning(text: string): void;
  showError(text: string): void;
  askUser(question: string): Promise<string | null>;
  
  // ===== AGENT STATE =====
  setMode(mode: AgentMode): void;
  getMode(): AgentMode;
  getAgentState(): {
    mode: AgentMode;
    isRunning: boolean;
    currentTask: string | null;
    memory: Record<string, any>;
  };
  cancelTask(): void;
  
  // ===== STATE =====
  getState(): EditorState;
  isDirty(): boolean;
  markClean(): void;
  
  // ===== UNDO/REDO =====
  undo(): void;
  redo(): void;
  
  // ===== EVENTS =====
  onChange(listener: (state: EditorState) => void): () => void;
  onMessage(listener: (message: UIMessage) => void): () => void;
  
  // ===== CONTEXT =====
  getAgentContext(): {
    activeFile: string | null;
    activeContent: string | null;
    cursor: CursorPosition;
    selection: Selection | null;
    selectedText: string | null;
    projectTree: FileNode[];
    fileCount: number;
    language: string;
    openFiles: string[];
  };
}

// ============================================
// EDITOR BRIDGE IMPLEMENTATION
// ============================================

export class EditorBridge implements EditorBridgeAPI {
  private files: Map<string, string> = new Map();
  private fileLanguages: Map<string, string> = new Map();
  private activeFile: string | null = null;
  private openFiles: Set<string> = new Set();
  private cursor: CursorPosition = { line: 1, column: 1 };
  private selection: Selection | null = null;
  private isDirtyFlag: boolean = false;
  private undoStack: Array<{ files: Map<string, string>; activeFile: string | null }> = [];
  private redoStack: Array<{ files: Map<string, string>; activeFile: string | null }> = [];
  private maxUndoLevels: number = 100;
  private changeListeners: Set<(state: EditorState) => void> = new Set();
  private messageListeners: Set<(message: UIMessage) => void> = new Set();
  
  // Agent state
  private agentMode: AgentMode = 'chat';
  private isRunning: boolean = false;
  private currentTask: string | null = null;
  private memory: Map<string, any> = new Map();
  private permissions: Set<string> = new Set(['read', 'write', 'create', 'delete']);
  private logs: LogEntry[] = [];
  private errors: EditorError[] = [];
  private approvalHandler: ((action: string, details?: string) => Promise<boolean>) | null = null;
  private questionHandler: ((question: string) => Promise<string | null>) | null = null;
  private currentLanguage: string = 'plaintext';

  constructor(initialFiles?: Record<string, string>) {
    if (initialFiles) {
      Object.entries(initialFiles).forEach(([path, content]) => {
        this.files.set(path, content);
        this.fileLanguages.set(path, this.detectLanguage(path));
      });
      const firstFile = Object.keys(initialFiles)[0];
      if (firstFile) {
        this.activeFile = firstFile;
        this.openFiles.add(firstFile);
      }
    }
  }

  // ============================================
  // CHANGE NOTIFICATION
  // ============================================
  
  onChange(listener: (state: EditorState) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(): void {
    const state = this.getState();
    this.changeListeners.forEach(listener => listener(state));
  }

  private saveUndoState(): void {
    this.undoStack.push({
      files: new Map(this.files),
      activeFile: this.activeFile,
    });
    if (this.undoStack.length > this.maxUndoLevels) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.isDirtyFlag = true;
  }

  // ============================================
  // FILE OPERATIONS
  // ============================================

  getFile(path: string): string | null {
    return this.files.get(path) || null;
  }

  setFile(path: string, content: string): void {
    this.saveUndoState();
    this.files.set(path, content);
    if (!this.fileLanguages.has(path)) {
      this.fileLanguages.set(path, this.detectLanguage(path));
    }
    this.notifyChange();
  }

  createFile(path: string, content: string = '', language?: string): void {
    if (this.files.has(path)) {
      log.warn(`File ${path} already exists`);
      return;
    }
    this.saveUndoState();
    this.files.set(path, content);
    this.fileLanguages.set(path, language || this.detectLanguage(path));
    this.notifyChange();
  }

  deleteFile(path: string): void {
    if (!this.files.has(path)) {
      log.warn(`File ${path} does not exist`);
      return;
    }
    this.saveUndoState();
    this.files.delete(path);
    this.fileLanguages.delete(path);
    this.openFiles.delete(path);
    if (this.activeFile === path) {
      const remaining = Array.from(this.openFiles);
      this.activeFile = remaining.length > 0 ? remaining[remaining.length - 1] : null;
    }
    this.notifyChange();
  }

  renameFile(oldPath: string, newPath: string): void {
    const content = this.files.get(oldPath);
    if (content === undefined) {
      log.warn(`File ${oldPath} does not exist`);
      return;
    }
    this.saveUndoState();
    this.files.delete(oldPath);
    this.files.set(newPath, content);
    const language = this.fileLanguages.get(oldPath);
    this.fileLanguages.delete(oldPath);
    this.fileLanguages.set(newPath, language || this.detectLanguage(newPath));
    if (this.openFiles.has(oldPath)) {
      this.openFiles.delete(oldPath);
      this.openFiles.add(newPath);
    }
    if (this.activeFile === oldPath) {
      this.activeFile = newPath;
    }
    this.notifyChange();
  }

  setActiveFile(path: string): void {
    if (!this.files.has(path)) {
      log.warn(`File ${path} does not exist`);
      return;
    }
    this.activeFile = path;
    this.openFiles.add(path);
    this.cursor = { line: 1, column: 1 };
    this.selection = null;
    this.notifyChange();
  }

  // ============================================
  // CURSOR & SELECTION
  // ============================================

  getCursor(): CursorPosition {
    return { ...this.cursor };
  }

  setCursor(position: CursorPosition): void {
    this.cursor = { ...position };
    this.selection = null;
    this.notifyChange();
  }

  getSelection(): Selection | null {
    return this.selection ? {
      start: { ...this.selection.start },
      end: { ...this.selection.end },
    } : null;
  }

  setSelection(start: CursorPosition, end: CursorPosition): void {
    this.selection = {
      start: { ...start },
      end: { ...end },
    };
    this.cursor = { ...end };
    this.notifyChange();
  }

  getSelectedText(): string | null {
    if (!this.selection || !this.activeFile) return null;
    const content = this.files.get(this.activeFile);
    if (!content) return null;

    const lines = content.split('\n');
    const { start, end } = this.selection;

    if (start.line === end.line) {
      return lines[start.line - 1]?.substring(start.column - 1, end.column - 1) || null;
    }

    const selectedLines: string[] = [];
    for (let i = start.line; i <= end.line; i++) {
      const line = lines[i - 1] || '';
      if (i === start.line) {
        selectedLines.push(line.substring(start.column - 1));
      } else if (i === end.line) {
        selectedLines.push(line.substring(0, end.column - 1));
      } else {
        selectedLines.push(line);
      }
    }
    return selectedLines.join('\n');
  }

  // ============================================
  // EDIT OPERATIONS
  // ============================================

  insertAt(position: CursorPosition, text: string): void {
    if (!this.activeFile) return;
    const content = this.files.get(this.activeFile);
    if (content === undefined) return;

    this.saveUndoState();
    const lines = content.split('\n');
    const lineIndex = position.line - 1;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      const colIndex = Math.min(position.column - 1, line.length);
      lines[lineIndex] = line.slice(0, colIndex) + text + line.slice(colIndex);
    } else if (lineIndex >= lines.length) {
      while (lines.length < lineIndex) {
        lines.push('');
      }
      lines.push(text);
    }

    this.files.set(this.activeFile, lines.join('\n'));
    
    const insertedLines = text.split('\n');
    if (insertedLines.length === 1) {
      this.cursor = {
        line: position.line,
        column: position.column + text.length,
      };
    } else {
      this.cursor = {
        line: position.line + insertedLines.length - 1,
        column: insertedLines[insertedLines.length - 1].length + 1,
      };
    }
    
    this.notifyChange();
  }

  insertAtCursor(text: string): void {
    this.insertAt(this.cursor, text);
  }

  replaceSelection(text: string): void {
    if (!this.selection || !this.activeFile) {
      this.insertAtCursor(text);
      return;
    }
    this.replaceRange(this.selection.start, this.selection.end, text);
  }

  replaceRange(start: CursorPosition, end: CursorPosition, text: string): void {
    if (!this.activeFile) return;
    const content = this.files.get(this.activeFile);
    if (content === undefined) return;

    this.saveUndoState();
    const lines = content.split('\n');
    
    const startLineIdx = start.line - 1;
    const endLineIdx = end.line - 1;
    
    if (startLineIdx < 0 || endLineIdx >= lines.length) return;

    const beforeText = lines[startLineIdx].substring(0, start.column - 1);
    const afterText = lines[endLineIdx].substring(end.column - 1);
    
    const newContent = beforeText + text + afterText;
    const newLines = newContent.split('\n');
    
    lines.splice(startLineIdx, endLineIdx - startLineIdx + 1, ...newLines);
    
    this.files.set(this.activeFile, lines.join('\n'));
    this.selection = null;
    
    const insertedLines = text.split('\n');
    if (insertedLines.length === 1) {
      this.cursor = {
        line: start.line,
        column: start.column + text.length,
      };
    } else {
      this.cursor = {
        line: start.line + insertedLines.length - 1,
        column: insertedLines[insertedLines.length - 1].length + 1,
      };
    }
    
    this.notifyChange();
  }

  replaceAll(searchPattern: string, replaceWith: string): void {
    if (!this.activeFile) return;
    const content = this.files.get(this.activeFile);
    if (content === undefined) return;

    this.saveUndoState();
    const newContent = content.split(searchPattern).join(replaceWith);
    this.files.set(this.activeFile, newContent);
    this.notifyChange();
  }

  deleteLine(lineNumber: number): void {
    this.deleteLines(lineNumber, lineNumber);
  }

  deleteLines(startLine: number, endLine: number): void {
    if (!this.activeFile) return;
    const content = this.files.get(this.activeFile);
    if (content === undefined) return;

    this.saveUndoState();
    const lines = content.split('\n');
    const startIdx = startLine - 1;
    const endIdx = endLine - 1;
    
    if (startIdx >= 0 && endIdx < lines.length && startIdx <= endIdx) {
      lines.splice(startIdx, endIdx - startIdx + 1);
      this.files.set(this.activeFile, lines.join('\n'));
      this.cursor = {
        line: Math.min(startLine, lines.length || 1),
        column: 1,
      };
    }
    
    this.notifyChange();
  }

  applyEdits(operations: EditOperation[]): void {
    operations.forEach(op => {
      switch (op.type) {
        case 'insert':
          if (op.position && op.text) {
            this.insertAt(op.position, op.text);
          }
          break;
        case 'delete':
          if (op.position && op.endPosition) {
            this.replaceRange(op.position, op.endPosition, '');
          }
          break;
        case 'replace':
          if (op.position && op.endPosition && op.text !== undefined) {
            this.replaceRange(op.position, op.endPosition, op.text);
          }
          break;
      }
    });
  }

  // ============================================
  // UNDO/REDO
  // ============================================

  undo(): void {
    if (this.undoStack.length === 0) return;
    
    this.redoStack.push({
      files: new Map(this.files),
      activeFile: this.activeFile,
    });
    
    const prevState = this.undoStack.pop()!;
    this.files = prevState.files;
    this.activeFile = prevState.activeFile;
    this.notifyChange();
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    
    this.undoStack.push({
      files: new Map(this.files),
      activeFile: this.activeFile,
    });
    
    const nextState = this.redoStack.pop()!;
    this.files = nextState.files;
    this.activeFile = nextState.activeFile;
    this.notifyChange();
  }

  // ============================================
  // PROJECT STRUCTURE
  // ============================================

  getProjectTree(): FileNode[] {
    const paths = Array.from(this.files.keys()).sort();
    const root: FileNode[] = [];
    
    paths.forEach(path => {
      const parts = path.split('/');
      let current = root;
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const existingNode = current.find(n => n.name === part);
        
        if (existingNode) {
          if (!isFile && existingNode.children) {
            current = existingNode.children;
          }
        } else {
          const newNode: FileNode = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            isDirectory: !isFile,
            children: isFile ? undefined : [],
            language: isFile ? this.fileLanguages.get(path) : undefined,
          };
          current.push(newNode);
          if (!isFile && newNode.children) {
            current = newNode.children;
          }
        }
      });
    });
    
    return root;
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  getState(): EditorState {
    return {
      activeFile: this.activeFile,
      files: new Map(this.files),
      fileLanguages: new Map(this.fileLanguages),
      cursor: { ...this.cursor },
      selection: this.selection ? {
        start: { ...this.selection.start },
        end: { ...this.selection.end },
      } : null,
      projectTree: this.getProjectTree(),
      language: this.activeFile ? (this.fileLanguages.get(this.activeFile) || 'plaintext') : 'plaintext',
      isDirty: this.isDirtyFlag,
    };
  }

  isDirty(): boolean {
    return this.isDirtyFlag;
  }

  markClean(): void {
    this.isDirtyFlag = false;
    this.notifyChange();
  }

  // ============================================
  // AGENT CONTEXT SERIALIZATION
  // ============================================

  getAgentContext(): {
    activeFile: string | null;
    activeContent: string | null;
    cursor: CursorPosition;
    selection: Selection | null;
    selectedText: string | null;
    projectTree: FileNode[];
    fileCount: number;
    language: string;
    openFiles: string[];
  } {
    return {
      activeFile: this.activeFile,
      activeContent: this.activeFile ? (this.files.get(this.activeFile) || null) : null,
      cursor: { ...this.cursor },
      selection: this.getSelection(),
      selectedText: this.getSelectedText(),
      projectTree: this.getProjectTree(),
      fileCount: this.files.size,
      language: this.activeFile ? (this.fileLanguages.get(this.activeFile) || 'plaintext') : 'plaintext',
      openFiles: Array.from(this.openFiles),
    };
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Load all files from a file tree structure
   */
  loadFromFileTree(files: Array<{ path: string; content: string; language?: string }>): void {
    this.saveUndoState();
    this.files.clear();
    this.fileLanguages.clear();
    this.openFiles.clear();
    
    files.forEach(file => {
      this.files.set(file.path, file.content);
      this.fileLanguages.set(file.path, file.language || this.detectLanguage(file.path));
    });
    
    if (files.length > 0) {
      this.activeFile = files[0].path;
      this.openFiles.add(files[0].path);
    }
    
    this.notifyChange();
  }

  /**
   * Export all files as a record
   */
  exportFiles(): Record<string, string> {
    const result: Record<string, string> = {};
    this.files.forEach((content, path) => {
      result[path] = content;
    });
    return result;
  }

  // ============================================
  // UTILITIES
  // ============================================

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'py': 'python',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shellscript',
      'bash': 'shellscript',
      'zsh': 'shellscript',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'kts': 'kotlin',
      'r': 'r',
      'vue': 'vue',
      'svelte': 'svelte',
      'astro': 'astro',
      'prisma': 'prisma',
      'graphql': 'graphql',
      'gql': 'graphql',
      'dockerfile': 'dockerfile',
      'toml': 'toml',
      'ini': 'ini',
      'env': 'dotenv',
      'gitignore': 'ignore',
      'dockerignore': 'ignore',
    };
    return languageMap[ext] || 'plaintext';
  }

  private addLog(level: LogEntry['level'], message: string, data?: any): void {
    this.logs.push({ timestamp: Date.now(), level, message, data });
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
  }

  private notifyMessage(message: UIMessage): void {
    this.messageListeners.forEach(listener => listener(message));
  }

  // ============================================
  // NEW METHODS - FILE EXISTS & UPDATE
  // ============================================

  fileExists(path: string): boolean {
    return this.files.has(path);
  }

  writeFile(path: string, content: string): void {
    this.setFile(path, content);
  }

  updateFile(path: string, diff: string): boolean {
    try {
      const currentContent = this.files.get(path);
      if (currentContent === undefined) return false;
      
      const lines = currentContent.split('\n');
      const diffLines = diff.split('\n');
      
      for (const line of diffLines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          lines.push(line.substring(1));
        }
      }
      
      this.setFile(path, lines.join('\n'));
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // NEW METHODS - DIRECTORY OPERATIONS
  // ============================================

  listFiles(directory: string): string[] {
    const normalizedDir = directory.endsWith('/') ? directory : directory + '/';
    const result: string[] = [];
    
    this.files.forEach((_, path) => {
      if (directory === '/' || directory === '' || path.startsWith(normalizedDir)) {
        result.push(path);
      }
    });
    
    return result;
  }

  getAllFiles(): Map<string, string> {
    return new Map(this.files);
  }

  getOpenFiles(): string[] {
    return Array.from(this.openFiles);
  }

  getActiveFile(): string | null {
    return this.activeFile;
  }

  openFile(path: string): void {
    if (this.files.has(path)) {
      this.setActiveFile(path);
    }
  }

  // ============================================
  // NEW METHODS - CURSOR ALIASES
  // ============================================

  getCursorPosition(): CursorPosition {
    return this.getCursor();
  }

  setCursorPosition(position: CursorPosition): void {
    this.setCursor(position);
  }

  // ============================================
  // NEW METHODS - SEARCH
  // ============================================

  searchInFiles(query: string): Array<{ path: string; line: number; text: string; match: string }> {
    const results: Array<{ path: string; line: number; text: string; match: string }> = [];
    const lowerQuery = query.toLowerCase();
    
    this.files.forEach((content, path) => {
      const lines = content.split('\n');
      lines.forEach((lineText, index) => {
        const lowerLine = lineText.toLowerCase();
        if (lowerLine.includes(lowerQuery)) {
          results.push({
            path,
            line: index + 1,
            text: lineText.trim(),
            match: query
          });
        }
      });
    });
    
    return results;
  }

  findFileByName(name: string): string[] {
    const results: string[] = [];
    const lowerName = name.toLowerCase();
    
    this.files.forEach((_, path) => {
      const fileName = path.split('/').pop()?.toLowerCase() || '';
      if (fileName.includes(lowerName)) {
        results.push(path);
      }
    });
    
    return results;
  }

  // ============================================
  // NEW METHODS - CODE INTELLIGENCE
  // ============================================

  getLanguage(path?: string): string {
    if (path) {
      return this.fileLanguages.get(path) || this.detectLanguage(path);
    }
    return this.activeFile ? (this.fileLanguages.get(this.activeFile) || 'plaintext') : this.currentLanguage;
  }

  setLanguage(lang: string): void {
    this.currentLanguage = lang;
    if (this.activeFile) {
      this.fileLanguages.set(this.activeFile, lang);
    }
    this.notifyChange();
  }

  getSymbols(path: string): SymbolInfo[] {
    const content = this.files.get(path);
    if (!content) return [];
    
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');
    
    const patterns = [
      { regex: /function\s+(\w+)/g, kind: 'function' as const },
      { regex: /class\s+(\w+)/g, kind: 'class' as const },
      { regex: /const\s+(\w+)\s*=/g, kind: 'variable' as const },
      { regex: /let\s+(\w+)\s*=/g, kind: 'variable' as const },
      { regex: /interface\s+(\w+)/g, kind: 'interface' as const },
      { regex: /type\s+(\w+)\s*=/g, kind: 'type' as const },
      { regex: /(\w+)\s*\([^)]*\)\s*{/g, kind: 'method' as const },
    ];
    
    lines.forEach((line, lineIndex) => {
      for (const { regex, kind } of patterns) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(line)) !== null) {
          symbols.push({
            name: match[1],
            kind,
            location: { line: lineIndex + 1, column: match.index + 1 },
            path
          });
        }
      }
    });
    
    return symbols;
  }

  findReferences(symbol: string): Array<{ path: string; line: number; column: number }> {
    const references: Array<{ path: string; line: number; column: number }> = [];
    
    this.files.forEach((content, path) => {
      const lines = content.split('\n');
      lines.forEach((line, lineIndex) => {
        let index = 0;
        while ((index = line.indexOf(symbol, index)) !== -1) {
          references.push({
            path,
            line: lineIndex + 1,
            column: index + 1
          });
          index += symbol.length;
        }
      });
    });
    
    return references;
  }

  goToDefinition(symbol: string): { path: string; line: number; column: number } | null {
    const defPatterns = [
      new RegExp(`function\\s+${symbol}\\s*\\(`),
      new RegExp(`class\\s+${symbol}`),
      new RegExp(`const\\s+${symbol}\\s*=`),
      new RegExp(`let\\s+${symbol}\\s*=`),
      new RegExp(`interface\\s+${symbol}`),
      new RegExp(`type\\s+${symbol}\\s*=`),
    ];
    
    for (const [path, content] of this.files.entries()) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of defPatterns) {
          const match = lines[i].match(pattern);
          if (match) {
            return { path, line: i + 1, column: match.index! + 1 };
          }
        }
      }
    }
    
    return null;
  }

  // ============================================
  // NEW METHODS - COMMANDS & EXECUTION
  // ============================================

  async runCommand(command: string): Promise<{ success: boolean; output: string; error?: string }> {
    this.addLog('info', `Running command: ${command}`);
    
    try {
      this.addLog('log', `Command executed: ${command}`);
      return { success: true, output: `Simulated output for: ${command}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  }

  async runTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
    this.addLog('info', 'Running tests...');
    return { passed: 0, failed: 0, errors: ['Test runner not implemented in browser'] };
  }

  getErrors(): EditorError[] {
    return [...this.errors];
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  // ============================================
  // NEW METHODS - DIFF OPERATIONS
  // ============================================

  generateDiff(oldCode: string, newCode: string): DiffResult {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    let additions = 0;
    let deletions = 0;
    const diffLines: string[] = [];
    
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      
      if (oldLine === newLine) {
        diffLines.push(' ' + (oldLine || ''));
      } else {
        if (oldLine !== undefined) {
          diffLines.push('-' + oldLine);
          deletions++;
        }
        if (newLine !== undefined) {
          diffLines.push('+' + newLine);
          additions++;
        }
      }
    }
    
    return {
      hunks: [{
        oldStart: 1,
        oldLines: oldLines.length,
        newStart: 1,
        newLines: newLines.length,
        lines: diffLines
      }],
      additions,
      deletions
    };
  }

  showDiff(path: string, diff: DiffResult): void {
    this.showMessage(`Diff for ${path}: +${diff.additions} -${diff.deletions} lines`);
  }

  applyDiff(path: string, diff: DiffResult): boolean {
    try {
      const newLines: string[] = [];
      
      for (const hunk of diff.hunks) {
        for (const line of hunk.lines) {
          if (line.startsWith(' ') || line.startsWith('+')) {
            newLines.push(line.substring(1));
          }
        }
      }
      
      this.setFile(path, newLines.join('\n'));
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // NEW METHODS - PROJECT INFO
  // ============================================

  getDependencies(): Record<string, string> {
    const packageJson = this.getPackageJson();
    if (!packageJson) return {};
    
    return {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {})
    };
  }

  getPackageJson(): Record<string, any> | null {
    const content = this.files.get('package.json') || this.files.get('/package.json');
    if (!content) return null;
    
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  getConfigFiles(): string[] {
    const configPatterns = [
      'package.json', 'tsconfig.json', 'vite.config', 'webpack.config',
      '.eslintrc', '.prettierrc', 'tailwind.config', 'postcss.config',
      '.env', 'next.config', 'nuxt.config'
    ];
    
    const configs: string[] = [];
    this.files.forEach((_, path) => {
      const fileName = path.split('/').pop() || '';
      if (configPatterns.some(p => fileName.includes(p))) {
        configs.push(path);
      }
    });
    
    return configs;
  }

  getEnvInfo(): { nodeVersion?: string; npmVersion?: string; env: Record<string, string> } {
    const envFile = this.files.get('.env') || this.files.get('/.env') || '';
    const env: Record<string, string> = {};
    
    envFile.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#')) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return { env };
  }

  // ============================================
  // NEW METHODS - MEMORY/STATE PERSISTENCE
  // ============================================

  saveMemory(key: string, value: any): void {
    this.memory.set(key, value);
  }

  getMemory(key: string): any {
    return this.memory.get(key);
  }

  clearMemory(): void {
    this.memory.clear();
  }

  // ============================================
  // NEW METHODS - PERMISSIONS
  // ============================================

  setApprovalHandler(handler: (action: string, details?: string) => Promise<boolean>): void {
    this.approvalHandler = handler;
  }

  setQuestionHandler(handler: (question: string) => Promise<string | null>): void {
    this.questionHandler = handler;
  }

  async requestApproval(action: string, details?: string): Promise<boolean> {
    if (this.approvalHandler) {
      return this.approvalHandler(action, details);
    }
    
    const safeActions = ['read', 'view', 'search', 'list'];
    return safeActions.includes(action.toLowerCase());
  }

  checkPermission(action: string): boolean {
    return this.permissions.has(action.toLowerCase());
  }

  // ============================================
  // NEW METHODS - UI MESSAGES
  // ============================================

  showMessage(text: string): void {
    const message: UIMessage = { type: 'info', text, timestamp: Date.now() };
    this.notifyMessage(message);
    this.addLog('info', text);
  }

  showWarning(text: string): void {
    const message: UIMessage = { type: 'warning', text, timestamp: Date.now() };
    this.notifyMessage(message);
    this.addLog('warn', text);
  }

  showError(text: string): void {
    const message: UIMessage = { type: 'error', text, timestamp: Date.now() };
    this.notifyMessage(message);
    this.addLog('error', text);
  }

  async askUser(question: string): Promise<string | null> {
    if (this.questionHandler) {
      return this.questionHandler(question);
    }
    return window.prompt(question);
  }

  // ============================================
  // NEW METHODS - AGENT STATE
  // ============================================

  setMode(mode: AgentMode): void {
    this.agentMode = mode;
    this.notifyChange();
  }

  getMode(): AgentMode {
    return this.agentMode;
  }

  getAgentState(): {
    mode: AgentMode;
    isRunning: boolean;
    currentTask: string | null;
    memory: Record<string, any>;
  } {
    const memoryObj: Record<string, any> = {};
    this.memory.forEach((value, key) => {
      memoryObj[key] = value;
    });
    
    return {
      mode: this.agentMode,
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      memory: memoryObj
    };
  }

  cancelTask(): void {
    this.isRunning = false;
    this.currentTask = null;
    this.showMessage('Task cancelled');
  }

  setTask(task: string): void {
    this.currentTask = task;
    this.isRunning = true;
  }

  completeTask(): void {
    this.currentTask = null;
    this.isRunning = false;
  }

  // ============================================
  // NEW METHODS - EVENTS
  // ============================================

  onMessage(listener: (message: UIMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }
}

// ============================================
// SINGLETON & FACTORY
// ============================================

let editorBridgeInstance: EditorBridge | null = null;

export function getEditorBridge(): EditorBridge {
  if (!editorBridgeInstance) {
    editorBridgeInstance = new EditorBridge();
  }
  return editorBridgeInstance;
}

export function createEditorBridge(initialFiles?: Record<string, string>): EditorBridge {
  editorBridgeInstance = new EditorBridge(initialFiles);
  return editorBridgeInstance;
}

export function resetEditorBridge(): void {
  editorBridgeInstance = null;
}

export default EditorBridge;
