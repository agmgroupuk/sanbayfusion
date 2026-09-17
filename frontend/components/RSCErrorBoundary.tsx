'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class RSCErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is an RSC-related error we want to suppress
    const errorMessage = error.message || '';
    const isRSCError =
      errorMessage.includes('_rsc=') ||
      errorMessage.includes('503') ||
      errorMessage.includes('Service Unavailable');

    if (isRSCError) {
      // Silently handle RSC errors - don't show error boundary
      return { hasError: false };
    }

    // Let other errors through to be properly handled
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log non-RSC errors for debugging
    const errorMessage = error.message || '';
    const isRSCError =
      errorMessage.includes('_rsc=') ||
      errorMessage.includes('503') ||
      errorMessage.includes('Service Unavailable');

    if (!isRSCError) {
      console.error('Uncaught error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Only show error UI for non-RSC errors
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please try refreshing the page</p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RSCErrorBoundary;
