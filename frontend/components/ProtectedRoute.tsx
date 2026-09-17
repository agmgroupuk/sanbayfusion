'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  redirectTo = '/auth',
}: ProtectedRouteProps) {
  const [mounted, setMounted] = useState(false);
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Don't redirect while loading
    if (state.isLoading) return;

    // Redirect if not authenticated
    if (!state.isAuthenticated) {
      router.push(redirectTo);
    }
  }, [state.isAuthenticated, state.isLoading, router, redirectTo, mounted]);

  // During SSR, show loading
  if (!mounted || state.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-cyan-500/15 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!state.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
