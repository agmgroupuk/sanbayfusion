'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Search,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Clock,
  Hash,
  ArrowUpDown,
  ExternalLink,
  User,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface Visitor {
  id: string;
  visitorId: string;
  sessionId: string;
  userId: string | null;
  ipAddress: string;
  userAgent: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  referrer: string | null;
  landingPage: string;
  visitCount: number;
  firstVisit: string;
  lastVisit: string;
  isRegistered: boolean;
  isActive: boolean;
}

interface Session {
  id: string;
  sessionId: string;
  visitorId: string;
  userId: string | null;
  startTime: string;
  lastActivity: string;
  pageViews: number;
  events: number;
  duration: number;
  isActive: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEVICE_ICON: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function VisitorsPage() {
  const [tab, setTab] = useState<'visitors' | 'sessions'>('visitors');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [visitorDetail, setVisitorDetail] = useState<any>(null);

  const fetchVisitors = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (search) params.set('search', search);
        if (deviceFilter) params.set('device', deviceFilter);
        const res = await fetch(`${API_BASE}/visitors?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) {
          setVisitors(json.data.visitors);
          setPagination(json.data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch visitors:', err);
      } finally {
        setLoading(false);
      }
    },
    [search, deviceFilter]
  );

  const fetchSessions = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (activeFilter) params.set('active', activeFilter);
        const res = await fetch(`${API_BASE}/sessions?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) {
          setSessions(json.data.sessions);
          setPagination(json.data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setLoading(false);
      }
    },
    [activeFilter]
  );

  const fetchVisitorDetail = async (visitorId: string) => {
    try {
      const res = await fetch(`${API_BASE}/visitors/${visitorId}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setVisitorDetail(json.data);
    } catch (err) {
      console.error('Failed to fetch visitor detail:', err);
    }
  };

  useEffect(() => {
    if (tab === 'visitors') fetchVisitors();
    else fetchSessions();
  }, [tab, fetchVisitors, fetchSessions]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Visitors & Sessions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track every visitor, device, IP, and session in real-time
          </p>
        </div>
        <button
          onClick={() =>
            tab === 'visitors' ? fetchVisitors() : fetchSessions()
          }
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-400 hover:text-white border border-white/[0.06] transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('visitors')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'visitors'
              ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
              : 'text-gray-400 hover:text-white bg-white/[0.03] border border-white/[0.06]'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-1.5" />
          Visitors
        </button>
        <button
          onClick={() => setTab('sessions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'sessions'
              ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
              : 'text-gray-400 hover:text-white bg-white/[0.03] border border-white/[0.06]'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1.5" />
          Sessions
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {tab === 'visitors' && (
          <>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchVisitors()}
                placeholder="Search IP, browser, OS..."
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/[0.06] rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500/50"
              />
            </div>
            <select
              value={deviceFilter}
              onChange={(e) => {
                setDeviceFilter(e.target.value);
              }}
              className="bg-white/5 border border-white/[0.06] rounded-lg text-sm text-gray-300 px-3 py-2 outline-none"
            >
              <option value="">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
          </>
        )}
        {tab === 'sessions' && (
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="bg-white/5 border border-white/[0.06] rounded-lg text-sm text-gray-300 px-3 py-2 outline-none"
          >
            <option value="">All Sessions</option>
            <option value="true">Active Only</option>
            <option value="false">Ended Only</option>
          </select>
        )}
        <div className="text-xs text-gray-500 ml-auto">
          {pagination.total.toLocaleString()} total · Page {pagination.page}/
          {pagination.totalPages || 1}
        </div>
      </div>

      {/* Visitors Table */}
      {tab === 'visitors' && (
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">Visitor</th>
                  <th className="text-left px-4 py-3 font-medium">IP</th>
                  <th className="text-left px-4 py-3 font-medium">Device</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Browser / OS
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Location</th>
                  <th className="text-left px-4 py-3 font-medium">Landing</th>
                  <th className="text-left px-4 py-3 font-medium">Visits</th>
                  <th className="text-left px-4 py-3 font-medium">Last Seen</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && visitors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : visitors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      No visitors found
                    </td>
                  </tr>
                ) : (
                  visitors.map((v) => {
                    const DevIcon = DEVICE_ICON[v.device] || Monitor;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => {
                          setSelectedVisitor(v);
                          fetchVisitorDetail(v.visitorId);
                        }}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {v.isRegistered ? (
                              <User className="w-3.5 h-3.5 text-violet-400" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-gray-500" />
                            )}
                            <span className="font-mono text-white truncate max-w-[100px]">
                              {v.visitorId.slice(0, 8)}...
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-400">
                          {v.ipAddress}
                        </td>
                        <td className="px-4 py-3">
                          <DevIcon className="w-4 h-4 text-gray-400 inline" />
                          <span className="ml-1.5 text-gray-300 capitalize">
                            {v.device}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {v.browser} / {v.os}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          <Globe className="w-3 h-3 inline mr-1 text-gray-600" />
                          {v.city}, {v.country}
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono truncate max-w-[120px]">
                          {v.landingPage}
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-center">
                          {v.visitCount}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatTimeAgo(v.lastVisit)}
                        </td>
                        <td className="px-4 py-3">
                          {v.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px]">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 text-[10px]">
                              Gone
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      {tab === 'sessions' && (
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">
                    Session ID
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Visitor</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Started</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Last Activity
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Duration</th>
                  <th className="text-left px-4 py-3 font-medium">Pages</th>
                  <th className="text-left px-4 py-3 font-medium">Events</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && sessions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      No sessions found
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-white">
                        {s.sessionId.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400">
                        {s.visitorId.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {s.userId ? (
                          <span className="text-violet-400 font-mono">
                            {s.userId.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-gray-600">Anonymous</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(s.startTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatTimeAgo(s.lastActivity)}
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono">
                        {formatDuration(s.duration)}
                      </td>
                      <td className="px-4 py-3 text-blue-400 text-center">
                        {s.pageViews}
                      </td>
                      <td className="px-4 py-3 text-purple-400 text-center">
                        {s.events}
                      </td>
                      <td className="px-4 py-3">
                        {s.isActive ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 text-[10px]">
                            Ended
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() =>
              tab === 'visitors'
                ? fetchVisitors(pagination.page - 1)
                : fetchSessions(pagination.page - 1)
            }
            disabled={pagination.page <= 1}
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 border border-white/[0.06]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() =>
              tab === 'visitors'
                ? fetchVisitors(pagination.page + 1)
                : fetchSessions(pagination.page + 1)
            }
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 border border-white/[0.06]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Visitor Detail Modal */}
      {selectedVisitor && visitorDetail && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVisitor(null)}
        >
          <div
            className="bg-[#111113] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">
                Visitor Detail
              </h3>
              <button
                onClick={() => setSelectedVisitor(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Visitor ID', selectedVisitor.visitorId],
                  ['IP Address', selectedVisitor.ipAddress],
                  ['Device', selectedVisitor.device],
                  ['Browser', selectedVisitor.browser],
                  ['OS', selectedVisitor.os],
                  [
                    'Location',
                    `${selectedVisitor.city}, ${selectedVisitor.country}`,
                  ],
                  [
                    'First Visit',
                    new Date(selectedVisitor.firstVisit).toLocaleString(),
                  ],
                  [
                    'Last Visit',
                    new Date(selectedVisitor.lastVisit).toLocaleString(),
                  ],
                  ['Total Visits', String(selectedVisitor.visitCount)],
                  ['Registered', selectedVisitor.isRegistered ? 'Yes' : 'No'],
                  ['Landing Page', selectedVisitor.landingPage],
                  ['Referrer', selectedVisitor.referrer || 'Direct'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white/[0.02] rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                    <p className="text-xs text-white font-mono truncate">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Sessions */}
              {visitorDetail.sessions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Sessions ({visitorDetail.sessions.length})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {visitorDetail.sessions.map((s: any) => (
                      <div
                        key={s.sessionId || s.id}
                        className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] rounded-lg text-xs"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-gray-600'}`}
                        />
                        <span className="text-gray-400 flex-1">
                          {new Date(s.startTime).toLocaleString()}
                        </span>
                        <span className="text-gray-500">
                          {s.pageViews} pages
                        </span>
                        <span className="text-gray-500">
                          {formatDuration(s.duration)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Views */}
              {visitorDetail.pageViews?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Recent Pages ({visitorDetail.pageViews.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {visitorDetail.pageViews
                      .slice(0, 20)
                      .map((pv: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-3 py-1.5 text-xs hover:bg-white/[0.02] rounded"
                        >
                          <span className="text-gray-600 tabular-nums">
                            {new Date(pv.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-gray-300 font-mono truncate flex-1">
                            {pv.url}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
