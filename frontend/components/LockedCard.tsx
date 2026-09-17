'use client';

import { ReactNode } from 'react';
import { Lock, Crown } from 'lucide-react';
import Link from 'next/link';

interface LockedCardProps {
  children: ReactNode;
  isLocked: boolean;
  title?: string;
}

export function LockedCard({ children, isLocked, title }: LockedCardProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Original card with blur effect */}
      <div className="blur-sm pointer-events-none opacity-60">{children}</div>

      {/* Lock overlay - contained within card bounds */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl flex items-center justify-center overflow-hidden">
        <div className="text-center p-4 max-w-full">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>

          <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">
            {title ? `${title} Requires Subscription` : 'Premium Feature'}
          </h3>

          <p className="text-gray-300 text-xs mb-3 line-clamp-2 px-2">
            Unlock access to all AI experiments and tools with a subscription
            plan.
          </p>

          <Link href="/overview/spaces">
            <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full font-semibold text-black text-sm hover:shadow-lg hover:shadow-yellow-500/50 transition-all transform hover:scale-105">
              <Crown className="w-4 h-4" />
              View Plans
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
