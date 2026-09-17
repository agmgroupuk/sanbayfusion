/**
 * DeployStatus — Deploy progress & status with live updates
 * Animated multi-step deployment pipeline visualization
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Rocket,
  Check,
  X,
  Loader2,
  Clock,
  ExternalLink,
  Copy,
  AlertTriangle,
  Globe,
  Server,
  Shield,
  Zap,
} from 'lucide-react';

type DeployStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface DeployStep {
  id: string;
  label: string;
  status: DeployStepStatus;
  duration?: number;
  error?: string;
}

interface DeployStatusProps {
  steps: DeployStep[];
  deployUrl?: string;
  deployId?: string;
  startedAt?: number;
  platform?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onViewLogs?: () => void;
  className?: string;
}

const stepIcons: Record<string, React.FC<any>> = {
  build: Zap,
  optimize: Zap,
  upload: Server,
  ssl: Shield,
  dns: Globe,
  verify: Check,
};

const statusConfig: Record<
  DeployStepStatus,
  { color: string; bg: string; border: string }
> = {
  pending: { color: 'text-canvas-muted-deep', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  running: { color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/30' },
  success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  error: { color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
  skipped: { color: 'text-gray-600', bg: 'bg-gray-500/5', border: 'border-gray-500/10' },
};

const DeployStatus: React.FC<DeployStatusProps> = ({
  steps,
  deployUrl,
  deployId,
  startedAt,
  platform = 'Vercel',
  onCancel,
  onRetry,
  onViewLogs,
  className = '',
}) => {
  const isDeploying = steps.some((s) => s.status === 'running');
  const hasError = steps.some((s) => s.status === 'error');
  const isComplete = steps.every((s) => s.status === 'success' || s.status === 'skipped');
  const elapsedMs = startedAt ? Date.now() - startedAt : 0;

  const overallProgress =
    steps.length > 0
      ? steps.filter((s) => s.status === 'success' || s.status === 'skipped').length / steps.length
      : 0;

  const copyUrl = async () => {
    if (deployUrl) {
      await navigator.clipboard.writeText(deployUrl);
    }
  };

  return (
    <div className={`flex flex-col bg-canvas-card rounded-xl border border-canvas-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-canvas-card border-b border-canvas-border">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isComplete
                ? 'bg-emerald-500/10'
                : hasError
                  ? 'bg-primary-500/10'
                  : 'bg-primary-500/10'
            }`}
          >
            {isComplete ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : hasError ? (
              <X className="w-4 h-4 text-primary-400" />
            ) : isDeploying ? (
              <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4 text-primary-400" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-sm text-gray-200 font-medium">
              {isComplete
                ? 'Deployed Successfully'
                : hasError
                  ? 'Deployment Failed'
                  : isDeploying
                    ? 'Deploying...'
                    : 'Ready to Deploy'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-canvas-muted-deep">{platform}</span>
              {deployId && (
                <span className="text-[10px] text-gray-600 font-mono">#{deployId.slice(0, 8)}</span>
              )}
              {startedAt && (
                <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {(elapsedMs / 1000).toFixed(0)}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {(isDeploying || isComplete) && (
          <div className="mt-3 h-1 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                hasError
                  ? 'bg-primary-500'
                  : isComplete
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                    : 'bg-gradient-to-r from-primary-600 to-primary-500'
              }`}
              initial={{ width: '0%' }}
              animate={{ width: `${overallProgress * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="px-4 py-3 space-y-1">
        {steps.map((step, i) => {
          const config = statusConfig[step.status];
          const StepIcon = stepIcons[step.id] || Zap;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 py-1.5 px-2 rounded-lg ${
                step.status === 'running' ? 'bg-primary-500/[0.05]' : ''
              }`}
            >
              {/* Step indicator */}
              <div
                className={`w-5 h-5 rounded-full ${config.bg} border ${config.border} flex items-center justify-center shrink-0`}
              >
                {step.status === 'running' ? (
                  <Loader2 className="w-3 h-3 text-primary-400 animate-spin" />
                ) : step.status === 'success' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : step.status === 'error' ? (
                  <X className="w-3 h-3 text-primary-400" />
                ) : step.status === 'skipped' ? (
                  <span className="text-[8px] text-gray-600">—</span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                )}
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className={`absolute left-[29px] w-px h-3 ${
                    step.status === 'success' ? 'bg-emerald-500/30' : 'bg-white/[0.06]'
                  }`}
                  style={{ transform: `translateY(16px)` }}
                />
              )}

              <span
                className={`text-xs flex-1 ${
                  step.status === 'running'
                    ? 'text-gray-200'
                    : step.status === 'success'
                      ? 'text-canvas-muted'
                      : step.status === 'error'
                        ? 'text-primary-400'
                        : 'text-gray-600'
                }`}
              >
                {step.label}
              </span>

              {step.duration !== undefined && step.status === 'success' && (
                <span className="text-[10px] text-gray-600 font-mono">
                  {(step.duration / 1000).toFixed(1)}s
                </span>
              )}

              {step.status === 'running' && (
                <motion.div
                  className="flex items-center gap-1"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="text-[10px] text-primary-400">Running</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Error message */}
      {hasError && (
        <div className="mx-4 mb-3 p-2 bg-primary-500/[0.05] border border-primary-500/10 rounded-lg">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 text-primary-400 mt-0.5 shrink-0" />
            <span className="text-[11px] text-primary-400">
              {steps.find((s) => s.status === 'error')?.error || 'Deployment failed'}
            </span>
          </div>
        </div>
      )}

      {/* Deploy URL */}
      {deployUrl && isComplete && (
        <div className="mx-4 mb-3 p-2 bg-emerald-500/[0.05] border border-emerald-500/10 rounded-lg">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 truncate flex-1 font-mono"
            >
              {deployUrl}
            </a>
            <button onClick={copyUrl} className="p-1 text-emerald-400/60 hover:text-emerald-400">
              <Copy className="w-3 h-3" />
            </button>
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-emerald-400/60 hover:text-emerald-400"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 bg-canvas-card border-t border-canvas-border flex items-center gap-2">
        {onViewLogs && (
          <button
            onClick={onViewLogs}
            className="px-3 py-1.5 rounded-lg text-xs text-canvas-muted hover:text-gray-200 bg-white/[0.04] hover:bg-white/[0.06] transition-colors"
          >
            View Logs
          </button>
        )}
        <div className="flex-1" />
        {isDeploying && onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 transition-colors"
          >
            Cancel
          </button>
        )}
        {hasError && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:opacity-90 transition-opacity"
          >
            Retry Deploy
          </button>
        )}
      </div>
    </div>
  );
};

export default DeployStatus;
