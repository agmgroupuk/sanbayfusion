/**
 * ============================================================================
 * DATABASE TOOLS V2
 * ============================================================================
 * db_query, db_schema, db_backup, db_migrate, db_analyze, db_connect
 * All operations use PostgreSQL via Prisma — ZERO localStorage
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const DATABASE_TOOL_DEFINITIONS = [
    {
        name: 'db_query',
        description: 'Execute database queries: SELECT, aggregate, join, paginate. Uses Prisma for safe PostgreSQL access. Read-only by default.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['select', 'count', 'aggregate', 'raw', 'findMany', 'findFirst', 'groupBy'],
                    description: 'Query type',
                },
                model: { type: 'string', description: 'Prisma model name (e.g., User, Workspace, ChatMessage)' },
                where: { type: 'object', description: 'Filter conditions object' },
                select: { type: 'object', description: 'Fields to select' },
                include: { type: 'object', description: 'Relations to include' },
                orderBy: { type: 'object', description: 'Sort order. E.g. { createdAt: "desc" }' },
                take: { type: 'number', description: 'Limit results. Default: 20' },
                skip: { type: 'number', description: 'Offset for pagination. Default: 0' },
                sql: { type: 'string', description: '[raw] Raw SQL query (SELECT only for safety)' },
                groupByFields: { type: 'array', items: { type: 'string' }, description: '[groupBy] Fields to group by' },
                _sum: { type: 'object', description: '[aggregate/groupBy] Sum fields' },
                _count: { type: 'object', description: '[aggregate/groupBy] Count fields' },
                _avg: { type: 'object', description: '[aggregate/groupBy] Average fields' },
            },
            required: ['action'],
        },
    },
    {
        name: 'db_schema',
        description: 'Inspect database schema: list models, show fields/relations, generate ERD description, check indexes.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['list_models', 'describe', 'relations', 'indexes', 'erd', 'validate', 'enums'],
                    description: 'Schema action',
                },
                model: { type: 'string', description: '[describe/relations/indexes] Model name to inspect' },
                schemaPath: { type: 'string', description: 'Path to schema.prisma file (auto-detected if omitted)' },
            },
            required: ['action'],
        },
    },
    {
        name: 'db_backup',
        description: 'Database backup & restore: export data as JSON, export schema, create pg_dump, restore from backup.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['export_json', 'export_schema', 'pg_dump', 'restore', 'snapshot'],
                    description: 'Backup action',
                },
                model: { type: 'string', description: '[export_json] Specific model to export (all if omitted)' },
                outputPath: { type: 'string', description: 'Output file path' },
                inputPath: { type: 'string', description: '[restore] Backup file to restore from' },
                format: { type: 'string', enum: ['json', 'csv', 'sql'], description: 'Export format. Default: json' },
            },
            required: ['action'],
        },
    },
    {
        name: 'db_migrate',
        description: 'Database migrations: create migration, apply pending, reset, check status, seed data.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'apply', 'status', 'reset', 'seed', 'push', 'pull'],
                    description: 'Migration action',
                },
                name: { type: 'string', description: '[create] Migration name' },
                schemaPath: { type: 'string', description: 'Path to schema.prisma' },
                force: { type: 'boolean', description: '[reset] Force destructive operation. Default: false' },
            },
            required: ['action'],
        },
    },
    {
        name: 'db_analyze',
        description: 'Analyze database: table sizes, row counts, slow queries, connection pool status, index usage.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['table_sizes', 'row_counts', 'slow_queries', 'connections', 'index_usage', 'disk_usage', 'health'],
                    description: 'Analysis action',
                },
                model: { type: 'string', description: '[row_counts specific model] Optional model filter' },
            },
            required: ['action'],
        },
    },
    {
        name: 'db_connect',
        description: 'Test database connectivity, check connection string, verify Prisma client. For connection health checks.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['test', 'info', 'version', 'ping'],
                    description: 'Connection action',
                },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// HELPERS
// ============================================================================

function getSchemaPath() {
    const candidates = ['prisma/schema.prisma', 'backend/prisma/schema.prisma', '../prisma/schema.prisma'];
    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
        const abs = path.resolve(process.cwd(), c);
        if (fs.existsSync(abs)) return abs;
    }
    return null;
}

function parseSchema(schemaContent) {
    const models = [];
    const enums = [];
    let currentModel = null;
    let currentEnum = null;

    for (const line of schemaContent.split('\n')) {
        const trimmed = line.trim();
        const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/);
        if (modelMatch) { currentModel = { name: modelMatch[1], fields: [] }; continue; }
        const enumMatch = trimmed.match(/^enum\s+(\w+)\s*\{/);
        if (enumMatch) { currentEnum = { name: enumMatch[1], values: [] }; continue; }
        if (trimmed === '}') {
            if (currentModel) { models.push(currentModel); currentModel = null; }
            if (currentEnum) { enums.push(currentEnum); currentEnum = null; }
            continue;
        }
        if (currentModel && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
            const fieldMatch = trimmed.match(/^(\w+)\s+(\S+)(.*)$/);
            if (fieldMatch) {
                const attrs = fieldMatch[3] || '';
                currentModel.fields.push({
                    name: fieldMatch[1],
                    type: fieldMatch[2],
                    isId: attrs.includes('@id'),
                    isUnique: attrs.includes('@unique'),
                    isOptional: fieldMatch[2].endsWith('?'),
                    isArray: fieldMatch[2].endsWith('[]'),
                    hasDefault: attrs.includes('@default'),
                    isRelation: attrs.includes('@relation'),
                    raw: trimmed,
                });
            }
        }
        if (currentEnum && trimmed && !trimmed.startsWith('//')) {
            currentEnum.values.push(trimmed);
        }
    }
    return { models, enums };
}

function safeExec(cmd, cwd, timeout = 30000) {
    try {
        const result = execSync(cmd, { cwd, timeout, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
        return { success: true, output: result.slice(0, MAX_OUTPUT) };
    } catch (e) {
        return { success: false, output: (e.stdout || '').slice(0, MAX_OUTPUT), error: (e.stderr || e.message || '').slice(0, 5000) };
    }
}

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeDbQuery(input, prisma) {
    const { action, model, where, select, include, orderBy, take = 20, skip = 0, sql, groupByFields, _sum, _count, _avg } = input;

    if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available in context' });

    switch (action) {
        case 'select':
        case 'findMany': {
            if (!model) return JSON.stringify({ status: 'error', error: 'model required' });
            const m = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
            if (!m) return JSON.stringify({ status: 'error', error: `Model "${model}" not found` });
            const results = await m.findMany({ where, select, include, orderBy, take: Math.min(take, 100), skip });
            return JSON.stringify({ status: 'success', model, count: results.length, data: results });
        }
        case 'findFirst': {
            if (!model) return JSON.stringify({ status: 'error', error: 'model required' });
            const m = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
            if (!m) return JSON.stringify({ status: 'error', error: `Model "${model}" not found` });
            const result = await m.findFirst({ where, select, include, orderBy });
            return JSON.stringify({ status: 'success', model, data: result });
        }
        case 'count': {
            if (!model) return JSON.stringify({ status: 'error', error: 'model required' });
            const m = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
            if (!m) return JSON.stringify({ status: 'error', error: `Model "${model}" not found` });
            const count = await m.count({ where });
            return JSON.stringify({ status: 'success', model, count });
        }
        case 'aggregate': {
            if (!model) return JSON.stringify({ status: 'error', error: 'model required' });
            const m = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
            if (!m) return JSON.stringify({ status: 'error', error: `Model "${model}" not found` });
            const agg = await m.aggregate({ where, _sum, _count, _avg });
            return JSON.stringify({ status: 'success', model, aggregate: agg });
        }
        case 'groupBy': {
            if (!model || !groupByFields) return JSON.stringify({ status: 'error', error: 'model and groupByFields required' });
            const m = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
            if (!m) return JSON.stringify({ status: 'error', error: `Model "${model}" not found` });
            const results = await m.groupBy({ by: groupByFields, where, _sum, _count, _avg, orderBy, take: Math.min(take, 100) });
            return JSON.stringify({ status: 'success', model, groups: results });
        }
        case 'raw': {
            if (!sql) return JSON.stringify({ status: 'error', error: 'sql required' });
            const upper = sql.trim().toUpperCase();
            if (!upper.startsWith('SELECT') && !upper.startsWith('WITH') && !upper.startsWith('EXPLAIN')) {
                return JSON.stringify({ status: 'error', error: 'Only SELECT/WITH/EXPLAIN queries allowed for safety' });
            }
            const results = await prisma.$queryRawUnsafe(sql);
            return JSON.stringify({ status: 'success', rows: results.length, data: results.slice(0, 100) });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown query action: ${action}` });
    }
}

async function executeDbSchema(input) {
    const { action, model, schemaPath } = input;
    const sp = schemaPath || getSchemaPath();
    if (!sp || !fs.existsSync(sp)) return JSON.stringify({ status: 'error', error: 'schema.prisma not found' });

    const content = fs.readFileSync(sp, 'utf-8');
    const { models, enums } = parseSchema(content);

    switch (action) {
        case 'list_models':
            return JSON.stringify({ status: 'success', count: models.length, models: models.map(m => ({ name: m.name, fields: m.fields.length })) });
        case 'describe': {
            const m = models.find(mod => mod.name === model);
            if (!m) return JSON.stringify({ status: 'error', error: `Model "${model}" not found` });
            return JSON.stringify({ status: 'success', model: m.name, fields: m.fields });
        }
        case 'relations': {
            if (model) {
                const m = models.find(mod => mod.name === model);
                if (!m) return JSON.stringify({ status: 'error', error: `Model "${model}" not found` });
                const rels = m.fields.filter(f => f.isRelation || f.isArray || models.some(mm => mm.name === f.type.replace('?', '').replace('[]', '')));
                return JSON.stringify({ status: 'success', model: m.name, relations: rels });
            }
            const allRelations = [];
            models.forEach(m => {
                m.fields.forEach(f => {
                    if (f.isRelation || models.some(mm => mm.name === f.type.replace('?', '').replace('[]', ''))) {
                        allRelations.push({ from: m.name, field: f.name, to: f.type.replace('?', '').replace('[]', ''), isArray: f.isArray });
                    }
                });
            });
            return JSON.stringify({ status: 'success', relations: allRelations });
        }
        case 'indexes': {
            const lines = content.split('\n');
            const indexes = [];
            let currentModel = null;
            for (const line of lines) {
                const mMatch = line.match(/model\s+(\w+)/);
                if (mMatch) currentModel = mMatch[1];
                if (currentModel && (line.includes('@@index') || line.includes('@@unique') || line.includes('@unique') || line.includes('@id'))) {
                    indexes.push({ model: currentModel, index: line.trim() });
                }
            }
            if (model) return JSON.stringify({ status: 'success', indexes: indexes.filter(i => i.model === model) });
            return JSON.stringify({ status: 'success', count: indexes.length, indexes });
        }
        case 'erd': {
            const erd = models.map(m => {
                const fields = m.fields.map(f => `  ${f.name}: ${f.type}${f.isId ? ' [PK]' : ''}${f.isUnique ? ' [UNIQUE]' : ''}`).join('\n');
                return `[${m.name}]\n${fields}`;
            }).join('\n\n');
            const relations = [];
            models.forEach(m => {
                m.fields.forEach(f => {
                    const target = models.find(mm => mm.name === f.type.replace('?', '').replace('[]', ''));
                    if (target) relations.push(`${m.name} ${f.isArray ? '1--*' : '1--1'} ${target.name} (via ${f.name})`);
                });
            });
            return JSON.stringify({ status: 'success', erd, relations });
        }
        case 'validate': {
            const result = safeExec('npx prisma validate', path.dirname(sp));
            return JSON.stringify({ status: result.success ? 'success' : 'error', output: result.output || result.error });
        }
        case 'enums':
            return JSON.stringify({ status: 'success', count: enums.length, enums });
        default:
            return JSON.stringify({ status: 'error', error: `Unknown schema action: ${action}` });
    }
}

async function executeDbBackup(input, prisma) {
    const { action, model, outputPath, inputPath, format = 'json' } = input;

    switch (action) {
        case 'export_json': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            if (model) {
                const m = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
                if (!m) return JSON.stringify({ status: 'error', error: `Model "${model}" not found` });
                const data = await m.findMany({ take: 10000 });
                const out = outputPath || `backup_${model}_${Date.now()}.json`;
                fs.writeFileSync(out, JSON.stringify(data, null, 2));
                return JSON.stringify({ status: 'success', model, records: data.length, file: out });
            }
            return JSON.stringify({ status: 'success', note: 'Specify a model to export, or use pg_dump for full backup' });
        }
        case 'export_schema': {
            const sp = getSchemaPath();
            if (!sp) return JSON.stringify({ status: 'error', error: 'schema.prisma not found' });
            const schema = fs.readFileSync(sp, 'utf-8');
            const out = outputPath || `schema_backup_${Date.now()}.prisma`;
            fs.writeFileSync(out, schema);
            return JSON.stringify({ status: 'success', file: out, size: schema.length });
        }
        case 'pg_dump': {
            const dbUrl = process.env.DATABASE_URL;
            if (!dbUrl) return JSON.stringify({ status: 'error', error: 'DATABASE_URL not set' });
            const out = outputPath || `pgdump_${Date.now()}.sql`;
            const result = safeExec(`pg_dump "${dbUrl}" > "${out}" 2>&1`, '.', 60000);
            return JSON.stringify({ status: result.success ? 'success' : 'error', file: out, output: result.output, error: result.error });
        }
        case 'snapshot': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            const sp = getSchemaPath();
            if (!sp) return JSON.stringify({ status: 'error', error: 'schema.prisma not found' });
            const { models } = parseSchema(fs.readFileSync(sp, 'utf-8'));
            const snapshot = {};
            for (const m of models) {
                const key = m.name.charAt(0).toLowerCase() + m.name.slice(1);
                if (prisma[key]) {
                    try { snapshot[m.name] = await prisma[key].count(); } catch { snapshot[m.name] = 'error'; }
                }
            }
            return JSON.stringify({ status: 'success', timestamp: new Date().toISOString(), modelCounts: snapshot });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown backup action: ${action}` });
    }
}

async function executeDbMigrate(input) {
    const { action, name, schemaPath, force = false } = input;
    const sp = schemaPath || getSchemaPath();
    const cwd = sp ? path.dirname(path.dirname(sp)) : '.';

    const cmds = {
        create: `npx prisma migrate dev --name "${name || 'auto'}" --create-only`,
        apply: 'npx prisma migrate deploy',
        status: 'npx prisma migrate status',
        reset: force ? 'npx prisma migrate reset --force' : 'echo "Add force:true to reset database"',
        seed: 'npx prisma db seed',
        push: 'npx prisma db push',
        pull: 'npx prisma db pull',
    };

    const result = safeExec(cmds[action] || `echo "Unknown: ${action}"`, cwd, 60000);
    return JSON.stringify({ status: result.success ? 'success' : 'error', action, output: result.output, error: result.error });
}

async function executeDbAnalyze(input, prisma) {
    const { action, model } = input;

    switch (action) {
        case 'table_sizes': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            try {
                const sizes = await prisma.$queryRawUnsafe(`
          SELECT schemaname, tablename, 
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size
          FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        `);
                return JSON.stringify({ status: 'success', tables: sizes });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'row_counts': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            const sp = getSchemaPath();
            if (!sp) return JSON.stringify({ status: 'error', error: 'schema.prisma not found' });
            const { models } = parseSchema(fs.readFileSync(sp, 'utf-8'));
            const counts = {};
            for (const m of (model ? models.filter(mm => mm.name === model) : models)) {
                const key = m.name.charAt(0).toLowerCase() + m.name.slice(1);
                if (prisma[key]) {
                    try { counts[m.name] = await prisma[key].count(); } catch { counts[m.name] = 'error'; }
                }
            }
            return JSON.stringify({ status: 'success', counts });
        }
        case 'slow_queries': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            try {
                const queries = await prisma.$queryRawUnsafe(`
          SELECT query, calls, mean_exec_time, total_exec_time
          FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10
        `);
                return JSON.stringify({ status: 'success', queries });
            } catch {
                return JSON.stringify({ status: 'success', note: 'pg_stat_statements extension may not be enabled' });
            }
        }
        case 'connections': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            try {
                const conns = await prisma.$queryRawUnsafe(`
          SELECT datname, count(*) as connections, 
            sum(case when state = 'active' then 1 else 0 end) as active,
            sum(case when state = 'idle' then 1 else 0 end) as idle
          FROM pg_stat_activity GROUP BY datname
        `);
                return JSON.stringify({ status: 'success', connections: conns });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'index_usage': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            try {
                const usage = await prisma.$queryRawUnsafe(`
          SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
          FROM pg_stat_user_indexes ORDER BY idx_scan DESC LIMIT 20
        `);
                return JSON.stringify({ status: 'success', indexes: usage });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'disk_usage': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            try {
                const usage = await prisma.$queryRawUnsafe(`SELECT pg_size_pretty(pg_database_size(current_database())) as db_size`);
                return JSON.stringify({ status: 'success', ...usage[0] });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'health': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            try {
                const start = Date.now();
                await prisma.$queryRawUnsafe('SELECT 1');
                const latency = Date.now() - start;
                const version = await prisma.$queryRawUnsafe('SELECT version()');
                return JSON.stringify({ status: 'success', healthy: true, latencyMs: latency, version: version[0]?.version });
            } catch (e) {
                return JSON.stringify({ status: 'error', healthy: false, error: e.message });
            }
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown analyze action: ${action}` });
    }
}

async function executeDbConnect(input, prisma) {
    const { action } = input;

    switch (action) {
        case 'test':
        case 'ping': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            try {
                const start = Date.now();
                await prisma.$queryRawUnsafe('SELECT 1 as ok');
                return JSON.stringify({ status: 'success', connected: true, latencyMs: Date.now() - start });
            } catch (e) {
                return JSON.stringify({ status: 'error', connected: false, error: e.message });
            }
        }
        case 'info': {
            const dbUrl = process.env.DATABASE_URL;
            if (!dbUrl) return JSON.stringify({ status: 'success', note: 'DATABASE_URL not set' });
            const parsed = new URL(dbUrl);
            return JSON.stringify({
                status: 'success',
                host: parsed.hostname,
                port: parsed.port || '5432',
                database: parsed.pathname.slice(1),
                user: parsed.username,
                ssl: dbUrl.includes('sslmode='),
            });
        }
        case 'version': {
            if (!prisma) return JSON.stringify({ status: 'error', error: 'Prisma client not available' });
            try {
                const ver = await prisma.$queryRawUnsafe('SELECT version()');
                return JSON.stringify({ status: 'success', ...ver[0] });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown connect action: ${action}` });
    }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeDatabaseTool(toolName, input, ctx = {}) {
    const prisma = ctx.prisma || null;

    switch (toolName) {
        case 'db_query': return { result: await executeDbQuery(input, prisma), sideEffects: null };
        case 'db_schema': return { result: await executeDbSchema(input), sideEffects: null };
        case 'db_backup': return { result: await executeDbBackup(input, prisma), sideEffects: null };
        case 'db_migrate': return { result: await executeDbMigrate(input), sideEffects: null };
        case 'db_analyze': return { result: await executeDbAnalyze(input, prisma), sideEffects: null };
        case 'db_connect': return { result: await executeDbConnect(input, prisma), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown db tool: ${toolName}` }), sideEffects: null };
    }
}

const DB_TOOL_NAMES = new Set(DATABASE_TOOL_DEFINITIONS.map(t => t.name));
function isDatabaseTool(toolName) { return DB_TOOL_NAMES.has(toolName); }

export { DATABASE_TOOL_DEFINITIONS, executeDatabaseTool, isDatabaseTool };
