'use client';

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { AgentSubscription } from '../services/agentSubscriptionService';
import { agentSubscriptionService } from '../services/agentSubscriptionService';

interface SubscriptionStatusProps {
  subscription: AgentSubscription;
  agentName: string;
  onManage?: () => void;
}

export default function SubscriptionStatus({
  subscription,
  agentName,
  onManage,
}: SubscriptionStatusProps) {
  const plan = agentSubscriptionService.getPlan(subscription.plan);
  const isExpiringSoon = agentSubscriptionService.isExpiringSoon(
    subscription.expiryDate
  );
  const formattedExpiry = agentSubscriptionService.formatExpiryDate(
    subscription.expiryDate
  );

  const getStatusColor = () => {
    if (subscription.status !== 'active')
      return 'text-red-600 bg-red-50 border-red-200';
    if (isExpiringSoon) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (subscription.status !== 'active') {
      return <ExclamationTriangleIcon className="h-5 w-5" />;
    }
    if (isExpiringSoon) {
      return <ClockIcon className="h-5 w-5" />;
    }
    return <CheckCircleIcon className="h-5 w-5" />;
  };

  const getStatusText = () => {
    if (subscription.status === 'expired') return 'Expired';
    if (subscription.status === 'cancelled') return 'Cancelled';
    if (isExpiringSoon) return 'Expiring Soon';
    return 'Active';
  };

  return (
    <div
      className={`
      border rounded-lg p-4 ${getStatusColor()}
    `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {getStatusIcon()}
          <div className="ml-3">
            <h3 className="font-medium">
              {agentName} - {plan?.displayName || subscription.plan}
            </h3>
            <div className="text-sm opacity-75">Status: {getStatusText()}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-semibold">
            {plan?.priceFormatted || `$${subscription.price}`}
          </div>
          <div className="text-sm opacity-75">
            per {plan?.period || subscription.plan.replace('ly', '')}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-current border-opacity-20">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="opacity-75">Expires: </span>
            <span className="font-medium">{formattedExpiry}</span>
          </div>

          <div className="flex items-center space-x-3">
            {onManage && (
              <button
                onClick={onManage}
                className="font-medium hover:underline"
              >
                Manage
              </button>
            )}
          </div>
        </div>

        {isExpiringSoon && subscription.status === 'active' && (
          <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-sm">
            <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
            Your plan expires in less than 24 hours. Purchase again to continue
            chatting.
          </div>
        )}

        {subscription.status !== 'active' && (
          <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-sm">
            <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
            {subscription.status === 'expired'
              ? 'Your plan has expired. Purchase again to continue chatting.'
              : 'Your plan was cancelled. Purchase again to continue chatting.'}
          </div>
        )}
      </div>
    </div>
  );
}
