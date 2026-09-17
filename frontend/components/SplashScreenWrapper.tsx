'use client';

import { useEffect, useState } from 'react';
import { useLoading } from '@/lib/loading-context';
import SplashScreen from '@/components/SplashScreen';

export default function SplashScreenWrapper() {
  const { isLoading, hasShownSplash } = useLoading();
  const [isClient, setIsClient] = useState(false);

  // Simple client-side check
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show splash only once per session (on any page, first load)
  const shouldShow = isClient && isLoading && !hasShownSplash;

  if (!shouldShow) {
    return null;
  }

  return <SplashScreen isLoading={isLoading} />;
}
