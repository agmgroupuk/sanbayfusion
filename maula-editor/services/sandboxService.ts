import { createLogger } from './logger';
const log = createLogger('sandboxService.ts');
import { fetchWithCredentials } from '../fetchUtil';
// Cloud Sandbox Service - AWS ECS Fargate Integration
// Provides real server execution environment for user code

interface SandboxSession {
  sessionId: string;
  userId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
  publicUrl?: string;
  previewUrl?: string;
  taskArn?: string;
  privateIp?: string;
  createdAt: string;
  lastActivity: string;
}

interface SandboxFile {
  path: string;
  content: string;
}

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface BuildResult {
  success: boolean;
  output: string;
}

interface DevServerResult {
  started: boolean;
  port: number;
  url: string;
  output: string;
}

type OutputCallback = (type: 'stdout' | 'stderr' | 'system', data: string) => void;

const API_BASE = import.meta.env.VITE_API_URL || '';

class SandboxService {
  private currentSession: SandboxSession | null = null;
  private outputSocket: WebSocket | null = null;
  private outputCallbacks: Set<OutputCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Make authenticated API request (uses httpOnly cookies)
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetchWithCredentials(`${API_BASE}/api/sandbox${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Start a new sandbox session
  async startSession(): Promise<SandboxSession> {
    const session = await this.request<SandboxSession>('/start', {
      method: 'POST',
    });

    this.currentSession = session;
    this.connectOutputSocket(session.sessionId);

    return session;
  }

  // Wait for session to be ready
  async waitForReady(maxWaitMs = 120000): Promise<SandboxSession> {
    if (!this.currentSession) throw new Error('No active session');

    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getSessionStatus(this.currentSession.sessionId);

      if (status.status === 'running' && status.privateIp) {
        this.currentSession = status;
        return status;
      }

      if (status.status === 'stopped') {
        throw new Error('Session stopped unexpectedly');
      }

      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error('Session timed out waiting to start');
  }

  // Stop current session
  async stopSession(): Promise<void> {
    if (!this.currentSession) return;

    await this.request(`/${this.currentSession.sessionId}/stop`, {
      method: 'POST',
    });

    this.disconnectOutputSocket();
    this.currentSession = null;
  }

  // Get session status
  async getSessionStatus(sessionId: string): Promise<SandboxSession> {
    return this.request<SandboxSession>(`/${sessionId}/status`);
  }

  // List user's active sessions
  async listSessions(): Promise<SandboxSession[]> {
    const result = await this.request<{ sessions: SandboxSession[] }>('/sessions');
    return result.sessions;
  }

  // Initialize project files
  async initProject(files: SandboxFile[]): Promise<{ success: boolean }> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest('/init', {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  }

  // Write a single file
  async writeFile(path: string, content: string): Promise<{ success: boolean }> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest('/write', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    });
  }

  // Read a file
  async readFile(path: string): Promise<{ content: string }> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest(`/read?path=${encodeURIComponent(path)}`);
  }

  // List directory
  async listDir(path = '.'): Promise<{ entries: Array<{ name: string; type: 'file' | 'dir'; size?: number }> }> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest(`/list?path=${encodeURIComponent(path)}`);
  }

  // Execute a command
  async exec(command: string, cwd?: string): Promise<ExecResult> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest('/exec', {
      method: 'POST',
      body: JSON.stringify({ command, cwd }),
    });
  }

  // Install npm packages
  async installPackages(packages?: string[], usePnpm = false): Promise<ExecResult> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest('/install', {
      method: 'POST',
      body: JSON.stringify({ packages, usePnpm }),
    });
  }

  // Build project
  async build(buildCommand?: string): Promise<BuildResult> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest('/build', {
      method: 'POST',
      body: JSON.stringify({ command: buildCommand }),
    });
  }

  // Start dev server
  async startDevServer(devCommand?: string): Promise<DevServerResult> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest('/dev', {
      method: 'POST',
      body: JSON.stringify({ command: devCommand }),
    });
  }

  // Stop dev server
  async stopDevServer(): Promise<{ stopped: boolean }> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest('/stop', {
      method: 'POST',
    });
  }

  // Get running process output
  async getOutput(): Promise<{ output: string[] }> {
    if (!this.currentSession) throw new Error('No active session');

    return this.proxyRequest('/output');
  }

  // Deploy to static hosting
  async deploy(): Promise<{ url: string; domain: string }> {
    if (!this.currentSession) throw new Error('No active session');

    return this.request(`/${this.currentSession.sessionId}/deploy`, {
      method: 'POST',
    });
  }

  // Proxy request through backend to sandbox container
  private async proxyRequest<T>(
    sandboxPath: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.currentSession) throw new Error('No active session');

    const response = await fetchWithCredentials(
      `${API_BASE}/api/sandbox/${this.currentSession.sessionId}/proxy${sandboxPath}`,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // WebSocket for real-time output
  private connectOutputSocket(sessionId: string) {
    this.disconnectOutputSocket();

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = API_BASE.replace(/^https?:\/\//, '') || window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/api/sandbox/${sessionId}/output`;

    try {
      this.outputSocket = new WebSocket(wsUrl);

      this.outputSocket.onopen = () => {
        log.info('[Sandbox] Output socket connected');
        this.reconnectAttempts = 0;
      };

      this.outputSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.outputCallbacks.forEach(cb => {
            cb(data.type || 'stdout', data.data || data.message || '');
          });
        } catch {
          // Raw text message
          this.outputCallbacks.forEach(cb => cb('stdout', event.data));
        }
      };

      this.outputSocket.onclose = () => {
        log.info('[Sandbox] Output socket closed');
        // Auto-reconnect if session still active
        if (this.currentSession && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connectOutputSocket(sessionId), 2000 * this.reconnectAttempts);
        }
      };

      this.outputSocket.onerror = (error) => {
        log.error('[Sandbox] Output socket error:', error);
      };
    } catch (err) {
      log.error('[Sandbox] Failed to connect output socket:', err);
    }
  }

  private disconnectOutputSocket() {
    if (this.outputSocket) {
      this.outputSocket.close();
      this.outputSocket = null;
    }
  }

  // Subscribe to output
  onOutput(callback: OutputCallback): () => void {
    this.outputCallbacks.add(callback);
    return () => this.outputCallbacks.delete(callback);
  }

  // Get current session
  getSession(): SandboxSession | null {
    return this.currentSession;
  }

  // Check if session is active
  hasActiveSession(): boolean {
    return this.currentSession?.status === 'running';
  }

  // Get preview URL for iframe
  getPreviewUrl(): string | null {
    return this.currentSession?.previewUrl || null;
  }
}

// Singleton instance
export const sandboxService = new SandboxService();

// Types export
export type {
  SandboxSession,
  SandboxFile,
  ExecResult,
  BuildResult,
  DevServerResult,
  OutputCallback,
};
