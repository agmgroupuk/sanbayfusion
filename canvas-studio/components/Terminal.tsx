/**
 * Terminal.tsx — Integrated terminal for Canvas Studio IDE
 * 
 * Uses xterm.js to provide a sandboxed terminal experience.
 * Commands are sent to the backend for execution in a safe sandbox.
 * Supports: basic shell commands, npm/node, python, output streaming.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import terminalService from '../services/terminalService';

interface TerminalProps {
  isDark: boolean;
  isVisible: boolean;
  onClose?: () => void;
  currentFiles?: Record<string, string>;
}

// Canvas Studio dark theme for xterm
const DARK_THEME = {
  background: '#0a0a0f',
  foreground: '#e4e4e7',
  cursor: '#06b6d4',
  cursorAccent: '#0a0a0f',
  selectionBackground: '#06b6d433',
  selectionForeground: '#ffffff',
  black: '#18181b',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
  magenta: '#a855f7',
  cyan: '#06b6d4',
  white: '#e4e4e7',
  brightBlack: '#52525b',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#fafafa',
};

const LIGHT_THEME = {
  background: '#fafafa',
  foreground: '#18181b',
  cursor: '#0891b2',
  cursorAccent: '#ffffff',
  selectionBackground: '#0891b233',
  selectionForeground: '#000000',
  black: '#18181b',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#e4e4e7',
  brightBlack: '#71717a',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#fafafa',
};

const WELCOME_MESSAGE = [
  '\x1b[36m╭─────────────────────────────────────╮\x1b[0m',
  '\x1b[36m│\x1b[0m  \x1b[1;35mCanvas Studio Terminal\x1b[0m            \x1b[36m│\x1b[0m',
  '\x1b[36m│\x1b[0m  Sandboxed execution environment    \x1b[36m│\x1b[0m',
  '\x1b[36m│\x1b[0m  Type \x1b[33mhelp\x1b[0m for available commands  \x1b[36m│\x1b[0m',
  '\x1b[36m╰─────────────────────────────────────╯\x1b[0m',
  '',
].join('\r\n');

const HELP_TEXT = [
  '',
  '\x1b[1;36mAvailable Commands:\x1b[0m',
  '',
  '  \x1b[33mhelp\x1b[0m              Show this help message',
  '  \x1b[33mclear\x1b[0m             Clear the terminal',
  '  \x1b[33mls\x1b[0m / \x1b[33mdir\x1b[0m         List project files',
  '  \x1b[33mcat <file>\x1b[0m        Show file contents',
  '  \x1b[33mnode -e <code>\x1b[0m    Execute JavaScript',
  '  \x1b[33mpython -c <code>\x1b[0m  Execute Python',
  '  \x1b[33mecho <text>\x1b[0m       Print text',
  '  \x1b[33mdate\x1b[0m              Show current date/time',
  '  \x1b[33menv\x1b[0m               Show environment info',
  '',
  '\x1b[2m  Commands run in a sandboxed environment.\x1b[0m',
  '\x1b[2m  File operations work on your project files.\x1b[0m',
  '',
].join('\r\n');

export default function TerminalComponent({ isDark, isVisible, onClose, currentFiles }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef<string>('');
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [isExecuting, setIsExecuting] = useState(false);

  const prompt = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.write('\r\n\x1b[36m❯\x1b[0m ');
    }
  }, []);

  const executeCommand = useCallback(async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) {
      prompt();
      return;
    }

    // Add to history
    historyRef.current.unshift(trimmed);
    if (historyRef.current.length > 50) historyRef.current.pop();
    historyIndexRef.current = -1;

    const term = xtermRef.current;
    if (!term) return;

    // Handle local commands
    if (trimmed === 'clear') {
      term.clear();
      prompt();
      return;
    }

    if (trimmed === 'help') {
      term.write(HELP_TEXT);
      prompt();
      return;
    }

    if (trimmed === 'env') {
      term.write([
        '',
        `\x1b[33mRuntime:\x1b[0m    Canvas Studio Sandbox`,
        `\x1b[33mNode.js:\x1b[0m    Available`,
        `\x1b[33mPython:\x1b[0m     Available`,
        `\x1b[33mShell:\x1b[0m      Sandboxed`,
        '',
      ].join('\r\n'));
      prompt();
      return;
    }

    // Execute on backend
    setIsExecuting(true);
    try {
      const data = await terminalService.execute(trimmed, currentFiles || {});

      if (data.success) {
        if (data.output) {
          // Format output line by line
          const lines = data.output.split('\n');
          for (const line of lines) {
            term.write(`\r\n${line}`);
          }
        }
        if (data.error) {
          term.write(`\r\n\x1b[31m${data.error}\x1b[0m`);
        }
      } else {
        term.write(`\r\n\x1b[31mError: ${data.error || 'Command failed'}\x1b[0m`);
      }
    } catch (err: any) {
      term.write(`\r\n\x1b[31mError: ${err.message || 'Failed to execute command'}\x1b[0m`);
    }
    setIsExecuting(false);
    prompt();
  }, [prompt]);

  // Initialize xterm
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      theme: isDark ? DARK_THEME : LIGHT_THEME,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Menlo", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      allowProposedApi: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Write welcome message
    term.write(WELCOME_MESSAGE);
    term.write('\x1b[36m❯\x1b[0m ');

    // Handle input
    term.onData((data) => {
      if (isExecuting) return;

      switch (data) {
        case '\r': // Enter
          term.write('\r\n');
          executeCommand(inputBufferRef.current);
          inputBufferRef.current = '';
          break;

        case '\x7f': // Backspace
          if (inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
            term.write('\b \b');
          }
          break;

        case '\x1b[A': // Up arrow (history)
          if (historyRef.current.length > 0 && historyIndexRef.current < historyRef.current.length - 1) {
            // Clear current input
            const clearLen = inputBufferRef.current.length;
            term.write('\b \b'.repeat(clearLen));
            // Load from history
            historyIndexRef.current++;
            inputBufferRef.current = historyRef.current[historyIndexRef.current];
            term.write(inputBufferRef.current);
          }
          break;

        case '\x1b[B': // Down arrow (history)
          if (historyIndexRef.current > 0) {
            const clearLen = inputBufferRef.current.length;
            term.write('\b \b'.repeat(clearLen));
            historyIndexRef.current--;
            inputBufferRef.current = historyRef.current[historyIndexRef.current];
            term.write(inputBufferRef.current);
          } else if (historyIndexRef.current === 0) {
            const clearLen = inputBufferRef.current.length;
            term.write('\b \b'.repeat(clearLen));
            historyIndexRef.current = -1;
            inputBufferRef.current = '';
          }
          break;

        case '\x03': // Ctrl+C
          term.write('^C');
          inputBufferRef.current = '';
          prompt();
          break;

        case '\x0c': // Ctrl+L (clear)
          term.clear();
          prompt();
          break;

        default:
          if (data >= ' ') { // Printable chars
            inputBufferRef.current += data;
            term.write(data);
          }
          break;
      }
    });

    return () => {
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update theme
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = isDark ? DARK_THEME : LIGHT_THEME;
    }
  }, [isDark]);

  // Fit on visibility/resize
  useEffect(() => {
    if (!isVisible || !fitAddonRef.current) return;

    const timer = setTimeout(() => fitAddonRef.current?.fit(), 50);

    const handleResize = () => fitAddonRef.current?.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`flex flex-col h-full border-t ${isDark ? 'border-gray-800 bg-canvas-card' : 'border-gray-200 bg-[#fafafa]'}`}>
      {/* Terminal header */}
      <div className={`flex items-center justify-between px-3 py-1.5 ${isDark ? 'bg-gray-900/80' : 'bg-gray-100'} border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-xs font-medium ${isDark ? 'text-canvas-text' : 'text-gray-600'}`}>
            Terminal
          </span>
          {isExecuting && (
            <span className="text-xs text-yellow-500 animate-pulse">running...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (xtermRef.current) {
                xtermRef.current.clear();
                prompt();
              }
            }}
            className={`p-1 rounded hover:bg-gray-700/50 transition-colors ${isDark ? 'text-canvas-muted hover:text-gray-200' : 'text-canvas-muted-deep hover:text-gray-700'}`}
            title="Clear terminal"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1 rounded hover:bg-gray-700/50 transition-colors ${isDark ? 'text-canvas-muted hover:text-gray-200' : 'text-canvas-muted-deep hover:text-gray-700'}`}
              title="Close terminal"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {/* Terminal body */}
      <div ref={terminalRef} className="flex-1 p-1" style={{ minHeight: 0 }} />
    </div>
  );
}
