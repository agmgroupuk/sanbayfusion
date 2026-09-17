'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import {
  agentSubscriptionService,
  type AgentSubscription,
} from '@/services/agentSubscriptionService';

interface SubscriptionContextType {
  subscriptions: AgentSubscription[];
  loading: boolean;
  error: string | null;
  hasActiveSubscription: (agentId: string) => boolean;
  getSubscription: (agentId: string) => AgentSubscription | undefined;
  getDaysRemaining: (agentId: string) => number;
  refreshSubscriptions: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useAuth();
  const [subscriptions, setSubscriptions] = useState<AgentSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only calculating dates on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    if (!state.isAuthenticated || !state.user?.id) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the same service as dashboard - this is known to work
      const allSubscriptions =
        await agentSubscriptionService.getUserSubscriptions(state.user.id);

      // Store all subscriptions - filtering will happen client-side only
      setSubscriptions(allSubscriptions);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch subscriptions'
      );
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [state.isAuthenticated, state.user?.id]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const hasActiveSubscription = useCallback(
    (agentId: string): boolean => {
      // Return false during SSR to prevent hydration mismatch
      if (!mounted) return false;

      return subscriptions.some(
        (sub) =>
          sub.agentId === agentId &&
          sub.status === 'active' &&
          new Date(sub.expiryDate) > new Date()
      );
    },
    [subscriptions, mounted]
  );

  const getSubscription = useCallback(
    (agentId: string): AgentSubscription | undefined => {
      // Return undefined during SSR to prevent hydration mismatch
      if (!mounted) return undefined;

      return subscriptions.find(
        (sub) =>
          sub.agentId === agentId &&
          sub.status === 'active' &&
          new Date(sub.expiryDate) > new Date()
      );
    },
    [subscriptions, mounted]
  );

  const getDaysRemaining = useCallback(
    (agentId: string): number => {
      // Return 0 during SSR to prevent hydration mismatch
      if (!mounted) return 0;

      const sub = getSubscription(agentId);
      if (!sub) return 0;

      const now = new Date();
      const expiry = new Date(sub.expiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return Math.max(0, diffDays);
    },
    [getSubscription, mounted]
  );

  const refreshSubscriptions = useCallback(async () => {
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        loading,
        error,
        hasActiveSubscription,
        getSubscription,
        getDaysRemaining,
        refreshSubscriptions,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      'useSubscriptions must be used within a SubscriptionProvider'
    );
  }
  return context;
}

export default SubscriptionContext;
