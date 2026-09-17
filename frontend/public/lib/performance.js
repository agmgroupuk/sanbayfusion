/**
 * PERFORMANCE MONITORING UTILITIES
 * Web Vitals, Core Web Vitals, and custom performance metrics
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// ============================================
// CORE WEB VITALS MONITORING
// ============================================

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.isInitialized = false;
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.isInitialized = true;

    // Monitor Core Web Vitals
    this.monitorWebVitals();

    // Monitor custom metrics
    this.monitorCustomMetrics();

    // Monitor resource loading
    this.monitorResourceLoading();

    // Monitor navigation timing
    this.monitorNavigationTiming();

    console.log('✅ Performance monitoring initialized');
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorWebVitals() {
    // Cumulative Layout Shift
    getCLS((metric) => {
      this.recordMetric('CLS', metric.value, metric);
    });

    // First Input Delay
    getFID((metric) => {
      this.recordMetric('FID', metric.value, metric);
    });

    // First Contentful Paint
    getFCP((metric) => {
      this.recordMetric('FCP', metric.value, metric);
    });

    // Largest Contentful Paint
    getLCP((metric) => {
      this.recordMetric('LCP', metric.value, metric);
    });

    // Time to First Byte
    getTTFB((metric) => {
      this.recordMetric('TTFB', metric.value, metric);
    });
  }

  /**
   * Monitor custom performance metrics
   */
  monitorCustomMetrics() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('longTask', entry.duration, entry);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });

      // Monitor first paint
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-paint') {
            this.recordMetric('firstPaint', entry.startTime, entry);
          } else if (entry.name === 'first-contentful-paint') {
            this.recordMetric('firstContentfulPaint', entry.startTime, entry);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // Monitor layout shifts
      const layoutShiftObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.recordMetric('layoutShift', clsValue, {
          entries: list.getEntries(),
        });
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * Monitor resource loading performance
   */
  monitorResourceLoading() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 1000) {
            // Log slow resources (>1s)
            console.warn('🐌 Slow resource:', {
              name: entry.name,
              duration: entry.duration,
              size: entry.transferSize,
              type: entry.initiatorType,
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    }
  }

  /**
   * Monitor navigation timing
   */
  monitorNavigationTiming() {
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(
            'navigation',
            entry.loadEventEnd - entry.fetchStart,
            entry
          );
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, value, data = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      data,
    };

    this.metrics[name] = metric;

    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_metric', {
        event_category: 'performance',
        event_label: name,
        value: Math.round(value),
      });
    }

    // Notify observers
    this.observers.forEach((callback) => callback(metric));

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${name}:`, Math.round(value), data);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback) {
    this.observers.push(callback);
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore() {
    const metrics = this.metrics;
    let score = 100;

    // CLS (Cumulative Layout Shift) - target < 0.1
    if (metrics.CLS) {
      if (metrics.CLS.value > 0.25) score -= 25;
      else if (metrics.CLS.value > 0.1) score -= 10;
    }

    // FID (First Input Delay) - target < 100ms
    if (metrics.FID) {
      if (metrics.FID.value > 300) score -= 25;
      else if (metrics.FID.value > 100) score -= 10;
    }

    // LCP (Largest Contentful Paint) - target < 2.5s
    if (metrics.LCP) {
      if (metrics.LCP.value > 4000) score -= 25;
      else if (metrics.LCP.value > 2500) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// ============================================
// BUNDLE SIZE MONITORING
// ============================================

export const bundleMonitor = {
  /**
   * Track bundle size changes
   */
  trackBundleSize() {
    if (typeof window === 'undefined') return;

    // Track when bundles load
    window.addEventListener('load', () => {
      setTimeout(() => {
        if ('performance' in window && 'getEntriesByType' in performance) {
          const resources = performance.getEntriesByType('resource');
          const scripts = resources.filter((r) => r.name.includes('.js'));

          scripts.forEach((script) => {
            if (script.transferSize > 0) {
              performanceMonitor.recordMetric(
                'bundleSize',
                script.transferSize,
                {
                  url: script.name,
                  size: script.transferSize,
                }
              );
            }
          });
        }
      }, 1000);
    });
  },

  /**
   * Monitor code splitting effectiveness
   */
  trackCodeSplitting() {
    if (typeof window === 'undefined') return;

    // Track dynamic imports
    const originalImport = window.import;
    if (originalImport) {
      window.import = function (...args) {
        const startTime = performance.now();
        return originalImport.apply(this, args).then((module) => {
          const loadTime = performance.now() - startTime;
          performanceMonitor.recordMetric('dynamicImport', loadTime, {
            module: args[0],
          });
          return module;
        });
      };
    }
  },
};

// ============================================
// MEMORY MONITORING
// ============================================

export const memoryMonitor = {
  /**
   * Monitor memory usage
   */
  startMonitoring(interval = 30000) {
    // 30 seconds
    if (typeof window === 'undefined' || !performance.memory) return;

    const monitor = () => {
      const memory = performance.memory;
      performanceMonitor.recordMetric('memoryUsage', memory.usedJSHeapSize, {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      });
    };

    monitor(); // Initial measurement
    return setInterval(monitor, interval);
  },

  /**
   * Check for memory leaks
   */
  detectMemoryLeaks() {
    if (typeof window === 'undefined') return;

    let previousSize = 0;
    let leakCount = 0;

    setInterval(() => {
      if (performance.memory) {
        const currentSize = performance.memory.usedJSHeapSize;
        if (currentSize > previousSize * 1.1) {
          // 10% increase
          leakCount++;
          if (leakCount > 3) {
            console.warn('🚨 Potential memory leak detected');
            performanceMonitor.recordMetric(
              'memoryLeak',
              currentSize - previousSize
            );
            leakCount = 0;
          }
        } else {
          leakCount = 0;
        }
        previousSize = currentSize;
      }
    }, 60000); // Check every minute
  },
};

// ============================================
// NETWORK MONITORING
// ============================================

export const networkMonitor = {
  /**
   * Monitor network requests
   */
  startMonitoring() {
    if (typeof window === 'undefined') return;

    // Override fetch for monitoring
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const startTime = performance.now();
      return originalFetch
        .apply(this, args)
        .then((response) => {
          const duration = performance.now() - startTime;
          performanceMonitor.recordMetric('networkRequest', duration, {
            url: args[0],
            method: args[1]?.method || 'GET',
            status: response.status,
          });
          return response;
        })
        .catch((error) => {
          const duration = performance.now() - startTime;
          performanceMonitor.recordMetric('networkError', duration, {
            url: args[0],
            error: error.message,
          });
          throw error;
        });
    };

    // Monitor XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._startTime = performance.now();
      this._url = url;
      this._method = method;
      return originalOpen.apply(this, arguments);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      const xhr = this;
      const completeHandler = () => {
        if (xhr._startTime) {
          const duration = performance.now() - xhr._startTime;
          performanceMonitor.recordMetric('xhrRequest', duration, {
            url: xhr._url,
            method: xhr._method,
            status: xhr.status,
          });
        }
      };

      if (this.addEventListener) {
        this.addEventListener('loadend', completeHandler);
      } else {
        this.onreadystatechange = function () {
          if (this.readyState === 4) {
            completeHandler();
          }
        };
      }

      return originalSend.apply(this, arguments);
    };
  },
};

// ============================================
// INITIALIZATION
// ============================================

export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Initialize all monitors
  performanceMonitor.init();
  bundleMonitor.trackBundleSize();
  bundleMonitor.trackCodeSplitting();
  memoryMonitor.startMonitoring();
  memoryMonitor.detectMemoryLeaks();
  networkMonitor.startMonitoring();

  console.log('🚀 Performance monitoring fully initialized');
}
