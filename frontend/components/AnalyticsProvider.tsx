'use client'
import { createContext, useContext, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView, trackVisitor, trackEvent } from '@/lib/analytics'

const AnalyticsContext = createContext({})

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Track visitor on first mount (any visitor - logged in or not)
  useEffect(() => {
    trackVisitor()
  }, [])

  // Track page views on every navigation
  useEffect(() => {
    if (pathname && typeof document !== 'undefined') {
      // Small delay to let document.title update for SPA navigations
      const timer = setTimeout(() => {
        trackPageView(pathname, document.title)
      }, 100)

      // Track feature visits as events for key sections
      const section = pathname.split('/')[1]
      if (section && ['chat', 'tools', 'agents', 'lab', 'dashboard', 'canvas', 'studio', 'community'].includes(section)) {
        trackEvent('navigation', `visit_${section}`, { path: pathname }).catch(() => {})
      }

      return () => clearTimeout(timer)
    }
  }, [pathname])

  return (
    <AnalyticsContext.Provider value={{}}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export const useAnalytics = () => useContext(AnalyticsContext)
