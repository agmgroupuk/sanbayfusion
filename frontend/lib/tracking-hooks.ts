/**
 * FRONTEND TRACKING HOOKS
 * React hooks for automatic tracking of user interactions
 */

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

const TRACKING_API = ''

// ============================================
// TRACK CHAT INTERACTION
// ============================================
export function useChatTracking(agentId: string, agentName: string) {
  const trackChat = useCallback(async (
    userMessage: string,
    aiResponse: string,
    responseTime: number,
    model: string = 'gpt-4',
    language: string = 'en'
  ) => {
    try {
      await fetch(`${TRACKING_API}/api/analytics/track/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for tracking
        body: JSON.stringify({
          agentId,
          agentName,
          userMessage,
          aiResponse,
          responseTime,
          model,
          language
        })
      })
    } catch (error) {
      console.error('Failed to track chat:', error)
    }
  }, [agentId, agentName])

  const trackFeedback = useCallback(async (
    interactionId: string,
    satisfied: boolean,
    feedback?: string
  ) => {
    try {
      await fetch(`${TRACKING_API}/api/analytics/track/chat/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ interactionId, satisfied, feedback })
      })
    } catch (error) {
      console.error('Failed to track feedback:', error)
    }
  }, [])

  return { trackChat, trackFeedback }
}

// ============================================
// TRACK TOOL USAGE
// ============================================
export function useToolTracking() {
  const trackTool = useCallback(async (
    toolName: string,
    toolCategory: string,
    input: any,
    output: any,
    success: boolean,
    error?: string,
    executionTime?: number
  ) => {
    try {
      await fetch(`${TRACKING_API}/api/analytics/track/tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toolName,
          toolCategory,
          input,
          output,
          success,
          error,
          executionTime
        })
      })
    } catch (error) {
      console.error('Failed to track tool:', error)
    }
  }, [])

  return { trackTool }
}

// ============================================
// TRACK LAB EXPERIMENT
// ============================================
export function useLabTracking() {
  const trackExperiment = useCallback(async (
    experimentName: string,
    experimentType: string,
    input: any,
    output: any,
    model: string,
    success: boolean,
    error?: string,
    processingTime?: number,
    rating?: number
  ) => {
    try {
      await fetch(`${TRACKING_API}/api/analytics/track/lab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          experimentName,
          experimentType,
          input,
          output,
          model,
          success,
          error,
          processingTime,
          rating
        })
      })
    } catch (error) {
      console.error('Failed to track experiment:', error)
    }
  }, [])

  return { trackExperiment }
}

// ============================================
// TRACK USER EVENT
// ============================================
export function useEventTracking() {
  const trackEvent = useCallback(async (
    eventType: 'auth' | 'payment' | 'feature' | 'navigation' | 'error' | 'other',
    eventName: string,
    eventData?: Record<string, any>,
    success: boolean = true,
    error?: string
  ) => {
    try {
      await fetch(`${TRACKING_API}/api/analytics/track/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventType,
          eventName,
          eventData,
          success,
          error
        })
      })
    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }, [])

  return { trackEvent }
}

// ============================================
// AUTO-TRACK PAGE VIEWS
// ============================================
export function usePageTracking() {
  const pathname = usePathname()
  const startTimeRef = useRef<number>(Date.now())
  const scrollDepthRef = useRef<number>(0)

  useEffect(() => {
    startTimeRef.current = Date.now()
    scrollDepthRef.current = 0

    // Track scroll depth
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const scrollPercent = Math.round((scrollTop / (documentHeight - windowHeight)) * 100)

      if (scrollPercent > scrollDepthRef.current) {
        scrollDepthRef.current = scrollPercent
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [pathname])
}

// ============================================
// GET CURRENT TRACKING DATA
// ============================================
export async function getTrackingData() {
  try {
    const response = await fetch(`${TRACKING_API}/api/analytics/analytics/current`, {
      credentials: 'include'
    })

    if (!response.ok) return null

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Failed to get tracking data:', error)
    return null
  }
}

// ============================================
// EXAMPLE USAGE IN COMPONENTS
// ============================================

/*
// In Chat Component:
const { trackChat, trackFeedback } = useChatTracking('agent-001', 'Legal Advisor')

const handleSendMessage = async (message: string) => {
  const startTime = Date.now()
  const response = await sendToAI(message)
  const responseTime = Date.now() - startTime
  
  await trackChat(message, response, responseTime, 'gpt-4', 'en')
}

// In Tool Component:
const { trackTool } = useToolTracking()

const handleRunTool = async (input: any) => {
  const startTime = Date.now()
  try {
    const output = await runTool(input)
    const executionTime = Date.now() - startTime
    await trackTool('JSON Formatter', 'formatting', input, output, true, undefined, executionTime)
  } catch (error) {
    const executionTime = Date.now() - startTime
    await trackTool('JSON Formatter', 'formatting', input, null, false, error.message, executionTime)
  }
}

// In Lab Component:
const { trackExperiment } = useLabTracking()

const handleRunExperiment = async (input: any) => {
  const startTime = Date.now()
  const output = await runExperiment(input)
  const processingTime = Date.now() - startTime
  
  await trackExperiment(
    'Image Generation',
    'image',
    input,
    output,
    'dall-e-3',
    true,
    undefined,
    processingTime
  )
}

// In Auth Components:
const { trackEvent } = useEventTracking()

const handleSignup = async (email: string) => {
  try {
    await signup(email)
    await trackEvent('auth', 'signup', { email }, true)
  } catch (error) {
    await trackEvent('auth', 'signup', { email }, false, error.message)
  }
}

// In Layout (auto-track pages):
usePageTracking() // Automatically tracks all page views
*/
