import { fetchWithCredentials } from '../fetchUtil';
import { EDITOR_API_BASE } from './apiConfig';
/**
 * Files API Service
 * Handles communication with the backend for file operations
 */

const API_URL = `${EDITOR_API_BASE}/v1`;

export interface FileDto {
  id?: string;
  projectId: string;
  path: string;
  name: string;
  content?: string;
  type?: 'FILE' | 'FOLDER';
  language?: string;
}

export interface ProjectDto {
  id?: string;
  name: string;
  description?: string;
  template?: string;
  path?: string; // Server-side filesystem path
}

class FilesApiService {
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  // ==================== Projects ====================

  async createProject(data: { name: string; description?: string; template?: string }): Promise<ProjectDto> {
    const response = await fetchWithCredentials(`${API_URL}/projects`, {
      method: 'POST',
      credentials: 'include',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create project: ${response.statusText}`);
    }

    return response.json();
  }

  async getProject(projectId: string): Promise<ProjectDto & { files: FileDto[] }> {
    const response = await fetchWithCredentials(`${API_URL}/projects/${projectId}`, {
      credentials: 'include',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get project: ${response.statusText}`);
    }

    return response.json();
  }

  async listProjects(): Promise<ProjectDto[]> {
    const response = await fetchWithCredentials(`${API_URL}/projects`, {
      credentials: 'include',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to list projects: ${response.statusText}`);
    }

    return response.json();
  }

  // ==================== Files ====================

  async createFile(data: FileDto): Promise<FileDto> {
    const response = await fetchWithCredentials(`${API_URL}/files`, {
      method: 'POST',
      credentials: 'include',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create file: ${response.statusText}`);
    }

    return response.json();
  }

  async updateFile(fileId: string, content: string): Promise<FileDto> {
    const response = await fetchWithCredentials(`${API_URL}/files/${fileId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update file: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteFile(fileId: string): Promise<void> {
    const response = await fetchWithCredentials(`${API_URL}/files/${fileId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }

  async getProjectFiles(projectId: string): Promise<FileDto[]> {
    const response = await fetchWithCredentials(`${API_URL}/files/project/${projectId}`, {
      credentials: 'include',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get project files: ${response.statusText}`);
    }

    return response.json();
  }

  // ==================== Sync Operations ====================

  /**
   * Sync files FROM the server filesystem TO the database, then return them
   * This picks up files created via terminal
   */
  async syncProjectFromDisk(projectId: string): Promise<ProjectDto & { files: FileDto[] }> {
    const response = await fetchWithCredentials(`${API_URL}/projects/${projectId}/sync`, {
      method: 'POST',
      credentials: 'include',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync project: ${response.statusText}`);
    }

    const data = await response.json();
    return data.project || data;
  }

  /**
   * Sync files to the server - creates files that don't exist, updates those that do
   */
  async syncProjectFiles(projectId: string, files: FileDto[]): Promise<void> {
    const existingFiles = await this.getProjectFiles(projectId);
    const existingPaths = new Set(existingFiles.map(f => f.path));

    for (const file of files) {
      if (existingPaths.has(file.path)) {
        // Update existing file
        const existing = existingFiles.find(f => f.path === file.path);
        if (existing?.id && file.content !== existing.content) {
          await this.updateFile(existing.id, file.content || '');
        }
      } else {
        // Create new file
        await this.createFile({
          ...file,
          projectId,
        });
      }
    }
  }
}

export const filesApiService = new FilesApiService();
