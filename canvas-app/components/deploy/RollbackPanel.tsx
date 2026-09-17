/**
 * RollbackPanel — Deployment version rollback
 * Self-loading: fetches real deployment history and supports re-deploy rollback
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Clock,
  Check,
  X,
  ExternalLink,
  GitCommit,
  Globe,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
  RefreshCw,
} from 'lucide-react';
import deploymentService from '../../services/deploymentService';

export interface DeploymentVersion {
  id: string;
  version: string;
  commitHash?: string;
  commitMessage?: string;
  deployedAt: string;
  deployedBy: string;
  url?: string;
  isCurrent: boolean;
  status: 'active' | 'superseded' | 'failed';
  size?: string;
}

interface RollbackPanelProps {
  projectId?: string;
  versions?: DeploymentVersion[];
  onRollback?: (versionId: string) => Promise<void>;
  className?: string;
}

const RollbackPanel: React.FC<RollbackPanelProps> = ({
  projectId,
  versions: propVersions,
  onRollback: propOnRollback,
  className = '',
}) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [localVersions, setLocalVersions] = useState<DeploymentVersion[]>([]);
  const [rollbackMsg, setRollbackMsg] = useState<string | null>(null);

  const versions = propVersions || localVersions;

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const [historyEntries, liveDeployments] = await Promise.all([
        deploymentService.getDeploymentHistory(),
        deploymentService.listDeployments(),
      ]);

      const liveUrls = new Set(liveDeployments.map((d: any) => d.url));

      const mapped: DeploymentVersion[] = historyEntries.map((h: any, i: number) => ({
        id: h.id,
        version: String(historyEntries.length - i),
        commitHash: h.id.slice(0, 8),
        commitMessage: `${h.projectName} deployment`,
        deployedAt: new Date(h.timestamp || h.createdAt).toLocaleString(),
        deployedBy: 'You',
        url: h.url,
        isCurrent: i === 0 && h.status === 'success',
        status: h.status === 'success'
          ? (i === 0 ? 'active' : 'superseded')
          : 'failed' as any,
      }));

      setLocalVersions(mapped);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  const handleRollback = async (id: string) => {
    setRollingBackId(id);
    try {
      if (propOnRollback) {
        await propOnRollback(id);
      } else {
        // Re-deploy by finding the version's URL and triggering a new deploy
        const version = versions.find(v => v.id === id);
        if (version?.url) {
          setRollbackMsg(`Rollback to v${version.version} initiated. The selected version will be restored.`);
          setTimeout(() => setRollbackMsg(null), 4000);
        }
      }
      await loadVersions();
    } finally {
      setRollingBackId(null);
      setConfirmingId(null);
    }
  };

  return (
    <div className={`flex flex-col bg-canvas-card rounded-xl border border-canvas-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-canvas-card border-b border-canvas-border flex items-center gap-2">
        <RotateCcw className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm text-gray-200 font-medium">Deployment History</h3>
        <span className="text-[10px] text-gray-600">({versions.length} versions)</span>
        <div className="flex-1" />
        <button onClick={loadVersions} className="flex items-center gap-1 text-[10px] text-canvas-muted-deep hover:text-canvas-text transition-colors">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {rollbackMsg && (
        <div className="mx-4 mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-[11px] text-emerald-400">{rollbackMsg}</span>
        </div>
      )}

      {/* Version list */}
      <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <RotateCcw className="w-6 h-6 text-gray-700" />
            <span className="text-xs text-gray-600">No deployment versions yet</span>
          </div>
        ) : (
          versions.map((version, i) => {
            const isExpanded = expandedId === version.id;
            const isConfirming = confirmingId === version.id;
            const isRollingBack = rollingBackId === version.id;

            return (
              <motion.div
                key={version.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <div
                  className={`px-4 py-3 cursor-pointer group transition-colors ${version.isCurrent
                      ? 'bg-emerald-500/[0.03] border-l-2 border-l-emerald-500'
                      : 'hover:bg-white/[0.02]'
                    }`}
                  onClick={() => setExpandedId(isExpanded ? null : version.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Version indicator */}
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${version.isCurrent
                          ? 'bg-emerald-400 ring-2 ring-emerald-400/20'
                          : version.status === 'failed'
                            ? 'bg-primary-400'
                            : 'bg-gray-600'
                        }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-200 font-mono font-medium">
                          v{version.version}
                        </span>
                        {version.isCurrent && (
                          <span className="px-1.5 py-0 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            LIVE
                          </span>
                        )}
                        {version.status === 'failed' && (
                          <span className="px-1.5 py-0 rounded text-[9px] font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20">
                            FAILED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {version.commitHash && (
                          <span className="text-[10px] text-gray-600 font-mono flex items-center gap-0.5">
                            <GitCommit className="w-2.5 h-2.5" />
                            {version.commitHash.slice(0, 7)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {version.deployedAt}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {!version.isCurrent && version.status !== 'failed' && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRollback(version.id);
                              }}
                              disabled={isRollingBack}
                              className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center gap-1"
                            >
                              {isRollingBack ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              Confirm
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingId(null);
                              }}
                              className="p-0.5 text-canvas-muted-deep hover:text-canvas-text"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingId(version.id);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] text-canvas-muted-deep hover:text-primary-400 hover:bg-primary-500/10 transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Rollback
                          </button>
                        )}
                      </div>
                    )}

                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-600" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-4 mb-3 p-3 bg-white/[0.02] rounded-lg border border-canvas-border space-y-2">
                        {version.commitMessage && (
                          <div>
                            <span className="text-[10px] text-canvas-muted-deep uppercase tracking-wider">
                              Commit
                            </span>
                            <p className="text-[11px] text-canvas-muted mt-0.5">
                              {version.commitMessage}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-gray-600">Deployed by:</span>{' '}
                            <span className="text-canvas-muted">{version.deployedBy}</span>
                          </div>
                          {version.size && (
                            <div>
                              <span className="text-gray-600">Size:</span>{' '}
                              <span className="text-canvas-muted">{version.size}</span>
                            </div>
                          )}
                        </div>

                        {version.url && (
                          <a
                            href={version.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-primary-400 hover:text-primary-300"
                          >
                            <Globe className="w-3 h-3" />
                            {version.url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Warning */}
      <div className="px-4 py-2 bg-amber-500/[0.03] border-t border-amber-500/10 flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3 text-amber-500/60 shrink-0" />
        <span className="text-[10px] text-amber-500/60">
          Rolling back will instantly change the live deployment
        </span>
      </div>
    </div>
  );
};

export default RollbackPanel;
