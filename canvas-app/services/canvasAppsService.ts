// Canvas Apps Database Service
// 100% Database — NO localStorage. All data persisted via /api/canvas/apps
// Source: 'standalone' — identifies this as the standalone canvas-app (paywall)

import { GeneratedApp } from '../types';

const API_BASE = '/api/canvas/apps';
const SOURCE = 'standalone';
const HEADERS = { 'Content-Type': 'application/json', 'X-Canvas-Source': SOURCE };

interface ApiResponse<T> {
  success: boolean;
  error?: string;
  app?: T;
  apps?: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface CanvasAppData {
  id: string;
  name: string;
  prompt: string;
  code: string;
  language: string;
  provider?: string | null;
  modelId?: string | null;
  thumbnail?: string | null;
  history?: any[];
  isFavorite: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// Convert database app to frontend GeneratedApp format
function toGeneratedApp(dbApp: CanvasAppData): GeneratedApp {
  return {
    id: dbApp.id,
    name: dbApp.name,
    code: dbApp.code,
    prompt: dbApp.prompt,
    timestamp: new Date(dbApp.createdAt).getTime(),
    history: dbApp.history || [],
    language: dbApp.language as any,
    provider: dbApp.provider || undefined,
    modelId: dbApp.modelId || undefined,
  };
}

// Convert frontend GeneratedApp to database format
function toDbFormat(app: GeneratedApp): Partial<CanvasAppData> {
  return {
    name: app.name,
    prompt: app.prompt,
    code: app.code,
    language: app.language || 'html',
    provider: app.provider || null,
    modelId: app.modelId || null,
    history: app.history || [],
  };
}

export const canvasAppsService = {
  // Fetch all apps for the user (DB only)
  async getApps(page = 1, limit = 50): Promise<GeneratedApp[]> {
    const response = await fetch(`${API_BASE}?source=${SOURCE}&page=${page}&limit=${limit}`, {
      credentials: 'include',
      headers: { 'X-Canvas-Source': SOURCE },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch apps: ${response.status}`);
    }

    const data: ApiResponse<CanvasAppData> = await response.json();

    if (data.success && data.apps) {
      return data.apps.map(toGeneratedApp);
    }

    return [];
  },

  // Save a new app (DB only)
  async saveApp(app: GeneratedApp): Promise<GeneratedApp> {
    const dbData = toDbFormat(app);

    // Ensure required fields
    if (!dbData.name) dbData.name = 'Untitled';
    if (!dbData.code) dbData.code = '<!-- empty -->';

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: HEADERS,
      credentials: 'include',
      body: JSON.stringify({ ...dbData, source: SOURCE }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Failed to save app: ${response.status}`);
    }

    const data: ApiResponse<CanvasAppData> = await response.json();

    if (data.success && data.app) {
      return toGeneratedApp(data.app);
    }

    throw new Error('Save returned no app');
  },

  // Update an existing app (DB only). Falls back to create (upsert) on 404.
  async updateApp(id: string, updates: Partial<GeneratedApp>): Promise<GeneratedApp> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: HEADERS,
      credentials: 'include',
      body: JSON.stringify({
        name: updates.name,
        prompt: updates.prompt,
        code: updates.code,
        language: updates.language,
        history: updates.history,
        ...(updates.deployedUrl !== undefined && { deployedUrl: updates.deployedUrl }),
      }),
    });

    // App not in DB yet (local timestamp ID) — create it instead
    if (response.status === 404) {
      return this.saveApp(updates as GeneratedApp);
    }

    if (!response.ok) {
      throw new Error(`Failed to update app: ${response.status}`);
    }

    const data: ApiResponse<CanvasAppData> = await response.json();

    if (data.success && data.app) {
      return toGeneratedApp(data.app);
    }

    throw new Error('Update returned no app');
  },

  // Delete an app (DB only)
  async deleteApp(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-Canvas-Source': SOURCE },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete app: ${response.status}`);
    }

    return true;
  },

  // Delete all apps (DB only)
  async clearAll(): Promise<boolean> {
    const response = await fetch(`${API_BASE}?source=${SOURCE}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-Canvas-Source': SOURCE },
    });

    if (!response.ok) {
      throw new Error(`Failed to clear apps: ${response.status}`);
    }

    return true;
  },


};

export default canvasAppsService;
