import React, { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Types ─── */
interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  joinedAt?: string;
  activeFile?: string;
}

interface ActivityEntry {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'build' | 'deploy' | 'file' | 'collab' | 'settings' | 'general';
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  sentAt: string;
  status: 'pending' | 'expired';
}

type Tab = 'overview' | 'team' | 'activity' | 'invites' | 'access' | 'settings';

interface CollaborationPanelProps {
  projectId?: string;
  projectName?: string;
  isDarkMode?: boolean;
  className?: string;
}

/* ─── Helpers ─── */
const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString();
};

const formatDate = (ts: string) =>
  new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  editor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  viewer: 'bg-gray-500/20 text-canvas-muted border-gray-500/30',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access — can manage team, settings, billing, and delete project',
  admin: 'Can manage team members, settings, and all project content',
  editor: 'Can edit files, run builds, deploy, and view activity',
  viewer: 'Read-only access — can view files and activity',
};

const ACTIVITY_ICONS: Record<string, string> = {
  build: '🔨', deploy: '🚀', file: '📄', collab: '👥', settings: '⚙️', general: '📋',
};

const ACTIVITY_COLORS: Record<string, string> = {
  build: 'bg-amber-500/20 text-amber-400',
  deploy: 'bg-emerald-500/20 text-emerald-400',
  file: 'bg-blue-500/20 text-blue-400',
  collab: 'bg-cyan-500/20 text-cyan-400',
  settings: 'bg-purple-500/20 text-purple-400',
  general: 'bg-gray-500/20 text-canvas-muted',
};

/* ─── Component ─── */
export default function CollaborationPanel({ projectId, projectName, isDarkMode = true, className }: CollaborationPanelProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Activity filters
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [activitySearch, setActivitySearch] = useState('');

  // Access settings
  const [shareLink, setShareLink] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [projectVisibility, setProjectVisibility] = useState<'private' | 'team' | 'public'>('private');
  const [allowComments, setAllowComments] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);

  // Settings
  const [notifyOnJoin, setNotifyOnJoin] = useState(true);
  const [notifyOnEdit, setNotifyOnEdit] = useState(false);
  const [notifyOnDeploy, setNotifyOnDeploy] = useState(true);
  const [notifyOnBuild, setNotifyOnBuild] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [conflictResolution, setConflictResolution] = useState<'last-write' | 'merge' | 'prompt'>('last-write');

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Theming ── */
  const bg = isDarkMode ? 'bg-canvas-card' : 'bg-white';
  const cardBg = isDarkMode ? 'bg-white/[0.03]' : 'bg-gray-50';
  const cardBorder = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
  const subtext = isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';
  const text = isDarkMode ? 'text-canvas-text' : 'text-gray-700';
  const textStrong = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const inputBg = isDarkMode ? 'bg-white/[0.06] border-canvas-border text-gray-200' : 'bg-white border-gray-200 text-gray-800';

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    try {
      const [collabRes, activityRes] = await Promise.all([
        fetch(`/api/canvas-projects/${projectId}/collaborators`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/canvas-projects/${projectId}/activity`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (collabRes?.collaborators) setCollaborators(collabRes.collaborators);
      if (activityRes?.activity) {
        setActivity(activityRes.activity.map((a: any) => ({
          ...a,
          type: a.id?.startsWith('build') ? 'build' : a.id?.startsWith('deploy') ? 'deploy' : a.id?.startsWith('file') ? 'file' : 'general',
        })));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll for updates every 30s
  useEffect(() => {
    if (!projectId) return;
    pollRef.current = setInterval(fetchData, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [projectId, fetchData]);

  /* ── Actions ── */
  const inviteCollaborator = async () => {
    if (!inviteEmail.trim() || !projectId) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(`/api/canvas-projects/${projectId}/collaborators`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error || 'Failed to invite'); return; }
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setPendingInvites(prev => [...prev, {
        id: `inv-${Date.now()}`,
        email: inviteEmail.trim(),
        role: inviteRole,
        sentAt: new Date().toISOString(),
        status: 'pending',
      }]);
      setInviteEmail('');
      fetchData();
      setTimeout(() => setInviteSuccess(null), 4000);
    } catch { setInviteError('Network error'); } finally { setInviting(false); }
  };

  const removeCollaborator = async (id: string, name: string) => {
    setConfirmAction({
      title: 'Remove Team Member',
      message: `Remove ${name} from this project? They will lose all access immediately.`,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await fetch(`/api/canvas-projects/${projectId}/collaborators/${id}`, { method: 'DELETE', credentials: 'include' });
          setCollaborators(prev => prev.filter(c => c.id !== id));
        } catch { /* silent */ }
      },
    });
  };

  const updateRole = async (id: string, role: 'admin' | 'editor' | 'viewer') => {
    if (!projectId) return;
    try {
      await fetch(`/api/canvas-projects/${projectId}/collaborators/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      setCollaborators(prev => prev.map(c => c.id === id ? { ...c, role } : c));
    } catch { /* silent */ }
  };

  const revokeInvite = (id: string) => {
    setPendingInvites(prev => prev.filter(i => i.id !== id));
  };

  const resendInvite = (invite: PendingInvite) => {
    setPendingInvites(prev => prev.map(i => i.id === invite.id ? { ...i, sentAt: new Date().toISOString() } : i));
  };

  const generateShareLink = () => {
    const link = `https://studio.sanbayfusion.com/project/${projectId}?share=true`;
    setShareLink(link);
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    }
  };

  /* ── Derived ── */
  const onlineCount = collaborators.filter(c => c.isOnline).length;
  const filteredActivity = activity.filter(a => {
    if (activityFilter !== 'all' && a.type !== activityFilter) return false;
    if (activitySearch) {
      const q = activitySearch.toLowerCase();
      return a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.target.toLowerCase().includes(q);
    }
    return true;
  });

  /* ── No Project ── */
  if (!projectId) {
    return (
      <div className={`h-full flex items-center justify-center ${bg} ${text}`}>
        <div className="text-center">
          <div className="text-5xl mb-4">📂</div>
          <p className={`text-sm ${subtext}`}>Open a project to manage collaboration</p>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${bg}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className={`text-xs ${subtext}`}>Loading collaboration data...</p>
        </div>
      </div>
    );
  }

  /* ── Tabs ── */
  const TABS: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'team', label: 'Team', icon: '👥', badge: collaborators.length },
    { key: 'activity', label: 'Activity', icon: '📋', badge: activity.length },
    { key: 'invites', label: 'Invites', icon: '✉️', badge: pendingInvites.length },
    { key: 'access', label: 'Access', icon: '🔒' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className={`h-full flex flex-col ${bg} ${text} ${className || ''}`}>
      {/* Tab Navigation */}
      <div className={`shrink-0 border-b ${cardBorder} px-6 pt-4 pb-0`}>
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-lg border border-b-0 transition-all whitespace-nowrap ${
                tab === t.key
                  ? `${isDarkMode ? 'bg-white/[0.06] text-cyan-400 border-canvas-border' : 'bg-white text-cyan-600 border-gray-200'}`
                  : `${subtext} border-transparent hover:text-cyan-400`
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {(t.badge ?? 0) > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-full ${
                  tab === t.key ? 'bg-cyan-500/20 text-cyan-400' : `${isDarkMode ? 'bg-white/[0.08]' : 'bg-gray-200'}`
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {tab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Team Members', value: collaborators.length, icon: '👥', color: 'cyan', sub: `${onlineCount} online now` },
                { label: 'Active Sessions', value: onlineCount, icon: '🟢', color: 'emerald', sub: onlineCount > 0 ? 'Real-time collaboration' : 'No active sessions' },
                { label: 'Pending Invites', value: pendingInvites.length, icon: '✉️', color: 'amber', sub: pendingInvites.length > 0 ? 'Awaiting response' : 'No pending invites' },
                { label: 'Recent Activity', value: activity.length, icon: '📋', color: 'purple', sub: activity.length > 0 ? `Last: ${timeAgo(activity[0]?.timestamp)}` : 'No recent events' },
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-xl border ${cardBorder} ${cardBg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <span className={`text-2xl font-bold ${isDarkMode ? `text-${s.color}-400` : `text-${s.color}-600`}`}>{s.value}</span>
                  </div>
                  <p className={`text-xs font-medium ${textStrong}`}>{s.label}</p>
                  <p className={`text-[10px] mt-0.5 ${subtext}`}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Online Members Strip */}
            {collaborators.length > 0 && (
              <div className={`p-4 rounded-xl border ${cardBorder} ${cardBg}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} mb-3`}>Team Members</h3>
                <div className="flex flex-wrap gap-3">
                  {collaborators.map(c => (
                    <div key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cardBorder} ${isDarkMode ? 'bg-white/[0.03]' : 'bg-white'}`}>
                      <div className="relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${isDarkMode ? 'bg-white/[0.08]' : 'bg-gray-200'}`}>
                          {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isDarkMode ? 'border-canvas-border' : 'border-white'} ${c.isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${textStrong}`}>{c.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 text-[9px] rounded-full border ${ROLE_COLORS[c.role]}`}>{c.role}</span>
                          {c.isOnline && c.activeFile && <span className={`text-[9px] ${subtext}`}>editing {c.activeFile}</span>}
                          {!c.isOnline && c.lastSeen && <span className={`text-[9px] ${subtext}`}>{timeAgo(c.lastSeen)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity Preview */}
            <div className={`p-4 rounded-xl border ${cardBorder} ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Recent Activity</h3>
                <button onClick={() => setTab('activity')} className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors">View All →</button>
              </div>
              {activity.length === 0 ? (
                <p className={`text-xs ${subtext} py-4 text-center`}>No recent activity</p>
              ) : (
                <div className="space-y-2">
                  {activity.slice(0, 5).map(a => (
                    <div key={a.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'} transition-colors`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.general}`}>
                        {ACTIVITY_ICONS[a.type] || '📋'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs">
                          <span className={`font-medium ${textStrong}`}>{a.user}</span>{' '}
                          <span className={subtext}>{a.action}</span>{' '}
                          <span className="text-cyan-400 truncate">{a.target}</span>
                        </p>
                      </div>
                      <span className={`text-[10px] ${subtext} shrink-0`}>{timeAgo(a.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Invite Member', icon: '➕', action: () => setTab('invites'), color: 'cyan' },
                { label: 'Share Link', icon: '🔗', action: () => { setTab('access'); generateShareLink(); }, color: 'blue' },
                { label: 'View Activity', icon: '📋', action: () => setTab('activity'), color: 'purple' },
                { label: 'Team Settings', icon: '⚙️', action: () => setTab('settings'), color: 'gray' },
              ].map((a, i) => (
                <button
                  key={i}
                  onClick={a.action}
                  className={`flex items-center gap-2 p-3 rounded-xl border ${cardBorder} ${cardBg} hover:border-${a.color}-500/30 transition-all text-left group`}
                >
                  <span className="text-lg">{a.icon}</span>
                  <span className={`text-xs font-medium ${text} group-hover:text-cyan-400 transition-colors`}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ TEAM TAB ═══════ */}
        {tab === 'team' && (
          <div className="p-6 space-y-4">
            {/* Team Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-semibold ${textStrong}`}>Team Members ({collaborators.length})</h3>
                <p className={`text-xs ${subtext} mt-0.5`}>{onlineCount} online · {collaborators.length - onlineCount} offline</p>
              </div>
              <button onClick={() => setTab('invites')} className="px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all">
                + Invite Member
              </button>
            </div>

            {/* Roles Legend */}
            <div className={`p-3 rounded-xl border ${cardBorder} ${cardBg}`}>
              <p className={`text-[10px] uppercase tracking-wider ${subtext} mb-2`}>Role Permissions</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
                  <div key={role} className={`px-2.5 py-2 rounded-lg border ${cardBorder}`}>
                    <span className={`inline-block px-1.5 py-0.5 text-[9px] rounded-full border ${ROLE_COLORS[role]} mb-1`}>{role}</span>
                    <p className={`text-[10px] ${subtext} leading-relaxed`}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              {collaborators.length === 0 ? (
                <div className={`text-center py-12 ${subtext}`}>
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-sm mb-1">No team members yet</p>
                  <p className="text-xs">Invite collaborators to start working together</p>
                </div>
              ) : collaborators.map(c => (
                <div key={c.id} className={`flex items-center gap-4 p-4 rounded-xl border ${cardBorder} ${cardBg} group transition-all hover:border-cyan-500/20`}>
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${isDarkMode ? 'bg-white/[0.08]' : 'bg-gray-200'}`}>
                      {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${isDarkMode ? 'border-canvas-border' : 'border-white'} ${c.isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${textStrong}`}>{c.name}</p>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full border ${ROLE_COLORS[c.role]}`}>{c.role}</span>
                      {c.isOnline && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Online
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${subtext} mt-0.5`}>{c.email}</p>
                    <div className={`flex items-center gap-3 mt-1 text-[10px] ${subtext}`}>
                      {c.joinedAt && <span>Joined {timeAgo(c.joinedAt)}</span>}
                      {!c.isOnline && c.lastSeen && <span>Last seen {timeAgo(c.lastSeen)}</span>}
                      {c.isOnline && c.activeFile && <span className="text-cyan-400">Editing {c.activeFile}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  {c.role !== 'owner' && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <select
                        value={c.role}
                        onChange={e => updateRole(c.id, e.target.value as any)}
                        className={`text-xs px-2 py-1.5 rounded-lg border ${cardBorder} ${inputBg} cursor-pointer`}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => removeCollaborator(c.id, c.name)}
                        className="p-1.5 text-xs text-canvas-muted-deep hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
                        title="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ ACTIVITY TAB ═══════ */}
        {tab === 'activity' && (
          <div className="p-6 space-y-4">
            {/* Activity Header & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div>
                <h3 className={`text-sm font-semibold ${textStrong}`}>Activity History</h3>
                <p className={`text-xs ${subtext} mt-0.5`}>{filteredActivity.length} events</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <svg className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={e => setActivitySearch(e.target.value)}
                    placeholder="Search activity..."
                    className={`pl-8 pr-3 py-1.5 text-xs rounded-lg border ${cardBorder} ${inputBg} w-48 focus:outline-none focus:border-cyan-500/50`}
                  />
                </div>
                <select
                  value={activityFilter}
                  onChange={e => setActivityFilter(e.target.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${cardBorder} ${inputBg} cursor-pointer`}
                >
                  <option value="all">All Types</option>
                  <option value="build">🔨 Builds</option>
                  <option value="deploy">🚀 Deploys</option>
                  <option value="file">📄 File Changes</option>
                  <option value="collab">👥 Collaboration</option>
                  <option value="settings">⚙️ Settings</option>
                </select>
              </div>
            </div>

            {/* Activity Timeline */}
            {filteredActivity.length === 0 ? (
              <div className={`text-center py-16 ${subtext}`}>
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm mb-1">No activity found</p>
                <p className="text-xs">{activitySearch || activityFilter !== 'all' ? 'Try adjusting your filters' : 'Activity will appear as changes are made'}</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline Line */}
                <div className={`absolute left-[18px] top-0 bottom-0 w-px ${isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />

                <div className="space-y-1">
                  {filteredActivity.map((a, idx) => {
                    const showDate = idx === 0 || new Date(a.timestamp).toDateString() !== new Date(filteredActivity[idx - 1].timestamp).toDateString();
                    return (
                      <React.Fragment key={a.id}>
                        {showDate && (
                          <div className="flex items-center gap-3 py-2 pl-1">
                            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] ${isDarkMode ? 'bg-white/[0.06] text-canvas-muted-deep' : 'bg-gray-200 text-canvas-muted'} z-10 relative`}>📅</div>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${subtext}`}>{new Date(a.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                          </div>
                        )}
                        <div className={`flex items-start gap-3 px-0 py-2 rounded-lg group cursor-default`}>
                          <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] shrink-0 z-10 relative ${ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.general}`}>
                            {ACTIVITY_ICONS[a.type] || '📋'}
                          </div>
                          <div className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg border ${cardBorder} ${cardBg} group-hover:border-cyan-500/20 transition-all`}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs">
                                <span className={`font-medium ${textStrong}`}>{a.user}</span>{' '}
                                <span className={subtext}>{a.action}</span>{' '}
                                <span className="text-cyan-400">{a.target}</span>
                              </p>
                              <span className={`text-[10px] ${subtext} shrink-0`}>{formatDate(a.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ INVITES TAB ═══════ */}
        {tab === 'invites' && (
          <div className="p-6 space-y-6">
            {/* Invite Form */}
            <div className={`p-5 rounded-xl border ${cardBorder} ${cardBg}`}>
              <h3 className={`text-sm font-semibold ${textStrong} mb-1`}>Invite Team Member</h3>
              <p className={`text-xs ${subtext} mb-4`}>Send an invitation to collaborate on this project</p>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className={`text-[10px] uppercase tracking-wider ${subtext} mb-1 block`}>Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => { setInviteEmail(e.target.value); setInviteError(null); }}
                    placeholder="colleague@company.com"
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${cardBorder} ${inputBg} focus:outline-none focus:border-cyan-500/50`}
                    onKeyDown={e => e.key === 'Enter' && inviteCollaborator()}
                  />
                </div>
                <div>
                  <label className={`text-[10px] uppercase tracking-wider ${subtext} mb-1 block`}>Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as any)}
                    className={`px-3 py-2 text-xs rounded-lg border ${cardBorder} ${inputBg} cursor-pointer min-w-[120px]`}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={inviteCollaborator}
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-5 py-2 text-xs bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {inviting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : 'Send Invite'}
                  </button>
                </div>
              </div>

              {inviteError && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs flex items-center gap-2">
                  <span>⚠️</span> {inviteError}
                </div>
              )}
              {inviteSuccess && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <span>✅</span> {inviteSuccess}
                </div>
              )}

              {/* Role preview */}
              <div className={`mt-4 p-3 rounded-lg border ${cardBorder} ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
                <p className={`text-[10px] ${subtext} mb-1`}>Selected role permissions:</p>
                <p className={`text-xs ${text}`}>{ROLE_DESCRIPTIONS[inviteRole]}</p>
              </div>
            </div>

            {/* Pending Invitations */}
            <div>
              <h3 className={`text-sm font-semibold ${textStrong} mb-3`}>Pending Invitations ({pendingInvites.length})</h3>
              {pendingInvites.length === 0 ? (
                <div className={`text-center py-12 rounded-xl border ${cardBorder} ${cardBg}`}>
                  <div className="text-4xl mb-3">✉️</div>
                  <p className={`text-sm ${subtext} mb-1`}>No pending invitations</p>
                  <p className={`text-xs ${subtext}`}>Invitations you send will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingInvites.map(inv => (
                    <div key={inv.id} className={`flex items-center gap-4 p-4 rounded-xl border ${cardBorder} ${cardBg}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>✉️</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${textStrong}`}>{inv.email}</p>
                        <div className={`flex items-center gap-2 mt-0.5 text-[10px] ${subtext}`}>
                          <span className={`px-1.5 py-0.5 rounded-full border ${ROLE_COLORS[inv.role]}`}>{inv.role}</span>
                          <span>Sent {timeAgo(inv.sentAt)}</span>
                          <span className={`px-1.5 py-0.5 rounded-full ${inv.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-primary-500/10 text-primary-400'}`}>{inv.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => resendInvite(inv)} className="px-2.5 py-1 text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-all">Resend</button>
                        <button onClick={() => revokeInvite(inv.id)} className="px-2.5 py-1 text-[10px] text-canvas-muted-deep hover:text-primary-400 hover:bg-primary-500/10 border border-transparent hover:border-primary-500/20 rounded-lg transition-all">Revoke</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════ ACCESS TAB ═══════ */}
        {tab === 'access' && (
          <div className="p-6 space-y-6">
            {/* Project Sharing */}
            <div className={`p-5 rounded-xl border ${cardBorder} ${cardBg}`}>
              <h3 className={`text-sm font-semibold ${textStrong} mb-1`}>Share Project</h3>
              <p className={`text-xs ${subtext} mb-4`}>Generate a share link for external access</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  placeholder="Click 'Generate' to create a share link"
                  className={`flex-1 px-3 py-2 text-xs rounded-lg border ${cardBorder} ${inputBg} focus:outline-none`}
                />
                {!shareLink ? (
                  <button onClick={generateShareLink} className="px-4 py-2 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all">
                    Generate Link
                  </button>
                ) : (
                  <button onClick={copyShareLink} className={`px-4 py-2 text-xs rounded-lg border transition-all ${shareLinkCopied ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30'}`}>
                    {shareLinkCopied ? '✓ Copied!' : 'Copy Link'}
                  </button>
                )}
              </div>
            </div>

            {/* Visibility Settings */}
            <div className={`p-5 rounded-xl border ${cardBorder} ${cardBg}`}>
              <h3 className={`text-sm font-semibold ${textStrong} mb-1`}>Project Visibility</h3>
              <p className={`text-xs ${subtext} mb-4`}>Control who can discover and access this project</p>

              <div className="space-y-2">
                {([
                  { value: 'private', label: 'Private', desc: 'Only invited team members can access', icon: '🔒' },
                  { value: 'team', label: 'Team', desc: 'All workspace members can view, invited members can edit', icon: '👥' },
                  { value: 'public', label: 'Public', desc: 'Anyone with the link can view (read-only)', icon: '🌐' },
                ] as const).map(opt => (
                  <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${projectVisibility === opt.value ? `${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-cyan-500/50 bg-cyan-50'}` : `${cardBorder} hover:border-cyan-500/20`}`}>
                    <input
                      type="radio"
                      name="visibility"
                      value={opt.value}
                      checked={projectVisibility === opt.value}
                      onChange={() => setProjectVisibility(opt.value)}
                      className="sr-only"
                    />
                    <span className="text-xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${textStrong}`}>{opt.label}</p>
                      <p className={`text-[10px] ${subtext}`}>{opt.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${projectVisibility === opt.value ? 'border-cyan-400' : `${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}`}>
                      {projectVisibility === opt.value && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className={`p-5 rounded-xl border ${cardBorder} ${cardBg}`}>
              <h3 className={`text-sm font-semibold ${textStrong} mb-4`}>Permissions</h3>

              <div className="space-y-3">
                <ToggleRow label="Allow Comments" desc="Team members can leave comments on files" checked={allowComments} onChange={setAllowComments} isDarkMode={isDarkMode} />
                <ToggleRow label="Require Approval for Deploys" desc="Deployments require approval from an admin or owner" checked={requireApproval} onChange={setRequireApproval} isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className={`p-5 rounded-xl border ${cardBorder} ${cardBg}`}>
              <h3 className={`text-sm font-semibold ${textStrong} mb-4`}>Role Permissions Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={`border-b ${cardBorder}`}>
                      <th className={`text-left py-2 ${subtext} font-medium`}>Permission</th>
                      {['Owner', 'Admin', 'Editor', 'Viewer'].map(r => (
                        <th key={r} className={`text-center py-2 px-3 ${subtext} font-medium`}>{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { perm: 'View Files', owner: true, admin: true, editor: true, viewer: true },
                      { perm: 'Edit Files', owner: true, admin: true, editor: true, viewer: false },
                      { perm: 'Run Builds', owner: true, admin: true, editor: true, viewer: false },
                      { perm: 'Deploy', owner: true, admin: true, editor: true, viewer: false },
                      { perm: 'Manage Assets', owner: true, admin: true, editor: true, viewer: false },
                      { perm: 'Invite Members', owner: true, admin: true, editor: false, viewer: false },
                      { perm: 'Remove Members', owner: true, admin: true, editor: false, viewer: false },
                      { perm: 'Change Roles', owner: true, admin: true, editor: false, viewer: false },
                      { perm: 'Project Settings', owner: true, admin: true, editor: false, viewer: false },
                      { perm: 'Billing & Usage', owner: true, admin: false, editor: false, viewer: false },
                      { perm: 'Delete Project', owner: true, admin: false, editor: false, viewer: false },
                      { perm: 'Transfer Ownership', owner: true, admin: false, editor: false, viewer: false },
                    ].map((row, i) => (
                      <tr key={i} className={`border-b ${cardBorder} last:border-0`}>
                        <td className={`py-2 ${text}`}>{row.perm}</td>
                        {[row.owner, row.admin, row.editor, row.viewer].map((v, j) => (
                          <td key={j} className="text-center py-2">
                            {v ? <span className="text-emerald-400">✓</span> : <span className={subtext}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ SETTINGS TAB ═══════ */}
        {tab === 'settings' && (
          <div className="p-6 space-y-6">
            {/* Notification Preferences */}
            <div className={`p-5 rounded-xl border ${cardBorder} ${cardBg}`}>
              <h3 className={`text-sm font-semibold ${textStrong} mb-1`}>Notification Preferences</h3>
              <p className={`text-xs ${subtext} mb-4`}>Choose which events trigger notifications</p>

              <div className="space-y-3">
                <ToggleRow label="Member Joins/Leaves" desc="Get notified when team members join or leave" checked={notifyOnJoin} onChange={setNotifyOnJoin} isDarkMode={isDarkMode} />
                <ToggleRow label="File Edits" desc="Get notified when collaborators edit files" checked={notifyOnEdit} onChange={setNotifyOnEdit} isDarkMode={isDarkMode} />
                <ToggleRow label="Deployments" desc="Get notified when deployments are triggered" checked={notifyOnDeploy} onChange={setNotifyOnDeploy} isDarkMode={isDarkMode} />
                <ToggleRow label="Build Completions" desc="Get notified when builds complete or fail" checked={notifyOnBuild} onChange={setNotifyOnBuild} isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* Collaboration Rules */}
            <div className={`p-5 rounded-xl border ${cardBorder} ${cardBg}`}>
              <h3 className={`text-sm font-semibold ${textStrong} mb-1`}>Collaboration Rules</h3>
              <p className={`text-xs ${subtext} mb-4`}>Configure how collaboration works for this project</p>

              <div className="space-y-4">
                <ToggleRow label="Auto-save Changes" desc="Automatically save changes from all collaborators in real-time" checked={autoSave} onChange={setAutoSave} isDarkMode={isDarkMode} />

                <div>
                  <label className={`text-xs font-medium ${textStrong} block mb-1`}>Conflict Resolution</label>
                  <p className={`text-[10px] ${subtext} mb-2`}>How to handle conflicting edits from multiple users</p>
                  <div className="space-y-2">
                    {([
                      { value: 'last-write', label: 'Last Write Wins', desc: 'Most recent save takes priority' },
                      { value: 'merge', label: 'Auto Merge', desc: 'Attempt to merge changes automatically' },
                      { value: 'prompt', label: 'Prompt User', desc: 'Ask the user to resolve conflicts manually' },
                    ] as const).map(opt => (
                      <label key={opt.value} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${conflictResolution === opt.value ? `${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-cyan-500/50 bg-cyan-50'}` : `${cardBorder} hover:border-cyan-500/20`}`}>
                        <input type="radio" name="conflict" value={opt.value} checked={conflictResolution === opt.value} onChange={() => setConflictResolution(opt.value)} className="sr-only" />
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${textStrong}`}>{opt.label}</p>
                          <p className={`text-[10px] ${subtext}`}>{opt.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${conflictResolution === opt.value ? 'border-cyan-400' : `${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}`}>
                          {conflictResolution === opt.value && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="p-5 rounded-xl border border-primary-500/20 bg-primary-500/5">
              <h3 className="text-sm font-semibold text-primary-400 mb-1">Danger Zone</h3>
              <p className={`text-xs ${subtext} mb-4`}>Irreversible actions that affect all collaborators</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${textStrong}`}>Remove All Collaborators</p>
                    <p className={`text-[10px] ${subtext}`}>Revoke access for everyone except the owner</p>
                  </div>
                  <button
                    onClick={() => setConfirmAction({
                      title: 'Remove All Collaborators',
                      message: 'This will remove all team members from this project. They will lose access immediately. This cannot be undone.',
                      onConfirm: () => {
                        setCollaborators(prev => prev.filter(c => c.role === 'owner'));
                        setPendingInvites([]);
                        setConfirmAction(null);
                      },
                    })}
                    className="px-3 py-1.5 text-xs text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/10 transition-all"
                  >
                    Remove All
                  </button>
                </div>
                <div className={`border-t ${isDarkMode ? 'border-primary-500/10' : 'border-red-200'}`} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${textStrong}`}>Disable Collaboration</p>
                    <p className={`text-[10px] ${subtext}`}>Make this a solo project and remove all team features</p>
                  </div>
                  <button
                    onClick={() => setConfirmAction({
                      title: 'Disable Collaboration',
                      message: 'This will disable all collaboration features for this project. All team members will lose access. You can re-enable later.',
                      onConfirm: () => {
                        setCollaborators(prev => prev.filter(c => c.role === 'owner'));
                        setPendingInvites([]);
                        setProjectVisibility('private');
                        setConfirmAction(null);
                      },
                    })}
                    className="px-3 py-1.5 text-xs text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/10 transition-all"
                  >
                    Disable
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog Overlay */}
      {confirmAction && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`max-w-sm w-full mx-4 p-5 rounded-xl border ${cardBorder} ${isDarkMode ? 'bg-canvas-card' : 'bg-white'} shadow-2xl`}>
            <h3 className={`text-sm font-semibold ${textStrong} mb-2`}>{confirmAction.title}</h3>
            <p className={`text-xs ${subtext} mb-4 leading-relaxed`}>{confirmAction.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className={`px-4 py-1.5 text-xs rounded-lg border ${cardBorder} ${text} hover:text-cyan-400 transition-colors`}>Cancel</button>
              <button onClick={confirmAction.onConfirm} className="px-4 py-1.5 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Toggle Row Component ── */
function ToggleRow({ label, desc, checked, onChange, isDarkMode }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; isDarkMode?: boolean }) {
  const textStrong = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const subtext = isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className={`text-xs font-medium ${textStrong}`}>{label}</p>
        <p className={`text-[10px] ${subtext}`}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-cyan-500' : `${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
