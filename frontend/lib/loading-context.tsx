'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const SESSION_KEY = 'maula_splash_shown';

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  completeLoading: () => void;
  hasShownSplash: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasShownSplash, setHasShownSplash] = useState(false);

  // Check sessionStorage on mount - only show splash once per session
  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    
    if (alreadyShown) {
      // Already shown this session, skip splash
      setIsLoading(false);
      setHasShownSplash(true);
    } else {
      // First load this session, show splash for 3.5 seconds
      const timer = setTimeout(() => {
        setIsLoading(false);
        setHasShownSplash(true);
        sessionStorage.setItem(SESSION_KEY, 'true');
      }, 3500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const completeLoading = () => {
    setIsLoading(false);
    if (!hasShownSplash) {
      setHasShownSplash(true);
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
  };

  return (
    <LoadingContext.Provider
      value={{ isLoading, setIsLoading, completeLoading, hasShownSplash }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    // During SSR or before provider mounts, return default values
    return {
      isLoading: false,
      setIsLoading: () => {},
      completeLoading: () => {},
      hasShownSplash: true,
    };
  }
  return context;
}
