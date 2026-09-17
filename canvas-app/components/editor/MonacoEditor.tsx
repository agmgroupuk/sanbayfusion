/**
 * MonacoEditor — Full Monaco editor with multi-file, multi-tab support
 * Gorgeous dark theme, fiber-optimized re-renders via Zustand selectors
 */
import React, { useCallback, useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { useEditorSettingsStore } from '../../stores/editorStore';

interface MonacoEditorProps {
  filePath: string;
  content: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  className?: string;
}

// GenCraft Pro dark theme
const GENCRAFT_THEME: MonacoEditor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '4b5563', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c084fc' },
    { token: 'string', foreground: '34d399' },
    { token: 'number', foreground: 'fb923c' },
    { token: 'type', foreground: '22d3ee' },
    { token: 'function', foreground: '60a5fa' },
    { token: 'variable', foreground: 'e5e7eb' },
    { token: 'operator', foreground: 'f472b6' },
    { token: 'tag', foreground: 'f472b6' },
    { token: 'attribute.name', foreground: '22d3ee' },
    { token: 'attribute.value', foreground: '34d399' },
    { token: 'delimiter', foreground: '9ca3af' },
    { token: 'regexp', foreground: 'fbbf24' },
    { token: 'annotation', foreground: 'fbbf24' },
    { token: 'constant', foreground: 'fb923c' },
  ],
  colors: {
    'editor.background': '#0a0a0a',
    'editor.foreground': '#e5e7eb',
    'editor.lineHighlightBackground': '#ffffff06',
    'editor.selectionBackground': '#7c3aed30',
    'editor.selectionHighlightBackground': '#7c3aed15',
    'editor.findMatchBackground': '#22d3ee30',
    'editor.findMatchHighlightBackground': '#22d3ee15',
    'editorCursor.foreground': '#a78bfa',
    'editorLineNumber.foreground': '#374151',
    'editorLineNumber.activeForeground': '#9ca3af',
    'editorIndentGuide.background': '#1f2937',
    'editorIndentGuide.activeBackground': '#374151',
    'editorBracketMatch.background': '#7c3aed20',
    'editorBracketMatch.border': '#7c3aed50',
    'editorWidget.background': '#111113',
    'editorWidget.border': '#ffffff10',
    'editorSuggestWidget.background': '#111113',
    'editorSuggestWidget.border': '#ffffff10',
    'editorSuggestWidget.selectedBackground': '#7c3aed20',
    'editorHoverWidget.background': '#111113',
    'editorHoverWidget.border': '#ffffff10',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#ffffff10',
    'scrollbarSlider.hoverBackground': '#ffffff20',
    'scrollbarSlider.activeBackground': '#7c3aed40',
    'minimap.background': '#0a0a0a',
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
  };
  return map[ext] || 'plaintext';
};

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({
  filePath,
  content,
  language,
  readOnly = false,
  onChange,
  onSave,
  onCursorChange,
  className = '',
}) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const settings = useEditorSettingsStore((s) => s.settings);
  const setCursor = useEditorSettingsStore((s) => s.setCursor);

  const detectedLang = language || detectLanguage(filePath);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Register GenCraft Pro theme
    monaco.editor.defineTheme('gencraft-dark', GENCRAFT_THEME);
    monaco.editor.setTheme('gencraft-dark');

    // Save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const value = editor.getValue();
      onSave?.(value);
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursor({ line: e.position.lineNumber, column: e.position.column });
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });

    // Focus editor
    editor.focus();
  }, [onSave, onCursorChange, setCursor]);

  const handleChange: OnChange = useCallback((value) => {
    if (value !== undefined) onChange?.(value);
  }, [onChange]);

  // Update editor options when settings change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers,
        bracketPairColorization: { enabled: settings.bracketPairColorization },
        readOnly,
      });
    }
  }, [settings, readOnly]);

  return (
    <div className={`h-full w-full relative ${className}`}>
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/20 to-transparent z-10" />

      <Editor
        height="100%"
        language={detectedLang}
        value={content}
        theme="gencraft-dark"
        onChange={handleChange}
        onMount={handleMount}
        loading={
          <div className="h-full w-full bg-canvas-card flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-400 rounded-full animate-spin" />
              <p className="text-xs text-gray-600">Loading editor...</p>
            </div>
          </div>
        }
        options={{
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap,
          minimap: { enabled: settings.minimap },
          lineNumbers: settings.lineNumbers,
          bracketPairColorization: { enabled: settings.bracketPairColorization },
          readOnly,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderWhitespace: 'boundary',
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          suggestFontSize: 12,
          suggestLineHeight: 24,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          renderLineHighlight: 'line',
          folding: true,
          foldingHighlight: false,
          guides: { indentation: true, bracketPairs: true },
          colorDecorators: true,
          linkedEditing: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          formatOnPaste: true,
        }}
      />
    </div>
  );
};

export default MonacoEditorComponent;
