/**
 * terminalService — Execute terminal commands in Canvas sandbox
 * Wraps POST /api/canvas/terminal endpoint
 */
export interface CommandResult {
  output: string;
  exitCode: number;
  duration: number;
}

class TerminalService {
  private history: string[] = [];
  private historyIndex = -1;

  /** Execute a command via the backend sandbox */
  async execute(commandStr: string, currentFiles?: Record<string, string>): Promise<CommandResult> {
    const trimmed = commandStr.trim();
    if (!trimmed) return { output: '', exitCode: 0, duration: 0 };

    this.history.push(trimmed);
    this.historyIndex = this.history.length;

    const start = performance.now();
    try {
      const resp = await fetch('/api/canvas/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ command: trimmed, currentFiles: currentFiles || {} }),
      });
      const data = await resp.json();
      const duration = Math.round(performance.now() - start);

      if (data.success) {
        return {
          output: (data.output || '') + (data.error ? `\n${data.error}` : ''),
          exitCode: data.error ? 1 : 0,
          duration,
        };
      }
      return { output: data.error || 'Command failed', exitCode: 1, duration };
    } catch (err: any) {
      return { output: err.message || 'Network error', exitCode: 1, duration: Math.round(performance.now() - start) };
    }
  }

  /** Get command history */
  getHistory(): string[] {
    return [...this.history];
  }

  /** Navigate history (up = -1, down = 1) */
  navigateHistory(direction: -1 | 1): string | null {
    this.historyIndex += direction;
    if (this.historyIndex < 0) {
      this.historyIndex = 0;
      return this.history[0] || null;
    }
    if (this.historyIndex >= this.history.length) {
      this.historyIndex = this.history.length;
      return null;
    }
    return this.history[this.historyIndex];
  }

  /** Get current working directory */
  getCwd(): string {
    return '/workspace';
  }
}

export const terminalService = new TerminalService();
export default terminalService;
