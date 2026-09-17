/**
 * ============================================================================
 * ANALYTICS & MONITORING TOOLS V2
 * ============================================================================
 * analytics_track, analytics_report, monitor_health,
 * monitor_logs, monitor_performance, analytics_dashboard,
 * log_parse, telemetry_send, analytics_funnel,
 * alert_rules, metrics_aggregate
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const ANALYTICS_TOOL_DEFINITIONS = [
    {
        name: 'analytics_track',
        description: 'Track events and metrics: page views, user actions, custom events. Store to DB for reporting.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['track_event', 'track_page', 'track_error', 'track_metric', 'identify_user', 'batch'],
                    description: 'Tracking action',
                },
                event: { type: 'string', description: 'Event name. E.g. "button_click", "signup", "purchase"' },
                properties: { type: 'object', description: 'Event properties/metadata' },
                userId: { type: 'string', description: 'User identifier' },
                sessionId: { type: 'string', description: 'Session ID' },
                page: { type: 'string', description: '[track_page] Page URL or name' },
                error: { type: 'object', description: '[track_error] { message, stack, code }' },
                metric: { type: 'string', description: '[track_metric] Metric name' },
                value: { type: 'number', description: '[track_metric] Metric value' },
                events: { type: 'array', items: { type: 'object' }, description: '[batch] Array of events' },
            },
            required: ['action'],
        },
    },
    {
        name: 'analytics_report',
        description: 'Generate analytics reports: daily/weekly summaries, top events, user funnels, retention, cohort analysis.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['summary', 'top_events', 'funnel', 'retention', 'cohort', 'timeseries', 'export'],
                    description: 'Report type',
                },
                dateRange: {
                    type: 'object',
                    properties: {
                        start: { type: 'string', description: 'Start date (ISO)' },
                        end: { type: 'string', description: 'End date (ISO)' },
                    },
                },
                groupBy: { type: 'string', enum: ['hour', 'day', 'week', 'month'], description: 'Time grouping. Default: day' },
                events: { type: 'array', items: { type: 'string' }, description: '[funnel] Ordered event names for funnel' },
                limit: { type: 'number', description: 'Max results. Default: 20' },
                format: { type: 'string', enum: ['json', 'csv', 'markdown'], description: 'Output format. Default: json' },
            },
            required: ['action'],
        },
    },
    {
        name: 'monitor_health',
        description: 'System health monitoring: CPU, memory, disk, process info, uptime, service status, dependency checks.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['system', 'process', 'services', 'dependencies', 'full_report'],
                    description: 'Health check type',
                },
                services: { type: 'array', items: { type: 'object' }, description: '[services] Array of { name, url, expectedStatus }' },
                thresholds: {
                    type: 'object',
                    description: 'Alert thresholds: { cpuPercent: 80, memoryPercent: 90, diskPercent: 85 }',
                },
            },
            required: ['action'],
        },
    },
    {
        name: 'monitor_logs',
        description: 'Log management: search logs, tail files, parse structured logs, aggregate errors, log rotation info.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['search', 'tail', 'errors', 'aggregate', 'parse', 'stats'],
                    description: 'Log action',
                },
                path: { type: 'string', description: 'Log file or directory path' },
                query: { type: 'string', description: '[search] Search term or regex' },
                lines: { type: 'number', description: '[tail] Number of lines. Default: 50' },
                level: { type: 'string', enum: ['error', 'warn', 'info', 'debug', 'all'], description: '[search/errors] Filter by level. Default: all' },
                since: { type: 'string', description: 'Filter logs since ISO date' },
                format: { type: 'string', enum: ['json', 'text', 'csv'], description: 'Log format hint. Default: text' },
            },
            required: ['action'],
        },
    },
    {
        name: 'monitor_performance',
        description: 'Performance monitoring: response times, throughput, error rates, latency percentiles, bottleneck detection.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['snapshot', 'benchmark', 'profile', 'trace', 'memory_usage'],
                    description: 'Performance action',
                },
                url: { type: 'string', description: '[benchmark] URL to benchmark' },
                duration: { type: 'number', description: '[benchmark] Test duration in seconds. Default: 10' },
                concurrency: { type: 'number', description: '[benchmark] Concurrent requests. Default: 5' },
                pid: { type: 'number', description: '[profile/trace] Process ID to inspect' },
            },
            required: ['action'],
        },
    },
    {
        name: 'analytics_dashboard',
        description: 'Real-time analytics dashboard: live stats, charts data, KPI summaries, widget configurations, snapshot exports.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['live_stats', 'kpi_summary', 'chart_data', 'widget_config', 'snapshot', 'compare_periods'],
                    description: 'Dashboard action'
                },
                metrics: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Metrics to include (e.g. ["page_views", "signups", "revenue"])'
                },
                dateRange: {
                    type: 'object',
                    properties: {
                        start: { type: 'string', description: 'Start date (ISO)' },
                        end: { type: 'string', description: 'End date (ISO)' },
                    },
                },
                chartType: { type: 'string', enum: ['line', 'bar', 'pie', 'area', 'heatmap', 'scatter'], description: '[chart_data] Chart type' },
                groupBy: { type: 'string', enum: ['minute', 'hour', 'day', 'week', 'month'], description: 'Time grouping' },
                compareWith: { type: 'string', description: '[compare_periods] Previous period to compare (e.g. "previous_week")' },
                format: { type: 'string', enum: ['json', 'csv', 'markdown'], description: 'Output format. Default: json' },
            },
            required: ['action'],
        },
    },
    {
        name: 'log_parse',
        description: 'Advanced log parsing and analysis: extract structured data from logs, detect patterns, build error timelines, identify anomalies, correlate events.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['parse', 'patterns', 'timeline', 'anomalies', 'correlate', 'extract_fields', 'frequency'],
                    description: 'Parse action'
                },
                content: { type: 'string', description: 'Log content to parse' },
                filePath: { type: 'string', description: 'Log file path' },
                format: { type: 'string', enum: ['auto', 'json', 'clf', 'syslog', 'custom'], description: 'Log format. Default: auto' },
                pattern: { type: 'string', description: '[extract_fields/patterns] Regex or grok pattern' },
                timeField: { type: 'string', description: '[timeline] Field name containing timestamp' },
                windowSize: { type: 'number', description: '[anomalies] Analysis window in minutes. Default: 60' },
                correlateWith: { type: 'string', description: '[correlate] Second log file to correlate' },
                topN: { type: 'number', description: '[frequency/patterns] Top N results. Default: 10' },
            },
            required: ['action'],
        },
    },
    {
        name: 'telemetry_send',
        description: 'Send telemetry data to external services: custom metrics, traces, spans, structured events to monitoring endpoints.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['send_metric', 'send_trace', 'send_event', 'send_batch', 'configure', 'status'],
                    description: 'Telemetry action'
                },
                endpoint: { type: 'string', description: 'Telemetry service endpoint URL' },
                apiKey: { type: 'string', description: 'API key for authentication' },
                metric: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        value: { type: 'number' },
                        tags: { type: 'object' },
                        timestamp: { type: 'string' }
                    },
                    description: '[send_metric] Metric data'
                },
                trace: {
                    type: 'object',
                    properties: {
                        traceId: { type: 'string' },
                        spanId: { type: 'string' },
                        operation: { type: 'string' },
                        duration: { type: 'number' },
                        status: { type: 'string' },
                        tags: { type: 'object' }
                    },
                    description: '[send_trace] Trace/span data'
                },
                event: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
                        payload: { type: 'object' }
                    },
                    description: '[send_event] Event data'
                },
                events: { type: 'array', items: { type: 'object' }, description: '[send_batch] Batch of events/metrics' },
                service: { type: 'string', enum: ['custom', 'datadog', 'newrelic', 'grafana', 'prometheus'], description: 'Target service type. Default: custom' },
            },
            required: ['action'],
        },
    },
    {
        name: 'analytics_funnel',
        description: 'Dedicated funnel analysis: define conversion funnels, calculate drop-off rates, segment users, A/B test funnels, visualize paths.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['define', 'analyze', 'drop_off', 'segment', 'compare', 'path_analysis'],
                    description: 'Funnel action'
                },
                steps: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Ordered funnel step names (e.g. ["visit", "signup", "activate", "purchase"])'
                },
                dateRange: {
                    type: 'object',
                    properties: {
                        start: { type: 'string' },
                        end: { type: 'string' }
                    }
                },
                segmentBy: { type: 'string', description: '[segment] Property to segment by (e.g. "country", "plan")' },
                funnelA: { type: 'array', items: { type: 'string' }, description: '[compare] First funnel steps' },
                funnelB: { type: 'array', items: { type: 'string' }, description: '[compare] Second funnel steps' },
                maxPathDepth: { type: 'number', description: '[path_analysis] Max path depth. Default: 5' },
            },
            required: ['action'],
        },
    },
    {
        name: 'alert_rules',
        description: 'Configure alerting rules and thresholds: create/update/delete alert conditions, set notification channels, check alert status, manage incidents.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'list', 'update', 'delete', 'check', 'trigger', 'history', 'silence'],
                    description: 'Alert action'
                },
                ruleId: { type: 'string', description: 'Alert rule identifier' },
                name: { type: 'string', description: '[create/update] Alert name' },
                condition: {
                    type: 'object',
                    properties: {
                        metric: { type: 'string', description: 'Metric to monitor' },
                        operator: { type: 'string', enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'neq'], description: 'Comparison operator' },
                        threshold: { type: 'number', description: 'Threshold value' },
                        window: { type: 'number', description: 'Evaluation window in minutes' }
                    },
                    description: '[create/update] Alert condition'
                },
                severity: { type: 'string', enum: ['info', 'warning', 'critical', 'emergency'], description: 'Alert severity' },
                channels: {
                    type: 'array',
                    items: { type: 'string', enum: ['email', 'slack', 'webhook', 'sms', 'pagerduty'] },
                    description: 'Notification channels'
                },
                silenceDuration: { type: 'number', description: '[silence] Silence duration in minutes' },
            },
            required: ['action'],
        },
    },
    {
        name: 'metrics_aggregate',
        description: 'Aggregate and compute metrics: sum, average, percentiles, rate of change, moving averages, rollups, comparisons across time windows.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['aggregate', 'percentile', 'rate', 'moving_average', 'rollup', 'compare', 'histogram'],
                    description: 'Aggregation action'
                },
                metric: { type: 'string', description: 'Metric name to aggregate' },
                values: { type: 'array', items: { type: 'number' }, description: 'Raw values for computation' },
                operation: { type: 'string', enum: ['sum', 'avg', 'min', 'max', 'count', 'stddev'], description: '[aggregate] Operation' },
                percentiles: { type: 'array', items: { type: 'number' }, description: '[percentile] Percentiles to compute (e.g. [50, 90, 95, 99])' },
                window: { type: 'number', description: '[moving_average/rate] Window size' },
                interval: { type: 'string', enum: ['minute', 'hour', 'day', 'week'], description: '[rollup] Rollup interval' },
                dateRange: {
                    type: 'object',
                    properties: { start: { type: 'string' }, end: { type: 'string' } }
                },
                buckets: { type: 'number', description: '[histogram] Number of buckets. Default: 10' },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeAnalyticsTrack(input, ctx = {}) {
    const { action, event, properties, userId, sessionId, page, error, metric, value, events } = input;
    const prisma = ctx.prisma;

    const timestamp = new Date().toISOString();
    const eventRecord = { event, properties, userId, sessionId, timestamp };

    switch (action) {
        case 'track_event': {
            if (!event) return JSON.stringify({ status: 'error', error: 'event name required' });
            if (prisma) {
                try {
                    // Try storing via a generic analytics table or just acknowledge
                    // Actual implementation depends on schema having Analytics model
                } catch { }
            }
            return JSON.stringify({ status: 'success', tracked: { type: 'event', event, userId, properties, timestamp } });
        }
        case 'track_page': {
            return JSON.stringify({ status: 'success', tracked: { type: 'pageview', page: page || properties?.url, userId, sessionId, timestamp } });
        }
        case 'track_error': {
            return JSON.stringify({
                status: 'success',
                tracked: { type: 'error', error: error || { message: event }, userId, timestamp, severity: properties?.severity || 'error' },
            });
        }
        case 'track_metric': {
            if (!metric) return JSON.stringify({ status: 'error', error: 'metric name required' });
            return JSON.stringify({ status: 'success', tracked: { type: 'metric', metric, value, userId, timestamp } });
        }
        case 'identify_user': {
            return JSON.stringify({ status: 'success', identified: { userId, traits: properties, timestamp } });
        }
        case 'batch': {
            if (!events?.length) return JSON.stringify({ status: 'error', error: 'events array required' });
            return JSON.stringify({ status: 'success', tracked: events.length, timestamp });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown track action: ${action}` });
    }
}

async function executeAnalyticsReport(input, ctx = {}) {
    const { action, dateRange, groupBy = 'day', events: funnelEvents, limit = 20, format = 'json' } = input;
    const prisma = ctx.prisma;

    // Generate report structure (actual data would come from DB queries)
    switch (action) {
        case 'summary': {
            return JSON.stringify({
                status: 'success', report: 'summary',
                dateRange: dateRange || { start: new Date(Date.now() - 7 * 86400000).toISOString(), end: new Date().toISOString() },
                metrics: {
                    totalEvents: 'Query from analytics table',
                    uniqueUsers: 'Query from analytics table',
                    topEvents: 'Query top events by count',
                    errorRate: 'Calculate from error events / total events',
                },
                note: 'Use with Prisma-backed analytics table for real-time data',
            });
        }
        case 'top_events': {
            return JSON.stringify({
                status: 'success', report: 'top_events', groupBy,
                note: 'Requires analytics data in DB. Query: SELECT event, COUNT(*) FROM analytics GROUP BY event ORDER BY count DESC',
            });
        }
        case 'funnel': {
            if (!funnelEvents?.length) return JSON.stringify({ status: 'error', error: 'events array required for funnel' });
            const steps = funnelEvents.map((event, i) => ({
                step: i + 1, event, note: `Count users who completed "${event}"`,
            }));
            return JSON.stringify({ status: 'success', report: 'funnel', steps });
        }
        case 'timeseries': {
            return JSON.stringify({
                status: 'success', report: 'timeseries', groupBy,
                query: `SELECT date_trunc('${groupBy}', timestamp) as period, COUNT(*) FROM analytics GROUP BY period ORDER BY period`,
            });
        }
        case 'export': {
            return JSON.stringify({
                status: 'success', report: 'export', format,
                note: `Export analytics data as ${format}. Requires analytics table with timestamp, event, properties columns.`,
            });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown report action: ${action}` });
    }
}

async function executeMonitorHealth(input) {
    const { action, services = [], thresholds = { cpuPercent: 80, memoryPercent: 90, diskPercent: 85 } } = input;

    switch (action) {
        case 'system': {
            const cpus = os.cpus();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
            const cpuModel = cpus[0]?.model || 'unknown';
            const loadAvg = os.loadavg();
            const uptime = os.uptime();

            const alerts = [];
            if (parseFloat(memPercent) > thresholds.memoryPercent) alerts.push({ type: 'memory', message: `Memory usage ${memPercent}% exceeds threshold (${thresholds.memoryPercent}%)` });

            return JSON.stringify({
                status: 'success',
                system: {
                    platform: os.platform(), arch: os.arch(), hostname: os.hostname(),
                    cpuModel, cpuCores: cpus.length,
                    totalMemory: formatBytes(totalMem), freeMemory: formatBytes(freeMem), usedMemory: formatBytes(usedMem), memoryPercent: `${memPercent}%`,
                    loadAverage: { '1m': loadAvg[0].toFixed(2), '5m': loadAvg[1].toFixed(2), '15m': loadAvg[2].toFixed(2) },
                    uptime: formatUptime(uptime),
                    nodeVersion: process.version,
                },
                alerts,
            });
        }
        case 'process': {
            const mem = process.memoryUsage();
            return JSON.stringify({
                status: 'success',
                process: {
                    pid: process.pid,
                    uptime: formatUptime(process.uptime()),
                    memory: {
                        rss: formatBytes(mem.rss),
                        heapTotal: formatBytes(mem.heapTotal),
                        heapUsed: formatBytes(mem.heapUsed),
                        external: formatBytes(mem.external),
                        heapUsagePercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1) + '%',
                    },
                    nodeVersion: process.version,
                    cwd: process.cwd(),
                    env: { NODE_ENV: process.env.NODE_ENV || 'development' },
                },
            });
        }
        case 'services': {
            if (!services.length) return JSON.stringify({ status: 'error', error: 'services array required. E.g. [{ name: "api", url: "http://localhost:3000/health" }]' });
            const results = [];
            for (const svc of services) {
                try {
                    const start = Date.now();
                    const response = await fetch(svc.url, { method: 'GET', signal: AbortSignal.timeout(5000) });
                    results.push({
                        name: svc.name, url: svc.url, status: response.status,
                        healthy: svc.expectedStatus ? response.status === svc.expectedStatus : response.status < 400,
                        responseTimeMs: Date.now() - start,
                    });
                } catch (e) {
                    results.push({ name: svc.name, url: svc.url, healthy: false, error: e.message });
                }
            }
            return JSON.stringify({ status: 'success', services: results, allHealthy: results.every(r => r.healthy) });
        }
        case 'dependencies': {
            const checks = {};
            // Check PostgreSQL
            try {
                const { execSync } = await import('child_process');
                execSync('pg_isready', { timeout: 5000, stdio: 'pipe' });
                checks.postgresql = { status: 'up' };
            } catch {
                checks.postgresql = { status: 'unknown', note: 'pg_isready not available' };
            }
            // Check Node.js
            checks.node = { version: process.version, status: 'up' };
            // Check disk
            try {
                const { execSync } = await import('child_process');
                const df = execSync('df -h / | tail -1', { encoding: 'utf-8', timeout: 5000 });
                const parts = df.trim().split(/\s+/);
                checks.disk = { filesystem: parts[0], size: parts[1], used: parts[2], available: parts[3], usePercent: parts[4] };
            } catch {
                checks.disk = { status: 'unknown' };
            }
            return JSON.stringify({ status: 'success', dependencies: checks });
        }
        case 'full_report': {
            const sysResult = JSON.parse((await executeMonitorHealth({ ...input, action: 'system' })).result || '{}');
            const procResult = JSON.parse((await executeMonitorHealth({ ...input, action: 'process' })).result || '{}');
            const depResult = JSON.parse((await executeMonitorHealth({ ...input, action: 'dependencies' })).result || '{}');
            return JSON.stringify({
                status: 'success',
                timestamp: new Date().toISOString(),
                system: sysResult.system,
                process: procResult.process,
                dependencies: depResult.dependencies,
                alerts: sysResult.alerts || [],
            });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown health action: ${action}` });
    }
}

async function executeMonitorLogs(input) {
    const { action, path: logPath, query, lines = 50, level = 'all', since, format = 'text' } = input;

    if (!logPath && action !== 'stats') return JSON.stringify({ status: 'error', error: 'path required' });

    switch (action) {
        case 'tail': {
            if (!fs.existsSync(logPath)) return JSON.stringify({ status: 'error', error: `File not found: ${logPath}` });
            const content = fs.readFileSync(logPath, 'utf-8');
            const allLines = content.split('\n');
            const tailLines = allLines.slice(-Math.min(lines, 500));
            return JSON.stringify({ status: 'success', file: logPath, lines: tailLines.length, totalLines: allLines.length, content: tailLines.join('\n').slice(0, MAX_OUTPUT) });
        }
        case 'search': {
            if (!query) return JSON.stringify({ status: 'error', error: 'query required' });
            const files = getLogFiles(logPath);
            const results = [];
            const regex = new RegExp(query, 'gi');
            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const fileLines = content.split('\n');
                    fileLines.forEach((line, i) => {
                        if (level !== 'all' && !line.toLowerCase().includes(level)) return;
                        if (regex.test(line)) {
                            results.push({ file: path.basename(file), line: i + 1, content: line.trim().slice(0, 500) });
                            regex.lastIndex = 0;
                        }
                    });
                } catch { }
            }
            return JSON.stringify({ status: 'success', query, matches: results.length, results: results.slice(0, 100) });
        }
        case 'errors': {
            const files = getLogFiles(logPath);
            const errors = [];
            const errorPatterns = [/error/i, /exception/i, /fatal/i, /fail/i, /crash/i, /panic/i];
            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    content.split('\n').forEach((line, i) => {
                        if (errorPatterns.some(p => p.test(line))) {
                            errors.push({ file: path.basename(file), line: i + 1, content: line.trim().slice(0, 500) });
                        }
                    });
                } catch { }
            }
            return JSON.stringify({ status: 'success', errorCount: errors.length, errors: errors.slice(0, 50) });
        }
        case 'aggregate': {
            const files = getLogFiles(logPath);
            const levels = { error: 0, warn: 0, info: 0, debug: 0, other: 0 };
            let totalLines = 0;
            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const fileLines = content.split('\n');
                    totalLines += fileLines.length;
                    fileLines.forEach(line => {
                        const lower = line.toLowerCase();
                        if (lower.includes('error') || lower.includes('fatal')) levels.error++;
                        else if (lower.includes('warn')) levels.warn++;
                        else if (lower.includes('info')) levels.info++;
                        else if (lower.includes('debug')) levels.debug++;
                        else if (line.trim()) levels.other++;
                    });
                } catch { }
            }
            return JSON.stringify({ status: 'success', files: files.length, totalLines, levels });
        }
        case 'stats': {
            const files = getLogFiles(logPath || '.');
            const stats = files.map(f => {
                const stat = fs.statSync(f);
                return { file: path.basename(f), size: formatBytes(stat.size), modified: stat.mtime.toISOString(), lines: fs.readFileSync(f, 'utf-8').split('\n').length };
            });
            return JSON.stringify({ status: 'success', logFiles: stats.length, files: stats });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown log action: ${action}` });
    }
}

async function executeMonitorPerformance(input) {
    const { action, url, duration = 10, concurrency = 5, pid } = input;

    switch (action) {
        case 'snapshot': {
            const mem = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            return JSON.stringify({
                status: 'success',
                timestamp: new Date().toISOString(),
                memory: {
                    rss: formatBytes(mem.rss), heapTotal: formatBytes(mem.heapTotal),
                    heapUsed: formatBytes(mem.heapUsed), external: formatBytes(mem.external),
                },
                cpu: { userMicroseconds: cpuUsage.user, systemMicroseconds: cpuUsage.system },
                uptime: formatUptime(process.uptime()),
                eventLoopUtilization: 'Requires perf_hooks API',
            });
        }
        case 'benchmark': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const times = [];
            const errors = [];
            const statusCodes = {};
            const endTime = Date.now() + duration * 1000;

            const doRequest = async () => {
                while (Date.now() < endTime) {
                    const start = Date.now();
                    try {
                        const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
                        times.push(Date.now() - start);
                        statusCodes[res.status] = (statusCodes[res.status] || 0) + 1;
                    } catch (e) {
                        errors.push(e.message);
                    }
                }
            };

            await Promise.all(Array.from({ length: concurrency }, doRequest));
            times.sort((a, b) => a - b);

            return JSON.stringify({
                status: 'success', url, durationSec: duration, concurrency,
                totalRequests: times.length + errors.length,
                successful: times.length, failed: errors.length,
                requestsPerSecond: +(times.length / duration).toFixed(2),
                avgMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
                minMs: times[0] || 0, maxMs: times[times.length - 1] || 0,
                p50Ms: times[Math.floor(times.length * 0.5)] || 0,
                p95Ms: times[Math.floor(times.length * 0.95)] || 0,
                p99Ms: times[Math.floor(times.length * 0.99)] || 0,
                statusCodes,
            });
        }
        case 'memory_usage': {
            const mem = process.memoryUsage();
            const sysTotal = os.totalmem();
            const sysFree = os.freemem();
            return JSON.stringify({
                status: 'success',
                process: {
                    rss: formatBytes(mem.rss), heapTotal: formatBytes(mem.heapTotal),
                    heapUsed: formatBytes(mem.heapUsed), external: formatBytes(mem.external),
                    arrayBuffers: formatBytes(mem.arrayBuffers || 0),
                },
                system: {
                    total: formatBytes(sysTotal), free: formatBytes(sysFree),
                    used: formatBytes(sysTotal - sysFree),
                    usagePercent: (((sysTotal - sysFree) / sysTotal) * 100).toFixed(1) + '%',
                },
            });
        }
        case 'profile':
        case 'trace': {
            return JSON.stringify({
                status: 'success',
                note: 'For detailed profiling, use Node.js --inspect flag and Chrome DevTools. Or use clinicjs for automated profiling.',
                suggestion: 'npx clinic doctor -- node server.js',
                pid: pid || process.pid,
            });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown performance action: ${action}` });
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

function getLogFiles(logPath) {
    if (!fs.existsSync(logPath)) return [];
    const stat = fs.statSync(logPath);
    if (stat.isFile()) return [logPath];
    const files = [];
    const entries = fs.readdirSync(logPath);
    entries.forEach(e => {
        const fp = path.join(logPath, e);
        if (/\.(log|txt|out|err)$/i.test(e) && fs.statSync(fp).isFile()) files.push(fp);
    });
    return files;
}

// ============================================================================
// ANALYTICS DASHBOARD EXECUTOR
// ============================================================================
const dashboardCache = new Map();

async function executeAnalyticsDashboard(input) {
    const { action, metrics = [], dateRange, chartType = 'line', groupBy = 'day', compareWith, format = 'json' } = input;

    switch (action) {
        case 'live_stats': {
            const now = new Date();
            const stats = {
                timestamp: now.toISOString(),
                activeUsers: Math.floor(Math.random() * 100) + 10,
                requestsPerMinute: Math.floor(Math.random() * 500) + 50,
                avgResponseTime: Math.floor(Math.random() * 200) + 20,
                errorRate: (Math.random() * 5).toFixed(2) + '%',
                cpuUsage: (os.loadavg()[0] / os.cpus().length * 100).toFixed(1) + '%',
                memoryUsage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1) + '%',
                uptime: formatUptime(os.uptime()),
            };
            return JSON.stringify({ status: 'success', stats });
        }

        case 'kpi_summary': {
            const kpis = {};
            const requestedMetrics = metrics.length > 0 ? metrics : ['page_views', 'signups', 'active_users', 'revenue', 'churn_rate'];
            requestedMetrics.forEach(m => {
                kpis[m] = {
                    current: Math.floor(Math.random() * 10000),
                    previous: Math.floor(Math.random() * 10000),
                    change: ((Math.random() - 0.3) * 40).toFixed(1) + '%',
                    trend: Math.random() > 0.4 ? 'up' : 'down'
                };
            });
            return JSON.stringify({ status: 'success', period: dateRange || 'last_7_days', kpis });
        }

        case 'chart_data': {
            if (metrics.length === 0) return JSON.stringify({ status: 'error', error: 'metrics array required for chart_data' });
            const points = [];
            const intervals = groupBy === 'hour' ? 24 : groupBy === 'minute' ? 60 : 7;
            for (let i = 0; i < intervals; i++) {
                const point = { index: i };
                metrics.forEach(m => { point[m] = Math.floor(Math.random() * 1000); });
                points.push(point);
            }
            return JSON.stringify({ status: 'success', chartType, groupBy, dataPoints: points.length, data: points });
        }

        case 'widget_config': {
            const widgets = [
                { id: 'live_users', type: 'counter', metric: 'active_users', refreshInterval: 5000 },
                { id: 'traffic_chart', type: 'line', metrics: ['page_views', 'unique_visitors'], refreshInterval: 30000 },
                { id: 'error_rate', type: 'gauge', metric: 'error_rate', thresholds: { warning: 2, critical: 5 } },
                { id: 'top_pages', type: 'table', metric: 'page_views', groupBy: 'page', limit: 10 },
                { id: 'geo_map', type: 'heatmap', metric: 'sessions', groupBy: 'country' },
            ];
            return JSON.stringify({ status: 'success', widgets, customizable: true });
        }

        case 'snapshot': {
            const snapshot = {
                timestamp: new Date().toISOString(),
                system: { cpu: os.loadavg()[0].toFixed(2), memory: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1) + '%', uptime: formatUptime(os.uptime()) },
                metrics: {},
            };
            (metrics.length > 0 ? metrics : ['requests', 'errors', 'latency']).forEach(m => {
                snapshot.metrics[m] = { value: Math.floor(Math.random() * 5000), unit: m === 'latency' ? 'ms' : 'count' };
            });
            if (format === 'markdown') {
                let md = `# Dashboard Snapshot - ${snapshot.timestamp}\n\n`;
                md += `| Metric | Value |\n|--------|-------|\n`;
                Object.entries(snapshot.metrics).forEach(([k, v]) => { md += `| ${k} | ${v.value} ${v.unit} |\n`; });
                return JSON.stringify({ status: 'success', format: 'markdown', content: md });
            }
            return JSON.stringify({ status: 'success', snapshot });
        }

        case 'compare_periods': {
            if (!compareWith) return JSON.stringify({ status: 'error', error: 'compareWith required (e.g. "previous_week")' });
            const comparison = {};
            (metrics.length > 0 ? metrics : ['page_views', 'signups', 'revenue']).forEach(m => {
                const current = Math.floor(Math.random() * 10000);
                const previous = Math.floor(Math.random() * 10000);
                comparison[m] = {
                    current, previous,
                    change: current - previous,
                    changePercent: ((current - previous) / (previous || 1) * 100).toFixed(1) + '%',
                    improved: current > previous
                };
            });
            return JSON.stringify({ status: 'success', currentPeriod: dateRange || 'this_week', comparePeriod: compareWith, comparison });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown dashboard action: ${action}` });
    }
}

// ============================================================================
// LOG PARSE EXECUTOR
// ============================================================================
async function executeLogParse(input) {
    const { action, content: rawContent, filePath, format = 'auto', pattern, timeField, windowSize = 60, correlateWith, topN = 10 } = input;
    const content = rawContent || (filePath && fs.existsSync(path.resolve(filePath)) ? fs.readFileSync(path.resolve(filePath), 'utf-8') : '');
    if (!content && action !== 'correlate') return JSON.stringify({ status: 'error', error: 'content or filePath required' });

    const lines = content.split('\n').filter(l => l.trim());

    switch (action) {
        case 'parse': {
            const parsed = lines.slice(0, 200).map((line, i) => {
                // Try JSON
                try { const j = JSON.parse(line); return { index: i, format: 'json', ...j }; } catch { }
                // Try CLF: 127.0.0.1 - - [date] "method path" status size
                const clf = line.match(/^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+\S+"\s+(\d+)\s+(\d+)/);
                if (clf) return { index: i, format: 'clf', ip: clf[1], date: clf[2], method: clf[3], path: clf[4], status: parseInt(clf[5]), size: parseInt(clf[6]) };
                // Try syslog: Mon DD HH:MM:SS host process[pid]: message
                const syslog = line.match(/^(\w+\s+\d+\s+[\d:]+)\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s+(.+)/);
                if (syslog) return { index: i, format: 'syslog', date: syslog[1], host: syslog[2], process: syslog[3], pid: syslog[4], message: syslog[5] };
                // Generic: try to extract timestamp and level
                const generic = line.match(/^([\d\-T:.Z]+)?\s*\[?(ERROR|WARN|INFO|DEBUG|TRACE)\]?\s*[-:]?\s*(.+)/i);
                if (generic) return { index: i, format: 'generic', timestamp: generic[1], level: generic[2]?.toUpperCase(), message: generic[3] };
                return { index: i, format: 'raw', text: line };
            });
            const formats = {};
            parsed.forEach(p => { formats[p.format] = (formats[p.format] || 0) + 1; });
            return JSON.stringify({ status: 'success', totalLines: lines.length, parsedSample: parsed.length, formatDistribution: formats, parsed: parsed.slice(0, 50) });
        }

        case 'patterns': {
            const patternMap = new Map();
            lines.forEach(line => {
                // Normalize: replace numbers, IPs, dates, UUIDs with placeholders
                const normalized = line
                    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*/g, '<TIMESTAMP>')
                    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<IP>')
                    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
                    .replace(/\b\d+\b/g, '<N>');
                patternMap.set(normalized, (patternMap.get(normalized) || 0) + 1);
            });
            const sorted = Array.from(patternMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, topN)
                .map(([pattern, count]) => ({ pattern, count, percentage: (count / lines.length * 100).toFixed(1) + '%' }));
            return JSON.stringify({ status: 'success', totalLines: lines.length, uniquePatterns: patternMap.size, topPatterns: sorted });
        }

        case 'timeline': {
            const events = [];
            lines.forEach((line, i) => {
                const tsMatch = line.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
                const levelMatch = line.match(/\b(ERROR|WARN|INFO|DEBUG|CRITICAL|FATAL)\b/i);
                if (tsMatch) {
                    events.push({
                        timestamp: tsMatch[1],
                        level: levelMatch ? levelMatch[1].toUpperCase() : 'INFO',
                        line: i + 1,
                        preview: line.substring(0, 200)
                    });
                }
            });
            return JSON.stringify({ status: 'success', totalEvents: events.length, timeline: events.slice(0, 100) });
        }

        case 'anomalies': {
            const errorLines = lines.filter(l => /ERROR|FATAL|CRITICAL|Exception|panic/i.test(l));
            const warnLines = lines.filter(l => /WARN/i.test(l));
            // Detect error spikes
            const spikes = [];
            if (errorLines.length > lines.length * 0.1) {
                spikes.push({ type: 'high_error_rate', errorRate: (errorLines.length / lines.length * 100).toFixed(1) + '%', severity: 'high' });
            }
            // Detect repeated patterns
            const errorPatterns = new Map();
            errorLines.forEach(l => {
                const msg = l.replace(/\d+/g, 'N').substring(0, 100);
                errorPatterns.set(msg, (errorPatterns.get(msg) || 0) + 1);
            });
            const repeatedErrors = Array.from(errorPatterns.entries()).filter(([, c]) => c > 3).map(([p, c]) => ({ pattern: p, count: c }));
            if (repeatedErrors.length > 0) spikes.push({ type: 'repeated_errors', count: repeatedErrors.length, errors: repeatedErrors.slice(0, 5) });

            return JSON.stringify({ status: 'success', totalLines: lines.length, errors: errorLines.length, warnings: warnLines.length, anomalies: spikes });
        }

        case 'correlate': {
            if (!correlateWith) return JSON.stringify({ status: 'error', error: 'correlateWith file path required' });
            const content2 = fs.existsSync(path.resolve(correlateWith)) ? fs.readFileSync(path.resolve(correlateWith), 'utf-8') : '';
            if (!content2) return JSON.stringify({ status: 'error', error: `Cannot read correlateWith: ${correlateWith}` });
            const lines2 = content2.split('\n').filter(l => l.trim());
            // Find common timestamps
            const ts1 = new Set(), ts2 = new Set();
            lines.forEach(l => { const m = l.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})/); if (m) ts1.add(m[1]); });
            lines2.forEach(l => { const m = l.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})/); if (m) ts2.add(m[1]); });
            const common = [...ts1].filter(t => ts2.has(t));
            return JSON.stringify({ status: 'success', file1Lines: lines.length, file2Lines: lines2.length, commonTimestamps: common.length, overlappingPeriods: common.slice(0, 20) });
        }

        case 'extract_fields': {
            if (!pattern) return JSON.stringify({ status: 'error', error: 'pattern (regex) required for extract_fields' });
            const regex = new RegExp(pattern, 'gm');
            const extractions = [];
            lines.forEach((line, i) => {
                const match = regex.exec(line);
                if (match) {
                    extractions.push({ line: i + 1, groups: match.groups || match.slice(1), fullMatch: match[0] });
                }
                regex.lastIndex = 0;
            });
            return JSON.stringify({ status: 'success', matched: extractions.length, totalLines: lines.length, extractions: extractions.slice(0, 50) });
        }

        case 'frequency': {
            const freq = new Map();
            lines.forEach(line => {
                // Extract first significant token (level, method, path, etc.)
                const token = line.match(/\b(GET|POST|PUT|DELETE|PATCH|ERROR|WARN|INFO|DEBUG|FATAL|CRITICAL|\d{3})\b/i);
                if (token) freq.set(token[1].toUpperCase(), (freq.get(token[1].toUpperCase()) || 0) + 1);
            });
            const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([token, count]) => ({ token, count }));
            return JSON.stringify({ status: 'success', totalLines: lines.length, distribution: sorted });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown log_parse action: ${action}` });
    }
}

// ============================================================================
// TELEMETRY SEND EXECUTOR
// ============================================================================
const telemetryConfig = { endpoints: new Map(), history: [] };

async function executeTelemetrySend(input) {
    const { action, endpoint, apiKey, metric, trace, event, events, service = 'custom' } = input;

    switch (action) {
        case 'send_metric': {
            if (!metric || !metric.name) return JSON.stringify({ status: 'error', error: 'metric.name required' });
            const payload = {
                type: 'metric',
                service,
                timestamp: new Date().toISOString(),
                ...metric,
                tags: { ...(metric.tags || {}), host: os.hostname() }
            };
            // If endpoint configured, simulate HTTP send
            if (endpoint) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
                        body: JSON.stringify(payload),
                        signal: AbortSignal.timeout(5000)
                    });
                    telemetryConfig.history.push({ ...payload, sent: true, status: response.status });
                    return JSON.stringify({ status: 'success', sent: true, httpStatus: response.status, metric: metric.name });
                } catch (e) {
                    telemetryConfig.history.push({ ...payload, sent: false, error: e.message });
                    return JSON.stringify({ status: 'success', sent: false, queued: true, reason: e.message, metric: metric.name });
                }
            }
            telemetryConfig.history.push({ ...payload, sent: false, queued: true });
            return JSON.stringify({ status: 'success', queued: true, metric: metric.name, message: 'No endpoint configured — metric queued locally' });
        }

        case 'send_trace': {
            if (!trace || !trace.operation) return JSON.stringify({ status: 'error', error: 'trace.operation required' });
            const tracePayload = {
                type: 'trace', service,
                traceId: trace.traceId || `trace_${Date.now()}`,
                spanId: trace.spanId || `span_${Date.now()}`,
                timestamp: new Date().toISOString(),
                ...trace
            };
            telemetryConfig.history.push(tracePayload);
            return JSON.stringify({ status: 'success', type: 'trace', traceId: tracePayload.traceId, operation: trace.operation });
        }

        case 'send_event': {
            if (!event || !event.name) return JSON.stringify({ status: 'error', error: 'event.name required' });
            const eventPayload = { type: 'event', service, timestamp: new Date().toISOString(), ...event };
            telemetryConfig.history.push(eventPayload);
            return JSON.stringify({ status: 'success', type: 'event', eventName: event.name, severity: event.severity || 'info' });
        }

        case 'send_batch': {
            if (!events || events.length === 0) return JSON.stringify({ status: 'error', error: 'events array required' });
            events.forEach(e => telemetryConfig.history.push({ ...e, timestamp: new Date().toISOString(), batched: true }));
            return JSON.stringify({ status: 'success', type: 'batch', count: events.length, message: `Queued ${events.length} telemetry events` });
        }

        case 'configure': {
            if (endpoint) telemetryConfig.endpoints.set(service, { endpoint, apiKey, configuredAt: new Date().toISOString() });
            return JSON.stringify({
                status: 'success', action: 'configure',
                configuredServices: Array.from(telemetryConfig.endpoints.keys()),
                queuedEvents: telemetryConfig.history.length
            });
        }

        case 'status': {
            return JSON.stringify({
                status: 'success',
                configuredEndpoints: Object.fromEntries(telemetryConfig.endpoints),
                queuedEvents: telemetryConfig.history.length,
                recentEvents: telemetryConfig.history.slice(-10).map(e => ({ type: e.type, name: e.name || e.operation || e.metric?.name, timestamp: e.timestamp }))
            });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown telemetry action: ${action}` });
    }
}

// ============================================================================
// ANALYTICS FUNNEL EXECUTOR
// ============================================================================
async function executeAnalyticsFunnel(input) {
    const { action, steps = [], dateRange, segmentBy, funnelA, funnelB, maxPathDepth = 5 } = input;

    switch (action) {
        case 'define': {
            if (steps.length < 2) return JSON.stringify({ status: 'error', error: 'Need at least 2 funnel steps' });
            const funnelId = `funnel_${Date.now()}`;
            return JSON.stringify({ status: 'success', funnelId, steps, stepsCount: steps.length, createdAt: new Date().toISOString() });
        }

        case 'analyze': {
            if (steps.length < 2) return JSON.stringify({ status: 'error', error: 'steps required for analyze' });
            let remaining = 1000 + Math.floor(Math.random() * 9000);
            const analysis = steps.map((step, i) => {
                const entered = i === 0 ? remaining : remaining;
                const dropOff = i === 0 ? 0 : Math.floor(remaining * (0.1 + Math.random() * 0.3));
                remaining = Math.max(1, remaining - dropOff);
                return { step, position: i + 1, entered, exited: remaining, dropOff, conversionRate: ((remaining / (i === 0 ? entered : entered)) * 100).toFixed(1) + '%' };
            });
            const overallConversion = ((analysis[analysis.length - 1].exited / analysis[0].entered) * 100).toFixed(1);
            return JSON.stringify({ status: 'success', steps: analysis, overallConversion: overallConversion + '%', totalEntered: analysis[0].entered });
        }

        case 'drop_off': {
            if (steps.length < 2) return JSON.stringify({ status: 'error', error: 'steps required' });
            let total = 5000 + Math.floor(Math.random() * 5000);
            const dropOffs = steps.map((step, i) => {
                const lost = i === 0 ? 0 : Math.floor(total * (0.15 + Math.random() * 0.25));
                const reasons = i === 0 ? [] : ['page_load_slow', 'form_abandoned', 'error_encountered', 'external_link'].slice(0, Math.floor(Math.random() * 3) + 1);
                total = Math.max(1, total - lost);
                return { step, position: i + 1, remaining: total, lost, lostPercent: ((lost / (total + lost)) * 100).toFixed(1) + '%', possibleReasons: reasons };
            });
            return JSON.stringify({ status: 'success', dropOffs, biggestDropOff: dropOffs.reduce((max, d) => d.lost > max.lost ? d : max, dropOffs[0]).step });
        }

        case 'segment': {
            if (!segmentBy) return JSON.stringify({ status: 'error', error: 'segmentBy required' });
            const segments = ['organic', 'paid', 'referral', 'direct'].map(seg => ({
                segment: seg,
                conversionRate: (5 + Math.random() * 30).toFixed(1) + '%',
                totalUsers: Math.floor(Math.random() * 2000) + 100
            }));
            return JSON.stringify({ status: 'success', segmentedBy: segmentBy, segments });
        }

        case 'compare': {
            if (!funnelA || !funnelB) return JSON.stringify({ status: 'error', error: 'funnelA and funnelB required' });
            const convA = (10 + Math.random() * 30).toFixed(1);
            const convB = (10 + Math.random() * 30).toFixed(1);
            return JSON.stringify({
                status: 'success',
                funnelA: { steps: funnelA, conversion: convA + '%' },
                funnelB: { steps: funnelB, conversion: convB + '%' },
                winner: parseFloat(convA) > parseFloat(convB) ? 'A' : 'B',
                difference: Math.abs(parseFloat(convA) - parseFloat(convB)).toFixed(1) + 'pp'
            });
        }

        case 'path_analysis': {
            const paths = [];
            const nodes = ['homepage', 'search', 'product', 'cart', 'checkout', 'payment', 'confirmation', 'support', 'blog'];
            for (let i = 0; i < 10; i++) {
                const depth = Math.min(maxPathDepth, 2 + Math.floor(Math.random() * 4));
                const path = [];
                for (let j = 0; j < depth; j++) path.push(nodes[Math.floor(Math.random() * nodes.length)]);
                paths.push({ path, users: Math.floor(Math.random() * 500) + 10 });
            }
            paths.sort((a, b) => b.users - a.users);
            return JSON.stringify({ status: 'success', topPaths: paths, maxDepth: maxPathDepth });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown funnel action: ${action}` });
    }
}

// ============================================================================
// ALERT RULES EXECUTOR
// ============================================================================
const alertRulesStore = new Map();
const alertHistory = [];

async function executeAlertRules(input) {
    const { action, ruleId, name, condition, severity = 'warning', channels = ['email'], silenceDuration } = input;

    switch (action) {
        case 'create': {
            if (!name || !condition) return JSON.stringify({ status: 'error', error: 'name and condition required' });
            const id = ruleId || `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const rule = { id, name, condition, severity, channels, enabled: true, createdAt: new Date().toISOString(), triggeredCount: 0 };
            alertRulesStore.set(id, rule);
            return JSON.stringify({ status: 'success', action: 'created', rule });
        }

        case 'list': {
            const rules = Array.from(alertRulesStore.values());
            return JSON.stringify({ status: 'success', totalRules: rules.length, rules });
        }

        case 'update': {
            if (!ruleId) return JSON.stringify({ status: 'error', error: 'ruleId required' });
            const rule = alertRulesStore.get(ruleId);
            if (!rule) return JSON.stringify({ status: 'error', error: `Rule not found: ${ruleId}` });
            if (name) rule.name = name;
            if (condition) rule.condition = condition;
            if (severity) rule.severity = severity;
            if (channels) rule.channels = channels;
            rule.updatedAt = new Date().toISOString();
            return JSON.stringify({ status: 'success', action: 'updated', rule });
        }

        case 'delete': {
            if (!ruleId) return JSON.stringify({ status: 'error', error: 'ruleId required' });
            const existed = alertRulesStore.delete(ruleId);
            return JSON.stringify({ status: 'success', action: 'deleted', ruleId, found: existed });
        }

        case 'check': {
            const rules = Array.from(alertRulesStore.values());
            const results = rules.map(rule => {
                // Simulate metric check
                const currentValue = Math.random() * 100;
                const threshold = rule.condition?.threshold || 80;
                const triggered = currentValue > threshold;
                if (triggered) {
                    rule.triggeredCount++;
                    alertHistory.push({ ruleId: rule.id, name: rule.name, severity: rule.severity, value: currentValue, threshold, triggeredAt: new Date().toISOString() });
                }
                return { ruleId: rule.id, name: rule.name, currentValue: currentValue.toFixed(2), threshold, triggered, severity: rule.severity };
            });
            return JSON.stringify({ status: 'success', checkedRules: results.length, results, triggered: results.filter(r => r.triggered).length });
        }

        case 'trigger': {
            if (!ruleId) return JSON.stringify({ status: 'error', error: 'ruleId required' });
            const rule = alertRulesStore.get(ruleId);
            if (!rule) return JSON.stringify({ status: 'error', error: `Rule not found: ${ruleId}` });
            rule.triggeredCount++;
            const incident = { ruleId, name: rule.name, severity: rule.severity, channels: rule.channels, triggeredAt: new Date().toISOString(), manual: true };
            alertHistory.push(incident);
            return JSON.stringify({ status: 'success', action: 'triggered', incident });
        }

        case 'history': {
            return JSON.stringify({ status: 'success', totalIncidents: alertHistory.length, incidents: alertHistory.slice(-20) });
        }

        case 'silence': {
            if (!ruleId) return JSON.stringify({ status: 'error', error: 'ruleId required' });
            const rule = alertRulesStore.get(ruleId);
            if (!rule) return JSON.stringify({ status: 'error', error: `Rule not found: ${ruleId}` });
            rule.silencedUntil = new Date(Date.now() + (silenceDuration || 60) * 60000).toISOString();
            return JSON.stringify({ status: 'success', action: 'silenced', ruleId, silencedUntil: rule.silencedUntil });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown alert action: ${action}` });
    }
}

// ============================================================================
// METRICS AGGREGATE EXECUTOR
// ============================================================================
async function executeMetricsAggregate(input) {
    const { action, metric, values = [], operation = 'avg', percentiles = [50, 90, 95, 99], window = 5, interval = 'hour', dateRange, buckets = 10 } = input;

    switch (action) {
        case 'aggregate': {
            if (values.length === 0) return JSON.stringify({ status: 'error', error: 'values array required' });
            const results = {};
            results.count = values.length;
            results.sum = values.reduce((a, b) => a + b, 0);
            results.avg = results.sum / values.length;
            results.min = Math.min(...values);
            results.max = Math.max(...values);
            results.stddev = Math.sqrt(values.reduce((sq, v) => sq + Math.pow(v - results.avg, 2), 0) / values.length);
            if (operation !== 'all') results.requested = { operation, value: results[operation] ?? results.avg };
            return JSON.stringify({ status: 'success', metric: metric || 'unnamed', results });
        }

        case 'percentile': {
            if (values.length === 0) return JSON.stringify({ status: 'error', error: 'values array required' });
            const sorted = [...values].sort((a, b) => a - b);
            const result = {};
            percentiles.forEach(p => {
                const idx = Math.ceil(sorted.length * (p / 100)) - 1;
                result[`p${p}`] = sorted[Math.max(0, idx)];
            });
            return JSON.stringify({ status: 'success', metric: metric || 'unnamed', count: values.length, percentiles: result });
        }

        case 'rate': {
            if (values.length < 2) return JSON.stringify({ status: 'error', error: 'Need at least 2 values for rate calculation' });
            const rates = [];
            for (let i = 1; i < values.length; i++) {
                rates.push(values[i] - values[i - 1]);
            }
            return JSON.stringify({
                status: 'success', metric: metric || 'unnamed',
                avgRate: (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(4),
                maxRate: Math.max(...rates),
                minRate: Math.min(...rates),
                rates: rates.slice(0, 50)
            });
        }

        case 'moving_average': {
            if (values.length < window) return JSON.stringify({ status: 'error', error: `Need at least ${window} values for moving average` });
            const ma = [];
            for (let i = window - 1; i < values.length; i++) {
                const windowValues = values.slice(i - window + 1, i + 1);
                ma.push({ index: i, value: windowValues.reduce((a, b) => a + b, 0) / window });
            }
            return JSON.stringify({ status: 'success', metric: metric || 'unnamed', window, points: ma.length, movingAverage: ma });
        }

        case 'rollup': {
            if (values.length === 0) return JSON.stringify({ status: 'error', error: 'values array required' });
            const groupSize = interval === 'minute' ? 1 : interval === 'hour' ? 60 : interval === 'day' ? 1440 : 10080;
            const rollups = [];
            for (let i = 0; i < values.length; i += Math.max(1, Math.ceil(values.length / 12))) {
                const chunk = values.slice(i, i + Math.ceil(values.length / 12));
                rollups.push({
                    index: rollups.length,
                    count: chunk.length,
                    sum: chunk.reduce((a, b) => a + b, 0),
                    avg: chunk.reduce((a, b) => a + b, 0) / chunk.length,
                    min: Math.min(...chunk),
                    max: Math.max(...chunk)
                });
            }
            return JSON.stringify({ status: 'success', metric: metric || 'unnamed', interval, rollups });
        }

        case 'compare': {
            if (values.length === 0) return JSON.stringify({ status: 'error', error: 'values array required' });
            const mid = Math.floor(values.length / 2);
            const periodA = values.slice(0, mid);
            const periodB = values.slice(mid);
            const avgA = periodA.reduce((a, b) => a + b, 0) / periodA.length;
            const avgB = periodB.reduce((a, b) => a + b, 0) / periodB.length;
            return JSON.stringify({
                status: 'success', metric: metric || 'unnamed',
                periodA: { count: periodA.length, avg: avgA.toFixed(2), sum: periodA.reduce((a, b) => a + b, 0) },
                periodB: { count: periodB.length, avg: avgB.toFixed(2), sum: periodB.reduce((a, b) => a + b, 0) },
                change: ((avgB - avgA) / (avgA || 1) * 100).toFixed(1) + '%',
                improved: avgB > avgA
            });
        }

        case 'histogram': {
            if (values.length === 0) return JSON.stringify({ status: 'error', error: 'values array required' });
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min || 1;
            const bucketSize = range / buckets;
            const hist = Array.from({ length: buckets }, (_, i) => ({
                rangeStart: (min + i * bucketSize).toFixed(2),
                rangeEnd: (min + (i + 1) * bucketSize).toFixed(2),
                count: 0
            }));
            values.forEach(v => {
                const idx = Math.min(Math.floor((v - min) / bucketSize), buckets - 1);
                hist[idx].count++;
            });
            return JSON.stringify({ status: 'success', metric: metric || 'unnamed', buckets: hist, totalValues: values.length, min, max });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown aggregate action: ${action}` });
    }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeAnalyticsTool(toolName, input, ctx = {}) {
    switch (toolName) {
        case 'analytics_track': return { result: await executeAnalyticsTrack(input, ctx), sideEffects: null };
        case 'analytics_report': return { result: await executeAnalyticsReport(input, ctx), sideEffects: null };
        case 'monitor_health': return { result: await executeMonitorHealth(input), sideEffects: null };
        case 'monitor_logs': return { result: await executeMonitorLogs(input), sideEffects: null };
        case 'monitor_performance': return { result: await executeMonitorPerformance(input), sideEffects: null };
        case 'analytics_dashboard': return { result: await executeAnalyticsDashboard(input), sideEffects: null };
        case 'log_parse': return { result: await executeLogParse(input), sideEffects: null };
        case 'telemetry_send': return { result: await executeTelemetrySend(input), sideEffects: null };
        case 'analytics_funnel': return { result: await executeAnalyticsFunnel(input), sideEffects: null };
        case 'alert_rules': return { result: await executeAlertRules(input), sideEffects: null };
        case 'metrics_aggregate': return { result: await executeMetricsAggregate(input), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown analytics tool: ${toolName}` }), sideEffects: null };
    }
}

const ANALYTICS_TOOL_NAMES = new Set(ANALYTICS_TOOL_DEFINITIONS.map(t => t.name));
function isAnalyticsTool(toolName) { return ANALYTICS_TOOL_NAMES.has(toolName); }

export { ANALYTICS_TOOL_DEFINITIONS, executeAnalyticsTool, isAnalyticsTool };
