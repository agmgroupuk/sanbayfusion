'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminSSE } from '@/hooks/useAdminSSE'
import {
  Users, MousePointerClick, RefreshCw, Shield, ArrowLeft,
  TrendingUp, Globe, Monitor, Smartphone, Tablet, Eye,
  MapPin, Wifi, WifiOff
} from 'lucide-react'

interface Stats {
  users: { total: number; active: number }
  pageViews: { total: number; today: number }
  events: { total: number; signups: number; logins: number }
  visitors: { total: number; today: number; now: number }
}

interface UserRecord {
  _id: string
  email: string
  name: string
  role?: string
  createdAt: string
  lastLoginAt: string | null
}

interface VisitorRecord {
  id: string
  visitorId: string
  userId?: string
  ipAddress: string
  userAgent: string
  country: string
  city: string
  device: string
  browser: string
  os: string
  referrer?: string
  landingPage: string
  isRegistered: boolean
  firstVisit: string
  lastVisit: string
  visitCount: number
}

interface PageViewRecord {
  id: string
  visitorId: string
  sessionId: string
  userId?: string
  url: string
  title?: string
  referrer?: string
  timeSpent: number
  timestamp: string
  visitor?: {
    ipAddress: string
    device: string
    browser: string
    os: string
    country: string
    city: string
  }
}

type TabType = 'overview' | 'visitors' | 'pageviews' | 'users' | 'live'

export default function AdminAnalyticsPage() {
  const { state } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [visitors, setVisitors] = useState<VisitorRecord[]>([])
  const [pageViews, setPageViews] = useState<PageViewRecord[]>([])
  const [livePageViews, setLivePageViews] = useState<any[]>([])
  const [liveVisitors, setLiveVisitors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [visitorTotal, setVisitorTotal] = useState(0)
  const [pageViewTotal, setPageViewTotal] = useState(0)

  // SSE real-time stream
  const isAdmin = state.user?.role === 'admin' || state.user?.role === 'moderator'
  const { data: sseData, isConnected, status: sseStatus } = useAdminSSE({
    events: ['stats', 'live'],
    enabled: isAdmin,
  })

  // Update state from SSE
  useEffect(() => {
    if (sseData.stats) {
      setStats(sseData.stats)
      setLoading(false)
    }
  }, [sseData.stats])

  useEffect(() => {
    if (sseData.live) {
      setLivePageViews(sseData.live.pageViews || [])
      setLiveVisitors(sseData.live.visitors || [])
    }
  }, [sseData.live])

  // Redirect non-admin users
  useEffect(() => {
    if (!state.isLoading && state.isAuthenticated && state.user?.role !== 'admin' && state.user?.role !== 'moderator') {
      router.push('/dashboard')
    }
    if (!state.isLoading && !state.isAuthenticated) {
      router.push('/auth/login')
    }
  }, [state.isLoading, state.isAuthenticated, state.user?.role, router])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/stats', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data.data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/users', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.data?.users || [])
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchVisitors = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/visitors?limit=50', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch visitors')
      const data = await res.json()
      setVisitors(data.data?.visitors || [])
      setVisitorTotal(data.data?.total || 0)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchPageViews = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/pageviews?limit=100', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch page views')
      const data = await res.json()
      setPageViews(data.data?.pageViews || [])
      setPageViewTotal(data.data?.total || 0)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/live?minutes=60', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch live data')
      const data = await res.json()
      setLivePageViews(data.data?.pageViews || [])
      setLiveVisitors(data.data?.visitors || [])
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    await Promise.all([fetchStats(), fetchUsers(), fetchVisitors(), fetchPageViews(), fetchLive()])
    setLoading(false)
  }, [fetchStats, fetchUsers, fetchVisitors, fetchPageViews, fetchLive])

  useEffect(() => {
    if (state.user?.role === 'admin' || state.user?.role === 'moderator') {
      fetchAll()
    }
  }, [state.user?.role, fetchAll])

  // Auto-refresh live tab — SSE handles it now, keep polling as fallback only if SSE disconnects
  useEffect(() => {
    if (activeTab === 'live' && !isConnected) {
      const interval = setInterval(fetchLive, 15000)
      return () => clearInterval(interval)
    }
  }, [activeTab, fetchLive, isConnected])

  const timeAgo = (ts: string) => {
    const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (seconds < 60) return seconds <= 0 ? 'Just now' : `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const DeviceIcon = ({ device }: { device: string }) => {
    if (device === 'mobile') return <Smartphone className="w-4 h-4 text-blue-400" />
    if (device === 'tablet') return <Tablet className="w-4 h-4 text-purple-400" />
    return <Monitor className="w-4 h-4 text-green-400" />
  }

  if (state.isLoading || !state.isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-white text-xl">Loading...</div>
    </div>
  }

  if (state.user?.role !== 'admin' && state.user?.role !== 'moderator') {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight"><span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Access Denied</span></h1>
        <p className="text-gray-400 mb-6">You need admin privileges to view this page.</p>
        <Link href="/dashboard" className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition">
          Back to Dashboard
        </Link>
      </div>
    </div>
  }

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'live', label: 'Live Activity', icon: Wifi },
    { id: 'visitors', label: 'Visitors', icon: Eye },
    { id: 'pageviews', label: 'Page Views', icon: MousePointerClick },
    { id: 'users', label: 'Users', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(245, 158, 11, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.05) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Platform Analytics</h1>
                <p className="text-sm text-gray-400">Real-time visitor tracking, page views & user activity</p>
              </div>
            </div>
          </div>
          <button onClick={fetchAll} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 rounded-lg transition">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${isConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : sseStatus === 'connecting' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-white/5 text-gray-400 border border-white/[0.06]'}`}>
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : sseStatus === 'connecting' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isConnected ? 'Live SSE' : sseStatus === 'connecting' ? 'Connecting...' : 'Polling'}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-green-500/20"><Wifi className="w-4 h-4 text-green-400" /></div>
                <span className="text-xs text-gray-400">Online Now</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.visitors.now}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.visitors.today} today</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20"><Eye className="w-4 h-4 text-blue-400" /></div>
                <span className="text-xs text-gray-400">Total Visitors</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.visitors.total.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">All time unique</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-purple-500/20"><MousePointerClick className="w-4 h-4 text-purple-400" /></div>
                <span className="text-xs text-gray-400">Page Views</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.pageViews.total.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.pageViews.today} today</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20"><Users className="w-4 h-4 text-amber-400" /></div>
                <span className="text-xs text-gray-400">Registered Users</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.users.total.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.users.active} active (7d)</p>
            </div>
          </div>
        )}

        {/* Sub-stats row */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-lg font-bold text-green-400">{stats.events.signups}</p>
              <p className="text-xs text-gray-400">Signups</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-lg font-bold text-cyan-400">{stats.events.logins}</p>
              <p className="text-xs text-gray-400">Logins</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-lg font-bold text-purple-400">{stats.events.total}</p>
              <p className="text-xs text-gray-400">Total Events</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 border border-white/10 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Top Pages - from recent pageviews */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-amber-500/20 overflow-hidden">
              <div className="p-5 border-b border-gray-700/50">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Globe className="w-5 h-5 text-amber-400" /> Top Pages (Recent)</h3>
              </div>
              <div className="divide-y divide-gray-800/50">
                {(() => {
                  const pageCounts: Record<string, number> = {}
                  pageViews.forEach(pv => {
                    pageCounts[pv.url] = (pageCounts[pv.url] || 0) + 1
                  })
                  const sorted = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
                  return sorted.length > 0 ? sorted.map(([url, count]) => (
                    <div key={url} className="px-5 py-3 flex items-center justify-between hover:bg-white/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-300 truncate">{url}</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-400 ml-4">{count}</span>
                    </div>
                  )) : (
                    <div className="px-5 py-8 text-center text-gray-500 text-sm">No page view data yet. Tracking starts when visitors browse the site.</div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* LIVE ACTIVITY TAB */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm text-gray-400">Live — {isConnected ? 'SSE streaming every 3s' : 'last 60 minutes | Auto-refreshes every 15s'}</span>
            </div>

            {/* Live Visitors */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-green-500/20 overflow-hidden">
              <div className="p-5 border-b border-gray-700/50">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-green-400" /> Active Visitors ({liveVisitors.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-800/50 max-h-[400px] overflow-y-auto">
                {liveVisitors.length > 0 ? liveVisitors.map((v: any, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <DeviceIcon device={v.device} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-white">{v.ipAddress}</span>
                          {v.isRegistered && <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400">User</span>}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{v.browser} | {v.os}</span>
                          {v.country !== 'Unknown' && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.country}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{timeAgo(v.lastVisit)}</p>
                      <p className="text-xs text-gray-500">{v.visitCount} visits</p>
                    </div>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center text-gray-500 text-sm">No active visitors in the last hour</div>
                )}
              </div>
            </div>

            {/* Live Page Views */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-purple-500/20 overflow-hidden">
              <div className="p-5 border-b border-gray-700/50">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MousePointerClick className="w-5 h-5 text-purple-400" /> Recent Page Views ({livePageViews.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-800/50 max-h-[400px] overflow-y-auto">
                {livePageViews.length > 0 ? livePageViews.map((pv: any, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-200 truncate">{pv.url}</p>
                        <p className="text-xs text-gray-500 truncate">{pv.title || 'Untitled'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 ml-3 whitespace-nowrap">{timeAgo(pv.timestamp)}</span>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center text-gray-500 text-sm">No page views in the last hour</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VISITORS TAB */}
        {activeTab === 'visitors' && (
          <div className="rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-amber-500/20 overflow-hidden">
            <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-400" /> All Visitors ({visitorTotal})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">IP Address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Browser / OS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Landing Page</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Visits</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">First Visit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Last Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {visitors.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 text-sm">No visitor data yet</td></tr>
                  ) : visitors.map(v => (
                    <tr key={v.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-white">{v.ipAddress}</span>
                          {v.isRegistered && <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">User</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3"><DeviceIcon device={v.device} /></td>
                      <td className="px-4 py-3 text-sm text-gray-300">{v.browser} / {v.os}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {v.country !== 'Unknown' ? `${v.city}, ${v.country}` : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-[200px] truncate">{v.landingPage}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400">{v.visitCount}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(v.firstVisit).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(v.lastVisit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAGE VIEWS TAB */}
        {activeTab === 'pageviews' && (
          <div className="rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-amber-500/20 overflow-hidden">
            <div className="p-5 border-b border-gray-700/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MousePointerClick className="w-5 h-5 text-amber-400" /> Page Views ({pageViewTotal})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Page URL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Visitor IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Browser</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {pageViews.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">No page view data yet</td></tr>
                  ) : pageViews.map(pv => (
                    <tr key={pv.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="max-w-[280px]">
                          <p className="text-sm text-gray-200 truncate">{pv.url}</p>
                          {pv.title && <p className="text-xs text-gray-500 truncate">{pv.title}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-300">{pv.visitor?.ipAddress || '\u2014'}</td>
                      <td className="px-4 py-3">{pv.visitor ? <DeviceIcon device={pv.visitor.device} /> : <span className="text-gray-500">\u2014</span>}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{pv.visitor ? `${pv.visitor.browser}` : '\u2014'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {pv.visitor && pv.visitor.country !== 'Unknown' ? `${pv.visitor.country}` : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(pv.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-amber-500/20 overflow-hidden">
            <div className="p-5 border-b border-gray-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Registered Users ({users.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No users</td></tr>
                  ) : users.map(user => (
                    <tr key={user._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm text-white font-medium">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{user.name || '\u2014'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          user.role === 'moderator' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>{user.role || 'user'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{user.lastLoginAt ? timeAgo(user.lastLoginAt) : '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
