/**
 * CANVAS FILE MANAGER
 * Handles saving, loading, and managing canvas projects in the DATABASE (PostgreSQL via Prisma).
 * Fully source-scoped: standalone (GenCraft Pro) and embedded (Canvas Studio) use separate scopes.
 *
 * Migrated from filesystem JSON files to database for:
 *  - RDS backup protection
 *  - Indexing & queryability
 *  - Relations (User → CanvasProject cascade delete)
 *  - No data loss on disk crash
 */

import { prisma } from '../../lib/prisma.js';

class CanvasFileManager {
  constructor() {
    // No filesystem setup needed — everything is in the database now
  }

  /**
   * Save canvas project to database
   * @param {object} projectData - Project fields (name, description, code, thumbnail, tags, metadata, ...)
   * @param {string} userId
   * @param {string} source - 'standalone' | 'embedded'
   */
  async saveProject(projectData, userId = 'default', source = 'standalone') {
    try {
      const existingId = projectData.id;

      // If project already has an ID, try to upsert
      if (existingId) {
        const existing = await prisma.canvasProject.findFirst({
          where: { id: existingId, userId, source },
        });

        if (existing) {
          // Update existing project
          const updated = await prisma.canvasProject.update({
            where: { id: existingId },
            data: {
              name: projectData.name || existing.name,
              description: projectData.description ?? existing.description,
              code: projectData.code ?? existing.code,
              thumbnail: projectData.thumbnail ?? existing.thumbnail,
              tags: projectData.tags ?? existing.tags,
              metadata: projectData.metadata ?? existing.metadata,
              version: projectData.version || existing.version,
            },
          });

          console.log(`[CanvasFileManager] Updated project ${updated.id} for user ${userId}`);
          return { success: true, projectId: updated.id, savedAt: updated.updatedAt.toISOString() };
        }
      }

      // Create new project
      const project = await prisma.canvasProject.create({
        data: {
          userId,
          name: projectData.name || 'Untitled Project',
          description: projectData.description || '',
          code: projectData.code || '',
          thumbnail: projectData.thumbnail || null,
          tags: projectData.tags || [],
          metadata: projectData.metadata || {},
          source,
          version: projectData.version || '1.0',
        },
      });

      console.log(`[CanvasFileManager] Saved project ${project.id} for user ${userId}`);
      return { success: true, projectId: project.id, savedAt: project.createdAt.toISOString() };
    } catch (error) {
      console.error('[CanvasFileManager] Failed to save project:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load canvas project from database
   * @param {string} projectId
   * @param {string} userId
   * @param {string} source - 'standalone' | 'embedded'
   */
  async loadProject(projectId, userId = 'default', source = 'standalone') {
    try {
      const project = await prisma.canvasProject.findFirst({
        where: { id: projectId, userId, source },
      });

      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Return in the same shape the old JSON approach used
      return {
        success: true,
        project: {
          id: project.id,
          userId: project.userId,
          name: project.name,
          description: project.description || '',
          code: project.code || '',
          thumbnail: project.thumbnail || null,
          tags: project.tags || [],
          metadata: project.metadata || {},
          source: project.source,
          version: project.version,
          createdAt: project.createdAt.toISOString(),
          savedAt: project.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error(`[CanvasFileManager] Failed to load project ${projectId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List canvas projects for a user (with DB-level sort — no more readdir + parse)
   * @param {string} userId
   * @param {string} source - 'standalone' | 'embedded'
   */
  async listProjects(userId = 'default', source = 'standalone') {
    try {
      const projects = await prisma.canvasProject.findMany({
        where: { userId, source },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          thumbnail: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          thumbnail: p.thumbnail || null,
          tags: p.tags || [],
          createdAt: p.createdAt.toISOString(),
          savedAt: p.updatedAt.toISOString(),
        })),
      };
    } catch (error) {
      console.error('[CanvasFileManager] Failed to list projects:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete canvas project from database
   * @param {string} projectId
   * @param {string} userId
   * @param {string} source - 'standalone' | 'embedded'
   */
  async deleteProject(projectId, userId = 'default', source = 'standalone') {
    try {
      const existing = await prisma.canvasProject.findFirst({
        where: { id: projectId, userId, source },
      });

      if (!existing) {
        return { success: false, error: 'Project not found' };
      }

      await prisma.canvasProject.delete({ where: { id: projectId } });

      console.log(`[CanvasFileManager] Deleted project ${projectId} for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error(`[CanvasFileManager] Failed to delete project ${projectId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export canvas project as HTML string (generated in-memory, not written to disk)
   * @param {string} projectId
   * @param {string} userId
   * @param {string} format - 'html' | 'json'
   * @param {string} source - 'standalone' | 'embedded'
   */
  async exportProject(projectId, userId = 'default', format = 'html', source = 'standalone') {
    try {
      const loadResult = await this.loadProject(projectId, userId, source);
      if (!loadResult.success) return loadResult;

      const project = loadResult.project;

      let exportContent = '';
      let fileName = '';

      if (format === 'html') {
        exportContent = this.generateHTML(project);
        fileName = `${project.name || projectId}.html`;
      } else {
        exportContent = JSON.stringify(project, null, 2);
        fileName = `${project.name || projectId}.json`;
      }

      return { success: true, content: exportContent, fileName, format };
    } catch (error) {
      console.error(`[CanvasFileManager] Failed to export project ${projectId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML from canvas project
   */
  generateHTML(project) {
    const { code, name, description } = project;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name || 'Canvas Project'}</title>
    <meta name="description" content="${description || ''}">
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    </style>
</head>
<body>
    ${code || '<h1>Canvas Project</h1><p>No content generated yet.</p>'}
</body>
</html>`;
  }

  /**
   * Search canvas projects (now uses DB ILIKE — fast and indexed)
   * @param {string} query
   * @param {string} userId
   * @param {string} source - 'standalone' | 'embedded'
   */
  async searchProjects(query, userId = 'default', source = 'standalone') {
    try {
      const searchTerm = `%${query}%`;

      const projects = await prisma.canvasProject.findMany({
        where: {
          userId,
          source,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          thumbnail: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          thumbnail: p.thumbnail || null,
          tags: p.tags || [],
          createdAt: p.createdAt.toISOString(),
          savedAt: p.updatedAt.toISOString(),
        })),
      };
    } catch (error) {
      console.error('[CanvasFileManager] Failed to search projects:', error);
      return { success: false, error: error.message };
    }
  }
}

export default CanvasFileManager;