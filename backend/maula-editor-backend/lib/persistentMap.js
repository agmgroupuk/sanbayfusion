/**
 * PersistentMap — Map-compatible persistent store backed by a JSON file.
 *
 * Drop-in replacement for `new Map()` that survives process restarts.
 * Reads are sync (loaded into memory at construction).
 * Writes mutate the in-memory map immediately and queue a debounced flush
 * to disk (atomic temp-file write + rename).
 *
 * Usage:
 *   import { PersistentMap } from '../lib/persistentMap.js';
 *   const store = new PersistentMap('agentUI.pendingQuestions');
 *   store.set('q1', { ... });   // returns the map (chainable, like Map)
 *   const v = store.get('q1');
 *   for (const [k, v] of store.entries()) { ... }
 *
 * Set values must be JSON-serializable (no Date/Map/Set/functions). If you
 * need Date semantics, store as ISO string.
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.MAULA_EDITOR_DATA_DIR || path.resolve(__dirname, '..', 'data', 'kv');

try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch { /* ignore */ }

const FLUSH_DEBOUNCE_MS = 250;

export class PersistentMap extends Map {
  constructor(namespace) {
    super();
    if (!namespace || typeof namespace !== 'string') throw new Error('PersistentMap: namespace required');
    this._ns = namespace;
    this._file = path.join(DATA_DIR, namespace.replace(/[^a-z0-9._-]/gi, '_') + '.json');
    this._tmp = this._file + '.tmp';
    this._timer = null;
    this._writing = false;
    this._dirty = false;
    this._load();
  }

  _load() {
    try {
      if (!fs.existsSync(this._file)) return;
      const raw = fs.readFileSync(this._file, 'utf8');
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) for (const [k, v] of arr) super.set(k, v);
    } catch (e) {
      // Corrupted file — keep in-memory empty and back up the bad file
      try { fs.renameSync(this._file, this._file + '.corrupt-' + Date.now()); } catch { /* ignore */ }
    }
  }

  _scheduleFlush() {
    this._dirty = true;
    if (this._timer) return;
    this._timer = setTimeout(() => { this._timer = null; this._flush().catch(() => {}); }, FLUSH_DEBOUNCE_MS);
    if (this._timer.unref) this._timer.unref();
  }

  async _flush() {
    if (this._writing) { this._scheduleFlush(); return; }
    if (!this._dirty) return;
    this._writing = true;
    this._dirty = false;
    try {
      const arr = Array.from(super.entries());
      const json = JSON.stringify(arr);
      await fsp.writeFile(this._tmp, json, 'utf8');
      await fsp.rename(this._tmp, this._file);
    } catch (e) {
      this._dirty = true; // try again later
    } finally {
      this._writing = false;
      if (this._dirty) this._scheduleFlush();
    }
  }

  /** Force an immediate sync flush (e.g. on shutdown). */
  flushSync() {
    if (!this._dirty && !this._writing) return;
    try {
      const arr = Array.from(super.entries());
      fs.writeFileSync(this._tmp, JSON.stringify(arr), 'utf8');
      fs.renameSync(this._tmp, this._file);
      this._dirty = false;
    } catch { /* ignore */ }
  }

  set(k, v) { super.set(k, v); this._scheduleFlush(); return this; }
  delete(k) { const r = super.delete(k); if (r) this._scheduleFlush(); return r; }
  clear() { super.clear(); this._scheduleFlush(); }
}

// Flush all known instances on shutdown
const _instances = new Set();
const _origCtor = PersistentMap;
const _wrappedCtor = function (...args) { const inst = new _origCtor(...args); _instances.add(inst); return inst; };
// (We don't actually wrap the export — instead register via a side-effect hook.)

// Register via subclass tracking
const _origConstruct = PersistentMap.prototype.constructor;
const _origInit = PersistentMap.prototype._load;
const trackInstance = (inst) => _instances.add(inst);
// monkey-patch _load to also register
const _origLoad = PersistentMap.prototype._load;
PersistentMap.prototype._load = function (...a) { _instances.add(this); return _origLoad.apply(this, a); };

function shutdownFlush() {
  for (const inst of _instances) inst.flushSync();
}
process.on('SIGINT', () => { shutdownFlush(); process.exit(0); });
process.on('SIGTERM', () => { shutdownFlush(); process.exit(0); });
process.on('beforeExit', shutdownFlush);

export default PersistentMap;
