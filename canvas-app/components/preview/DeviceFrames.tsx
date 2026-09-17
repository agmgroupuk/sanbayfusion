/**
 * DeviceFrames — Desktop/Tablet/Mobile device frames
 * Gorgeous realistic device bezels with smooth transitions
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceFramesProps {
  device: DeviceType;
  children: React.ReactNode;
  className?: string;
}

const DeviceFrames: React.FC<DeviceFramesProps> = ({ device, children, className = '' }) => {
  return (
    <div className={`h-full w-full flex items-center justify-center bg-canvas-card p-4 overflow-auto ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={device}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {device === 'desktop' && (
            <div className="flex flex-col items-center">
              {/* Monitor */}
              <div className="relative">
                {/* Outer glow */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-primary-500/10 to-transparent opacity-50 blur-xl" />

                <div className="relative bg-canvas-card rounded-xl border border-canvas-border shadow-2xl shadow-black/60 overflow-hidden" style={{ width: 960, height: 600 }}>
                  {/* Browser chrome */}
                  <div className="h-8 bg-canvas-card border-b border-canvas-border flex items-center px-3 gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-primary-500/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="flex-1 mx-8">
                      <div className="bg-white/[0.04] border border-canvas-border rounded-md px-3 py-0.5 text-[10px] text-canvas-muted-deep font-mono max-w-md mx-auto text-center">
                        maula.ai/preview
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="h-[calc(100%-32px)] overflow-hidden bg-white">
                    {children}
                  </div>
                </div>
              </div>

              {/* Stand */}
              <div className="w-20 h-8 bg-gradient-to-b from-[#1a1a1e] to-[#111] border-x border-canvas-border" />
              <div className="w-40 h-2 bg-canvas-card rounded-b-lg border border-t-0 border-canvas-border shadow-lg" />
            </div>
          )}

          {device === 'tablet' && (
            <div className="relative">
              <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-b from-primary-500/10 to-transparent opacity-50 blur-xl" />

              <div className="relative bg-canvas-card rounded-[1.5rem] border-2 border-canvas-border shadow-2xl shadow-black/60 p-3 overflow-hidden" style={{ width: 520, height: 700 }}>
                {/* Camera */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-canvas-card border border-canvas-border" />

                {/* Screen */}
                <div className="w-full h-full rounded-xl overflow-hidden bg-white mt-1">
                  {children}
                </div>
              </div>
            </div>
          )}

          {device === 'mobile' && (
            <div className="relative">
              <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-b from-primary-500/10 to-transparent opacity-50 blur-xl" />

              <div className="relative bg-canvas-card rounded-[2rem] border-2 border-canvas-border shadow-2xl shadow-black/60 p-2 overflow-hidden" style={{ width: 290, height: 620 }}>
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-canvas-card rounded-b-2xl z-10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-canvas-card border border-canvas-border" />
                </div>

                {/* Screen */}
                <div className="w-full h-full rounded-[1.5rem] overflow-hidden bg-white">
                  {children}
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/20 rounded-full" />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DeviceFrames;
