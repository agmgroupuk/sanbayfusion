'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Slideshow from 'yet-another-react-lightbox/plugins/slideshow';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Download from 'yet-another-react-lightbox/plugins/download';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import { XMarkIcon, ArrowsPointingOutIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface ImageViewerProps {
  src: string | string[];
  alt?: string;
  initialIndex?: number;
  onClose?: () => void;
  showThumbnails?: boolean;
  showZoom?: boolean;
  showFullscreen?: boolean;
  showSlideshow?: boolean;
  showDownload?: boolean;
  className?: string;
}

// Simple image display (non-lightbox)
interface SimpleImageProps {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  width?: number | string;
  height?: number | string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export function SimpleImage({
  src,
  alt = 'Image',
  className = '',
  onClick,
  width = '100%',
  height = 'auto',
  objectFit = 'contain',
}: SimpleImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <div 
      className={`relative ${className}`}
      style={{ width, height }}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      )}
      
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center text-gray-500">
            <XMarkIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          className={`cursor-pointer transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
          style={{ objectFit }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
        />
      )}
    </div>
  );
}

// Gallery grid view
interface ImageGalleryProps {
  images: { src: string; alt?: string; title?: string }[];
  columns?: number;
  gap?: number;
  onImageClick?: (index: number) => void;
  className?: string;
}

export function ImageGallery({
  images,
  columns = 3,
  gap = 4,
  onImageClick,
  className = '',
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleClick = (index: number) => {
    if (onImageClick) {
      onImageClick(index);
    } else {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  return (
    <>
      <div 
        className={`grid ${className}`}
        style={{ 
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap * 4}px`
        }}
      >
        {images.map((image, index) => (
          <div 
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => handleClick(index)}
          >
            <SimpleImage
              src={image.src}
              alt={image.alt || `Image ${index + 1}`}
              objectFit="cover"
            />
            {image.title && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm truncate">{image.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={images.map(img => ({ src: img.src, alt: img.alt }))}
        plugins={[Zoom, Fullscreen, Thumbnails, Download]}
      />
    </>
  );
}

// Full lightbox viewer
export default function ImageViewer({
  src,
  alt = 'Image',
  initialIndex = 0,
  onClose,
  showThumbnails = true,
  showZoom = true,
  showFullscreen = true,
  showSlideshow = false,
  showDownload = true,
  className = '',
}: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Convert single image to array
  const images = Array.isArray(src) ? src : [src];
  const slides = images.map((s, i) => ({ 
    src: s, 
    alt: Array.isArray(alt) ? alt[i] : alt 
  }));

  const plugins = [];
  if (showZoom) plugins.push(Zoom);
  if (showFullscreen) plugins.push(Fullscreen);
  if (showSlideshow) plugins.push(Slideshow);
  if (showThumbnails && images.length > 1) plugins.push(Thumbnails);
  if (showDownload) plugins.push(Download);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <Lightbox
      open={isOpen}
      close={handleClose}
      index={currentIndex}
      slides={slides}
      plugins={plugins}
      carousel={{
        finite: images.length <= 1,
      }}
      zoom={{
        maxZoomPixelRatio: 5,
        scrollToZoom: true,
      }}
      thumbnails={{
        position: 'bottom',
        width: 100,
        height: 80,
        border: 2,
        borderRadius: 4,
        gap: 8,
      }}
      render={{
        buttonPrev: images.length <= 1 ? () => null : undefined,
        buttonNext: images.length <= 1 ? () => null : undefined,
      }}
      className={className}
    />
  );
}

// Preview thumbnail that opens lightbox
interface ImagePreviewProps {
  src: string | string[];
  alt?: string;
  thumbnailSize?: number;
  className?: string;
}

export function ImagePreview({
  src,
  alt = 'Preview',
  thumbnailSize = 64,
  className = '',
}: ImagePreviewProps) {
  const [showViewer, setShowViewer] = useState(false);
  const thumbnailSrc = Array.isArray(src) ? src[0] : src;

  return (
    <>
      <div 
        className={`relative cursor-pointer rounded-lg overflow-hidden hover:opacity-90 transition-opacity ${className}`}
        style={{ width: thumbnailSize, height: thumbnailSize }}
        onClick={() => setShowViewer(true)}
      >
        <SimpleImage
          src={thumbnailSrc}
          alt={alt}
          objectFit="cover"
        />
        {Array.isArray(src) && src.length > 1 && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs font-medium bg-black/60 text-white rounded">
            +{src.length - 1}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
          <ArrowsPointingOutIcon className="w-6 h-6 text-white" />
        </div>
      </div>
      
      {showViewer && (
        <ImageViewer
          src={src}
          alt={alt}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
}
