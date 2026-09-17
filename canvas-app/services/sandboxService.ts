/**
 * sandboxService — Container sandbox management for Canvas App
 * Create, fork, exec, and manage isolated container environments
 */
const API_BASE = '/api/sandbox';

export interface SandboxConfig {
  files: Record<string, string>;
  template?: 'react' | 'vue' | 'vanilla' | 'node';
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  entry?: string;
}

export interface Sandbox {
  id: string;
  url: string;
  previewUrl: string;
  editorUrl: string;
  createdAt: string;
  status: 'creating' | 'ready' | 'running' | 'stopped' | 'destroyed' | 'error';
}

export const sandboxService = {
  /** Create sandbox from config object */
  async createFromConfig(config: SandboxConfig): Promise<Sandbox> {
    const res = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Failed to create sandbox: ${res.statusText}`);
    return res.json();
  },

  /** Create sandbox for a project */
  async create(projectId: string, template = 'vite-react'): Promise<any> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ projectId, template }),
    });
    if (!res.ok) throw new Error('Failed to create sandbox');
    return res.json();
  },

  /** Destroy a sandbox */
  async destroy(sandboxId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${sandboxId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to destroy sandbox: ${res.statusText}`);
  },

  /** Execute command in sandbox */
  async exec(sandboxId: string, command: string): Promise<any> {
    const res = await fetch(`${API_BASE}/${sandboxId}/exec`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    if (!res.ok) throw new Error('Execution failed');
    return res.json();
  },

  /** Get sandbox status */
  async getStatus(sandboxId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/${sandboxId}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to get status');
    return res.json();
  },

  async fork(sandboxId: string): Promise<Sandbox> {
    const res = await fetch(`${API_BASE}/${sandboxId}/fork`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fork sandbox: ${res.statusText}`);
    return res.json();
  },

  async update(sandboxId: string, files: Record<string, string>): Promise<void> {
    const res = await fetch(`${API_BASE}/${sandboxId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ files }),
    });
    if (!res.ok) throw new Error(`Failed to update sandbox: ${res.statusText}`);
  },

  async list(): Promise<Sandbox[]> {
    const res = await fetch(API_BASE, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to list sandboxes: ${res.statusText}`);
    return res.json();
  },

  /** Generate an embeddable preview URL */
  getPreviewUrl(sandboxId: string): string {
    return `${API_BASE}/${sandboxId}/preview`;
  },
};

export default sandboxService;
