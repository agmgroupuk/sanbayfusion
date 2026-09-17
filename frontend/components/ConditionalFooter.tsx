'use client';

import { usePathname } from 'next/navigation';
import FooterGSAP from '@/components/FooterGSAP';

export default function ConditionalFooter() {
  const pathname = usePathname();

  // Hide footer on specific pages
  const isRootChatPage = pathname === '/';
  const isAgentPage = pathname?.startsWith('/agents/');
  const isAuthPage = pathname?.startsWith('/auth/');
  const isDashboardPage = pathname?.startsWith('/dashboard');
  const isLiveSupportPage = pathname === '/support/live-support';
  const isLabPage = pathname?.startsWith('/lab');
  const isToolsPage = pathname?.startsWith('/tools');
  const isCanvasStudioPage = pathname === '/canvas-studio';
  const isBlogPage = pathname === '/resources/blog';

  // Don't render footer on these pages
  if (
    isRootChatPage ||
    isAgentPage ||
    isAuthPage ||
    isDashboardPage ||
    isLiveSupportPage ||
    isLabPage ||
    isToolsPage ||
    isCanvasStudioPage ||
    isBlogPage
  ) {
    return null;
  }

  return <FooterGSAP key={pathname} />;
}
