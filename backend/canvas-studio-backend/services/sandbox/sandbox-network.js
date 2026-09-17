/**
 * SANDBOX NETWORK
 * Port allocation and network isolation for sandbox containers
 * - Dynamic port range: 4001-4999
 * - Docker network creation for inter-container isolation
 * - All port state is stored in PostgreSQL via Prisma (NO in-memory state)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../../lib/prisma.js';

const execAsync = promisify(exec);

const PORT_RANGE_START = 4001;
const PORT_RANGE_END = 4999;
const NETWORK_NAME = 'sandbox-net';

class SandboxNetwork {
  constructor() {
    this.networkReady = false;
  }

  /**
   * Initialize the Docker network for sandbox isolation
   */
  async initNetwork() {
    try {
      const { stdout } = await execAsync(`docker network ls --filter name=${NETWORK_NAME} --format "{{.Name}}"`);
      if (stdout.trim() === NETWORK_NAME) {
        this.networkReady = true;
        console.log(`[SandboxNetwork] Network '${NETWORK_NAME}' already exists`);
        return;
      }

      await execAsync(`docker network create --driver bridge --internal ${NETWORK_NAME}`);
      this.networkReady = true;
      console.log(`[SandboxNetwork] Created network '${NETWORK_NAME}'`);
    } catch (error) {
      console.warn(`[SandboxNetwork] Could not create network: ${error.message}`);
      this.networkReady = false;
    }
  }

  /**
   * Allocate an available port in the sandbox range
   * Reads allocated ports from the DATABASE, not in-memory
   */
  async allocatePort() {
    const usedPorts = await this._getUsedPortsFromDB();

    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
      if (usedPorts.has(port)) continue;

      // Check if port is actually free on the host
      const isFree = await this.isPortFree(port);
      if (isFree) {
        return port;
      }
    }
    throw new Error('No available ports in sandbox range');
  }

  /**
   * Release a port back to the pool
   * No-op: the DB is the source of truth — port is freed when sandbox status changes
   */
  releasePort(_port) {
    // Port lifecycle is managed entirely via the Sandbox DB record.
    // When a sandbox is stopped/destroyed, its port is no longer in the
    // active set returned by _getUsedPortsFromDB().
  }

  /**
   * Query the database for all ports currently in use by active sandboxes
   */
  async _getUsedPortsFromDB() {
    const activeSandboxes = await prisma.sandbox.findMany({
      where: {
        status: { in: ['creating', 'running'] },
        port: { not: null },
      },
      select: { port: true },
    });
    return new Set(activeSandboxes.map((s) => s.port));
  }

  /**
   * Check if a port is free on the host
   */
  async isPortFree(port) {
    return new Promise((resolve) => {
      import('net').then(({ default: net }) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
          server.close(() => resolve(true));
        });
        server.listen(port, '127.0.0.1');
      }).catch(() => resolve(false));
    });
  }

  /**
   * Get all currently allocated ports (from database)
   */
  async getAllocatedPorts() {
    const usedPorts = await this._getUsedPortsFromDB();
    return [...usedPorts];
  }

  /**
   * Get the count of available ports (from database)
   */
  async getAvailableCount() {
    const usedPorts = await this._getUsedPortsFromDB();
    return (PORT_RANGE_END - PORT_RANGE_START + 1) - usedPorts.size;
  }

  /**
   * Get network configuration for a container
   */
  getNetworkConfig() {
    return {
      networkName: this.networkReady ? NETWORK_NAME : 'bridge',
      isIsolated: this.networkReady,
    };
  }

  /**
   * Get network stats summary (for the /stats endpoint)
   */
  async getStats() {
    const allocatedPorts = await this.getAllocatedPorts();
    const availablePorts = await this.getAvailableCount();
    return {
      portRange: { start: PORT_RANGE_START, end: PORT_RANGE_END },
      allocatedPorts: allocatedPorts.length,
      availablePorts,
      network: this.getNetworkConfig(),
    };
  }

  /**
   * Remove the sandbox network (for cleanup)
   */
  async removeNetwork() {
    try {
      await execAsync(`docker network rm ${NETWORK_NAME}`);
      this.networkReady = false;
      console.log(`[SandboxNetwork] Removed network '${NETWORK_NAME}'`);
    } catch {
      // Network may not exist or containers still connected
    }
  }

  /**
   * Get network stats for a container
   */
  async getContainerNetworkStats(containerId) {
    try {
      const { stdout } = await execAsync(
        `docker stats ${containerId} --no-stream --format "{{.NetIO}}"`
      );
      const [rx, tx] = stdout.trim().split(' / ');
      return { rx, tx };
    } catch {
      return { rx: '0B', tx: '0B' };
    }
  }
}

export { SandboxNetwork, PORT_RANGE_START, PORT_RANGE_END };
export default new SandboxNetwork();
