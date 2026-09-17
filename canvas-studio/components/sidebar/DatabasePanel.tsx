/**
 * DatabasePanel — Provision, migrate, backup, and monitor project databases
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Plus,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Table2,
  Activity,
  Clock,
  HardDrive,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Shield,
  Zap,
  Copy,
  Check,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

interface DbInstance {
  id: string;
  engine: string;
  status: 'provisioning' | 'active' | 'suspended' | 'error';
  host?: string;
  port?: number;
  dbName?: string;
  connectionUrl?: string;
  sizeBytes?: number;
  connections?: number;
  maxConnections?: number;
  createdAt: string;
}

interface Migration {
  id: string;
  name: string;
  appliedAt: string;
  status: 'applied' | 'pending' | 'failed';
}

interface Backup {
  id: string;
  key: string;
  sizeBytes: number;
  createdAt: string;
  type: 'manual' | 'scheduled';
}

interface TableInfo {
  name: string;
  rowCount: number;
  sizeBytes: number;
}

interface DatabasePanelProps {
  projectId: string;
  className?: string;
}

type Tab = 'overview' | 'migrations' | 'backups' | 'tables';

const STATUS_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  provisioning: { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-amber-400 bg-amber-500/10' },
  active: { icon: <CheckCircle2 size={14} />, color: 'text-emerald-400 bg-emerald-500/10' },
  suspended: { icon: <Clock size={14} />, color: 'text-zinc-400 bg-zinc-500/10' },
  error: { icon: <AlertTriangle size={14} />, color: 'text-primary-400 bg-primary-500/10' },
};

// ── Component ──────────────────────────────────────────────────────

const DatabasePanel: React.FC<DatabasePanelProps> = ({ projectId, className = '' }) => {
  const [db, setDb] = useState<DbInstance | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showProvision, setShowProvision] = useState(false);

  const api = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`/api/database${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    return res.json();
  }, []);

  // Load DB status
  const loadStatus = useCallback(async () => {
    if (!projectId || projectId === 'default') { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api(`/${projectId}`);
      if (data.success && data.database) {
        setDb(data.database);
      } else {
        setDb(null);
        setShowProvision(true);
      }
    } catch { setDb(null); setShowProvision(true); }
    finally { setLoading(false); }
  }, [projectId, api]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Load tab-specific data
  useEffect(() => {
    if (!db) return;

    const load = async () => {
      try {
        if (tab === 'migrations') {
          const d = await api(`/${projectId}/migrate`);
          if (d.success) setMigrations(d.migrations || []);
        } else if (tab === 'backups') {
          const d = await api(`/${projectId}/backups`);
          if (d.success) setBackups(d.backups || []);
        } else if (tab === 'tables') {
          const d = await api(`/instance/${db.id}/tables`);
          if (d.success) setTables(d.tables || []);
        }
      } catch {}
    };
    load();
  }, [tab, db, projectId, api]);

  // Actions
  const provision = async () => {
    setActionLoading('provision');
    try {
      const d = await api(`/${projectId}`, { method: 'POST', body: JSON.stringify({ engine: 'postgresql' }) });
      if (d.success) { setShowProvision(false); loadStatus(); }
    } catch {} finally { setActionLoading(null); }
  };

  const destroy = async () => {
    if (!db || !confirm('Permanently delete this database? All data will be lost.')) return;
    setActionLoading('destroy');
    try {
      await api(`/instance/${db.id}`, { method: 'DELETE' });
      setDb(null);
      setShowProvision(true);
    } catch {} finally { setActionLoading(null); }
  };

  const runMigration = async () => {
    setActionLoading('migrate');
    try {
      await api(`/${projectId}/migrate`, { method: 'POST' });
      const d = await api(`/${projectId}/migrate`);
      if (d.success) setMigrations(d.migrations || []);
    } catch {} finally { setActionLoading(null); }
  };

  const createBackup = async () => {
    if (!db) return;
    setActionLoading('backup');
    try {
      await api(`/instance/${db.id}/backup`, { method: 'POST' });
      const d = await api(`/${projectId}/backups`);
      if (d.success) setBackups(d.backups || []);
    } catch {} finally { setActionLoading(null); }
  };

  const restoreBackup = async (backupKey: string) => {
    if (!db || !confirm('Restore from this backup? Current data will be replaced.')) return;
    setActionLoading('restore');
    try {
      await api(`/instance/${db.id}/restore`, { method: 'POST', body: JSON.stringify({ backupKey }) });
      loadStatus();
    } catch {} finally { setActionLoading(null); }
  };

  const copyConnectionUrl = () => {
    if (db?.connectionUrl) {
      navigator.clipboard.writeText(db.connectionUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // ── Render ──

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 size={24} className="text-violet-400 animate-spin" />
      </div>
    );
  }

  // No DB — show provision prompt
  if (!db && showProvision) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-zinc-900/90 gap-4 p-6 ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center">
          <Database size={24} className="text-violet-400" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold text-white mb-1">No Database</h3>
          <p className="text-xs text-zinc-500 max-w-[200px]">
            Provision a PostgreSQL database for this project
          </p>
        </div>
        <button
          onClick={provision}
          disabled={actionLoading === 'provision'}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm text-white disabled:opacity-50 transition-colors"
        >
          {actionLoading === 'provision' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Provision Database
        </button>
      </div>
    );
  }

  if (!db) return null;

  const statusStyle = STATUS_STYLES[db.status] || STATUS_STYLES.error;

  return (
    <div className={`flex flex-col h-full bg-zinc-900/90 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-canvas-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">{db.dbName || 'Database'}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] ${statusStyle.color}`}>
            {statusStyle.icon}
            {db.status}
          </div>
        </div>

        {/* Connection URL */}
        {db.connectionUrl && (
          <div className="flex items-center gap-1 bg-black/30 rounded-md px-2 py-1.5 mt-1">
            <code className="text-[9px] text-zinc-500 truncate flex-1">
              {db.connectionUrl.replace(/:[^:@]+@/, ':***@')}
            </code>
            <button onClick={copyConnectionUrl}
              className="p-0.5 rounded hover:bg-white/10 shrink-0">
              {copiedUrl ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} className="text-zinc-500" />}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-canvas-border">
        {(['overview', 'migrations', 'backups', 'tables'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[11px] transition-colors border-b-2 ${
              tab === t
                ? 'text-violet-400 border-violet-500'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Engine', value: db.engine?.toUpperCase() || 'POSTGRESQL', icon: <Zap size={14} className="text-amber-400" /> },
                { label: 'Size', value: db.sizeBytes ? formatSize(db.sizeBytes) : '—', icon: <HardDrive size={14} className="text-blue-400" /> },
                { label: 'Connections', value: `${db.connections ?? 0}/${db.maxConnections ?? 5}`, icon: <Activity size={14} className="text-emerald-400" /> },
                { label: 'Created', value: new Date(db.createdAt).toLocaleDateString(), icon: <Clock size={14} className="text-zinc-400" /> },
              ].map(stat => (
                <div key={stat.label} className="bg-white/[0.03] rounded-lg p-3 border border-canvas-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    {stat.icon}
                    <span className="text-[10px] text-zinc-500">{stat.label}</span>
                  </div>
                  <span className="text-sm font-medium text-white">{stat.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={loadStatus}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-xs text-zinc-300">
                <RefreshCw size={12} /> Refresh
              </button>
              <button onClick={destroy}
                disabled={actionLoading === 'destroy'}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 rounded-md text-xs text-primary-400">
                {actionLoading === 'destroy' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Migrations Tab */}
        {tab === 'migrations' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={runMigration}
                disabled={actionLoading === 'migrate'}
                className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-md text-xs text-white disabled:opacity-50">
                {actionLoading === 'migrate' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Run Migrations
              </button>
            </div>

            {migrations.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">No migrations found</div>
            ) : (
              <div className="space-y-1">
                {migrations.map((m, i) => (
                  <motion.div
                    key={m.id || i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg border border-canvas-border"
                  >
                    {m.status === 'applied' ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    ) : m.status === 'failed' ? (
                      <AlertTriangle size={14} className="text-primary-400 shrink-0" />
                    ) : (
                      <Clock size={14} className="text-amber-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 truncate">{m.name}</p>
                      {m.appliedAt && (
                        <p className="text-[10px] text-zinc-600">{new Date(m.appliedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Backups Tab */}
        {tab === 'backups' && (
          <div className="space-y-3">
            <button onClick={createBackup}
              disabled={actionLoading === 'backup'}
              className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-md text-xs text-white disabled:opacity-50">
              {actionLoading === 'backup' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Create Backup
            </button>

            {backups.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">No backups yet</div>
            ) : (
              <div className="space-y-1">
                {backups.map((b, i) => (
                  <motion.div
                    key={b.id || i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg border border-canvas-border group"
                  >
                    <Shield size={14} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300">{new Date(b.createdAt).toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-600">{formatSize(b.sizeBytes)} · {b.type}</p>
                    </div>
                    <button
                      onClick={() => restoreBackup(b.key)}
                      disabled={actionLoading === 'restore'}
                      className="p-1.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Restore this backup"
                    >
                      {actionLoading === 'restore' ? (
                        <Loader2 size={12} className="text-zinc-400 animate-spin" />
                      ) : (
                        <RotateCcw size={12} className="text-zinc-400" />
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tables Tab */}
        {tab === 'tables' && (
          <div className="space-y-1">
            {tables.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">No tables found</div>
            ) : (
              tables.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg border border-canvas-border"
                >
                  <Table2 size={14} className="text-cyan-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-300 font-mono">{t.name}</p>
                    <p className="text-[10px] text-zinc-600">
                      {t.rowCount.toLocaleString()} rows · {formatSize(t.sizeBytes)}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabasePanel;
