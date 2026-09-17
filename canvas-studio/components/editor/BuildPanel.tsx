/**
 * BuildPanel — Build status, logs, pipeline visualization
 * Shows real-time build progress via SSE streaming
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  Zap,
  Package,
  Shield,
  TestTube,
  FileSearch,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { buildService } from '../../services/buildService';

// ── Types ──────────────────────────────────────────────────────────

interface BuildStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number;
}

interface Build {
  id: string;
  projectId: string;
  status: 'queued' | 'building' | 'testing' | 'deploying' | 'success' | 'failed' | 'cancelled';
  stages?: BuildStage[];
  logs?: string;
  duration?: number;
  triggeredBy?: string;
  createdAt: string;
  artifactUrl?: string;
}

interface BuildPanelProps {
  projectId: string;
  onDeployReady?: (buildId: string) => void;
  className?: string;
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  detect: <FileSearch size={14} />,
  install: <Download size={14} />,
  lint: <AlertTriangle size={14} />,
  test: <TestTube size={14} />,
  build: <Package size={14} />,
  security: <Shield size={14} />,
  package: <Zap size={14} />,
};

const STATUS_COLORS: Record<string, string> = {
  queued: 'text-yellow-400',
  building: 'text-blue-400',
  testing: 'text-purple-400',
  deploying: 'text-cyan-400',
  success: 'text-emerald-400',
  failed: 'text-primary-400',
  cancelled: 'text-zinc-500',
};

// ── Component ──────────────────────────────────────────────────────

const BuildPanel: React.FC<BuildPanelProps> = ({ projectId, onDeployReady, className = '' }) => {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [activeBuild, setActiveBuild] = useState<Build | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedBuild, setExpandedBuild] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<{ close: () => void } | null>(null);

  // Fetch build history
  const loadBuilds = useCallback(async () => {
    try {
      const data = await buildService.listBuilds(projectId);
      if (data.builds) setBuilds(data.builds);
    } catch { }
  }, [projectId]);

  useEffect(() => {
    loadBuilds();
  }, [loadBuilds]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Start SSE log streaming for a build (fetch-based for cookie credentials)
  const streamLogs = useCallback((buildId: string) => {
    sseRef.current?.close();
    setLogs([]);

    const sub = buildService.subscribeLogs(
      buildId,
      (event) => {
        if (event.type === 'log' && event.message) {
          setLogs(prev => [...prev, event.message!]);
        } else if (event.type === 'stage-start' || event.type === 'stage-complete' || event.type === 'stage-error') {
          setActiveBuild(prev => prev ? {
            ...prev,
            stages: prev.stages?.map(s =>
              s.id === event.stage
                ? { ...s, status: event.type === 'stage-start' ? 'running' : (event.status as BuildStage['status'] || 'success') }
                : s
            ),
          } : prev);
        }
      },
      (finalStatus) => {
        setActiveBuild(prev => prev ? { ...prev, status: finalStatus as Build['status'] } : prev);
        if (finalStatus === 'success') onDeployReady?.(buildId);
        loadBuilds();
      },
      () => {
        // SSE error — no-op, build may have already completed
      },
    );

    sseRef.current = sub;
    return () => sub.close();
  }, [loadBuilds, onDeployReady]);

  // Start a new build
  const handleStartBuild = async () => {
    setIsLoading(true);
    try {
      const { build } = await buildService.startBuild({ projectId });
      if (build) {
        setActiveBuild(build as unknown as Build);
        setExpandedBuild(build.id);
        streamLogs(build.id);
      }
    } catch { } finally {
      setIsLoading(false);
    }
  };

  // Cancel build
  const handleCancel = async (buildId: string) => {
    try {
      await buildService.cancelBuild(buildId);
      sseRef.current?.close();
      setActiveBuild(prev => prev?.id === buildId ? { ...prev, status: 'cancelled' } : prev);
      loadBuilds();
    } catch { }
  };

  // Cleanup
  useEffect(() => () => sseRef.current?.close(), []);

  const isRunning = activeBuild && !['success', 'failed', 'cancelled'].includes(activeBuild.status);

  return (
    <div className={`flex flex-col h-full bg-zinc-900/90 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-canvas-border">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-violet-400" />
          <span className="text-sm font-semibold text-white">Build Pipeline</span>
          {isRunning && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded-full text-[10px] text-blue-300">
              <Loader2 size={10} className="animate-spin" /> Running
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadBuilds}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleStartBuild}
            disabled={!!isRunning || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-medium text-white transition-colors"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Build
          </button>
        </div>
      </div>

      {/* Pipeline Stages (current build) */}
      {activeBuild?.stages && (
        <div className="px-4 py-3 border-b border-canvas-border">
          <div className="flex items-center gap-1">
            {activeBuild.stages.map((stage, i) => (
              <React.Fragment key={stage.id}>
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${stage.status === 'running' ? 'bg-blue-500/20 text-blue-300' :
                    stage.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                      stage.status === 'failed' ? 'bg-primary-500/20 text-primary-300' :
                        'bg-white/5 text-zinc-500'
                  }`}>
                  {stage.status === 'running' ? <Loader2 size={10} className="animate-spin" /> :
                    stage.status === 'success' ? <CheckCircle2 size={10} /> :
                      stage.status === 'failed' ? <XCircle size={10} /> :
                        STAGE_ICONS[stage.id] || <Clock size={10} />}
                  {stage.name}
                </div>
                {i < activeBuild.stages!.length - 1 && (
                  <ChevronRight size={10} className="text-zinc-600" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Build Logs */}
      {logs.length > 0 && (
        <div className="flex-1 overflow-y-auto font-mono text-[11px] p-3 bg-black/30 min-h-[120px] max-h-[200px]">
          {logs.map((line, i) => (
            <div key={i} className={`leading-5 ${line.includes('error') || line.includes('ERROR') ? 'text-primary-400' :
                line.includes('warn') || line.includes('WARN') ? 'text-yellow-400' :
                  line.includes('✓') || line.includes('success') ? 'text-emerald-400' :
                    'text-zinc-400'
              }`}>
              {line}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Cancel button if running */}
      {isRunning && activeBuild && (
        <div className="px-4 py-2 border-t border-canvas-border">
          <button
            onClick={() => handleCancel(activeBuild.id)}
            className="flex items-center gap-1.5 px-3 py-1 bg-primary-600/20 hover:bg-primary-600/30 rounded text-xs text-primary-300 transition-colors"
          >
            <Square size={10} /> Cancel Build
          </button>
        </div>
      )}

      {/* Build History */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">History</span>
        </div>
        {builds.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-zinc-500">
            No builds yet. Click "Build" to start.
          </div>
        ) : (
          <div className="space-y-1 px-2 pb-3">
            {builds.slice(0, 20).map(build => (
              <motion.div
                key={build.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-canvas-border transition-colors"
              >
                <button
                  onClick={() => setExpandedBuild(expandedBuild === build.id ? null : build.id)}
                  className="flex items-center justify-between w-full px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    {build.status === 'success' ? <CheckCircle2 size={12} className="text-emerald-400" /> :
                      build.status === 'failed' ? <XCircle size={12} className="text-primary-400" /> :
                        build.status === 'cancelled' ? <Square size={12} className="text-zinc-500" /> :
                          <Loader2 size={12} className="text-blue-400 animate-spin" />}
                    <span className="text-xs text-white/80">{build.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {build.duration && (
                      <span className="text-[10px] text-zinc-500">{(build.duration / 1000).toFixed(1)}s</span>
                    )}
                    <span className={`text-[10px] font-medium ${STATUS_COLORS[build.status] || 'text-zinc-400'}`}>
                      {build.status}
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedBuild === build.id && build.stages && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden px-3 pb-2"
                    >
                      <div className="space-y-1 pt-1 border-t border-canvas-border">
                        {(Array.isArray(build.stages) ? build.stages : []).map((stage: BuildStage) => (
                          <div key={stage.id} className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              {STAGE_ICONS[stage.id]}
                              <span>{stage.name}</span>
                            </div>
                            <span className={
                              stage.status === 'success' ? 'text-emerald-400' :
                                stage.status === 'failed' ? 'text-primary-400' :
                                  'text-zinc-600'
                            }>
                              {stage.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildPanel;
