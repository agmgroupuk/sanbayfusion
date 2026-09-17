/**
 * Canvas S3 Files Service for Universal Chat Canvas Studio (Standalone)
 * Handles syncing project files to S3 for persistent storage
 */

const API_BASE = '/api/canvas/files';
const SOURCE = 'standalone';

// Common headers for all requests — identifies this as standalone canvas-studio
const sourceHeaders = (): Record<string, string> => ({
  'X-Canvas-Source': SOURCE,
});

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

export interface SyncResult {
  success: boolean;
  projectId: string;
  saved: number;
  failed: number;
  errors?: string[];
}

export interface LoadResult {
  success: boolean;
  projectId: string;
  files: ProjectFile[];
  fileCount: number;
}

export interface StorageUsage {
  userId: string;
  fileCount: number;
  totalSize: number;
  formattedSize: string;
}

export const canvasS3FilesService = {
  /**
   * Sync all project files to S3
   */
  async syncFiles(projectId: string, files: ProjectFile[]): Promise<SyncResult> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sourceHeaders() },
        credentials: 'include',
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync files');
      }

      return await response.json();
    } catch (error) {
      console.error('[S3Files] Sync error:', error);
      return {
        success: false,
        projectId,
        saved: 0,
        failed: files.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  },

  /**
   * Load all project files from S3
   */
  async loadProject(projectId: string): Promise<LoadResult> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/load`, {
        headers: sourceHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load project');
      }

      return await response.json();
    } catch (error) {
      console.error('[S3Files] Load error:', error);
      return {
        success: false,
        projectId,
        files: [],
        fileCount: 0,
      };
    }
  },

  /**
   * Save a single file to S3
   */
  async saveFile(projectId: string, filePath: string, content: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sourceHeaders() },
        credentials: 'include',
        body: JSON.stringify({ path: filePath, content }),
      });

      return response.ok;
    } catch (error) {
      console.error('[S3Files] Save file error:', error);
      return false;
    }
  },

  /**
   * Load a single file from S3
   */
  async loadFile(projectId: string, filePath: string): Promise<string | null> {
    try {
      const encodedPath = encodeURIComponent(filePath);
      const response = await fetch(`${API_BASE}/${projectId}/file?path=${encodedPath}`, {
        headers: sourceHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.content || null;
    } catch (error) {
      console.error('[S3Files] Load file error:', error);
      return null;
    }
  },

  /**
   * Delete a file from S3
   */
  async deleteFile(projectId: string, filePath: string): Promise<boolean> {
    try {
      const encodedPath = encodeURIComponent(filePath);
      const response = await fetch(`${API_BASE}/${projectId}/file?path=${encodedPath}`, {
        method: 'DELETE',
        headers: sourceHeaders(),
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('[S3Files] Delete file error:', error);
      return false;
    }
  },

  /**
   * Delete entire project from S3
   */
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}`, {
        method: 'DELETE',
        headers: sourceHeaders(),
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('[S3Files] Delete project error:', error);
      return false;
    }
  },

  /**
   * Get signed URL for direct upload
   */
  async getUploadUrl(projectId: string, filePath: string, contentType: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sourceHeaders() },
        credentials: 'include',
        body: JSON.stringify({ filePath, contentType }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.uploadUrl || null;
    } catch (error) {
      console.error('[S3Files] Get upload URL error:', error);
      return null;
    }
  },

  /**
   * Get signed URL for direct download
   */
  async getDownloadUrl(projectId: string, filePath: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/download-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sourceHeaders() },
        credentials: 'include',
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.downloadUrl || null;
    } catch (error) {
      console.error('[S3Files] Get download URL error:', error);
      return null;
    }
  },

  /**
   * Copy file within S3
   */
  async copyFile(
    sourceProjectId: string,
    sourcePath: string,
    targetProjectId: string,
    targetPath: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/${sourceProjectId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sourceHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          sourcePath,
          targetProjectId,
          targetPath,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[S3Files] Copy file error:', error);
      return false;
    }
  },

  /**
   * Get user's storage usage
   */
  async getStorageUsage(): Promise<StorageUsage | null> {
    try {
      const response = await fetch(`${API_BASE}/storage/usage`, {
        headers: sourceHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[S3Files] Get storage usage error:', error);
      return null;
    }
  },
};

export default canvasS3FilesService;
