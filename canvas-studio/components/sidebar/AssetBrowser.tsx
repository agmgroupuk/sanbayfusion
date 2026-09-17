/**
 * AssetBrowser — Upload, view, manage project assets
 * Drag-and-drop upload with progress, grid/list view, CDN URL copy
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

interface Asset {
  id: string;
  type: 'image' | 'video' | 'font' | 'document' | 'other';
  originalName: string;
  originalSize: number;
  optimizedSize?: number;
  cdnUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface AssetBrowserProps {
  projectId: string;
  onInsertUrl?: (url: string) => void;
  className?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon size={16} className="text-violet-400" />,
  video: <Film size={16} className="text-blue-400" />,
  font: <Type size={16} className="text-orange-400" />,
  document: <File size={16} className="text-cyan-400" />,
  other: <File size={16} className="text-zinc-400" />,
};

// ── Component ──────────────────────────────────────────────────────

const AssetBrowser: React.FC<AssetBrowserProps> = ({ projectId, onInsertUrl, className = '' }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch assets
  const loadAssets = useCallback(async () => {
    if (!projectId || projectId === 'default') { setAssets([]); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assets/${projectId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setAssets(data.assets || []);
    } catch {} finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  // Upload file
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/assets/upload');
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload error'));
        xhr.send(formData);
      });

      loadAssets();
    } catch {} finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete asset
  const deleteAsset = async (assetId: string) => {
    try {
      await fetch(`/api/assets/${assetId}`, { method: 'DELETE', credentials: 'include' });
      setAssets(prev => prev.filter(a => a.id !== assetId));
    } catch {}
  };

  // Copy CDN URL
  const copyUrl = (asset: Asset) => {
    navigator.clipboard.writeText(asset.cdnUrl);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  // Filter
  const filtered = assets.filter(a =>
    !searchQuery || a.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-900/90 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-canvas-border">
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-white">Assets</span>
          <span className="px-1.5 py-0.5 bg-white/10 rounded-full text-[10px] text-zinc-400">
            {assets.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            {viewMode === 'grid' ? <List size={14} /> : <Grid size={14} />}
          </button>
          <button onClick={loadAssets}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-canvas-border">
        <div className="flex items-center gap-1 bg-white/5 rounded-md px-2">
          <Search size={12} className="text-zinc-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="bg-transparent text-xs text-white w-full py-1.5 outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Drop Zone / Upload */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mx-3 mt-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
          isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-canvas-border hover:border-canvas-border'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center py-4">
          {isUploading ? (
            <>
              <Loader2 size={20} className="text-violet-400 animate-spin mb-1" />
              <span className="text-xs text-zinc-400">Uploading {uploadProgress}%</span>
              <div className="w-32 h-1 bg-white/10 rounded-full mt-2">
                <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </>
          ) : (
            <>
              <Upload size={18} className="text-zinc-500 mb-1" />
              <span className="text-[11px] text-zinc-500">Drop file or click to upload</span>
              <span className="text-[9px] text-zinc-600 mt-0.5">Max 10MB · Images, fonts, videos</span>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,.pdf,.woff,.woff2,.ttf,.otf"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">
            {assets.length === 0 ? 'No assets yet' : 'No matching assets'}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-3 gap-2">
            {filtered.map(asset => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative rounded-lg bg-white/[0.03] border border-canvas-border overflow-hidden hover:border-violet-500/30 transition-colors"
              >
                {/* Thumbnail */}
                <div
                  className="aspect-square flex items-center justify-center bg-black/20 cursor-pointer"
                  onClick={() => setPreviewAsset(asset)}
                >
                  {asset.thumbnailUrl ? (
                    <img src={asset.thumbnailUrl} alt={asset.originalName} className="w-full h-full object-cover" />
                  ) : (
                    TYPE_ICONS[asset.type] || TYPE_ICONS.other
                  )}
                </div>

                {/* Name */}
                <div className="px-1.5 py-1">
                  <p className="text-[9px] text-zinc-400 truncate" title={asset.originalName}>
                    {asset.originalName}
                  </p>
                </div>

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                  <button onClick={() => copyUrl(asset)}
                    className="p-1.5 bg-white/10 rounded-md hover:bg-white/20">
                    {copiedId === asset.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-white" />}
                  </button>
                  {onInsertUrl && (
                    <button onClick={() => onInsertUrl(asset.cdnUrl)}
                      className="p-1.5 bg-violet-600/50 rounded-md hover:bg-violet-600/70">
                      <ExternalLink size={12} className="text-white" />
                    </button>
                  )}
                  <button onClick={() => deleteAsset(asset.id)}
                    className="p-1.5 bg-primary-600/30 rounded-md hover:bg-primary-600/50">
                    <Trash2 size={12} className="text-primary-300" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-1">
            {filtered.map(asset => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-canvas-border group"
              >
                <span>{TYPE_ICONS[asset.type] || TYPE_ICONS.other}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{asset.originalName}</p>
                  <p className="text-[10px] text-zinc-600">{formatSize(asset.originalSize)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => copyUrl(asset)}
                    className="p-1 rounded hover:bg-white/10">
                    {copiedId === asset.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-zinc-400" />}
                  </button>
                  <button onClick={() => deleteAsset(asset.id)}
                    className="p-1 rounded hover:bg-primary-500/20">
                    <Trash2 size={12} className="text-zinc-400 hover:text-primary-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewAsset(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-2xl max-h-[80vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-canvas-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-canvas-border">
                <span className="text-sm text-white font-medium truncate">{previewAsset.originalName}</span>
                <button onClick={() => setPreviewAsset(null)}
                  className="p-1 rounded-md hover:bg-white/10">
                  <X size={16} className="text-zinc-400" />
                </button>
              </div>
              <div className="flex items-center justify-center p-4 min-h-[200px]">
                {previewAsset.type === 'image' ? (
                  <img src={previewAsset.cdnUrl} alt={previewAsset.originalName} className="max-w-full max-h-[60vh] object-contain rounded" />
                ) : (
                  <div className="text-center">
                    {TYPE_ICONS[previewAsset.type]}
                    <p className="text-xs text-zinc-400 mt-2">Preview not available</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-4 py-3 border-t border-canvas-border">
                <span className="text-[10px] text-zinc-500">{formatSize(previewAsset.originalSize)}</span>
                <div className="flex-1" />
                <button onClick={() => copyUrl(previewAsset)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-md text-xs text-white">
                  <Copy size={12} /> Copy URL
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
