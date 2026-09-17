/**
 * FILE SYSTEM EXTENDED TOOLS (5 tools)
 * write_file, file_exists, get_project_tree,
 * file_watch, sync_files
 * 
 * All state persisted in PostgreSQL via Prisma — NO localStorage
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../prisma.js';

const SANDBOX_ROOT = path.resolve(process.cwd(), 'sandbox');

function safePath(filePath) {
    const resolved = path.resolve(SANDBOX_ROOT, filePath);
    if (!resolved.startsWith(SANDBOX_ROOT)) throw new Error('Path traversal blocked');
    return resolved;
}

// ── write_file ──────────────────────────────────────────────────
async function writeFile(params) {
    const { filePath, content, encoding = 'utf-8', mode = 'write', ...opts } = params;
    if (!filePath) return { success: false, error: 'filePath is required' };
    if (content === undefined || content === null) return { success: false, error: 'content is required' };

    try {
        const absPath = safePath(filePath);
        const dir = path.dirname(absPath);
        await fs.mkdir(dir, { recursive: true });

        switch (mode) {
            case 'write':
                await fs.writeFile(absPath, content, encoding);
                break;
            case 'append':
                await fs.appendFile(absPath, content, encoding);
                break;
            case 'prepend': {
                const existing = await fs.readFile(absPath, encoding).catch(() => '');
                await fs.writeFile(absPath, content + existing, encoding);
                break;
            }
            case 'insert': {
                const line = opts.line || 1;
                const existing = await fs.readFile(absPath, encoding).catch(() => '');
                const lines = existing.split('\n');
                lines.splice(line - 1, 0, content);
                await fs.writeFile(absPath, lines.join('\n'), encoding);
                break;
            }
            default:
                return { success: false, error: `Unknown mode: ${mode}` };
        }

        const stat = await fs.stat(absPath);
        return {
            success: true,
            filePath,
            bytes: stat.size,
            mode,
            encoding,
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── file_exists ─────────────────────────────────────────────────
async function fileExists(params) {
    const { filePath, paths } = params;

    try {
        if (paths && Array.isArray(paths)) {
            const results = {};
            for (const p of paths) {
                try {
                    const absPath = safePath(p);
                    const stat = await fs.stat(absPath);
                    results[p] = { exists: true, isFile: stat.isFile(), isDirectory: stat.isDirectory(), size: stat.size };
                } catch {
                    results[p] = { exists: false };
                }
            }
            return { success: true, results };
        }

        if (!filePath) return { success: false, error: 'filePath or paths required' };

        const absPath = safePath(filePath);
        try {
            const stat = await fs.stat(absPath);
            return {
                success: true,
                exists: true,
                filePath,
                isFile: stat.isFile(),
                isDirectory: stat.isDirectory(),
                size: stat.size,
                modified: stat.mtime.toISOString(),
                created: stat.birthtime.toISOString(),
            };
        } catch {
            return { success: true, exists: false, filePath };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── get_project_tree ────────────────────────────────────────────
async function getProjectTree(params) {
    const { rootPath = '.', maxDepth = 5, includeFiles = true, excludePatterns = [], showSize = false, showHidden = false } = params;

    try {
        const absRoot = safePath(rootPath);
        const defaultExcludes = ['node_modules', '.git', '.next', 'dist', '__pycache__', '.cache', 'coverage'];
        const excludes = [...defaultExcludes, ...excludePatterns];

        async function buildTree(dir, depth = 0, prefix = '') {
            if (depth > maxDepth) return { truncated: true };
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const filtered = entries.filter(e => {
                if (!showHidden && e.name.startsWith('.')) return false;
                if (excludes.some(ex => e.name === ex || e.name.match(new RegExp(ex)))) return false;
                return true;
            });
            filtered.sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) return -1;
                if (!a.isDirectory() && b.isDirectory()) return 1;
                return a.name.localeCompare(b.name);
            });

            const children = [];
            let totalFiles = 0;
            let totalDirs = 0;
            let totalSize = 0;

            for (const entry of filtered) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    totalDirs++;
                    const sub = await buildTree(fullPath, depth + 1, prefix + '  ');
                    children.push({
                        name: entry.name + '/',
                        type: 'directory',
                        children: sub.children || [],
                        stats: sub.truncated ? { truncated: true } : { files: sub.totalFiles, dirs: sub.totalDirs },
                    });
                    totalFiles += sub.totalFiles || 0;
                    totalDirs += sub.totalDirs || 0;
                    totalSize += sub.totalSize || 0;
                } else if (includeFiles) {
                    totalFiles++;
                    const node = { name: entry.name, type: 'file' };
                    if (showSize) {
                        const stat = await fs.stat(fullPath);
                        node.size = stat.size;
                        totalSize += stat.size;
                    }
                    children.push(node);
                }
            }

            return { children, totalFiles, totalDirs, totalSize };
        }

        const tree = await buildTree(absRoot);

        // Also build ASCII tree
        function toAscii(items, indent = '') {
            let result = '';
            items.forEach((item, i) => {
                const isLast = i === items.length - 1;
                const connector = isLast ? '└── ' : '├── ';
                const sizeStr = item.size ? ` (${humanSize(item.size)})` : '';
                result += indent + connector + item.name + sizeStr + '\n';
                if (item.children?.length) {
                    result += toAscii(item.children, indent + (isLast ? '    ' : '│   '));
                }
            });
            return result;
        }

        const ascii = path.basename(absRoot) + '/\n' + toAscii(tree.children || []);

        return {
            success: true,
            tree: tree.children,
            ascii,
            stats: { files: tree.totalFiles, directories: tree.totalDirs, totalSize: tree.totalSize },
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── file_watch ──────────────────────────────────────────────────
async function fileWatch(params) {
    const { action = 'create', userId, ...opts } = params;
    if (!userId) return { success: false, error: 'userId is required' };

    try {
        switch (action) {
            case 'create': {
                const { watchPath, pattern = '*', events = ['change', 'create', 'delete'] } = opts;
                if (!watchPath) return { success: false, error: 'watchPath required' };
                const watch = await prisma.fileWatch.create({
                    data: { userId, watchPath, pattern, events, active: true },
                });
                return { success: true, watch: { id: watch.id, watchPath, pattern, events } };
            }

            case 'list': {
                const watches = await prisma.fileWatch.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                });
                return { success: true, watches };
            }

            case 'check': {
                // Check for changes since last check
                const { watchPath, pattern = '*' } = opts;
                if (!watchPath) return { success: false, error: 'watchPath required' };
                const absPath = safePath(watchPath);

                try {
                    const entries = await fs.readdir(absPath, { withFileTypes: true, recursive: true });
                    const files = [];
                    for (const entry of entries) {
                        if (entry.isFile()) {
                            const fullPath = path.join(entry.parentPath || absPath, entry.name);
                            const stat = await fs.stat(fullPath);
                            const hash = crypto.createHash('md5').update(await fs.readFile(fullPath)).digest('hex');
                            files.push({
                                name: entry.name,
                                path: path.relative(absPath, fullPath),
                                size: stat.size,
                                modified: stat.mtime.toISOString(),
                                hash,
                            });
                        }
                    }
                    return { success: true, files, count: files.length, checkedAt: new Date().toISOString() };
                } catch (err) {
                    return { success: false, error: `Can't read ${watchPath}: ${err.message}` };
                }
            }

            case 'delete': {
                if (!opts.id) return { success: false, error: 'watch id required' };
                await prisma.fileWatch.delete({ where: { id: opts.id } });
                return { success: true, deleted: true };
            }

            default:
                return { success: false, error: `Unknown file_watch action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── sync_files ──────────────────────────────────────────────────
async function syncFiles(params) {
    const { action = 'diff', source, target, ...opts } = params;

    try {
        switch (action) {
            case 'diff': {
                if (!source || !target) return { success: false, error: 'source and target required' };
                const absSource = safePath(source);
                const absTarget = safePath(target);

                async function getFileMap(dir) {
                    const map = {};
                    try {
                        const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
                        for (const entry of entries) {
                            if (entry.isFile()) {
                                const fullPath = path.join(entry.parentPath || dir, entry.name);
                                const relativePath = path.relative(dir, fullPath);
                                const stat = await fs.stat(fullPath);
                                const content = await fs.readFile(fullPath);
                                map[relativePath] = {
                                    size: stat.size,
                                    modified: stat.mtime,
                                    hash: crypto.createHash('md5').update(content).digest('hex'),
                                };
                            }
                        }
                    } catch { /* dir doesn't exist */ }
                    return map;
                }

                const sourceMap = await getFileMap(absSource);
                const targetMap = await getFileMap(absTarget);

                const added = Object.keys(sourceMap).filter(f => !targetMap[f]);
                const deleted = Object.keys(targetMap).filter(f => !sourceMap[f]);
                const modified = Object.keys(sourceMap)
                    .filter(f => targetMap[f] && sourceMap[f].hash !== targetMap[f].hash);
                const unchanged = Object.keys(sourceMap)
                    .filter(f => targetMap[f] && sourceMap[f].hash === targetMap[f].hash);

                return {
                    success: true,
                    source,
                    target,
                    added: added.length,
                    deleted: deleted.length,
                    modified: modified.length,
                    unchanged: unchanged.length,
                    files: { added, deleted, modified },
                };
            }

            case 'sync': {
                if (!source || !target) return { success: false, error: 'source and target required' };
                const absSource = safePath(source);
                const absTarget = safePath(target);
                const dryRun = opts.dryRun !== false;

                // Get diff first
                const diffResult = await syncFiles({ action: 'diff', source, target });
                if (!diffResult.success) return diffResult;

                if (dryRun) {
                    return {
                        success: true,
                        dryRun: true,
                        wouldAdd: diffResult.files.added.length,
                        wouldModify: diffResult.files.modified.length,
                        wouldDelete: opts.deleteExtra ? diffResult.files.deleted.length : 0,
                        files: diffResult.files,
                    };
                }

                let copied = 0;
                // Copy new and modified files
                for (const f of [...diffResult.files.added, ...diffResult.files.modified]) {
                    const srcPath = path.join(absSource, f);
                    const dstPath = path.join(absTarget, f);
                    await fs.mkdir(path.dirname(dstPath), { recursive: true });
                    await fs.copyFile(srcPath, dstPath);
                    copied++;
                }

                let deleted = 0;
                if (opts.deleteExtra) {
                    for (const f of diffResult.files.deleted) {
                        await fs.unlink(path.join(absTarget, f));
                        deleted++;
                    }
                }

                return { success: true, copied, deleted, synced: true };
            }

            case 'backup': {
                if (!source) return { success: false, error: 'source required' };
                const absSource = safePath(source);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupDir = safePath(opts.backupDir || `backups/${path.basename(source)}-${timestamp}`);
                await fs.mkdir(backupDir, { recursive: true });

                async function copyDir(src, dst) {
                    const entries = await fs.readdir(src, { withFileTypes: true });
                    let count = 0;
                    for (const entry of entries) {
                        const srcPath = path.join(src, entry.name);
                        const dstPath = path.join(dst, entry.name);
                        if (entry.isDirectory()) {
                            await fs.mkdir(dstPath, { recursive: true });
                            count += await copyDir(srcPath, dstPath);
                        } else {
                            await fs.copyFile(srcPath, dstPath);
                            count++;
                        }
                    }
                    return count;
                }

                const filesCopied = await copyDir(absSource, backupDir);
                return { success: true, backupDir: path.relative(SANDBOX_ROOT, backupDir), files: filesCopied };
            }

            default:
                return { success: false, error: `Unknown sync_files action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

function humanSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${Math.round(bytes * 10) / 10} ${units[i]}`;
}

export default {
    writeFile,
    fileExists,
    getProjectTree,
    fileWatch,
    syncFiles,
};
