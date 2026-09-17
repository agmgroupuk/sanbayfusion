/**
 * Extension Service - Frontend client for Extension Marketplace
 * Uses REST API from the editor backend at /api/extensions
 */

import { fetchWithCredentials } from '../fetchUtil';
import { EDITOR_API_BASE } from './apiConfig';

// Types
export interface MarketplaceExtension {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: string;
  downloads: number;
  rating: number;
  verified: boolean;
  tags: string[];
  permissions: string[];
  config?: Record<string, any>;
  main?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstalledExtension extends MarketplaceExtension {
  enabled: boolean;
  installedAt: string;
  projectEnabled?: Record<string, boolean>;
}

export type ExtensionCategory = 
  | 'all'
  | 'AI'
  | 'Formatters'
  | 'Linters'
  | 'Languages'
  | 'Themes'
  | 'Tools'
  | 'SCM'
  | 'API'
  | 'Visual'
  | 'Other';

// Extension Marketplace Client — fully DB-backed via /api/editor/extensions
class ExtensionMarketplaceService {
  private installedExtensions = new Map<string, InstalledExtension>();
  private listeners = new Map<string, Set<Function>>();
  private _connected = false;
  private _hydrated = false;
  private _hydratePromise: Promise<void> | null = null;

  constructor() {
    // No localStorage. State hydrates from DB on first connect()/getInstalled()-aware call.
  }

  private async hydrateFromServer(): Promise<void> {
    if (this._hydrated) return;
    if (this._hydratePromise) return this._hydratePromise;
    this._hydratePromise = (async () => {
      try {
        const res = await fetchWithCredentials(`${EDITOR_API_BASE}/editor/extensions`);
        if (!res.ok) return;
        const data = await res.json();
        this.installedExtensions.clear();
        for (const row of (data.extensions || [])) {
          const manifest = row.manifest || {};
          const installed: InstalledExtension = {
            ...(manifest as MarketplaceExtension),
            id: row.extensionId,
            enabled: row.enabled !== false,
            installedAt: row.installedAt,
            projectEnabled: (row.settings && row.settings.projectEnabled) || undefined,
          };
          this.installedExtensions.set(row.extensionId, installed);
        }
        this._hydrated = true;
      } finally {
        this._hydratePromise = null;
      }
    })();
    return this._hydratePromise;
  }

  // Connect: hydrate installed extensions from DB and verify marketplace endpoint
  async connect(_userId?: string): Promise<void> {
    try {
      await this.hydrateFromServer();
      const res = await fetchWithCredentials(`${EDITOR_API_BASE}/extensions?limit=1`);
      if (res.ok) this._connected = true;
    } catch {
      this._connected = false;
    }
  }

  disconnect(): void { this._connected = false; }
  isConnected(): boolean { return this._connected; }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }
  off(event: string, callback: Function): void { this.listeners.get(event)?.delete(callback); }
  private emit(event: string, data: any): void { this.listeners.get(event)?.forEach(cb => cb(data)); }

  // Get marketplace extensions via REST API
  async getMarketplace(options?: {
    category?: ExtensionCategory;
    search?: string;
    sort?: 'downloads' | 'rating' | 'name';
  }): Promise<MarketplaceExtension[]> {
    try {
      const params = new URLSearchParams();
      if (options?.category && options.category !== 'all') params.set('category', options.category);
      if (options?.search) params.set('search', options.search);
      if (options?.sort) params.set('sort', options.sort);

      const res = await fetchWithCredentials(`${EDITOR_API_BASE}/extensions?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.extensions || [];
    } catch {
      return [];
    }
  }

  // Get extension details
  async getExtension(extensionId: string): Promise<MarketplaceExtension | null> {
    try {
      const res = await fetchWithCredentials(`${EDITOR_API_BASE}/extensions/${encodeURIComponent(extensionId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.extension || null;
    } catch {
      return null;
    }
  }

  // Install extension — persisted in DB
  async install(extensionId: string): Promise<void> {
    const ext = await this.getExtension(extensionId);
    if (!ext) throw new Error('Extension not found');
    const res = await fetchWithCredentials(`${EDITOR_API_BASE}/editor/extensions/${encodeURIComponent(extensionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: ext, enabled: true, settings: {} }),
    });
    if (!res.ok) throw new Error(`Install failed (${res.status})`);
    const installed: InstalledExtension = { ...ext, enabled: true, installedAt: new Date().toISOString() };
    this.installedExtensions.set(extensionId, installed);
    this.emit('installed', installed);
  }

  // Uninstall extension
  async uninstall(extensionId: string): Promise<void> {
    const res = await fetchWithCredentials(`${EDITOR_API_BASE}/editor/extensions/${encodeURIComponent(extensionId)}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) throw new Error(`Uninstall failed (${res.status})`);
    this.installedExtensions.delete(extensionId);
    this.emit('uninstalled', extensionId);
  }

  async toggle(extensionId: string): Promise<boolean> {
    const ext = this.installedExtensions.get(extensionId);
    if (!ext) return false;
    const nextEnabled = !ext.enabled;
    const res = await fetchWithCredentials(`${EDITOR_API_BASE}/editor/extensions/${encodeURIComponent(extensionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextEnabled }),
    });
    if (!res.ok) throw new Error(`Toggle failed (${res.status})`);
    ext.enabled = nextEnabled;
    this.emit('toggled', { extensionId, enabled: nextEnabled });
    return nextEnabled;
  }

  async toggleForProject(extensionId: string, projectId: string): Promise<boolean> {
    const ext = this.installedExtensions.get(extensionId);
    if (!ext) return false;
    if (!ext.projectEnabled) ext.projectEnabled = {};
    const next = !ext.projectEnabled[projectId];
    ext.projectEnabled[projectId] = next;
    const res = await fetchWithCredentials(`${EDITOR_API_BASE}/editor/extensions/${encodeURIComponent(extensionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { projectEnabled: ext.projectEnabled } }),
    });
    if (!res.ok) throw new Error(`Toggle for project failed (${res.status})`);
    return next;
  }

  execute(_extensionId: string): void {
    // Extensions execute client-side; no socket needed
  }

  async getRecommendations(_projectType: string): Promise<MarketplaceExtension[]> {
    // Return top-rated extensions as recommendations
    return this.getMarketplace({ sort: 'rating' });
  }

  getInstalled(): InstalledExtension[] { return Array.from(this.installedExtensions.values()); }
  isInstalled(extensionId: string): boolean { return this.installedExtensions.has(extensionId); }
  isEnabled(extensionId: string): boolean { return this.installedExtensions.get(extensionId)?.enabled === true; }
}

// Singleton instance
export const extensionMarketplace = new ExtensionMarketplaceService();

// React hook for extensions
import { useState, useEffect, useCallback } from 'react';

export function useExtensionMarketplace() {
  const [connected, setConnected] = useState(false);
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>([]);
  const [installed, setInstalled] = useState<InstalledExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await extensionMarketplace.connect();
        setConnected(true);
        const marketplace = await extensionMarketplace.getMarketplace();
        setExtensions(marketplace);
        setInstalled(extensionMarketplace.getInstalled());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();

    extensionMarketplace.on('installed', () => setInstalled(extensionMarketplace.getInstalled()));
    extensionMarketplace.on('uninstalled', () => setInstalled(extensionMarketplace.getInstalled()));
    extensionMarketplace.on('error', (err: string) => setError(err));

    return () => {};
  }, []);

  const install = useCallback(async (extensionId: string) => {
    try { await extensionMarketplace.install(extensionId); } catch (err: any) { setError(err.message); }
  }, []);

  const uninstall = useCallback(async (extensionId: string) => {
    await extensionMarketplace.uninstall(extensionId);
    setInstalled(extensionMarketplace.getInstalled());
  }, []);

  const toggle = useCallback(async (extensionId: string) => {
    try { await extensionMarketplace.toggle(extensionId); } catch (err: any) { setError(err.message); }
    setInstalled(extensionMarketplace.getInstalled());
  }, []);

  const search = useCallback(async (query: string, category?: ExtensionCategory) => {
    setLoading(true);
    const results = await extensionMarketplace.getMarketplace({ search: query, category });
    setExtensions(results);
    setLoading(false);
  }, []);

  const getRecommendations = useCallback(async (projectType: string) => {
    return extensionMarketplace.getRecommendations(projectType);
  }, []);

  return {
    connected, extensions, installed, loading, error,
    install, uninstall, toggle, search, getRecommendations,
    isInstalled: (id: string) => extensionMarketplace.isInstalled(id),
    isEnabled: (id: string) => extensionMarketplace.isEnabled(id),
  };
}

export default extensionMarketplace;
