/**
 * terminalService — Execute terminal commands in Canvas Studio sandbox
 * Wraps POST /api/canvas/terminal endpoint
 */

const API_BASE = '/api/canvas/terminal';
const HEADERS = { 'Content-Type': 'application/json', 'x-canvas-source': 'standalone' };

export interface TerminalResult {
    success: boolean;
    output?: string;
    error?: string;
    exitCode?: number;
}

export const terminalService = {
    /** Execute a command in the backend sandbox */
    async execute(command: string, currentFiles?: Record<string, string>): Promise<TerminalResult> {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: HEADERS,
            credentials: 'include',
            body: JSON.stringify({ command, currentFiles: currentFiles || {} }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({ error: res.statusText }));
            return { success: false, error: data.error || `Terminal error: ${res.status}` };
        }
        return res.json();
    },
};

export default terminalService;
