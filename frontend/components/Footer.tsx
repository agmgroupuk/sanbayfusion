'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [isAnimated, setIsAnimated] = useState(false)
  const footerRef = useRef<HTMLElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const linksRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Mark as visible immediately to prevent flash of invisible content
    setIsAnimated(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scrollTriggerInstance: any = null;

    const initGSAP = async () => {
      // Check if all refs are available before running GSAP
      if (!footerRef.current || !brandRef.current || !linksRef.current || !ctaRef.current) {
        return;
      }

      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      // Kill any existing animations on these elements first
      gsap.killTweensOf([brandRef.current, linksRef.current, ctaRef.current]);

      // Animate elements when footer comes into view
      // Start from nearly visible (0.9) to prevent flash
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: footerRef.current,
          start: 'top 95%',
          toggleActions: 'play none none none'
        }
      });

      scrollTriggerInstance = tl.scrollTrigger;

      tl.fromTo(brandRef.current,
        { opacity: 0.9, x: -20 },
        { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }
      )
        .fromTo(linksRef.current,
          { opacity: 0.9, x: 20 },
          { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' },
          '-=0.4'
        )
        .fromTo(ctaRef.current,
          { opacity: 0.9, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.3'
        );
    };

    initGSAP();

    // Cleanup on unmount or re-render
    return () => {
      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
      }
    };

    initGSAP();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    setSubscribed(true)
    setEmail('')
    setTimeout(() => setSubscribed(false), 3000)
  }

  // All navigation links in one organized structure
  const footerLinks = [
    { name: 'Agents', href: '/agents' },
    { name: 'Demo', href: 'https://demo.sanbayfusion.com' },
    { name: 'Canvas', href: 'https://studio.sanbayfusion.com' },
    { name: 'Editor', href: 'https://editor.sanbayfusion.com' },
    { name: 'AI Lab', href: '/lab' },
    { name: 'Industries', href: '/industries' },
    { name: 'Pricing', href: '/overview' },
    { name: 'Dashboard', href: '/dashboard/overview' },
    { name: 'Documentation', href: '/docs' },
    { name: 'Community', href: '/community/overview' },
    { name: 'Resources', href: '/resources' },
    { name: 'Careers', href: '/resources/careers' },
    { name: 'All Tools', href: '/tools' },
    { name: 'Status', href: '/status' },
    { name: 'Rewards', href: '/rewards' },
  ]

  const bottomLinks = [
    { name: 'Support', href: '/support' },
    { name: 'About', href: '/about' },
    { name: 'Roadmap', href: '/community/roadmap' },
    { name: 'Legal', href: '/legal' },
  ]

  return (
    <footer ref={footerRef} className="relative bg-gradient-to-br from-neural-950 via-neural-900 to-neural-950 border-t border-white/10 w-full overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-brand-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-purple-500/10 via-accent-500/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-cyan-500/5 via-brand-500/5 to-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Main Footer - Clean 2-column grid */}
      <div className="relative z-10 container-custom py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">

          {/* Left Column: Brand & Description */}
          <div ref={brandRef}>
            <Link href="/home" className="flex items-center gap-3 mb-4 group">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-500/20 rounded-xl blur-xl group-hover:bg-brand-500/40 transition-all duration-300"></div>
                <Image
                  src="/images/logos/company-logo.png"
                  alt="Maula AI"
                  width={48}
                  height={48}
                  className="relative w-12 h-12 object-contain"
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white via-white to-neural-300 bg-clip-text text-transparent">
                Maula AI
              </span>
            </Link>
            <p className="text-neural-400 text-base leading-relaxed max-w-md mb-5">
              Transform your business with intelligent AI agents. 18+ specialized personalities ready to revolutionize how you work.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <a href="https://facebook.com/maulaai" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neural-400 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/30 transition-all duration-300" aria-label="Facebook">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://instagram.com/maulaai" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neural-400 hover:text-white hover:bg-pink-600/20 hover:border-pink-500/30 transition-all duration-300" aria-label="Instagram">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://tiktok.com/@maulaai" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neural-400 hover:text-white hover:bg-neutral-600/20 hover:border-neutral-500/30 transition-all duration-300" aria-label="TikTok">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-7.15a8.16 8.16 0 005.58 2.17V11.2a4.85 4.85 0 01-5.58-1.62v7.05"/></svg>
              </a>
              <a href="https://github.com/maulaai" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neural-400 hover:text-white hover:bg-gray-600/20 hover:border-gray-500/30 transition-all duration-300" aria-label="GitHub">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              </a>
              <a href="https://line.me/R/ti/p/@maulaai" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neural-400 hover:text-white hover:bg-green-600/20 hover:border-green-500/30 transition-all duration-300" aria-label="LINE">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              </a>
            </div>
          </div>

          {/* Right Column: Navigation Links - Brand Theme Style */}
          <div ref={linksRef}>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/10 shadow-lg hover:shadow-xl hover:border-brand-500/30 transition-all duration-300">
              <h3 className="text-xs sm:text-sm font-bold bg-gradient-to-r from-brand-400 via-accent-400 to-brand-500 bg-clip-text text-transparent uppercase tracking-wider mb-4 sm:mb-5">Quick Links</h3>
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-x-3 sm:gap-x-4 gap-y-2.5 sm:gap-y-3">
                {footerLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="group flex items-center text-neural-300 hover:text-white text-xs sm:text-sm font-medium transition-all duration-300"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-brand-400 to-accent-400 mr-0 group-hover:mr-2 transition-all duration-300 rounded-full"></span>
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Banner - Sky Blue with 2-column layout: Email left, App badges right */}
      <div ref={ctaRef} className="relative z-10 bg-[#4A9FD4] overflow-hidden">
        <div className="relative container-custom py-5 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 sm:gap-6">
            {/* Left: Email Subscription */}
            <form onSubmit={handleSubscribe} className="flex flex-col xs:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email for early access"
                className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white text-sm transition-all duration-300"
                required
              />
              <button
                type="submit"
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-[#4A9FD4] rounded-lg font-bold hover:bg-white/90 transition-all duration-300 text-sm whitespace-nowrap shadow-lg hover:shadow-xl hover:scale-105"
              >
                Subscribe
              </button>
            </form>
            {subscribed && (
              <p className="text-white text-sm flex items-center gap-2 md:hidden">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Thanks for subscribing!
              </p>
            )}

            {/* Right: App Store badges */}
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center md:justify-end items-center">
              {/* App Store Badge */}
              <div className="relative group">
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 transition-all duration-300 cursor-not-allowed">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-[8px] sm:text-[9px] text-white/80 leading-tight">Download on the</span>
                    <span className="text-xs sm:text-sm font-semibold text-white leading-tight">App Store</span>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-[8px] sm:text-[9px] font-bold text-white shadow-lg">
                  SOON
                </div>
              </div>

              {/* Google Play Badge */}
              <div className="relative group">
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 transition-all duration-300 cursor-not-allowed">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-[8px] sm:text-[9px] text-white/80 leading-tight">GET IT ON</span>
                    <span className="text-xs sm:text-sm font-semibold text-white leading-tight">Google Play</span>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-[8px] sm:text-[9px] font-bold text-white shadow-lg">
                  SOON
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Compact Dark Purple */}
      <div className="relative z-10 bg-purple-950 border-t border-purple-900/50">
        <div className="container-custom py-3 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-purple-300/70 text-[11px] sm:text-xs">
              © {currentYear} Maula AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
              {bottomLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-purple-300/70 hover:text-purple-200 text-[11px] sm:text-xs transition-all duration-300"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
