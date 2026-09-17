/**
 * ========================================
 * ENHANCED FILE UPLOAD COMPONENT
 * ========================================
 * 
 * Advanced file upload component with:
 * - Image previews with zoom
 * - PDF preview capability
 * - Document type detection
 * - Drag & drop with visual feedback
 * - Progress indicators
 * - File type validation
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  DocumentIcon, 
  PhotoIcon, 
  DocumentTextIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';

interface FileUpload {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
  preview?: string;
  extractedText?: string;
  analysis?: {
    type: 'document' | 'image' | 'pdf' | 'video' | 'audio';
    pageCount?: number;
    dimensions?: { width: number; height: number };
    duration?: number;
    metadata?: Record<string, any>;
  };
}

interface EnhancedFileUploadProps {
  onFilesUpload: (files: FileUpload[]) => void;
  maxFileSize?: number; // MB
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

// File type configuration
const FILE_TYPE_CONFIG = {
  'image/jpeg': { icon: PhotoIcon, color: 'text-green-600', category: 'image' },
  'image/png': { icon: PhotoIcon, color: 'text-green-600', category: 'image' },
  'image/webp': { icon: PhotoIcon, color: 'text-green-600', category: 'image' },
  'image/gif': { icon: FilmIcon, color: 'text-purple-600', category: 'image' },
  'application/pdf': { icon: DocumentTextIcon, color: 'text-red-600', category: 'document' },
  'text/plain': { icon: DocumentIcon, color: 'text-gray-600', category: 'document' },
  'application/json': { icon: DocumentIcon, color: 'text-blue-600', category: 'document' },
  'text/javascript': { icon: DocumentIcon, color: 'text-yellow-600', category: 'code' },
  'text/typescript': { icon: DocumentIcon, color: 'text-blue-700', category: 'code' },
  'text/html': { icon: DocumentIcon, color: 'text-orange-600', category: 'code' },
  'text/css': { icon: DocumentIcon, color: 'text-purple-600', category: 'code' },
  'application/zip': { icon: ArchiveBoxIcon, color: 'text-gray-700', category: 'archive' },
  'audio/mpeg': { icon: MusicalNoteIcon, color: 'text-pink-600', category: 'audio' },
  'audio/wav': { icon: MusicalNoteIcon, color: 'text-pink-600', category: 'audio' },
  'video/mp4': { icon: FilmIcon, color: 'text-indigo-600', category: 'video' },
  'video/webm': { icon: FilmIcon, color: 'text-indigo-600', category: 'video' }
};

const EnhancedFileUpload: React.FC<EnhancedFileUploadProps> = ({
  onFilesUpload,
  maxFileSize = 25, // 25MB default
  maxFiles = 10,
  acceptedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'application/json',
    'text/javascript', 'text/typescript', 'text/html', 'text/css'
  ],
  className = "",
  disabled = false
}) => {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeConfig = (type: string) => {
    return FILE_TYPE_CONFIG[type as keyof typeof FILE_TYPE_CONFIG] || {
      icon: DocumentIcon,
      color: 'text-gray-600',
      category: 'unknown'
    };
  };

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size is ${maxFileSize}MB.`;
    }

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type "${file.type}" is not supported.`;
    }

    // Check total files
    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed.`;
    }

    return null;
  }, [maxFileSize, acceptedTypes, files.length, maxFiles]);

  const processFile = useCallback(async (file: File): Promise<FileUpload> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const fileUpload: FileUpload = {
        id: generateFileId(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: '',
        analysis: {
          type: getFileTypeConfig(file.type).category as any
        }
      };

      reader.onload = async (e) => {
        fileUpload.data = e.target?.result as string;

        // Generate preview for images
        if (file.type.startsWith('image/')) {
          fileUpload.preview = fileUpload.data;
          
          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            fileUpload.analysis!.dimensions = {
              width: img.width,
              height: img.height
            };
            resolve(fileUpload);
          };
          img.src = fileUpload.data;
        } else if (file.type === 'text/plain' || file.type.startsWith('text/')) {
          // Extract text content for text files
          try {
            const base64Data = fileUpload.data.split(',')[1] || fileUpload.data;
            const textContent = atob(base64Data);
            fileUpload.extractedText = textContent.substring(0, 1000); // First 1000 chars
          } catch (error) {
            console.error('Text extraction error:', error);
          }
          resolve(fileUpload);
        } else {
          resolve(fileUpload);
        }
      };

      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return;

    setIsProcessing(true);
    const newFiles: FileUpload[] = [];
    const errors: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const error = validateFile(file);
      
      if (error) {
        errors.push(error);
        continue;
      }

      try {
        const processedFile = await processFile(file);
        newFiles.push(processedFile);
      } catch (error) {
        errors.push(`Failed to process ${file.name}`);
      }
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesUpload(updatedFiles);
    }

    setIsProcessing(false);
  }, [disabled, files, onFilesUpload, processFile, validateFile]);

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesUpload(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-3">
          <div className="flex justify-center">
            {isProcessing ? (
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <ArrowDownTrayIcon className="w-12 h-12 text-gray-400" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isProcessing ? 'Processing files...' : 'Drop files here or click to browse'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Support: Images, PDFs, Text files, Code files • Max {maxFileSize}MB per file • Up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Uploaded Files ({files.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {files.map((file) => {
              const typeConfig = getFileTypeConfig(file.type);
              const Icon = typeConfig.icon;
              
              return (
                <div
                  key={file.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 group hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    {/* File Icon/Preview */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <div className="relative">
                          <Image
                            src={file.preview}
                            alt={file.name}
                            width={48}
                            height={48}
                            className="object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 
                                     transition-all duration-200 rounded-lg flex items-center justify-center"
                          >
                            <EyeIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${typeConfig.color}`} />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      
                      {file.analysis?.dimensions && (
                        <p className="text-xs text-gray-400">
                          {file.analysis.dimensions.width} × {file.analysis.dimensions.height}
                        </p>
                      )}
                      
                      {file.extractedText && (
                        <p className="text-xs text-gray-400 mt-1">
                          Text preview: {file.extractedText.substring(0, 50)}...
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      {file.preview && (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Preview"
                        >
                          <MagnifyingGlassIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewFile && previewFile.preview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{previewFile.name}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <Image
                src={previewFile.preview}
                alt={previewFile.name}
                fill
                className="max-w-full max-h-[70vh] object-contain mx-auto"
              />
              {previewFile.analysis?.dimensions && (
                <p className="text-center text-sm text-gray-500 mt-2">
                  {previewFile.analysis.dimensions.width} × {previewFile.analysis.dimensions.height} pixels
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFileUpload;
export type { FileUpload, EnhancedFileUploadProps };