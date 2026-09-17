'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Network,
  Globe,
  Wifi,
  MapPin,
  Shield,
  Activity,
  Server,
  Radio,
  Code,
  Search,
  Tag,
  Award,
  Cpu,
  Hash,
  FileJson,
  Clock,
  Palette,
  Key,
  Binary,
  Code2,
  Wrench,
  Sparkles,
  Zap,
  ArrowRight,
  ChevronRight,
  Layers,
  Terminal,
  Star,
} from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer } from '@/lib/gsap';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { LockedCard } from '@/components/LockedCard';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer);

const networkTools = [
  {
    id: 'ip-info',
    name: 'IP Information',
    description: 'Get detailed information about any IP address including geolocation, ISP, and more',
    icon: MapPin,
    href: '/tools/ip-info',
    color: 'from-blue-500 to-cyan-500',
    glow: 'rgba(6,182,212,0.4)',
  },
  {
    id: 'dns-lookup',
    name: 'DNS Lookup',
    description: 'Perform DNS queries and check domain name system records',
    icon: Globe,
    href: '/tools/dns-lookup',
    color: 'from-purple-500 to-pink-500',
    glow: 'rgba(168,85,247,0.4)',
  },
  {
    id: 'port-scanner',
    name: 'Port Scanner',
    description: 'Scan ports on any host to check open ports and services',
    icon: Server,
    href: '/tools/port-scanner',
    color: 'from-green-500 to-emerald-500',
    glow: 'rgba(16,185,129,0.4)',
  },
  {
    id: 'ping-test',
    name: 'Ping Test',
    description: 'Test network connectivity and measure latency to any host',
    icon: Activity,
    href: '/tools/ping-test',
    color: 'from-orange-500 to-red-500',
    glow: 'rgba(249,115,22,0.4)',
  },
  {
    id: 'traceroute',
    name: 'Traceroute',
    description: 'Trace the path packets take to reach a destination',
    icon: Radio,
    href: '/tools/traceroute',
    color: 'from-indigo-500 to-purple-500',
    glow: 'rgba(99,102,241,0.4)',
  },
  {
    id: 'whois',
    name: 'WHOIS Lookup',
    description: 'Query WHOIS database for domain registration information',
    icon: Shield,
    href: '/tools/whois-lookup',
    color: 'from-yellow-500 to-orange-500',
    glow: 'rgba(234,179,8,0.4)',
  },
  {
    id: 'ssl-checker',
    name: 'SSL Certificate Checker',
    description: 'Check SSL certificate details and validity for any website',
    icon: Shield,
    href: '/tools/ssl-checker',
    color: 'from-teal-500 to-green-500',
    glow: 'rgba(20,184,166,0.4)',
  },
  {
    id: 'speed-test',
    name: 'Speed Test',
    description: 'Test your internet connection speed and bandwidth',
    icon: Wifi,
    href: '/tools/speed-test',
    color: 'from-pink-500 to-rose-500',
    glow: 'rgba(236,72,153,0.4)',
  },
  {
    id: 'api-tester',
    name: 'API Tester',
    description: 'Professional API testing tool with presets, authentication, and advanced features',
    icon: Code,
    href: '/tools/api-tester',
    color: 'from-violet-500 to-purple-500',
    glow: 'rgba(139,92,246,0.4)',
  },
  {
    id: 'ip-geolocation',
    name: 'IP Geolocation API',
    description: 'Get detailed location and ISP information for any IP address using WHOIS XML API',
    icon: MapPin,
    href: '/tools/ip-geolocation',
    color: 'from-cyan-500 to-blue-500',
    glow: 'rgba(6,182,212,0.4)',
  },
  {
    id: 'dns-lookup-advanced',
    name: 'DNS Lookup API',
    description: 'Get comprehensive DNS records (A, AAAA, MX, NS, TXT, CNAME, SOA) for any domain',
    icon: Server,
    href: '/tools/dns-lookup-advanced',
    color: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.4)',
  },
  {
    id: 'domain-availability',
    name: 'Domain Availability',
    description: 'Check if your desired domain name is available across popular TLDs',
    icon: Search,
    href: '/tools/domain-availability',
    color: 'from-rose-500 to-pink-500',
    glow: 'rgba(244,63,94,0.4)',
  },
  {
    id: 'website-categorization',
    name: 'Website Categorization',
    description: 'Automatically classify websites into content categories for filtering and analysis',
    icon: Tag,
    href: '/tools/website-categorization',
    color: 'from-amber-500 to-yellow-500',
    glow: 'rgba(245,158,11,0.4)',
  },
  {
    id: 'threat-intelligence',
    name: 'Threat Intelligence',
    description: 'Scan domains and IPs for security threats, malware, phishing, and malicious activity',
    icon: Shield,
    href: '/tools/threat-intelligence',
    color: 'from-red-500 to-rose-500',
    glow: 'rgba(239,68,68,0.4)',
  },
  {
    id: 'domain-reputation',
    name: 'Domain Reputation',
    description: 'Check domain trustworthiness and security reputation with scoring analysis',
    icon: Award,
    href: '/tools/domain-reputation',
    color: 'from-indigo-500 to-blue-500',
    glow: 'rgba(99,102,241,0.4)',
  },
  {
    id: 'ip-netblocks',
    name: 'IP Netblocks Lookup',
    description: 'Get IP range and network block information for any IP address',
    icon: Network,
    href: '/tools/ip-netblocks',
    color: 'from-lime-500 to-green-500',
    glow: 'rgba(132,204,22,0.4)',
  },
  {
    id: 'mac-lookup',
    name: 'MAC Address Lookup',
    description: 'Find manufacturer and vendor information for any MAC address',
    icon: Cpu,
    href: '/tools/mac-lookup',
    color: 'from-sky-500 to-cyan-500',
    glow: 'rgba(14,165,233,0.4)',
  },
  {
    id: 'domain-research',
    name: 'Domain Research Suite',
    description: 'Comprehensive domain history, analysis, and research tools',
    icon: Search,
    href: '/tools/domain-research',
    color: 'from-fuchsia-500 to-purple-500',
    glow: 'rgba(217,70,239,0.4)',
  },
];

const developerTools = [
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, validate, and beautify JSON data with syntax highlighting',
    icon: FileJson,
    href: '/tools/json-formatter',
    color: 'from-blue-500 to-cyan-500',
    glow: 'rgba(6,182,212,0.4)',
  },
  {
    id: 'base64',
    name: 'Base64 Encoder/Decoder',
    description: 'Encode and decode Base64 strings easily',
    icon: Binary,
    href: '/tools/base64',
    color: 'from-purple-500 to-pink-500',
    glow: 'rgba(168,85,247,0.4)',
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256, and other hash values',
    icon: Hash,
    href: '/tools/hash-generator',
    color: 'from-green-500 to-emerald-500',
    glow: 'rgba(16,185,129,0.4)',
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Generate unique identifiers (UUID/GUID) in various formats',
    icon: Key,
    href: '/tools/uuid-generator',
    color: 'from-orange-500 to-red-500',
    glow: 'rgba(249,115,22,0.4)',
  },
  {
    id: 'color-picker',
    name: 'Color Picker',
    description: 'Pick colors and convert between HEX, RGB, HSL formats',
    icon: Palette,
    href: '/tools/color-picker',
    color: 'from-indigo-500 to-purple-500',
    glow: 'rgba(99,102,241,0.4)',
  },
  {
    id: 'timestamp',
    name: 'Timestamp Converter',
    description: 'Convert between Unix timestamps and human-readable dates',
    icon: Clock,
    href: '/tools/timestamp-converter',
    color: 'from-yellow-500 to-orange-500',
    glow: 'rgba(234,179,8,0.4)',
  },
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test and debug regular expressions with live matching',
    icon: Code2,
    href: '/tools/regex-tester',
    color: 'from-teal-500 to-green-500',
    glow: 'rgba(20,184,166,0.4)',
  },
  {
    id: 'url-parser',
    name: 'URL Parser',
    description: 'Parse and decode URLs to extract components',
    icon: Code2,
    href: '/tools/url-parser',
    color: 'from-pink-500 to-rose-500',
    glow: 'rgba(236,72,153,0.4)',
  },
  {
    id: 'data-generator',
    name: 'Data Generator',
    description: 'Generate fake data for testing: names, emails, addresses, and more',
    icon: Server,
    href: '/tools/data-generator',
    color: 'from-emerald-500 to-green-500',
    glow: 'rgba(16,185,129,0.4)',
  },
];

export default function ToolsPage() {
  const { hasActiveSubscription } = useSubscriptionStatus();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const typewriterRef = useRef<HTMLSpanElement>(null);

  // Track mouse for global shine effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('toolWiggle', { wiggles: 6, type: 'easeOut' });
      CustomEase.create('toolBounce', 'M0,0 C0.14,0 0.27,0.9 0.5,1 0.73,1.1 0.86,1 1,1');

      // Smooth scroll
      gsap.to(containerRef.current, {
        scrollBehavior: 'smooth',
      });

      // Nebula orbs — slow floating
      gsap.to('.nebula-orb', {
        x: 'random(-120, 120)',
        y: 'random(-80, 80)',
        scale: 'random(0.6, 1.4)',
        opacity: 'random(0.03, 0.08)',
        duration: 12,
        ease: 'sine.inOut',
        stagger: { each: 2, repeat: -1, yoyo: true },
      });

      // Stardust particles
      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
        gsap.to(p, {
          y: '-=200',
          x: `random(-60, 60)`,
          opacity: 0,
          duration: 4 + Math.random() * 6,
          repeat: -1,
          delay: i * 0.3,
          ease: 'power1.out',
          onRepeat: function () {
            gsap.set(p, { y: '+=200', opacity: 0.6 });
          }
        });
        gsap.to(p, {
          scale: 'random(0.5, 1.5)',
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      // Hero title entrance
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 60, filter: 'blur(20px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 }
        );
      }

      // Subtitle entrance
      if (subtitleRef.current) {
        gsap.fromTo(subtitleRef.current,
          { opacity: 0, y: 40, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 }
        );
      }

      // Typewriter animation for tool capabilities
      if (typewriterRef.current) {
        const phrases = [
          'Scan ports & detect services',
          'Lookup DNS records instantly',
          'Test API endpoints live',
          'Generate UUIDs & hashes',
          'Check SSL certificates',
          'Format & validate JSON',
          'Trace network routes',
          'Encode & decode Base64',
          'Analyze domain reputation',
          'Pick & convert colors',
        ];
        let phraseIndex = 0;
        const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase, i) => {
          tl.to(typewriterRef.current, {
            duration: 0.6,
            text: { value: phrase, delimiter: '' },
            ease: 'none',
          });
          tl.to({}, { duration: 2 }); // pause to read
          tl.to(typewriterRef.current, {
            duration: 0.3,
            text: { value: '', delimiter: '' },
            ease: 'none',
          });
        });
      }

      // Hero icon pulse with luxurious glow
      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(139, 92, 246, 0.5), 0 0 160px rgba(139, 92, 246, 0.2), inset 0 0 30px rgba(139, 92, 246, 0.1)',
        scale: 1.08,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Rotating ring around hero icon
      gsap.to('.hero-ring', {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: 'none',
      });

      // Stats cards 3D entrance
      if (statsRef.current) {
        const statCards = statsRef.current.querySelectorAll('.stat-card');
        gsap.from(statCards, {
          scrollTrigger: { trigger: statsRef.current, start: 'top 85%' },
          opacity: 0,
          y: 80,
          rotationX: -40,
          scale: 0.85,
          stagger: 0.15,
          duration: 1,
          ease: 'back.out(1.7)',
        });

        statCards.forEach((card) => {
          const valueEl = card.querySelector('.stat-value');
          if (valueEl && valueEl.textContent) {
            const text = valueEl.textContent;
            if (text.includes('+')) {
              const num = parseInt(text);
              gsap.from(valueEl, {
                textContent: 0,
                duration: 2.5,
                ease: 'power2.out',
                snap: { textContent: 1 },
                scrollTrigger: { trigger: card, start: 'top 85%' },
                onUpdate: function () {
                  const current = Math.round(gsap.getProperty(this.targets()[0], 'textContent') as number);
                  (valueEl as HTMLElement).textContent = `${current}+`;
                },
              });
            }
          }
        });
      }

      // Section headers fade in
      gsap.utils.toArray<HTMLElement>('.section-header').forEach((header) => {
        gsap.from(header, {
          scrollTrigger: { trigger: header, start: 'top 90%' },
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: 'power3.out',
        });
      });

      // Tool cards staggered reveal with scroll
      const toolCards = document.querySelectorAll('.tool-card');
      toolCards.forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 90%' },
          opacity: 0,
          y: 60,
          scale: 0.92,
          duration: 0.7,
          delay: (i % 4) * 0.08,
          ease: 'power3.out',
        });
      });

      // Scan line effect
      gsap.to('.scan-line', {
        y: '100vh',
        duration: 8,
        repeat: -1,
        ease: 'none',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Card hover with tilt + glow
  const handleCardHover = (toolId: string, isEntering: boolean) => {
    const card = document.querySelector(`[data-tool-id="${toolId}"]`);
    if (!card) return;

    if (isEntering) {
      setHoveredTool(toolId);
      gsap.to(card, { y: -10, scale: 1.03, duration: 0.4, ease: 'power2.out' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 1, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 1, duration: 0.3 });
      gsap.to(card.querySelector('.tool-icon-wrap'), {
        scale: 1.15, rotate: 8, duration: 0.5, ease: 'back.out(2)',
      });
      gsap.to(card.querySelector('.tool-arrow'), { x: 6, opacity: 1, duration: 0.3 });
    } else {
      setHoveredTool(null);
      gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 0, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 0, duration: 0.3 });
      gsap.to(card.querySelector('.tool-icon-wrap'), {
        scale: 1, rotate: 0, duration: 0.4, ease: 'power2.out',
      });
      gsap.to(card.querySelector('.tool-arrow'), { x: 0, opacity: 0.3, duration: 0.3 });
    }
  };

  // 3D tilt on mouse move
  const handleCardMove = (e: React.MouseEvent, toolId: string) => {
    const card = document.querySelector(`[data-tool-id="${toolId}"]`) as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;

    gsap.to(card, {
      rotateY: x * 8,
      rotateX: -y * 8,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Shine follows mouse
    const shine = card.querySelector('.card-shine') as HTMLElement;
    if (shine) {
      shine.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`;
    }
  };

  const handleCardLeave = (toolId: string) => {
    const card = document.querySelector(`[data-tool-id="${toolId}"]`);
    if (!card) return;
    gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };

  const allTools = [...networkTools, ...developerTools];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

      {/* ═══ DEEP DARK BACKGROUND LAYER ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Ultra-subtle nebula blobs */}
        <div className="nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />

        {/* Micro grid — very faint */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Horizontal scan line */}
        <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ top: '-2px' }} />

        {/* Stardust particles */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="stardust absolute rounded-full"
            style={{
              left: `${3 + i * 4.8}%`,
              top: `${60 + (i % 5) * 10}%`,
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              background: i % 3 === 0 ? 'rgba(139,92,246,0.6)' : i % 3 === 1 ? 'rgba(6,182,212,0.6)' : 'rgba(236,72,153,0.5)',
              opacity: 0.6,
            }}
          />
        ))}

        {/* Mouse-following ambient light */}
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]"
          style={{
            left: mousePos.x - 250,
            top: mousePos.y - 250,
            background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ═══ HERO SECTION ═══ */}
      <section ref={heroRef} className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">

          {/* Animated icon with rotating ring */}
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-violet-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-violet-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-violet-400/40 shadow-2xl shadow-violet-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(192,38,211,0.25) 50%, rgba(139,92,246,0.3) 100%)' }}>
              <Wrench className="w-14 h-14 relative z-10" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 18px rgba(167,139,250,0.8)) drop-shadow(0 0 40px rgba(139,92,246,0.5))' }} />
              {/* Corner sparkles */}
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-fuchsia-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <h1
            ref={titleRef}
            className="text-5xl md:text-7xl font-bold mb-4 leading-tight"
            style={{ opacity: 1 }}
          >
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Developer &</span>
            <br />
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Network Tools</span>
          </h1>

          <p
            ref={subtitleRef}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light"
            style={{ opacity: 1 }}
          >
            A professional suite of tools for developers, network administrators, and security professionals — all free, all fast.
          </p>

          {/* Animated typewriter badge + Category Toggle in one row */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-violet-600/15 border border-violet-500/25 backdrop-blur-sm shadow-lg shadow-violet-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30">
                <Terminal className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span className="text-violet-400 font-semibold">I can</span>{' '}
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle" />
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* ═══ QUICK STATS ═══ */}
      <section className="relative py-6">
        <div className="container mx-auto px-4">
          <div ref={statsRef} className="max-w-3xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card text-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm hover:border-violet-500/20 transition-colors duration-500">
                <div className="stat-value text-3xl font-black text-white mb-1 tracking-tight">27+</div>
                <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium">Tools</div>
              </div>
              <div className="stat-card text-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm hover:border-cyan-500/20 transition-colors duration-500">
                <div className="stat-value text-3xl font-black text-white mb-1 flex items-center justify-center gap-2">
                  <Zap className="w-6 h-6 text-cyan-500" />
                  Fast
                </div>
                <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium">Real-time</div>
              </div>
              <div className="stat-card text-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm hover:border-emerald-500/20 transition-colors duration-500">
                <div className="stat-value text-3xl font-black text-white mb-1 flex items-center justify-center gap-2">
                  <Star className="w-6 h-6 text-emerald-500" />
                  Free
                </div>
                <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium">No Limits</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ NETWORK & API TOOLS ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">

          {/* Section Header */}
          <div className="section-header flex items-center gap-4 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/15 flex items-center justify-center">
              <Network className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Network & API Tools</h2>
              <p className="text-sm text-gray-600">Powerful diagnostics and API testing</p>
            </div>
          </div>

          {/* Network Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {networkTools.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  data-tool-id={tool.id}
                  className="tool-card group relative block"
                  style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                  onMouseEnter={() => handleCardHover(tool.id, true)}
                  onMouseLeave={() => { handleCardHover(tool.id, false); handleCardLeave(tool.id); }}
                  onMouseMove={(e) => handleCardMove(e, tool.id)}
                >
                  {/* Outer glow on hover */}
                  <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${tool.glow}, transparent 60%)`, filter: 'blur(1px)' }} />

                  <div className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">

                    {/* Mouse-follow shine overlay */}
                    <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                    {/* Top accent line */}
                    <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${tool.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />

                    <div className="relative z-10">
                      {/* Icon */}
                      <div className="tool-icon-wrap mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-violet-400/30"
                          style={{
                            background: `linear-gradient(135deg, ${tool.glow.replace('0.4', '0.25')}, rgba(139,92,246,0.15))`,
                            boxShadow: `0 0 20px ${tool.glow.replace('0.4', '0.12')}, 0 0 40px ${tool.glow.replace('0.4', '0.06')}, inset 0 1px 1px rgba(255,255,255,0.05)`,
                          }}
                        >
                          <IconComponent className="w-6 h-6" style={{ color: '#ddd6fe', filter: `drop-shadow(0 0 8px ${tool.glow})` }} />
                        </div>
                      </div>

                      {/* Name */}
                      <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300 truncate" title={tool.name}>
                        {tool.name}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-600 text-[13px] leading-relaxed mb-4 line-clamp-2 group-hover:text-gray-500 transition-colors duration-300">{tool.description}</p>

                      {/* Action */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-violet-400 transition-colors duration-300 uppercase tracking-wider">
                          Open
                        </span>
                        <ArrowRight className="tool-arrow w-4 h-4 text-gray-700 opacity-30 group-hover:text-violet-400 transition-all duration-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ─── Developer Utilities Section ─── */}
          <div className="section-header flex items-center gap-4 mb-10 mt-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/15 flex items-center justify-center">
              <Code className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Developer Utilities</h2>
              <p className="text-sm text-gray-600">Essential utilities for everyday development</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {developerTools.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  data-tool-id={tool.id}
                  className="tool-card group relative block"
                  style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                  onMouseEnter={() => handleCardHover(tool.id, true)}
                  onMouseLeave={() => { handleCardHover(tool.id, false); handleCardLeave(tool.id); }}
                  onMouseMove={(e) => handleCardMove(e, tool.id)}
                >
                  <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${tool.glow}, transparent 60%)`, filter: 'blur(1px)' }} />

                  <div className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
                    <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
                    <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${tool.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />

                    <div className="relative z-10">
                      <div className="tool-icon-wrap mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-cyan-400/30"
                          style={{
                            background: `linear-gradient(135deg, ${tool.glow.replace('0.4', '0.25')}, rgba(6,182,212,0.15))`,
                            boxShadow: `0 0 20px ${tool.glow.replace('0.4', '0.12')}, 0 0 40px ${tool.glow.replace('0.4', '0.06')}, inset 0 1px 1px rgba(255,255,255,0.05)`,
                          }}
                        >
                          <IconComponent className="w-6 h-6" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 8px ${tool.glow})` }} />
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300 truncate" title={tool.name}>
                        {tool.name}
                      </h3>

                      <p className="text-gray-600 text-[13px] leading-relaxed mb-4 line-clamp-2 group-hover:text-gray-500 transition-colors duration-300">{tool.description}</p>

                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-cyan-400 transition-colors duration-300 uppercase tracking-wider">
                          Open
                        </span>
                        <ArrowRight className="tool-arrow w-4 h-4 text-gray-700 opacity-30 group-hover:text-cyan-400 transition-all duration-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CTA FOOTER ═══ */}
      <section className="relative py-20 mt-8">
        {/* Subtle divider */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Need Something Specific?</h3>
          <p className="text-gray-600 mb-10 max-w-xl mx-auto text-sm">
            Explore our full suite or suggest new tools for the platform
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/support"
              className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Request a Tool
            </Link>
            <Link
              href="/overview/spaces"
              className="px-7 py-3.5 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-400 flex items-center justify-center gap-2"
            >
              Unlock Premium
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ GLOBAL STYLES ═══ */}
      <style jsx global>{`
        /* Ultra-smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Subtle noise texture overlay */
        .tool-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 1rem;
          opacity: 0.015;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }

        /* Typewriter cursor blink */
        @keyframes cursorBlink {
          0%, 45% { opacity: 1; }
          50%, 95% { opacity: 0; }
          100% { opacity: 1; }
        }
        .typewriter-cursor {
          animation: cursorBlink 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
