import React, { useState, useEffect, useCallback } from 'react';

interface Project {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'archived' | 'deployed';
    language: string;
    updatedAt: string;
    createdAt: string;
    appCount: number;
}

interface ProjectsPanelProps {
    currentProjectId?: string;
    onSelectProject: (projectId: string) => void;
    isDarkMode?: boolean;
}

export default function ProjectsPanel({ currentProjectId, onSelectProject, isDarkMode = true }: ProjectsPanelProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'deployed' | 'archived'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch('/api/canvas-projects', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.projects) {
                setProjects(data.projects.map((p: any) => ({
                    id: p.id,
                    name: p.name || 'Untitled Project',
                    description: p.description || '',
                    status: p.status || 'active',
                    language: p.language || 'html',
                    updatedAt: p.updatedAt,
                    createdAt: p.createdAt,
                    appCount: p._count?.apps || p.appCount || 0,
                })));
            }
        } catch { /* silent */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const createProject = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/canvas-projects', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim(), description: '', language: 'html' }),
            });
            if (res.ok) {
                setNewName('');
                fetchProjects();
            }
        } catch { /* silent */ } finally { setCreating(false); }
    };

    const deleteProject = async (id: string) => {
        try {
            await fetch(`/api/canvas-projects/${id}`, { method: 'DELETE', credentials: 'include' });
            setProjects(prev => prev.filter(p => p.id !== id));
        } catch { /* silent */ }
    };

    const filtered = projects
        .filter(p => filter === 'all' || p.status === filter)
        .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const border = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
    const subtext = isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep';
    const cardBg = isDarkMode ? 'bg-white/[0.06] hover:bg-white/[0.08]' : 'bg-gray-50 hover:bg-gray-100';

    const statusColors: Record<string, string> = {
        active: 'bg-emerald-500/20 text-emerald-400',
        deployed: 'bg-cyan-500/20 text-cyan-400',
        archived: 'bg-gray-500/20 text-canvas-muted',
    };

    return (
        <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card text-canvas-text' : 'bg-white text-gray-800'}`}>
            <div className={`p-4 border-b ${border}`}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">Projects</h2>
                <input
                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search projects..."
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${isDarkMode ? 'bg-white/[0.08] text-canvas-text placeholder-gray-500' : 'bg-gray-50 text-gray-800 placeholder-gray-400'} focus:outline-none focus:border-cyan-500/50`}
                />
                <div className="flex gap-1 mt-2">
                    {(['all', 'active', 'deployed', 'archived'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 text-[10px] rounded capitalize ${filter === f ? 'bg-cyan-500/20 text-cyan-400' : `${subtext} hover:text-cyan-400`} transition-all`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                {/* New project inline form */}
                <div className={`p-2 rounded-lg border border-dashed ${border}`}>
                    <div className="flex gap-1.5">
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="New project name..."
                            className={`flex-1 px-2 py-1.5 text-xs rounded border ${border} ${isDarkMode ? 'bg-white/[0.08] text-canvas-text' : 'bg-white text-gray-800'} focus:outline-none focus:border-cyan-500/50`}
                            onKeyDown={e => e.key === 'Enter' && createProject()}
                        />
                        <button onClick={createProject} disabled={creating || !newName.trim()} className="px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/30 transition-all disabled:opacity-50">
                            {creating ? '...' : '+'}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={`text-center py-8 ${subtext}`}>
                        <p className="text-2xl mb-2">📂</p>
                        <p className="text-xs">{searchQuery ? 'No matching projects' : 'No projects yet'}</p>
                    </div>
                ) : filtered.map(project => (
                    <button key={project.id} onClick={() => onSelectProject(project.id)}
                        className={`w-full text-left p-3 rounded-lg border ${border} ${cardBg} transition-all group ${currentProjectId === project.id ? 'ring-1 ring-cyan-500/50' : ''}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xs font-medium truncate">{project.name}</h3>
                                    <span className={`px-1.5 py-0.5 text-[9px] rounded-full ${statusColors[project.status]}`}>{project.status}</span>
                                </div>
                                {project.description && <p className={`text-[10px] ${subtext} truncate mt-0.5`}>{project.description}</p>}
                                <div className={`flex items-center gap-3 mt-1.5 text-[10px] ${subtext}`}>
                                    <span>📄 {project.appCount} apps</span>
                                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteProject(project.id); }}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-primary-500/10 rounded text-canvas-muted-deep hover:text-primary-400 transition-all text-xs">✕</button>
                        </div>
                    </button>
                ))}
            </div>

            <div className={`p-3 border-t ${border} text-center`}>
                <p className={`text-[10px] ${subtext}`}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
            </div>
        </div>
    );
}
