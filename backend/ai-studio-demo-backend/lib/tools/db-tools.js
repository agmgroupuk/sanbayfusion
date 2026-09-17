/**
 * DATABASE TOOLS (6 tools)
 * db_query, db_schema, db_backup, db_migrate, db_analyze, db_connect
 * 
 * All state persisted in PostgreSQL via Prisma — NO localStorage
 */

import { prisma } from '../prisma.js';

// ── db_query ────────────────────────────────────────────────────
async function dbQuery(params) {
    const { action = 'select', query, sql, table, ...opts } = params;
    const input_query = query || sql;

    try {
        switch (action) {
            case 'select': {
                if (!input_query && !table) return { success: false, error: 'query or table is required' };
                if (input_query) {
                    // Only allow SELECT queries for safety
                    const normalized = input_query.trim().toUpperCase();
                    if (!normalized.startsWith('SELECT')) return { success: false, error: 'Only SELECT queries allowed. Use action=execute for mutations.' };
                    const result = await prisma.$queryRawUnsafe(input_query);
                    return { success: true, rows: result, count: Array.isArray(result) ? result.length : 0 };
                }
                // Table-based select
                const where = opts.where || {};
                const limit = opts.limit || 100;
                const offset = opts.offset || 0;
                const orderBy = opts.orderBy || { createdAt: 'desc' };
                try {
                    const rows = await prisma[table].findMany({ where, take: limit, skip: offset, orderBy });
                    return { success: true, table, rows, count: rows.length };
                } catch {
                    return { success: false, error: `Table "${table}" not found or invalid query` };
                }
            }

            case 'execute': {
                if (!input_query) return { success: false, error: 'query is required' };
                // Security: Block dangerous operations
                const upper = input_query.trim().toUpperCase();
                if (upper.includes('DROP DATABASE') || upper.includes('DROP SCHEMA')) {
                    return { success: false, error: 'Cannot drop database or schema via tool' };
                }
                const result = await prisma.$executeRawUnsafe(input_query);
                return { success: true, affected: result };
            }

            case 'count': {
                if (!table) return { success: false, error: 'table is required' };
                try {
                    const count = await prisma[table].count({ where: opts.where || {} });
                    return { success: true, table, count };
                } catch {
                    return { success: false, error: `Table "${table}" not found` };
                }
            }

            case 'findUnique': {
                if (!table || !opts.where) return { success: false, error: 'table and where are required' };
                try {
                    const row = await prisma[table].findUnique({ where: opts.where });
                    return { success: true, table, row, found: !!row };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }

            case 'insert': {
                if (!table || !opts.data) return { success: false, error: 'table and data are required' };
                try {
                    const row = await prisma[table].create({ data: opts.data });
                    return { success: true, table, row };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }

            case 'update': {
                if (!table || !opts.where || !opts.data) return { success: false, error: 'table, where, and data are required' };
                try {
                    const row = await prisma[table].update({ where: opts.where, data: opts.data });
                    return { success: true, table, row };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }

            case 'delete': {
                if (!table || !opts.where) return { success: false, error: 'table and where are required' };
                try {
                    const row = await prisma[table].delete({ where: opts.where });
                    return { success: true, table, row };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }

            default:
                return { success: false, error: `Unknown db_query action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── db_schema ───────────────────────────────────────────────────
async function dbSchema(params) {
    const { action = 'tables', ...opts } = params;

    try {
        switch (action) {
            case 'tables': {
                const tables = await prisma.$queryRaw`
          SELECT table_name, table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name`;
                return { success: true, tables, count: tables.length };
            }

            case 'columns': {
                if (!opts.table) return { success: false, error: 'table is required' };
                const columns = await prisma.$queryRaw`
          SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = ${opts.table}
          ORDER BY ordinal_position`;
                return { success: true, table: opts.table, columns };
            }

            case 'indexes': {
                if (!opts.table) return { success: false, error: 'table is required' };
                const indexes = await prisma.$queryRaw`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = ${opts.table}`;
                return { success: true, table: opts.table, indexes };
            }

            case 'constraints': {
                if (!opts.table) return { success: false, error: 'table is required' };
                const constraints = await prisma.$queryRaw`
          SELECT constraint_name, constraint_type 
          FROM information_schema.table_constraints
          WHERE table_schema = 'public' AND table_name = ${opts.table}`;
                return { success: true, table: opts.table, constraints };
            }

            case 'size': {
                const sizes = await prisma.$queryRaw`
          SELECT relname AS table_name, 
                 pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
                 pg_size_pretty(pg_relation_size(relid)) AS data_size,
                 pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
          FROM pg_catalog.pg_statio_user_tables
          ORDER BY pg_total_relation_size(relid) DESC`;
                return { success: true, sizes };
            }

            case 'relations': {
                const relations = await prisma.$queryRaw`
          SELECT tc.table_name, kcu.column_name, 
                 ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`;
                return { success: true, relations };
            }

            default:
                return { success: false, error: `Unknown db_schema action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── db_backup ───────────────────────────────────────────────────
async function dbBackup(params) {
    const { action = 'export', table, ...opts } = params;

    try {
        switch (action) {
            case 'export': {
                if (!table) return { success: false, error: 'table is required' };
                try {
                    const rows = await prisma[table].findMany({
                        take: opts.limit || 10000,
                        orderBy: opts.orderBy || { createdAt: 'desc' },
                    });
                    return {
                        success: true,
                        table,
                        format: opts.format || 'json',
                        data: rows,
                        count: rows.length,
                        exportedAt: new Date().toISOString(),
                    };
                } catch {
                    return { success: false, error: `Table "${table}" not found` };
                }
            }

            case 'import': {
                if (!table || !opts.data) return { success: false, error: 'table and data are required' };
                const data = Array.isArray(opts.data) ? opts.data : [opts.data];
                let imported = 0;
                for (const row of data) {
                    try {
                        await prisma[table].create({ data: row });
                        imported++;
                    } catch { /* skip duplicates */ }
                }
                return { success: true, table, imported, total: data.length };
            }

            case 'snapshot': {
                // Get row counts for all tables
                const tables = await prisma.$queryRaw`
          SELECT relname AS table_name, n_live_tup AS row_count
          FROM pg_stat_user_tables
          ORDER BY n_live_tup DESC`;
                return {
                    success: true,
                    snapshot: tables,
                    timestamp: new Date().toISOString(),
                    totalTables: tables.length,
                };
            }

            default:
                return { success: false, error: `Unknown db_backup action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── db_migrate ──────────────────────────────────────────────────
async function dbMigrate(params) {
    const { action = 'status', ...opts } = params;

    try {
        switch (action) {
            case 'status': {
                const migrations = await prisma.$queryRaw`
          SELECT migration_name, finished_at, started_at, applied_steps_count
          FROM _prisma_migrations
          ORDER BY started_at DESC
          LIMIT ${opts.limit || 20}`;
                return { success: true, migrations };
            }

            case 'history': {
                const all = await prisma.$queryRaw`
          SELECT migration_name, finished_at, logs
          FROM _prisma_migrations
          ORDER BY started_at ASC`;
                return { success: true, history: all };
            }

            default:
                return { success: false, error: `Unknown db_migrate action: ${action}. Note: For safety, use "npx prisma migrate" directly for actual migrations.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── db_analyze ──────────────────────────────────────────────────
async function dbAnalyze(params) {
    const { action = 'explain', query, table, ...opts } = params;

    try {
        switch (action) {
            case 'explain': {
                if (!query) return { success: false, error: 'query is required' };
                const plan = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE ${query}`);
                return { success: true, plan, query };
            }

            case 'stats': {
                if (!table) return { success: false, error: 'table is required' };
                const stats = await prisma.$queryRaw`
          SELECT relname, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum, 
                 last_analyze, last_autoanalyze
          FROM pg_stat_user_tables
          WHERE relname = ${table}`;
                return { success: true, table, stats: stats[0] || null };
            }

            case 'slow_queries': {
                try {
                    const slow = await prisma.$queryRaw`
            SELECT query, calls, mean_exec_time, total_exec_time
            FROM pg_stat_statements
            ORDER BY mean_exec_time DESC
            LIMIT ${opts.limit || 10}`;
                    return { success: true, queries: slow };
                } catch {
                    return { success: true, queries: [], note: 'pg_stat_statements extension not enabled' };
                }
            }

            case 'connections': {
                const conns = await prisma.$queryRaw`
          SELECT count(*) as total,
                 count(*) FILTER (WHERE state = 'active') as active,
                 count(*) FILTER (WHERE state = 'idle') as idle,
                 count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
          FROM pg_stat_activity`;
                return { success: true, connections: conns[0] };
            }

            case 'health': {
                const dbSize = await prisma.$queryRaw`SELECT pg_size_pretty(pg_database_size(current_database())) as size`;
                const uptime = await prisma.$queryRaw`SELECT now() - pg_postmaster_start_time() as uptime`;
                const version = await prisma.$queryRaw`SELECT version()`;
                return {
                    success: true,
                    health: {
                        size: dbSize[0]?.size,
                        uptime: uptime[0]?.uptime,
                        version: version[0]?.version,
                    },
                };
            }

            default:
                return { success: false, error: `Unknown db_analyze action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── db_connect ──────────────────────────────────────────────────
async function dbConnect(params) {
    const { action = 'test', ...opts } = params;

    try {
        switch (action) {
            case 'test': {
                // Test the current Prisma connection
                await prisma.$queryRaw`SELECT 1`;
                return { success: true, connected: true, provider: 'postgresql' };
            }

            case 'info': {
                const version = await prisma.$queryRaw`SELECT version()`;
                const db = await prisma.$queryRaw`SELECT current_database() as name, current_user as user`;
                return {
                    success: true,
                    database: db[0]?.name,
                    user: db[0]?.user,
                    version: version[0]?.version,
                };
            }

            case 'save': {
                // Save a named connection to DB
                const { userId, name, provider, host, port, database, username, password } = opts;
                if (!userId || !name || !provider) return { success: false, error: 'userId, name, provider required' };
                const crypto = await import('crypto');
                const encPassword = password ? crypto.createHash('sha256').update(password).digest('hex') : '';
                const conn = await prisma.dbConnection.upsert({
                    where: { userId_name: { userId, name } },
                    update: { provider, host: host || 'localhost', port: port || 5432, database: database || '', username: username || '', passwordEnc: encPassword },
                    create: { userId, name, provider, host: host || 'localhost', port: port || 5432, database: database || '', username: username || '', passwordEnc: encPassword },
                });
                return { success: true, connection: { id: conn.id, name: conn.name, provider: conn.provider } };
            }

            case 'list': {
                if (!opts.userId) return { success: false, error: 'userId required' };
                const conns = await prisma.dbConnection.findMany({
                    where: { userId: opts.userId },
                    select: { id: true, name: true, provider: true, host: true, port: true, database: true, active: true, lastUsedAt: true },
                });
                return { success: true, connections: conns };
            }

            default:
                return { success: false, error: `Unknown db_connect action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export default {
    dbQuery,
    dbSchema,
    dbBackup,
    dbMigrate,
    dbAnalyze,
    dbConnect,
};
