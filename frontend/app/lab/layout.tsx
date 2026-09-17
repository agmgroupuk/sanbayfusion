'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';

/**
 * Lab Layout - Protects all individual experiment pages with subscription check
 *
 * This layout wraps all pages under /lab/* EXCEPT:
 * - /lab (main listing page - has its own card locking)
 */

export default function LabLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Main lab page shows locked cards, don't need full-page protection
  if (pathname === '/lab') {
    return <>{children}</>;
  }

  // All individual experiment pages require subscription
  return (
    <SubscriptionGuard message="Access to AI Lab experiments requires an active subscription.">
      {children}
    </SubscriptionGuard>
  );
}
