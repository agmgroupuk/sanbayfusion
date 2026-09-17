/**
 * PreviewToolbar — URL bar, view/device modes, zoom, refresh, console/network panel toggles
 * Glassmorphism toolbar with animated device selector and view mode switcher
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  ExternalLink,
  Terminal,
  Wifi,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Eye,
  Code,
  Columns,
} from 'lucide-react';
import { Tooltip } from '../shared/Tooltip';

type DeviceType = 'desktop' | 'tablet' | 'mobile';
type ViewMode = 'desktop' | 'tablet' | 'mobile' | 'code' | 'split';

interface PreviewToolbarProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  url: string;
  onRefresh: () => void;
  onOpenExternal?: () => void;
  showConsole: boolean;
  onToggleConsole: () => void;
  showNetwork: boolean;
  onToggleNetwork: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFullscreen?: () => void;
  isLoading?: boolean;
  canUndo?: boolean;
  onUndo?: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  versionIndex?: number;
  versionTotal?: number;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onEditorModeEdit?: () => void;
}

const devices: { type: DeviceType; icon: React.FC<any>; label: string; shortcut: string }[] = [
  { type: 'desktop', icon: Monitor, label: 'Desktop', shortcut: '⌘1' },
  { type: 'tablet', icon: Tablet, label: 'Tablet', shortcut: '⌘2' },
  { type: 'mobile', icon: Smartphone, label: 'Mobile', shortcut: '⌘3' },
];

const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  device,
  onDeviceChange,
  url,
  onRefresh,
  onOpenExternal,
  showConsole,
  onToggleConsole,
  showNetwork,
  onToggleNetwork,
  zoom,
  onZoomChange,
  onFullscreen,
  isLoading = false,
  canUndo = false,
  onUndo,
  canRedo = false,
  onRedo,
  versionIndex,
  versionTotal,
  viewMode,
  onViewModeChange,
  onEditorModeEdit,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="h-10 bg-canvas-card/95 backdrop-blur-xl border-b border-canvas-border flex items-center px-3 gap-2 shrink-0">
      {/* View Mode Switcher */}
      {viewMode && onViewModeChange && (
        <>
          <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-lg border border-canvas-border">
            <Tooltip content="Preview" shortcut="⌘P">
              <button
                onClick={() => onViewModeChange('desktop')}
                className={`p-1.5 rounded-md text-[10px] font-semibold transition-all ${viewMode === 'desktop' || viewMode === 'tablet' || viewMode === 'mobile' ? 'bg-primary-500/20 text-primary-300' : 'text-canvas-muted-deep hover:text-canvas-text'}`}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Code Editor" shortcut="⌘E">
              <button
                onClick={() => { onViewModeChange('code'); onEditorModeEdit?.(); }}
                className={`p-1.5 rounded-md text-[10px] font-semibold transition-all ${viewMode === 'code' ? 'bg-primary-500/20 text-primary-300' : 'text-canvas-muted-deep hover:text-canvas-text'}`}
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Split View" shortcut="⌘S">
              <button
                onClick={() => { onViewModeChange('split'); onEditorModeEdit?.(); }}
                className={`p-1.5 rounded-md text-[10px] font-semibold transition-all ${viewMode === 'split' ? 'bg-primary-500/20 text-primary-300' : 'text-canvas-muted-deep hover:text-canvas-text'}`}
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>

          {/* Device Frames */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-lg border border-canvas-border">
            {devices.map(({ type, icon: Icon, label, shortcut }) => (
              <Tooltip key={type} content={label} shortcut={shortcut}>
                <button
                  onClick={() => onViewModeChange(type)}
                  className={`p-1.5 rounded-md transition-all ${viewMode === type ? 'bg-primary-500/20 text-primary-300' : 'text-canvas-muted-deep hover:text-canvas-text'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            ))}
          </div>

          <div className="w-px h-5 bg-white/[0.06]" />
        </>
      )}

      {/* URL Bar */}
      <div className="flex items-center min-w-0 max-w-[200px]">
        <div className="w-full relative group">
          {/* Loading bar */}
          {isLoading && (
            <motion.div
              className="absolute bottom-0 left-0 h-px bg-gradient-to-r from-primary-600 to-primary-500"
              initial={{ width: '0%' }}
              animate={{ width: '80%' }}
              transition={{ duration: 2, ease: 'easeOut' }}
            />
          )}

          <div className="flex items-center bg-white/[0.04] border border-canvas-border rounded-lg px-2 py-1 gap-1.5 group-hover:border-white/[0.1] transition-colors">
            <div className={`w-2 h-2 rounded-full shrink-0 ${url.includes('preview.maula.ai') ? 'bg-emerald-400' : 'bg-emerald-400/60'}`} />
            <span className="text-[10px] text-canvas-muted font-mono truncate select-all min-w-0" title={url}>
              {(() => {
                try {
                  const u = url.startsWith('http') ? url : `https://${url}`;
                  const parsed = new URL(u);
                  const path = parsed.pathname.length > 20 ? parsed.pathname.slice(0, 8) + '…' + parsed.pathname.slice(-8) : parsed.pathname;
                  return parsed.host + path;
                } catch { return url; }
              })()}
            </span>
            <button
              onClick={handleCopyUrl}
              title="Copy preview URL"
              className="shrink-0 text-canvas-muted-deep hover:text-canvas-text transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/[0.06]" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="Zoom Out">
          <button
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
            disabled={zoom <= 0.25}
            className="p-1.5 text-canvas-muted-deep hover:text-canvas-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <span className="text-[10px] text-canvas-muted-deep font-mono w-8 text-center">
          {Math.round(zoom * 100)}%
        </span>

        <Tooltip content="Zoom In">
          <button
            onClick={() => onZoomChange(Math.min(2, zoom + 0.25))}
            disabled={zoom >= 2}
            className="p-1.5 text-canvas-muted-deep hover:text-canvas-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/[0.06]" />

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="Previous Version" shortcut="⌘Z">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-canvas-muted-deep hover:text-canvas-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        {versionTotal !== undefined && versionTotal > 0 && (
          <span className="text-[9px] text-canvas-muted-deep font-mono min-w-[32px] text-center">
            v{(versionIndex ?? 0) + 1}/{versionTotal}
          </span>
        )}

        <Tooltip content="Next Version" shortcut="⌘⇧Z">
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-canvas-muted-deep hover:text-canvas-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <Tooltip content="Refresh" shortcut="⌘R">
          <button
            onClick={onRefresh}
            className="p-1.5 text-canvas-muted-deep hover:text-canvas-text transition-colors"
          >
            <motion.div
              animate={isLoading ? { rotate: 360 } : {}}
              transition={isLoading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </motion.div>
          </button>
        </Tooltip>

        <Tooltip content="Console" shortcut="⌘J">
          <button
            onClick={onToggleConsole}
            className={`p-1.5 transition-colors ${showConsole ? 'text-primary-400' : 'text-canvas-muted-deep hover:text-canvas-text'
              }`}
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <Tooltip content="Network">
          <button
            onClick={onToggleNetwork}
            className={`p-1.5 transition-colors ${showNetwork ? 'text-primary-400' : 'text-canvas-muted-deep hover:text-canvas-text'
              }`}
          >
            <Wifi className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        {onOpenExternal && (
          <Tooltip content="Open in New Tab">
            <button
              onClick={onOpenExternal}
              className="p-1.5 text-canvas-muted-deep hover:text-canvas-text transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        )}

        {onFullscreen && (
          <Tooltip content="Fullscreen">
            <button
              onClick={onFullscreen}
              className="p-1.5 text-canvas-muted-deep hover:text-canvas-text transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default PreviewToolbar;
