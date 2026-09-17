/**
 * Terminal — Embedded xterm.js terminal with gorgeous styling
 * Connects to sandbox WebSocket for real command execution
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { TerminalIcon, X, Plus, Maximize2, Minimize2 } from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';

interface TerminalProps {
  sessionId: string;
  className?: string;
}

const Terminal: React.FC<TerminalProps> = ({ sessionId, className = '' }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const outputs = useTerminalStore((s) => s.outputs);
  const addOutput = useTerminalStore((s) => s.addOutput);
  const [inputBuffer, setInputBuffer] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initTerminal = async () => {
      if (!terminalRef.current || xtermRef.current) return;

      try {
        const { Terminal: XTerminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        if (!mounted) return;

        const fitAddon = new FitAddon();
        const term = new XTerminal({
          theme: {
            background: '#0a0a0a',
            foreground: '#e5e7eb',
            cursor: '#a78bfa',
            cursorAccent: '#0a0a0a',
            selectionBackground: '#7c3aed30',
            selectionForeground: '#e5e7eb',
            black: '#111113',
            brightBlack: '#4b5563',
            red: '#ef4444',
            brightRed: '#f87171',
            green: '#34d399',
            brightGreen: '#6ee7b7',
            yellow: '#fbbf24',
            brightYellow: '#fde68a',
            blue: '#60a5fa',
            brightBlue: '#93c5fd',
            magenta: '#c084fc',
            brightMagenta: '#d8b4fe',
            cyan: '#22d3ee',
            brightCyan: '#67e8f9',
            white: '#e5e7eb',
            brightWhite: '#f9fafb',
          },
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          cursorBlink: true,
          cursorStyle: 'bar',
          scrollback: 5000,
          allowTransparency: true,
          drawBoldTextInBrightColors: true,
        });

        term.loadAddon(fitAddon);
        term.open(terminalRef.current!);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Welcome message
        term.writeln('\x1b[38;2;124;58;237m╭──────────────────────────────────╮\x1b[0m');
        term.writeln('\x1b[38;2;124;58;237m│\x1b[0m  \x1b[1;38;2;167;139;250m⚡ GenCraft Pro Terminal\x1b[0m          \x1b[38;2;124;58;237m│\x1b[0m');
        term.writeln('\x1b[38;2;124;58;237m╰──────────────────────────────────╯\x1b[0m');
        term.writeln('');
        term.write('\x1b[38;2;34;211;238m❯\x1b[0m ');

        // Handle input — execute commands via backend sandbox
        let currentLine = '';
        let isExecuting = false;
        term.onData(async (data: string) => {
          if (isExecuting) return;
          if (data === '\r') {
            // Enter pressed
            term.writeln('');
            const trimmed = currentLine.trim();
            if (trimmed) {
              addOutput(sessionId, { terminalId: sessionId, type: 'stdout', text: `$ ${trimmed}` });
              if (trimmed === 'clear') {
                term.clear();
              } else if (trimmed === 'help') {
                term.writeln('\x1b[38;2;167;139;250m  Commands execute in the Canvas sandbox.\x1b[0m');
                term.writeln('    Supports: ls, cat, grep, node -e, python -c, etc.');
                term.writeln('    clear, help');
              } else {
                isExecuting = true;
                try {
                  const { useEditorStore } = await import('../../services/editorBridge');
                  const currentFiles = useEditorStore.getState().files || {};
                  const resp = await fetch('/api/canvas/terminal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ command: trimmed, currentFiles }),
                  });
                  const result = await resp.json();
                  if (result.output) {
                    for (const line of result.output.split('\n')) {
                      term.writeln(line);
                    }
                  }
                  if (result.error) {
                    term.writeln(`\x1b[31m${result.error}\x1b[0m`);
                  }
                } catch (err: any) {
                  term.writeln(`\x1b[31mError: ${err.message || 'Failed to execute'}\x1b[0m`);
                }
                isExecuting = false;
              }
            }
            currentLine = '';
            term.write('\x1b[38;2;34;211;238m❯\x1b[0m ');
          } else if (data === '\x7f') {
            // Backspace
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              term.write('\b \b');
            }
          } else if (data >= ' ') {
            currentLine += data;
            term.write(data);
          }
        });

        setIsInitialized(true);

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
          try { fitAddon.fit(); } catch { }
        });
        resizeObserver.observe(terminalRef.current!);

        return () => {
          resizeObserver.disconnect();
          term.dispose();
        };
      } catch (e) {
        console.error('Failed to initialize terminal:', e);
      }
    };

    initTerminal();

    return () => { mounted = false; };
  }, [sessionId, addOutput]);

  // Load xterm CSS
  useEffect(() => {
    const linkId = 'xterm-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.min.css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className={`h-full w-full bg-canvas-card relative ${className}`}>
      {/* Top glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent z-10" />

      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas-card z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-xs text-gray-600">Initializing terminal...</p>
          </div>
        </div>
      )}

      <div ref={terminalRef} className="h-full w-full p-2" />
    </div>
  );
};

export default Terminal;
