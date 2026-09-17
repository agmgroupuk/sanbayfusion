/**
 * Analytics — NO localStorage. Uses cookies for visitorId, in-memory for session state.
 * All tracking data is sent to the backend DB via API calls.
 */
const API_BASE = ''

/**
 * Cookie helper — read/write a simple cookie value
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}

/**
 * Get or create visitor ID (stored in a cookie — not localStorage)
 */
function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let visitorId = getCookie('_vid')
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCookie('_vid', visitorId, 365)
  }
  return visitorId
}

/**
 * Get or create session ID (in-memory — resets on tab close like sessionStorage but no Storage API)
 */
let _sessionId: string | null = null
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  if (!_sessionId) {
    _sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  return _sessionId
}

/**
 * Get user ID from in-memory auth state (set by secureAuthStorage)
 * Falls back to server-side session cookie (sent automatically with credentials: include)
 */
let _cachedUserId: string | null = null
function getUserId(): string | null {
  if (typeof window === 'undefined') return null
  return _cachedUserId
}

/**
 * Set the user ID for analytics tracking (called by auth system on login)
 */
export function setAnalyticsUserId(userId: string | null): void {
  _cachedUserId = userId
}

let visitorTracked = false

export async function trackVisitor() {
  if (typeof window === 'undefined' || visitorTracked) return
  visitorTracked = true
  try {
    await fetch(`${API_BASE}/api/analytics/track/visitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        userId: getUserId(),
        referrer: document.referrer || '',
        landingPage: window.location.pathname,
      })
    })
  } catch (error) {
    // Silent fail — don't break UX for tracking
  }
}

export async function trackPageView(path: string, title?: string) {
  try {
    await fetch(`${API_BASE}/api/analytics/track/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        userId: getUserId(),
        url: path,
        title: title || (typeof document !== 'undefined' ? document.title : ''),
        referrer: typeof document !== 'undefined' ? document.referrer : ''
      })
    })
  } catch (error) {
    // Silent fail
  }
}

export async function trackEvent(eventType: string, eventName: string, eventData?: any) {
  try {
    await fetch(`${API_BASE}/api/analytics/track/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        userId: getUserId(),
        eventType,
        eventName,
        eventData
      })
    })
  } catch (error) {
    console.error('Failed to track event:', error)
  }
}

export async function trackSignup(userId: string, email: string) {
  _cachedUserId = userId
  await trackEvent('user_action', 'signup', { email })
}

export async function trackLogin(userId: string, email: string) {
  _cachedUserId = userId
  await trackEvent('user_action', 'login', { email })
}
