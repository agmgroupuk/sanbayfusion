'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { gsap } from '@/lib/gsap';

export default function Header() {
  const { state, logout } = useAuth();
  const pathname = usePathname();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Track scroll for frosted glass intensity
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // GSAP: header entry
  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(headerRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.1 }
    );
  }, []);

  // GSAP: mobile menu slide
  useEffect(() => {
    if (!mobileMenuRef.current) return;
    if (isMenuOpen) {
      gsap.fromTo(mobileMenuRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      // Stagger links
      const links = mobileMenuRef.current.querySelectorAll('.mobile-link');
      gsap.fromTo(links, { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out', delay: 0.1 });
    }
  }, [isMenuOpen]);

  // Hide header on agent chat pages, canvas-studio, and root chat page
  if (
    pathname === '/' ||
    (pathname?.startsWith('/agents/') &&
      pathname !== '/agents' &&
      pathname !== '/agents/categories') ||
    pathname === '/canvas-studio'
  ) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navigation: Array<{
    name: string;
    href: string;
    hasDropdown?: boolean;
    items?: Array<{ name: string; href: string }>;
  }> = [
      { name: 'Agents', href: '/agents' },
      { name: 'Tools', href: '/tools' },
      { name: 'Status', href: '/status' },
      { name: 'Demo', href: 'https://demo.sanbayfusion.com' },
      { name: 'AI Lab', href: '/lab' },
      { name: 'AI Space', href: 'https://canvas.sanbayfusion.com' },
      { name: 'Canvas', href: 'https://studio.sanbayfusion.com' },
      { name: 'Editor', href: 'https://editor.sanbayfusion.com' },
      { name: 'Apps', href: '/apps' },
    ];

  const isActive = (href: string) => pathname === href;

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'rgba(3,3,4,0.85)' : 'rgba(3,3,4,0.65)',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'blur(12px) saturate(1.1)',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'blur(12px) saturate(1.1)',
        borderBottom: scrolled ? '1px solid rgba(147,197,253,0.08)' : '1px solid rgba(147,197,253,0.04)',
        boxShadow: scrolled
          ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(147,197,253,0.03), inset 0 -1px 0 rgba(0,0,0,0.3)'
          : '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      {/* Top frost edge */}
      <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.1) 20%, rgba(186,230,253,0.15) 50%, rgba(147,197,253,0.1) 80%, transparent)',
        opacity: scrolled ? 1 : 0.5,
        transition: 'opacity 0.5s',
      }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/home" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-[-3px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(circle, rgba(147,197,253,0.15) 0%, transparent 70%)' }} />
              <Image
                src="/images/logos/company-logo.png"
                alt="Maula AI"
                width={36}
                height={36}
                className="relative w-9 h-9 object-contain"
              />
            </div>
            <span className="text-lg font-bold transition-all duration-300" style={{
              background: 'linear-gradient(135deg, #e2e8f0 0%, #bae6fd 50%, #93c5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Maula AI
            </span>
          </Link>

          {/* ── Desktop Navigation ── */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navigation.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className="relative px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-300 group"
                  style={{
                    color: isActive(item.href) ? 'rgba(186,230,253,1)' : 'rgba(148,163,184,0.8)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.href)) {
                      e.currentTarget.style.color = 'rgba(186,230,253,0.9)';
                      e.currentTarget.style.background = 'rgba(147,197,253,0.06)';
                      e.currentTarget.style.textShadow = '0 0 12px rgba(147,197,253,0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.href)) {
                      e.currentTarget.style.color = 'rgba(148,163,184,0.8)';
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.textShadow = 'none';
                    }
                  }}
                >
                  {item.name}
                  {item.hasDropdown && (
                    <svg className="w-3.5 h-3.5 ml-1 inline opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                  {/* Active indicator frost line */}
                  {isActive(item.href) && (
                    <span className="absolute bottom-0 left-3 right-3 h-px" style={{
                      background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.5), transparent)',
                    }} />
                  )}
                </Link>

                {/* Dropdown */}
                {item.hasDropdown && activeDropdown === item.name && (
                  <div className="absolute top-full left-0 mt-2 w-56 py-2 rounded-xl z-50 overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(3,3,4,0.9)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(147,197,253,0.1)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(147,197,253,0.04), inset 0 1px 0 rgba(186,230,253,0.05)',
                    }}>
                    {/* Frost sheen on dropdown */}
                    <div className="absolute top-0 left-0 right-0 h-8 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(186,230,253,0.03) 0%, transparent 100%)' }} />
                    {item.items?.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className="relative block px-4 py-2.5 text-sm text-slate-400 transition-all duration-200"
                        style={{}}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'rgba(186,230,253,1)';
                          e.currentTarget.style.background = 'rgba(147,197,253,0.06)';
                          e.currentTarget.style.textShadow = '0 0 8px rgba(147,197,253,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'rgba(148,163,184,1)';
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.textShadow = 'none';
                        }}
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* ── CTA Buttons ── */}
          <div className="hidden lg:flex items-center gap-2.5">
            {state.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-300/40 border-t-blue-300 rounded-full animate-spin" />
                <span className="text-sm text-slate-500">Loading...</span>
              </div>
            ) : state.isAuthenticated ? (
              <>
                <Link href="/dashboard/overview"
                  className="px-4 py-2 text-sm font-medium rounded-xl text-white transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.5) 0%, rgba(6,182,212,0.35) 100%)',
                    border: '1px solid rgba(147,197,253,0.2)',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.15), inset 0 1px 0 rgba(186,230,253,0.1)',
                  }}>
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium rounded-xl text-slate-400 transition-all duration-300"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(147,197,253,0.08)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(248,113,113,0.9)';
                    e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)';
                    e.currentTarget.style.background = 'rgba(248,113,113,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(148,163,184,1)';
                    e.currentTarget.style.borderColor = 'rgba(147,197,253,0.08)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/auth/signup"
                className="px-5 py-2 text-sm font-medium rounded-xl text-white transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.55) 0%, rgba(6,182,212,0.4) 100%)',
                  border: '1px solid rgba(147,197,253,0.2)',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.15), inset 0 1px 0 rgba(186,230,253,0.12)',
                }}>
                Sign Up
              </Link>
            )}
          </div>

          {/* ── Mobile Menu Button ── */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg transition-all duration-300"
            style={{
              color: isMenuOpen ? 'rgba(186,230,253,0.9)' : 'rgba(148,163,184,0.7)',
              background: isMenuOpen ? 'rgba(147,197,253,0.08)' : 'transparent',
              border: `1px solid ${isMenuOpen ? 'rgba(147,197,253,0.15)' : 'transparent'}`,
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {isMenuOpen && (
          <div ref={mobileMenuRef} className="lg:hidden overflow-hidden"
            style={{ borderTop: '1px solid rgba(147,197,253,0.06)' }}>
            <div className="py-4 space-y-1">
              {navigation.map((item) => (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className="mobile-link block px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      color: isActive(item.href) ? 'rgba(186,230,253,1)' : 'rgba(148,163,184,0.8)',
                      background: isActive(item.href) ? 'rgba(147,197,253,0.06)' : 'transparent',
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.hasDropdown && (
                    <div className="ml-4 space-y-0.5">
                      {item.items?.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className="mobile-link block px-4 py-2 text-sm text-slate-500 transition-colors duration-200"
                          onClick={() => setIsMenuOpen(false)}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(186,230,253,0.8)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(100,116,139,1)'; }}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Mobile CTA */}
              <div className="pt-4 space-y-2" style={{ borderTop: '1px solid rgba(147,197,253,0.06)' }}>
                {state.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <div className="w-4 h-4 border-2 border-blue-300/40 border-t-blue-300 rounded-full animate-spin" />
                    <span className="text-sm text-slate-500">Loading...</span>
                  </div>
                ) : state.isAuthenticated ? (
                  <>
                    <Link href="/dashboard" className="mobile-link block text-center px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.5) 0%, rgba(6,182,212,0.35) 100%)',
                        border: '1px solid rgba(147,197,253,0.15)',
                        boxShadow: '0 4px 12px rgba(59,130,246,0.1), inset 0 1px 0 rgba(186,230,253,0.08)',
                      }}
                      onClick={() => setIsMenuOpen(false)}>
                      Dashboard
                    </Link>
                    <button onClick={handleLogout}
                      className="mobile-link block w-full text-center px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 transition-all"
                      style={{ border: '1px solid rgba(147,197,253,0.08)' }}>
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" className="mobile-link block text-center px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 transition-all"
                      style={{ border: '1px solid rgba(147,197,253,0.08)' }}
                      onClick={() => setIsMenuOpen(false)}>
                      Login
                    </Link>
                    <Link href="/auth/signup" className="mobile-link block text-center px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.5) 0%, rgba(6,182,212,0.35) 100%)',
                        border: '1px solid rgba(147,197,253,0.15)',
                        boxShadow: '0 4px 12px rgba(59,130,246,0.1), inset 0 1px 0 rgba(186,230,253,0.08)',
                      }}
                      onClick={() => setIsMenuOpen(false)}>
                      Sign Up
                    </Link>
                    <Link href="/agents" className="mobile-link block text-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        color: 'rgba(186,230,253,0.8)',
                        background: 'rgba(147,197,253,0.04)',
                        border: '1px solid rgba(147,197,253,0.1)',
                      }}
                      onClick={() => setIsMenuOpen(false)}>
                      Try Agents
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
