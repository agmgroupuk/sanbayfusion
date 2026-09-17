/**
 * gitService — API-backed Git version control for canvas projects
 * All commits/branches/stash/tags persist to PostgreSQL via backend
 * Staging & change detection remain client-side (working-tree state)
 */

const API = '/api/git';

// ── Types ──────────────────────────────────────────────────────────

export interface GitCommitData {
  id: string;
  branch: string;
  hash: string;
  message: string;
  author: string;
  files: string[];
  stats: { additions: number; deletions: number };
  isMerge: boolean;
  createdAt: string;
}

export interface GitBranchData {
  id: string;
  name: string;
  isActive: boolean;
  headCommitId: string | null;
  createdAt: string;
}

export interface GitStashData {
  id: string;
  message: string;
  branch: string;
  createdAt: string;
}

export interface GitTagData {
  id: string;
  name: string;
  commitId: string;
  message: string | null;
  createdAt: string;
}

export interface GitInitResponse {
  branch: string;
  commits: GitCommitData[];
  branches: GitBranchData[];
  stashes: GitStashData[];
  tags: GitTagData[];
  lastSnapshot: Record<string, string>;
  alreadyInitialized: boolean;
}

export interface ChangeFile {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  staged: boolean;
  originalContent?: string;
  currentContent?: string;
}

// ── API helper ─────────────────────────────────────────────────────

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Git API error');
  return json.data;
}

// ── Service ────────────────────────────────────────────────────────

export const gitService = {
  // ── Init & Core ──

  async init(
    projectId: string,
    snapshot: Record<string, string>,
    author?: string,
  ): Promise<GitInitResponse> {
    return api(`/${projectId}/init`, {
      method: 'POST',
      body: JSON.stringify({ snapshot, author }),
    });
  },

  async commit(
    projectId: string,
    message: string,
    snapshot: Record<string, string>,
    changedFiles: string[],
    branch: string,
    author?: string,
  ): Promise<GitCommitData> {
    return api(`/${projectId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ message, snapshot, changedFiles, branch, author }),
    });
  },

  async getHistory(
    projectId: string,
    branch?: string,
    search?: string,
    limit = 50,
    offset = 0,
  ): Promise<{ commits: GitCommitData[]; total: number; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (branch) params.set('branch', branch);
    if (search) params.set('search', search);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return api(`/${projectId}/history?${params}`);
  },

  async restore(
    projectId: string,
    commitId: string,
  ): Promise<{ snapshot: Record<string, string>; commit: GitCommitData }> {
    return api(`/${projectId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ commitId }),
    });
  },

  async amend(
    projectId: string,
    message?: string,
    snapshot?: Record<string, string>,
    changedFiles?: string[],
    branch?: string,
  ): Promise<GitCommitData> {
    return api(`/${projectId}/amend`, {
      method: 'POST',
      body: JSON.stringify({ message, snapshot, changedFiles, branch }),
    });
  },

  // ── Branches ──

  async getBranches(projectId: string): Promise<GitBranchData[]> {
    return api(`/${projectId}/branches`);
  },

  async createBranch(projectId: string, name: string): Promise<GitBranchData> {
    return api(`/${projectId}/branches`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async switchBranch(
    projectId: string,
    name: string,
  ): Promise<{ snapshot: Record<string, string>; commits: GitCommitData[]; branch: string }> {
    return api(`/${projectId}/branches/switch`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteBranch(projectId: string, name: string): Promise<void> {
    await api(`/${projectId}/branches/${encodeURIComponent(name)}`, { method: 'DELETE' });
  },

  async mergeBranch(
    projectId: string,
    sourceBranch: string,
  ): Promise<{ commit: GitCommitData; snapshot: Record<string, string> }> {
    return api(`/${projectId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ sourceBranch }),
    });
  },

  // ── Stash ──

  async saveStash(
    projectId: string,
    snapshot: Record<string, string>,
    message?: string,
    branch?: string,
  ): Promise<GitStashData> {
    return api(`/${projectId}/stash`, {
      method: 'POST',
      body: JSON.stringify({ snapshot, message, branch }),
    });
  },

  async getStashes(projectId: string): Promise<GitStashData[]> {
    return api(`/${projectId}/stashes`);
  },

  async popStash(
    projectId: string,
  ): Promise<{ snapshot: Record<string, string> }> {
    return api(`/${projectId}/stash/pop`, { method: 'POST' });
  },

  async dropStash(projectId: string, stashId: string): Promise<void> {
    await api(`/${projectId}/stash/${stashId}`, { method: 'DELETE' });
  },

  // ── Tags ──

  async createTag(
    projectId: string,
    name: string,
    commitId: string,
    message?: string,
  ): Promise<GitTagData> {
    return api(`/${projectId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name, commitId, message }),
    });
  },

  async getTags(projectId: string): Promise<GitTagData[]> {
    return api(`/${projectId}/tags`);
  },

  async deleteTag(projectId: string, name: string): Promise<void> {
    await api(`/${projectId}/tags/${encodeURIComponent(name)}`, { method: 'DELETE' });
  },

  // ── Diff ──

  async getCommitDiff(
    projectId: string,
    commitId: string,
  ): Promise<{
    current: Record<string, string>;
    parent: Record<string, string>;
    commit: GitCommitData;
  }> {
    return api(`/${projectId}/diff/${commitId}`);
  },

  // ── Local utilities (no API) ──

  detectChanges(
    currentFiles: Record<string, string>,
    lastSnapshot: Record<string, string>,
  ): ChangeFile[] {
    const changes: ChangeFile[] = [];

    for (const [path, content] of Object.entries(lastSnapshot)) {
      if (!(path in currentFiles)) {
        changes.push({ path, status: 'deleted', staged: false, originalContent: content });
      } else if (currentFiles[path] !== content) {
        changes.push({
          path, status: 'modified', staged: false,
          originalContent: content, currentContent: currentFiles[path],
        });
      }
    }

    for (const path of Object.keys(currentFiles)) {
      if (!(path in lastSnapshot)) {
        changes.push({ path, status: 'added', staged: false, currentContent: currentFiles[path] });
      }
    }

    return changes;
  },

  // ── GitHub Push ──

  async pushToGitHub(
    projectId: string,
    token: string,
    repo: string,
    branch: string,
    message: string,
  ): Promise<{ sha: string; shortSha: string; repo: string; branch: string; commitUrl: string; fileCount: number }> {
    return api(`/${projectId}/push`, {
      method: 'POST',
      body: JSON.stringify({ token, repo, branch, message }),
    });
  },

  async saveRemote(
    projectId: string,
    repo: string,
    branch: string,
    tokenHint: string,
  ): Promise<{ repo: string; branch: string }> {
    return api(`/${projectId}/remote`, {
      method: 'POST',
      body: JSON.stringify({ repo, branch, tokenHint }),
    });
  },

  async getRemote(
    projectId: string,
  ): Promise<{ repo: string; branch: string; tokenHint: string } | null> {
    return api(`/${projectId}/remote`);
  },
};

export default gitService;
