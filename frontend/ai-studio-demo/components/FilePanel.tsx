/**
 * FilePanel - Virtual Filesystem Panel for Universal Chat
 * 
 * Shows project files created by the AI agent during conversation.
 * Provides file tree navigation, code viewer, and download capabilities.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  FileCode,
  FolderOpen,
  Folder,
  Download,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  File,
  Trash2,
  Archive,
  Eye,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface FilePanelProps {
  files: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
  onDeleteFile?: (path: string) => void;
}

// Detect language from file extension
function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', htm: 'html',
    css: 'css', scss: 'scss', sass: 'sass', less: 'less',
    js: 'javascript', jsx: 'jsx', mjs: 'javascript',
    ts: 'typescript', tsx: 'tsx',
    json: 'json',
    md: 'markdown',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    php: 'php',
    sql: 'sql',
    sh: 'bash', bash: 'bash', zsh: 'bash',
    yaml: 'yaml', yml: 'yaml',
    xml: 'xml', svg: 'xml',
    txt: 'text',
    env: 'bash',
    dockerfile: 'dockerfile',
    graphql: 'graphql', gql: 'graphql',
  };
  return map[ext] || 'text';
}

// Get file icon based on extension
function getFileIcon(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const colors: Record<string, string> = {
    html: 'text-orange-400',
    css: 'text-blue-400',
    scss: 'text-pink-400',
    js: 'text-yellow-400',
    jsx: 'text-yellow-300',
    ts: 'text-blue-500',
    tsx: 'text-blue-400',
    json: 'text-green-400',
    md: 'text-gray-400',
    py: 'text-green-500',
    svg: 'text-purple-400',
    env: 'text-yellow-600',
  };
  return colors[ext] || 'text-gray-500';
}

// Build file tree structure from flat path list
interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  
  for (const fullPath of paths.sort()) {
    const parts = fullPath.replace(/^\//, '').split('/');
    let current = root;
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += '/' + part;
      const isLast = i === parts.length - 1;
      
      let existing = current.find(n => n.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          children: [],
        };
        current.push(existing);
      }
      current = existing.children;
    }
  }
  
  return root;
}

// File tree node component
const TreeNodeItem: React.FC<{
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}> = ({ node, depth, selectedPath, onSelect, expandedFolders, onToggleFolder }) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;
  
  return (
    <div>
      <button
        onClick={() => node.isFolder ? onToggleFolder(node.path) : onSelect(node.path)}
        className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-white/5 transition-colors rounded ${
          isSelected ? 'bg-cyan-500/15 text-cyan-400' : 'text-gray-400'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {node.isFolder ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${getFileIcon(node.name)}`} />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {node.isFolder && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FilePanel: React.FC<FilePanelProps> = ({ files, isOpen, onClose, onDeleteFile }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const filePaths = useMemo(() => Object.keys(files), [files]);
  const fileTree = useMemo(() => buildFileTree(filePaths), [filePaths]);
  const fileCount = filePaths.length;
  const totalSize = useMemo(
    () => filePaths.reduce((sum, p) => sum + (files[p]?.length || 0), 0),
    [files, filePaths]
  );

  // Auto-expand all folders
  React.useEffect(() => {
    const folders = new Set<string>();
    filePaths.forEach(p => {
      const parts = p.replace(/^\//, '').split('/');
      let current = '';
      for (let i = 0; i < parts.length - 1; i++) {
        current += '/' + parts[i];
        folders.add(current);
      }
    });
    setExpandedFolders(folders);
  }, [filePaths]);

  // Select first file if none selected
  React.useEffect(() => {
    if (!selectedFile && filePaths.length > 0) {
      setSelectedFile(filePaths[0]);
    }
  }, [filePaths, selectedFile]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const copyContent = async () => {
    if (!selectedFile || !files[selectedFile]) return;
    await navigator.clipboard.writeText(files[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    if (!selectedFile || !files[selectedFile]) return;
    const blob = new Blob([files[selectedFile]], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'file';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    // Create a simple text archive with all files
    let content = '';
    for (const [path, fileContent] of Object.entries(files)) {
      content += `\n${'='.repeat(60)}\n`;
      content += `FILE: ${path}\n`;
      content += `${'='.repeat(60)}\n\n`;
      content += fileContent;
      content += '\n';
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-files.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedContent = selectedFile ? files[selectedFile] : '';
  const selectedLang = selectedFile ? getLanguage(selectedFile) : 'text';
  const isHtml = selectedFile?.endsWith('.html') || selectedFile?.endsWith('.htm');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] lg:w-[640px] bg-[#0d0d1a] border-l border-white/10 z-[100] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#0d0d1a] to-[#131328]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Project Files</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">
            {fileCount} file{fileCount !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-gray-500">
            {totalSize > 1024 ? `${(totalSize / 1024).toFixed(1)} KB` : `${totalSize} B`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={downloadAll}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Download all files"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="border-b border-white/10 overflow-y-auto" style={{ maxHeight: '220px', minHeight: '80px' }}>
        <div className="py-1">
          {fileTree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedFile}
              onSelect={setSelectedFile}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
            />
          ))}
          {fileCount === 0 && (
            <div className="text-center text-gray-600 text-xs py-8">
              No files yet. Ask the AI to build something!
            </div>
          )}
        </div>
      </div>

      {/* File Content Viewer */}
      {selectedFile && selectedContent !== undefined && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* File tab */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1a2e] border-b border-white/5">
            <div className="flex items-center gap-2">
              <FileCode className={`w-3.5 h-3.5 ${getFileIcon(selectedFile)}`} />
              <span className="text-xs text-gray-300 font-mono">{selectedFile}</span>
              <span className="text-[10px] text-gray-600 font-mono">
                {selectedContent.length > 1024 
                  ? `${(selectedContent.length / 1024).toFixed(1)} KB` 
                  : `${selectedContent.length} B`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isHtml && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`p-1 rounded text-xs transition-colors ${
                    showPreview ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/10 text-gray-500'
                  }`}
                  title="Preview HTML"
                >
                  <Eye className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={copyContent}
                className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                title="Copy content"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                onClick={downloadFile}
                className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                title="Download file"
              >
                <Download className="w-3 h-3" />
              </button>
              {onDeleteFile && (
                <button
                  onClick={() => { onDeleteFile(selectedFile); setSelectedFile(null); }}
                  className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {showPreview && isHtml ? (
              <iframe
                srcDoc={selectedContent}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts"
                title="HTML Preview"
              />
            ) : (
              <SyntaxHighlighter
                language={selectedLang}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  background: '#0a0a16',
                  minHeight: '100%',
                }}
                showLineNumbers
                lineNumberStyle={{ color: '#444', fontSize: '10px', minWidth: '2.5em' }}
                wrapLines
              >
                {selectedContent}
              </SyntaxHighlighter>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilePanel;
