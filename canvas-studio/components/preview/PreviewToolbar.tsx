/**
 * PreviewToolbar — URL bar, responsive toggles, refresh, console/network panel toggles
 * Glassmorphism toolbar with animated device selector
 */
import React from 'react';
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
} from 'lucide-react';
import { Tooltip } from '../shared/Tooltip';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

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
}) => {
  return (
    <div className="h-10 bg-canvas-card/95 backdrop-blur-xl border-b border-canvas-border flex items-center px-3 gap-2 shrink-0">
      {/* URL Bar */}
      <div className="flex-1 flex items-center">
        <div className="flex-1 max-w-lg relative group">
          {/* Loading bar */}
          {isLoading && (
            <motion.div
              className="absolute bottom-0 left-0 h-px bg-gradient-to-r from-violet-500 to-cyan-500"
              initial={{ width: '0%' }}
              animate={{ width: '80%' }}
              transition={{ duration: 2, ease: 'easeOut' }}
            />
          )}

          <div className="flex items-center bg-white/[0.04] border border-canvas-border rounded-lg px-3 py-1 gap-2 group-hover:border-white/[0.1] transition-colors">
            <div className={`w-2 h-2 rounded-full ${url.includes('appview.sanbayfusion.com') ? 'bg-emerald-400' : 'bg-emerald-400/60'}`} />
            <span className={`text-[11px] text-canvas-muted font-mono truncate ${url.includes('appview.sanbayfusion.com') ? 'select-all' : ''}`}>
              {url}
            </span>
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
            className={`p-1.5 transition-colors ${showConsole ? 'text-violet-400' : 'text-canvas-muted-deep hover:text-canvas-text'
              }`}
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <Tooltip content="Network">
          <button
            onClick={onToggleNetwork}
            className={`p-1.5 transition-colors ${showNetwork ? 'text-violet-400' : 'text-canvas-muted-deep hover:text-canvas-text'
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
