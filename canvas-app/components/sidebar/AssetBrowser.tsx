/**
 * AssetBrowser — Rich asset management panel
 * Multi-upload, type filtering, bulk ops, smart code insertion, preview with metadata
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  File,
  Film,
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
  FolderOpen,
  CheckSquare,
  Square,
  Code,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { assetService, type Asset, ASSET_LIMITS, validateFile } from '../../services/assetService';
import { useEditorStore } from '../../services/editorBridge';

// ── Types ──────────────────────────────────────────────────────────

interface AssetBrowserProps {
  projectId: string;
  onInsertUrl?: (url: string) => void;
  className?: string;
}

type AssetTypeFilter = 'all' | 'image' | 'video' | 'font' | 'document' | 'other';
type SortField = 'name' | 'size' | 'date' | 'type';
type SortDir = 'asc' | 'desc';

interface UploadQueueItem {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

// ── Constants ──────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon size={16} className="text-primary-400" />,
  video: <Film size={16} className="text-blue-400" />,
  font: <Type size={16} className="text-orange-400" />,
  document: <FileText size={16} className="text-cyan-400" />,
  icon: <ImageIcon size={16} className="text-purple-400" />,
  other: <File size={16} className="text-zinc-400" />,
};

const TYPE_FILTERS: { key: AssetTypeFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: null },
  { key: 'image', label: 'Images', icon: <ImageIcon size={11} /> },
  { key: 'video', label: 'Video', icon: <Film size={11} /> },
  { key: 'font', label: 'Fonts', icon: <Type size={11} /> },
  { key: 'document', label: 'Docs', icon: <FileText size={11} /> },
];

// ── Helpers ────────────────────────────────────────────────────────

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const getCodeSnippet = (asset: Asset, type: 'html' | 'css' | 'url'): string => {
  const url = asset.cdnUrl || asset.url;
  const name = asset.originalName || asset.name;
  if (type === 'url') return url;

  if (asset.type === 'image' || asset.type === 'icon') {
    return type === 'html'
      ? `<img src="${url}" alt="${name}" />`
      : `background-image: url('${url}');`;
  }
  if (asset.type === 'video') {
    return type === 'html'
      ? `<video src="${url}" controls></video>`
      : `/* video: ${url} */`;
  }
  if (asset.type === 'font') {
    const family = name.replace(/\.[^.]+$/, '');
    return type === 'css'
      ? `@font-face {\n  font-family: '${family}';\n  src: url('${url}');\n}`
      : `<link rel="preload" href="${url}" as="font" crossorigin>`;
  }
  return url;
};

// ── Component ──────────────────────────────────────────────────────

const AssetBrowser: React.FC<AssetBrowserProps> = ({ projectId, onInsertUrl, className = '' }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [codeSnippetType, setCodeSnippetType] = useState<'html' | 'css' | 'url'>('html');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFilePath = useEditorStore(s => s.activeFilePath);
  const files = useEditorStore(s => s.files);

  // ── Data ──

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await assetService.list(projectId);
      setAssets(data || []);
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, [projectId]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  // ── Multi-file upload ──

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);

    // Enforce batch limit
    if (files.length > ASSET_LIMITS.maxFilesPerUpload) {
      const { toast } = await import('../../components/shared/Toast');
      toast.warning('Upload Limit', `Maximum ${ASSET_LIMITS.maxFilesPerUpload} files per upload. You selected ${files.length}.`);
      return;
    }

    // Validate each file before queuing
    const validFiles: File[] = [];
    const errors: string[] = [];
    for (const f of files) {
      const err = validateFile(f);
      if (err) errors.push(err);
      else validFiles.push(f);
    }

    if (errors.length > 0 && validFiles.length === 0) {
      const { toast } = await import('../../components/shared/Toast');
      toast.error('Upload Error', errors.join(', '));
      return;
    }

    const items: UploadQueueItem[] = validFiles.map(f => ({
      file: f, id: crypto.randomUUID(), progress: 0, status: 'pending' as const,
    }));

    // Also add failed items for skipped files
    const errorItems: UploadQueueItem[] = files
      .filter(f => !validFiles.includes(f))
      .map(f => ({
        file: f, id: crypto.randomUUID(), progress: 0, status: 'error' as const,
        error: validateFile(f) || 'Validation failed',
      }));

    setUploadQueue(prev => [...prev, ...errorItems, ...items]);

    for (const item of items) {
      setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading' } : q));
      try {
        await assetService.upload(item.file, projectId, (p) => {
          setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: p.percent } : q));
        });
        setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done', progress: 100 } : q));
      } catch (err: any) {
        setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: err.message } : q));
      }
    }
    setTimeout(() => setUploadQueue(prev => prev.filter(q => q.status !== 'done')), 2000);
    loadAssets();
  }, [loadAssets, projectId]);

  // ── Operations ──

  const deleteAsset = async (assetId: string) => {
    try {
      await assetService.delete(assetId);
      setAssets(prev => prev.filter(a => a.id !== assetId));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(assetId); return n; });
    } catch { /* silent */ }
  };

  const bulkDelete = async () => {
    for (const id of Array.from(selectedIds)) await deleteAsset(id);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertAssetCode = (asset: Asset) => {
    if (!onInsertUrl) return;
    const ext = activeFilePath?.split('.').pop() || '';
    const isCss = ['css', 'scss', 'less'].includes(ext);
    onInsertUrl(getCodeSnippet(asset, isCss ? 'css' : 'html'));
  };

  const getAssetUsage = useCallback((asset: Asset): string[] => {
    const url = asset.cdnUrl || asset.url || asset.originalName;
    return Object.entries(files)
      .filter(([, content]) => content.includes(url) || content.includes(asset.originalName))
      .map(([path]) => path);
  }, [files]);

  // ── Drag & Drop ──

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ── Filter + Sort ──

  const filtered = useMemo(() => {
    let result = [...assets];
    if (typeFilter !== 'all') result = result.filter(a => a.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.originalName.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.originalName.localeCompare(b.originalName); break;
        case 'size': cmp = (a.originalSize || 0) - (b.originalSize || 0); break;
        case 'date': cmp = new Date(a.uploadedAt || a.createdAt).getTime() - new Date(b.uploadedAt || b.createdAt).getTime(); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [assets, typeFilter, searchQuery, sortField, sortDir]);

  const isAllSelected = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id));

  // ── Render ──

  return (
    <div className={`flex flex-col h-full bg-zinc-900/90 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-canvas-border">
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-primary-400" />
          <span className="text-sm font-semibold text-white">Assets</span>
          <span className="px-1.5 py-0.5 bg-white/10 rounded-full text-[10px] text-zinc-400">{assets.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {selectMode && selectedIds.size > 0 && (
            <button onClick={bulkDelete}
              className="p-1.5 rounded-md bg-primary-600/20 hover:bg-primary-600/40 text-primary-400 transition-colors" title="Delete selected">
              <Trash2 size={13} />
            </button>
          )}
          <button onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedIds(new Set()); }}
            className={`p-1.5 rounded-md transition-colors ${selectMode ? 'bg-primary-600/20 text-primary-400' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
            title="Bulk select">
            <CheckSquare size={13} />
          </button>
          <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            {viewMode === 'grid' ? <List size={13} /> : <Grid size={13} />}
          </button>
          <button onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-md transition-colors ${showInfo ? 'bg-primary-600/20 text-primary-400' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
            title="How to use assets">
            <HelpCircle size={13} />
          </button>
          <button onClick={loadAssets}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-canvas-border">
            <div className="px-3 py-2.5 bg-gradient-to-b from-primary-600/5 to-transparent space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-primary-400" />
                <span className="text-[11px] font-semibold text-white">Asset Manager</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Upload images, videos, fonts, docs, and code files to your project. Assets are stored on CDN for fast delivery.
              </p>
              <div className="space-y-1">
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] text-primary-400 mt-px">1.</span>
                  <span className="text-[10px] text-zinc-400"><b className="text-zinc-300">Upload</b> — Drag & drop or click the upload zone</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] text-primary-400 mt-px">2.</span>
                  <span className="text-[10px] text-zinc-400"><b className="text-zinc-300">Browse</b> — Filter by type, search, sort</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] text-primary-400 mt-px">3.</span>
                  <span className="text-[10px] text-zinc-400"><b className="text-zinc-300">Use</b> — Click an asset to preview, copy URL, or insert HTML/CSS code into your project</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {['Images', 'Videos', 'Audio', 'PDFs', 'Docs', 'Fonts', 'Code', 'Archives'].map(t => (
                  <span key={t} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-zinc-500">{t}</span>
                ))}
              </div>
              <div className="text-[9px] text-zinc-600 pt-0.5">Max {ASSET_LIMITS.maxFileSizeMB} MB per file · Up to {ASSET_LIMITS.maxFilesPerUpload} files per batch</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Type Filters */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-canvas-border overflow-x-auto scrollbar-none">
        {TYPE_FILTERS.map(f => (
          <button key={f.key} onClick={() => setTypeFilter(f.key)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${typeFilter === f.key ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}>
            {f.icon} {f.label}
            {f.key !== 'all' && (
              <span className="text-[9px] opacity-60">{assets.filter(a => a.type === f.key).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-canvas-border">
        <div className="flex-1 flex items-center gap-1 bg-white/5 rounded-md px-2">
          <Search size={11} className="text-zinc-500" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="bg-transparent text-[11px] text-white w-full py-1 outline-none placeholder:text-zinc-600" />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X size={10} className="text-zinc-500" /></button>}
        </div>
        <div className="relative">
          <button onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-0.5 p-1 rounded-md hover:bg-white/10 text-zinc-400 text-[10px]">
            <ArrowUpDown size={11} />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-zinc-800 border border-canvas-border rounded-lg shadow-xl z-20 py-1">
              {(['name', 'size', 'date', 'type'] as SortField[]).map(f => (
                <button key={f}
                  onClick={() => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } setShowSortMenu(false); }}
                  className={`w-full text-left px-3 py-1 text-[11px] hover:bg-white/10 flex items-center justify-between ${sortField === f ? 'text-primary-400' : 'text-zinc-400'}`}>
                  <span className="capitalize">{f}</span>
                  {sortField === f && (sortDir === 'asc' ? <SortAsc size={10} /> : <SortDesc size={10} />)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Select Bar */}
      {selectMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-600/10 border-b border-primary-500/20">
          <button onClick={isAllSelected ? () => setSelectedIds(new Set()) : () => setSelectedIds(new Set(filtered.map(a => a.id)))}
            className="text-[10px] text-primary-400 hover:text-primary-300">{isAllSelected ? 'Deselect All' : 'Select All'}</button>
          <span className="text-[10px] text-zinc-500">{selectedIds.size} selected</span>
        </div>
      )}

      {/* Upload Zone */}
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        className={`mx-3 mt-2 rounded-xl border-2 border-dashed transition-all cursor-pointer ${isDragging ? 'border-primary-500 bg-primary-500/10 scale-[1.02]' : 'border-canvas-border hover:border-canvas-border'
          }`}
        onClick={() => fileInputRef.current?.click()}>
        <div className="flex flex-col items-center py-3 gap-0.5">
          <Upload size={16} className="text-zinc-500 mb-0.5" />
          <span className="text-[10px] text-zinc-400">Drop files or click to upload</span>
          <span className="text-[9px] text-zinc-600">Images, videos, fonts, docs, code &amp; more</span>
          <span className="text-[9px] text-zinc-600">Max {ASSET_LIMITS.maxFileSizeMB} MB · Up to {ASSET_LIMITS.maxFilesPerUpload} files</span>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.rtf,.woff,.woff2,.ttf,.otf,.eot,.svg,.css,.js,.ts,.jsx,.tsx,.json,.html,.xml,.yaml,.yml,.sh,.py,.zip,.gz,.tar,.7z,.rar,.wasm"
          onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="mx-3 mt-2 space-y-1">
          {uploadQueue.map(item => (
            <div key={item.id} className="flex items-center gap-2 px-2 py-1 bg-white/[0.03] rounded-lg">
              {item.status === 'uploading' ? <Loader2 size={10} className="animate-spin text-primary-400" />
                : item.status === 'done' ? <Check size={10} className="text-emerald-400" />
                  : item.status === 'error' ? <X size={10} className="text-primary-400" />
                    : <Loader2 size={10} className="text-zinc-500" />}
              <span className="text-[10px] text-zinc-400 flex-1 truncate">{item.file.name}</span>
              {item.status === 'uploading' && (
                <div className="w-12 h-1 bg-white/10 rounded-full">
                  <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                </div>
              )}
              {item.status === 'error' && <span className="text-[9px] text-primary-400 truncate max-w-[120px]" title={item.error}>{item.error || 'Failed'}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Asset Grid/List */}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500">
            <FolderOpen size={24} className="opacity-30 mb-2" />
            <span className="text-xs">{assets.length === 0 ? 'No assets uploaded yet' : 'No matching assets'}</span>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map(asset => (
              <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className={`group relative rounded-lg bg-white/[0.03] border overflow-hidden transition-all cursor-pointer ${selectedIds.has(asset.id) ? 'border-primary-500/50 ring-1 ring-primary-500/20' : 'border-canvas-border hover:border-primary-500/30'
                  }`}
                onClick={() => selectMode ? toggleSelect(asset.id) : setPreviewAsset(asset)}>
                {selectMode && (
                  <div className="absolute top-1 left-1 z-10">
                    {selectedIds.has(asset.id) ? <CheckSquare size={14} className="text-primary-400" /> : <Square size={14} className="text-zinc-500" />}
                  </div>
                )}
                <div className="aspect-square flex items-center justify-center bg-black/20 relative">
                  {asset.thumbnailUrl || asset.type === 'image' ? (
                    <img src={asset.thumbnailUrl || asset.cdnUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">{TYPE_ICONS[asset.type] || TYPE_ICONS.other}</div>
                  )}
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[8px] text-zinc-300">
                    {formatSize(asset.originalSize)}
                  </span>
                </div>
                <div className="px-1.5 py-1">
                  <p className="text-[9px] text-zinc-400 truncate" title={asset.originalName}>{asset.originalName}</p>
                </div>
                {!selectMode && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); copyToClipboard(asset.cdnUrl, asset.id); }}
                      className="p-1.5 bg-white/10 rounded-md hover:bg-white/20" title="Copy URL">
                      {copiedId === asset.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-white" />}
                    </button>
                    {onInsertUrl && (
                      <button onClick={e => { e.stopPropagation(); insertAssetCode(asset); }}
                        className="p-1.5 bg-primary-600/50 rounded-md hover:bg-primary-600/70" title="Insert into code">
                        <Code size={12} className="text-white" />
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteAsset(asset.id); }}
                      className="p-1.5 bg-primary-600/30 rounded-md hover:bg-primary-600/50" title="Delete">
                      <Trash2 size={12} className="text-primary-300" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(asset => {
              const usage = getAssetUsage(asset);
              return (
                <motion.div key={asset.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border group cursor-pointer ${selectedIds.has(asset.id) ? 'border-primary-500/50' : 'border-canvas-border'
                    }`}
                  onClick={() => selectMode ? toggleSelect(asset.id) : setPreviewAsset(asset)}>
                  {selectMode && (
                    selectedIds.has(asset.id) ? <CheckSquare size={14} className="text-primary-400" /> : <Square size={14} className="text-zinc-500" />
                  )}
                  <span>{TYPE_ICONS[asset.type] || TYPE_ICONS.other}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-300 truncate">{asset.originalName}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-600">{formatSize(asset.originalSize)}</span>
                      {asset.width && asset.height && <span className="text-[9px] text-zinc-600">{asset.width}×{asset.height}</span>}
                      {usage.length > 0 && <span className="text-[9px] text-emerald-500">{usage.length} ref{usage.length > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); copyToClipboard(asset.cdnUrl, asset.id); }} className="p-1 rounded hover:bg-white/10">
                      {copiedId === asset.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-zinc-400" />}
                    </button>
                    {onInsertUrl && (
                      <button onClick={e => { e.stopPropagation(); insertAssetCode(asset); }} className="p-1 rounded hover:bg-white/10" title="Insert code">
                        <Code size={12} className="text-zinc-400" />
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteAsset(asset.id); }} className="p-1 rounded hover:bg-primary-500/20">
                      <Trash2 size={12} className="text-zinc-400 hover:text-primary-400" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewAsset(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-[90vw] max-w-2xl max-h-[85vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-canvas-border flex flex-col"
              onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-canvas-border">
                <div className="flex items-center gap-2 min-w-0">
                  {TYPE_ICONS[previewAsset.type]}
                  <span className="text-sm text-white font-medium truncate">{previewAsset.originalName}</span>
                </div>
                <button onClick={() => setPreviewAsset(null)} className="p-1 rounded-md hover:bg-white/10">
                  <X size={16} className="text-zinc-400" />
                </button>
              </div>

              {/* Preview Area */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-[200px] max-h-[50vh] overflow-auto bg-black/20">
                {previewAsset.type === 'image' || previewAsset.type === 'icon' ? (
                  <img src={previewAsset.cdnUrl} alt={previewAsset.originalName} className="max-w-full max-h-[45vh] object-contain rounded" />
                ) : previewAsset.type === 'video' ? (
                  <video src={previewAsset.cdnUrl} controls className="max-w-full max-h-[45vh] rounded" />
                ) : (
                  <div className="text-center py-8">
                    <div className="mb-2">{TYPE_ICONS[previewAsset.type]}</div>
                    <p className="text-xs text-zinc-500">Preview not available for this file type</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="px-4 py-3 border-t border-canvas-border space-y-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Type</span>
                    <span className="text-[10px] text-zinc-300 capitalize">{previewAsset.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Size</span>
                    <span className="text-[10px] text-zinc-300">{formatSize(previewAsset.originalSize)}</span>
                  </div>
                  {previewAsset.width && previewAsset.height && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">Dimensions</span>
                      <span className="text-[10px] text-zinc-300">{previewAsset.width} × {previewAsset.height}px</span>
                    </div>
                  )}
                  {previewAsset.mimeType && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">MIME</span>
                      <span className="text-[10px] text-zinc-300">{previewAsset.mimeType}</span>
                    </div>
                  )}
                  {previewAsset.optimizedSize && previewAsset.optimizedSize < previewAsset.originalSize && (
                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-[10px] text-zinc-500">Optimized</span>
                      <span className="text-[10px] text-emerald-400">
                        {formatSize(previewAsset.optimizedSize)} ({Math.round((1 - previewAsset.optimizedSize / previewAsset.originalSize) * 100)}% saved)
                      </span>
                    </div>
                  )}
                  {(() => {
                    const u = getAssetUsage(previewAsset); return u.length > 0 ? (
                      <div className="flex items-center justify-between col-span-2">
                        <span className="text-[10px] text-zinc-500">Used in</span>
                        <span className="text-[10px] text-emerald-400 truncate max-w-[200px]">{u.join(', ')}</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Code Snippet */}
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] text-zinc-500">Code snippet:</span>
                    {(['html', 'css', 'url'] as const).map(t => (
                      <button key={t} onClick={() => setCodeSnippetType(t)}
                        className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${codeSnippetType === t ? 'bg-primary-600/20 text-primary-400' : 'text-zinc-500 hover:text-zinc-300'
                          }`}>
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-black/30 rounded-lg px-3 py-2">
                    <code className="text-[10px] text-zinc-300 flex-1 break-all font-mono whitespace-pre-wrap">
                      {getCodeSnippet(previewAsset, codeSnippetType)}
                    </code>
                    <button onClick={() => copyToClipboard(getCodeSnippet(previewAsset, codeSnippetType), previewAsset.id + '-code')}
                      className="p-1 rounded hover:bg-white/10 shrink-0">
                      {copiedId === previewAsset.id + '-code' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-zinc-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-canvas-border">
                <a href={previewAsset.cdnUrl} download={previewAsset.originalName} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-xs text-zinc-300 transition-colors">
                  <Download size={12} /> Download
                </a>
                <div className="flex-1" />
                {onInsertUrl && (
                  <button onClick={() => { insertAssetCode(previewAsset); setPreviewAsset(null); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-600/80 hover:bg-primary-600 rounded-md text-xs text-white transition-colors">
                    <Code size={12} /> Insert
                  </button>
                )}
                <button onClick={() => copyToClipboard(previewAsset.cdnUrl, previewAsset.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-md text-xs text-white transition-colors">
                  {copiedId === previewAsset.id ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy URL</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssetBrowser;
