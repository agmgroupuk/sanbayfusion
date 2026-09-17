import React, { useState, useCallback } from 'react';

interface GraphNode {
    id: string;
    type: 'component' | 'function' | 'hook' | 'service' | 'route' | 'model' | 'util';
    name: string;
    file: string;
    connections: string[];
}

interface KnowledgeGraphPanelProps {
    projectId?: string;
    currentCode?: string;
    isDarkMode?: boolean;
}

const NODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    component: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    function: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    hook: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
    service: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    route: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
    model: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    util: { bg: 'bg-gray-500/10', text: 'text-canvas-muted', border: 'border-gray-500/30' },
};

export default function KnowledgeGraphPanel({ projectId, currentCode, isDarkMode = true }: KnowledgeGraphPanelProps) {
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    const analyzeCode = useCallback(async () => {
        if (!currentCode && !projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/canvas/agent-chat', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'x-canvas-source': 'standalone' },
                body: JSON.stringify({
                    message: `Analyze this code and extract a knowledge graph of all components, functions, hooks, services, routes, models, and utility functions. For each entity, provide its type, name, file, and what other entities it connects to (imports, calls, renders).

Return ONLY a JSON array like:
[{"type":"component","name":"App","file":"App.tsx","connections":["Header","Footer","useAuth"]},...]

Code to analyze:
${(currentCode || '').slice(0, 15000)}`,
                    provider: 'mistral',
                    modelId: 'mistral-large-latest',
                    conversationHistory: [],
                }),
            });
            const data = await res.json();
            const responseText = data.response || data.message || '';
            const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                const parsed: any[] = JSON.parse(jsonMatch[0]);
                setNodes(parsed.map((n: any) => ({
                    id: `${n.type}-${n.name}`,
                    type: n.type || 'util',
                    name: n.name || 'Unknown',
                    file: n.file || '',
                    connections: Array.isArray(n.connections) ? n.connections : [],
                })));
            } else {
                setError('Could not parse code structure');
            }
        } catch {
            setError('Analysis failed');
        } finally {
            setLoading(false);
        }
    }, [currentCode, projectId]);

    const border = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
    const subtext = isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep';
    const cardBg = isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-50';

    const nodeTypes = ['all', ...Object.keys(NODE_COLORS)];
    const filtered = nodes
        .filter(n => filterType === 'all' || n.type === filterType)
        .filter(n => !searchQuery || n.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const getConnectionCount = (nodeId: string) => nodes.filter(n => n.connections.some(c => c === nodeId.split('-').slice(1).join('-'))).length;

    return (
        <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card text-canvas-text' : 'bg-white text-gray-800'}`}>
            <div className={`p-4 border-b ${border}`}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">Knowledge Graph</h2>
                <button onClick={analyzeCode} disabled={loading || (!currentCode && !projectId)}
                    className="w-full py-2 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-50 mb-2">
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            Analyzing...
                        </span>
                    ) : nodes.length > 0 ? '🔄 Re-analyze Code' : '🧠 Analyze Code Structure'}
                </button>
                {nodes.length > 0 && (
                    <>
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search entities..."
                            className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${isDarkMode ? 'bg-white/[0.08] text-canvas-text placeholder-gray-500' : 'bg-gray-50 text-gray-800 placeholder-gray-400'} focus:outline-none focus:border-cyan-500/50`}
                        />
                        <div className="flex gap-1 mt-2 flex-wrap">
                            {nodeTypes.map(t => (
                                <button key={t} onClick={() => setFilterType(t)}
                                    className={`px-2 py-1 text-[10px] rounded capitalize ${filterType === t ? 'bg-cyan-500/20 text-cyan-400' : `${subtext} hover:text-cyan-400`} transition-all`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin' }}>
                {error && <div className="p-2 rounded-lg bg-primary-500/10 border border-primary-500/30 text-xs text-primary-400">{error}</div>}

                {nodes.length === 0 && !loading ? (
                    <div className={`text-center py-8 ${subtext}`}>
                        <p className="text-2xl mb-2">🧠</p>
                        <p className="text-xs">Analyze your code to map relationships</p>
                        <p className="text-[10px] mt-1">Components, hooks, services & their connections</p>
                    </div>
                ) : selectedNode ? (
                    /* Detail view */
                    <div>
                        <button onClick={() => setSelectedNode(null)} className={`text-xs ${subtext} hover:text-cyan-400 mb-2`}>← All Nodes</button>
                        <div className={`p-3 rounded-lg border ${NODE_COLORS[selectedNode.type]?.border || border} ${NODE_COLORS[selectedNode.type]?.bg || cardBg}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-bold ${NODE_COLORS[selectedNode.type]?.text || 'text-canvas-muted'}`}>{selectedNode.type.toUpperCase()}</span>
                                <h3 className="text-sm font-medium">{selectedNode.name}</h3>
                            </div>
                            {selectedNode.file && <p className={`text-[10px] ${subtext} mb-2`}>📄 {selectedNode.file}</p>}
                            {selectedNode.connections.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-xs font-medium mb-1">Connections ({selectedNode.connections.length})</p>
                                    <div className="space-y-1">
                                        {selectedNode.connections.map(c => {
                                            const target = nodes.find(n => n.name === c);
                                            return (
                                                <button key={c} onClick={() => target && setSelectedNode(target)}
                                                    className={`w-full text-left px-2 py-1.5 text-xs rounded border ${border} hover:border-cyan-500/30 transition-all flex items-center gap-2`}>
                                                    <span className={target ? NODE_COLORS[target.type]?.text || '' : subtext}>→</span>
                                                    <span>{c}</span>
                                                    {target && <span className={`text-[9px] ${subtext}`}>{target.type}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="mt-2">
                                <p className={`text-[10px] ${subtext}`}>Referenced by {getConnectionCount(selectedNode.id)} other nodes</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Node list */
                    filtered.map(node => {
                        const colors = NODE_COLORS[node.type] || NODE_COLORS.util;
                        return (
                            <button key={node.id} onClick={() => setSelectedNode(node)}
                                className={`w-full text-left p-2.5 rounded-lg border ${colors.border} ${colors.bg} hover:brightness-125 transition-all`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold uppercase ${colors.text}`}>{node.type}</span>
                                    <span className="text-xs font-medium flex-1 truncate">{node.name}</span>
                                    <span className={`text-[10px] ${subtext}`}>{node.connections.length}→</span>
                                </div>
                                {node.file && <p className={`text-[9px] ${subtext} mt-0.5 truncate`}>{node.file}</p>}
                            </button>
                        );
                    })
                )}
            </div>

            {nodes.length > 0 && (
                <div className={`p-3 border-t ${border} flex justify-between`}>
                    <p className={`text-[10px] ${subtext}`}>{filtered.length} of {nodes.length} nodes</p>
                    <p className={`text-[10px] ${subtext}`}>{nodes.reduce((sum, n) => sum + n.connections.length, 0)} connections</p>
                </div>
            )}
        </div>
    );
}
