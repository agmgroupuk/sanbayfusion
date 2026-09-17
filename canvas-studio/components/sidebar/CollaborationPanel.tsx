import React, { useState, useEffect, useCallback } from 'react';

interface Collaborator {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'editor' | 'viewer';
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string;
}

interface ActivityEntry {
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
}

interface CollaborationPanelProps {
    projectId?: string;
    isDarkMode?: boolean;
}

export default function CollaborationPanel({ projectId, isDarkMode = true }: CollaborationPanelProps) {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [activity, setActivity] = useState<ActivityEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [tab, setTab] = useState<'team' | 'activity'>('team');

    const fetchCollaborators = useCallback(async () => {
        if (!projectId) { setLoading(false); return; }
        try {
            const [collabRes, activityRes] = await Promise.all([
                fetch(`/api/canvas-projects/${projectId}/collaborators`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`/api/canvas-projects/${projectId}/activity`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
            ]);
            if (collabRes?.collaborators) setCollaborators(collabRes.collaborators);
            if (activityRes?.activity) setActivity(activityRes.activity);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { fetchCollaborators(); }, [fetchCollaborators]);

    const inviteCollaborator = async () => {
        if (!inviteEmail.trim() || !projectId) return;
        setInviting(true);
        setInviteError(null);
        try {
            const res = await fetch(`/api/canvas-projects/${projectId}/collaborators`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
            });
            const data = await res.json();
            if (!res.ok) { setInviteError(data.error || 'Failed to invite'); return; }
            setInviteEmail('');
            fetchCollaborators();
        } catch { setInviteError('Network error'); } finally { setInviting(false); }
    };

    const removeCollaborator = async (id: string) => {
        if (!projectId) return;
        try {
            await fetch(`/api/canvas-projects/${projectId}/collaborators/${id}`, { method: 'DELETE', credentials: 'include' });
            setCollaborators(prev => prev.filter(c => c.id !== id));
        } catch { /* silent */ }
    };

    const updateRole = async (id: string, role: 'editor' | 'viewer') => {
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

    const border = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
    const subtext = isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep';
    const cardBg = isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-50';

    const roleColors: Record<string, string> = {
        owner: 'bg-amber-500/20 text-amber-400',
        editor: 'bg-cyan-500/20 text-cyan-400',
        viewer: 'bg-gray-500/20 text-canvas-muted',
    };

    const timeAgo = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };

    return (
        <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card text-canvas-text' : 'bg-white text-gray-800'}`}>
            <div className={`p-4 border-b ${border}`}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">Collaboration</h2>
                <div className="flex gap-1">
                    {(['team', 'activity'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`flex-1 px-3 py-1.5 text-xs rounded-lg capitalize ${tab === t ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : `${subtext} border ${border} hover:text-cyan-400`} transition-all`}>
                            {t === 'team' ? '👥 Team' : '📋 Activity'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin' }}>
                {!projectId ? (
                    <div className={`text-center py-8 ${subtext}`}>
                        <p className="text-2xl mb-2">📂</p>
                        <p className="text-xs">Open a project to manage collaborators</p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : tab === 'team' ? (
                    <>
                        {/* Invite form */}
                        <div className={`p-3 rounded-lg border ${border} ${cardBg}`}>
                            <h3 className="text-xs font-medium mb-2">Invite Collaborator</h3>
                            <div className="flex gap-1.5 mb-1.5">
                                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address..."
                                    className={`flex-1 px-2 py-1.5 text-xs rounded border ${border} ${isDarkMode ? 'bg-white/[0.08] text-canvas-text' : 'bg-white text-gray-800'} focus:outline-none focus:border-cyan-500/50`}
                                    onKeyDown={e => e.key === 'Enter' && inviteCollaborator()}
                                />
                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                                    className={`px-2 py-1.5 text-xs rounded border ${border} ${isDarkMode ? 'bg-white/[0.08] text-canvas-text' : 'bg-white text-gray-800'}`}>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>
                            <button onClick={inviteCollaborator} disabled={inviting || !inviteEmail.trim()}
                                className="w-full py-1.5 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/30 transition-all disabled:opacity-50">
                                {inviting ? 'Inviting...' : 'Send Invite'}
                            </button>
                            {inviteError && <p className="text-[10px] text-primary-400 mt-1">{inviteError}</p>}
                        </div>

                        {/* Collaborator list */}
                        {collaborators.length === 0 ? (
                            <div className={`text-center py-6 ${subtext}`}>
                                <p className="text-xs">No collaborators yet</p>
                            </div>
                        ) : collaborators.map(c => (
                            <div key={c.id} className={`p-3 rounded-lg border ${border} ${cardBg} group`}>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-200'}`}>
                                            {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isDarkMode ? 'border-gray-900' : 'border-white'} ${c.isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-medium truncate">{c.name}</p>
                                            <span className={`px-1.5 py-0.5 text-[9px] rounded-full ${roleColors[c.role]}`}>{c.role}</span>
                                        </div>
                                        <p className={`text-[10px] ${subtext} truncate`}>{c.email}</p>
                                    </div>
                                    {c.role !== 'owner' && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <select value={c.role} onChange={e => updateRole(c.id, e.target.value as any)}
                                                className={`text-[10px] px-1 py-0.5 rounded border ${border} ${isDarkMode ? 'bg-gray-800 text-canvas-text' : 'bg-white text-gray-700'}`}>
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                            <button onClick={() => removeCollaborator(c.id)} className="p-0.5 text-xs text-canvas-muted-deep hover:text-primary-400" title="Remove">✕</button>
                                        </div>
                                    )}
                                </div>
                                {!c.isOnline && c.lastSeen && <p className={`text-[9px] ${subtext} mt-1 ml-10`}>Last seen {timeAgo(c.lastSeen)}</p>}
                            </div>
                        ))}
                    </>
                ) : (
                    /* Activity tab */
                    activity.length === 0 ? (
                        <div className={`text-center py-8 ${subtext}`}>
                            <p className="text-xs">No recent activity</p>
                        </div>
                    ) : activity.map(a => (
                        <div key={a.id} className={`p-2.5 rounded-lg border ${border} ${cardBg}`}>
                            <div className="flex items-start gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-200'}`}>
                                    {a.user.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs"><span className="font-medium">{a.user}</span> <span className={subtext}>{a.action}</span> <span className="text-cyan-400">{a.target}</span></p>
                                    <p className={`text-[9px] ${subtext}`}>{timeAgo(a.timestamp)}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
