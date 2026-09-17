/**
 * TabBar — Multi-tab editor for Canvas Studio
 * Shows open files as tabs, allows switching, closing, and reordering
 */

import React, { useRef, useCallback, useState } from 'react';
import { editorBridge } from '../services/editorBridge';

// File icon colors by extension
const ICON_COLORS: Record<string, string> = {
  html: 'text-orange-400',
  htm: 'text-orange-400',
  css: 'text-blue-400',
  scss: 'text-pink-400',
  less: 'text-blue-300',
  js: 'text-yellow-400',
  jsx: 'text-yellow-400',
  ts: 'text-blue-500',
  tsx: 'text-blue-500',
  json: 'text-green-400',
  md: 'text-canvas-muted',
  py: 'text-green-500',
  svg: 'text-purple-400',
};

function getIconColor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return ICON_COLORS[ext] || 'text-canvas-muted';
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

interface TabBarProps {
  openFiles: string[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
  darkMode?: boolean;
}

const TabBar: React.FC<TabBarProps> = ({
  openFiles,
  activeFile,
  onSelectFile,
  onCloseFile,
  darkMode = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  const handleCloseTab = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      onCloseFile(path);
    },
    [onCloseFile],
  );

  // Middle-click to close tab
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, path: string) => {
      if (e.button === 1) {
        e.preventDefault();
        onCloseFile(path);
      }
    },
    [onCloseFile],
  );

  // Horizontal scroll with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  if (openFiles.length === 0) return null;

  return (
    <div
      className={`flex items-center h-9 shrink-0 overflow-hidden border-b ${
        darkMode
          ? 'bg-canvas-card border-gray-800'
          : 'bg-gray-100 border-gray-200'
      }`}
    >
      {/* Tab scroll container */}
      <div
        ref={scrollRef}
        className="flex items-center flex-1 overflow-x-auto no-scrollbar"
        onWheel={handleWheel}
      >
        {openFiles.map((path) => {
          const isActive = path === activeFile;
          const isModified = editorBridge.isFileModified?.(path) || false;
          const fileName = getFileName(path);
          const iconColor = getIconColor(path);

          return (
            <div
              key={path}
              className={`group flex items-center gap-1.5 h-full px-3 cursor-pointer select-none shrink-0 border-r transition-colors ${
                isActive
                  ? darkMode
                    ? 'bg-canvas-card text-gray-200 border-gray-800 border-b-2 border-b-cyan-500'
                    : 'bg-white text-gray-800 border-gray-200 border-b-2 border-b-cyan-600'
                  : darkMode
                    ? 'text-canvas-muted-deep hover:text-canvas-text hover:bg-canvas-card border-gray-800'
                    : 'text-canvas-muted-deep hover:text-gray-700 hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => onSelectFile(path)}
              onMouseDown={(e) => handleMouseDown(e, path)}
              title={path}
              draggable
              onDragStart={() => setDraggedTab(path)}
              onDragEnd={() => setDraggedTab(null)}
            >
              {/* File type dot */}
              <span className={`w-2 h-2 rounded-full ${iconColor.replace('text-', 'bg-')} opacity-70`} />

              {/* File name */}
              <span className="text-[11px] font-medium whitespace-nowrap max-w-[120px] truncate">
                {fileName}
              </span>

              {/* Modified indicator */}
              {isModified && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
              )}

              {/* Close button */}
              <button
                className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                  darkMode
                    ? 'hover:bg-gray-700 text-canvas-muted-deep hover:text-canvas-text'
                    : 'hover:bg-gray-200 text-canvas-muted hover:text-gray-600'
                }`}
                onClick={(e) => handleCloseTab(e, path)}
                title={`Close ${fileName}`}
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* New tab button */}
      <button
        className={`flex items-center justify-center w-8 h-full shrink-0 transition-colors ${
          darkMode
            ? 'text-gray-600 hover:text-cyan-400 hover:bg-gray-800'
            : 'text-canvas-muted hover:text-cyan-600 hover:bg-gray-200'
        }`}
        onClick={() => {
          const name = prompt('New file name:');
          if (name) {
            const path = name.startsWith('/') ? name : `/${name}`;
            editorBridge.createFile(path, '');
            onSelectFile(path);
          }
        }}
        title="New File"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* CSS for hiding scrollbar */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default TabBar;
