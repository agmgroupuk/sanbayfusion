/**
 * PanelSkeleton — Loading skeleton for sidebar panels
 * Provides consistent loading UX across Canvas Studio
 */
import React from 'react';
import { motion } from 'framer-motion';

interface PanelSkeletonProps {
  lines?: number;
  showHeader?: boolean;
  className?: string;
}

const shimmer = {
  hidden: { x: '-100%' },
  visible: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'easeInOut' as const,
    },
  },
};

const SkeletonLine: React.FC<{ width?: string; height?: string }> = ({
  width = '100%',
  height = '8px',
}) => (
  <div
    className="relative overflow-hidden rounded bg-white/[0.04]"
    style={{ width, height }}
  >
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
      variants={shimmer}
      initial="hidden"
      animate="visible"
    />
  </div>
);

export const PanelSkeleton: React.FC<PanelSkeletonProps> = ({
  lines = 5,
  showHeader = true,
  className = '',
}) => (
  <div className={`flex flex-col gap-3 p-4 ${className}`}>
    {showHeader && (
      <div className="flex items-center gap-2 mb-2">
        <SkeletonLine width="32px" height="32px" />
        <div className="flex-1 space-y-1.5">
          <SkeletonLine width="60%" height="10px" />
          <SkeletonLine width="40%" height="8px" />
        </div>
      </div>
    )}
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="space-y-1.5">
        <SkeletonLine width={`${70 + Math.random() * 30}%`} />
        <SkeletonLine width={`${40 + Math.random() * 40}%`} />
      </div>
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className = '',
}) => (
  <div className={`space-y-3 p-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-xl border border-canvas-border bg-white/[0.02] p-3 space-y-2"
      >
        <div className="flex items-center gap-2">
          <SkeletonLine width="24px" height="24px" />
          <SkeletonLine width="50%" height="10px" />
        </div>
        <SkeletonLine width="80%" />
        <SkeletonLine width="60%" />
      </div>
    ))}
  </div>
);

export const ListSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 6,
  className = '',
}) => (
  <div className={`space-y-1 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-2 px-3 py-2">
        <SkeletonLine width="16px" height="16px" />
        <SkeletonLine width={`${50 + Math.random() * 40}%`} height="10px" />
        <div className="flex-1" />
        <SkeletonLine width="40px" height="10px" />
      </div>
    ))}
  </div>
);

export default PanelSkeleton;
