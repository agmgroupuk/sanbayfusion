'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';

// Dynamic import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => {
    // Configure Monaco loader
    mod.loader.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
      },
    });
    return mod.default;
  }),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full bg-gray-900"><div className="animate-pulse text-gray-400">Loading editor...</div></div> }
);

interface CodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
  theme?: 'vs-dark' | 'light' | 'hc-black';
  readOnly?: boolean;
  height?: string | number;
  onChange?: (value: string | undefined) => void;
  onClose?: () => void;
  showLineNumbers?: boolean;
  minimap?: boolean;
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  className?: string;
}

// Language detection based on filename or content
const detectLanguage = (filename?: string, content?: string): string => {
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sql': 'sql',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'ps1': 'powershell',
      'dockerfile': 'dockerfile',
      'graphql': 'graphql',
      'gql': 'graphql',
      'vue': 'vue',
      'svelte': 'svelte',
    };
    return langMap[ext || ''] || 'plaintext';
  }
  
  // Try to detect from content
  if (content) {
    if (content.startsWith('<!DOCTYPE html') || content.startsWith('<html')) return 'html';
    if (content.includes('import React') || content.includes('from "react"')) return 'typescript';
    if (content.startsWith('{') || content.startsWith('[')) return 'json';
    if (content.includes('def ') && content.includes(':')) return 'python';
    if (content.includes('function ') || content.includes('const ') || content.includes('let ')) return 'javascript';
  }
  
  return 'plaintext';
};

export default function CodeViewer({
  code,
  language,
  filename,
  theme = 'vs-dark',
  readOnly = true,
  height = '400px',
  onChange,
  onClose,
  showLineNumbers = true,
  minimap = false,
  wordWrap = 'on',
  className = '',
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const detectedLanguage = language || detectLanguage(filename, code);
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);
  
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const editorOptions = {
    readOnly,
    minimap: { enabled: minimap },
    lineNumbers: showLineNumbers ? 'on' : 'off',
    wordWrap,
    scrollBeyondLastLine: false,
    fontSize: 14,
    tabSize: 2,
    automaticLayout: true,
    padding: { top: 10, bottom: 10 },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
    },
    folding: true,
    foldingHighlight: true,
    renderLineHighlight: 'line',
    cursorBlinking: 'smooth',
  };

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-gray-900' 
    : `relative ${className}`;

  return (
    <div className={containerClass}>
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          {filename && (
            <span className="text-sm text-gray-300 font-mono">{filename}</span>
          )}
          <span className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
            {detectedLanguage}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <CheckIcon className="w-5 h-5 text-green-400" />
            ) : (
              <ClipboardDocumentIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title="Close"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      
      {/* Monaco Editor */}
      <div style={{ height: isFullscreen ? 'calc(100vh - 45px)' : height }}>
        <MonacoEditor
          value={code}
          language={detectedLanguage}
          theme={theme}
          onChange={onChange}
          options={editorOptions as any}
        />
      </div>
    </div>
  );
}
