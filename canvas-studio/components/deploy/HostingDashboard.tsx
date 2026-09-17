/**
 * HostingDashboard — Analytics, bandwidth, requests overview
 * Beautiful metrics cards with sparklines and stats
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Globe,
  Clock,
  Zap,
  Eye,
  ArrowUp,
  ArrowDown,
  Activity,
  Server,
  Users,
  TrendingUp,
} from 'lucide-react';

export interface HostingMetric {
  label: string;
  value: string;
  change?: number; // percent change
  sparkline?: number[]; // last N data points
}

export interface HostingStats {
  totalRequests: HostingMetric;
  bandwidth: HostingMetric;
  avgResponseTime: HostingMetric;
  uniqueVisitors: HostingMetric;
  uptimePercent: HostingMetric;
  errorRate: HostingMetric;
}

interface HostingDashboardProps {
  stats: HostingStats;
  region?: string;
  lastDeployedAt?: string;
  className?: string;
}

const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({
  data,
  color,
  height = 24,
}) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = height;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkGrad-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sparkGrad-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const MetricCard: React.FC<{
  metric: HostingMetric;
  icon: React.FC<any>;
  color: string;
  sparkColor: string;
  delay: number;
}> = ({ metric, icon: Icon, color, sparkColor, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
    className="bg-canvas-card rounded-xl border border-canvas-border p-3 hover:border-white/[0.1] transition-colors group"
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-[10px] text-canvas-muted-deep uppercase tracking-wider font-medium">
            {metric.label}
          </span>
        </div>
        <div className="text-lg text-gray-200 font-semibold tracking-tight">{metric.value}</div>
        {metric.change !== undefined && (
          <div className="flex items-center gap-0.5 mt-0.5">
            {metric.change >= 0 ? (
              <ArrowUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <ArrowDown className="w-3 h-3 text-primary-400" />
            )}
            <span
              className={`text-[10px] font-medium ${
                metric.change >= 0 ? 'text-emerald-400' : 'text-primary-400'
              }`}
            >
              {Math.abs(metric.change).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {metric.sparkline && (
        <div className="opacity-60 group-hover:opacity-100 transition-opacity">
          <Sparkline data={metric.sparkline} color={sparkColor} />
        </div>
      )}
    </div>
  </motion.div>
);

const HostingDashboard: React.FC<HostingDashboardProps> = ({
  stats,
  region,
  lastDeployedAt,
  className = '',
}) => {
  const cards: {
    metric: HostingMetric;
    icon: React.FC<any>;
    color: string;
    sparkColor: string;
  }[] = [
    { metric: stats.totalRequests, icon: Activity, color: 'text-violet-400', sparkColor: '#8b5cf6' },
    { metric: stats.bandwidth, icon: BarChart3, color: 'text-cyan-400', sparkColor: '#06b6d4' },
    { metric: stats.avgResponseTime, icon: Clock, color: 'text-amber-400', sparkColor: '#f59e0b' },
    { metric: stats.uniqueVisitors, icon: Users, color: 'text-blue-400', sparkColor: '#3b82f6' },
    { metric: stats.uptimePercent, icon: Zap, color: 'text-emerald-400', sparkColor: '#10b981' },
    { metric: stats.errorRate, icon: TrendingUp, color: 'text-pink-400', sparkColor: '#ec4899' },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top info bar */}
      <div className="flex items-center gap-4 text-[11px] text-canvas-muted-deep">
        {region && (
          <span className="flex items-center gap-1">
            <Server className="w-3 h-3" />
            {region}
          </span>
        )}
        {lastDeployedAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last deployed: {lastDeployedAt}
          </span>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {cards.map((card, i) => (
          <MetricCard
            key={card.metric.label}
            metric={card.metric}
            icon={card.icon}
            color={card.color}
            sparkColor={card.sparkColor}
            delay={i * 0.05}
          />
        ))}
      </div>
    </div>
  );
};

export default HostingDashboard;
