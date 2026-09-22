'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Eye,
  Globe,
  Activity,
  MessageSquare,
  Wrench,
  CreditCard,
  Shield,
  Server,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Menu,
  X,
  Clock,
  Zap,
  BarChart3,
  ScrollText,
  MapPin,
  Mail,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    label: 'Overview',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    description: 'Real-time overview & KPIs',
  },
  {
    label: 'Visitors',
    href: '/admin/dashboard/visitors',
    icon: Eye,
    description: 'Visitor tracking & sessions',
  },
  {
    label: 'Users',
    href: '/admin/dashboard/users',
    icon: Users,
    description: 'User management & roles',
  },
  {
    label: 'Page Views',
    href: '/admin/dashboard/pageviews',
    icon: BarChart3,
    description: 'Content & page analytics',
  },
  {
    label: 'API Monitor',
    href: '/admin/dashboard/api',
    icon: Server,
    description: 'API usage & response times',
  },
  {
    label: 'Chats',
    href: '/admin/dashboard/chats',
    icon: MessageSquare,
    description: 'Chat analytics & tokens',
  },
  {
    label: 'Tools',
    href: '/admin/dashboard/tools',
    icon: Wrench,
    description: 'Tool usage analytics',
  },
  {
    label: 'Events',
    href: '/admin/dashboard/events',
    icon: Zap,
    description: 'User events & activity',
  },
  {
    label: 'Revenue',
    href: '/admin/dashboard/revenue',
    icon: CreditCard,
    description: 'Transactions & revenue',
  },
  {
    label: 'Geographic',
    href: '/admin/dashboard/geo',
    icon: Globe,
    description: 'Location & device breakdown',
  },
  {
    label: 'Activity Log',
    href: '/admin/dashboard/activity',
    icon: ScrollText,
    description: 'Real-time activity feed',
  },
  {
    label: 'Emails',
    href: '/admin/dashboard/emails',
    icon: Mail,
    description: 'Email delivery & open tracking',
  },
  {
    label: 'System Health',
    href: '/admin/dashboard/health',
    icon: Activity,
    description: 'Server & database health',
  },
  {
    label: 'Device Tracker',
    href: '/admin/dashboard/tracking',
    icon: MapPin,
    description: 'SecureTrace — all registered devices',
  },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [authenticated, setAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState('Admin');

  // AdminGate state
  const [gateState, setGateState] = useState<'loading' | 'gate' | 'verified'>('loading');
  const [gatePassword, setGatePassword] = useState('');
  const [gateTotpCode, setGateTotpCode] = useState('');
  const [gateError, setGateError] = useState('');
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [gateNeeds2FA, setGateNeeds2FA] = useState(false);
  const [gateUserEmail, setGateUserEmail] = useState('');

  // Auth check — verifies session + admin allow-list + admin_access cookie
  useEffect(() => {
    async function checkAdmin() {
      try {
        // 1. Verify user session
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();

        if (!data.valid || !data.user) {
          router.replace('/auth/login?redirect=/admin/dashboard');
          return;
        }

        if (data.user.role !== 'admin') {
          router.replace('/');
          return;
        }

        setAdminName(data.user.name || data.user.email || 'Admin');
        setAuthenticated(true);

        // 2. Check admin gate — do we have a valid admin_access cookie?
        const gateRes = await fetch('/api/auth/admin/check', {
          method: 'POST',
          credentials: 'include',
        });
        const gateData = await gateRes.json();

        if (gateData.success && gateData.alreadyVerified) {
          // Admin cookie valid — go straight to dashboard
          setGateState('verified');
        } else if (gateData.success && gateData.allowed) {
          // Admin email allowed but needs password re-auth
          setGateNeeds2FA(gateData.twoFactorEnabled || false);
          setGateUserEmail(gateData.user?.email || '');
          setGateState('gate');
        } else {
          // Not on allow-list
          router.replace('/');
        }
      } catch {
        router.replace('/auth/login?redirect=/admin/dashboard');
      }
    }
    checkAdmin();
  }, [router]);

  // AdminGate password submission
  async function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGateError('');
    setGateSubmitting(true);

    try {
      const res = await fetch('/api/auth/admin/verify-access', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: gatePassword,
          totpCode: gateTotpCode || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setGateState('verified');
      } else if (data.requires2FA) {
        setGateNeeds2FA(true);
        setGateError('Please enter your 2FA code.');
      } else {
        setGateError(data.message || 'Verification failed.');
      }
    } catch {
      setGateError('Network error. Please try again.');
    } finally {
      setGateSubmitting(false);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!authenticated || gateState === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // AdminGate — password re-auth screen
  if (gateState === 'gate') {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#111113] border border-white/[0.08] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Admin Access</h1>
                <p className="text-xs text-gray-500">{gateUserEmail}</p>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              Re-enter your password to access the admin dashboard. This session will last 4 hours.
            </p>

            <form onSubmit={handleGateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                <input
                  type="password"
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0c] border border-white/[0.08] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                  placeholder="Enter your password"
                  autoFocus
                  required
                />
              </div>

              {gateNeeds2FA && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">2FA Code</label>
                  <input
                    type="text"
                    value={gateTotpCode}
                    onChange={(e) => setGateTotpCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0a0a0c] border border-white/[0.08] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 font-mono tracking-widest text-center"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
              )}

              {gateError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{gateError}</p>
              )}

              <button
                type="submit"
                disabled={gateSubmitting || !gatePassword}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gateSubmitting ? 'Verifying...' : 'Verify & Enter Dashboard'}
              </button>
            </form>

            <button
              onClick={() => router.replace('/')}
              className="w-full mt-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back to Site
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          bg-[#0d0d10] border-r border-white/[0.06] transition-all duration-300
          ${collapsed ? 'w-[68px]' : 'w-[260px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold shrink-0">
            OL
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">
                Admin Dashboard
              </p>
              <p className="text-[10px] text-gray-500">One Last AI</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin/dashboard' &&
                pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${
                    isActive
                      ? 'text-violet-400'
                      : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                />
                {!collapsed && (
                  <div className="overflow-hidden">
                    <span className="block truncate">{item.label}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-white/[0.06] p-2 hidden lg:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-white/[0.06] bg-[#0d0d10]/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">
                {currentTime.toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              ← Back to Site
            </Link>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
