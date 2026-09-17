/**
 * MonacoEditor — Real code editor for Canvas Studio
 * Replaces the plain <textarea> CodeEditor with VS Code's Monaco Editor
 *
 * Features:
 *   - Syntax highlighting for 40+ languages
 *   - IntelliSense / autocomplete
 *   - Search & replace (Ctrl+H)
 *   - Undo / redo (Ctrl+Z / Ctrl+Shift+Z)
 *   - Bracket matching & auto-closing
 *   - Multi-cursor editing
 *   - Minimap
 *   - Code folding
 *   - Find in selection
 *   - Format document
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { editorBridge } from '../services/editorBridge';

// Language detection from file extension
const LANG_MAP: Record<string, string> = {
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  svg: 'xml',
  toml: 'ini',
  ini: 'ini',
  env: 'ini',
  dockerfile: 'dockerfile',
  graphql: 'graphql',
  gql: 'graphql',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
};

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const name = path.split('/').pop()?.toLowerCase() || '';

  // Special filenames
  if (name === 'dockerfile') return 'dockerfile';
  if (name === 'makefile') return 'makefile';
  if (name === '.gitignore' || name === '.env') return 'ini';

  return LANG_MAP[ext] || 'plaintext';
}

interface MonacoEditorProps {
  filePath: string;
  darkMode?: boolean;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onChange?: (content: string) => void;
  /** Height override — defaults to 100% */
  height?: string;
}

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({
  filePath,
  darkMode = true,
  readOnly = false,
  onSave,
  onChange,
  height = '100%',
}) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [language, setLanguage] = useState(() => getLanguageFromPath(filePath));
  const [isReady, setIsReady] = useState(false);
  const suppressChangeRef = useRef(false);

  // Get content from editorBridge
  const getContent = useCallback(() => {
    return editorBridge.getFile(filePath) ?? '';
  }, [filePath]);

  // Update language when filePath changes
  useEffect(() => {
    setLanguage(getLanguageFromPath(filePath));
  }, [filePath]);

  // Sync content when filePath changes (switch tabs)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const newContent = getContent();
    const currentContent = editor.getValue();

    if (newContent !== currentContent) {
      suppressChangeRef.current = true;
      editor.setValue(newContent);
      suppressChangeRef.current = false;
    }

    // Update language model
    const model = editor.getModel();
    if (model) {
      const monaco = (window as any).monaco;
      if (monaco) {
        monaco.editor.setModelLanguage(model, getLanguageFromPath(filePath));
      }
    }

    // Set active file in editorBridge
    editorBridge.setActiveFile(filePath);
  }, [filePath, getContent]);

  // Handle editor mount
  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setIsReady(true);

    // Set active file
    editorBridge.setActiveFile(filePath);

    // ── Keyboard shortcuts ──

    // Ctrl/Cmd + S → Save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const content = editor.getValue();
      editorBridge.updateFile(filePath, content);
      editorBridge.markSaved();
      onSave?.(content);
    });

    // Ctrl/Cmd + D → Duplicate line (VS Code style)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      editor.getAction('editor.action.copyLinesDownAction')?.run();
    });

    // Ctrl/Cmd + Shift + K → Delete line
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK,
      () => {
        editor.getAction('editor.action.deleteLines')?.run();
      },
    );

    // Ctrl/Cmd + / → Toggle comment
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.getAction('editor.action.commentLine')?.run();
    });

    // Track cursor position in editorBridge
    editor.onDidChangeCursorPosition((e) => {
      editorBridge.setCursor({
        path: filePath,
        position: editor.getModel()?.getOffsetAt(e.position) ?? 0,
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Track selection in editorBridge
    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (!model) return;

      const sel = e.selection;
      if (sel.isEmpty()) {
        editorBridge.setSelection(null);
      } else {
        const start = model.getOffsetAt(sel.getStartPosition());
        const end = model.getOffsetAt(sel.getEndPosition());
        editorBridge.setSelection({
          path: filePath,
          start,
          end,
          text: model.getValueInRange(sel),
          lineStart: sel.startLineNumber,
          lineEnd: sel.endLineNumber,
        });
      }
    });

    // Focus the editor
    editor.focus();
  }, [filePath, onSave]);

  // Handle content changes
  const handleChange: OnChange = useCallback((value) => {
    if (suppressChangeRef.current) return;
    const content = value ?? '';
    editorBridge.updateFile(filePath, content);
    onChange?.(content);
  }, [filePath, onChange]);

  // Custom dark theme matching the canvas-studio aesthetic
  const beforeMount = useCallback((monaco: any) => {
    monaco.editor.defineTheme('canvas-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C084FC' },          // purple-400
        { token: 'string', foreground: '34D399' },            // emerald-400
        { token: 'number', foreground: 'FB923C' },            // orange-400
        { token: 'tag', foreground: 'F472B6' },               // pink-400
        { token: 'attribute.name', foreground: '22D3EE' },    // cyan-400
        { token: 'attribute.value', foreground: '34D399' },   // emerald-400
        { token: 'delimiter', foreground: '9CA3AF' },
        { token: 'type', foreground: '38BDF8' },              // sky-400
        { token: 'variable', foreground: 'E5E7EB' },
        { token: 'function', foreground: 'FBBF24' },          // yellow-400
      ],
      colors: {
        'editor.background': '#0d0d0d',
        'editor.foreground': '#E5E7EB',
        'editor.lineHighlightBackground': '#1F2937',
        'editor.selectionBackground': '#22D3EE33',
        'editor.selectionHighlightBackground': '#22D3EE1A',
        'editorCursor.foreground': '#22D3EE',
        'editorLineNumber.foreground': '#4B5563',
        'editorLineNumber.activeForeground': '#22D3EE',
        'editorIndentGuide.background': '#1F2937',
        'editorIndentGuide.activeBackground': '#374151',
        'editorBracketMatch.background': '#22D3EE22',
        'editorBracketMatch.border': '#22D3EE66',
        'editor.findMatchBackground': '#FBBF2444',
        'editor.findMatchHighlightBackground': '#FBBF2422',
        'editorWidget.background': '#111111',
        'editorWidget.border': '#374151',
        'input.background': '#1F2937',
        'input.border': '#374151',
        'input.foreground': '#E5E7EB',
        'minimap.background': '#0a0a0a',
        'scrollbar.shadow': '#000000',
        'editorOverviewRuler.border': '#1F2937',
      },
    });

    monaco.editor.defineTheme('canvas-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '9CA3AF', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7C3AED' },
        { token: 'string', foreground: '059669' },
        { token: 'number', foreground: 'EA580C' },
        { token: 'tag', foreground: 'DB2777' },
        { token: 'attribute.name', foreground: '0891B2' },
        { token: 'function', foreground: 'CA8A04' },
      ],
      colors: {
        'editor.background': '#FAFAFA',
        'editor.foreground': '#1F2937',
        'editorCursor.foreground': '#0891B2',
        'editorLineNumber.foreground': '#9CA3AF',
        'editorLineNumber.activeForeground': '#0891B2',
      },
    });
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Loading skeleton */}
      {!isReady && (
        <div className={`flex items-center justify-center h-full ${darkMode ? 'bg-canvas-card' : 'bg-gray-50'}`}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <span className={`text-xs ${darkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>
              Loading editor...
            </span>
          </div>
        </div>
      )}

      <Editor
        height={height}
        language={language}
        value={getContent()}
        theme={darkMode ? 'canvas-dark' : 'canvas-light'}
        beforeMount={beforeMount}
        onMount={handleMount}
        onChange={handleChange}
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
          fontLigatures: true,
          lineHeight: 20,
          letterSpacing: 0.3,
          tabSize: 2,
          insertSpaces: true,
          renderWhitespace: 'selection',
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          minimap: {
            enabled: true,
            maxColumn: 80,
            renderCharacters: false,
          },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
            highlightActiveIndentation: true,
          },
          autoClosingBrackets: 'languageDefined',
          autoClosingQuotes: 'languageDefined',
          autoSurround: 'languageDefined',
          formatOnPaste: true,
          formatOnType: false,
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          parameterHints: { enabled: true },
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',
          find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: 'multiline',
            seedSearchStringFromSelection: 'selection',
          },
          padding: { top: 12, bottom: 12 },
          overviewRulerLanes: 2,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          stickyScroll: { enabled: true },
          linkedEditing: true,
          colorDecorators: true,
          renderLineHighlight: 'all',
          occurrencesHighlight: 'singleFile',
        }}
      />
    </div>
  );
};

export default MonacoEditorComponent;
