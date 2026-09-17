/**
 * SANDBOX STORAGE
 * Persistent volumes for sandbox containers
 * - Create/remove Docker volumes
 * - Track storage usage
 * - Cleanup orphaned volumes
 * - Volume names are derived from sandboxId (NO in-memory state)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const VOLUME_PREFIX = 'sandbox-vol-';
const MAX_VOLUME_SIZE = '5g'; // Max volume size

class SandboxStorage {
  constructor() {
    // No in-memory state — volume name is always derived from sandboxId
  }

  /**
   * Derive the Docker volume name for a sandbox
   */
  _volumeName(sandboxId) {
    return `${VOLUME_PREFIX}${sandboxId.slice(0, 12)}`;
  }

  /**
   * Create a persistent volume for a sandbox
   */
  async createVolume(sandboxId) {
    const volumeName = this._volumeName(sandboxId);

    try {
      await execAsync(`docker volume create --name ${volumeName} --opt o=size=${MAX_VOLUME_SIZE}`);
      console.log(`[SandboxStorage] Created volume ${volumeName}`);
      return volumeName;
    } catch (error) {
      // Fallback: create without size limit (not all drivers support it)
      try {
        await execAsync(`docker volume create --name ${volumeName}`);
        return volumeName;
      } catch (fallbackError) {
        console.error(`[SandboxStorage] Failed to create volume: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }

  /**
   * Remove a volume
   */
  async removeVolume(sandboxId) {
    const volumeName = this._volumeName(sandboxId);

    try {
      await execAsync(`docker volume rm -f ${volumeName}`);
      console.log(`[SandboxStorage] Removed volume ${volumeName}`);
      return true;
    } catch (error) {
      console.warn(`[SandboxStorage] Could not remove volume ${volumeName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get volume size usage
   */
  async getVolumeSize(sandboxId) {
    const volumeName = this._volumeName(sandboxId);

    try {
      const { stdout } = await execAsync(
        `docker system df -v --format "{{json .Volumes}}" | grep ${volumeName}`
      );
      const match = stdout.match(/(\d+(\.\d+)?)(kB|MB|GB)/i);
      if (match) {
        const size = parseFloat(match[1]);
        const unit = match[3].toUpperCase();
        const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824 };
        return Math.round(size * (multipliers[unit] || 1));
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * List all sandbox volumes
   */
  async listVolumes() {
    try {
      const { stdout } = await execAsync(
        `docker volume ls --filter name=${VOLUME_PREFIX} --format "{{.Name}} {{.Driver}} {{.Mountpoint}}"`
      );

      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [name, driver, mountpoint] = line.split(' ');
          const sandboxId = name.replace(VOLUME_PREFIX, '');
          return { name, driver, mountpoint, sandboxId };
        });
    } catch {
      return [];
    }
  }

  /**
   * Cleanup orphaned volumes (volumes without running containers)
   */
  async cleanupOrphaned() {
    try {
      const volumes = await this.listVolumes();
      let cleaned = 0;

      for (const vol of volumes) {
        try {
          const { stdout } = await execAsync(
            `docker ps --filter volume=${vol.name} --format "{{.ID}}"`
          );
          if (!stdout.trim()) {
            await execAsync(`docker volume rm ${vol.name}`);
            cleaned++;
          }
        } catch {
          // Ignore errors during cleanup
        }
      }

      if (cleaned > 0) {
        console.log(`[SandboxStorage] Cleaned up ${cleaned} orphaned volumes`);
      }
      return cleaned;
    } catch (error) {
      console.error(`[SandboxStorage] Cleanup error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get total storage used by all sandbox volumes
   */
  async getTotalStorageUsed() {
    try {
      const { stdout } = await execAsync(
        `docker system df --format "{{.Size}}" 2>/dev/null | tail -1`
      );
      return stdout.trim();
    } catch {
      return '0B';
    }
  }

  /**
   * Copy files from host to volume (via temp container)
   */
  async copyToVolume(sandboxId, sourcePath, destPath) {
    const volumeName = this._volumeName(sandboxId);

    try {
      // Use a temp alpine container to copy files into the volume
      await execAsync(
        `docker run --rm -v ${volumeName}:/vol -v ${sourcePath}:/src alpine cp -r /src/. /vol/${destPath || ''}`
      );
      return true;
    } catch (error) {
      console.error(`[SandboxStorage] Copy to volume failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Export volume contents to a tar archive
   */
  async exportVolume(sandboxId, outputPath) {
    const volumeName = this._volumeName(sandboxId);

    try {
      await execAsync(
        `docker run --rm -v ${volumeName}:/vol -v ${outputPath}:/backup alpine tar czf /backup/sandbox-${sandboxId.slice(0, 8)}.tar.gz -C /vol .`
      );
      return `${outputPath}/sandbox-${sandboxId.slice(0, 8)}.tar.gz`;
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }
}

export { SandboxStorage, VOLUME_PREFIX };
export default new SandboxStorage();
