// Enhanced Code Editor with Editor Bridge Integration
// Provides editable code with selection/cursor tracking

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { editorBridge, EditorSelection, EditorCursor } from '../services/editorBridge';
import { FileNode } from '../types';

interface CodeEditorProps {
  code?: string;
  onCodeChange?: (code: string) => void;
  onSave?: (code: string) => void;
  activeFilePath?: string;
  filePath?: string;
  readOnly?: boolean;
  darkMode?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onCodeChange,
  onSave,
  activeFilePath,
  filePath,
  readOnly = false,
  darkMode = true,
}) => {
  // Support both prop names for backwards compatibility
  const effectiveFilePath = activeFilePath || filePath || '/index.html';
  const effectiveOnChange = onCodeChange || onSave;
  
  // Get initial code from editorBridge if not provided
  const initialCode = code ?? editorBridge.getFile(effectiveFilePath) ?? '';
  const [localCode, setLocalCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<EditorSelection | null>(null);
  const [cursorInfo, setCursorInfo] = useState<EditorCursor | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync code with prop or file path changes
  useEffect(() => {
    const newCode = code ?? editorBridge.getFile(effectiveFilePath) ?? '';
    setLocalCode(newCode);
    editorBridge.updateFile(effectiveFilePath, newCode);
    editorBridge.setActiveFile(effectiveFilePath);
  }, [code, effectiveFilePath]);

  // Calculate line and column from position
  const getLineColumn = (text: string, position: number) => {
    const before = text.slice(0, position);
    const lines = before.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  };

  // Track selection changes
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return;
    
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const startPos = getLineColumn(value, selectionStart);
    const endPos = getLineColumn(value, selectionEnd);

    if (selectionStart !== selectionEnd) {
      // Has selection
      const selection: EditorSelection = {
        path: effectiveFilePath,
        start: selectionStart,
        end: selectionEnd,
        text: value.slice(selectionStart, selectionEnd),
        lineStart: startPos.line,
        lineEnd: endPos.line,
      };
      setSelectionInfo(selection);
      editorBridge.setSelection(selection);
      editorBridge.setCursor(null);
      setCursorInfo(null);
    } else {
      // Just cursor
      const cursor: EditorCursor = {
        path: effectiveFilePath,
        position: selectionStart,
        line: startPos.line,
        column: startPos.column,
      };
      setCursorInfo(cursor);
      editorBridge.setCursor(cursor);
      editorBridge.setSelection(null);
      setSelectionInfo(null);
    }
  }, [effectiveFilePath]);

  // Handle code changes
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setLocalCode(newCode);
    editorBridge.updateFile(effectiveFilePath, newCode);
    effectiveOnChange?.(newCode);
  };

  // Copy code
  const handleCopy = async () => {
    await navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newCode = localCode.slice(0, start) + '  ' + localCode.slice(end);
      setLocalCode(newCode);
      editorBridge.updateFile(effectiveFilePath, newCode);
      effectiveOnChange?.(newCode);

      // Move cursor after the tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }

    // Ctrl/Cmd + S for save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      effectiveOnChange?.(localCode);
      editorBridge.markSaved();
    }

    // Ctrl/Cmd + D for duplicate line
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const lines = localCode.split('\n');
      const { line } = getLineColumn(localCode, textarea.selectionStart);
      const currentLine = lines[line - 1];
      lines.splice(line, 0, currentLine);
      const newCode = lines.join('\n');
      
      setLocalCode(newCode);
      editorBridge.updateFile(effectiveFilePath, newCode);
      effectiveOnChange?.(newCode);
    }
  };

  // Sync scroll between textarea and highlight div
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Line count
  const lineCount = localCode.split('\n').length;
  const codeSize = `${(new TextEncoder().encode(localCode).length / 1024).toFixed(1)} KB`;

  return (
    <div className={`flex flex-col h-full ${darkMode ? 'bg-canvas-card' : 'bg-gray-50'}`}>
      {/* Status Bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${darkMode ? 'border-gray-800 bg-black/40' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-4">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-cyan-500/70' : 'text-cyan-600'}`}>
            {effectiveFilePath}
          </span>
          <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>|</span>
          <span className={`text-[10px] font-mono ${darkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>
            {lineCount} lines
          </span>
          <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>|</span>
          <span className={`text-[10px] font-mono ${darkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>
            {codeSize}
          </span>
          
          {/* Cursor/Selection info */}
          {cursorInfo && (
            <>
              <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>|</span>
              <span className={`text-[10px] font-mono ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                Ln {cursorInfo.line}, Col {cursorInfo.column}
              </span>
            </>
          )}
          {selectionInfo && (
            <>
              <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>|</span>
              <span className={`text-[10px] font-mono ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Selected: {selectionInfo.text.length} chars (Ln {selectionInfo.lineStart}-{selectionInfo.lineEnd})
              </span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {editorBridge.hasUnsavedChanges() && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${darkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
              Unsaved
            </span>
          )}
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-2 transition-all border font-medium ${
              copied 
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' 
                : darkMode 
                  ? 'bg-gray-800/60 text-canvas-muted hover:text-cyan-400 border-gray-700 hover:border-cyan-500/30 hover:bg-cyan-500/10'
                  : 'bg-white text-gray-600 hover:text-cyan-600 border-gray-200 hover:border-cyan-300'
            }`}
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Line numbers */}
        <div 
          className={`absolute left-0 top-0 bottom-0 w-12 ${darkMode ? 'bg-black/60 border-r border-gray-800' : 'bg-gray-100 border-r border-gray-200'} z-10 overflow-hidden`}
        >
          <div className="py-4 font-mono text-xs leading-relaxed">
            {localCode.split('\n').map((_, i) => (
              <div 
                key={i} 
                className={`pr-3 text-right h-[1.5rem] ${
                  cursorInfo?.line === i + 1 
                    ? darkMode ? 'text-cyan-400' : 'text-cyan-600' 
                    : darkMode ? 'text-gray-600' : 'text-canvas-muted'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Editable textarea */}
        <textarea
          ref={textareaRef}
          value={localCode}
          onChange={handleCodeChange}
          onSelect={handleSelectionChange}
          onClick={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          aria-label="Code editor"
          title="Code editor - Edit your code here"
          className={`absolute inset-0 pl-14 pr-4 py-4 font-mono text-sm leading-relaxed resize-none outline-none ${
            darkMode 
              ? 'bg-transparent text-gray-200 caret-cyan-400' 
              : 'bg-transparent text-gray-800 caret-cyan-600'
          } ${readOnly ? 'cursor-default' : ''}`}
          style={{ 
            tabSize: 2,
            lineHeight: '1.5rem',
          }}
        />
      </div>

      {/* Footer with shortcuts */}
      <div className={`flex items-center justify-between px-4 py-1.5 border-t ${darkMode ? 'border-gray-800 bg-black/40' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-4">
          <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
            <kbd className={`px-1 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>Tab</kbd> Indent
          </span>
          <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
            <kbd className={`px-1 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>⌘S</kbd> Save
          </span>
          <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
            <kbd className={`px-1 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>⌘D</kbd> Duplicate Line
          </span>
        </div>
        <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
          Editor Bridge Active
        </span>
      </div>
    </div>
  );
};

export default CodeEditor;
