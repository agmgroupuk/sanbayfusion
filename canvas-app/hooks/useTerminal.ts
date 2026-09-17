/**
 * useTerminal — Terminal session management hook
 * Wraps terminalStore for convenient usage
 */
import { useCallback } from 'react';
import { useTerminalStore } from '../stores/terminalStore';

export function useTerminal() {
  const store = useTerminalStore();

  const createTerminal = useCallback((name?: string) => {
    return store.createSession(name);
  }, [store]);

  const executeCommand = useCallback(async (terminalId: string, command: string) => {
    store.addOutput(terminalId, { terminalId, type: 'stdout', text: `$ ${command}` });

    try {
      const resp = await fetch('/api/canvas/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ command, currentFiles: {} }),
      });
      const data = await resp.json();
      if (data.output) {
        store.addOutput(terminalId, { terminalId, type: 'stdout', text: data.output });
      }
      if (data.error) {
        store.addOutput(terminalId, { terminalId, type: 'stderr', text: data.error });
      }
    } catch (err: any) {
      store.addOutput(terminalId, { terminalId, type: 'stderr', text: err.message || 'Command failed' });
    }
  }, [store]);

  const writeToTerminal = useCallback((terminalId: string, text: string, type: 'stdout' | 'stderr' | 'system' = 'stdout') => {
    store.addOutput(terminalId, { terminalId, type, text });
  }, [store]);

  return {
    sessions: store.sessions,
    activeSessionId: store.activeSessionId,
    outputs: store.outputs,
    isVisible: store.isVisible,
    height: store.height,
    createTerminal,
    closeTerminal: store.closeSession,
    setActiveSession: store.setActiveSession,
    executeCommand,
    writeToTerminal,
    clearOutput: store.clearOutput,
    toggleVisible: store.toggleVisible,
    setHeight: store.setHeight,
    renameSession: store.renameSession,
  };
}
