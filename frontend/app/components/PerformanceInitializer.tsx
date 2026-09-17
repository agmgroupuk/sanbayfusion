'use client';

import { useEffect } from 'react';

/**
 * Hooks into the browser load event and bootstraps the performance monitors once the page is stable.
 */
export default function PerformanceInitializer() {
  useEffect(() => {
    let canceled = false;
    let timeoutId: number | undefined;

    const initMonitoring = async () => {
      try {
        const module = await import('@/lib/performance');
        if (!canceled && module?.initPerformanceMonitoring) {
          module.initPerformanceMonitoring();
        }
      } catch (error) {
        if (!canceled) {
          console.warn('Performance monitoring failed to load:', error);
        }
      }
    };

    const scheduleInit = () => {
      timeoutId = window.setTimeout(initMonitoring, 100);
    };

    let cleanup: (() => void) | undefined;
    if (document.readyState === 'complete') {
      scheduleInit();
    } else {
      const handleLoad = () => {
        scheduleInit();
      };
      window.addEventListener('load', handleLoad, { once: true });
      cleanup = () => {
        window.removeEventListener('load', handleLoad);
      };
    }

    return () => {
      canceled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return null;
}
