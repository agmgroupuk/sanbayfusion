/**
 * BUILD LOGGER
 * Stream build logs to frontend clients via Server-Sent Events (SSE)
 * Supports multiple concurrent build streams
 */

import { EventEmitter } from 'events';

class BuildLogger extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Support many concurrent listeners
    this.streams = new Map();  // buildId → Set of SSE response objects
    this.buildLogs = new Map(); // buildId → array of log entries (for late joiners)
  }

  /**
   * Emit a build event to all connected clients
   */
  emit(buildId, data) {
    const entry = {
      ...data,
      timestamp: Date.now(),
    };

    // Store in log buffer (keep last 500 entries per build)
    if (!this.buildLogs.has(buildId)) {
      this.buildLogs.set(buildId, []);
    }
    const logs = this.buildLogs.get(buildId);
    logs.push(entry);
    if (logs.length > 500) {
      logs.shift();
    }

    // Send to all connected SSE clients
    const clients = this.streams.get(buildId);
    if (clients) {
      const sseData = `data: ${JSON.stringify(entry)}\n\n`;
      for (const res of clients) {
        try {
          res.write(sseData);
        } catch {
          // Client disconnected — will be cleaned up
          clients.delete(res);
        }
      }
    }

    // Also emit on EventEmitter for internal listeners
    super.emit(`build:${buildId}`, entry);

    return true;
  }

  /**
   * Subscribe an SSE response to a build's log stream
   */
  subscribe(buildId, res) {
    if (!this.streams.has(buildId)) {
      this.streams.set(buildId, new Set());
    }
    this.streams.get(buildId).add(res);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send any existing logs (for late joiners)
    const existingLogs = this.buildLogs.get(buildId) || [];
    for (const entry of existingLogs) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    }

    // Send initial connected event
    res.write(`data: ${JSON.stringify({ type: 'connected', buildId })}\n\n`);

    // Cleanup on disconnect
    res.on('close', () => {
      const clients = this.streams.get(buildId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) {
          this.streams.delete(buildId);
        }
      }
    });
  }

  /**
   * Get stored logs for a build
   */
  getLogs(buildId, { from = 0, limit = 500 } = {}) {
    const logs = this.buildLogs.get(buildId) || [];
    return logs.slice(from, from + limit);
  }

  /**
   * Clear logs for a completed build
   */
  clearLogs(buildId) {
    this.buildLogs.delete(buildId);
    this.streams.delete(buildId);
  }

  /**
   * Get active stream count
   */
  getActiveStreamCount() {
    let count = 0;
    for (const clients of this.streams.values()) {
      count += clients.size;
    }
    return count;
  }

  /**
   * Send a heartbeat to all connected SSE clients (keep-alive)
   */
  startHeartbeat(intervalMs = 15000) {
    this.heartbeatInterval = setInterval(() => {
      for (const [buildId, clients] of this.streams) {
        for (const res of clients) {
          try {
            res.write(`: heartbeat\n\n`);
          } catch {
            clients.delete(res);
          }
        }
        // Remove empty streams
        if (clients.size === 0) {
          this.streams.delete(buildId);
        }
      }
    }, intervalMs);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Graceful shutdown — close all SSE connections
   */
  shutdown() {
    this.stopHeartbeat();
    for (const [, clients] of this.streams) {
      for (const res of clients) {
        try {
          res.write(`data: ${JSON.stringify({ type: 'shutdown' })}\n\n`);
          res.end();
        } catch {}
      }
    }
    this.streams.clear();
    this.buildLogs.clear();
  }
}

// Singleton
const buildLogger = new BuildLogger();
buildLogger.startHeartbeat();

export { BuildLogger };
export default buildLogger;
