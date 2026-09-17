// File Tree Component for Project Navigation
// Displays project structure and enables file selection

import React, { useState, useCallback } from 'react';
import { FileNode } from '../types';
import { editorBridge } from '../services/editorBridge';

interface FileTreeProps {
  files: FileNode[];
  activeFile: string | null;
  onFileSelect: (path: string) => void;
  onFileCreate?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileRename?: (oldPath: string, newPath: string) => void;
  darkMode?: boolean;
}

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  activeFile: string | null;
  onFileSelect: (path: string) => void;
  onFileCreate?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileRename?: (oldPath: string, newPath: string) => void;
  darkMode: boolean;
}

const FileIcon: React.FC<{ type: 'file' | 'folder'; language?: string; isOpen?: boolean }> = ({ 
  type, 
  language, 
  isOpen 
}) => {
  if (type === 'folder') {
    return isOpen ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    );
  }

  // File icons by language
  const iconColors: Record<string, string> = {
    html: 'text-orange-400',
    css: 'text-blue-400',
    scss: 'text-pink-400',
    javascript: 'text-yellow-400',
    typescript: 'text-blue-500',
    json: 'text-green-400',
    markdown: 'text-canvas-muted',
  };

  const color = iconColors[language || ''] || 'text-canvas-muted';

  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
};

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  depth,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  darkMode,
}) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);

  const isActive = activeFile === node.path;
  const hasChildren = node.type === 'folder' && node.children && node.children.length > 0;

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.path);
    }
  };

  const handleRename = () => {
    if (newName && newName !== node.name && onFileRename) {
      const newPath = node.path.replace(node.name, newName);
      onFileRename(node.path, newPath);
    }
    setIsRenaming(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFileDelete && confirm(`Delete "${node.name}"?`)) {
      onFileDelete(node.path);
    }
  };

  const handleCreateFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFileCreate && node.type === 'folder') {
      const fileName = prompt('Enter file name:');
      if (fileName) {
        onFileCreate(`${node.path}/${fileName}`);
      }
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-all rounded-lg mx-1 ${
          isActive 
            ? darkMode 
              ? 'bg-cyan-500/20 text-cyan-400' 
              : 'bg-cyan-100 text-cyan-700'
            : darkMode
              ? 'text-canvas-muted hover:bg-gray-800/50 hover:text-gray-200'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/Collapse for folders */}
        {node.type === 'folder' && (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        {node.type === 'file' && <span className="w-3" />}

        {/* Icon */}
        <FileIcon type={node.type} language={node.language} isOpen={isOpen} />

        {/* Name */}
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className={`flex-1 text-xs px-1 py-0.5 rounded outline-none ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            }`}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            aria-label="Rename file"
            title="Enter new file name"
            placeholder="Enter name"
          />
        ) : (
          <span className="flex-1 text-xs font-medium truncate">{node.name}</span>
        )}

        {/* Action buttons */}
        {isHovered && !isRenaming && (
          <div className="flex items-center gap-1">
            {node.type === 'folder' && onFileCreate && (
              <button
                onClick={handleCreateFile}
                className={`p-0.5 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                title="New File"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            {onFileRename && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
                className={`p-0.5 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                title="Rename"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onFileDelete && (
              <button
                onClick={handleDelete}
                className={`p-0.5 rounded ${darkMode ? 'hover:bg-primary-900/50 text-primary-400' : 'hover:bg-red-100 text-primary-500'}`}
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isOpen && (
        <div>
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onFileCreate={onFileCreate}
              onFileDelete={onFileDelete}
              onFileRename={onFileRename}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  darkMode = true,
}) => {
  const handleNewFile = () => {
    const fileName = prompt('Enter file name (e.g., component.html):');
    if (fileName && onFileCreate) {
      onFileCreate(`/${fileName}`);
    }
  };

  const handleNewFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      editorBridge.createFolder(`/${folderName}`);
    }
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-canvas-card' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewFile}
            className={`p-1.5 rounded-lg transition-all ${darkMode ? 'hover:bg-gray-800 text-canvas-muted-deep hover:text-cyan-400' : 'hover:bg-gray-100 text-canvas-muted hover:text-cyan-600'}`}
            title="New File"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={handleNewFolder}
            className={`p-1.5 rounded-lg transition-all ${darkMode ? 'hover:bg-gray-800 text-canvas-muted-deep hover:text-cyan-400' : 'hover:bg-gray-100 text-canvas-muted hover:text-cyan-600'}`}
            title="New Folder"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {files.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-xs">No files yet</p>
          </div>
        ) : (
          files.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onFileCreate={onFileCreate}
              onFileDelete={onFileDelete}
              onFileRename={onFileRename}
              darkMode={darkMode}
            />
          ))
        )}
      </div>

      {/* Footer with stats */}
      <div className={`px-4 py-2 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
            {editorBridge.getAllFilePaths().length} files
          </span>
          {editorBridge.hasUnsavedChanges() && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
              Unsaved
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileTree;
