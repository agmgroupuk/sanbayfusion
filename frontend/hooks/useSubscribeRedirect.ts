'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SubscribeRedirectOptions {
  agentName?: string;
  agentSlug?: string;
  plan?: string;
  intent?: string;
}

export function useSubscribeRedirect(
  defaultAgentName = 'AI Agent',
  defaultAgentSlug = 'agent'
) {
  const router = useRouter();

  return useCallback(
    (options?: SubscribeRedirectOptions) => {
      const agentName = options?.agentName ?? defaultAgentName;
      const agentSlug = options?.agentSlug ?? defaultAgentSlug;

      const params = new URLSearchParams({
        agent: agentName,
        slug: agentSlug,
      });

      if (options?.plan) {
        params.set('plan', options.plan);
      }

      if (options?.intent) {
        params.set('intent', options.intent);
      }

      const subscribeUrl = `https://maula.ai/subscribe?${params.toString()}`;
      window.location.href = subscribeUrl;
    },
    [defaultAgentName, defaultAgentSlug, router]
  );
}
