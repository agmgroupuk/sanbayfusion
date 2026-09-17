'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ForwardIcon,
  BackwardIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import Image from 'next/image';

interface VideoPlayerProps {
  url: string;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
  onClose?: () => void;
  onEnded?: () => void;
  onProgress?: (progress: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
  className?: string;
  showCustomControls?: boolean;
}

// Format time in MM:SS or HH:MM:SS
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function VideoPlayer({
  url,
  title,
  poster,
  autoPlay = false,
  loop = false,
  muted: initialMuted = false,
  controls = true,
  width = '100%',
  height = 'auto',
  onClose,
  onEnded,
  onProgress,
  className = '',
  showCustomControls = true,
}: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(initialMuted);
  const [volume, setVolume] = useState(0.8);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          setPlaying(!playing);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          setMuted(!muted);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          playerRef.current?.seekTo(Math.max(0, played - 10 / duration), 'fraction');
          break;
        case 'ArrowRight':
          e.preventDefault();
          playerRef.current?.seekTo(Math.min(1, played + 10 / duration), 'fraction');
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
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
  }, [playing, muted, volume, played, duration, isFullscreen, toggleFullscreen, onClose]);

  // Handle progress
  const handleProgress = useCallback((state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    if (!seeking) {
      setPlayed(state.played);
    }
    onProgress?.(state);
  }, [seeking, onProgress]);

  // Handle seek
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    playerRef.current?.seekTo(parseFloat((e.target as HTMLInputElement).value));
  };

  // Skip forward/backward
  const skip = (seconds: number) => {
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    playerRef.current?.seekTo(currentTime + seconds);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black group ${className}`}
      style={{ width, height: height === 'auto' ? undefined : height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-white" />
        </button>
      )}
      
      {/* Title overlay */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <h3 className="text-white font-medium">{title}</h3>
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center text-white">
            <XMarkIcon className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <p className="text-lg font-medium">Failed to load video</p>
            <p className="text-sm text-gray-400 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {/* React Player */}
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        loop={loop}
        muted={muted}
        volume={volume}
        width="100%"
        height="100%"
        style={{ aspectRatio: height === 'auto' ? '16/9' : undefined }}
        onReady={() => setLoading(false)}
        onStart={() => setLoading(false)}
        onBuffer={() => setLoading(true)}
        onBufferEnd={() => setLoading(false)}
        onDuration={setDuration}
        onProgress={handleProgress}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
        onError={(e) => {
          setError('Video playback error');
          console.error('Video error:', e);
        }}
        config={{
          file: {
            attributes: {
              poster,
              controlsList: 'nodownload',
            },
          },
        }}
      />
      
      {/* Custom Controls */}
      {showCustomControls && (
        <div 
          className={`absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress bar */}
          <div className="px-4 py-2">
            <div className="relative group/progress">
              <input
                type="range"
                min={0}
                max={0.999999}
                step="any"
                value={played}
                onChange={handleSeekChange}
                onMouseDown={handleSeekMouseDown}
                onMouseUp={handleSeekMouseUp}
                className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:cursor-pointer
                  hover:[&::-webkit-slider-thumb]:scale-125
                  transition-all"
                style={{
                  background: `linear-gradient(to right, #3b82f6 ${played * 100}%, rgba(255,255,255,0.3) ${played * 100}%)`,
                }}
              />
            </div>
          </div>
          
          {/* Controls bar */}
          <div className="flex items-center justify-between px-4 pb-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center space-x-3">
              {/* Play/Pause */}
              <button
                onClick={() => setPlaying(!playing)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                {playing ? (
                  <PauseIcon className="w-6 h-6 text-white" />
                ) : (
                  <PlayIcon className="w-6 h-6 text-white" />
                )}
              </button>
              
              {/* Skip backward */}
              <button
                onClick={() => skip(-10)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Skip back 10s"
              >
                <BackwardIcon className="w-5 h-5 text-white" />
              </button>
              
              {/* Skip forward */}
              <button
                onClick={() => skip(10)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Skip forward 10s"
              >
                <ForwardIcon className="w-5 h-5 text-white" />
              </button>
              
              {/* Volume */}
              <div className="flex items-center space-x-2 group/volume">
                <button
                  onClick={() => setMuted(!muted)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  {muted || volume === 0 ? (
                    <SpeakerXMarkIcon className="w-5 h-5 text-white" />
                  ) : (
                    <SpeakerWaveIcon className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (muted) setMuted(false);
                  }}
                  className="w-0 group-hover/volume:w-20 transition-all duration-200 h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-2
                    [&::-webkit-slider-thumb]:h-2
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white"
                />
              </div>
              
              {/* Time display */}
              <span className="text-white text-sm font-mono">
                {formatTime(played * duration)} / {formatTime(duration)}
              </span>
            </div>
            
            {/* Right controls */}
            <div className="flex items-center space-x-2">
              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="w-5 h-5 text-white" />
                ) : (
                  <ArrowsPointingOutIcon className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Click to play/pause overlay */}
      <div 
        className="absolute inset-0 z-5"
        onClick={() => setPlaying(!playing)}
      />
    </div>
  );
}

// Mini player for thumbnails
interface VideoThumbnailProps {
  url: string;
  poster?: string;
  duration?: number;
  title?: string;
  onClick?: () => void;
  className?: string;
}

export function VideoThumbnail({
  url,
  poster,
  duration,
  title,
  onClick,
  className = '',
}: VideoThumbnailProps) {
  return (
    <div 
      className={`relative cursor-pointer rounded-lg overflow-hidden group ${className}`}
      onClick={onClick}
    >
      {poster ? (
        <Image
          src={poster}
          alt={title || 'Video thumbnail'}
          fill
          className="object-cover"
        />
      ) : (
        <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
          <PlayIcon className="w-12 h-12 text-gray-400" />
        </div>
      )}
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
          <PlayIcon className="w-6 h-6 text-gray-900 ml-1" />
        </div>
      </div>
      
      {/* Duration badge */}
      {duration && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs font-medium bg-black/70 text-white rounded">
          {formatTime(duration)}
        </div>
      )}
      
      {/* Title */}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white text-sm truncate">{title}</p>
        </div>
      )}
    </div>
  );
}
