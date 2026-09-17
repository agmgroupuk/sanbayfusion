import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  file: string;
  connections: string[];
  code?: string;
  lineCount?: number;
  complexity?: number;
  description?: string;
  // Computed at runtime
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'imports' | 'calls' | 'renders' | 'extends' | 'implements' | 'uses';
}

type NodeType = 'component' | 'function' | 'hook' | 'service' | 'route' | 'model' | 'util' | 'context' | 'store' | 'type' | 'config';
type Tab = 'graph' | 'explorer' | 'dependencies' | 'metrics' | 'insights';
type LayoutMode = 'force' | 'radial' | 'hierarchical';
type AnalysisScope = 'current' | 'project';

interface FileInfo {
  path: string;
  content: string;
}

interface KnowledgeGraphPanelProps {
  currentCode?: string;
  projectFiles?: FileInfo[];
  isDarkMode?: boolean;
  className?: string;
}

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */
const NODE_COLORS: Record<string, { bg: string; text: string; border: string; fill: string; glow: string }> = {
  component:  { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/30',    fill: '#22d3ee', glow: 'rgba(34,211,238,0.3)' },
  function:   { bg: 'bg-emerald-500/10',  text: 'text-emerald-400',  border: 'border-emerald-500/30',  fill: '#34d399', glow: 'rgba(52,211,153,0.3)' },
  hook:       { bg: 'bg-violet-500/10',   text: 'text-violet-400',   border: 'border-violet-500/30',   fill: '#a78bfa', glow: 'rgba(167,139,250,0.3)' },
  service:    { bg: 'bg-amber-500/10',    text: 'text-amber-400',    border: 'border-amber-500/30',    fill: '#fbbf24', glow: 'rgba(251,191,36,0.3)'  },
  route:      { bg: 'bg-pink-500/10',     text: 'text-pink-400',     border: 'border-pink-500/30',     fill: '#f472b6', glow: 'rgba(244,114,182,0.3)' },
  model:      { bg: 'bg-blue-500/10',     text: 'text-blue-400',     border: 'border-blue-500/30',     fill: '#60a5fa', glow: 'rgba(96,165,250,0.3)'  },
  util:       { bg: 'bg-gray-500/10',     text: 'text-canvas-muted',     border: 'border-gray-500/30',     fill: '#9ca3af', glow: 'rgba(156,163,175,0.3)' },
  context:    { bg: 'bg-orange-500/10',   text: 'text-orange-400',   border: 'border-orange-500/30',   fill: '#fb923c', glow: 'rgba(251,146,60,0.3)'  },
  store:      { bg: 'bg-primary-500/10',     text: 'text-primary-400',     border: 'border-primary-500/30',     fill: '#fb7185', glow: 'rgba(251,113,133,0.3)' },
  type:       { bg: 'bg-indigo-500/10',   text: 'text-indigo-400',   border: 'border-indigo-500/30',   fill: '#818cf8', glow: 'rgba(129,140,248,0.3)' },
  config:     { bg: 'bg-teal-500/10',     text: 'text-teal-400',     border: 'border-teal-500/30',     fill: '#2dd4bf', glow: 'rgba(45,212,191,0.3)'  },
};

const NODE_ICONS: Record<string, string> = {
  component: '⚛️', function: 'ƒ', hook: '🪝', service: '⚙️', route: '🛤️',
  model: '📊', util: '🔧', context: '🔄', store: '🗄️', type: '📐', config: '⚡',
};

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */
export default function KnowledgeGraphPanel({
  currentCode, projectFiles, isDarkMode = true, className,
}: KnowledgeGraphPanelProps) {
  const [tab, setTab] = useState<Tab>('graph');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force');
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>('current');
  const [showLegend, setShowLegend] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [graphZoom, setGraphZoom] = useState(1);
  const [graphOffset, setGraphOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragNode = useRef<string | null>(null);

  /* ── Theme ── */
  const bg = isDarkMode ? 'bg-canvas-card' : 'bg-white';
  const cardBg = isDarkMode ? 'bg-white/[0.03]' : 'bg-gray-50';
  const cardBorder = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
  const subtext = isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';
  const text = isDarkMode ? 'text-canvas-text' : 'text-gray-700';
  const textStrong = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const inputBg = isDarkMode ? 'bg-white/[0.06] border-canvas-border text-gray-200 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400';

  /* ═══════════════════════════════════════════════════════════════
     Analysis Engine
     ═══════════════════════════════════════════════════════════════ */
  const analyzeCode = useCallback(async () => {
    const codeToAnalyze = analysisScope === 'project' && projectFiles?.length
      ? projectFiles.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n').slice(0, 30000)
      : (currentCode || '').slice(0, 20000);

    if (!codeToAnalyze) return;
    setLoading(true);
    setError(null);
    setProgress('Sending code for analysis...');

    try {
      const res = await fetch('/api/canvas/agent-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-canvas-source': 'standalone' },
        body: JSON.stringify({
          message: `You are an expert code architecture analyzer. Analyze the following code and extract a complete knowledge graph.

For each entity found, return:
- type: one of "component", "function", "hook", "service", "route", "model", "util", "context", "store", "type", "config"
- name: the entity name
- file: the file path it belongs to
- connections: array of other entity names it connects to (imports, calls, renders, extends)
- lineCount: approximate number of lines
- complexity: 1-10 rating of complexity
- description: one-sentence description of what it does

Also extract edges with relationship types. Return a JSON object like:
{
  "nodes": [{"type":"component","name":"App","file":"App.tsx","connections":["Header","useAuth"],"lineCount":150,"complexity":7,"description":"Main application component"}],
  "edges": [{"source":"App","target":"Header","type":"renders"},{"source":"App","target":"useAuth","type":"uses"}]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation.

Code to analyze:
${codeToAnalyze}`,
          provider: 'mistral',
          modelId: 'mistral-large-latest',
          conversationHistory: [],
        }),
      });
      setProgress('Parsing analysis results...');
      const data = await res.json();
      const responseText = data.response || data.message || '';

      // Try to parse JSON object first, then array
      let parsed: any = null;
      const objMatch = responseText.match(/\{[\s\S]*"nodes"[\s\S]*\}/);
      if (objMatch) {
        try { parsed = JSON.parse(objMatch[0]); } catch { /* */ }
      }
      if (!parsed) {
        const arrMatch = responseText.match(/\[[\s\S]*?\]/);
        if (arrMatch) {
          try { parsed = { nodes: JSON.parse(arrMatch[0]), edges: [] }; } catch { /* */ }
        }
      }

      if (parsed?.nodes) {
        const newNodes: GraphNode[] = parsed.nodes.map((n: any, i: number) => ({
          id: `${n.type || 'util'}-${n.name || `node${i}`}`,
          type: n.type || 'util',
          name: n.name || 'Unknown',
          file: n.file || '',
          connections: Array.isArray(n.connections) ? n.connections : [],
          lineCount: n.lineCount || 0,
          complexity: n.complexity || 1,
          description: n.description || '',
        }));

        const newEdges: GraphEdge[] = (parsed.edges || []).map((e: any) => ({
          source: e.source,
          target: e.target,
          type: e.type || 'uses',
        }));

        // If no explicit edges, infer from connections
        if (newEdges.length === 0) {
          newNodes.forEach(node => {
            node.connections.forEach(conn => {
              newEdges.push({ source: node.name, target: conn, type: 'uses' });
            });
          });
        }

        setNodes(newNodes);
        setEdges(newEdges);
        layoutNodes(newNodes, layoutMode);
        setProgress('');
      } else {
        setError('Could not parse analysis results. Try again.');
      }
    } catch {
      setError('Analysis failed. Check your connection and try again.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, [currentCode, projectFiles, analysisScope, layoutMode]);

  /* ═══════════════════════════════════════════════════════════════
     Layout Engine
     ═══════════════════════════════════════════════════════════════ */
  const layoutNodes = useCallback((nodeList: GraphNode[], mode: LayoutMode) => {
    const w = 900, h = 600;
    const cx = w / 2, cy = h / 2;
    const count = nodeList.length || 1;

    if (mode === 'radial') {
      const radius = Math.min(w, h) * 0.35;
      nodeList.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2;
        n.x = cx + radius * Math.cos(angle);
        n.y = cy + radius * Math.sin(angle);
      });
    } else if (mode === 'hierarchical') {
      // Group by type, stack vertically
      const groups: Record<string, GraphNode[]> = {};
      nodeList.forEach(n => {
        (groups[n.type] ||= []).push(n);
      });
      const typeKeys = Object.keys(groups);
      const rowH = h / (typeKeys.length + 1);
      typeKeys.forEach((type, ri) => {
        const row = groups[type];
        const colW = w / (row.length + 1);
        row.forEach((n, ci) => {
          n.x = colW * (ci + 1);
          n.y = rowH * (ri + 1);
        });
      });
    } else {
      // Force-directed: initial random placement, then iterate
      nodeList.forEach(n => {
        n.x = cx + (Math.random() - 0.5) * w * 0.6;
        n.y = cy + (Math.random() - 0.5) * h * 0.6;
        n.vx = 0;
        n.vy = 0;
      });
      // Run ~80 iterations of simple force simulation
      const nameMap = new Map(nodeList.map(n => [n.name, n]));
      for (let iter = 0; iter < 80; iter++) {
        const alpha = 0.3 * (1 - iter / 80);
        // Repulsion between all nodes
        for (let i = 0; i < count; i++) {
          for (let j = i + 1; j < count; j++) {
            const a = nodeList[i], b = nodeList[j];
            let dx = (b.x || 0) - (a.x || 0);
            let dy = (b.y || 0) - (a.y || 0);
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 800 / (dist * dist);
            const fx = (dx / dist) * force * alpha;
            const fy = (dy / dist) * force * alpha;
            a.x = (a.x || 0) - fx;
            a.y = (a.y || 0) - fy;
            b.x = (b.x || 0) + fx;
            b.y = (b.y || 0) + fy;
          }
        }
        // Attraction along edges
        nodeList.forEach(n => {
          n.connections.forEach(cName => {
            const target = nameMap.get(cName);
            if (!target) return;
            let dx = (target.x || 0) - (n.x || 0);
            let dy = (target.y || 0) - (n.y || 0);
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = dist * 0.005 * alpha;
            n.x = (n.x || 0) + dx * force;
            n.y = (n.y || 0) + dy * force;
            target.x = (target.x || 0) - dx * force;
            target.y = (target.y || 0) - dy * force;
          });
        });
        // Center gravity
        nodeList.forEach(n => {
          n.x = (n.x || 0) + (cx - (n.x || 0)) * 0.01;
          n.y = (n.y || 0) + (cy - (n.y || 0)) * 0.01;
        });
      }
      // Clamp within bounds
      nodeList.forEach(n => {
        n.x = Math.max(40, Math.min(w - 40, n.x || cx));
        n.y = Math.max(40, Math.min(h - 40, n.y || cy));
      });
    }
    setNodes([...nodeList]);
  }, []);

  const relayout = useCallback(() => {
    if (nodes.length) layoutNodes([...nodes], layoutMode);
  }, [nodes, layoutMode, layoutNodes]);

  /* ═══════════════════════════════════════════════════════════════
     Graph Interaction (pan / zoom / drag)
     ═══════════════════════════════════════════════════════════════ */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setGraphZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (dragNode.current) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - graphOffset.x, y: e.clientY - graphOffset.y };
  }, [graphOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragNode.current) {
      // Move the node
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const svgX = (e.clientX - svgRect.left - graphOffset.x) / graphZoom;
      const svgY = (e.clientY - svgRect.top - graphOffset.y) / graphZoom;
      setNodes(prev => prev.map(n => n.id === dragNode.current ? { ...n, x: svgX, y: svgY } : n));
      return;
    }
    if (!isDragging.current) return;
    setGraphOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [graphOffset, graphZoom]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    dragNode.current = null;
  }, []);

  /* ═══════════════════════════════════════════════════════════════
     Filtered + Computed Data
     ═══════════════════════════════════════════════════════════════ */
  const filteredNodes = useMemo(() => {
    let list = nodes;
    if (filterType !== 'all') list = list.filter(n => n.type === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.name.toLowerCase().includes(q) || n.file.toLowerCase().includes(q));
    }
    return list;
  }, [nodes, filterType, searchQuery]);

  const filteredEdges = useMemo(() => {
    const nodeNames = new Set(filteredNodes.map(n => n.name));
    return edges.filter(e => nodeNames.has(e.source) && nodeNames.has(e.target));
  }, [edges, filteredNodes]);

  const nameMap = useMemo(() => new Map(nodes.map(n => [n.name, n])), [nodes]);

  const stats = useMemo(() => {
    const typeCount: Record<string, number> = {};
    nodes.forEach(n => { typeCount[n.type] = (typeCount[n.type] || 0) + 1; });
    const totalConnections = edges.length;
    const avgComplexity = nodes.length ? (nodes.reduce((s, n) => s + (n.complexity || 0), 0) / nodes.length).toFixed(1) : '0';
    const totalLines = nodes.reduce((s, n) => s + (n.lineCount || 0), 0);
    const mostConnected = [...nodes].sort((a, b) => b.connections.length - a.connections.length).slice(0, 5);
    const orphans = nodes.filter(n => n.connections.length === 0 && !edges.some(e => e.target === n.name));
    const files = [...new Set(nodes.map(n => n.file).filter(Boolean))];
    return { typeCount, totalConnections, avgComplexity, totalLines, mostConnected, orphans, files };
  }, [nodes, edges]);

  const incomingCount = useCallback((name: string) => edges.filter(e => e.target === name).length, [edges]);
  const outgoingCount = useCallback((name: string) => edges.filter(e => e.source === name).length, [edges]);

  /* ═══════════════════════════════════════════════════════════════
     TABS
     ═══════════════════════════════════════════════════════════════ */
  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'graph', label: 'Graph View', icon: '🔗' },
    { key: 'explorer', label: 'Explorer', icon: '🗂️' },
    { key: 'dependencies', label: 'Dependencies', icon: '📦' },
    { key: 'metrics', label: 'Metrics', icon: '📊' },
    { key: 'insights', label: 'Insights', icon: '💡' },
  ];

  const allTypes = useMemo(() => {
    const types = new Set(nodes.map(n => n.type));
    return ['all', ...Array.from(types)];
  }, [nodes]);

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className={`h-full flex flex-col ${bg} ${text} ${className || ''}`}>
      {/* ── Stats Bar ── */}
      <div className="shrink-0 px-6 pt-5 pb-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'Entities', value: nodes.length, icon: '🧩', color: 'cyan' },
            { label: 'Connections', value: stats.totalConnections, icon: '🔗', color: 'emerald' },
            { label: 'Files', value: stats.files.length, icon: '📄', color: 'violet' },
            { label: 'Avg Complexity', value: stats.avgComplexity, icon: '📈', color: 'amber' },
            { label: 'Total Lines', value: stats.totalLines.toLocaleString(), icon: '📝', color: 'pink' },
            { label: 'Orphans', value: stats.orphans.length, icon: '🏝️', color: 'gray' },
          ].map((s, i) => (
            <div key={i} className={`p-3 rounded-xl border ${cardBorder} ${cardBg}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className={`text-lg font-bold ${textStrong}`}>{s.value}</p>
                  <p className={`text-[10px] ${subtext}`}>{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs & Controls ── */}
      <div className={`shrink-0 border-b ${cardBorder} px-6 pb-0`}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg border border-b-0 transition-all whitespace-nowrap ${
                  tab === t.key
                    ? `${isDarkMode ? 'bg-white/[0.06] text-purple-400 border-canvas-border' : 'bg-white text-purple-600 border-gray-200'}`
                    : `${subtext} border-transparent hover:text-purple-400`
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Scope selector */}
            <select
              value={analysisScope}
              onChange={e => setAnalysisScope(e.target.value as AnalysisScope)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border ${cardBorder} ${inputBg} cursor-pointer`}
            >
              <option value="current">📄 Current File</option>
              {projectFiles?.length ? <option value="project">📁 Full Project</option> : null}
            </select>
            <button
              onClick={analyzeCode}
              disabled={loading || (!currentCode && !projectFiles?.length)}
              className="px-3.5 py-1.5 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : nodes.length > 0 ? '🔄 Re-analyze' : '🧠 Analyze Code'}
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        {nodes.length > 0 && (
          <div className="flex items-center gap-3 pb-3">
            <div className="relative flex-1 max-w-md">
              <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search entities, files..."
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border ${cardBorder} ${inputBg} focus:outline-none focus:border-purple-500/50`}
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {allTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 text-[10px] rounded-lg border capitalize transition-all ${
                    filterType === t
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      : `${subtext} ${cardBorder} hover:text-purple-400`
                  }`}
                >
                  {t !== 'all' && <span className="mr-1">{NODE_ICONS[t] || '•'}</span>}
                  {t} {t !== 'all' ? `(${stats.typeCount[t] || 0})` : `(${nodes.length})`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className={`text-sm ${textStrong} mb-1`}>Analyzing Code Architecture</p>
                <p className={`text-xs ${subtext}`}>{progress || 'Extracting entities and relationships...'}</p>
              </div>
            </div>
          ) : nodes.length === 0 ? (
            <EmptyState
              isDarkMode={isDarkMode}
              hasCode={!!(currentCode || projectFiles?.length)}
              onAnalyze={analyzeCode}
              textStrong={textStrong}
              subtext={subtext}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          ) : tab === 'graph' ? (
            <GraphView
              nodes={filteredNodes}
              edges={filteredEdges}
              nameMap={nameMap}
              selectedNode={selectedNode}
              hoveredNode={hoveredNode}
              isDarkMode={isDarkMode}
              showLabels={showLabels}
              graphZoom={graphZoom}
              graphOffset={graphOffset}
              layoutMode={layoutMode}
              svgRef={svgRef}
              containerRef={containerRef}
              onSelectNode={setSelectedNode}
              onHoverNode={setHoveredNode}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDragNodeStart={(id) => { dragNode.current = id; }}
              onZoomIn={() => setGraphZoom(z => Math.min(3, z + 0.2))}
              onZoomOut={() => setGraphZoom(z => Math.max(0.3, z - 0.2))}
              onResetView={() => { setGraphZoom(1); setGraphOffset({ x: 0, y: 0 }); }}
              onToggleLabels={() => setShowLabels(v => !v)}
              onToggleLegend={() => setShowLegend(v => !v)}
              onLayoutChange={(m) => { setLayoutMode(m); if (nodes.length) layoutNodes([...nodes], m); }}
              showLegend={showLegend}
              subtext={subtext}
              textStrong={textStrong}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          ) : tab === 'explorer' ? (
            <ExplorerView
              nodes={filteredNodes}
              edges={edges}
              nameMap={nameMap}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              isDarkMode={isDarkMode}
              subtext={subtext}
              textStrong={textStrong}
              cardBg={cardBg}
              cardBorder={cardBorder}
              incomingCount={incomingCount}
              outgoingCount={outgoingCount}
            />
          ) : tab === 'dependencies' ? (
            <DependencyView
              nodes={nodes}
              edges={edges}
              nameMap={nameMap}
              isDarkMode={isDarkMode}
              subtext={subtext}
              textStrong={textStrong}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          ) : tab === 'metrics' ? (
            <MetricsView
              nodes={nodes}
              edges={edges}
              stats={stats}
              isDarkMode={isDarkMode}
              subtext={subtext}
              textStrong={textStrong}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          ) : (
            <InsightsView
              nodes={nodes}
              edges={edges}
              stats={stats}
              isDarkMode={isDarkMode}
              subtext={subtext}
              textStrong={textStrong}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          )}
        </div>

        {/* ── Side Inspector ── */}
        {selectedNode && (
          <div className={`w-80 shrink-0 border-l ${cardBorder} flex flex-col overflow-hidden`}>
            <NodeInspector
              node={selectedNode}
              nodes={nodes}
              edges={edges}
              nameMap={nameMap}
              isDarkMode={isDarkMode}
              subtext={subtext}
              textStrong={textStrong}
              cardBg={cardBg}
              cardBorder={cardBorder}
              incomingCount={incomingCount}
              outgoingCount={outgoingCount}
              onClose={() => setSelectedNode(null)}
              onSelectNode={setSelectedNode}
            />
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className={`shrink-0 px-6 py-2.5 border-t ${cardBorder} flex items-center justify-between`}>
        <p className={`text-[10px] ${subtext}`}>
          {filteredNodes.length} of {nodes.length} entities · {filteredEdges.length} connections · {stats.files.length} files
        </p>
        {error && <p className="text-[10px] text-primary-400">{error}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════════════════════ */
function EmptyState({ isDarkMode, hasCode, onAnalyze, textStrong, subtext, cardBg, cardBorder }: any) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-lg">
        <div className="text-6xl mb-4">🧠</div>
        <h3 className={`text-lg font-semibold ${textStrong} mb-2`}>Knowledge Graph</h3>
        <p className={`text-sm ${subtext} mb-6 leading-relaxed`}>
          Analyze your code to discover components, functions, hooks, services, and their relationships.
          Visualize the architecture as an interactive graph.
        </p>
        <div className={`grid grid-cols-3 gap-3 mb-6`}>
          {[
            { icon: '⚛️', title: 'Components', desc: 'React components & their hierarchy' },
            { icon: '🪝', title: 'Hooks & Services', desc: 'Custom hooks, services, utilities' },
            { icon: '🔗', title: 'Relationships', desc: 'Imports, calls, renders, extends' },
          ].map((f, i) => (
            <div key={i} className={`p-4 rounded-xl border ${cardBorder} ${cardBg}`}>
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className={`text-xs font-medium ${textStrong} mb-0.5`}>{f.title}</p>
              <p className={`text-[10px] ${subtext}`}>{f.desc}</p>
            </div>
          ))}
        </div>
        {hasCode ? (
          <button onClick={onAnalyze} className="px-6 py-2.5 text-sm bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 transition-all">
            🧠 Analyze Code Structure
          </button>
        ) : (
          <p className={`text-xs ${subtext}`}>Open or create a project to analyze its architecture</p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Graph View (SVG-based interactive visualization)
   ═══════════════════════════════════════════════════════════════ */
function GraphView({
  nodes, edges, nameMap, selectedNode, hoveredNode, isDarkMode, showLabels, graphZoom, graphOffset,
  layoutMode, svgRef, containerRef, onSelectNode, onHoverNode, onWheel, onMouseDown, onMouseMove,
  onMouseUp, onDragNodeStart, onZoomIn, onZoomOut, onResetView, onToggleLabels, onToggleLegend,
  onLayoutChange, showLegend, subtext, textStrong, cardBg, cardBorder,
}: any) {
  const highlightedNames = useMemo(() => {
    if (!hoveredNode && !selectedNode) return new Set<string>();
    const active = hoveredNode || selectedNode?.id;
    const node = nodes.find((n: GraphNode) => n.id === active);
    if (!node) return new Set<string>();
    const set = new Set<string>([node.name]);
    node.connections.forEach((c: string) => set.add(c));
    edges.forEach((e: GraphEdge) => {
      if (e.source === node.name) set.add(e.target);
      if (e.target === node.name) set.add(e.source);
    });
    return set;
  }, [hoveredNode, selectedNode, nodes, edges]);

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      {/* Graph Controls */}
      <div className={`absolute top-3 right-3 z-10 flex flex-col gap-1.5`}>
        <div className={`p-1.5 rounded-xl border ${cardBorder} ${isDarkMode ? 'bg-canvas-card/90' : 'bg-white/90'} backdrop-blur-sm flex flex-col gap-1`}>
          <button onClick={onZoomIn} className={`p-1.5 rounded-lg ${subtext} hover:text-purple-400 transition-colors`} title="Zoom in">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" /></svg>
          </button>
          <button onClick={onZoomOut} className={`p-1.5 rounded-lg ${subtext} hover:text-purple-400 transition-colors`} title="Zoom out">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h12" /></svg>
          </button>
          <button onClick={onResetView} className={`p-1.5 rounded-lg ${subtext} hover:text-purple-400 transition-colors`} title="Reset view">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <div className={`h-px ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
          <button onClick={onToggleLabels} className={`p-1.5 rounded-lg ${showLabels ? 'text-purple-400' : subtext} hover:text-purple-400 transition-colors`} title="Toggle labels">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
          </button>
          <button onClick={onToggleLegend} className={`p-1.5 rounded-lg ${showLegend ? 'text-purple-400' : subtext} hover:text-purple-400 transition-colors`} title="Toggle legend">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </button>
        </div>
        <div className={`p-1.5 rounded-xl border ${cardBorder} ${isDarkMode ? 'bg-canvas-card/90' : 'bg-white/90'} backdrop-blur-sm flex flex-col gap-1`}>
          {(['force', 'radial', 'hierarchical'] as LayoutMode[]).map(m => (
            <button
              key={m}
              onClick={() => onLayoutChange(m)}
              className={`px-2 py-1 text-[10px] rounded-lg capitalize ${layoutMode === m ? 'bg-purple-500/20 text-purple-400' : `${subtext} hover:text-purple-400`} transition-all`}
              title={`${m} layout`}
            >
              {m === 'force' ? '🌐' : m === 'radial' ? '🎯' : '📊'} {m}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && nodes.length > 0 && (
        <div className={`absolute bottom-3 left-3 z-10 p-3 rounded-xl border ${cardBorder} ${isDarkMode ? 'bg-canvas-card/90' : 'bg-white/90'} backdrop-blur-sm`}>
          <p className={`text-[10px] font-medium ${textStrong} mb-2`}>Node Types</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(NODE_COLORS).map(([type, c]) => {
              const count = nodes.filter((n: GraphNode) => n.type === type).length;
              if (!count) return null;
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.fill }} />
                  <span className={`text-[10px] ${subtext} capitalize`}>{type} ({count})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          <marker id="arrowhead" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} />
          </marker>
          <marker id="arrowhead-active" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
          </marker>
          {Object.entries(NODE_COLORS).map(([type, c]) => (
            <filter key={type} id={`glow-${type}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>
        <g transform={`translate(${graphOffset.x}, ${graphOffset.y}) scale(${graphZoom})`}>
          {/* Edges */}
          {edges.map((e: GraphEdge, i: number) => {
            const src = nameMap.get(e.source);
            const tgt = nameMap.get(e.target);
            if (!src?.x || !tgt?.x) return null;
            const isHighlighted = highlightedNames.size > 0 && (highlightedNames.has(e.source) && highlightedNames.has(e.target));
            const isActive = selectedNode?.name === e.source || selectedNode?.name === e.target;
            return (
              <line
                key={i}
                x1={src.x} y1={src.y}
                x2={tgt.x} y2={tgt.y}
                stroke={isActive ? '#a855f7' : isHighlighted ? 'rgba(168,85,247,0.4)' : isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}
                strokeWidth={isActive ? 2 : 1}
                markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
              />
            );
          })}
          {/* Nodes */}
          {filteredNodes.map((node: GraphNode) => {
            const c = NODE_COLORS[node.type] || NODE_COLORS.util;
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode === node.id;
            const isHighlighted = highlightedNames.size === 0 || highlightedNames.has(node.name);
            const r = 14 + Math.min(node.connections.length * 2, 10);
            return (
              <g key={node.id}>
                {/* Glow */}
                {(isSelected || isHovered) && (
                  <circle cx={node.x} cy={node.y} r={r + 6} fill={c.glow} opacity={0.5} />
                )}
                {/* Node circle */}
                <circle
                  cx={node.x} cy={node.y} r={r}
                  fill={isDarkMode ? 'rgba(10,10,12,0.8)' : 'rgba(255,255,255,0.9)'}
                  stroke={isSelected ? '#a855f7' : c.fill}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={isHighlighted ? 1 : 0.25}
                  className="cursor-pointer"
                  onMouseDown={(e) => { e.stopPropagation(); onDragNodeStart(node.id); }}
                  onMouseEnter={() => onHoverNode(node.id)}
                  onMouseLeave={() => onHoverNode(null)}
                  onClick={(e) => { e.stopPropagation(); onSelectNode(node); }}
                  style={{ transition: 'opacity 0.2s, stroke 0.2s' }}
                />
                {/* Icon */}
                <text
                  x={node.x} y={(node.y || 0) + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="10" className="pointer-events-none select-none"
                  opacity={isHighlighted ? 1 : 0.3}
                >
                  {NODE_ICONS[node.type] || '•'}
                </text>
                {/* Label */}
                {showLabels && (
                  <text
                    x={node.x} y={(node.y || 0) + r + 12}
                    textAnchor="middle"
                    fontSize="9"
                    fill={isHighlighted ? (isDarkMode ? '#e5e7eb' : '#374151') : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}
                    className="pointer-events-none select-none"
                    style={{ transition: 'fill 0.2s' }}
                  >
                    {node.name.length > 16 ? node.name.slice(0, 14) + '…' : node.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Explorer View (table / card list with details)
   ═══════════════════════════════════════════════════════════════ */
function ExplorerView({ nodes, edges, nameMap, selectedNode, onSelectNode, isDarkMode, subtext, textStrong, cardBg, cardBorder, incomingCount, outgoingCount }: any) {
  // Group by file
  const grouped = useMemo(() => {
    const map: Record<string, GraphNode[]> = {};
    nodes.forEach((n: GraphNode) => {
      const file = n.file || 'Unknown';
      (map[file] ||= []).push(n);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [nodes]);

  return (
    <div className="h-full overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
      <div className="space-y-4">
        {grouped.map(([file, fileNodes]) => (
          <div key={file} className={`rounded-xl border ${cardBorder} overflow-hidden`}>
            <div className={`px-4 py-2.5 ${cardBg} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">📄</span>
                <span className={`text-xs font-medium ${textStrong}`}>{file}</span>
              </div>
              <span className={`text-[10px] ${subtext}`}>{fileNodes.length} entities</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {fileNodes.map((node: GraphNode) => {
                const c = NODE_COLORS[node.type] || NODE_COLORS.util;
                const isSelected = selectedNode?.id === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => onSelectNode(node)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all hover:bg-purple-500/5 ${isSelected ? 'bg-purple-500/10' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${c.bg} border ${c.border}`}>
                      {NODE_ICONS[node.type] || '•'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${textStrong}`}>{node.name}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] rounded-full border ${c.border} ${c.bg} ${c.text} capitalize`}>{node.type}</span>
                      </div>
                      {node.description && <p className={`text-[10px] ${subtext} truncate mt-0.5`}>{node.description}</p>}
                    </div>
                    <div className={`text-right text-[10px] ${subtext} shrink-0`}>
                      <p>↗ {outgoingCount(node.name)} out</p>
                      <p>↙ {incomingCount(node.name)} in</p>
                    </div>
                    {node.complexity && (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border ${
                        node.complexity >= 7 ? 'border-primary-500/30 bg-primary-500/10 text-primary-400' :
                        node.complexity >= 4 ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                        'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {node.complexity}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Dependency View (matrix + circular deps)
   ═══════════════════════════════════════════════════════════════ */
function DependencyView({ nodes, edges, nameMap, isDarkMode, subtext, textStrong, cardBg, cardBorder }: any) {
  const topNodes = nodes.slice(0, 20);
  const nodeNames = topNodes.map((n: GraphNode) => n.name);
  const edgeSet = new Set(edges.map((e: GraphEdge) => `${e.source}→${e.target}`));

  // Detect circular dependencies
  const circular: string[][] = useMemo(() => {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();
    const path: string[] = [];

    function dfs(name: string) {
      if (stack.has(name)) {
        const cycleStart = path.indexOf(name);
        if (cycleStart >= 0) cycles.push(path.slice(cycleStart).concat(name));
        return;
      }
      if (visited.has(name)) return;
      visited.add(name);
      stack.add(name);
      path.push(name);
      const node = nameMap.get(name);
      if (node) node.connections.forEach((c: string) => dfs(c));
      path.pop();
      stack.delete(name);
    }

    nodes.forEach((n: GraphNode) => {
      visited.clear();
      stack.clear();
      path.length = 0;
      dfs(n.name);
    });
    return cycles.slice(0, 10);
  }, [nodes, nameMap]);

  // Dependency chains: find longest path
  const chains = useMemo(() => {
    const memo = new Map<string, string[]>();
    function longest(name: string, visited: Set<string>): string[] {
      if (visited.has(name)) return [];
      if (memo.has(name)) return memo.get(name)!;
      visited.add(name);
      const node = nameMap.get(name);
      let best: string[] = [];
      if (node) {
        for (const c of node.connections) {
          const chain = longest(c, new Set(visited));
          if (chain.length > best.length) best = chain;
        }
      }
      const result = [name, ...best];
      memo.set(name, result);
      return result;
    }
    let longestChain: string[] = [];
    nodes.forEach((n: GraphNode) => {
      const chain = longest(n.name, new Set());
      if (chain.length > longestChain.length) longestChain = chain;
    });
    return longestChain;
  }, [nodes, nameMap]);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6" style={{ scrollbarWidth: 'thin' }}>
      {/* Dependency Matrix */}
      <div>
        <h3 className={`text-sm font-semibold ${textStrong} mb-3`}>📦 Dependency Matrix {topNodes.length < nodes.length ? `(top ${topNodes.length})` : ''}</h3>
        <div className={`rounded-xl border ${cardBorder} overflow-x-auto`}>
          <table className="text-[9px] w-auto">
            <thead>
              <tr>
                <th className={`p-2 text-left sticky left-0 ${cardBg} ${textStrong} font-medium`}>From ↓ / To →</th>
                {nodeNames.map((n: string) => (
                  <th key={n} className={`p-2 ${subtext} font-normal`} style={{ writingMode: 'vertical-rl', maxWidth: '30px' }}>
                    {n.length > 10 ? n.slice(0, 8) + '…' : n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topNodes.map((row: GraphNode) => (
                <tr key={row.id}>
                  <td className={`p-2 sticky left-0 ${cardBg} ${textStrong} font-medium whitespace-nowrap`}>
                    <span className="mr-1">{NODE_ICONS[row.type]}</span>
                    {row.name.length > 12 ? row.name.slice(0, 10) + '…' : row.name}
                  </td>
                  {nodeNames.map((col: string) => {
                    const has = edgeSet.has(`${row.name}→${col}`);
                    const reverse = edgeSet.has(`${col}→${row.name}`);
                    const isSelf = row.name === col;
                    return (
                      <td key={col} className={`p-2 text-center ${isSelf ? (isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-100') : ''}`}>
                        {isSelf ? <span className={subtext}>─</span> :
                         has && reverse ? <span className="text-primary-400" title="Circular">⟳</span> :
                         has ? <span className="text-purple-400">●</span> :
                         reverse ? <span className="text-cyan-400/40">○</span> :
                         <span className={isDarkMode ? 'text-white/[0.05]' : 'text-gray-200'}>·</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Circular Dependencies */}
      {circular.length > 0 && (
        <div>
          <h3 className={`text-sm font-semibold text-primary-400 mb-3`}>⚠️ Circular Dependencies ({circular.length})</h3>
          <div className="space-y-2">
            {circular.map((cycle, i) => (
              <div key={i} className={`p-3 rounded-xl border border-primary-500/20 bg-primary-500/5`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cycle.map((name, j) => (
                    <React.Fragment key={j}>
                      <span className={`px-2 py-0.5 text-[10px] rounded-lg border border-primary-500/30 ${isDarkMode ? 'bg-primary-500/10 text-primary-300' : 'bg-red-50 text-primary-700'}`}>{name}</span>
                      {j < cycle.length - 1 && <span className="text-primary-400 text-xs">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Longest Dependency Chain */}
      {chains.length > 1 && (
        <div>
          <h3 className={`text-sm font-semibold ${textStrong} mb-3`}>🔗 Longest Dependency Chain ({chains.length} deep)</h3>
          <div className={`p-4 rounded-xl border ${cardBorder} ${cardBg}`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {chains.map((name, i) => {
                const node = nameMap.get(name);
                const c = NODE_COLORS[node?.type || 'util'];
                return (
                  <React.Fragment key={i}>
                    <span className={`px-2.5 py-1 text-[10px] rounded-lg border ${c.border} ${c.bg} ${c.text}`}>
                      {NODE_ICONS[node?.type || 'util']} {name}
                    </span>
                    {i < chains.length - 1 && <span className={`${subtext} text-xs`}>→</span>}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Metrics View
   ═══════════════════════════════════════════════════════════════ */
function MetricsView({ nodes, edges, stats, isDarkMode, subtext, textStrong, cardBg, cardBorder }: any) {
  // Complexity distribution
  const complexityDist = useMemo(() => {
    const dist = [0, 0, 0]; // low (1-3), med (4-6), high (7-10)
    nodes.forEach((n: GraphNode) => {
      const c = n.complexity || 1;
      if (c <= 3) dist[0]++;
      else if (c <= 6) dist[1]++;
      else dist[2]++;
    });
    return dist;
  }, [nodes]);

  // Type distribution for bar chart
  const typeDistribution = useMemo(() => {
    return Object.entries(stats.typeCount)
      .sort(([, a]: any, [, b]: any) => b - a) as [string, number][];
  }, [stats]);

  const maxTypeCount = Math.max(...typeDistribution.map(([, c]) => c), 1);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6" style={{ scrollbarWidth: 'thin' }}>
      {/* Type Distribution */}
      <div>
        <h3 className={`text-sm font-semibold ${textStrong} mb-3`}>📊 Entity Distribution</h3>
        <div className={`p-4 rounded-xl border ${cardBorder} ${cardBg} space-y-2.5`}>
          {typeDistribution.map(([type, count]) => {
            const c = NODE_COLORS[type] || NODE_COLORS.util;
            const pct = (count / maxTypeCount) * 100;
            return (
              <div key={type} className="flex items-center gap-3">
                <div className="w-24 flex items-center gap-1.5 shrink-0">
                  <span className="text-sm">{NODE_ICONS[type]}</span>
                  <span className={`text-[10px] capitalize ${textStrong}`}>{type}</span>
                </div>
                <div className={`flex-1 h-5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: c.fill }}
                  />
                </div>
                <span className={`text-xs font-medium ${textStrong} w-8 text-right`}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complexity Overview */}
      <div>
        <h3 className={`text-sm font-semibold ${textStrong} mb-3`}>📈 Complexity Overview</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Low (1-3)', value: complexityDist[0], color: 'emerald', icon: '✅' },
            { label: 'Medium (4-6)', value: complexityDist[1], color: 'amber', icon: '⚡' },
            { label: 'High (7-10)', value: complexityDist[2], color: 'red', icon: '🔥' },
          ].map((item, i) => (
            <div key={i} className={`p-4 rounded-xl border ${cardBorder} ${cardBg} text-center`}>
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className={`text-2xl font-bold ${textStrong}`}>{item.value}</p>
              <p className={`text-[10px] ${subtext}`}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Most Connected */}
      <div>
        <h3 className={`text-sm font-semibold ${textStrong} mb-3`}>🔗 Most Connected Entities</h3>
        <div className={`rounded-xl border ${cardBorder} overflow-hidden`}>
          {stats.mostConnected.map((node: GraphNode, i: number) => {
            const c = NODE_COLORS[node.type] || NODE_COLORS.util;
            const totalConn = node.connections.length + edges.filter((e: GraphEdge) => e.target === node.name).length;
            return (
              <div key={node.id} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? `border-t ${cardBorder}` : ''}`}>
                <span className={`text-sm font-bold ${subtext} w-5`}>#{i + 1}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${c.bg} border ${c.border}`}>{NODE_ICONS[node.type]}</div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-medium ${textStrong}`}>{node.name}</span>
                  <span className={`text-[10px] ${subtext} ml-2 capitalize`}>{node.type}</span>
                </div>
                <div className={`text-xs font-bold ${c.text}`}>{totalConn} connections</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Orphan Entities */}
      {stats.orphans.length > 0 && (
        <div>
          <h3 className={`text-sm font-semibold ${textStrong} mb-3`}>🏝️ Orphan Entities (No connections)</h3>
          <div className="flex flex-wrap gap-2">
            {stats.orphans.map((n: GraphNode) => {
              const c = NODE_COLORS[n.type] || NODE_COLORS.util;
              return (
                <span key={n.id} className={`px-2.5 py-1 text-[10px] rounded-lg border ${c.border} ${c.bg} ${c.text}`}>
                  {NODE_ICONS[n.type]} {n.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Insights View (AI-powered architecture analysis)
   ═══════════════════════════════════════════════════════════════ */
function InsightsView({ nodes, edges, stats, isDarkMode, subtext, textStrong, cardBg, cardBorder }: any) {
  const insights = useMemo(() => {
    const list: { type: 'success' | 'warning' | 'info' | 'error'; icon: string; title: string; detail: string }[] = [];

    // Architecture patterns
    const componentCount = nodes.filter((n: GraphNode) => n.type === 'component').length;
    const hookCount = nodes.filter((n: GraphNode) => n.type === 'hook').length;
    const serviceCount = nodes.filter((n: GraphNode) => n.type === 'service').length;

    if (componentCount > 0 && hookCount > 0) {
      list.push({ type: 'success', icon: '✅', title: 'Custom Hooks Pattern', detail: `Using ${hookCount} custom hook(s) for logic separation — good practice.` });
    }
    if (serviceCount > 0) {
      list.push({ type: 'success', icon: '✅', title: 'Service Layer', detail: `${serviceCount} service(s) found — clean separation of API/data logic.` });
    }

    // High complexity warnings
    const highComplexity = nodes.filter((n: GraphNode) => (n.complexity || 0) >= 7);
    if (highComplexity.length > 0) {
      list.push({ type: 'warning', icon: '⚠️', title: 'High Complexity', detail: `${highComplexity.length} entity/ies have complexity ≥ 7: ${highComplexity.map((n: GraphNode) => n.name).join(', ')}. Consider refactoring.` });
    }

    // God components (too many connections)
    const godComponents = nodes.filter((n: GraphNode) => n.connections.length > 8);
    if (godComponents.length > 0) {
      list.push({ type: 'warning', icon: '🔥', title: 'Highly Coupled Entities', detail: `${godComponents.map((n: GraphNode) => `${n.name} (${n.connections.length} deps)`).join(', ')} — consider splitting.` });
    }

    // Orphans
    if (stats.orphans.length > 0) {
      list.push({ type: 'info', icon: '🏝️', title: 'Unused Entities', detail: `${stats.orphans.length} entity/ies appear unused: ${stats.orphans.slice(0, 5).map((n: GraphNode) => n.name).join(', ')}. Verify or remove.` });
    }

    // File distribution
    if (stats.files.length === 1 && nodes.length > 5) {
      list.push({ type: 'warning', icon: '📁', title: 'Single File', detail: `All ${nodes.length} entities in one file. Consider splitting into modules.` });
    }

    // Good architecture
    if (nodes.length > 3 && stats.orphans.length === 0 && highComplexity.length === 0) {
      list.push({ type: 'success', icon: '🌟', title: 'Clean Architecture', detail: 'All entities are connected and complexity is manageable. Well structured!' });
    }

    // Size insights
    if (stats.totalLines > 1000) {
      list.push({ type: 'info', icon: '📏', title: 'Large Codebase', detail: `~${stats.totalLines.toLocaleString()} lines across ${nodes.length} entities. Monitor growth.` });
    }

    if (list.length === 0) {
      list.push({ type: 'info', icon: '💡', title: 'Analyze First', detail: 'Run an analysis to get architecture insights and recommendations.' });
    }

    return list;
  }, [nodes, edges, stats]);

  const INSIGHT_STYLES = {
    success: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/20 text-emerald-400' },
    warning: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', badge: 'bg-amber-500/20 text-amber-400' },
    info: { border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', badge: 'bg-cyan-500/20 text-cyan-400' },
    error: { border: 'border-primary-500/20', bg: 'bg-primary-500/5', badge: 'bg-primary-500/20 text-primary-400' },
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${textStrong}`}>💡 Architecture Insights</h3>
        <span className={`text-[10px] ${subtext}`}>{insights.length} findings</span>
      </div>
      {insights.map((insight, i) => {
        const style = INSIGHT_STYLES[insight.type];
        return (
          <div key={i} className={`p-4 rounded-xl border ${style.border} ${style.bg}`}>
            <div className="flex items-start gap-3">
              <span className="text-lg">{insight.icon}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-xs font-semibold ${textStrong}`}>{insight.title}</h4>
                  <span className={`px-1.5 py-0.5 text-[9px] rounded-full ${style.badge} capitalize`}>{insight.type}</span>
                </div>
                <p className={`text-xs ${subtext} leading-relaxed`}>{insight.detail}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Node Inspector (side panel)
   ═══════════════════════════════════════════════════════════════ */
function NodeInspector({ node, nodes, edges, nameMap, isDarkMode, subtext, textStrong, cardBg, cardBorder, incomingCount, outgoingCount, onClose, onSelectNode }: any) {
  const c = NODE_COLORS[node.type] || NODE_COLORS.util;
  const incoming = edges.filter((e: GraphEdge) => e.target === node.name);
  const outgoing = edges.filter((e: GraphEdge) => e.source === node.name);

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`shrink-0 p-4 border-b ${cardBorder}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${c.border} ${c.bg} ${c.text} uppercase`}>{node.type}</span>
          <button onClick={onClose} className={`${subtext} hover:text-purple-400 transition-colors`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <h3 className={`text-sm font-bold ${textStrong}`}>{node.name}</h3>
        {node.file && <p className={`text-[10px] ${subtext} mt-0.5`}>📄 {node.file}</p>}
        {node.description && <p className={`text-xs ${subtext} mt-2 leading-relaxed`}>{node.description}</p>}
      </div>

      {/* Stats */}
      <div className={`shrink-0 grid grid-cols-3 border-b ${cardBorder}`}>
        {[
          { label: 'Outgoing', value: outgoing.length, icon: '↗' },
          { label: 'Incoming', value: incoming.length, icon: '↙' },
          { label: 'Complexity', value: node.complexity || '—', icon: '📈' },
        ].map((s, i) => (
          <div key={i} className={`p-3 text-center ${i > 0 ? `border-l ${cardBorder}` : ''}`}>
            <p className={`text-xs font-bold ${textStrong}`}>{s.icon} {s.value}</p>
            <p className={`text-[9px] ${subtext}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Connections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
        {outgoing.length > 0 && (
          <div>
            <p className={`text-[10px] font-medium ${subtext} uppercase tracking-wider mb-2`}>Depends on ({outgoing.length})</p>
            <div className="space-y-1.5">
              {outgoing.map((e: GraphEdge, i: number) => {
                const target = nameMap.get(e.target);
                const tc = NODE_COLORS[target?.type || 'util'];
                return (
                  <button
                    key={i}
                    onClick={() => target && onSelectNode(target)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg border ${cardBorder} hover:border-purple-500/30 transition-all flex items-center gap-2`}
                  >
                    <span className={tc.text}>{NODE_ICONS[target?.type || 'util']}</span>
                    <span className="flex-1 truncate">{e.target}</span>
                    <span className={`text-[9px] ${subtext} capitalize`}>{e.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {incoming.length > 0 && (
          <div>
            <p className={`text-[10px] font-medium ${subtext} uppercase tracking-wider mb-2`}>Used by ({incoming.length})</p>
            <div className="space-y-1.5">
              {incoming.map((e: GraphEdge, i: number) => {
                const source = nameMap.get(e.source);
                const sc = NODE_COLORS[source?.type || 'util'];
                return (
                  <button
                    key={i}
                    onClick={() => source && onSelectNode(source)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg border ${cardBorder} hover:border-purple-500/30 transition-all flex items-center gap-2`}
                  >
                    <span className={sc.text}>{NODE_ICONS[source?.type || 'util']}</span>
                    <span className="flex-1 truncate">{e.source}</span>
                    <span className={`text-[9px] ${subtext} capitalize`}>{e.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {node.lineCount && (
          <div className={`pt-2 border-t ${cardBorder}`}>
            <p className={`text-[10px] ${subtext}`}>📝 ~{node.lineCount} lines</p>
          </div>
        )}
      </div>
    </div>
  );
}
