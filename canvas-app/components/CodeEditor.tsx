/**
 * CodeEditor Component for Standalone Canvas App
 * Uses Monaco Editor for full syntax highlighting, VS Code-like experience
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor as MonacoEditorType } from 'monaco-editor';
import { editorBridge } from '../services/editorBridge';
import { useEditorSettingsStore } from '../stores/editorStore';

interface CodeEditorProps {
  filePath: string;
  darkMode?: boolean;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onChange?: (content: string) => void;
}

// Maula AI dark theme — rich syntax colors
const MAULA_THEME: MonacoEditorType.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '4b5563', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '4b5563', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '4b5563', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: 'f472b6', fontStyle: 'bold' },
    { token: 'string', foreground: '34d399' },
    { token: 'string.html', foreground: '34d399' },
    { token: 'number', foreground: 'fb923c' },
    { token: 'type', foreground: '22d3ee' },
    { token: 'type.identifier', foreground: '22d3ee' },
    { token: 'function', foreground: '60a5fa' },
    { token: 'variable', foreground: 'e5e7eb' },
    { token: 'variable.language', foreground: 'a78bfa' },
    { token: 'operator', foreground: 'f472b6' },
    { token: 'tag', foreground: 'f472b6' },
    { token: 'tag.html', foreground: 'f472b6' },
    { token: 'attribute.name', foreground: '22d3ee' },
    { token: 'attribute.name.html', foreground: '22d3ee' },
    { token: 'attribute.value', foreground: '34d399' },
    { token: 'attribute.value.html', foreground: '34d399' },
    { token: 'delimiter', foreground: '9ca3af' },
    { token: 'delimiter.html', foreground: '6b7280' },
    { token: 'delimiter.bracket', foreground: 'fbbf24' },
    { token: 'regexp', foreground: 'fbbf24' },
    { token: 'annotation', foreground: 'fbbf24' },
    { token: 'constant', foreground: 'fb923c' },
    { token: 'support', foreground: '38bdf8' },
    { token: 'support.function', foreground: '38bdf8' },
    { token: 'support.class', foreground: '22d3ee' },
    { token: 'entity.name.function', foreground: '60a5fa' },
    { token: 'entity.name.tag', foreground: 'f472b6' },
    { token: 'meta.selector', foreground: 'f472b6' },
    { token: 'property', foreground: '22d3ee' },
    { token: 'property.css', foreground: '22d3ee' },
    { token: 'value.css', foreground: '34d399' },
    { token: 'unit.css', foreground: 'fb923c' },
    { token: 'selector.css', foreground: 'f472b6' },
  ],
  colors: {
    'editor.background': '#080810',
    'editor.foreground': '#e5e7eb',
    'editor.lineHighlightBackground': '#ffffff07',
    'editor.lineHighlightBorder': '#ffffff00',
    'editor.selectionBackground': '#7c3aed35',
    'editor.selectionHighlightBackground': '#7c3aed18',
    'editor.findMatchBackground': '#22d3ee35',
    'editor.findMatchHighlightBackground': '#22d3ee18',
    'editorCursor.foreground': '#a78bfa',
    'editorLineNumber.foreground': '#2d3748',
    'editorLineNumber.activeForeground': '#6366f1',
    'editorIndentGuide.background1': '#1a1a2e',
    'editorIndentGuide.activeBackground1': '#3b3b6d',
    'editorBracketMatch.background': '#7c3aed25',
    'editorBracketMatch.border': '#7c3aed60',
    'editorWidget.background': '#0e0e1a',
    'editorWidget.border': '#ffffff12',
    'editorSuggestWidget.background': '#0e0e1a',
    'editorSuggestWidget.border': '#ffffff12',
    'editorSuggestWidget.selectedBackground': '#7c3aed25',
    'editorHoverWidget.background': '#0e0e1a',
    'editorHoverWidget.border': '#ffffff12',
    'editorGutter.background': '#080810',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#ffffff0d',
    'scrollbarSlider.hoverBackground': '#ffffff1a',
    'scrollbarSlider.activeBackground': '#7c3aed40',
    'minimap.background': '#080810',
    'editorOverviewRuler.border': '#ffffff00',
  },
};

const detectLanguage = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    html: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', md: 'markdown', py: 'python', rb: 'ruby',
    java: 'java', go: 'go', rs: 'rust', php: 'php',
    sql: 'sql', sh: 'shell', yaml: 'yaml', yml: 'yaml',
    xml: 'xml', svg: 'xml', vue: 'html', svelte: 'html',
    toml: 'ini', env: 'ini', gitignore: 'ini',
  };
  return map[ext] || 'plaintext';
};

const getLanguageLabel = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  const labels: Record<string, string> = {
    html: 'HTML', css: 'CSS', js: 'JavaScript', jsx: 'React JSX',
    ts: 'TypeScript', tsx: 'React TSX', json: 'JSON', md: 'Markdown',
    py: 'Python', java: 'Java', go: 'Go', rs: 'Rust', sh: 'Shell',
    scss: 'SCSS', yaml: 'YAML', yml: 'YAML', xml: 'XML', sql: 'SQL',
  };
  return labels[ext || ''] || ext?.toUpperCase() || 'Text';
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  filePath,
  darkMode = true,
  readOnly = false,
  onSave,
  onChange,
}) => {
  const [content, setContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, column: 1 });
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const settings = useEditorSettingsStore((s) => s.settings);

  // Load file on filePath change
  useEffect(() => {
    const fileContent = editorBridge.getFile(filePath);
    if (fileContent !== undefined) {
      setContent(fileContent);
    } else {
      editorBridge.createFile(filePath, '');
      setContent('');
    }
    setIsModified(false);
    editorBridge.setActiveFile(filePath);
  }, [filePath]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Register & apply Maula theme
    monaco.editor.defineTheme('maula-dark', MAULA_THEME);
    monaco.editor.setTheme('maula-dark');

    // Ctrl/Cmd+S → save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const value = editor.getValue();
      editorBridge.updateFile(filePath, value);
      editorBridge.markSaved(filePath);
      setIsModified(false);
      onSave?.(value);
    });

    // Cursor tracking
    editor.onDidChangeCursorPosition((e) => {
      const pos = { line: e.position.lineNumber, column: e.position.column };
      setCursorInfo(pos);
      editorBridge.setCursor(pos);
    });

    // Selection tracking
    editor.onDidChangeCursorSelection((e) => {
      const sel = e.selection;
      if (!sel.isEmpty()) {
        const selectedText = editor.getModel()?.getValueInRange(sel) || '';
        editorBridge.setSelection({
          start: { line: sel.startLineNumber, column: sel.startColumn },
          end: { line: sel.endLineNumber, column: sel.endColumn },
          text: selectedText,
        });
      } else {
        editorBridge.setSelection(null);
      }
    });

    editor.focus();
  }, [filePath, onSave]);

  const handleChange: OnChange = useCallback((value) => {
    if (value === undefined) return;
    setContent(value);
    setIsModified(true);
    onChange?.(value);
    // Live-sync to editorBridge so AI tools see the latest content
    editorBridge.updateFile(filePath, value);
  }, [filePath, onChange]);

  // Keep editor options in sync with settings
  useEffect(() => {
    editorRef.current?.updateOptions({
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap,
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers,
      bracketPairColorization: { enabled: settings.bracketPairColorization },
      readOnly,
    });
  }, [settings, readOnly]);

  const lang = detectLanguage(filePath);
  const langLabel = getLanguageLabel(filePath);

  return (
    <div className="h-full flex flex-col bg-canvas-card">
      {/* Top accent line */}
      <div className="h-[1px] flex-shrink-0 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

      {/* Monaco editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={lang}
          value={content}
          theme="maula-dark"
          onChange={handleChange}
          onMount={handleMount}
          loading={
            <div className="h-full w-full bg-canvas-card flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                <p className="text-xs text-gray-600">Loading editor…</p>
              </div>
            </div>
          }
          options={{
            fontSize: settings.fontSize,
            fontFamily: settings.fontFamily ?? "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            tabSize: settings.tabSize,
            wordWrap: settings.wordWrap,
            minimap: { enabled: settings.minimap },
            lineNumbers: settings.lineNumbers,
            bracketPairColorization: { enabled: settings.bracketPairColorization ?? true },
            readOnly,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderWhitespace: 'boundary',
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            suggestFontSize: 12,
            suggestLineHeight: 24,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            renderLineHighlight: 'gutter',
            folding: true,
            foldingHighlight: false,
            guides: { indentation: true, bracketPairs: true },
            colorDecorators: true,
            linkedEditing: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            lightbulb: { enabled: 'off' as const },
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs bg-canvas-card border-t border-canvas-border text-canvas-muted-deep flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-indigo-400 font-medium">{langLabel}</span>
          <span>Ln {cursorInfo.line}, Col {cursorInfo.column}</span>
          {editorBridge.getSelection() && (
            <span className="text-gray-600">({editorBridge.getSelection()?.text.length} selected)</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isModified && (
            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">Modified</span>
          )}
          <span className="opacity-40">{readOnly ? 'Read Only' : 'Ctrl+S to save'}</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
