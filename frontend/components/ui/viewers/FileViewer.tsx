'use client';

import React, { useState, useMemo } from 'react';
import CodeViewer from './CodeViewer';
import ImageViewer, { SimpleImage, ImagePreview } from './ImageViewer';
import VideoPlayer, { VideoThumbnail } from './VideoPlayer';
import PDFViewer, { PDFThumbnail } from './PDFViewer';
import { 
  DocumentTextIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  DocumentIcon,
  CodeBracketIcon,
  TableCellsIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// File type detection
export type FileType = 'code' | 'image' | 'video' | 'pdf' | 'audio' | 'document' | 'spreadsheet' | 'archive' | 'unknown';

interface FileInfo {
  type: FileType;
  mimeType: string;
  extension: string;
  icon: typeof DocumentIcon;
  color: string;
}

const FILE_EXTENSIONS: Record<string, FileInfo> = {
  // Code files
  'js': { type: 'code', mimeType: 'text/javascript', extension: 'js', icon: CodeBracketIcon, color: 'text-yellow-500' },
  'jsx': { type: 'code', mimeType: 'text/javascript', extension: 'jsx', icon: CodeBracketIcon, color: 'text-yellow-500' },
  'ts': { type: 'code', mimeType: 'text/typescript', extension: 'ts', icon: CodeBracketIcon, color: 'text-blue-500' },
  'tsx': { type: 'code', mimeType: 'text/typescript', extension: 'tsx', icon: CodeBracketIcon, color: 'text-blue-500' },
  'py': { type: 'code', mimeType: 'text/x-python', extension: 'py', icon: CodeBracketIcon, color: 'text-green-500' },
  'java': { type: 'code', mimeType: 'text/x-java', extension: 'java', icon: CodeBracketIcon, color: 'text-red-500' },
  'cpp': { type: 'code', mimeType: 'text/x-c++', extension: 'cpp', icon: CodeBracketIcon, color: 'text-purple-500' },
  'c': { type: 'code', mimeType: 'text/x-c', extension: 'c', icon: CodeBracketIcon, color: 'text-purple-500' },
  'go': { type: 'code', mimeType: 'text/x-go', extension: 'go', icon: CodeBracketIcon, color: 'text-cyan-500' },
  'rs': { type: 'code', mimeType: 'text/x-rust', extension: 'rs', icon: CodeBracketIcon, color: 'text-orange-500' },
  'rb': { type: 'code', mimeType: 'text/x-ruby', extension: 'rb', icon: CodeBracketIcon, color: 'text-red-500' },
  'php': { type: 'code', mimeType: 'text/x-php', extension: 'php', icon: CodeBracketIcon, color: 'text-indigo-500' },
  'html': { type: 'code', mimeType: 'text/html', extension: 'html', icon: CodeBracketIcon, color: 'text-orange-500' },
  'css': { type: 'code', mimeType: 'text/css', extension: 'css', icon: CodeBracketIcon, color: 'text-blue-400' },
  'scss': { type: 'code', mimeType: 'text/x-scss', extension: 'scss', icon: CodeBracketIcon, color: 'text-pink-500' },
  'json': { type: 'code', mimeType: 'application/json', extension: 'json', icon: CodeBracketIcon, color: 'text-gray-500' },
  'xml': { type: 'code', mimeType: 'text/xml', extension: 'xml', icon: CodeBracketIcon, color: 'text-orange-500' },
  'yaml': { type: 'code', mimeType: 'text/yaml', extension: 'yaml', icon: CodeBracketIcon, color: 'text-gray-500' },
  'yml': { type: 'code', mimeType: 'text/yaml', extension: 'yml', icon: CodeBracketIcon, color: 'text-gray-500' },
  'md': { type: 'code', mimeType: 'text/markdown', extension: 'md', icon: DocumentTextIcon, color: 'text-gray-500' },
  'sql': { type: 'code', mimeType: 'text/x-sql', extension: 'sql', icon: CodeBracketIcon, color: 'text-blue-500' },
  'sh': { type: 'code', mimeType: 'text/x-shellscript', extension: 'sh', icon: CodeBracketIcon, color: 'text-gray-500' },
  
  // Images
  'jpg': { type: 'image', mimeType: 'image/jpeg', extension: 'jpg', icon: PhotoIcon, color: 'text-green-500' },
  'jpeg': { type: 'image', mimeType: 'image/jpeg', extension: 'jpeg', icon: PhotoIcon, color: 'text-green-500' },
  'png': { type: 'image', mimeType: 'image/png', extension: 'png', icon: PhotoIcon, color: 'text-blue-500' },
  'gif': { type: 'image', mimeType: 'image/gif', extension: 'gif', icon: PhotoIcon, color: 'text-purple-500' },
  'webp': { type: 'image', mimeType: 'image/webp', extension: 'webp', icon: PhotoIcon, color: 'text-cyan-500' },
  'svg': { type: 'image', mimeType: 'image/svg+xml', extension: 'svg', icon: PhotoIcon, color: 'text-orange-500' },
  'ico': { type: 'image', mimeType: 'image/x-icon', extension: 'ico', icon: PhotoIcon, color: 'text-gray-500' },
  'bmp': { type: 'image', mimeType: 'image/bmp', extension: 'bmp', icon: PhotoIcon, color: 'text-gray-500' },
  
  // Videos
  'mp4': { type: 'video', mimeType: 'video/mp4', extension: 'mp4', icon: VideoCameraIcon, color: 'text-red-500' },
  'webm': { type: 'video', mimeType: 'video/webm', extension: 'webm', icon: VideoCameraIcon, color: 'text-blue-500' },
  'mov': { type: 'video', mimeType: 'video/quicktime', extension: 'mov', icon: VideoCameraIcon, color: 'text-gray-500' },
  'avi': { type: 'video', mimeType: 'video/x-msvideo', extension: 'avi', icon: VideoCameraIcon, color: 'text-orange-500' },
  'mkv': { type: 'video', mimeType: 'video/x-matroska', extension: 'mkv', icon: VideoCameraIcon, color: 'text-purple-500' },
  
  // Audio
  'mp3': { type: 'audio', mimeType: 'audio/mpeg', extension: 'mp3', icon: MusicalNoteIcon, color: 'text-pink-500' },
  'wav': { type: 'audio', mimeType: 'audio/wav', extension: 'wav', icon: MusicalNoteIcon, color: 'text-blue-500' },
  'ogg': { type: 'audio', mimeType: 'audio/ogg', extension: 'ogg', icon: MusicalNoteIcon, color: 'text-orange-500' },
  'flac': { type: 'audio', mimeType: 'audio/flac', extension: 'flac', icon: MusicalNoteIcon, color: 'text-green-500' },
  'm4a': { type: 'audio', mimeType: 'audio/mp4', extension: 'm4a', icon: MusicalNoteIcon, color: 'text-gray-500' },
  
  // Documents
  'pdf': { type: 'pdf', mimeType: 'application/pdf', extension: 'pdf', icon: DocumentIcon, color: 'text-red-600' },
  'doc': { type: 'document', mimeType: 'application/msword', extension: 'doc', icon: DocumentTextIcon, color: 'text-blue-600' },
  'docx': { type: 'document', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx', icon: DocumentTextIcon, color: 'text-blue-600' },
  'txt': { type: 'code', mimeType: 'text/plain', extension: 'txt', icon: DocumentTextIcon, color: 'text-gray-500' },
  'rtf': { type: 'document', mimeType: 'application/rtf', extension: 'rtf', icon: DocumentTextIcon, color: 'text-gray-500' },
  
  // Spreadsheets
  'xls': { type: 'spreadsheet', mimeType: 'application/vnd.ms-excel', extension: 'xls', icon: TableCellsIcon, color: 'text-green-600' },
  'xlsx': { type: 'spreadsheet', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx', icon: TableCellsIcon, color: 'text-green-600' },
  'csv': { type: 'code', mimeType: 'text/csv', extension: 'csv', icon: TableCellsIcon, color: 'text-green-500' },
  
  // Archives
  'zip': { type: 'archive', mimeType: 'application/zip', extension: 'zip', icon: ArchiveBoxIcon, color: 'text-yellow-600' },
  'tar': { type: 'archive', mimeType: 'application/x-tar', extension: 'tar', icon: ArchiveBoxIcon, color: 'text-gray-600' },
  'gz': { type: 'archive', mimeType: 'application/gzip', extension: 'gz', icon: ArchiveBoxIcon, color: 'text-gray-600' },
  'rar': { type: 'archive', mimeType: 'application/vnd.rar', extension: 'rar', icon: ArchiveBoxIcon, color: 'text-purple-600' },
  '7z': { type: 'archive', mimeType: 'application/x-7z-compressed', extension: '7z', icon: ArchiveBoxIcon, color: 'text-gray-600' },
};

export function getFileInfo(filename: string, mimeType?: string): FileInfo {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (FILE_EXTENSIONS[ext]) {
    return FILE_EXTENSIONS[ext];
  }
  
  // Try to detect from MIME type
  if (mimeType) {
    if (mimeType.startsWith('image/')) return { type: 'image', mimeType, extension: ext, icon: PhotoIcon, color: 'text-green-500' };
    if (mimeType.startsWith('video/')) return { type: 'video', mimeType, extension: ext, icon: VideoCameraIcon, color: 'text-red-500' };
    if (mimeType.startsWith('audio/')) return { type: 'audio', mimeType, extension: ext, icon: MusicalNoteIcon, color: 'text-pink-500' };
    if (mimeType === 'application/pdf') return { type: 'pdf', mimeType, extension: 'pdf', icon: DocumentIcon, color: 'text-red-600' };
    if (mimeType.startsWith('text/')) return { type: 'code', mimeType, extension: ext, icon: DocumentTextIcon, color: 'text-gray-500' };
  }
  
  return { type: 'unknown', mimeType: mimeType || 'application/octet-stream', extension: ext, icon: DocumentIcon, color: 'text-gray-400' };
}

// Universal File Viewer Props
interface FileViewerProps {
  url: string;
  filename: string;
  content?: string; // For code files that have content already loaded
  mimeType?: string;
  onClose?: () => void;
  className?: string;
  // Viewer-specific options
  codeOptions?: Partial<React.ComponentProps<typeof CodeViewer>>;
  imageOptions?: Partial<React.ComponentProps<typeof ImageViewer>>;
  videoOptions?: Partial<React.ComponentProps<typeof VideoPlayer>>;
  pdfOptions?: Partial<React.ComponentProps<typeof PDFViewer>>;
}

export default function FileViewer({
  url,
  filename,
  content,
  mimeType,
  onClose,
  className = '',
  codeOptions = {},
  imageOptions = {},
  videoOptions = {},
  pdfOptions = {},
}: FileViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [codeContent, setCodeContent] = useState<string | null>(content || null);
  
  const fileInfo = useMemo(() => getFileInfo(filename, mimeType), [filename, mimeType]);

  // Fetch code content if not provided
  React.useEffect(() => {
    if (fileInfo.type === 'code' && !content && url) {
      fetch(url)
        .then(res => res.text())
        .then(setCodeContent)
        .catch(err => setError(err.message));
    }
  }, [fileInfo.type, content, url]);

  // Render appropriate viewer based on file type
  const renderViewer = () => {
    switch (fileInfo.type) {
      case 'code':
        if (!codeContent && !content) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-gray-400">Loading file...</div>
            </div>
          );
        }
        return (
          <CodeViewer
            code={codeContent || content || ''}
            filename={filename}
            onClose={onClose}
            height="500px"
            {...codeOptions}
          />
        );
        
      case 'image':
        return (
          <ImageViewer
            src={url}
            alt={filename}
            onClose={onClose}
            {...imageOptions}
          />
        );
        
      case 'video':
        return (
          <VideoPlayer
            url={url}
            title={filename}
            onClose={onClose}
            height="auto"
            {...videoOptions}
          />
        );
        
      case 'pdf':
        return (
          <PDFViewer
            url={url}
            filename={filename}
            onClose={onClose}
            height="600px"
            {...pdfOptions}
          />
        );
        
      case 'audio':
        return (
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-4 mb-4">
              <div className={`p-3 rounded-full bg-pink-100 dark:bg-pink-900 ${fileInfo.color}`}>
                <MusicalNoteIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{filename}</h3>
                <p className="text-sm text-gray-500">{fileInfo.extension.toUpperCase()} Audio</p>
              </div>
              {onClose && (
                <button onClick={onClose} className="ml-auto p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            <audio controls className="w-full" src={url}>
              Your browser does not support the audio element.
            </audio>
          </div>
        );
        
      default:
        return (
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
            <div className={`inline-block p-4 rounded-full bg-gray-200 dark:bg-gray-700 mb-4 ${fileInfo.color}`}>
              <fileInfo.icon className="w-12 h-12" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{filename}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {fileInfo.extension.toUpperCase()} file - Preview not available
            </p>
            <div className="flex justify-center space-x-3">
              <a
                href={url}
                download={filename}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download
              </a>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        );
    }
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
        <XMarkIcon className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <h3 className="font-medium text-red-700 dark:text-red-400 mb-2">Failed to load file</h3>
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {renderViewer()}
    </div>
  );
}

// Export sub-components for direct usage
export { CodeViewer, ImageViewer, SimpleImage, ImagePreview, VideoPlayer, VideoThumbnail, PDFViewer, PDFThumbnail };
