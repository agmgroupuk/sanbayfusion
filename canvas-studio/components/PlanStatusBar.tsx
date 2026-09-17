/**
 * Canvas Studio Plan Status Bar
 * Shows current plan status: active plan type, time remaining, etc.
 */

import React from 'react';
import { Crown, Clock, Infinity, AlertTriangle } from 'lucide-react';

export interface PlanInfo {
  type: 'weekly' | 'monthly' | 'lifetime';
  price: number;
  startDate: string;
  expiryDate: string | null;
  isLifetime: boolean;
  daysRemaining: number | null;
  hoursRemaining: number | null;
}

interface PlanStatusBarProps {
  plan: PlanInfo;
}

const PlanStatusBar: React.FC<PlanStatusBarProps> = ({ plan }) => {
  const isExpiringSoon = plan.daysRemaining !== null && plan.daysRemaining <= 1;

  if (plan.isLifetime) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <Crown className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-amber-300 text-xs font-medium">Yearly Plan</span>
        <span className="text-white/30 text-xs">•</span>
        <Clock className="w-3 h-3 text-white/40" />
        <span className="text-white/40 text-xs">{plan.daysRemaining}d left</span>
      </div>
    );
  }

  if (isExpiringSoon) {
    const hrs = plan.hoursRemaining || 0;
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-primary-300 text-xs font-medium">
          {hrs > 0 ? `${hrs}h remaining` : 'Expiring soon'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
      <Crown className="w-3.5 h-3.5 text-violet-400" />
      <span className="text-violet-300 text-xs font-medium">
        {plan.type.charAt(0).toUpperCase() + plan.type.slice(1)} Plan
      </span>
      <span className="text-white/30 text-xs">•</span>
      <Clock className="w-3 h-3 text-white/40" />
      <span className="text-white/40 text-xs">
        {plan.daysRemaining}d left
      </span>
    </div>
  );
};

export default PlanStatusBar;
