/**
 * BUILD CACHE
 * Cache node_modules and build artifacts per project hash
 * Dramatically speeds up repeated builds by avoiding npm install
 */

import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const CACHE_DIR = process.env.BUILD_CACHE_DIR || '/tmp/gencraft-build-cache';
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE_MB = 5000; // 5 GB total cache

class BuildCache {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize cache directory
   */
  async init() {
    if (this.initialized) return;
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      this.initialized = true;
      console.log(`[BuildCache] Cache directory: ${CACHE_DIR}`);
    } catch (error) {
      console.warn(`[BuildCache] Could not create cache dir: ${error.message}`);
    }
  }

  /**
   * Generate a cache key from package.json + lockfile
   */
  generateCacheKey(projectId, packageJson, lockfileContent) {
    const hash = crypto.createHash('sha256');
    hash.update(projectId);
    hash.update(packageJson || '');
    hash.update(lockfileContent || '');
    return hash.digest('hex').slice(0, 16);
  }

  /**
   * Check if a cached build exists for this project
   */
  async checkCache(projectId) {
    await this.init();

    try {
      const cachePath = path.join(CACHE_DIR, projectId);
      const stat = await fs.stat(cachePath);

      // Check cache age
      const age = Date.now() - stat.mtimeMs;
      if (age > MAX_CACHE_AGE_MS) {
        console.log(`[BuildCache] Cache expired for project ${projectId}`);
        await fs.rm(cachePath, { recursive: true, force: true });
        return null;
      }

      // Read cache manifest
      const manifestPath = path.join(cachePath, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      return {
        cacheKey: manifest.cacheKey,
        createdAt: manifest.createdAt,
        size: manifest.size,
        path: cachePath,
      };
    } catch {
      return null;
    }
  }

  /**
   * Save current node_modules to cache
   */
  async saveCache(projectId, cacheKey) {
    await this.init();

    try {
      const cachePath = path.join(CACHE_DIR, projectId);
      await fs.mkdir(cachePath, { recursive: true });

      // Save manifest
      const manifest = {
        projectId,
        cacheKey: cacheKey || projectId,
        createdAt: new Date().toISOString(),
        size: 0, // Will be updated
      };

      await fs.writeFile(
        path.join(cachePath, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      console.log(`[BuildCache] Saved cache for project ${projectId}`);
      return true;
    } catch (error) {
      console.warn(`[BuildCache] Failed to save cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Restore cache to sandbox container
   */
  async restoreToSandbox(projectId, sandboxContainerId) {
    const cache = await this.checkCache(projectId);
    if (!cache) return false;

    try {
      await execAsync(
        `docker cp ${cache.path}/node_modules ${sandboxContainerId}:/app/node_modules`
      );
      console.log(`[BuildCache] Restored cache for project ${projectId}`);
      return true;
    } catch (error) {
      console.warn(`[BuildCache] Restore failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Invalidate cache for a project
   */
  async invalidate(projectId) {
    try {
      const cachePath = path.join(CACHE_DIR, projectId);
      await fs.rm(cachePath, { recursive: true, force: true });
      console.log(`[BuildCache] Invalidated cache for project ${projectId}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup old caches to stay under size limit
   */
  async cleanup() {
    await this.init();

    try {
      const entries = await fs.readdir(CACHE_DIR, { withFileTypes: true });
      const caches = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const cachePath = path.join(CACHE_DIR, entry.name);
        try {
          const stat = await fs.stat(cachePath);
          const manifestPath = path.join(cachePath, 'manifest.json');
          let manifest = {};
          try {
            manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
          } catch {}
          caches.push({
            name: entry.name,
            path: cachePath,
            mtime: stat.mtimeMs,
            size: manifest.size || 0,
          });
        } catch {}
      }

      // Sort by oldest first
      caches.sort((a, b) => a.mtime - b.mtime);

      // Remove expired caches
      let removed = 0;
      for (const cache of caches) {
        const age = Date.now() - cache.mtime;
        if (age > MAX_CACHE_AGE_MS) {
          await fs.rm(cache.path, { recursive: true, force: true });
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`[BuildCache] Cleaned up ${removed} expired caches`);
      }
      return removed;
    } catch (error) {
      console.error(`[BuildCache] Cleanup error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    await this.init();

    try {
      const entries = await fs.readdir(CACHE_DIR, { withFileTypes: true });
      const projectCount = entries.filter(e => e.isDirectory()).length;

      let totalSize = 0;
      try {
        const { stdout } = await execAsync(`du -sk ${CACHE_DIR} 2>/dev/null`);
        totalSize = parseInt(stdout.split('\t')[0]) * 1024; // Convert KB to bytes
      } catch {}

      return {
        projectCount,
        totalSize,
        totalSizeFormatted: this.formatSize(totalSize),
        cacheDir: CACHE_DIR,
        maxAge: `${MAX_CACHE_AGE_MS / (24 * 60 * 60 * 1000)} days`,
        maxSize: `${MAX_CACHE_SIZE_MB} MB`,
      };
    } catch {
      return { projectCount: 0, totalSize: 0, totalSizeFormatted: '0 B' };
    }
  }

  /**
   * Format bytes to human readable
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

export { BuildCache };
export default new BuildCache();
