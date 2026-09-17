/**
 * AssetsPanel — Full-screen asset manager with upload, browse, preview, insert, and history
 * Connected to the app via editorBridge for inserting assets into project files
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  File,
  Film,
  Music,
  Type,
  Grid,
  List,
  Trash2,
  Copy,
  Check,
  Loader2,
  Search,
  RefreshCw,
  X,
  Download,
  ExternalLink,
  FolderOpen,
  Clock,
  History,
  Plus,
  Eye,
  Info,
  HardDrive,
  BarChart3,
  FileImage,
  FileVideo,
  FileText,
  Filter,
  SortAsc,
  SortDesc,
  Link,
  Code2,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { editorBridge } from '../services/editorBridge';

// ── Types ──────────────────────────────────────────────────────────

type TabType = 'browse' | 'upload' | 'history';
type ViewMode = 'grid' | 'list';
type SortBy = 'newest' | 'oldest' | 'name' | 'size';
type FilterType = 'all' | 'image' | 'video' | 'font' | 'document' | 'file';

interface Asset {
  id: string;
  type: string;
  originalName: string;
  originalSize: number;
  optimizedSize?: number;
  cdnUrl: string;
  thumbnailUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  action: 'upload' | 'delete' | 'insert';
  assetName: string;
  assetType: string;
  size?: number;
  cdnUrl?: string;
}

interface AssetsPanelProps {
  projectId: string;
  isDarkMode: boolean;
  onInsertUrl?: (url: string) => void;
  className?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon className="w-5 h-5 text-violet-400" />,
  video: <Film className="w-5 h-5 text-blue-400" />,
  font: <Type className="w-5 h-5 text-orange-400" />,
  document: <FileText className="w-5 h-5 text-cyan-400" />,
  file: <File className="w-5 h-5 text-zinc-400" />,
  other: <File className="w-5 h-5 text-zinc-400" />,
};

const TYPE_COLORS: Record<string, string> = {
  image: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  video: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  font: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  document: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  file: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

// ── Component ──────────────────────────────────────────────────────

const AssetsPanel: React.FC<AssetsPanelProps> = ({ projectId, isDarkMode, onInsertUrl, className = '' }) => {
  const [tab, setTab] = useState<TabType>('browse');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasProject = projectId && projectId !== 'default';

  // ── Load Assets ─────────────────────────────────────────────────
  const loadAssets = useCallback(async () => {
    if (!hasProject) { setAssets([]); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assets/${projectId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setAssets(data.assets || []);
      else if (Array.isArray(data)) setAssets(data);
    } catch {} finally {
      setIsLoading(false);
    }
  }, [projectId, hasProject]);

  // ── Load History ────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!hasProject) return;
    try {
      const res = await fetch(`/api/assets/${projectId}/history`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setHistory(data.history || []);
    } catch {}
  }, [projectId, hasProject]);

  useEffect(() => { loadAssets(); loadHistory(); }, [loadAssets, loadHistory]);

  // ── Upload ──────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/assets/upload');
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.message || 'Upload failed'));
            } catch { reject(new Error('Upload failed')); }
          }
        };
        xhr.onerror = () => reject(new Error('Upload error'));
        xhr.send(formData);
      });

      await loadAssets();
      await loadHistory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadMultiple = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i]);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────
  const deleteAsset = async (assetId: string) => {
    try {
      await fetch(`/api/assets/${assetId}`, { method: 'DELETE', credentials: 'include' });
      setAssets(prev => prev.filter(a => a.id !== assetId));
      if (selectedAsset?.id === assetId) setSelectedAsset(null);
      loadHistory();
    } catch {}
  };

  // ── Copy CDN URL ────────────────────────────────────────────────
  const copyUrl = (asset: Asset) => {
    navigator.clipboard.writeText(asset.cdnUrl);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Insert into code ────────────────────────────────────────────
  const insertIntoCode = (asset: Asset) => {
    onInsertUrl?.(asset.cdnUrl);
  };

  // ── Insert as HTML tag ──────────────────────────────────────────
  const insertAsHtmlTag = (asset: Asset) => {
    const paths = editorBridge.getAllFilePaths();
    const htmlFile = paths.find(p => p.endsWith('.html')) || paths.find(p => p.endsWith('.tsx') || p.endsWith('.jsx'));
    if (!htmlFile) return;

    const existing = editorBridge.getFile(htmlFile) || '';
    let tag = '';
    if (asset.type === 'image') {
      tag = `<img src="${asset.cdnUrl}" alt="${asset.originalName}" />`;
    } else if (asset.type === 'video') {
      tag = `<video src="${asset.cdnUrl}" controls></video>`;
    } else if (asset.type === 'font') {
      tag = `<link href="${asset.cdnUrl}" rel="stylesheet" />`;
    } else {
      tag = `<a href="${asset.cdnUrl}" target="_blank">${asset.originalName}</a>`;
    }
    editorBridge.updateFile(htmlFile, existing + '\n' + tag);
  };

  // ── Clear History ───────────────────────────────────────────────
  const clearHistory = async () => {
    try {
      await fetch(`/api/assets/${projectId}/history`, { method: 'DELETE', credentials: 'include' });
      setHistory([]);
    } catch {}
  };

  // ── Drag & Drop ─────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      uploadMultiple(e.dataTransfer.files);
    }
  };

  // ── Filter & Sort ───────────────────────────────────────────────
  const displayAssets = useMemo(() => {
    let result = [...assets];
    if (filterType !== 'all') result = result.filter(a => a.type === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.originalName.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case 'newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case 'name': result.sort((a, b) => a.originalName.localeCompare(b.originalName)); break;
      case 'size': result.sort((a, b) => b.originalSize - a.originalSize); break;
    }
    return result;
  }, [assets, filterType, searchQuery, sortBy]);

  // ── Stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: assets.length,
    images: assets.filter(a => a.type === 'image').length,
    videos: assets.filter(a => a.type === 'video').length,
    fonts: assets.filter(a => a.type === 'font').length,
    totalSize: assets.reduce((s, a) => s + (a.originalSize || 0), 0),
    optimizedSize: assets.reduce((s, a) => s + (a.optimizedSize || a.originalSize || 0), 0),
  }), [assets]);

  // ── No project ──────────────────────────────────────────────────
  if (!hasProject) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3 max-w-sm">
          <FolderOpen className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-sm font-medium text-canvas-muted">No Project Open</h3>
          <p className="text-xs text-gray-600">Open a project to manage assets. Upload images, fonts, videos and more.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* ── Tab bar + Stats ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-canvas-border shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {([
            { key: 'browse' as TabType, label: 'Browse', icon: Grid },
            { key: 'upload' as TabType, label: 'Upload', icon: Upload },
            { key: 'history' as TabType, label: 'History', icon: History },
          ]).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setError(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                  tab === t.key
                    ? 'bg-pink-500/15 text-pink-400 border border-pink-500/25'
                    : 'text-canvas-muted-deep hover:text-canvas-text border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-white/[0.06]" />

        {/* Stats summary */}
        <div className="flex items-center gap-3 text-[10px] text-canvas-muted-deep">
          <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {formatSize(stats.totalSize)}</span>
          <span>{stats.total} files</span>
          {stats.images > 0 && <span className="text-violet-400/60">{stats.images} img</span>}
          {stats.videos > 0 && <span className="text-blue-400/60">{stats.videos} vid</span>}
          {stats.fonts > 0 && <span className="text-orange-400/60">{stats.fonts} font</span>}
        </div>

        <div className="flex-1" />

        <button onClick={() => { loadAssets(); loadHistory(); }} className="p-1.5 rounded-lg text-canvas-muted-deep hover:text-white hover:bg-white/[0.04] transition">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-primary-500/10 border-b border-primary-500/20 flex items-center gap-2 shrink-0">
          <span className="text-xs text-primary-400 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-primary-400/60 hover:text-primary-400">&times;</button>
        </div>
      )}

      {/* ═══════════ BROWSE TAB ═══════════ */}
      {tab === 'browse' && (
        <div className="flex-1 flex min-h-0">
          {/* Main grid/list area */}
          <div className="flex-1 flex flex-col min-h-0"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Toolbar */}
            <div className="px-4 py-2 border-b border-canvas-border flex items-center gap-2 shrink-0">
              {/* Search */}
              <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-lg px-2.5 flex-1 max-w-xs">
                <Search className="w-3 h-3 text-gray-600" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search assets..."
                  className="bg-transparent text-xs text-canvas-text w-full py-1.5 outline-none placeholder-gray-600"
                />
              </div>

              {/* Filter */}
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as FilterType)}
                className="bg-white/[0.04] border border-canvas-border rounded-lg px-2 py-1.5 text-[10px] text-canvas-muted outline-none"
              >
                <option value="all" className="bg-canvas-card">All Types</option>
                <option value="image" className="bg-canvas-card">Images</option>
                <option value="video" className="bg-canvas-card">Videos</option>
                <option value="font" className="bg-canvas-card">Fonts</option>
                <option value="document" className="bg-canvas-card">Documents</option>
                <option value="file" className="bg-canvas-card">Other</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="bg-white/[0.04] border border-canvas-border rounded-lg px-2 py-1.5 text-[10px] text-canvas-muted outline-none"
              >
                <option value="newest" className="bg-canvas-card">Newest</option>
                <option value="oldest" className="bg-canvas-card">Oldest</option>
                <option value="name" className="bg-canvas-card">Name</option>
                <option value="size" className="bg-canvas-card">Size</option>
              </select>

              {/* View toggle */}
              <button
                onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                className="p-1.5 rounded-lg text-canvas-muted-deep hover:text-white hover:bg-white/[0.04] transition"
              >
                {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-20 bg-pink-500/10 border-2 border-dashed border-pink-500/40 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Upload className="w-10 h-10 text-pink-400 mx-auto mb-2" />
                  <span className="text-sm text-pink-300">Drop files to upload</span>
                </div>
              </div>
            )}

            {/* Asset grid/list */}
            <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
              {displayAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                  <FolderOpen className="w-10 h-10 text-pink-400/20" />
                  <span className="text-xs text-canvas-muted-deep">{assets.length === 0 ? 'No assets yet' : 'No matching assets'}</span>
                  <span className="text-[10px] text-gray-600">Upload files or drag & drop onto this panel</span>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                  {displayAssets.map(asset => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                        selectedAsset?.id === asset.id
                          ? 'border-pink-500/50 bg-pink-500/[0.05] ring-1 ring-pink-500/20'
                          : 'border-canvas-border bg-white/[0.02] hover:border-pink-500/30'
                      }`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-square flex items-center justify-center bg-black/20">
                        {asset.thumbnailUrl || (asset.type === 'image' && asset.cdnUrl) ? (
                          <img src={asset.thumbnailUrl || asset.cdnUrl} alt={asset.originalName} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            {TYPE_ICONS[asset.type] || TYPE_ICONS.other}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="px-2 py-1.5">
                        <p className="text-[10px] text-canvas-muted truncate" title={asset.originalName}>{asset.originalName}</p>
                        <p className="text-[9px] text-gray-600">{formatSize(asset.originalSize)}</p>
                      </div>

                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); copyUrl(asset); }}
                          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition" title="Copy URL">
                          {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); insertAsHtmlTag(asset); }}
                          className="p-2 bg-pink-600/50 rounded-lg hover:bg-pink-600/70 transition" title="Insert into code">
                          <Code2 className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                          className="p-2 bg-primary-600/30 rounded-lg hover:bg-primary-600/50 transition" title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-primary-300" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* List view */
                <div className="space-y-1">
                  {displayAssets.map(asset => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all cursor-pointer group ${
                        selectedAsset?.id === asset.id
                          ? 'border-pink-500/30 bg-pink-500/[0.05]'
                          : 'border-canvas-border bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      {/* Icon/thumbnail */}
                      <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center overflow-hidden shrink-0">
                        {asset.thumbnailUrl || (asset.type === 'image' && asset.cdnUrl) ? (
                          <img src={asset.thumbnailUrl || asset.cdnUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : TYPE_ICONS[asset.type] || TYPE_ICONS.other}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-canvas-text truncate">{asset.originalName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${TYPE_COLORS[asset.type] || TYPE_COLORS.file}`}>{asset.type}</span>
                          <span className="text-[10px] text-gray-600">{formatSize(asset.originalSize)}</span>
                          {asset.width && asset.height && <span className="text-[10px] text-gray-600">{asset.width}×{asset.height}</span>}
                          <span className="text-[10px] text-gray-600">{formatDate(asset.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={(e) => { e.stopPropagation(); copyUrl(asset); }}
                          className="p-1.5 rounded-md hover:bg-white/10 text-canvas-muted-deep hover:text-white">
                          {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); insertAsHtmlTag(asset); }}
                          className="p-1.5 rounded-md hover:bg-pink-500/20 text-canvas-muted-deep hover:text-pink-400">
                          <Code2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                          className="p-1.5 rounded-md hover:bg-primary-500/20 text-canvas-muted-deep hover:text-primary-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Detail sidebar ─────────────────────────────────── */}
          {selectedAsset && (
            <div className="w-80 shrink-0 border-l border-canvas-border flex flex-col bg-white/[0.01]">
              <div className="px-4 py-3 border-b border-canvas-border flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-canvas-muted">Asset Details</span>
                <button onClick={() => setSelectedAsset(null)} className="text-gray-600 hover:text-white transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Preview */}
              <div className="aspect-video bg-black/30 flex items-center justify-center border-b border-canvas-border">
                {selectedAsset.type === 'image' ? (
                  <img src={selectedAsset.cdnUrl} alt={selectedAsset.originalName} className="max-w-full max-h-full object-contain" />
                ) : selectedAsset.type === 'video' ? (
                  <video src={selectedAsset.cdnUrl} controls className="max-w-full max-h-full" />
                ) : (
                  <div className="text-center">
                    {TYPE_ICONS[selectedAsset.type] || TYPE_ICONS.other}
                    <p className="text-[10px] text-gray-600 mt-2">No preview</p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                <div>
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider block mb-0.5">Name</span>
                  <p className="text-xs text-canvas-text break-words">{selectedAsset.originalName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider block mb-0.5">Type</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border inline-block ${TYPE_COLORS[selectedAsset.type] || TYPE_COLORS.file}`}>{selectedAsset.type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider block mb-0.5">Size</span>
                    <p className="text-xs text-canvas-text">{formatSize(selectedAsset.originalSize)}</p>
                  </div>
                  {selectedAsset.optimizedSize && selectedAsset.optimizedSize < selectedAsset.originalSize && (
                    <div>
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider block mb-0.5">Optimized</span>
                      <p className="text-xs text-emerald-400">{formatSize(selectedAsset.optimizedSize)} ({Math.round((1 - selectedAsset.optimizedSize / selectedAsset.originalSize) * 100)}% saved)</p>
                    </div>
                  )}
                  {selectedAsset.width && selectedAsset.height && (
                    <div>
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider block mb-0.5">Dimensions</span>
                      <p className="text-xs text-canvas-text">{selectedAsset.width} × {selectedAsset.height}</p>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider block mb-0.5">Uploaded</span>
                  <p className="text-xs text-canvas-muted">{formatDate(selectedAsset.createdAt)}</p>
                </div>

                {/* CDN URL */}
                <div>
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider block mb-1">CDN URL</span>
                  <div className="bg-white/[0.03] rounded-lg p-2 border border-canvas-border">
                    <p className="text-[10px] text-canvas-muted-deep break-all font-mono leading-relaxed">{selectedAsset.cdnUrl}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-1.5 pt-2">
                  <button
                    onClick={() => copyUrl(selectedAsset)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-canvas-text transition"
                  >
                    {copiedId === selectedAsset.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy CDN URL
                  </button>
                  <button
                    onClick={() => insertAsHtmlTag(selectedAsset)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition"
                  >
                    <Code2 className="w-3.5 h-3.5" /> Insert into Code
                  </button>
                  <button
                    onClick={() => window.open(selectedAsset.cdnUrl, '_blank')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-canvas-muted transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                  </button>
                  <button
                    onClick={() => deleteAsset(selectedAsset.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-primary-400/60 hover:text-primary-400 hover:bg-primary-500/10 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Asset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ UPLOAD TAB ═══════════ */}
      {tab === 'upload' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-xl rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              isDragging ? 'border-pink-500 bg-pink-500/10 scale-[1.02]' : 'border-canvas-border hover:border-pink-500/40 hover:bg-white/[0.02]'
            }`}
          >
            <div className="flex flex-col items-center py-16 gap-4">
              {isUploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-pink-400 animate-spin" />
                  <span className="text-sm text-canvas-text">Uploading... {uploadProgress}%</span>
                  <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-pink-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-canvas-text font-medium">Drop files here or click to upload</p>
                    <p className="text-xs text-gray-600 mt-1">Max 10MB per file · Images, fonts, videos, documents</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Supports: JPG, PNG, GIF, WebP, SVG, AVIF, MP4, WOFF2, PDF</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,.pdf,.woff,.woff2,.ttf,.otf,.svg"
            multiple
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) uploadMultiple(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Recent uploads */}
          {assets.length > 0 && (
            <div className="w-full max-w-xl mt-8">
              <h4 className="text-xs font-medium text-canvas-muted-deep mb-2">Recent Uploads</h4>
              <div className="space-y-1">
                {assets.slice(0, 5).map(asset => (
                  <div key={asset.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-canvas-border">
                    <div className="w-6 h-6 rounded bg-black/20 flex items-center justify-center overflow-hidden shrink-0">
                      {asset.thumbnailUrl ? (
                        <img src={asset.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : TYPE_ICONS[asset.type] || TYPE_ICONS.other}
                    </div>
                    <span className="text-xs text-canvas-muted flex-1 truncate">{asset.originalName}</span>
                    <span className="text-[10px] text-gray-600">{formatSize(asset.originalSize)}</span>
                    <button onClick={() => copyUrl(asset)} className="p-1 text-gray-600 hover:text-white transition">
                      {copiedId === asset.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ HISTORY TAB ═══════════ */}
      {tab === 'history' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-canvas-border flex items-center gap-3 shrink-0">
            <button onClick={loadHistory} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-canvas-muted hover:text-white bg-white/[0.04] hover:bg-white/[0.06] transition">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <div className="flex-1" />
            {history.length > 0 && (
              <button onClick={clearHistory} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-400/60 hover:text-primary-400 hover:bg-primary-500/10 transition">
                <Trash2 className="w-3 h-3" /> Clear History
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                <History className="w-10 h-10 text-gray-600/30" />
                <span className="text-xs text-canvas-muted-deep">No history yet</span>
                <span className="text-[10px] text-gray-600">Upload and delete operations will appear here</span>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {history.map((entry, i) => (
                  <div key={entry.id || i} className="px-4 py-3 hover:bg-white/[0.02] flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      entry.action === 'upload' ? 'bg-emerald-500/10' :
                      entry.action === 'delete' ? 'bg-primary-500/10' : 'bg-violet-500/10'
                    }`}>
                      {entry.action === 'upload' ? <Upload className="w-3.5 h-3.5 text-emerald-400" /> :
                       entry.action === 'delete' ? <Trash2 className="w-3.5 h-3.5 text-primary-400" /> :
                       <Code2 className="w-3.5 h-3.5 text-violet-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                          entry.action === 'upload' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                          entry.action === 'delete' ? 'text-primary-400 bg-primary-500/10 border-primary-500/20' :
                          'text-violet-400 bg-violet-500/10 border-violet-500/20'
                        }`}>{entry.action}</span>
                        <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-canvas-text mt-0.5 truncate">{entry.assetName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] uppercase ${TYPE_COLORS[entry.assetType]?.split(' ')[0] || 'text-canvas-muted-deep'}`}>{entry.assetType}</span>
                        {entry.size && <span className="text-[10px] text-gray-600">{formatSize(entry.size)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsPanel;
