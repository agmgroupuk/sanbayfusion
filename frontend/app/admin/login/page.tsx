'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /admin/login — redirects to the normal user login page.
 * Admin flow: sign in as a regular user first → navigate to /admin/dashboard
 * → re-verify with password + optional 2FA.
 * Only admin@maula.ai can proceed.
 */
export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login?redirect=/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
