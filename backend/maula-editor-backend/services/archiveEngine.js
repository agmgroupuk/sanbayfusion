/**
 * ARCHIVE ENGINE — Production archive operations
 *
 * Real implementations for ZIP / TAR / TAR.GZ using archiver (write) + yauzl
 * (read zip) + tar (read/write tar). 7z and RAR require system binaries (7z,
 * unrar) and degrade gracefully when those are not installed.
 *
 * All paths are resolved against process.cwd() and validated to prevent path
 * traversal during extraction (zip-slip guard).
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn, spawnSync } from 'child_process';
import { pipeline } from 'stream/promises';
import { createLogger } from '../lib/logger.js';

const log = createLogger('archiveEngine');

let _archiver;
let _yauzl;
let _tar;
async function getArchiver() { if (!_archiver) _archiver = (await import('archiver')).default; return _archiver; }
async function getYauzl() { if (!_yauzl) _yauzl = (await import('yauzl')).default; return _yauzl; }
async function getTar() { if (!_tar) _tar = await import('tar'); return _tar; }

function formatBytes(b) {
  if (!b) return '0 B';
  const u = ['B','KB','MB','GB','TB']; let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(2)} ${u[i]}`;
}

function tempPath(ext = 'zip') {
  return path.join(os.tmpdir(), `archive-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`);
}

function detectFormat(p) {
  const lower = String(p || '').toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'tar.gz';
  if (lower.endsWith('.tar.bz2')) return 'tar.bz2';
  if (lower.endsWith('.tar')) return 'tar';
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.7z')) return '7z';
  if (lower.endsWith('.rar')) return 'rar';
  return 'zip';
}

function isUnsafePath(entry) {
  if (!entry) return true;
  const norm = path.normalize(entry).replace(/^([a-zA-Z]:[\\/])/, '');
  return norm.startsWith('..') || path.isAbsolute(norm) || norm.split(path.sep).includes('..');
}

async function safeJoin(root, entry) {
  if (isUnsafePath(entry)) throw new Error(`Unsafe path traversal: ${entry}`);
  const target = path.resolve(root, entry);
  const rel = path.relative(root, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Unsafe path traversal: ${entry}`);
  }
  return target;
}

async function ensureDir(d) { await fsp.mkdir(d, { recursive: true }); }

function whichSync(bin) {
  try {
    const out = spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin]);
    return out.status === 0;
  } catch { return false; }
}

function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'pipe', ...opts });
    let stdout = '', stderr = '';
    p.stdout?.on('data', (d) => { stdout += d.toString(); });
    p.stderr?.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${cmd} exited ${code}: ${stderr || stdout}`)));
  });
}

// ─── ZIP read helpers ───────────────────────────────────────────────────────

async function listZipEntries(zipPath) {
  const yauzl = await getYauzl();
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      const entries = [];
      zip.on('entry', (e) => {
        entries.push({
          fileName: e.fileName,
          uncompressedSize: e.uncompressedSize,
          compressedSize: e.compressedSize,
          isDirectory: /\/$/.test(e.fileName),
          lastModFileDate: e.getLastModDate?.() || null,
        });
        zip.readEntry();
      });
      zip.on('end', () => resolve(entries));
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

async function readZipEntry(zipPath, entryName) {
  const yauzl = await getYauzl();
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      let found = false;
      zip.on('entry', (e) => {
        if (e.fileName === entryName) {
          found = true;
          zip.openReadStream(e, (err2, stream) => {
            if (err2) return reject(err2);
            const chunks = [];
            stream.on('data', (c) => chunks.push(c));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
          });
        } else {
          zip.readEntry();
        }
      });
      zip.on('end', () => { if (!found) reject(new Error(`Entry not found: ${entryName}`)); });
      zip.readEntry();
    });
  });
}

async function extractZipAll(zipPath, outputDir, opts = {}) {
  const yauzl = await getYauzl();
  await ensureDir(outputDir);
  const filter = opts.fileFilter ? (n) => n.includes(opts.fileFilter) : () => true;
  const flatten = Math.max(0, parseInt(opts.flattenDepth || 0, 10));
  const fixLE = !!opts.fixLineEndings;
  const overwrite = opts.overwrite !== false;
  const stripMac = opts.stripMacMetadata !== false;
  const extracted = [];

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      const next = () => zip.readEntry();
      zip.on('entry', async (e) => {
        try {
          let name = e.fileName;
          if (stripMac && (name.startsWith('__MACOSX/') || name.endsWith('.DS_Store'))) return next();
          if (!filter(name)) return next();
          if (flatten > 0) {
            const parts = name.split('/');
            name = parts.slice(Math.min(flatten, parts.length - 1)).join('/');
            if (!name) return next();
          }
          const dest = await safeJoin(outputDir, name);
          if (/\/$/.test(e.fileName)) {
            await ensureDir(dest);
            return next();
          }
          await ensureDir(path.dirname(dest));
          if (!overwrite && fs.existsSync(dest)) return next();
          zip.openReadStream(e, async (err2, stream) => {
            if (err2) return reject(err2);
            try {
              if (fixLE && /\.(txt|md|js|ts|tsx|jsx|json|yml|yaml|html|css|sh|env|ini|conf|cfg)$/i.test(name)) {
                const chunks = [];
                stream.on('data', (c) => chunks.push(c));
                stream.on('end', async () => {
                  try {
                    const buf = Buffer.concat(chunks).toString('utf8').replace(/\r\n/g, '\n');
                    await fsp.writeFile(dest, buf, 'utf8');
                    extracted.push(name);
                    next();
                  } catch (e3) { reject(e3); }
                });
                stream.on('error', reject);
              } else {
                await pipeline(stream, fs.createWriteStream(dest));
                extracted.push(name);
                next();
              }
            } catch (e3) { reject(e3); }
          });
        } catch (e2) { reject(e2); }
      });
      zip.on('end', () => resolve(extracted));
      zip.on('error', reject);
      next();
    });
  });
}

// ─── TAR helpers ────────────────────────────────────────────────────────────

async function listTarEntries(tarPath, isGzip = false) {
  const tar = await getTar();
  const entries = [];
  await tar.list({
    file: tarPath,
    gzip: isGzip,
    onentry: (e) => entries.push({
      fileName: e.path,
      uncompressedSize: e.size,
      compressedSize: e.size,
      isDirectory: e.type === 'Directory' || /\/$/.test(e.path),
    }),
  });
  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. createArchive — supports create/split/merge actions
// ═══════════════════════════════════════════════════════════════════════════════

export async function createArchive(opts = {}) {
  const action = opts.action || 'create';

  if (action === 'split') {
    const src = opts.sourcePath || opts.inputPath;
    const size = parseInt(opts.splitSize || 0, 10);
    if (!src || !size) throw new Error('split requires sourcePath/inputPath and splitSize');
    const buf = await fsp.readFile(src);
    const parts = [];
    const dir = opts.outputDir || path.dirname(src);
    await ensureDir(dir);
    const base = path.basename(src);
    for (let i = 0, idx = 1; i < buf.length; i += size, idx++) {
      const chunk = buf.subarray(i, Math.min(i + size, buf.length));
      const outPath = path.join(dir, `${base}.part${String(idx).padStart(3, '0')}`);
      await fsp.writeFile(outPath, chunk);
      parts.push(outPath);
    }
    return { success: true, operation: 'split', parts, partCount: parts.length, totalSize: buf.length, sizeFormatted: formatBytes(buf.length) };
  }

  if (action === 'merge') {
    const parts = opts.partFiles;
    if (!Array.isArray(parts) || parts.length === 0) throw new Error('merge requires partFiles[]');
    const outputPath = opts.outputPath || tempPath('bin');
    const out = fs.createWriteStream(outputPath);
    for (const p of [...parts].sort()) {
      await pipeline(fs.createReadStream(p), out, { end: false });
    }
    out.end();
    await new Promise((r) => out.on('close', r));
    const stat = await fsp.stat(outputPath);
    return { success: true, operation: 'merge', outputPath, size: stat.size, sizeFormatted: formatBytes(stat.size), partCount: parts.length };
  }

  // create
  const archiver = await getArchiver();
  const format = (opts.format || 'zip').toLowerCase();
  const compressionLevel = Math.min(9, Math.max(0, parseInt(opts.compressionLevel ?? 6, 10)));
  const outputPath = opts.outputPath || tempPath(format === 'tar.gz' ? 'tar.gz' : format);
  const exclude = Array.isArray(opts.excludePatterns) ? opts.excludePatterns : [];
  const isExcluded = (n) => exclude.some((p) => n.includes(p));

  await ensureDir(path.dirname(outputPath));
  const out = fs.createWriteStream(outputPath);
  let arc;
  if (format === 'tar' || format === 'tar.gz') {
    arc = archiver('tar', format === 'tar.gz' ? { gzip: true, gzipOptions: { level: compressionLevel } } : {});
  } else {
    arc = archiver('zip', { zlib: { level: compressionLevel }, comment: opts.comment });
  }

  let entryCount = 0;
  arc.on('entry', () => { entryCount++; });
  arc.on('warning', (e) => log.warn('[archiveEngine] warn:', e.message));
  arc.pipe(out);

  if (opts.sourceDir) {
    arc.glob('**/*', { cwd: opts.sourceDir, ignore: exclude.length ? exclude : undefined, dot: true });
  }
  if (Array.isArray(opts.sourcePaths)) {
    for (const sp of opts.sourcePaths) {
      if (isExcluded(sp)) continue;
      const stat = await fsp.stat(sp);
      if (stat.isDirectory()) arc.directory(sp, path.basename(sp));
      else arc.file(sp, { name: path.basename(sp) });
    }
  }
  await arc.finalize();
  await new Promise((r) => out.on('close', r));
  const stat = await fsp.stat(outputPath);
  return { success: true, operation: 'create', outputPath, format, entryCount, size: stat.size, sizeFormatted: formatBytes(stat.size) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. extractArchive
// ═══════════════════════════════════════════════════════════════════════════════

export async function extractArchive(inputPath, opts = {}) {
  if (!inputPath) throw new Error('inputPath is required');
  await fsp.access(inputPath);
  const fmt = detectFormat(inputPath);
  const outputDir = opts.outputDir || path.join(os.tmpdir(), `extracted-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  await ensureDir(outputDir);

  let extractedFiles = [];

  if (fmt === 'zip') {
    extractedFiles = await extractZipAll(inputPath, outputDir, opts);
  } else if (fmt === 'tar' || fmt === 'tar.gz') {
    const tar = await getTar();
    await tar.extract({
      file: inputPath,
      cwd: outputDir,
      gzip: fmt === 'tar.gz',
      filter: (p) => {
        if (isUnsafePath(p)) return false;
        if (opts.fileFilter && !p.includes(opts.fileFilter)) return false;
        return true;
      },
      strip: Math.max(0, parseInt(opts.flattenDepth || 0, 10)),
    });
    const walk = async (d) => {
      const out = [];
      for (const e of await fsp.readdir(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) out.push(...await walk(full));
        else out.push(path.relative(outputDir, full));
      }
      return out;
    };
    extractedFiles = await walk(outputDir);
  } else if (fmt === '7z' && whichSync('7z')) {
    await runCmd('7z', ['x', inputPath, `-o${outputDir}`, '-y']);
    extractedFiles = (await fsp.readdir(outputDir));
  } else if (fmt === 'rar' && whichSync('unrar')) {
    await runCmd('unrar', ['x', '-y', inputPath, outputDir + path.sep]);
    extractedFiles = (await fsp.readdir(outputDir));
  } else {
    throw new Error(`Unsupported or missing system tool for format: ${fmt}`);
  }

  return { success: true, operation: 'extract', outputDir, format: fmt, fileCount: extractedFiles.length, files: extractedFiles.slice(0, 200) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. editArchive — add/remove/replace/patch/rename inside ZIP
// ═══════════════════════════════════════════════════════════════════════════════

export async function editArchive(inputPath, opts = {}) {
  if (!inputPath) throw new Error('inputPath is required');
  const action = opts.action;
  if (!action) throw new Error('action is required');
  const fmt = detectFormat(inputPath);
  if (fmt !== 'zip') throw new Error(`Edit only supported for ZIP archives (got ${fmt})`);

  const tmpDir = path.join(os.tmpdir(), `edit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  await ensureDir(tmpDir);
  await extractZipAll(inputPath, tmpDir, { overwrite: true });

  const performed = [];

  if (action === 'add' && Array.isArray(opts.files)) {
    for (const f of opts.files) {
      const dest = await safeJoin(tmpDir, f.archivePath || path.basename(f.path));
      await ensureDir(path.dirname(dest));
      await fsp.copyFile(f.path, dest);
      performed.push({ added: f.archivePath || path.basename(f.path) });
    }
  } else if (action === 'remove' && Array.isArray(opts.removeEntries)) {
    for (const entry of opts.removeEntries) {
      const target = await safeJoin(tmpDir, entry);
      await fsp.rm(target, { recursive: true, force: true });
      performed.push({ removed: entry });
    }
  } else if (action === 'replace' && Array.isArray(opts.replacements)) {
    for (const r of opts.replacements) {
      const dest = await safeJoin(tmpDir, r.archivePath);
      await ensureDir(path.dirname(dest));
      if (r.newFilePath) await fsp.copyFile(r.newFilePath, dest);
      else if (r.newContent !== undefined) await fsp.writeFile(dest, r.newContent, 'utf8');
      performed.push({ replaced: r.archivePath });
    }
  } else if (action === 'patch' && Array.isArray(opts.patches)) {
    for (const p of opts.patches) {
      const dest = await safeJoin(tmpDir, p.archivePath);
      const text = await fsp.readFile(dest, 'utf8');
      const re = p.isRegex ? new RegExp(p.find, 'g') : null;
      const next = re ? text.replace(re, p.replace) : text.split(p.find).join(p.replace);
      await fsp.writeFile(dest, next, 'utf8');
      performed.push({ patched: p.archivePath });
    }
  } else if (action === 'rename' && Array.isArray(opts.renames)) {
    for (const r of opts.renames) {
      const from = await safeJoin(tmpDir, r.from);
      const to = await safeJoin(tmpDir, r.to);
      await ensureDir(path.dirname(to));
      await fsp.rename(from, to);
      performed.push({ renamed: `${r.from} → ${r.to}` });
    }
  } else {
    throw new Error(`Invalid edit action or missing parameters: ${action}`);
  }

  const outputPath = opts.outputPath || inputPath;
  const built = await createArchive({ action: 'create', sourceDir: tmpDir, outputPath, format: 'zip', compressionLevel: opts.compressionLevel ?? 6 });
  await fsp.rm(tmpDir, { recursive: true, force: true });

  return { success: true, operation: 'edit', action, outputPath: built.outputPath, format: 'zip', size: built.size, sizeFormatted: built.sizeFormatted, entryCount: built.entryCount, changes: performed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. inspectArchive — structure / validate / normalize_report
// ═══════════════════════════════════════════════════════════════════════════════

async function listArchiveEntries(p) {
  const fmt = detectFormat(p);
  if (fmt === 'zip') return listZipEntries(p);
  if (fmt === 'tar') return listTarEntries(p, false);
  if (fmt === 'tar.gz') return listTarEntries(p, true);
  throw new Error(`Listing not supported for ${fmt}`);
}

export async function inspectArchive(inputPath, opts = {}) {
  if (!inputPath) throw new Error('inputPath is required');
  const action = opts.action || 'structure';
  const entries = await listArchiveEntries(inputPath);
  const stat = await fsp.stat(inputPath);

  if (action === 'structure') {
    const totalUncompressed = entries.reduce((s, e) => s + (e.uncompressedSize || 0), 0);
    const exts = {};
    for (const e of entries) {
      if (e.isDirectory) continue;
      const ext = path.extname(e.fileName).toLowerCase() || '<noext>';
      exts[ext] = (exts[ext] || 0) + 1;
    }
    const dirs = new Set(entries.filter((e) => e.isDirectory).map((e) => e.fileName));
    const maxDepth = entries.reduce((m, e) => Math.max(m, e.fileName.split('/').filter(Boolean).length), 0);
    return {
      success: true, operation: 'inspect', method: 'structure',
      fileCount: entries.filter((e) => !e.isDirectory).length,
      directoryCount: dirs.size,
      totalUncompressed, totalUncompressedFormatted: formatBytes(totalUncompressed),
      compressedSize: stat.size, compressedSizeFormatted: formatBytes(stat.size),
      compressionRatio: totalUncompressed ? +(stat.size / totalUncompressed).toFixed(3) : 0,
      maxDepth, extensions: exts,
      entries: entries.slice(0, 200).map((e) => ({ name: e.fileName, size: e.uncompressedSize, isDir: e.isDirectory })),
    };
  }

  if (action === 'validate') {
    const names = new Set(entries.map((e) => e.fileName));
    const issues = [];
    for (const f of opts.expectedFiles || []) {
      if (!names.has(f) && !names.has(f + '/')) issues.push({ type: 'missing_file', path: f });
    }
    for (const d of opts.expectedDirs || []) {
      const norm = d.endsWith('/') ? d : d + '/';
      if (![...names].some((n) => n === norm || n.startsWith(norm))) issues.push({ type: 'missing_dir', path: d });
    }
    const rules = opts.namingRules || {};
    if (rules.pattern) {
      const re = new RegExp(rules.pattern);
      for (const e of entries) if (!e.isDirectory && !re.test(e.fileName)) issues.push({ type: 'pattern_mismatch', path: e.fileName });
    }
    if (rules.allowSpaces === false) for (const e of entries) if (/\s/.test(e.fileName)) issues.push({ type: 'space_in_name', path: e.fileName });
    if (rules.allowUppercase === false) for (const e of entries) if (/[A-Z]/.test(e.fileName)) issues.push({ type: 'uppercase_name', path: e.fileName });
    return { success: true, operation: 'inspect', method: 'validate', pass: issues.length === 0, issueCount: issues.length, issues: issues.slice(0, 200) };
  }

  if (action === 'normalize_report') {
    const findings = [];
    for (const e of entries) {
      if (e.fileName.includes('\\')) findings.push({ type: 'windows_separator', path: e.fileName });
      if (/\s/.test(e.fileName)) findings.push({ type: 'space_in_name', path: e.fileName });
      if (/[A-Z]/.test(e.fileName)) findings.push({ type: 'uppercase_name', path: e.fileName });
      if (e.fileName.startsWith('__MACOSX/') || e.fileName.endsWith('.DS_Store')) findings.push({ type: 'mac_metadata', path: e.fileName });
    }
    return { success: true, operation: 'inspect', method: 'normalize_report', findingCount: findings.length, findings: findings.slice(0, 200) };
  }

  throw new Error(`Unknown inspect action: ${action}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. securityCheck
// ═══════════════════════════════════════════════════════════════════════════════

const DANGEROUS_EXT = new Set(['.exe','.bat','.cmd','.scr','.com','.dll','.vbs','.ps1','.sh','.jar','.msi']);

export async function securityCheck(inputPath, opts = {}) {
  if (!inputPath) throw new Error('inputPath is required');
  const action = opts.action || 'scan';

  if (action === 'scan') {
    const stat = await fsp.stat(inputPath);
    const entries = await listArchiveEntries(inputPath);
    const totalUncompressed = entries.reduce((s, e) => s + (e.uncompressedSize || 0), 0);
    const maxExtractSize = parseInt(opts.maxExtractSize ?? (2 * 1024 * 1024 * 1024), 10);
    const maxFiles = parseInt(opts.maxFiles ?? 50000, 10);
    const bombRatioLimit = parseInt(opts.bombRatio ?? 100, 10);
    const findings = [];
    if (totalUncompressed > maxExtractSize) findings.push({ type: 'oversize', detail: `${formatBytes(totalUncompressed)} > ${formatBytes(maxExtractSize)}` });
    if (entries.length > maxFiles) findings.push({ type: 'too_many_files', detail: `${entries.length} > ${maxFiles}` });
    const ratio = stat.size ? totalUncompressed / stat.size : 0;
    if (ratio > bombRatioLimit) findings.push({ type: 'zip_bomb', detail: `ratio=${ratio.toFixed(1)}x` });
    for (const e of entries) {
      if (isUnsafePath(e.fileName)) findings.push({ type: 'path_traversal', path: e.fileName });
      const ext = path.extname(e.fileName).toLowerCase();
      if (DANGEROUS_EXT.has(ext)) findings.push({ type: 'dangerous_extension', path: e.fileName, ext });
    }
    return { success: true, operation: 'security', method: 'scan', safe: findings.length === 0, findingCount: findings.length, findings: findings.slice(0, 200), stats: { compressedSize: stat.size, uncompressedSize: totalUncompressed, ratio: +ratio.toFixed(2), entryCount: entries.length } };
  }

  if (action === 'detect_password') {
    const fmt = detectFormat(inputPath);
    if (fmt === 'zip') {
      const yauzl = await getYauzl();
      return new Promise((resolve, reject) => {
        yauzl.open(inputPath, { lazyEntries: true }, (err, zip) => {
          if (err) return reject(err);
          let encrypted = false;
          zip.on('entry', (e) => {
            if ((e.generalPurposeBitFlag & 0x1) === 1) encrypted = true;
            zip.readEntry();
          });
          zip.on('end', () => resolve({ success: true, operation: 'security', method: 'detect_password', encrypted }));
          zip.on('error', reject);
          zip.readEntry();
        });
      });
    }
    return { success: true, operation: 'security', method: 'detect_password', encrypted: false, note: `Detection not implemented for ${fmt}` };
  }

  if (action === 'encrypt') {
    if (!opts.password) throw new Error('password required');
    if (!whichSync('zip')) throw new Error('zip CLI not available on server for encryption');
    const tmpDir = path.join(os.tmpdir(), `enc-${Date.now()}`);
    await ensureDir(tmpDir);
    await extractZipAll(inputPath, tmpDir);
    const outputPath = opts.outputPath || inputPath.replace(/\.zip$/i, '') + '.enc.zip';
    await runCmd('zip', ['-r', '-P', opts.password, outputPath, '.'], { cwd: tmpDir });
    await fsp.rm(tmpDir, { recursive: true, force: true });
    const stat = await fsp.stat(outputPath);
    return { success: true, operation: 'security', method: 'encrypt', outputPath, size: stat.size, sizeFormatted: formatBytes(stat.size) };
  }

  throw new Error(`Unknown security action: ${action}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. bulkArchive
// ═══════════════════════════════════════════════════════════════════════════════

export async function bulkArchive(opts = {}) {
  const action = opts.action;
  const inputs = opts.inputPaths || [];
  if (!Array.isArray(inputs) || inputs.length === 0) throw new Error('inputPaths[] required');
  const outputDir = opts.outputDir || path.join(os.tmpdir(), `bulk-${Date.now()}`);
  await ensureDir(outputDir);
  const results = [];

  if (action === 'bulk_extract') {
    for (const p of inputs) {
      try {
        const r = await extractArchive(p, { outputDir: path.join(outputDir, path.basename(p, path.extname(p))) });
        results.push({ input: p, status: 'success', outputDir: r.outputDir, fileCount: r.fileCount });
      } catch (e) { results.push({ input: p, status: 'error', error: e.message }); }
    }
  } else if (action === 'bulk_create') {
    for (const dir of inputs) {
      try {
        const out = path.join(outputDir, `${path.basename(dir)}.${opts.format || 'zip'}`);
        const r = await createArchive({ action: 'create', sourceDir: dir, outputPath: out, format: opts.format || 'zip' });
        results.push({ input: dir, status: 'success', outputPath: r.outputPath, size: r.size });
      } catch (e) { results.push({ input: dir, status: 'error', error: e.message }); }
    }
  } else if (action === 'deduplicate') {
    for (const zipPath of inputs) {
      try {
        if (detectFormat(zipPath) !== 'zip') { results.push({ input: zipPath, status: 'error', error: 'only zip supported' }); continue; }
        const tmp = path.join(os.tmpdir(), `dedup-${Date.now()}`);
        await ensureDir(tmp);
        await extractZipAll(zipPath, tmp);
        const seen = new Set();
        const method = opts.deduplicateBy || 'name';
        const removed = [];
        const walk = async (d) => {
          for (const e of await fsp.readdir(d, { withFileTypes: true })) {
            const full = path.join(d, e.name);
            if (e.isDirectory()) await walk(full);
            else {
              let key;
              if (method === 'hash' || method === 'both') {
                const buf = await fsp.readFile(full);
                key = crypto.createHash('sha1').update(buf).digest('hex');
                if (method === 'both') key = e.name + ':' + key;
              } else key = e.name;
              if (seen.has(key)) { await fsp.unlink(full); removed.push(full); }
              else seen.add(key);
            }
          }
        };
        await walk(tmp);
        const out = path.join(outputDir, `${path.basename(zipPath, '.zip')}.dedup.zip`);
        const r = await createArchive({ action: 'create', sourceDir: tmp, outputPath: out, format: 'zip' });
        await fsp.rm(tmp, { recursive: true, force: true });
        results.push({ input: zipPath, status: 'success', outputPath: r.outputPath, removedCount: removed.length });
      } catch (e) { results.push({ input: zipPath, status: 'error', error: e.message }); }
    }
  } else if (action === 'auto_rename') {
    const pattern = opts.rules?.pattern || 'lowercase';
    const tx = (n) => {
      if (pattern === 'lowercase') return n.toLowerCase();
      if (pattern === 'snake_case') return n.replace(/[\s-]+/g, '_').toLowerCase();
      if (pattern === 'kebab_case') return n.replace(/[\s_]+/g, '-').toLowerCase();
      return n;
    };
    for (const zipPath of inputs) {
      try {
        const tmp = path.join(os.tmpdir(), `rn-${Date.now()}`);
        await ensureDir(tmp);
        await extractZipAll(zipPath, tmp);
        const renames = [];
        const walk = async (d) => {
          for (const e of await fsp.readdir(d, { withFileTypes: true })) {
            const full = path.join(d, e.name);
            if (e.isDirectory()) await walk(full);
            else {
              const newName = tx(e.name);
              if (newName !== e.name) { const target = path.join(d, newName); await fsp.rename(full, target); renames.push({ from: e.name, to: newName }); }
            }
          }
        };
        await walk(tmp);
        const out = path.join(outputDir, `${path.basename(zipPath, '.zip')}.renamed.zip`);
        const r = await createArchive({ action: 'create', sourceDir: tmp, outputPath: out, format: 'zip' });
        await fsp.rm(tmp, { recursive: true, force: true });
        results.push({ input: zipPath, status: 'success', outputPath: r.outputPath, renamedCount: renames.length });
      } catch (e) { results.push({ input: zipPath, status: 'error', error: e.message }); }
    }
  } else {
    throw new Error(`Unknown bulk action: ${action}`);
  }

  return { success: true, operation: 'bulk', method: action, results, succeeded: results.filter((r) => r.status === 'success').length, failed: results.filter((r) => r.status === 'error').length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. convertArchive
// ═══════════════════════════════════════════════════════════════════════════════

export async function convertArchive(inputPath, opts = {}) {
  if (!inputPath) throw new Error('inputPath is required');
  const target = (opts.targetFormat || 'zip').toLowerCase();
  const tmp = path.join(os.tmpdir(), `convert-${Date.now()}`);
  await ensureDir(tmp);
  await extractArchive(inputPath, { outputDir: tmp, fixLineEndings: !!opts.fixLineEndings });
  const outputPath = opts.outputPath || inputPath.replace(/\.[^.]+(\.[^.]+)?$/, '') + '.' + target;
  const r = await createArchive({ action: 'create', sourceDir: tmp, outputPath, format: target, compressionLevel: opts.compressionLevel ?? 6 });
  await fsp.rm(tmp, { recursive: true, force: true });
  return { success: true, operation: 'convert', from: detectFormat(inputPath), to: target, outputPath: r.outputPath, format: target, size: r.size, sizeFormatted: r.sizeFormatted };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. searchArchive
// ═══════════════════════════════════════════════════════════════════════════════

const TEXT_EXT = new Set(['.txt','.md','.js','.ts','.tsx','.jsx','.json','.yml','.yaml','.html','.css','.py','.rb','.php','.go','.rs','.java','.kt','.sh','.env','.ini','.conf','.cfg','.xml','.csv','.sql']);
const SECRET_PATTERNS = [
  { name: 'aws_access_key', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'aws_secret_key', re: /aws_secret_access_key\s*[:=]\s*[A-Za-z0-9+/]{40}/gi },
  { name: 'github_token', re: /ghp_[A-Za-z0-9]{36,}/g },
  { name: 'github_oauth', re: /gho_[A-Za-z0-9]{36,}/g },
  { name: 'slack_token', re: /xox[abprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'private_key', re: /-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----/g },
  { name: 'generic_api_key', re: /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/gi },
];

export async function searchArchive(inputPath, opts = {}) {
  if (!inputPath) throw new Error('inputPath is required');
  const action = opts.action || 'find_files';
  const max = parseInt(opts.maxResults || 50, 10);
  const fmt = detectFormat(inputPath);
  if (fmt !== 'zip' && fmt !== 'tar' && fmt !== 'tar.gz') throw new Error(`Search not supported for ${fmt}`);
  const entries = await listArchiveEntries(inputPath);

  if (action === 'find_files') {
    const pattern = opts.pattern || '';
    const matches = entries.filter((e) => !e.isDirectory && (!pattern || e.fileName.includes(pattern))).slice(0, max);
    return { success: true, operation: 'search', method: 'find_files', findingCount: matches.length, results: matches.map((e) => ({ path: e.fileName, size: e.uncompressedSize })) };
  }

  if (action === 'search_text' || action === 'flag_secrets') {
    const findings = [];
    const tmp = path.join(os.tmpdir(), `search-${Date.now()}`);
    await ensureDir(tmp);
    await extractArchive(inputPath, { outputDir: tmp });
    const walk = async (d) => {
      for (const e of await fsp.readdir(d, { withFileTypes: true })) {
        if (findings.length >= max) return;
        const full = path.join(d, e.name);
        if (e.isDirectory()) { await walk(full); continue; }
        const ext = path.extname(e.name).toLowerCase();
        if (!TEXT_EXT.has(ext) && !e.name.startsWith('.env')) continue;
        const text = await fsp.readFile(full, 'utf8').catch(() => null);
        if (!text) continue;
        if (action === 'search_text' && opts.searchText) {
          const re = opts.isRegex ? new RegExp(opts.searchText, 'g') : null;
          const lines = text.split('\n');
          lines.forEach((ln, i) => {
            const hit = re ? re.test(ln) : ln.includes(opts.searchText);
            if (hit && findings.length < max) findings.push({ path: path.relative(tmp, full), line: i + 1, content: ln.slice(0, 200) });
          });
        } else if (action === 'flag_secrets') {
          if (e.name.startsWith('.env')) findings.push({ path: path.relative(tmp, full), type: 'env_file' });
          for (const sp of SECRET_PATTERNS) {
            const m = text.match(sp.re);
            if (m && findings.length < max) findings.push({ path: path.relative(tmp, full), type: sp.name, count: m.length });
          }
        }
      }
    };
    await walk(tmp);
    await fsp.rm(tmp, { recursive: true, force: true });
    return { success: true, operation: 'search', method: action, findingCount: findings.length, results: findings };
  }

  if (action === 'detect_project') {
    const names = entries.map((e) => e.fileName);
    const has = (n) => names.some((p) => p.endsWith('/' + n) || p === n);
    const types = [];
    if (has('package.json')) types.push('node');
    if (has('requirements.txt') || has('pyproject.toml') || has('setup.py')) types.push('python');
    if (has('composer.json')) types.push('php');
    if (has('pom.xml') || has('build.gradle')) types.push('java');
    if (has('go.mod')) types.push('go');
    if (has('Cargo.toml')) types.push('rust');
    if (has('Gemfile')) types.push('ruby');
    if (has('Dockerfile')) types.push('docker');
    if (names.some((n) => /react|next\.config/.test(n))) types.push('react');
    return { success: true, operation: 'search', method: 'detect_project', projectTypes: types, fileCount: entries.length };
  }

  if (action === 'summarize') {
    const exts = {};
    let totalSize = 0;
    for (const e of entries) { if (!e.isDirectory) { exts[path.extname(e.fileName).toLowerCase() || '<noext>'] = (exts[path.extname(e.fileName).toLowerCase() || '<noext>'] || 0) + 1; totalSize += e.uncompressedSize || 0; } }
    return { success: true, operation: 'search', method: 'summarize', fileCount: entries.length, totalSize, totalSizeFormatted: formatBytes(totalSize), extensions: exts, topFiles: entries.filter((e) => !e.isDirectory).sort((a, b) => (b.uncompressedSize || 0) - (a.uncompressedSize || 0)).slice(0, 10).map((e) => ({ path: e.fileName, size: e.uncompressedSize })) };
  }

  throw new Error(`Unknown search action: ${action}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. deployArchive
// ═══════════════════════════════════════════════════════════════════════════════

const STRIP_PRESETS = {
  node_dev: ['node_modules', '.git', 'coverage', '.eslintrc', '.prettierrc', '.vscode', 'tests', '__tests__', '.cache'],
  python_dev: ['__pycache__', '.venv', 'venv', '.pytest_cache', '.mypy_cache', '.tox', 'dist', 'build', '*.egg-info'],
  general: ['.git', '.svn', '.DS_Store', 'Thumbs.db', '*.log', 'tmp', '*.bak'],
};

export async function deployArchive(inputPath, opts = {}) {
  const action = opts.action;
  if (!action) throw new Error('action required');

  if (action === 'package') {
    const src = opts.sourceDir || inputPath;
    if (!src) throw new Error('sourceDir or inputPath required');
    const exclude = [...STRIP_PRESETS.general, ...STRIP_PRESETS.node_dev, ...STRIP_PRESETS.python_dev, ...(opts.stripPatterns || [])];
    return createArchive({ action: 'create', sourceDir: src, outputPath: opts.outputPath, format: opts.format || 'zip', excludePatterns: exclude, compressionLevel: opts.compressionLevel ?? 9 });
  }

  if (action === 'inject') {
    const fmt = detectFormat(inputPath);
    if (fmt !== 'zip') throw new Error('inject only supports zip');
    const files = (opts.configs || []).map((c) => ({ archivePath: c.path, newContent: c.content }));
    return editArchive(inputPath, { action: 'replace', replacements: files, outputPath: opts.outputPath });
  }

  if (action === 'strip') {
    const tmp = path.join(os.tmpdir(), `strip-${Date.now()}`);
    await ensureDir(tmp);
    await extractArchive(inputPath, { outputDir: tmp });
    const patterns = [...(STRIP_PRESETS[opts.stripPreset] || []), ...(opts.stripPatterns || [])];
    const walk = async (d) => {
      for (const e of await fsp.readdir(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (patterns.some((p) => e.name === p || (p.includes('*') && new RegExp(p.replace(/\*/g, '.*')).test(e.name)))) {
          await fsp.rm(full, { recursive: true, force: true });
          continue;
        }
        if (e.isDirectory()) await walk(full);
      }
    };
    await walk(tmp);
    const r = await createArchive({ action: 'create', sourceDir: tmp, outputPath: opts.outputPath, format: opts.format || detectFormat(inputPath), compressionLevel: 9 });
    await fsp.rm(tmp, { recursive: true, force: true });
    return { ...r, operation: 'deploy_strip' };
  }

  if (action === 'optimize') {
    const tmp = path.join(os.tmpdir(), `opt-${Date.now()}`);
    await ensureDir(tmp);
    await extractArchive(inputPath, { outputDir: tmp });
    // strip junk
    const junk = ['.DS_Store', 'Thumbs.db', 'desktop.ini'];
    const walk = async (d) => {
      for (const e of await fsp.readdir(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (junk.includes(e.name)) { await fsp.unlink(full); continue; }
        if (e.isDirectory()) await walk(full);
      }
    };
    await walk(tmp);
    const r = await createArchive({ action: 'create', sourceDir: tmp, outputPath: opts.outputPath, format: detectFormat(inputPath), compressionLevel: 9 });
    await fsp.rm(tmp, { recursive: true, force: true });
    return { ...r, operation: 'deploy_optimize' };
  }

  if (action === 'version') {
    const tag = opts.versionTag;
    if (!tag) throw new Error('versionTag required');
    const ext = path.extname(inputPath);
    const base = path.basename(inputPath, ext);
    const out = opts.outputPath || path.join(path.dirname(inputPath), `${base}_v${tag}${ext}`);
    await fsp.copyFile(inputPath, out);
    const stat = await fsp.stat(out);
    return { success: true, operation: 'deploy_version', outputPath: out, versionTag: tag, size: stat.size, sizeFormatted: formatBytes(stat.size) };
  }

  throw new Error(`Unknown deploy action: ${action}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. coreArchive — combined create/extract/repack/rename/compress/split/merge
// ═══════════════════════════════════════════════════════════════════════════════

export async function coreArchive(opts = {}) {
  const action = opts.action;
  if (!action) throw new Error('action required');

  if (action === 'create' || action === 'split' || action === 'merge') {
    return createArchive(opts);
  }
  if (action === 'extract') {
    return extractArchive(opts.inputPath, opts);
  }
  if (action === 'repack') {
    return convertArchive(opts.inputPath, { ...opts, targetFormat: opts.format || detectFormat(opts.inputPath) });
  }
  if (action === 'rename') {
    if (!opts.inputPath || !opts.newName) throw new Error('inputPath and newName required');
    const out = path.join(path.dirname(opts.inputPath), opts.newName);
    await fsp.rename(opts.inputPath, out);
    const stat = await fsp.stat(out);
    return { success: true, operation: 'rename', outputPath: out, size: stat.size, sizeFormatted: formatBytes(stat.size) };
  }
  if (action === 'compress') {
    return convertArchive(opts.inputPath, { targetFormat: detectFormat(opts.inputPath), compressionLevel: opts.compressionLevel ?? 9, outputPath: opts.outputPath });
  }
  throw new Error(`Unknown core action: ${action}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. structureArchive — inspect / validate / normalize / flatten / nest
// ═══════════════════════════════════════════════════════════════════════════════

export async function structureArchive(inputPath, opts = {}) {
  const action = opts.action || 'inspect';
  if (action === 'inspect') return inspectArchive(inputPath, { action: 'structure' });
  if (action === 'validate') return inspectArchive(inputPath, { action: 'validate', expectedFiles: opts.expectedFiles, expectedDirs: opts.expectedDirs, namingRules: opts.namingRules });

  // For normalize/flatten/nest — extract, manipulate, repack
  const tmp = path.join(os.tmpdir(), `struct-${Date.now()}`);
  await ensureDir(tmp);
  await extractArchive(inputPath, { outputDir: tmp, fixLineEndings: !!opts.fixLineEndings, stripMacMetadata: opts.stripMacMetadata !== false });
  const fmt = detectFormat(inputPath);

  if (action === 'normalize') {
    const rules = opts.namingRules || {};
    const walk = async (d) => {
      for (const e of await fsp.readdir(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        let next = e.name;
        if (rules.allowSpaces === false) next = next.replace(/\s+/g, '_');
        if (rules.allowUppercase === false) next = next.toLowerCase();
        if (next !== e.name) {
          await fsp.rename(full, path.join(d, next));
          if (e.isDirectory()) await walk(path.join(d, next));
        } else if (e.isDirectory()) await walk(full);
      }
    };
    await walk(tmp);
  } else if (action === 'flatten') {
    const depth = parseInt(opts.flattenDepth || 1, 10);
    for (let i = 0; i < depth; i++) {
      const items = await fsp.readdir(tmp, { withFileTypes: true });
      if (items.length === 1 && items[0].isDirectory()) {
        const inner = path.join(tmp, items[0].name);
        for (const child of await fsp.readdir(inner)) {
          await fsp.rename(path.join(inner, child), path.join(tmp, child));
        }
        await fsp.rmdir(inner);
      } else break;
    }
  } else if (action === 'nest') {
    const wrap = opts.nestDir || 'root';
    const wrapDir = path.join(tmp, wrap);
    await ensureDir(wrapDir);
    for (const e of await fsp.readdir(tmp)) {
      if (e === wrap) continue;
      await fsp.rename(path.join(tmp, e), path.join(wrapDir, e));
    }
  }

  const out = await createArchive({ action: 'create', sourceDir: tmp, outputPath: opts.outputPath || inputPath, format: fmt });
  await fsp.rm(tmp, { recursive: true, force: true });
  return { ...out, operation: 'structure', method: action };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. intelligenceArchive — summarize / find / search / readme / detect / secrets
// ═══════════════════════════════════════════════════════════════════════════════

export async function intelligenceArchive(inputPath, opts = {}) {
  const action = opts.action || 'summarize';
  if (action === 'summarize') return searchArchive(inputPath, { action: 'summarize' });
  if (action === 'find') return searchArchive(inputPath, { action: 'find_files', pattern: opts.pattern, maxResults: opts.maxResults });
  if (action === 'search') return searchArchive(inputPath, { action: 'search_text', searchText: opts.searchText, isRegex: opts.isRegex, maxResults: opts.maxResults });
  if (action === 'detect') return searchArchive(inputPath, { action: 'detect_project' });
  if (action === 'secrets') return searchArchive(inputPath, { action: 'flag_secrets', maxResults: opts.maxResults });
  if (action === 'readme') {
    const sum = await searchArchive(inputPath, { action: 'summarize' });
    const det = await searchArchive(inputPath, { action: 'detect_project' });
    const tmpl = opts.readmeTemplate || 'standard';
    let md = `# ${path.basename(inputPath, path.extname(inputPath))}\n\n`;
    md += `**Project type(s):** ${det.projectTypes.join(', ') || 'unknown'}\n\n`;
    md += `**File count:** ${sum.fileCount} | **Total size:** ${sum.totalSizeFormatted}\n\n`;
    if (tmpl !== 'minimal') {
      md += `## File types\n\n`;
      for (const [ext, c] of Object.entries(sum.extensions || {})) md += `- \`${ext}\`: ${c}\n`;
      md += `\n## Largest files\n\n`;
      for (const f of sum.topFiles || []) md += `- \`${f.path}\` (${formatBytes(f.size)})\n`;
    }
    if (tmpl === 'detailed') {
      md += `\n## Structure overview\n\n_Generated automatically from archive contents._\n`;
    }
    return { success: true, operation: 'intelligence', method: 'readme', readme: md, length: md.length };
  }
  throw new Error(`Unknown intelligence action: ${action}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Capabilities
// ═══════════════════════════════════════════════════════════════════════════════

export function getArchiveCapabilities() {
  const have7z = whichSync('7z');
  const haveUnrar = whichSync('unrar');
  const haveZip = whichSync('zip');
  return {
    supported: true,
    formats: ['zip', 'tar', 'tar.gz', ...(have7z ? ['7z'] : []), ...(haveUnrar ? ['rar'] : [])],
    encryptionAvailable: haveZip,
    binaries: { '7z': have7z, unrar: haveUnrar, zip: haveZip },
    maxArchiveSize: 5 * 1024 * 1024 * 1024,
    operations: ['create','extract','edit','inspect','security','bulk','convert','search','deploy','core','structure','intelligence'],
  };
}
