'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

interface PageLoaderProps {
  message?: string;
  showLogo?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PageLoader - A consistent loading component with company branding
 * Use this instead of plain "Loading..." text on pages
 */
export default function PageLoader({ 
  message = 'Loading...', 
  showLogo = true,
  size = 'md' 
}: PageLoaderProps) {
  const logoSizes = {
    sm: { width: 48, height: 48, className: 'w-12 h-12' },
    md: { width: 80, height: 80, className: 'w-20 h-20' },
    lg: { width: 128, height: 128, className: 'w-32 h-32' }
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const { width, height, className } = logoSizes[size];

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-br from-neural-900 via-neural-800 to-neural-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        {showLogo && (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={className}
          >
            <Image
              src="/images/logos/company-logo.png"
              alt="Sanbay Fusion"
              width={width}
              height={height}
              className="w-full h-full object-contain drop-shadow-lg"
              priority
            />
          </motion.div>
        )}

        {/* Loading bar */}
        <div className="w-48 h-1 bg-neural-700 rounded-full overflow-hidden">
          <motion.div
            animate={{ x: ['0%', '100%', '0%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/4 bg-gradient-to-r from-brand-500 to-accent-500 rounded-full"
          />
        </div>

        {/* Loading text */}
        <p className={`text-neural-400 ${textSizes[size]} font-medium`}>
          {message}
        </p>

        {/* Bouncing dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <motion.div
              key={dot}
              animate={{ y: [-4, 0, -4] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: dot * 0.15,
              }}
              className="w-2 h-2 bg-brand-500 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * MiniLoader - A smaller inline loading indicator
 */
export function MiniLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 text-neural-400">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-5 h-5 border-2 border-neural-600 border-t-brand-500 rounded-full"
      />
      <span className="text-sm">{message}</span>
    </div>
  );
}
