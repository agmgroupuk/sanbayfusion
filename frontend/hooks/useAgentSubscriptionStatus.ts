'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AgentSubscriptionStatus {
  hasSubscription: boolean;
  isLoading: boolean;
  error: string | null;
  subscriptionDetails: {
    status?: string;
    plan?: string;
    expiryDate?: string;
  } | null;
  refetch: () => void;
}

/**
 * Hook to check if user has an active subscription for a specific agent
 * @param agentId - The ID/slug of the agent to check subscription for
 * @returns Subscription status for the specific agent
 */
export function useAgentSubscriptionStatus(agentId: string): AgentSubscriptionStatus {
  const { state } = useAuth();
  const [status, setStatus] = useState<Omit<AgentSubscriptionStatus, 'refetch'>>({
    hasSubscription: false,
    isLoading: true,
    error: null,
    subscriptionDetails: null,
  });

  const checkSubscriptionStatus = useCallback(async () => {
    // Not authenticated - no subscription
    if (!state.isAuthenticated || !state.user) {
      setStatus({
        hasSubscription: false,
        isLoading: false,
        error: null,
        subscriptionDetails: null,
      });
      return;
    }

    // No agentId provided
    if (!agentId) {
      setStatus({
        hasSubscription: false,
        isLoading: false,
        error: 'No agent ID provided',
        subscriptionDetails: null,
      });
      return;
    }

    try {
      setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(
        `/api/agent/subscriptions/check/${state.user.id}/${agentId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        // 404 means no subscription found - not an error
        if (response.status === 404) {
          setStatus({
            hasSubscription: false,
            isLoading: false,
            error: null,
            subscriptionDetails: null,
          });
          return;
        }
        throw new Error(`Failed to check subscription: ${response.status}`);
      }

      const data = await response.json();

      // Check if subscription is active and not expired
      const isActive = 
        data.hasSubscription === true || 
        (data.subscription?.status === 'active' && 
         new Date(data.subscription?.expiryDate) > new Date());

      setStatus({
        hasSubscription: isActive,
        isLoading: false,
        error: null,
        subscriptionDetails: data.subscription || null,
      });
    } catch (error) {
      console.error('Error checking agent subscription:', error);
      setStatus({
        hasSubscription: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        subscriptionDetails: null,
      });
    }
  }, [state.isAuthenticated, state.user, agentId]);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  return {
    ...status,
    refetch: checkSubscriptionStatus,
  };
}
