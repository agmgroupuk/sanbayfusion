'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  MagnifyingGlassPlusIcon, 
  MagnifyingGlassMinusIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  filename?: string;
  initialPage?: number;
  width?: number;
  height?: number | string;
  showToolbar?: boolean;
  showPageNumbers?: boolean;
  showZoomControls?: boolean;
  showDownload?: boolean;
  showPrint?: boolean;
  showFullscreen?: boolean;
  onClose?: () => void;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  className?: string;
}

export default function PDFViewer({
  url,
  filename = 'document.pdf',
  initialPage = 1,
  width,
  height = '600px',
  showToolbar = true,
  showPageNumbers = true,
  showZoomControls = true,
  showDownload = true,
  showPrint = true,
  showFullscreen = true,
  onClose,
  onLoadSuccess,
  onLoadError,
  className = '',
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Handle document load
  const handleLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    onLoadSuccess?.(numPages);
  }, [onLoadSuccess]);

  const handleLoadError = useCallback((error: Error) => {
    setError(error.message || 'Failed to load PDF');
    setLoading(false);
    onLoadError?.(error);
  }, [onLoadError]);

  // Navigation
  const goToPrevPage = useCallback(() => {
    setPageNumber(p => Math.max(1, p - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber(p => Math.min(numPages, p + 1));
  }, [numPages]);

  const goToPage = useCallback((page: number) => {
    setPageNumber(Math.max(1, Math.min(numPages, page)));
  }, [numPages]);

  // Zoom
  const zoomIn = useCallback(() => {
    setScale(s => Math.min(3, s + 0.25));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(s => Math.max(0.5, s - 0.25));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  // Download
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [url, filename]);

  // Print
  const handlePrint = useCallback(() => {
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  }, [url]);

  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevPage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNextPage();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else if (onClose) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevPage, goToNextPage, zoomIn, zoomOut, resetZoom, toggleFullscreen, isFullscreen, onClose]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-gray-100 dark:bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {/* Left section - Navigation */}
          <div className="flex items-center space-x-2">
            {showPageNumbers && (
              <>
                <button
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={pageNumber}
                    onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                    className="w-12 px-2 py-1 text-center text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-500">/ {numPages}</span>
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          
          {/* Center section - Filename */}
          <div className="hidden md:block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs">
              {filename}
            </span>
          </div>
          
          {/* Right section - Actions */}
          <div className="flex items-center space-x-2">
            {/* Zoom controls */}
            {showZoomControls && (
              <div className="flex items-center space-x-1 border-r pr-2 mr-2 dark:border-gray-600">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  title="Zoom out"
                >
                  <MagnifyingGlassMinusIcon className="w-5 h-5" />
                </button>
                
                <button
                  onClick={resetZoom}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Reset zoom"
                >
                  {Math.round(scale * 100)}%
                </button>
                
                <button
                  onClick={zoomIn}
                  disabled={scale >= 3}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  title="Zoom in"
                >
                  <MagnifyingGlassPlusIcon className="w-5 h-5" />
                </button>
              </div>
            )}
            
            {/* Download */}
            {showDownload && (
              <button
                onClick={handleDownload}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Download"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
            )}
            
            {/* Print */}
            {showPrint && (
              <button
                onClick={handlePrint}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Print"
              >
                <PrinterIcon className="w-5 h-5" />
              </button>
            )}
            
            {/* Fullscreen */}
            {showFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="w-5 h-5" />
                ) : (
                  <ArrowsPointingOutIcon className="w-5 h-5" />
                )}
              </button>
            )}
            
            {/* Close */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        {loading && (
          <div className="flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center justify-center text-center">
            <XMarkIcon className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Failed to load PDF</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        )}
        
        <Document
          file={url}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={handleLoadError}
          loading={null}
          error={null}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            width={width}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
          />
        </Document>
      </div>
      
      {/* Mobile page indicator */}
      {showPageNumbers && !showToolbar && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
          {pageNumber} / {numPages}
        </div>
      )}
    </div>
  );
}

// Simple PDF thumbnail
interface PDFThumbnailProps {
  url: string;
  page?: number;
  width?: number;
  onClick?: () => void;
  className?: string;
}

export function PDFThumbnail({
  url,
  page = 1,
  width = 150,
  onClick,
  className = '',
}: PDFThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div 
      className={`relative cursor-pointer rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group ${className}`}
      onClick={onClick}
    >
      <Document
        file={url}
        onLoadSuccess={() => setLoading(false)}
        onLoadError={() => {
          setLoading(false);
          setError(true);
        }}
        loading={
          <div className="w-full aspect-[3/4] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        }
      >
        {!error && (
          <Page
            pageNumber={page}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        )}
      </Document>
      
      {error && (
        <div className="w-full aspect-[3/4] flex items-center justify-center">
          <span className="text-sm text-gray-500">Failed to load</span>
        </div>
      )}
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <ArrowsPointingOutIcon className="w-8 h-8 text-white" />
      </div>
      
      {/* PDF badge */}
      <div className="absolute top-2 right-2 px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded">
        PDF
      </div>
    </div>
  );
}
