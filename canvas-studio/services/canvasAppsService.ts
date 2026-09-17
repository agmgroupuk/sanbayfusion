// Canvas Apps Database Service (Standalone Canvas Studio)
// Handles storing and retrieving user-generated apps from the database
// Source: 'standalone' — identifies this as standalone canvas-studio (requires subscription)
// All data is stored in the database — user must be logged in.

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
    language: dbApp.language || 'html',
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
  // Fetch all apps for the user
  async getApps(page = 1, limit = 50): Promise<GeneratedApp[]> {
    try {
      const response = await fetch(`${API_BASE}?source=${SOURCE}&page=${page}&limit=${limit}`, {
        credentials: 'include',
        headers: { 'X-Canvas-Source': SOURCE },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch apps (${response.status})`);
      }

      const data: ApiResponse<CanvasAppData> = await response.json();

      if (data.success && data.apps) {
        return data.apps.map(toGeneratedApp);
      }

      return [];
    } catch (error) {
      console.error('[CanvasApps] Fetch error:', error);
      return [];
    }
  },

  // Save a new app
  async saveApp(app: GeneratedApp): Promise<GeneratedApp | null> {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: HEADERS,
        credentials: 'include',
        body: JSON.stringify({ ...toDbFormat(app), source: SOURCE }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save app (${response.status})`);
      }

      const data: ApiResponse<CanvasAppData> = await response.json();

      if (data.success && data.app) {
        return toGeneratedApp(data.app);
      }

      return null;
    } catch (error) {
      console.error('[CanvasApps] Save error:', error);
      return null;
    }
  },

  // Update an existing app
  async updateApp(id: string, updates: Partial<GeneratedApp>): Promise<GeneratedApp | null> {
    try {
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
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update app (${response.status})`);
      }

      const data: ApiResponse<CanvasAppData> = await response.json();

      if (data.success && data.app) {
        return toGeneratedApp(data.app);
      }

      return null;
    } catch (error) {
      console.error('[CanvasApps] Update error:', error);
      return null;
    }
  },

  // Delete an app
  async deleteApp(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Canvas-Source': SOURCE },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete app (${response.status})`);
      }

      return true;
    } catch (error) {
      console.error('[CanvasApps] Delete error:', error);
      return false;
    }
  },

  // Delete all apps
  async clearAll(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}?source=${SOURCE}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Canvas-Source': SOURCE },
      });

      return response.ok;
    } catch (error) {
      console.error('[CanvasApps] Clear error:', error);
      return false;
    }
  },
};

export default canvasAppsService;
