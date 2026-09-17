/**
 * buildService — Production build pipeline management
 * Starts real server-side builds, subscribes to SSE log streams, cancels builds
 */
const API_BASE = '/api/builds';

export interface BuildConfig {
  projectId: string;
  files?: Record<string, string>;
  framework?: string;
  nodeVersion?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDir?: string;
  envVars?: Record<string, string>;
}

export interface BuildStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  logs?: string;
}

export interface BuildResult {
  id: string;
  projectId: string;
  status: 'queued' | 'installing' | 'building' | 'testing' | 'scanning' | 'success' | 'failed' | 'cancelled';
  stages: BuildStage[];
  duration?: number;
  errorMessage?: string;
  artifactSize?: number;
  createdAt: string;
  completedAt?: string;
}

export interface BuildLogEvent {
  type: 'connected' | 'log' | 'stage-start' | 'stage-complete' | 'stage-error' | 'complete' | 'error' | 'cancelled';
  stage?: string;
  name?: string;
  message?: string;
  status?: string;
  duration?: number;
  timestamp?: number;
}

export interface BuildError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export const buildService = {
  /**
   * Start a server-side build. Sends project files inline for immediate build.
   * Returns the build record (id, status, stages).
   */
  async startBuild(config: BuildConfig): Promise<{ success: boolean; build: BuildResult }> {
    const body: Record<string, unknown> = { projectId: config.projectId };

    // Convert files Record to array format expected by backend
    if (config.files) {
      body.files = Object.entries(config.files).map(([path, content]) => ({ path, content }));
    }

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(data.message || `Build failed to start: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Subscribe to build log stream via SSE.
   * Returns an object with { close() } to disconnect.
   * Calls onEvent for each log event, onDone when build completes/fails.
   */
  subscribeLogs(
    buildId: string,
    onEvent: (event: BuildLogEvent) => void,
    onDone: (finalStatus: string) => void,
    onError?: (error: Error) => void,
  ): { close: () => void } {
    const url = `${API_BASE}/${buildId}/logs`;
    let closed = false;

    // Use fetch-based SSE for cookie credentials (EventSource doesn't send cookies)
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(url, {
          credentials: 'include',
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        });

        if (!res.ok) {
          throw new Error(`SSE connection failed: ${res.statusText}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: BuildLogEvent = JSON.parse(line.slice(6));
                onEvent(event);

                // Check for terminal events
                if (event.type === 'complete' || event.type === 'error' || event.type === 'cancelled') {
                  onDone(event.status || event.type);
                  closed = true;
                  break;
                }
              } catch {
                // Malformed SSE data — skip
              }
            }
          }
        }
      } catch (err: unknown) {
        if (!closed && !(err instanceof DOMException && (err as DOMException).name === 'AbortError')) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();

    return {
      close() {
        closed = true;
        controller.abort();
      },
    };
  },

  /**
   * Get build details by ID
   */
  async getBuild(buildId: string): Promise<BuildResult> {
    const res = await fetch(`${API_BASE}/detail/${buildId}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to get build: ${res.statusText}`);
    const data = await res.json();
    return data.build;
  },

  /**
   * Cancel a running build
   */
  async cancelBuild(buildId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${buildId}/cancel`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to cancel build: ${res.statusText}`);
  },

  /**
   * List builds for a project
   */
  async listBuilds(projectId: string): Promise<{ builds: BuildResult[]; total: number }> {
    const res = await fetch(`${API_BASE}/${projectId}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to list builds: ${res.statusText}`);
    return res.json();
  },

  /**
   * Detect project framework from files
   */
  async detectFramework(files: string[], packageJson?: Record<string, unknown>): Promise<{ name: string; id: string; buildCommand: string }> {
    const res = await fetch(`${API_BASE}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ files, packageJson }),
    });
    if (!res.ok) throw new Error(`Detection failed: ${res.statusText}`);
    return res.json();
  },
};

export default buildService;
