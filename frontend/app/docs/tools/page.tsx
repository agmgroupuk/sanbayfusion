'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin } from '@/lib/gsap';
import { Wrench, Globe, Shield, Code, Search, Terminal, Rocket } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin);

export default function ToolsDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);

  const toolCategories = [
    {
      name: 'Network Tools',
      icon: Globe,
      color: 'from-blue-500 to-cyan-500',
      tools: [
        { name: 'IP Info', desc: 'Look up detailed information about any IP address including location, ISP, and organization.', icon: '🌍' },
        { name: 'DNS Lookup', desc: 'Query DNS records (A, AAAA, MX, CNAME, TXT, NS) for any domain.', icon: '🔍' },
        { name: 'DNS Advanced', desc: 'Advanced DNS analysis with propagation checking and record history.', icon: '🔬' },
        { name: 'Port Scanner', desc: 'Scan open ports on any host to check service availability.', icon: '🔓' },
        { name: 'Ping Test', desc: 'Test network connectivity and measure response times to any host.', icon: '📡' },
        { name: 'Traceroute', desc: 'Trace the network path between you and a destination server.', icon: '🛤️' },
        { name: 'Speed Test', desc: 'Measure your internet download and upload speeds.', icon: '⚡' },
        { name: 'IP Geolocation', desc: 'Map IP addresses to physical locations with accuracy details.', icon: '📍' },
        { name: 'IP Netblocks', desc: 'Find all IP ranges owned by an organization or ISP.', icon: '🏢' },
        { name: 'MAC Lookup', desc: 'Identify the manufacturer of a network device from its MAC address.', icon: '💻' },
      ],
    },
    {
      name: 'Security Tools',
      icon: Shield,
      color: 'from-red-500 to-orange-500',
      tools: [
        { name: 'SSL Checker', desc: 'Verify SSL/TLS certificates, expiration dates, and cipher suites for any domain.', icon: '🔐' },
        { name: 'Threat Intelligence', desc: 'Check if an IP or domain is flagged in threat databases and blocklists.', icon: '🛡️' },
        { name: 'Domain Reputation', desc: 'Evaluate the trustworthiness and safety score of any domain.', icon: '⭐' },
      ],
    },
    {
      name: 'Domain Tools',
      icon: Search,
      color: 'from-green-500 to-emerald-500',
      tools: [
        { name: 'WHOIS Lookup', desc: 'Find domain registration details including registrar, creation date, and contact info.', icon: '📋' },
        { name: 'Domain Availability', desc: 'Check if a domain name is available for registration across multiple TLDs.', icon: '✅' },
        { name: 'Domain Research', desc: 'Deep analysis of domain history, DNS records, and related domains.', icon: '🔎' },
        { name: 'Website Category', desc: 'Classify any website into content categories for filtering and analysis.', icon: '🏷️' },
      ],
    },
    {
      name: 'Developer Tools',
      icon: Code,
      color: 'from-violet-500 to-purple-500',
      tools: [
        { name: 'JSON Formatter', desc: 'Format, validate, minify, and beautify JSON data with syntax highlighting.', icon: '📄' },
        { name: 'Base64 Encode/Decode', desc: 'Encode text to Base64 or decode Base64 strings with UTF-8 support.', icon: '🔤' },
        { name: 'UUID Generator', desc: 'Generate v1, v4, and v7 UUIDs — single or in bulk.', icon: '🆔' },
        { name: 'Regex Tester', desc: 'Test regular expressions with real-time matching, groups, and explanation.', icon: '🎯' },
        { name: 'Hash Generator', desc: 'Generate MD5, SHA-1, SHA-256, SHA-512 hashes of text or files.', icon: '#️⃣' },
        { name: 'Timestamp Converter', desc: 'Convert between Unix timestamps, ISO 8601, and human-readable dates.', icon: '🕐' },
        { name: 'URL Parser', desc: 'Parse URLs into components — protocol, host, path, query params, fragment.', icon: '🔗' },
        { name: 'Color Picker', desc: 'Pick colors, convert between HEX, RGB, HSL, and generate palettes.', icon: '🎨' },
        { name: 'Data Generator', desc: 'Generate realistic fake data — names, emails, addresses, phone numbers.', icon: '🎲' },
        { name: 'API Tester', desc: 'Send HTTP requests (GET, POST, PUT, DELETE) and inspect responses.', icon: '🔌' },
      ],
    },
  ];

  const stats = [
    { value: '29', label: 'Free Tools' },
    { value: '4', label: 'Categories' },
    { value: '0', label: 'Ads' },
    { value: '∞', label: 'Usage' },
  ];

  /* ── Stars canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize(); window.addEventListener('resize', resize);
    const colors = ['#ffffff', '#86efac', '#93c5fd', '#fde68a', '#fca5a5', '#c4b5fd'];
    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3, alpha: Math.random(), speed: Math.random() * 0.008 + 0.003,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed; if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
        ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        if (s.r > 1) { ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.15; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2); ctx.fill(); }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  /* ── GSAP ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-badge', { y: 30, opacity: 0, scale: 0.8 });
      gsap.set('.hero-title-wrap', { y: 50, opacity: 0 });
      gsap.set('.hero-icon', { scale: 0, rotation: -180 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
        .to('.hero-title-wrap', { y: 0, opacity: 1, duration: 0.8 }, '-=0.4')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.4')
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.3');

      if (typewriterRef.current) {
        const phrases = ['DNS lookup in seconds', 'Scan ports instantly', 'Format JSON beautifully', 'Generate UUIDs on demand', 'Test APIs with ease', 'Check SSL certificates'];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({ trigger: el, start: 'top 85%', onEnter: () => { gsap.to(el, { duration: 1.5, scrambleText: { text: originalText, chars: '0123456789∞+', speed: 0.4 }, delay: i * 0.1 }); } });
      });

      gsap.set('.tool-card', { y: 30, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.tool-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.04, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 30, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      gsap.set('.category-header', { x: -40, opacity: 0 });
      ScrollTrigger.batch('.category-header', { start: 'top 88%', onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }) });

      Observer.create({
        target: window, type: 'scroll',
        onChangeY: (self) => {
          gsap.to('.parallax-orb-1', { y: self.scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: self.scrollY * -0.1, duration: 0.4, ease: 'none' });
        }
      });

      gsap.to('.orbit-element', {
        motionPath: { path: [{ x: 0, y: 0 }, { x: 50, y: -25 }, { x: 100, y: 0 }, { x: 50, y: 25 }, { x: 0, y: 0 }], curviness: 2 },
        duration: 12, repeat: -1, ease: 'none'
      });

      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({ trigger: '.stats-section', start: 'top 80%', onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }) });

      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, { x: `random(-60, 60)`, y: `random(-40, 40)`, rotation: `random(-100, 100)`, duration: `random(5, 8)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.15 });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="parallax-orb-1 absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-orb-2 absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {[...Array(12)].map((_, i) => (<div key={i} className="float-particle absolute w-1.5 h-1.5 bg-emerald-400/20 rounded-full" style={{ left: `${8 + i * 7}%`, top: `${12 + (i % 5) * 16}%` }} />))}
        <div className="orbit-element absolute top-28 left-1/3 w-2 h-2 bg-emerald-400/40 rounded-full" />
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-sm rounded-2xl border border-emerald-500/30 mb-6">
            <span className="text-4xl">🛠️</span>
          </div>
          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #86efac, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Developer Tools</span>
            </h1>
          </div>
          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed font-light">
            29 free network, security, domain, and developer utilities — no ads, no sign-up required, unlimited usage
          </p>
          <div className="hero-badge flex justify-center mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-emerald-600/15 border border-emerald-500/25 backdrop-blur-sm">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/30">
                <Terminal className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="inline-block w-[2px] h-4 bg-emerald-400 ml-0.5 align-middle animate-pulse" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <svg className="absolute left-1/2 -translate-x-1/2 top-0 h-1 w-1/2 opacity-20" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#toolsGrad)" strokeWidth="2" />
            <defs><linearGradient id="toolsGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
          </svg>
          <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="grid grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="stat-value text-2xl font-bold text-emerald-400">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Launch CTA */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-emerald-500/30 backdrop-blur-sm overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4">Try Them Now — Free</h2>
              <p className="text-gray-400 mb-6">No sign-up, no ads. Just open and use any tool instantly.</p>
              <Link href="/tools" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
                <Rocket className="w-5 h-5" />
                Open Developer Tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tool Categories */}
      {toolCategories.map((category, catIdx) => {
        const CatIcon = category.icon;
        return (
          <section key={catIdx} className="relative z-10 py-10 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="category-header flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-white`}>
                  <CatIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{category.name}</h2>
                  <p className="text-sm text-gray-500">{category.tools.length} tools</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.tools.map((tool, idx) => (
                  <div key={idx} className="tool-card group relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">{tool.icon}</div>
                      <div>
                        <h3 className="font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{tool.name}</h3>
                        <p className="text-xs text-gray-500">{tool.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">All Tools, Always Free</h2>
              <p className="text-gray-400 mb-6">29 developer utilities at your fingertips. No sign-up, no limits, no ads.</p>
              <Link href="/tools" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
                🛠️ Open Developer Tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.5); }
      `}</style>
    </div>
  );
}
