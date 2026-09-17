/**
 * Canvas Studio State Manager
 * Provides state management for the canvas code editor
 * 
 * This is NOT a cross-frame bridge - it runs entirely within the canvas-studio iframe.
 * State is managed via Zustand (in-memory) with auto-save to backend DB + S3.
 * ZERO localStorage. ZERO sessionStorage.
 * 
 * Location: /canvas-studio/ (standalone at studio.sanbayfusion.com)
 * Builds to: /frontend/public/canvas-studio/
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  GeneratedApp,
  FileNode as TypeFileNode,
  EditorSelection as TypeEditorSelection,
  EditorCursor as TypeEditorCursor,
  AgentCommand
} from '../types';
import { canvasAppsService } from './canvasAppsService';
import { canvasS3FilesService, ProjectFile } from './canvasS3FilesService';

// ==================== TYPE DEFINITIONS ====================

// Re-export types for backwards compatibility
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
  size?: number;
  mimeType?: string;
  createdAt?: number;
  modifiedAt?: number;
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

export interface FileChange {
  path: string;
  content: string;
  timestamp: number;
  changeType: 'create' | 'update' | 'delete';
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
}

// Callback types for event listeners
type FileChangeCallback = (change: FileChange) => void;
type SelectionChangeCallback = (selection: EditorSelection | null) => void;
type CursorChangeCallback = (cursor: EditorCursor | null) => void;

// ==================== ZUSTAND STORE DEFINITION ====================

interface EditorState {
  // File system
  files: Record<string, string>;
  activeFilePath: string | null;
  openFiles: string[];
  unsavedPaths: string[];

  // Cursor & Selection
  currentSelection: EditorSelection | null;
  currentCursor: EditorCursor | null;

  // Project metadata
  currentProjectId: string | null;
  projectName: string;
  projectPrompt: string;

  // Auto-save state
  lastSavedAt: number | null;
  isSaving: boolean;
  saveError: string | null;
  isDirty: boolean;
}

interface EditorActions {
  // File operations
  getFile: (path: string) => string | null;
  updateFile: (path: string, content: string) => boolean;
  createFile: (path: string, content?: string, language?: string) => boolean;
  deleteFile: (path: string) => boolean;
  renameFile: (oldPath: string, newPath: string) => boolean;
  copyFile: (sourcePath: string, destinationPath: string) => boolean;
  appendFile: (path: string, content: string) => boolean;
  getAllFilePaths: () => string[];
  getProjectTree: () => FileNode[];
  createFolder: (path: string) => boolean;
  getFileNode: (path: string) => FileNode | null;

  // Cursor & Selection
  insertAt: (path: string, position: number, text: string) => boolean;
  insertAtCursor: (text: string) => boolean;
  replaceRange: (path: string, start: number, end: number, text: string) => boolean;
  replaceSelection: (text: string) => boolean;
  getSelection: () => EditorSelection | null;
  setSelection: (selection: EditorSelection | null) => void;
  getCursor: () => EditorCursor | null;
  setCursor: (cursor: EditorCursor | null) => void;
  getActiveFilePath: () => string | null;
  setActiveFile: (path: string) => boolean;

  // Open files management
  openFile: (path: string) => boolean;
  closeFile: (path: string) => void;
  getOpenFiles: () => string[];

  // Code sync
  loadFromCode: (code: string) => void;
  loadFromHtml: (htmlCode: string) => void;
  toCode: () => string;
  toHtml: () => string;
  toProjectFiles: () => ProjectFile[];

  // State management
  hasUnsavedChanges: () => boolean;
  markSaved: (path?: string) => void;
  markAllSaved: () => void;
  reset: () => void;
  getEditorState: () => { activeFile: string | null; openFiles: string[]; cursor: EditorCursor | null; selection: EditorSelection | null; isDirty: boolean };

  // Project management
  loadProject: (project: GeneratedApp) => void;
  loadProjectFromS3: (projectId: string) => Promise<boolean>;
  saveToBackend: () => Promise<boolean>;
  syncToS3: () => Promise<boolean>;
  setProjectMeta: (name: string, prompt: string, id?: string) => void;

  // Agent context
  getAgentContext: () => {
    activeFile: string | null;
    selection: EditorSelection | null;
    cursor: EditorCursor | null;
    nearbyCode: string;
    projectFiles: string[];
  };

  // Utilities
  positionToLineColumn: (content: string, position: number) => { line: number; column: number };
  lineColumnToPosition: (content: string, line: number, column: number) => number;
}

type EditorStore = EditorState & EditorActions;

// ==================== UTILITY FUNCTIONS ====================

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    html: 'html', htm: 'html',
    css: 'css', scss: 'scss', sass: 'sass', less: 'less',
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    json: 'json', md: 'markdown',
    py: 'python', rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
    php: 'php', sql: 'sql', sh: 'bash', bash: 'bash',
    yml: 'yaml', yaml: 'yaml', xml: 'xml', svg: 'xml',
    swift: 'swift', kt: 'kotlin',
  };
  return languageMap[ext || ''] || 'plaintext';
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    html: 'text/html', htm: 'text/html',
    css: 'text/css', scss: 'text/x-scss', sass: 'text/x-sass',
    js: 'application/javascript', jsx: 'application/javascript',
    ts: 'application/typescript', tsx: 'application/typescript',
    json: 'application/json', md: 'text/markdown',
    py: 'text/x-python', rb: 'text/x-ruby', java: 'text/x-java',
    go: 'text/x-go', rs: 'text/x-rust', php: 'text/x-php',
    sql: 'text/x-sql', xml: 'text/xml', svg: 'image/svg+xml',
    yml: 'text/yaml', yaml: 'text/yaml', sh: 'text/x-sh',
    txt: 'text/plain',
  };
  return mimeMap[ext || ''] || 'text/plain';
}

function buildFileTree(files: Record<string, string>): FileNode[] {
  const root: FileNode[] = [];
  const folders: Map<string, FileNode> = new Map();
  const sortedPaths = Object.keys(files).sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split('/').filter(Boolean);
    let currentPath = '';
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += '/' + part;
      const isFile = i === parts.length - 1;

      if (isFile) {
        const content = files[filePath];
        currentLevel.push({
          name: part,
          path: currentPath,
          type: 'file',
          content,
          language: detectLanguage(part),
          size: content?.length || 0,
          mimeType: getMimeType(part),
          modifiedAt: Date.now(),
        });
      } else {
        let folder = folders.get(currentPath);
        if (!folder) {
          folder = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: [],
            createdAt: Date.now(),
          };
          folders.set(currentPath, folder);
          currentLevel.push(folder);
        }
        currentLevel = folder.children!;
      }
    }
  }

  return root;
}

// ==================== DEBOUNCED AUTO-SAVE ====================

let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;
const AUTOSAVE_DELAY = 2000; // 2 seconds after last change

function scheduleAutoSave(store: EditorStore) {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }

  saveTimeoutId = setTimeout(async () => {
    const hasChanges = store.hasUnsavedChanges();
    const projectId = store.currentProjectId;

    if (hasChanges && projectId) {
      console.log('[EditorBridge] Auto-saving project...');
      await store.saveToBackend();
    }
  }, AUTOSAVE_DELAY);
}

// ==================== DEFAULT PROJECT STATE ====================

const defaultFiles: Record<string, string> = {
  '/index.html': '',
  '/styles/main.css': '',
  '/scripts/app.js': '',
};

const initialState: EditorState = {
  files: { ...defaultFiles },
  activeFilePath: '/index.html',
  openFiles: ['/index.html'],
  unsavedPaths: [],
  currentSelection: null,
  currentCursor: null,
  currentProjectId: null,
  projectName: 'Untitled',
  projectPrompt: '',
  lastSavedAt: null,
  isSaving: false,
  saveError: null,
  isDirty: false,
};

// ==================== ZUSTAND STORE ====================

// Nuke any stale Zustand persist data from localStorage (one-time cleanup)
try { window.localStorage.removeItem('universal-chat-editor-bridge-storage'); } catch (_) { }

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector(
    (set, get) => ({
      // Initial state
      ...initialState,

      // ==================== FILE OPERATIONS ====================

      getFile: (path) => {
        const content = get().files[path];
        return content !== undefined ? content : null;
      },

      updateFile: (path, content) => {
        const { files } = get();
        if (!(path in files)) return false;

        set((state) => ({
          files: { ...state.files, [path]: content },
          unsavedPaths: state.unsavedPaths.includes(path)
            ? state.unsavedPaths
            : [...state.unsavedPaths, path],
          isDirty: true,
        }));

        scheduleAutoSave(get());
        return true;
      },

      createFile: (path, content = '', language) => {
        const { files } = get();
        if (path in files) return false;

        set((state) => ({
          files: { ...state.files, [path]: content },
          unsavedPaths: [...state.unsavedPaths, path],
          isDirty: true,
        }));

        scheduleAutoSave(get());
        return true;
      },

      deleteFile: (path) => {
        const { files, activeFilePath, openFiles } = get();
        if (!(path in files)) return false;

        const newFiles = { ...files };
        delete newFiles[path];

        const newOpenFiles = openFiles.filter(p => p !== path);
        const newActivePath = activeFilePath === path
          ? (newOpenFiles[0] || Object.keys(newFiles)[0] || null)
          : activeFilePath;

        set((state) => ({
          files: newFiles,
          activeFilePath: newActivePath,
          openFiles: newOpenFiles,
          unsavedPaths: state.unsavedPaths.filter(p => p !== path),
          isDirty: true,
        }));

        scheduleAutoSave(get());
        return true;
      },

      renameFile: (oldPath, newPath) => {
        const { files, activeFilePath, openFiles } = get();
        const content = files[oldPath];
        if (content === undefined) return false;

        const newFiles = { ...files };
        delete newFiles[oldPath];
        newFiles[newPath] = content;

        const newOpenFiles = openFiles.map(p => p === oldPath ? newPath : p);

        set((state) => ({
          files: newFiles,
          activeFilePath: activeFilePath === oldPath ? newPath : activeFilePath,
          openFiles: newOpenFiles,
          unsavedPaths: [
            ...state.unsavedPaths.filter(p => p !== oldPath),
            newPath
          ],
          isDirty: true,
        }));

        scheduleAutoSave(get());
        return true;
      },

      copyFile: (sourcePath, destinationPath) => {
        const { files } = get();
        const content = files[sourcePath];
        if (content === undefined) return false;

        set((state) => ({
          files: { ...state.files, [destinationPath]: content },
          unsavedPaths: [...state.unsavedPaths, destinationPath],
          isDirty: true,
        }));

        scheduleAutoSave(get());
        return true;
      },

      appendFile: (path, content) => {
        const { files } = get();
        const existing = files[path];
        if (existing === undefined) return false;

        const newContent = existing + content;
        set((state) => ({
          files: { ...state.files, [path]: newContent },
          unsavedPaths: state.unsavedPaths.includes(path)
            ? state.unsavedPaths
            : [...state.unsavedPaths, path],
          isDirty: true,
        }));

        scheduleAutoSave(get());
        return true;
      },

      getAllFilePaths: () => Object.keys(get().files),

      getProjectTree: () => buildFileTree(get().files),

      createFolder: (_path) => {
        // Folders are virtual in our flat file system
        return true;
      },

      getFileNode: (path) => {
        const { files } = get();
        const content = files[path];
        if (content === undefined) return null;

        const name = path.split('/').pop() || '';
        return {
          name,
          path,
          type: 'file' as const,
          content,
          language: detectLanguage(name),
          size: content.length,
          mimeType: getMimeType(name),
          modifiedAt: Date.now(),
        };
      },

      // ==================== CURSOR & SELECTION ====================

      insertAt: (path, position, text) => {
        const content = get().getFile(path);
        if (content === null) return false;

        const newContent = content.slice(0, position) + text + content.slice(position);
        return get().updateFile(path, newContent);
      },

      insertAtCursor: (text) => {
        const { currentCursor } = get();
        if (!currentCursor) return false;
        return get().insertAt(currentCursor.path, currentCursor.position, text);
      },

      replaceRange: (path, start, end, text) => {
        const content = get().getFile(path);
        if (content === null) return false;

        const newContent = content.slice(0, start) + text + content.slice(end);
        return get().updateFile(path, newContent);
      },

      replaceSelection: (text) => {
        const { currentSelection } = get();
        if (!currentSelection) return false;

        return get().replaceRange(
          currentSelection.path,
          currentSelection.start,
          currentSelection.end,
          text
        );
      },

      getSelection: () => get().currentSelection,

      setSelection: (selection) => set({ currentSelection: selection }),

      getCursor: () => get().currentCursor,

      setCursor: (cursor) => set({ currentCursor: cursor }),

      getActiveFilePath: () => get().activeFilePath,

      setActiveFile: (path) => {
        if (!(path in get().files)) return false;
        set({ activeFilePath: path });
        // Also open the file if not already open
        const { openFiles } = get();
        if (!openFiles.includes(path)) {
          set({ openFiles: [...openFiles, path] });
        }
        return true;
      },

      // ==================== OPEN FILES MANAGEMENT ====================

      openFile: (path) => {
        const { files, openFiles } = get();
        if (!(path in files)) return false;

        if (!openFiles.includes(path)) {
          set({ openFiles: [...openFiles, path] });
        }
        set({ activeFilePath: path });
        return true;
      },

      closeFile: (path) => {
        const { openFiles, activeFilePath } = get();
        const newOpenFiles = openFiles.filter(p => p !== path);

        set({
          openFiles: newOpenFiles,
          activeFilePath: activeFilePath === path
            ? (newOpenFiles[0] || null)
            : activeFilePath,
        });
      },

      getOpenFiles: () => get().openFiles,

      // ==================== CODE SYNC ====================

      loadFromCode: (code) => {
        const files: Record<string, string> = {};
        files['/index.html'] = code;

        // Extract substantial inline CSS
        const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleMatch && styleMatch[1].trim().length > 100) {
          files['/styles.css'] = styleMatch[1].trim();
        }

        // Extract substantial inline JS
        const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (scriptMatch && scriptMatch[1].trim().length > 100 && !scriptMatch[0].includes('src=')) {
          files['/app.js'] = scriptMatch[1].trim();
        }

        set({
          files,
          activeFilePath: '/index.html',
          openFiles: ['/index.html'],
          unsavedPaths: Object.keys(files),
          isDirty: true,
        });

        scheduleAutoSave(get());
      },

      toCode: () => {
        const { files } = get();
        let html = files['/index.html'] || Object.values(files)[0] || '';
        if (!html) return '';

        // Re-merge extracted CSS back into the HTML
        const css = files['/styles/main.css'];
        if (css !== undefined) {
          // Replace existing <style> blocks with updated CSS
          if (/<style[^>]*>[\s\S]*?<\/style>/gi.test(html)) {
            // Replace the first <style> block, remove the rest
            let replaced = false;
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match: string) => {
              if (!replaced) {
                replaced = true;
                return `<style>\n${css}\n</style>`;
              }
              return ''; // Remove additional <style> blocks (content merged)
            });
          } else if (css.trim()) {
            // No existing <style> — inject before </head> or at top of <body>
            if (html.includes('</head>')) {
              html = html.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
            } else {
              html = `<style>\n${css}\n</style>\n${html}`;
            }
          }
        }

        // Re-merge extracted JS back into the HTML
        const js = files['/scripts/app.js'];
        if (js !== undefined) {
          // Replace existing inline <script> blocks (not external src=) with updated JS
          const inlineScriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
          if (inlineScriptRegex.test(html)) {
            let replaced = false;
            html = html.replace(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi, (match: string, content: string) => {
              if (!replaced && content.trim().length > 0) {
                replaced = true;
                return `<script>\n${js}\n</script>`;
              }
              if (replaced && content.trim().length > 0) {
                return ''; // Remove additional inline script blocks (content merged)
              }
              return match; // Keep empty or src= scripts as-is
            });
            // If no inline script was found to replace, append before </body>
            if (!replaced && js.trim()) {
              if (html.includes('</body>')) {
                html = html.replace('</body>', `<script>\n${js}\n</script>\n</body>`);
              } else {
                html = `${html}\n<script>\n${js}\n</script>`;
              }
            }
          } else if (js.trim()) {
            // No existing <script> — inject before </body> or at end
            if (html.includes('</body>')) {
              html = html.replace('</body>', `<script>\n${js}\n</script>\n</body>`);
            } else {
              html = `${html}\n<script>\n${js}\n</script>`;
            }
          }
        }

        return html;
      },

      toProjectFiles: () => {
        const { files } = get();
        return Object.entries(files).map(([path, content]) => ({
          path,
          content,
          language: detectLanguage(path.split('/').pop() || ''),
        }));
      },

      // Alias for loadFromCode for backwards compatibility
      loadFromHtml: (htmlCode: string) => {
        const { files } = get();
        const newFiles = { ...files };

        // Store full HTML in index.html
        newFiles['/index.html'] = htmlCode;

        // Extract inline CSS
        const styleMatch = htmlCode.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
        if (styleMatch) {
          const cssContent = styleMatch
            .map((s: string) => s.replace(/<\/?style[^>]*>/gi, ''))
            .join('\n\n');
          if (cssContent.trim()) {
            newFiles['/styles/main.css'] = cssContent;
          }
        }

        // Extract inline JS
        const scriptMatch = htmlCode.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
        if (scriptMatch) {
          const jsContent = scriptMatch
            .map((s: string) => s.replace(/<\/?script[^>]*>/gi, ''))
            .filter((s: string) => s.trim().length > 0 && !s.includes('src='))
            .join('\n\n');
          if (jsContent.trim()) {
            newFiles['/scripts/app.js'] = jsContent;
          }
        }

        set({
          files: newFiles,
          activeFilePath: '/index.html',
          openFiles: ['/index.html'],
          unsavedPaths: Object.keys(newFiles),
          isDirty: true,
        });

        scheduleAutoSave(get());
      },

      // Alias for toCode for backwards compatibility
      toHtml: () => {
        return get().toCode();
      },

      // ==================== STATE MANAGEMENT ====================

      hasUnsavedChanges: () => get().unsavedPaths.length > 0 || get().isDirty,

      markSaved: (path?: string) => {
        if (path) {
          set((state) => ({
            unsavedPaths: state.unsavedPaths.filter(p => p !== path),
          }));
        } else {
          // Mark all as saved if no path specified
          set({ unsavedPaths: [], lastSavedAt: Date.now(), isDirty: false });
        }
      },

      markAllSaved: () => set({ unsavedPaths: [], lastSavedAt: Date.now(), isDirty: false }),

      reset: () => set({ ...initialState, files: { ...defaultFiles } }),

      getEditorState: () => {
        const state = get();
        return {
          activeFile: state.activeFilePath,
          openFiles: state.openFiles,
          cursor: state.currentCursor,
          selection: state.currentSelection,
          isDirty: state.isDirty,
        };
      },

      // ==================== PROJECT MANAGEMENT ====================

      loadProject: (project) => {
        const files: Record<string, string> = {};

        if (project.files && project.files.length > 0) {
          project.files.forEach(f => {
            files[f.path] = f.content || '';
          });
        } else if (project.code) {
          files['/index.html'] = project.code;
        } else {
          files['/index.html'] = '';
        }

        set({
          files,
          activeFilePath: Object.keys(files)[0] || '/index.html',
          openFiles: [Object.keys(files)[0] || '/index.html'],
          currentProjectId: project.id,
          projectName: project.name,
          projectPrompt: project.prompt,
          unsavedPaths: [],
          lastSavedAt: project.timestamp,
          isDirty: false,
        });
      },

      loadProjectFromS3: async (projectId: string) => {
        try {
          console.log('[EditorBridge] Loading project files from S3...');
          const result = await canvasS3FilesService.loadProject(projectId);

          if (result.success && result.files && result.files.length > 0) {
            const files: Record<string, string> = {};
            result.files.forEach(f => {
              files[f.path] = typeof f.content === 'string' ? f.content : '';
            });

            set({
              files,
              activeFilePath: Object.keys(files)[0] || '/index.html',
              openFiles: [Object.keys(files)[0] || '/index.html'],
              currentProjectId: projectId,
              unsavedPaths: [],
              lastSavedAt: Date.now(),
              isDirty: false,
            });

            console.log(`[EditorBridge] Loaded ${result.fileCount} files from S3`);
            return true;
          }

          return false;
        } catch (error) {
          console.error('[EditorBridge] Failed to load from S3:', error);
          return false;
        }
      },

      saveToBackend: async () => {
        const state = get();

        if (state.isSaving) return false;

        set({ isSaving: true, saveError: null });

        try {
          const projectFiles = state.toProjectFiles();
          const mainCode = state.toCode();

          // Detect primary language from file extensions
          const filePaths = Object.keys(state.files);
          const primaryLang = filePaths.some(p => /\.(tsx|jsx)$/.test(p)) ? 'react'
            : filePaths.some(p => /\.ts$/.test(p)) ? 'typescript'
              : filePaths.some(p => /\.py$/.test(p)) ? 'python'
                : filePaths.some(p => /\.js$/.test(p)) ? 'javascript'
                  : 'html';

          const appData: GeneratedApp = {
            id: state.currentProjectId || `uc_${Date.now()}`,
            name: state.projectName,
            prompt: state.projectPrompt,
            code: mainCode,
            timestamp: Date.now(),
            history: [],
            language: primaryLang,
            files: projectFiles,
          };

          let result: GeneratedApp | null;

          if (state.currentProjectId) {
            // Update existing project
            result = await canvasAppsService.updateApp(state.currentProjectId, {
              name: appData.name,
              code: appData.code,
              prompt: appData.prompt,
              language: appData.language,
            });
          } else {
            // Create new project
            result = await canvasAppsService.saveApp(appData);
          }

          if (result) {
            // Also sync files to S3 for large file support
            const projectId = result.id;
            await get().syncToS3();

            set({
              isSaving: false,
              lastSavedAt: Date.now(),
              unsavedPaths: [],
              currentProjectId: projectId,
              isDirty: false,
            });
            console.log('[EditorBridge] Project saved successfully');
            return true;
          } else {
            throw new Error('Failed to save project');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Save failed';
          console.error('[EditorBridge] Save error:', error);
          set({ isSaving: false, saveError: errorMsg });
          return false;
        }
      },

      syncToS3: async () => {
        const state = get();
        const projectId = state.currentProjectId;

        if (!projectId) {
          console.log('[EditorBridge] No project ID, skipping S3 sync');
          return false;
        }

        try {
          const files = state.toProjectFiles();
          const result = await canvasS3FilesService.syncFiles(projectId, files);

          if (result.success) {
            console.log(`[EditorBridge] Synced ${result.saved} files to S3`);
            return true;
          } else {
            console.warn(`[EditorBridge] S3 sync partial: ${result.saved} saved, ${result.failed} failed`);
            return false;
          }
        } catch (error) {
          console.error('[EditorBridge] S3 sync error:', error);
          return false;
        }
      },

      setProjectMeta: (name, prompt, id) => set({
        projectName: name,
        projectPrompt: prompt,
        ...(id ? { currentProjectId: id } : {}),
      }),

      // ==================== AGENT CONTEXT ====================

      getAgentContext: () => {
        const state = get();
        let nearbyCode = '';

        if (state.currentSelection && state.currentSelection.path) {
          // Get 5 lines before and after selection
          const content = state.files[state.currentSelection.path] || '';
          const lines = content.split('\n');
          const startLine = Math.max(0, state.currentSelection.lineStart - 5);
          const endLine = Math.min(lines.length, state.currentSelection.lineEnd + 5);
          nearbyCode = lines.slice(startLine, endLine).join('\n');
        } else if (state.currentCursor && state.activeFilePath) {
          // Get 10 lines around cursor
          const content = state.files[state.activeFilePath] || '';
          const lines = content.split('\n');
          const startLine = Math.max(0, state.currentCursor.line - 5);
          const endLine = Math.min(lines.length, state.currentCursor.line + 5);
          nearbyCode = lines.slice(startLine, endLine).join('\n');
        }

        return {
          activeFile: state.activeFilePath,
          selection: state.currentSelection,
          cursor: state.currentCursor,
          nearbyCode,
          projectFiles: Object.keys(state.files),
        };
      },

      // ==================== UTILITIES ====================

      positionToLineColumn: (content: string, position: number) => {
        const before = content.slice(0, position);
        const lines = before.split('\n');
        return {
          line: lines.length,
          column: lines[lines.length - 1].length + 1,
        };
      },

      lineColumnToPosition: (content: string, line: number, column: number) => {
        const lines = content.split('\n');
        let position = 0;
        for (let i = 0; i < line - 1 && i < lines.length; i++) {
          position += lines[i].length + 1; // +1 for newline
        }
        position += Math.min(column - 1, lines[line - 1]?.length || 0);
        return position;
      },
    })
  )
);

// ==================== SINGLETON BRIDGE FOR BACKWARDS COMPATIBILITY ====================

/**
 * EditorBridge - Wrapper class for backwards compatibility
 * Delegates all calls to the Zustand store
 */
class EditorBridgeWrapper {
  // Event listener cleanup functions
  private fileChangeUnsubscribes: Map<FileChangeCallback, () => void> = new Map();
  private selectionChangeUnsubscribes: Map<SelectionChangeCallback, () => void> = new Map();
  private cursorChangeUnsubscribes: Map<CursorChangeCallback, () => void> = new Map();

  // File operations
  getFile(path: string) { return useEditorStore.getState().getFile(path); }
  updateFile(path: string, content: string) { return useEditorStore.getState().updateFile(path, content); }
  createFile(path: string, content?: string, language?: string) { return useEditorStore.getState().createFile(path, content, language); }
  deleteFile(path: string) { return useEditorStore.getState().deleteFile(path); }
  renameFile(oldPath: string, newPath: string) { return useEditorStore.getState().renameFile(oldPath, newPath); }
  copyFile(sourcePath: string, destinationPath: string) { return useEditorStore.getState().copyFile(sourcePath, destinationPath); }
  appendFile(path: string, content: string) { return useEditorStore.getState().appendFile(path, content); }
  getAllFilePaths() { return useEditorStore.getState().getAllFilePaths(); }
  getProjectTree() { return useEditorStore.getState().getProjectTree(); }
  createFolder(path: string) { return useEditorStore.getState().createFolder(path); }
  getFileNode(path: string) { return useEditorStore.getState().getFileNode(path); }

  // Cursor & Selection
  insertAt(path: string, position: number, text: string) {
    return useEditorStore.getState().insertAt(path, position, text);
  }
  insertAtCursor(text: string) { return useEditorStore.getState().insertAtCursor(text); }
  replaceRange(path: string, start: number, end: number, text: string) {
    return useEditorStore.getState().replaceRange(path, start, end, text);
  }
  replaceSelection(text: string) { return useEditorStore.getState().replaceSelection(text); }
  getSelection() { return useEditorStore.getState().getSelection(); }
  setSelection(selection: EditorSelection | null) { useEditorStore.getState().setSelection(selection); }
  getCursor() { return useEditorStore.getState().getCursor(); }
  setCursor(cursor: EditorCursor | null) { useEditorStore.getState().setCursor(cursor); }
  getActiveFilePath() { return useEditorStore.getState().getActiveFilePath(); }
  setActiveFile(path: string) { return useEditorStore.getState().setActiveFile(path); }

  // Open files
  openFile(path: string) { return useEditorStore.getState().openFile(path); }
  closeFile(path: string) { useEditorStore.getState().closeFile(path); }
  getOpenFiles() { return useEditorStore.getState().getOpenFiles(); }

  // Code sync
  loadFromCode(code: string) { useEditorStore.getState().loadFromCode(code); }
  loadFromHtml(htmlCode: string) { useEditorStore.getState().loadFromHtml(htmlCode); }
  toCode() { return useEditorStore.getState().toCode(); }
  toHtml() { return useEditorStore.getState().toHtml(); }
  toProjectFiles() { return useEditorStore.getState().toProjectFiles(); }

  // State
  hasUnsavedChanges() { return useEditorStore.getState().hasUnsavedChanges(); }
  markSaved(path?: string) { useEditorStore.getState().markSaved(path); }
  markAllSaved() { useEditorStore.getState().markAllSaved(); }
  reset() { useEditorStore.getState().reset(); }
  getEditorState() { return useEditorStore.getState().getEditorState(); }

  // Project
  loadProject(project: GeneratedApp) { useEditorStore.getState().loadProject(project); }
  loadProjectFromS3(projectId: string) { return useEditorStore.getState().loadProjectFromS3(projectId); }
  saveToBackend() { return useEditorStore.getState().saveToBackend(); }
  syncToS3() { return useEditorStore.getState().syncToS3(); }
  setProjectMeta(name: string, prompt: string, id?: string) {
    useEditorStore.getState().setProjectMeta(name, prompt, id);
  }

  // Agent context
  getAgentContext() { return useEditorStore.getState().getAgentContext(); }

  // Utilities
  positionToLineColumn(content: string, position: number) {
    return useEditorStore.getState().positionToLineColumn(content, position);
  }
  lineColumnToPosition(content: string, line: number, column: number) {
    return useEditorStore.getState().lineColumnToPosition(content, line, column);
  }

  // Event listeners (using Zustand subscribe)
  onFileChange(callback: FileChangeCallback): () => void {
    const unsubscribe = useEditorStore.subscribe(
      (state) => state.files,
      (files, prevFiles) => {
        for (const path of Object.keys(files)) {
          if (files[path] !== prevFiles[path]) {
            callback({
              path,
              content: files[path],
              timestamp: Date.now(),
              changeType: prevFiles[path] === undefined ? 'create' : 'update',
            });
          }
        }
        // Check for deleted files
        for (const path of Object.keys(prevFiles)) {
          if (!(path in files)) {
            callback({
              path,
              content: '',
              timestamp: Date.now(),
              changeType: 'delete',
            });
          }
        }
      }
    );
    this.fileChangeUnsubscribes.set(callback, unsubscribe);
    return unsubscribe;
  }

  offFileChange(callback: FileChangeCallback): void {
    const unsubscribe = this.fileChangeUnsubscribes.get(callback);
    if (unsubscribe) {
      unsubscribe();
      this.fileChangeUnsubscribes.delete(callback);
    }
  }

  onSelectionChange(callback: SelectionChangeCallback): () => void {
    const unsubscribe = useEditorStore.subscribe(
      (state) => state.currentSelection,
      callback
    );
    this.selectionChangeUnsubscribes.set(callback, unsubscribe);
    return unsubscribe;
  }

  offSelectionChange(callback: SelectionChangeCallback): void {
    const unsubscribe = this.selectionChangeUnsubscribes.get(callback);
    if (unsubscribe) {
      unsubscribe();
      this.selectionChangeUnsubscribes.delete(callback);
    }
  }

  onCursorChange(callback: CursorChangeCallback): () => void {
    const unsubscribe = useEditorStore.subscribe(
      (state) => state.currentCursor,
      callback
    );
    this.cursorChangeUnsubscribes.set(callback, unsubscribe);
    return unsubscribe;
  }

  offCursorChange(callback: CursorChangeCallback): void {
    const unsubscribe = this.cursorChangeUnsubscribes.get(callback);
    if (unsubscribe) {
      unsubscribe();
      this.cursorChangeUnsubscribes.delete(callback);
    }
  }
}

// Export singleton instance for backwards compatibility
export const editorBridge = new EditorBridgeWrapper();

// Export the class for testing
export { EditorBridgeWrapper as EditorBridge };

export default editorBridge;
