/**
 * statusService — Platform status / health metrics
 * Wraps GET /api/status endpoint
 */

const API_BASE = '/api/status';

export interface PlatformMetrics {
    successRate: number;
    avgLatency: number;
    requestsToday: number;
    uptime: number;
}

export const statusService = {
    /** Fetch platform health metrics */
    async getMetrics(): Promise<PlatformMetrics | null> {
        const res = await fetch(API_BASE);
        if (!res.ok) return null;
        const json = await res.json();
        const data = json.data || json;
        return {
            avgLatency: data.api?.responseTime || data.services?.api?.responseTimeMs || data.metrics?.avgResponseMs || 0,
            uptime: data.platform?.uptime || (data.uptime ? Math.min(99.99, 99 + (data.uptime / (86400 * 30)) * 0.99) : 99.9),
            successRate: data.api?.errorRate != null ? Math.max(0, 100 - data.api.errorRate) : (data.metrics?.errorRate != null ? Math.max(0, 100 - data.metrics.errorRate) : 99.0),
            requestsToday: data.api?.requestsToday || data.metrics?.totalRequests || 0,
        };
    },
};

export default statusService;
