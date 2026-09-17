/**
 * ErrorBoundary — Production-grade error boundary for Canvas Studio
 * Catches React render errors and provides recovery UI
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Report to backend analytics if available
    this.reportError(error, errorInfo);

    // Call optional callback
    this.props.onError?.(error, errorInfo);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      await fetch('/api/analytics/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source: 'canvas-studio',
          error: error.message,
          stack: error.stack?.slice(0, 2000),
          componentStack: errorInfo.componentStack?.slice(0, 1000),
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch {
      // Silently fail — don't cause more errors
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // If error keeps recurring, show hard reload option
      const isRecurring = this.state.errorCount > 2;

      return (
        <div className="min-h-screen bg-canvas-card flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-canvas-card rounded-2xl border border-canvas-border overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-primary-500/10 to-orange-500/10 border-b border-canvas-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-white/50">
                    {isRecurring
                      ? 'This error keeps occurring. Try reloading.'
                      : 'An unexpected error occurred in Canvas Studio.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Error details */}
            <div className="px-6 py-4">
              {this.state.error && (
                <div className="mb-4 p-3 bg-white/[0.03] rounded-lg border border-canvas-border">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bug className="w-3.5 h-3.5 text-primary-400" />
                    <span className="text-xs text-primary-400 font-medium">Error Details</span>
                  </div>
                  <p className="text-xs text-canvas-muted font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {!isRecurring && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                )}

                <button
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 text-white/50 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go to Homepage
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-canvas-border text-center">
              <p className="text-[10px] text-white/30">
                One Last AI Canvas Studio • Error #{this.state.errorCount}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
