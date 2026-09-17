/**
 * UsageDashboard — Token usage, generation count, storage metrics
 * Beautiful usage cards with progress bars and sparklines
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  MessageSquare,
  HardDrive,
  Cpu,
  Clock,
  TrendingUp,
  AlertTriangle,
  Crown,
  ArrowRight,
} from 'lucide-react';

export interface UsageMetric {
  label: string;
  used: number;
  limit: number;
  unit: string;
  icon: 'tokens' | 'generations' | 'storage' | 'compute';
  resetDate?: string;
}

interface UsageDashboardProps {
  metrics: UsageMetric[];
  plan: string;
  billingCycle?: string;
  onUpgrade?: () => void;
  className?: string;
}

const iconMap: Record<string, React.FC<any>> = {
  tokens: Zap,
  generations: MessageSquare,
  storage: HardDrive,
  compute: Cpu,
};

const colorMap: Record<string, { bar: string; text: string; bg: string }> = {
  tokens: { bar: 'from-primary-500 to-primary-600', text: 'text-primary-400', bg: 'bg-primary-500/10' },
  generations: { bar: 'from-cyan-500 to-blue-500', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  storage: { bar: 'from-amber-500 to-orange-500', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  compute: { bar: 'from-emerald-500 to-teal-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const formatNumber = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const UsageDashboard: React.FC<UsageDashboardProps> = ({
  metrics,
  plan,
  billingCycle,
  onUpgrade,
  className = '',
}) => {
  const anyNearLimit = metrics.some((m) => m.used / m.limit > 0.8);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Plan info */}
      <div className="bg-canvas-card rounded-xl border border-canvas-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600/20 to-primary-500/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h3 className="text-sm text-gray-200 font-semibold capitalize">{plan} Plan</h3>
              {billingCycle && (
                <span className="text-[10px] text-gray-600">Billing: {billingCycle}</span>
              )}
            </div>
          </div>
          {onUpgrade && plan !== 'enterprise' && (
            <button
              onClick={onUpgrade}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:opacity-90 transition-opacity"
            >
              Upgrade
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Usage metrics */}
      <div className="grid grid-cols-1 gap-3">
        {metrics.map((metric, i) => {
          const Icon = iconMap[metric.icon] || Zap;
          const colors = colorMap[metric.icon] || colorMap.tokens;
          const percentage = Math.min((metric.used / metric.limit) * 100, 100);
          const isNearLimit = percentage > 80;
          const isAtLimit = percentage >= 100;

          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-canvas-card rounded-xl border ${
                isAtLimit ? 'border-primary-500/20' : isNearLimit ? 'border-amber-500/20' : 'border-canvas-border'
              } p-4 hover:border-white/[0.1] transition-colors`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                  </div>
                  <span className="text-xs text-canvas-muted">{metric.label}</span>
                </div>

                {isNearLimit && (
                  <AlertTriangle className={`w-3.5 h-3.5 ${isAtLimit ? 'text-primary-400' : 'text-amber-400'}`} />
                )}
              </div>

              {/* Usage numbers */}
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-lg text-gray-200 font-semibold">
                  {formatNumber(metric.used)}
                </span>
                <span className="text-xs text-gray-600">
                  / {formatNumber(metric.limit)} {metric.unit}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${
                    isAtLimit
                      ? 'from-primary-500 to-primary-600'
                      : isNearLimit
                        ? 'from-amber-500 to-orange-500'
                        : colors.bar
                  }`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-[10px] ${isAtLimit ? 'text-primary-400' : isNearLimit ? 'text-amber-400' : 'text-gray-600'}`}>
                  {percentage.toFixed(0)}% used
                </span>
                {metric.resetDate && (
                  <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    Resets {metric.resetDate}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default UsageDashboard;
