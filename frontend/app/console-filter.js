// Console Error Filter - Suppress RSC 503 errors
(function () {
  'use strict';

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // Patterns to filter out
  const suppressPatterns = [
    /GET.*\?_rsc=.*503.*Service Unavailable/,
    /_rsc=.*503/,
    /Service Unavailable.*_rsc/,
    /Failed to fetch.*_rsc/,
    /NetworkError.*_rsc/,
  ];

  // Check if error should be suppressed
  function shouldSuppress(message) {
    const messageStr = String(message);
    return suppressPatterns.some((pattern) => pattern.test(messageStr));
  }

  // Override console.error
  console.error = function (...args) {
    const message = args.join(' ');
    if (!shouldSuppress(message)) {
      originalError.apply(console, args);
    }
  };

  // Override console.warn for any RSC warnings
  console.warn = function (...args) {
    const message = args.join(' ');
    if (!shouldSuppress(message)) {
      originalWarn.apply(console, args);
    }
  };

  // Optional: Also filter console.log if needed
  console.log = function (...args) {
    const message = args.join(' ');
    if (!shouldSuppress(message)) {
      originalLog.apply(console, args);
    }
  };

  // Intercept network errors in browser
  if (typeof window !== 'undefined') {
    // Override fetch to suppress RSC errors
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = args[0];

      return originalFetch.apply(this, args).catch((error) => {
        // Check if this is an RSC request that failed
        if (typeof url === 'string' && url.includes('_rsc=')) {
          // Silently ignore RSC prefetch failures
          return Promise.reject(new Error('RSC_PREFETCH_IGNORED'));
        }
        return Promise.reject(error);
      });
    };

    // Suppress unhandled promise rejections for RSC
    window.addEventListener('unhandledrejection', function (event) {
      if (
        event.reason &&
        (event.reason.message === 'RSC_PREFETCH_IGNORED' ||
          (typeof event.reason === 'string' && event.reason.includes('_rsc=')))
      ) {
        event.preventDefault();
      }
    });
  }

  console.log(
    '🔇 RSC Error Filter Active - 503 prefetch errors will be suppressed'
  );
})();
