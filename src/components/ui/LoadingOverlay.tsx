'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  push: (href: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Helper component that uses useSearchParams and usePathname within a Suspense boundary
// to notify the provider when any URL (path or query parameters) changes.
function NavigationEventTracker({ onChange }: { onChange: (path: string) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Create a stable string representation of the full path to avoid unstable object references in dependencies
  const searchParamsString = searchParams?.toString() || '';
  const fullPath = pathname + (searchParamsString ? `?${searchParamsString}` : '');

  useEffect(() => {
    onChange(fullPath);
  }, [fullPath, onChange]);

  return null;
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [manualLoading, setManualLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const startLoading = useCallback(() => {
    console.log('[LoadingProvider] startLoading called');
    setManualLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    console.log('[LoadingProvider] stopLoading called');
    setManualLoading(false);
  }, []);

  const isLoading = manualLoading || isNavigating;

  console.log('[LoadingProvider] render - isLoading:', isLoading, 'manualLoading:', manualLoading, 'isNavigating:', isNavigating);

  // Called whenever navigation (path or search params change) finishes
  const handleNavigationComplete = useCallback((fullPath: string) => {
    // Use functional state updates to read and update states without creating a dependency loop
    setIsNavigating(prev => {
      if (prev) {
        console.log('[LoadingProvider] handleNavigationComplete - resetting isNavigating for:', fullPath);
        return false;
      }
      return prev;
    });
    setManualLoading(prev => {
      if (prev) {
        console.log('[LoadingProvider] handleNavigationComplete - resetting manualLoading for:', fullPath);
        return false;
      }
      return prev;
    });
  }, []);

  // Safety fallback timeout to prevent getting stuck if navigation or action fails
  useEffect(() => {
    if (isLoading) {
      console.log('[LoadingProvider] starting 10s safety timeout');
      const timer = setTimeout(() => {
        console.warn('[LoadingProvider] safety timeout triggered after 10s');
        setIsNavigating(false);
        setManualLoading(false);
      }, 10000); // 10 seconds safety limit
      return () => {
        console.log('[LoadingProvider] clearing safety timeout');
        clearTimeout(timer);
      };
    }
  }, [isLoading]);

  // Custom push method that activates the loading overlay before navigating
  const push = useCallback((href: string) => {
    const targetUrl = new URL(href, window.location.origin);
    const targetPathname = targetUrl.pathname.replace(/\/$/, '') || '/';
    const currentPathname = window.location.pathname.replace(/\/$/, '') || '/';

    console.log('[LoadingProvider] push called with:', href, 'targetPathname:', targetPathname, 'currentPathname:', currentPathname);

    if (currentPathname === targetPathname) {
      // If we are on the same page pathname, just let router navigate without loader
      console.log('[LoadingProvider] push is to same pathname - navigating without loader');
      router.push(href);
      return;
    }

    setIsNavigating(true);
    router.push(href);
  }, [router]);



  const contextValue = useMemo(() => ({
    isLoading,
    startLoading,
    stopLoading,
    push
  }), [isLoading, startLoading, stopLoading, push]);

  return (
    <LoadingContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <NavigationEventTracker onChange={handleNavigationComplete} />
      </Suspense>

      {/* Main App Content - blurred, dimmed, and scaled out slightly during loading */}
      <div
        className={
          isLoading
            ? "blur-[12px] opacity-25 scale-[0.98] pointer-events-none transition-all duration-500 ease-in-out select-none"
            : "transition-all duration-300 ease-in-out"
        }
      >
        {children}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/75 backdrop-blur-xl animate-fade-in select-none pointer-events-auto">
          {/* Logo Container */}
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 animate-float">
            <Image
              src="/pookiz-logo.png"
              alt="Pookiz Loading"
              fill
              sizes="(max-width: 640px) 160px, 192px"
              className="object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              priority
            />
          </div>

          {/* 3 Animating White Dots with staggered delays */}
          <div className="flex items-center space-x-2.5 mt-6">
            <span className="w-3.5 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }} />
            <span className="w-3.5 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }} />
            <span className="w-3.5 h-3.5 bg-white rounded-full animate-bounce" />
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}