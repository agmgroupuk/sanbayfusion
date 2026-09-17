/**
 * ============================================================================
 * FILE SYSTEM TOOLS V2
 * ============================================================================
 * file_search, file_compress, modify_file, list_folders,
 * zip_files, unzip_files, file_watch, sync_files,
 * file_hash, file_diff, file_permissions
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const FILESYSTEM_TOOL_DEFINITIONS = [
    {
        name: 'file_search',
        description: 'Search for files by name, content, size, date, type. Supports glob patterns, regex, and recursive directory traversal.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['find', 'grep', 'duplicates', 'recent', 'large', 'tree'],
                    description: 'Search action',
                },
                directory: { type: 'string', description: 'Starting directory. Default: cwd' },
                pattern: { type: 'string', description: '[find/grep] Name glob or content regex' },
                extension: { type: 'string', description: '[find] Filter by extension. E.g. ".js", ".ts"' },
                minSize: { type: 'number', description: '[large] Min file size in bytes' },
                maxSize: { type: 'number', description: 'Max file size in bytes' },
                maxDepth: { type: 'number', description: 'Max directory depth. Default: 10' },
                limit: { type: 'number', description: 'Max results. Default: 50' },
                since: { type: 'string', description: '[recent] Show files modified since ISO date' },
                includeHidden: { type: 'boolean', description: 'Include hidden files/dirs. Default: false' },
            },
            required: ['action'],
        },
    },
    {
        name: 'file_compress',
        description: 'Compress and decompress files: gzip, tar.gz. Create archives, extract files, list archive contents.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['gzip', 'gunzip', 'tar_create', 'tar_extract', 'tar_list', 'zip_create', 'zip_extract'],
                    description: 'Compression action',
                },
                input: { type: 'string', description: 'Input file or directory path' },
                output: { type: 'string', description: 'Output file path' },
                files: { type: 'array', items: { type: 'string' }, description: '[tar_create/zip_create] Files to include' },
                level: { type: 'number', description: 'Compression level 1-9. Default: 6' },
            },
            required: ['action', 'input'],
        },
    },
    {
        name: 'modify_file',
        description: 'Edit an existing file with precise operations: replace text, append content, find & replace with regex, or insert at a specific line number.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['replace', 'append', 'prepend', 'find_replace', 'insert_at_line', 'delete_lines', 'replace_lines'],
                    description: 'Edit operation to perform'
                },
                filePath: { type: 'string', description: 'Path to the file to modify' },
                oldText: { type: 'string', description: '[replace/find_replace] Text to find' },
                newText: { type: 'string', description: '[replace/find_replace/insert_at_line/replace_lines] New text' },
                content: { type: 'string', description: '[append/prepend] Content to add' },
                line: { type: 'number', description: '[insert_at_line] Line number to insert at (1-based)' },
                startLine: { type: 'number', description: '[delete_lines/replace_lines] Start line (1-based)' },
                endLine: { type: 'number', description: '[delete_lines/replace_lines] End line (1-based, inclusive)' },
                isRegex: { type: 'boolean', description: '[find_replace] Treat oldText as regex. Default: false' },
                flags: { type: 'string', description: '[find_replace] Regex flags e.g. "gi". Default: "g"' },
                createBackup: { type: 'boolean', description: 'Create .bak backup before editing. Default: false' },
            },
            required: ['action', 'filePath'],
        },
    },
    {
        name: 'list_folders',
        description: 'List directories in a given path. Filter by name pattern, depth, hidden folders. Returns directory names with metadata (size, item count, modified date).',
        input_schema: {
            type: 'object',
            properties: {
                directory: { type: 'string', description: 'Path to list. Default: cwd' },
                pattern: { type: 'string', description: 'Glob/regex pattern to filter folder names' },
                maxDepth: { type: 'number', description: 'Max recursion depth. Default: 1 (immediate children only)' },
                includeHidden: { type: 'boolean', description: 'Include hidden dirs (starting with .). Default: false' },
                includeStats: { type: 'boolean', description: 'Include item count and size. Default: true' },
                sortBy: { type: 'string', enum: ['name', 'modified', 'size', 'items'], description: 'Sort order. Default: name' },
            },
            required: [],
        },
    },
    {
        name: 'zip_files',
        description: 'Compress files and directories into a ZIP archive. Supports glob patterns, recursive dirs, exclusion filters, and compression level.',
        input_schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Files and directories to compress'
                },
                output: { type: 'string', description: 'Output ZIP file path' },
                baseDir: { type: 'string', description: 'Base directory for relative paths. Default: cwd' },
                exclude: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Patterns to exclude (e.g. "node_modules", "*.log")'
                },
                compressionLevel: { type: 'number', description: 'Compression level 0-9. Default: 6' },
                includeHidden: { type: 'boolean', description: 'Include hidden files. Default: false' },
            },
            required: ['files', 'output'],
        },
    },
    {
        name: 'unzip_files',
        description: 'Extract a ZIP archive. Supports extracting all or specific files, listing contents, and target directory selection.',
        input_schema: {
            type: 'object',
            properties: {
                zipPath: { type: 'string', description: 'Path to the ZIP file' },
                outputDir: { type: 'string', description: 'Extraction target directory. Default: cwd' },
                files: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific files to extract (empty = all)'
                },
                overwrite: { type: 'boolean', description: 'Overwrite existing files. Default: true' },
                listOnly: { type: 'boolean', description: 'Only list contents without extracting. Default: false' },
            },
            required: ['zipPath'],
        },
    },
    {
        name: 'file_watch',
        description: 'Watch files and directories for changes, creation, deletion events. Returns change events within a polling window.',
        input_schema: {
            type: 'object',
            properties: {
                paths: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Files or directories to watch'
                },
                action: {
                    type: 'string',
                    enum: ['start', 'stop', 'status', 'get_events'],
                    description: 'Watch action'
                },
                watchId: { type: 'string', description: 'Watch ID (for stop/status/get_events)' },
                events: {
                    type: 'array',
                    items: { type: 'string', enum: ['change', 'create', 'delete', 'rename'] },
                    description: 'Events to watch for. Default: all'
                },
                recursive: { type: 'boolean', description: 'Watch subdirectories. Default: true' },
                ignore: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Patterns to ignore (e.g. "node_modules", "*.log")'
                },
                pollInterval: { type: 'number', description: 'Poll interval in ms. Default: 1000' },
            },
            required: ['action'],
        },
    },
    {
        name: 'sync_files',
        description: 'Bidirectional or one-way file synchronization between directories. Compare, preview, and sync with conflict resolution.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['compare', 'sync', 'preview', 'status'],
                    description: 'Sync action'
                },
                source: { type: 'string', description: 'Source directory path' },
                target: { type: 'string', description: 'Target directory path' },
                direction: {
                    type: 'string',
                    enum: ['source_to_target', 'target_to_source', 'bidirectional'],
                    description: 'Sync direction. Default: source_to_target'
                },
                exclude: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Patterns to exclude'
                },
                dryRun: { type: 'boolean', description: 'Preview changes without applying. Default: false' },
                deleteExtra: { type: 'boolean', description: 'Delete files in target not in source. Default: false' },
                conflictResolution: {
                    type: 'string',
                    enum: ['newer_wins', 'source_wins', 'target_wins', 'skip'],
                    description: 'How to resolve conflicts. Default: newer_wins'
                },
            },
            required: ['action', 'source', 'target'],
        },
    },
    {
        name: 'file_hash',
        description: 'Compute cryptographic checksums for files. Supports MD5, SHA1, SHA256, SHA512. Verify integrity, compare files, batch hashing.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['hash', 'verify', 'compare', 'batch'],
                    description: 'Hash action'
                },
                filePath: { type: 'string', description: 'File to hash' },
                algorithm: {
                    type: 'string',
                    enum: ['md5', 'sha1', 'sha256', 'sha512'],
                    description: 'Hash algorithm. Default: sha256'
                },
                expectedHash: { type: 'string', description: '[verify] Expected hash to compare against' },
                otherFile: { type: 'string', description: '[compare] Second file to compare' },
                files: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '[batch] Multiple files to hash'
                },
            },
            required: ['action'],
        },
    },
    {
        name: 'file_diff',
        description: 'Compare two files and show differences. Supports unified diff, side-by-side, line-by-line, and stat comparison.',
        input_schema: {
            type: 'object',
            properties: {
                fileA: { type: 'string', description: 'First file (original)' },
                fileB: { type: 'string', description: 'Second file (modified)' },
                format: {
                    type: 'string',
                    enum: ['unified', 'context', 'stat', 'json'],
                    description: 'Output format. Default: unified'
                },
                contextLines: { type: 'number', description: 'Number of context lines. Default: 3' },
                ignoreWhitespace: { type: 'boolean', description: 'Ignore whitespace changes. Default: false' },
                ignoreCase: { type: 'boolean', description: 'Case-insensitive comparison. Default: false' },
            },
            required: ['fileA', 'fileB'],
        },
    },
    {
        name: 'file_permissions',
        description: 'Get or set file permissions, ownership info, and attributes. Check access rights, make executable, change modes.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['get', 'set', 'check_access', 'make_executable', 'info'],
                    description: 'Permission action'
                },
                filePath: { type: 'string', description: 'File or directory path' },
                mode: { type: 'string', description: '[set] Octal mode string e.g. "755", "644"' },
                recursive: { type: 'boolean', description: '[set] Apply recursively to directory contents. Default: false' },
                checkPermission: {
                    type: 'string',
                    enum: ['read', 'write', 'execute'],
                    description: '[check_access] Permission to check'
                },
            },
            required: ['action', 'filePath'],
        },
    },
];

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeFileSearch(input) {
    const { action, directory = process.cwd(), pattern, extension, minSize = 0, maxSize, maxDepth = 10, limit = 50, since, includeHidden = false } = input;

    switch (action) {
        case 'find': {
            const results = [];
            const regex = pattern ? new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i') : null;
            walkDir(directory, 0, maxDepth, includeHidden, (filePath, stat) => {
                if (results.length >= limit) return;
                const name = path.basename(filePath);
                if (regex && !regex.test(name)) return;
                if (extension && !name.endsWith(extension)) return;
                if (stat.size < minSize) return;
                if (maxSize && stat.size > maxSize) return;
                results.push({ path: filePath, size: stat.size, modified: stat.mtime.toISOString() });
            });
            return JSON.stringify({ status: 'success', directory, matchCount: results.length, results });
        }
        case 'grep': {
            if (!pattern) return JSON.stringify({ status: 'error', error: 'pattern required for grep' });
            const results = [];
            const regex = new RegExp(pattern, 'gi');
            walkDir(directory, 0, maxDepth, includeHidden, (filePath, stat) => {
                if (results.length >= limit) return;
                if (stat.size > 5 * 1024 * 1024) return; // skip files > 5MB
                if (extension && !filePath.endsWith(extension)) return;
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const lines = content.split('\n');
                    const matches = [];
                    lines.forEach((line, i) => {
                        regex.lastIndex = 0;
                        if (regex.test(line)) matches.push({ line: i + 1, content: line.trim().slice(0, 200) });
                    });
                    if (matches.length) results.push({ file: filePath, matches: matches.slice(0, 10), totalMatches: matches.length });
                } catch { }
            });
            return JSON.stringify({ status: 'success', pattern, filesWithMatches: results.length, results });
        }
        case 'duplicates': {
            const sizeMap = {};
            walkDir(directory, 0, maxDepth, includeHidden, (filePath, stat) => {
                if (!stat.isFile()) return;
                const key = stat.size;
                if (!sizeMap[key]) sizeMap[key] = [];
                sizeMap[key].push(filePath);
            });
            const duplicates = Object.entries(sizeMap)
                .filter(([, files]) => files.length > 1)
                .map(([size, files]) => ({ size: parseInt(size), count: files.length, files }))
                .sort((a, b) => b.size - a.size)
                .slice(0, limit);
            return JSON.stringify({ status: 'success', potentialDuplicateGroups: duplicates.length, duplicates, note: 'Based on file size. For accurate dedup, compare checksums.' });
        }
        case 'recent': {
            const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
            const results = [];
            walkDir(directory, 0, maxDepth, includeHidden, (filePath, stat) => {
                if (stat.mtime >= sinceDate) results.push({ path: filePath, size: stat.size, modified: stat.mtime.toISOString() });
            });
            results.sort((a, b) => new Date(b.modified) - new Date(a.modified));
            return JSON.stringify({ status: 'success', since: sinceDate.toISOString(), count: results.length, results: results.slice(0, limit) });
        }
        case 'large': {
            const results = [];
            walkDir(directory, 0, maxDepth, includeHidden, (filePath, stat) => {
                if (stat.size >= (minSize || 1024 * 1024)) results.push({ path: filePath, size: stat.size, sizeHuman: formatBytes(stat.size) });
            });
            results.sort((a, b) => b.size - a.size);
            return JSON.stringify({ status: 'success', count: results.length, results: results.slice(0, limit) });
        }
        case 'tree': {
            const tree = buildTree(directory, 0, Math.min(maxDepth, 4), includeHidden);
            return JSON.stringify({ status: 'success', directory, tree });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown search action: ${action}` });
    }
}

async function executeFileCompress(input) {
    const { action, input: inputPath, output: outputPath, files, level = 6 } = input;

    switch (action) {
        case 'gzip': {
            if (!fs.existsSync(inputPath)) return JSON.stringify({ status: 'error', error: `File not found: ${inputPath}` });
            const outFile = outputPath || `${inputPath}.gz`;
            const gzip = createGzip({ level });
            const source = fs.createReadStream(inputPath);
            const dest = fs.createWriteStream(outFile);
            await pipeline(source, gzip, dest);
            const origSize = fs.statSync(inputPath).size;
            const compSize = fs.statSync(outFile).size;
            return JSON.stringify({ status: 'success', input: inputPath, output: outFile, originalSize: origSize, compressedSize: compSize, ratio: ((1 - compSize / origSize) * 100).toFixed(1) + '%' });
        }
        case 'gunzip': {
            if (!fs.existsSync(inputPath)) return JSON.stringify({ status: 'error', error: `File not found: ${inputPath}` });
            const outFile = outputPath || inputPath.replace(/\.gz$/, '');
            const gunzip = createGunzip();
            const source = fs.createReadStream(inputPath);
            const dest = fs.createWriteStream(outFile);
            await pipeline(source, gunzip, dest);
            return JSON.stringify({ status: 'success', input: inputPath, output: outFile, size: fs.statSync(outFile).size });
        }
        case 'tar_create': {
            const target = outputPath || `${inputPath}.tar.gz`;
            const sourceFiles = files?.length ? files.join(' ') : inputPath;
            try {
                execSync(`tar -czf "${target}" ${sourceFiles}`, { cwd: path.dirname(inputPath), timeout: 60000 });
                return JSON.stringify({ status: 'success', archive: target, size: fs.statSync(target).size });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'tar_extract': {
            if (!fs.existsSync(inputPath)) return JSON.stringify({ status: 'error', error: `File not found: ${inputPath}` });
            const dest = outputPath || path.dirname(inputPath);
            try {
                execSync(`tar -xzf "${inputPath}" -C "${dest}"`, { timeout: 60000 });
                return JSON.stringify({ status: 'success', archive: inputPath, extractedTo: dest });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'tar_list': {
            if (!fs.existsSync(inputPath)) return JSON.stringify({ status: 'error', error: `File not found: ${inputPath}` });
            try {
                const out = execSync(`tar -tzf "${inputPath}"`, { encoding: 'utf-8', timeout: 30000 });
                const entries = out.trim().split('\n');
                return JSON.stringify({ status: 'success', archive: inputPath, entryCount: entries.length, entries: entries.slice(0, 200) });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'zip_create': {
            const target = outputPath || `${inputPath}.zip`;
            const sourceFiles = files?.length ? files.join(' ') : inputPath;
            try {
                execSync(`zip -r "${target}" ${sourceFiles}`, { cwd: path.dirname(inputPath), timeout: 60000 });
                return JSON.stringify({ status: 'success', archive: target, size: fs.statSync(target).size });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'zip_extract': {
            if (!fs.existsSync(inputPath)) return JSON.stringify({ status: 'error', error: `File not found: ${inputPath}` });
            const dest = outputPath || path.dirname(inputPath);
            try {
                execSync(`unzip -o "${inputPath}" -d "${dest}"`, { timeout: 60000 });
                return JSON.stringify({ status: 'success', archive: inputPath, extractedTo: dest });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown compress action: ${action}` });
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function walkDir(dir, depth, maxDepth, includeHidden, callback) {
    if (depth > maxDepth) return;
    try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            if (!includeHidden && entry.startsWith('.')) continue;
            if (entry === 'node_modules' || entry === '.git') continue;
            const fullPath = path.join(dir, entry);
            try {
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    walkDir(fullPath, depth + 1, maxDepth, includeHidden, callback);
                } else {
                    callback(fullPath, stat);
                }
            } catch { }
        }
    } catch { }
}

function buildTree(dir, depth, maxDepth, includeHidden) {
    if (depth > maxDepth) return { name: '...', type: 'truncated' };
    const result = { name: path.basename(dir), type: 'directory', children: [] };
    try {
        const entries = fs.readdirSync(dir).sort();
        for (const entry of entries) {
            if (!includeHidden && entry.startsWith('.')) continue;
            if (entry === 'node_modules' || entry === '.git') continue;
            const fullPath = path.join(dir, entry);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                result.children.push(buildTree(fullPath, depth + 1, maxDepth, includeHidden));
            } else {
                result.children.push({ name: entry, type: 'file', size: stat.size });
            }
        }
    } catch { }
    return result;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// MODIFY FILE EXECUTOR
// ============================================================================
async function executeModifyFile(input) {
    const { action, filePath, oldText, newText, content, line, startLine, endLine, isRegex, flags = 'g', createBackup } = input;
    if (!filePath) return { success: false, error: 'filePath required' };
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) return { success: false, error: `File not found: ${absPath}` };

    if (createBackup) {
        fs.copyFileSync(absPath, absPath + '.bak');
    }

    let fileContent = fs.readFileSync(absPath, 'utf-8');
    const originalLength = fileContent.length;

    switch (action) {
        case 'replace': {
            if (!oldText) return { success: false, error: 'oldText required for replace' };
            if (!fileContent.includes(oldText)) return { success: false, error: 'oldText not found in file' };
            fileContent = fileContent.replace(oldText, newText || '');
            break;
        }
        case 'append': {
            if (!content) return { success: false, error: 'content required for append' };
            fileContent += content;
            break;
        }
        case 'prepend': {
            if (!content) return { success: false, error: 'content required for prepend' };
            fileContent = content + fileContent;
            break;
        }
        case 'find_replace': {
            if (!oldText) return { success: false, error: 'oldText required for find_replace' };
            const regex = isRegex ? new RegExp(oldText, flags) : new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
            const matchCount = (fileContent.match(regex) || []).length;
            if (matchCount === 0) return { success: false, error: 'Pattern not found in file' };
            fileContent = fileContent.replace(regex, newText || '');
            return writeAndReport(absPath, fileContent, originalLength, { action, matchesReplaced: matchCount });
        }
        case 'insert_at_line': {
            if (!line) return { success: false, error: 'line required for insert_at_line' };
            if (!newText) return { success: false, error: 'newText required for insert_at_line' };
            const lines = fileContent.split('\n');
            if (line < 1 || line > lines.length + 1) return { success: false, error: `Line ${line} out of range (1-${lines.length + 1})` };
            lines.splice(line - 1, 0, newText);
            fileContent = lines.join('\n');
            break;
        }
        case 'delete_lines': {
            if (!startLine || !endLine) return { success: false, error: 'startLine and endLine required' };
            const lines = fileContent.split('\n');
            if (startLine < 1 || endLine > lines.length) return { success: false, error: `Line range out of bounds (1-${lines.length})` };
            const deleted = lines.splice(startLine - 1, endLine - startLine + 1);
            fileContent = lines.join('\n');
            return writeAndReport(absPath, fileContent, originalLength, { action, deletedLines: deleted.length });
        }
        case 'replace_lines': {
            if (!startLine || !endLine || newText === undefined) return { success: false, error: 'startLine, endLine, newText required' };
            const lines = fileContent.split('\n');
            if (startLine < 1 || endLine > lines.length) return { success: false, error: `Line range out of bounds` };
            lines.splice(startLine - 1, endLine - startLine + 1, newText);
            fileContent = lines.join('\n');
            break;
        }
        default:
            return { success: false, error: `Unknown modify_file action: ${action}` };
    }

    return writeAndReport(absPath, fileContent, originalLength, { action });
}

function writeAndReport(absPath, content, originalLength, extra = {}) {
    fs.writeFileSync(absPath, content, 'utf-8');
    return {
        success: true,
        filePath: absPath,
        originalSize: originalLength,
        newSize: content.length,
        ...extra
    };
}

// ============================================================================
// LIST FOLDERS EXECUTOR
// ============================================================================
async function executeListFolders(input) {
    const { directory = process.cwd(), pattern, maxDepth = 1, includeHidden = false, includeStats = true, sortBy = 'name' } = input;
    const absDir = path.resolve(directory);
    if (!fs.existsSync(absDir)) return { success: false, error: `Directory not found: ${absDir}` };

    const folders = [];
    const regex = pattern ? new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i') : null;

    function scan(dir, depth) {
        if (depth > maxDepth) return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                if (!includeHidden && entry.name.startsWith('.')) continue;
                if (regex && !regex.test(entry.name)) continue;

                const fullPath = path.join(dir, entry.name);
                const relPath = path.relative(absDir, fullPath);
                const info = { name: entry.name, path: relPath };

                if (includeStats) {
                    try {
                        const stat = fs.statSync(fullPath);
                        info.modified = stat.mtime.toISOString();
                        const items = fs.readdirSync(fullPath);
                        info.itemCount = items.length;
                    } catch { info.itemCount = 0; }
                }

                folders.push(info);
                if (depth < maxDepth) scan(fullPath, depth + 1);
            }
        } catch { }
    }

    scan(absDir, 1);

    // Sort
    folders.sort((a, b) => {
        switch (sortBy) {
            case 'modified': return (b.modified || '').localeCompare(a.modified || '');
            case 'items': return (b.itemCount || 0) - (a.itemCount || 0);
            default: return a.name.localeCompare(b.name);
        }
    });

    return { success: true, directory: absDir, totalFolders: folders.length, folders };
}

// ============================================================================
// ZIP / UNZIP FILES EXECUTOR
// ============================================================================
async function executeZipFiles(input) {
    const { files, output, baseDir = process.cwd(), exclude = [], compressionLevel = 6, includeHidden = false } = input;
    if (!files || files.length === 0) return { success: false, error: 'files array required' };
    if (!output) return { success: false, error: 'output path required' };

    const absOutput = path.resolve(baseDir, output);
    const absBase = path.resolve(baseDir);

    // Build file list
    const filesToZip = [];
    for (const f of files) {
        const absF = path.resolve(absBase, f);
        if (!fs.existsSync(absF)) continue;
        const stat = fs.statSync(absF);
        if (stat.isDirectory()) {
            collectFiles(absF, absBase, filesToZip, exclude, includeHidden);
        } else {
            const rel = path.relative(absBase, absF);
            if (!shouldExclude(rel, exclude)) filesToZip.push(absF);
        }
    }

    if (filesToZip.length === 0) return { success: false, error: 'No files matched after exclusions' };

    // Use system zip command
    try {
        const fileArgs = filesToZip.map(f => path.relative(absBase, f)).join(' ');
        execSync(`cd "${absBase}" && zip -${compressionLevel} "${absOutput}" ${fileArgs}`, { stdio: 'pipe', timeout: 30000 });
        const stat = fs.statSync(absOutput);
        return { success: true, output: absOutput, fileCount: filesToZip.length, size: stat.size, sizeFormatted: formatBytes(stat.size) };
    } catch (e) {
        return { success: false, error: `zip failed: ${e.message}` };
    }
}

async function executeUnzipFiles(input) {
    const { zipPath, outputDir = process.cwd(), files = [], overwrite = true, listOnly = false } = input;
    const absZip = path.resolve(zipPath);
    if (!fs.existsSync(absZip)) return { success: false, error: `ZIP not found: ${absZip}` };

    if (listOnly) {
        try {
            const result = execSync(`unzip -l "${absZip}"`, { encoding: 'utf-8', timeout: 10000 });
            const lines = result.split('\n').filter(l => l.trim());
            return { success: true, zipPath: absZip, contents: result.substring(0, MAX_OUTPUT) };
        } catch (e) {
            return { success: false, error: `list failed: ${e.message}` };
        }
    }

    const absOut = path.resolve(outputDir);
    if (!fs.existsSync(absOut)) fs.mkdirSync(absOut, { recursive: true });

    try {
        const overwriteFlag = overwrite ? '-o' : '-n';
        const fileFilter = files.length > 0 ? files.join(' ') : '';
        execSync(`unzip ${overwriteFlag} "${absZip}" ${fileFilter} -d "${absOut}"`, { encoding: 'utf-8', timeout: 30000 });
        return { success: true, zipPath: absZip, outputDir: absOut, overwrite };
    } catch (e) {
        return { success: false, error: `unzip failed: ${e.message}` };
    }
}

function collectFiles(dir, base, result, exclude, includeHidden) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (!includeHidden && entry.name.startsWith('.')) continue;
            const full = path.join(dir, entry.name);
            const rel = path.relative(base, full);
            if (shouldExclude(rel, exclude)) continue;
            if (entry.isDirectory()) {
                collectFiles(full, base, result, exclude, includeHidden);
            } else {
                result.push(full);
            }
        }
    } catch { }
}

function shouldExclude(relPath, patterns) {
    return patterns.some(p => {
        if (relPath.includes(p)) return true;
        if (p.includes('*')) {
            const regex = new RegExp(p.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');
            return regex.test(relPath);
        }
        return false;
    });
}

// ============================================================================
// FILE WATCH EXECUTOR (polling-based)
// ============================================================================
const activeWatches = new Map();

function generateWatchId() {
    return `watch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

async function executeFileWatch(input) {
    const { action, paths = [], watchId, events = ['change', 'create', 'delete', 'rename'], recursive = true, ignore = [], pollInterval = 1000 } = input;

    switch (action) {
        case 'start': {
            if (!paths || paths.length === 0) return { success: false, error: 'paths required for start' };
            const id = generateWatchId();

            // Snapshot of files
            const snapshot = {};
            for (const p of paths) {
                const abs = path.resolve(p);
                if (fs.existsSync(abs)) {
                    snapshotDir(abs, snapshot, ignore, recursive);
                }
            }

            const watchInfo = {
                id, paths, events, recursive, ignore, pollInterval,
                snapshot, eventLog: [], startedAt: new Date(), active: true
            };

            // Polling interval
            watchInfo.timer = setInterval(() => {
                const newSnapshot = {};
                for (const p of paths) {
                    const abs = path.resolve(p);
                    if (fs.existsSync(abs)) snapshotDir(abs, newSnapshot, ignore, recursive);
                }

                // Detect changes
                for (const [file, newStat] of Object.entries(newSnapshot)) {
                    if (!watchInfo.snapshot[file]) {
                        if (events.includes('create')) watchInfo.eventLog.push({ event: 'create', path: file, time: new Date() });
                    } else if (newStat.mtime !== watchInfo.snapshot[file].mtime) {
                        if (events.includes('change')) watchInfo.eventLog.push({ event: 'change', path: file, time: new Date() });
                    }
                }
                for (const file of Object.keys(watchInfo.snapshot)) {
                    if (!newSnapshot[file]) {
                        if (events.includes('delete')) watchInfo.eventLog.push({ event: 'delete', path: file, time: new Date() });
                    }
                }

                watchInfo.snapshot = newSnapshot;
                // Cap log at 500
                if (watchInfo.eventLog.length > 500) watchInfo.eventLog = watchInfo.eventLog.slice(-500);
            }, pollInterval);

            activeWatches.set(id, watchInfo);
            return { success: true, watchId: id, paths, events, pollInterval, message: 'File watch started' };
        }

        case 'stop': {
            if (!watchId) return { success: false, error: 'watchId required for stop' };
            const w = activeWatches.get(watchId);
            if (!w) return { success: false, error: `Watch not found: ${watchId}` };
            clearInterval(w.timer);
            w.active = false;
            const eventCount = w.eventLog.length;
            activeWatches.delete(watchId);
            return { success: true, watchId, totalEvents: eventCount, message: 'Watch stopped' };
        }

        case 'status': {
            if (watchId) {
                const w = activeWatches.get(watchId);
                if (!w) return { success: false, error: `Watch not found: ${watchId}` };
                return { success: true, watchId, active: w.active, paths: w.paths, eventCount: w.eventLog.length, startedAt: w.startedAt };
            }
            const all = Array.from(activeWatches.entries()).map(([id, w]) => ({
                watchId: id, active: w.active, paths: w.paths, eventCount: w.eventLog.length
            }));
            return { success: true, activeWatches: all.length, watches: all };
        }

        case 'get_events': {
            if (!watchId) return { success: false, error: 'watchId required' };
            const w = activeWatches.get(watchId);
            if (!w) return { success: false, error: `Watch not found: ${watchId}` };
            const events_out = [...w.eventLog];
            w.eventLog = []; // Clear after read
            return { success: true, watchId, events: events_out, count: events_out.length };
        }

        default: return { success: false, error: `Unknown file_watch action: ${action}` };
    }
}

function snapshotDir(dir, snapshot, ignore, recursive) {
    try {
        const stat = fs.statSync(dir);
        if (stat.isFile()) {
            snapshot[dir] = { mtime: stat.mtimeMs, size: stat.size };
            return;
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            const full = path.join(dir, entry.name);
            if (shouldExclude(entry.name, ignore)) continue;
            if (entry.isDirectory() && recursive) {
                snapshotDir(full, snapshot, ignore, recursive);
            } else if (entry.isFile()) {
                const s = fs.statSync(full);
                snapshot[full] = { mtime: s.mtimeMs, size: s.size };
            }
        }
    } catch { }
}

// ============================================================================
// SYNC FILES EXECUTOR
// ============================================================================
async function executeSyncFiles(input) {
    const { action, source, target, direction = 'source_to_target', exclude = [], dryRun = false, deleteExtra = false, conflictResolution = 'newer_wins' } = input;
    const absSource = path.resolve(source);
    const absTarget = path.resolve(target);

    if (!fs.existsSync(absSource)) return { success: false, error: `Source not found: ${absSource}` };

    switch (action) {
        case 'compare':
        case 'preview': {
            const changes = compareDirectories(absSource, absTarget, exclude, direction, conflictResolution, deleteExtra);
            return { success: true, source: absSource, target: absTarget, direction, ...changes };
        }

        case 'sync': {
            const changes = compareDirectories(absSource, absTarget, exclude, direction, conflictResolution, deleteExtra);
            if (dryRun) return { success: true, dryRun: true, ...changes };

            let copied = 0, deleted = 0, errors = [];
            if (!fs.existsSync(absTarget)) fs.mkdirSync(absTarget, { recursive: true });

            for (const file of changes.toCopy) {
                try {
                    const src = path.join(absSource, file);
                    const dst = path.join(absTarget, file);
                    fs.mkdirSync(path.dirname(dst), { recursive: true });
                    fs.copyFileSync(src, dst);
                    copied++;
                } catch (e) { errors.push({ file, error: e.message }); }
            }

            if (deleteExtra) {
                for (const file of changes.toDelete) {
                    try {
                        fs.unlinkSync(path.join(absTarget, file));
                        deleted++;
                    } catch (e) { errors.push({ file, error: e.message }); }
                }
            }

            return { success: true, copied, deleted, errors: errors.length, errorDetails: errors.slice(0, 10) };
        }

        case 'status': {
            const srcExists = fs.existsSync(absSource);
            const tgtExists = fs.existsSync(absTarget);
            return { success: true, source: { path: absSource, exists: srcExists }, target: { path: absTarget, exists: tgtExists } };
        }

        default: return { success: false, error: `Unknown sync action: ${action}` };
    }
}

function compareDirectories(src, tgt, exclude, direction, conflictRes, deleteExtra) {
    const srcFiles = listAllFiles(src, src, exclude);
    const tgtFiles = fs.existsSync(tgt) ? listAllFiles(tgt, tgt, exclude) : {};

    const toCopy = [];
    const toDelete = [];
    const conflicts = [];

    for (const [rel, srcStat] of Object.entries(srcFiles)) {
        if (!tgtFiles[rel]) {
            toCopy.push(rel);
        } else {
            const tgtStat = tgtFiles[rel];
            if (srcStat.mtime > tgtStat.mtime) {
                toCopy.push(rel);
            } else if (srcStat.mtime < tgtStat.mtime) {
                conflicts.push({ file: rel, resolution: conflictRes });
                if (conflictRes === 'source_wins') toCopy.push(rel);
            }
        }
    }

    if (deleteExtra) {
        for (const rel of Object.keys(tgtFiles)) {
            if (!srcFiles[rel]) toDelete.push(rel);
        }
    }

    return { toCopy, toDelete, conflicts, totalSourceFiles: Object.keys(srcFiles).length, totalTargetFiles: Object.keys(tgtFiles).length };
}

function listAllFiles(dir, base, exclude) {
    const result = {};
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            const full = path.join(dir, entry.name);
            const rel = path.relative(base, full);
            if (shouldExclude(rel, exclude)) continue;
            if (entry.isDirectory()) {
                Object.assign(result, listAllFiles(full, base, exclude));
            } else {
                const stat = fs.statSync(full);
                result[rel] = { mtime: stat.mtimeMs, size: stat.size };
            }
        }
    } catch { }
    return result;
}

// ============================================================================
// FILE HASH EXECUTOR
// ============================================================================
async function executeFileHash(input) {
    const { action, filePath, algorithm = 'sha256', expectedHash, otherFile, files = [] } = input;

    switch (action) {
        case 'hash': {
            if (!filePath) return { success: false, error: 'filePath required' };
            const abs = path.resolve(filePath);
            if (!fs.existsSync(abs)) return { success: false, error: `File not found: ${abs}` };
            const hash = computeHash(abs, algorithm);
            const stat = fs.statSync(abs);
            return { success: true, filePath: abs, algorithm, hash, size: stat.size, sizeFormatted: formatBytes(stat.size) };
        }

        case 'verify': {
            if (!filePath || !expectedHash) return { success: false, error: 'filePath and expectedHash required' };
            const abs = path.resolve(filePath);
            if (!fs.existsSync(abs)) return { success: false, error: `File not found: ${abs}` };
            const hash = computeHash(abs, algorithm);
            return { success: true, filePath: abs, algorithm, computedHash: hash, expectedHash, match: hash === expectedHash.toLowerCase() };
        }

        case 'compare': {
            if (!filePath || !otherFile) return { success: false, error: 'filePath and otherFile required' };
            const abs1 = path.resolve(filePath);
            const abs2 = path.resolve(otherFile);
            if (!fs.existsSync(abs1)) return { success: false, error: `File not found: ${abs1}` };
            if (!fs.existsSync(abs2)) return { success: false, error: `File not found: ${abs2}` };
            const hash1 = computeHash(abs1, algorithm);
            const hash2 = computeHash(abs2, algorithm);
            return { success: true, algorithm, fileA: { path: abs1, hash: hash1 }, fileB: { path: abs2, hash: hash2 }, identical: hash1 === hash2 };
        }

        case 'batch': {
            if (!files || files.length === 0) return { success: false, error: 'files array required for batch' };
            const results = files.map(f => {
                const abs = path.resolve(f);
                if (!fs.existsSync(abs)) return { path: abs, error: 'not found' };
                return { path: abs, hash: computeHash(abs, algorithm) };
            });
            return { success: true, algorithm, results, count: results.length };
        }

        default: return { success: false, error: `Unknown hash action: ${action}` };
    }
}

function computeHash(filePath, algorithm) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash(algorithm).update(content).digest('hex');
}

// ============================================================================
// FILE DIFF EXECUTOR
// ============================================================================
async function executeFileDiff(input) {
    const { fileA, fileB, format = 'unified', contextLines = 3, ignoreWhitespace = false, ignoreCase = false } = input;
    const absA = path.resolve(fileA);
    const absB = path.resolve(fileB);
    if (!fs.existsSync(absA)) return { success: false, error: `File not found: ${absA}` };
    if (!fs.existsSync(absB)) return { success: false, error: `File not found: ${absB}` };

    if (format === 'stat') {
        const statA = fs.statSync(absA);
        const statB = fs.statSync(absB);
        const contentA = fs.readFileSync(absA, 'utf-8');
        const contentB = fs.readFileSync(absB, 'utf-8');
        return {
            success: true,
            fileA: { path: absA, size: statA.size, lines: contentA.split('\n').length, modified: statA.mtime },
            fileB: { path: absB, size: statB.size, lines: contentB.split('\n').length, modified: statB.mtime },
            identical: contentA === contentB,
            sizeDiff: statB.size - statA.size
        };
    }

    // Use system diff
    try {
        let cmd = `diff`;
        if (format === 'unified') cmd += ` -u --label "${path.basename(absA)}" --label "${path.basename(absB)}"`;
        if (format === 'context') cmd += ` -c`;
        if (ignoreWhitespace) cmd += ` -w`;
        if (ignoreCase) cmd += ` -i`;
        cmd += ` -U ${contextLines} "${absA}" "${absB}"`;
        const result = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
        return { success: true, format, diff: result.substring(0, MAX_OUTPUT), identical: false };
    } catch (e) {
        // diff exits with 1 when files differ
        if (e.status === 1 && e.stdout) {
            return { success: true, format, diff: e.stdout.substring(0, MAX_OUTPUT), identical: false };
        }
        if (e.status === 0) return { success: true, format, diff: '', identical: true };
        return { success: false, error: `diff failed: ${e.message}` };
    }
}

// ============================================================================
// FILE PERMISSIONS EXECUTOR
// ============================================================================
async function executeFilePermissions(input) {
    const { action, filePath, mode, recursive = false, checkPermission } = input;
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) return { success: false, error: `Path not found: ${abs}` };

    switch (action) {
        case 'get':
        case 'info': {
            const stat = fs.statSync(abs);
            const octal = '0' + (stat.mode & parseInt('777', 8)).toString(8);
            return {
                success: true, filePath: abs,
                mode: octal,
                isDirectory: stat.isDirectory(),
                isFile: stat.isFile(),
                isSymlink: stat.isSymbolicLink(),
                size: stat.size,
                uid: stat.uid, gid: stat.gid,
                created: stat.birthtime, modified: stat.mtime, accessed: stat.atime,
                readable: isAccessible(abs, fs.constants.R_OK),
                writable: isAccessible(abs, fs.constants.W_OK),
                executable: isAccessible(abs, fs.constants.X_OK),
            };
        }

        case 'set': {
            if (!mode) return { success: false, error: 'mode required (e.g. "755")' };
            const modeInt = parseInt(mode, 8);
            if (recursive && fs.statSync(abs).isDirectory()) {
                execSync(`chmod -R ${mode} "${abs}"`, { timeout: 10000 });
            } else {
                fs.chmodSync(abs, modeInt);
            }
            return { success: true, filePath: abs, newMode: mode, recursive };
        }

        case 'check_access': {
            if (!checkPermission) return { success: false, error: 'checkPermission required' };
            const flag = checkPermission === 'read' ? fs.constants.R_OK
                : checkPermission === 'write' ? fs.constants.W_OK
                    : fs.constants.X_OK;
            return { success: true, filePath: abs, permission: checkPermission, hasAccess: isAccessible(abs, flag) };
        }

        case 'make_executable': {
            try {
                execSync(`chmod +x "${abs}"`, { timeout: 5000 });
                return { success: true, filePath: abs, message: 'Made executable' };
            } catch (e) {
                return { success: false, error: `chmod failed: ${e.message}` };
            }
        }

        default: return { success: false, error: `Unknown permission action: ${action}` };
    }
}

function isAccessible(filePath, flag) {
    try { fs.accessSync(filePath, flag); return true; } catch { return false; }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeFileSystemTool(toolName, input, ctx = {}) {
    switch (toolName) {
        case 'file_search': return { result: await executeFileSearch(input), sideEffects: null };
        case 'file_compress': return { result: await executeFileCompress(input), sideEffects: null };
        case 'modify_file': return { result: await executeModifyFile(input), sideEffects: null };
        case 'list_folders': return { result: await executeListFolders(input), sideEffects: null };
        case 'zip_files': return { result: await executeZipFiles(input), sideEffects: null };
        case 'unzip_files': return { result: await executeUnzipFiles(input), sideEffects: null };
        case 'file_watch': return { result: await executeFileWatch(input), sideEffects: null };
        case 'sync_files': return { result: await executeSyncFiles(input), sideEffects: null };
        case 'file_hash': return { result: await executeFileHash(input), sideEffects: null };
        case 'file_diff': return { result: await executeFileDiff(input), sideEffects: null };
        case 'file_permissions': return { result: await executeFilePermissions(input), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown filesystem tool: ${toolName}` }), sideEffects: null };
    }
}

const FILESYSTEM_TOOL_NAMES = new Set(FILESYSTEM_TOOL_DEFINITIONS.map(t => t.name));
function isFileSystemTool(toolName) { return FILESYSTEM_TOOL_NAMES.has(toolName); }

export { FILESYSTEM_TOOL_DEFINITIONS, executeFileSystemTool, isFileSystemTool };
