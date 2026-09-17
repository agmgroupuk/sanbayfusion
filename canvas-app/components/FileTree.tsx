/**
 * FileTree Component for Standalone Canvas App
 * Displays project structure and enables file selection
 * 
 * This is the STANDALONE version at /canvas-app/
 */

import React, { useState } from 'react';
import { FileNode, editorBridge } from '../services/editorBridge';
import { Folder, FolderOpen, FileText, FilePlus, FolderPlus, Trash2, Edit2, ChevronRight } from 'lucide-react';

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

// Get icon color by language
const getFileIconColor = (language?: string): string => {
  const colors: Record<string, string> = {
    html: 'text-orange-400',
    css: 'text-blue-400',
    scss: 'text-pink-400',
    javascript: 'text-yellow-400',
    typescript: 'text-blue-500',
    json: 'text-green-400',
    markdown: 'text-canvas-muted',
    python: 'text-green-500',
    java: 'text-primary-400',
    go: 'text-cyan-400',
    rust: 'text-orange-500',
  };
  return colors[language || ''] || 'text-canvas-muted';
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
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-all rounded-md mx-1 ${isActive
            ? darkMode
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-cyan-100 text-cyan-700'
            : darkMode
              ? 'text-canvas-muted hover:bg-cyan-900/20 hover:text-gray-200'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/Collapse for folders */}
        {node.type === 'folder' && (
          <ChevronRight
            className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          />
        )}
        {node.type === 'file' && <span className="w-3" />}

        {/* Icon */}
        {node.type === 'folder' ? (
          isOpen ? (
            <FolderOpen className="h-4 w-4 text-yellow-400" />
          ) : (
            <Folder className="h-4 w-4 text-yellow-400" />
          )
        ) : (
          <FileText className={`h-4 w-4 ${getFileIconColor(node.language)}`} />
        )}

        {/* Name */}
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className={`flex-1 text-xs px-1 py-0.5 rounded outline-none ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            aria-label="Rename file"
            title="Enter new file name"
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
                <FilePlus className="h-3 w-3" />
              </button>
            )}
            {onFileRename && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
                className={`p-0.5 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                title="Rename"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            )}
            {onFileDelete && (
              <button
                onClick={handleDelete}
                className={`p-0.5 rounded ${darkMode ? 'hover:bg-primary-900/50 text-primary-400' : 'hover:bg-red-100 text-primary-500'}`}
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
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
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-cyan-900/30' : 'border-gray-200'}`}>
        <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>
          Explorer
        </span>
        <div className="flex items-center gap-1">
          {onFileCreate && (
            <button
              onClick={handleNewFile}
              className={`p-1.5 rounded transition-all ${darkMode ? 'hover:bg-cyan-900/30 text-canvas-muted-deep hover:text-cyan-400' : 'hover:bg-gray-100 text-canvas-muted hover:text-cyan-600'}`}
              title="New File"
            >
              <FilePlus className="h-4 w-4" />
            </button>
          )}
          {onFileCreate && (
            <button
              onClick={handleNewFolder}
              className={`p-1.5 rounded transition-all ${darkMode ? 'hover:bg-cyan-900/30 text-canvas-muted-deep hover:text-cyan-400' : 'hover:bg-gray-100 text-canvas-muted hover:text-cyan-600'}`}
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {files.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
            <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
      <div className={`px-4 py-2 border-t ${darkMode ? 'border-cyan-900/30' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
            {editorBridge.getAllFilePaths().length} files
          </span>
          {editorBridge.hasUnsavedChanges() && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
              Unsaved
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileTree;
