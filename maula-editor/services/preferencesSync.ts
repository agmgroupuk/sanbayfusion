/**
 * Preferences Sync — DB-backed hydration & persistence for Maula Editor.
 * Replaces all localStorage usage. Single source of truth: Postgres via /api/editor/*.
 *
 * Usage:
 *   - Call `usePreferencesSync()` once in App.tsx (after auth).
 *   - On mount: hydrates store from DB.
 *   - On store change: debounced 600ms PUT to /api/editor/preferences.
 */

import { useEffect, useRef } from 'react';
import { fetchWithCredentials } from '../fetchUtil';
import { EDITOR_API_BASE } from './apiConfig';
import { useStore } from '../store/useStore';
import type { Theme, AIConfig, EditorSettings, RecentProject, Workspace, Extension } from '../types';

interface ServerPreferences {
  theme?: string;
  aiConfig?: AIConfig;
  editorSettings?: EditorSettings;
  recentProjects?: RecentProject[];
  activeWorkspaceId?: string | null;
  uiState?: Record<string, unknown>;
}

let _hydrated = false;
let _lastPushedHash = '';
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function hashPrefs(p: Partial<ServerPreferences>): string {
  try { return JSON.stringify(p); } catch { return Math.random().toString(36); }
}

async function fetchPreferences(): Promise<ServerPreferences | null> {
  try {
    const res = await fetchWithCredentials(`${EDITOR_API_BASE}/editor/preferences`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.preferences || null;
  } catch {
    return null;
  }
}

async function fetchExtensions(): Promise<Extension[]> {
  try {
    const res = await fetchWithCredentials(`${EDITOR_API_BASE}/editor/extensions`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.extensions || []).map((row: any) => ({
      ...(row.manifest || {}),
      id: row.extensionId,
      enabled: row.enabled !== false,
    })) as Extension[];
  } catch {
    return [];
  }
}

async function fetchWorkspaces(): Promise<Workspace[]> {
  try {
    const res = await fetchWithCredentials(`${EDITOR_API_BASE}/editor/workspaces`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.workspaces || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      description: w.description || '',
      projectIds: Array.isArray(w.projectIds) ? w.projectIds : [],
      settings: w.settings || {},
      isActive: !!w.isActive,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    })) as Workspace[];
  } catch {
    return [];
  }
}

async function fetchProjects(): Promise<any[]> {
  try {
    const res = await fetchWithCredentials(`${EDITOR_API_BASE}/project?sourceApp=maula-editor`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.projects || [];
  } catch {
    return [];
  }
}

async function pushPreferences(prefs: ServerPreferences): Promise<void> {
  const body = JSON.stringify(prefs);
  const hash = hashPrefs(prefs);
  if (hash === _lastPushedHash) return;
  _lastPushedHash = hash;
  try {
    await fetchWithCredentials(`${EDITOR_API_BASE}/editor/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch {
    // Reset hash so a retry can happen on next change
    _lastPushedHash = '';
  }
}

async function pushExtensions(extensions: Extension[]): Promise<void> {
  try {
    await fetchWithCredentials(`${EDITOR_API_BASE}/editor/extensions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extensions: extensions.map((e) => ({
          id: e.id,
          manifest: e,
          enabled: e.enabled !== false,
        })),
      }),
    });
  } catch {
    // swallow — next change retries
  }
}

/**
 * React hook: hydrate store from DB on mount, then debounced-save on change.
 * Mount once near root, after auth is confirmed.
 */
export function usePreferencesSync(authReady: boolean) {
  const lastExtensionsRef = useRef<string>('');

  useEffect(() => {
    if (!authReady || _hydrated) return;
    let cancelled = false;
    (async () => {
      const [prefs, exts, wks, projects] = await Promise.all([
        fetchPreferences(),
        fetchExtensions(),
        fetchWorkspaces(),
        fetchProjects(),
      ]);
      if (cancelled) return;

      const state = useStore.getState();
      const patch: Partial<ReturnType<typeof useStore.getState>> = {};

      if (prefs) {
        if (prefs.theme) patch.theme = prefs.theme as Theme;
        if (prefs.aiConfig && Object.keys(prefs.aiConfig).length) patch.aiConfig = { ...state.aiConfig, ...prefs.aiConfig };
        if (prefs.editorSettings && Object.keys(prefs.editorSettings).length) {
          patch.editorSettings = { ...state.editorSettings, ...prefs.editorSettings };
        }
        if (Array.isArray(prefs.recentProjects)) patch.recentProjects = prefs.recentProjects;
        if (prefs.activeWorkspaceId !== undefined) patch.activeWorkspaceId = prefs.activeWorkspaceId;
      }

      // Merge extensions: keep built-in defaults, overlay DB-stored enabled state + user-installed extras
      if (exts.length) {
        const byId = new Map<string, Extension>();
        for (const e of state.extensions) byId.set(e.id, e);
        for (const e of exts) byId.set(e.id, { ...byId.get(e.id), ...e });
        patch.extensions = Array.from(byId.values());
      }

      if (wks.length) patch.workspaces = wks;
      if (projects.length) patch.projects = projects as any;

      useStore.setState(patch);
      _hydrated = true;
      // Capture initial pushed hash so we don't immediately re-PUT
      _lastPushedHash = hashPrefs({
        theme: useStore.getState().theme,
        aiConfig: useStore.getState().aiConfig,
        editorSettings: useStore.getState().editorSettings,
        recentProjects: useStore.getState().recentProjects,
        activeWorkspaceId: useStore.getState().activeWorkspaceId,
      });
      lastExtensionsRef.current = JSON.stringify(useStore.getState().extensions);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  // Subscribe to store changes; debounced push
  useEffect(() => {
    if (!authReady) return;
    const unsub = useStore.subscribe((state, prev) => {
      if (!_hydrated) return;

      const prefsChanged =
        state.theme !== prev.theme ||
        state.aiConfig !== prev.aiConfig ||
        state.editorSettings !== prev.editorSettings ||
        state.recentProjects !== prev.recentProjects ||
        state.activeWorkspaceId !== prev.activeWorkspaceId;

      const extensionsChanged = state.extensions !== prev.extensions;

      if (prefsChanged) {
        if (_saveTimer) clearTimeout(_saveTimer);
        _saveTimer = setTimeout(() => {
          pushPreferences({
            theme: state.theme,
            aiConfig: state.aiConfig,
            editorSettings: state.editorSettings,
            recentProjects: state.recentProjects,
            activeWorkspaceId: state.activeWorkspaceId ?? null,
          });
        }, 600);
      }

      if (extensionsChanged) {
        const serialized = JSON.stringify(state.extensions);
        if (serialized !== lastExtensionsRef.current) {
          lastExtensionsRef.current = serialized;
          pushExtensions(state.extensions);
        }
      }
    });
    return () => unsub();
  }, [authReady]);
}

export function _resetPreferencesSyncForTests() {
  _hydrated = false;
  _lastPushedHash = '';
  if (_saveTimer) clearTimeout(_saveTimer);
}
