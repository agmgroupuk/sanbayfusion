/**
 * LAZY LOADING UTILITIES
 * Code splitting and dynamic imports for better performance
 */

import { lazy } from 'react';

// ============================================
// COMPONENT LAZY LOADING
// ============================================

// Lazy load heavy components
export const LazyComponents = {
  // AI Studio components (heavy due to Monaco editor)
  AIStudio: lazy(() => import('@/components/ai-studio/AIStudio')),
  CodeEditor: lazy(() => import('@/components/ai-studio/CodeEditor')),

  // Community components
  CommunityFeed: lazy(() => import('@/components/community/CommunityFeed')),
  PostEditor: lazy(() => import('@/components/community/PostEditor')),

  // Agent components
  AgentBuilder: lazy(() => import('@/components/agents/AgentBuilder')),
  AgentChat: lazy(() => import('@/components/agents/AgentChat')),

  // Analytics components (heavy due to charts)
  AnalyticsDashboard: lazy(() =>
    import('@/components/analytics/AnalyticsDashboard')
  ),
  Charts: lazy(() => import('@/components/analytics/Charts')),

  // Settings components
  UserSettings: lazy(() => import('@/components/settings/UserSettings')),
  BillingSettings: lazy(() => import('@/components/settings/BillingSettings')),
};

// ============================================
// PAGE LAZY LOADING
// ============================================

export const LazyPages = {
  // Dashboard pages
  Dashboard: lazy(() => import('@/app/dashboard/page')),
  Analytics: lazy(() => import('@/app/analytics/page')),

  // AI Studio pages
  AIStudio: lazy(() => import('@/app/ai-studio/page')),
  Models: lazy(() => import('@/app/ai-studio/models/page')),

  // Agent pages
  Agents: lazy(() => import('@/app/agents/page')),
  AgentDetail: lazy(() => import('@/app/agents/[id]/page')),

  // Community pages
  Community: lazy(() => import('@/app/community/page')),
  PostDetail: lazy(() => import('@/app/community/[id]/page')),

  // Settings pages
  Settings: lazy(() => import('@/app/settings/page')),
  Profile: lazy(() => import('@/app/settings/profile/page')),
  Billing: lazy(() => import('@/app/settings/billing/page')),
};

// ============================================
// LIBRARY LAZY LOADING
// ============================================

export const LazyLibraries = {
  // Monaco Editor (very heavy)
  MonacoEditor: lazy(async () => {
    const monaco = await import('@monaco-editor/react');
    return { default: monaco.default };
  }),

  // Chart libraries
  ChartJS: lazy(async () => {
    await import('chart.js');
    const { Chart } = await import('react-chartjs-2');
    return { default: Chart };
  }),

  // PDF generation
  PDFLib: lazy(async () => {
    const { PDFDocument } = await import('pdf-lib');
    return { default: PDFDocument };
  }),

  // Image processing
  Sharp: lazy(async () => {
    const sharp = await import('sharp');
    return { default: sharp.default };
  }),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Load component with error boundary and loading fallback
 */
export function loadComponent(Component, fallback = null) {
  return lazy(async () => {
    try {
      const module = await Component();
      return module;
    } catch (error) {
      console.error('Failed to load component:', error);
      // Return error component or fallback
      return {
        default: () =>
          fallback || (
            <div className="flex items-center justify-center p-4">
              <div className="text-red-500">Failed to load component</div>
            </div>
          ),
      };
    }
  });
}

/**
 * Preload component for better UX
 */
export function preloadComponent(Component) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  // This is a simplified version - in practice you'd need to resolve the chunk URL
  document.head.appendChild(link);
}

/**
 * Dynamic import with retry logic
 */
export async function dynamicImport(importer, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await importer();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Import failed, retrying... (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// ============================================
// ROUTE-BASED CODE SPLITTING
// ============================================

/**
 * Route-based lazy loading configuration
 */
export const RouteLazyLoading = {
  // Routes that should be eagerly loaded (critical pages)
  eager: [
    '/', // Home page
    '/login',
    '/signup',
    '/dashboard',
  ],

  // Routes that should be lazy loaded with high priority
  highPriority: ['/ai-studio', '/agents', '/community'],

  // Routes that should be lazy loaded with low priority
  lowPriority: ['/analytics', '/settings', '/profile', '/billing'],
};

// ============================================
// PERFORMANCE MONITORING
// ============================================

/**
 * Track lazy loading performance
 */
export function trackLazyLoading(componentName, loadTime) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'lazy_load', {
      event_category: 'performance',
      event_label: componentName,
      value: Math.round(loadTime),
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🚀 Lazy loaded ${componentName} in ${loadTime}ms`);
  }
}

/**
 * HOC for tracking lazy component load times
 */
export function withLazyTracking(Component, componentName) {
  return lazy(async () => {
    const startTime = performance.now();
    const module = await Component();
    const loadTime = performance.now() - startTime;

    trackLazyLoading(componentName, loadTime);

    return module;
  });
}
