'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useSubscriptionStatus(): SubscriptionStatus {
  const { state } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!state.isAuthenticated || !state.user) {
        setStatus({
          hasActiveSubscription: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

        const response = await fetch(
          `/api/agent/subscriptions/user/${state.user.id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to check subscription status: ${response.status}`
          );
        }

        const data = await response.json();

        // Check if user has any active subscriptions
        const hasActive =
          data.subscriptions?.some(
            (sub: any) =>
              sub.status === 'active' && new Date(sub.expiryDate) > new Date()
          ) || false;

        setStatus({
          hasActiveSubscription: hasActive,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setStatus({
          hasActiveSubscription: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    checkSubscriptionStatus();
  }, [state.isAuthenticated, state.user]);

  return status;
}
