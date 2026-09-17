'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';
import {
  Sparkles, ArrowRight, Zap, Shield, Globe, Code2, Layers, Database,
  Cloud, CreditCard, ExternalLink, CheckCircle2, MessageSquare,
  Paintbrush, Wrench, Terminal, Bot,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, CustomEase);

/* ------------------------------------------------------------------ */
/*  4 App Cards                                                        */
/* ------------------------------------------------------------------ */
const apps = [
  {
    name: 'Neural Chat',
    tagline: 'AI Conversational Assistant',
    href: 'https://spaces.sanbayfusion.com/neural-chat/',
    icon: MessageSquare,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'rgba(139,92,246,0.4)',
    features: [
      'Unlimited multi-session chat with search & sharing',
      'Real-time streaming responses',
      'Voice calls with 8 voice options',
      'Speech-to-text recording & transcription',
      'Image upload + AI analysis (captions, OCR, object detection)',
      'AI image generation',
      'Text-to-speech (6 voices)',
      'Web search & deep research modes',
      '5 chat modes: Chat, Web Search, Deep Research, Thinking, Create Image',
      '268 AI tools across 39 categories',
    ],
  },
  {
    name: 'Canvas Studio',
    tagline: 'AI App Builder & Code Generator',
    href: 'https://canvas.sanbayfusion.com',
    icon: Paintbrush,
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'rgba(6,182,212,0.4)',
    features: [
      'AI-powered real-time code generation with streaming',
      'Sandpack live preview (React / HTML / Python)',
      'Cloud sandbox execution (real builds & runtime)',
      'VS Code-style file explorer with drag & drop',
      'CodeMirror 6 editor — 21 languages',
      'AI video & image generation',
      'Text-to-speech output',
      'Cloud deployment (Vercel, Netlify, GitHub Pages)',
      'ZIP project export & download',
      '268 AI tools across 39 categories',
    ],
  },
  {
    name: 'GenCraft Pro',
    tagline: 'AI Full-Stack App Builder',
    href: 'https://spaces.sanbayfusion.com/gen-craft-pro/',
    icon: Code2,
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.4)',
    features: [
      'Dual code editors — CodeMirror 6 + Monaco Editor (VS Code engine)',
      'Real terminal emulator with command execution',
      'Sandpack in-browser runtime (React/HTML/Python)',
      'Cloud sandbox with full build & run',
      'Image-to-code — upload screenshots, AI generates code',
      'Voice input — speak instructions instead of typing',
      'Cloud deployment (Vercel, Netlify, GitHub Pages)',
      'ZIP project export',
      '268 AI tools across 39 categories',
      'Multiple AI models for best results',
    ],
  },
  {
    name: 'Maula Editor',
    tagline: 'Full Cloud IDE',
    href: 'https://spaces.sanbayfusion.com/maula-editor/',
    icon: Terminal,
    gradient: 'from-orange-500 to-amber-500',
    glow: 'rgba(234,179,8,0.4)',
    features: [
      "Monaco Editor — VS Code's actual editor engine",
      'Full Node.js runtime in-browser (no server needed)',
      'Integrated terminal with search, links & unicode',
      'In-browser Git — commits, branches, push/pull',
      'AI Copilot — inline ghost text suggestions',
      'AI Chat with streaming & tool calling',
      'Extension marketplace',
      'Real-time collaboration (multi-user editing)',
      'Cloud deployment & app packaging',
      '268 AI tools across 39 categories',
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Credit Packs                                                       */
/* ------------------------------------------------------------------ */
const creditPacks = [
  { name: 'Starter Pack', credits: 10, bonus: 0, total: 10, price: 5, popular: false, description: 'Great for trying out an app', gradient: 'from-cyan-500 to-blue-500', glow: 'rgba(6,182,212,0.4)' },
  { name: 'Pro Pack', credits: 50, bonus: 5, total: 55, price: 20, popular: true, description: 'Best value for regular usage', gradient: 'from-violet-500 to-fuchsia-500', glow: 'rgba(139,92,246,0.4)' },
  { name: 'Power Pack', credits: 100, bonus: 15, total: 115, price: 35, popular: false, description: 'For power users building projects', gradient: 'from-emerald-500 to-teal-500', glow: 'rgba(16,185,129,0.4)' },
  { name: 'Enterprise Pack', credits: 500, bonus: 100, total: 600, price: 150, popular: false, description: 'Maximum credits with 20% bonus', gradient: 'from-amber-500 to-orange-500', glow: 'rgba(234,179,8,0.4)' },
];

/* ------------------------------------------------------------------ */
/*  Credit Costs Per Action                                            */
/* ------------------------------------------------------------------ */
const creditCosts = [
  { action: 'Chat Message (standard)', cost: '~0.01–0.15 credits' },
  { action: 'Chat Message (advanced)', cost: '~0.15–0.75 credits' },
  { action: 'AI Image Generation (HD)', cost: '~0.80 credits' },
  { action: 'AI Video Generation', cost: '5–8 credits' },
  { action: 'Text-to-Speech', cost: '~0.15 per 1K characters' },
  { action: 'Code Generation (per request)', cost: '~0.03–0.50 credits' },
  { action: 'Image-to-Code Analysis', cost: '~0.10–0.30 credits' },
  { action: 'Web Search & Deep Research', cost: '~0.05–0.20 credits' },
];

/* ------------------------------------------------------------------ */
/*  Feature Comparison (23 rows × 4 apps)                              */
/* ------------------------------------------------------------------ */
const featureRows: { feature: string; neural: boolean; studio: boolean; gencraft: boolean; maula: boolean }[] = [
  { feature: 'AI Chat / Code Generation', neural: true, studio: true, gencraft: true, maula: true },
  { feature: 'Real-time Streaming', neural: true, studio: true, gencraft: true, maula: true },
  { feature: '268 AI Backend Tools', neural: true, studio: true, gencraft: true, maula: true },
  { feature: 'Live Preview (Sandpack)', neural: false, studio: true, gencraft: true, maula: false },
  { feature: 'CodeMirror 6 Editor', neural: false, studio: true, gencraft: true, maula: false },
  { feature: 'Monaco Editor (VS Code)', neural: false, studio: false, gencraft: true, maula: true },
  { feature: 'Terminal Emulator (xterm.js)', neural: false, studio: false, gencraft: true, maula: true },
  { feature: 'In-Browser Node.js Runtime', neural: false, studio: false, gencraft: false, maula: true },
  { feature: 'Cloud Sandbox Execution', neural: false, studio: true, gencraft: true, maula: true },
  { feature: 'Cloud Deploy (Vercel, Netlify, GitHub)', neural: false, studio: true, gencraft: true, maula: true },
  { feature: 'Multi-File Projects', neural: false, studio: true, gencraft: true, maula: true },
  { feature: 'AI Image Generation', neural: true, studio: true, gencraft: false, maula: false },
  { feature: 'AI Video Generation', neural: false, studio: true, gencraft: false, maula: true },
  { feature: 'Image-to-Code (Vision)', neural: false, studio: true, gencraft: true, maula: false },
  { feature: 'Voice Input / Speech-to-Text', neural: true, studio: false, gencraft: true, maula: false },
  { feature: 'Text-to-Speech', neural: true, studio: true, gencraft: false, maula: false },
  { feature: 'Voice Calls', neural: true, studio: false, gencraft: false, maula: false },
  { feature: 'Web Search & Deep Research', neural: true, studio: false, gencraft: false, maula: false },
  { feature: 'In-Browser Git', neural: false, studio: false, gencraft: false, maula: true },
  { feature: 'AI Copilot (Inline Suggestions)', neural: false, studio: false, gencraft: false, maula: true },
  { feature: 'Extension Marketplace', neural: false, studio: false, gencraft: false, maula: true },
  { feature: 'Real-time Collaboration', neural: false, studio: true, gencraft: false, maula: true },
  { feature: 'ZIP Export / Download', neural: false, studio: true, gencraft: true, maula: true },
];

/* ------------------------------------------------------------------ */
/*  Tool Categories (268 tools / 39 categories)                        */
/* ------------------------------------------------------------------ */
const toolCategories = [
  'Code Generation', 'Code Analysis', 'Code Refactoring', 'Debugging',
  'Testing', 'Documentation', 'AI Chat', 'Image Generation',
  'Video Generation', 'Audio/TTS', 'Data Analysis', 'Database Tools',
  'API Builder', 'DevOps', 'Security Scanner', 'Performance',
  'Accessibility', 'SEO Tools', 'Design Tokens', 'Component Builder',
  'State Machine', 'Regex Builder', 'CLI Generator', 'Git Tools',
  'Package Manager', 'Linter/Formatter', 'Bundler Config', 'Docker Tools',
  'CI/CD Pipeline', 'Cloud Deploy', 'File Manager', 'Markdown Editor',
  'Diagram Generator', 'Kanban Board', 'Calendar Planner', 'Budget Tracker',
  'Email Templates', 'Form Builder', 'Chart Generator',
];

/* ------------------------------------------------------------------ */
/*  FAQs                                                               */
/* ------------------------------------------------------------------ */
const faqs = [
  { q: 'What apps are available?', a: 'There are 4 apps: Neural Chat (AI conversational assistant), Canvas Studio (AI app builder & code generator), GenCraft Pro (AI full-stack app builder with dual editors), and Maula Editor (full cloud IDE with in-browser runtime). Each app is designed for different workflows.' },
  { q: 'How do credits work?', a: 'Credits are the currency for using AI features. 1 credit = $0.10 USD value. Each AI action (chat, code generation, image creation, etc.) consumes credits based on complexity. You purchase credit packs starting at $5 and use them as you go — no subscriptions, only pay for what you use.' },
  { q: 'Can I share credits between apps?', a: 'No. Each app has its own separate credit balance. Credits purchased for Neural Chat can only be used in Neural Chat, credits for Canvas Studio only in Canvas Studio, and so on. If you use multiple apps, you buy credits for each one separately.' },
  { q: 'Do credits expire?', a: 'No. Credits never expire. Purchase once and use them at your own pace. There are no monthly fees, no subscriptions, and no auto-renewal.' },
  { q: 'What is the minimum and maximum I can add?', a: 'The minimum credit purchase is $5 (Starter Pack with 10 credits). You can purchase up to $500 worth of credits at a time. Buy as many packs as you need.' },
  { q: 'How much does a typical chat message cost?', a: 'A standard chat message typically costs 0.01–0.15 credits depending on the message length and complexity. Advanced operations like image generation (~0.80 credits) or video generation (5–8 credits) cost more.' },
  { q: 'Is my code private and secure?', a: 'Yes. All data is encrypted in transit (TLS 1.2/1.3) and at rest (AES-256). Credentials and API keys you store are encrypted with AES-256-GCM. Your code and prompts are never used to train AI models.' },
  { q: 'Is there a free plan?', a: 'There is no free plan. All apps use a credit-based system where you pay only for what you use. The minimum purchase is just $5 (10 credits), allowing you to try any app at minimal cost.' },
];

/* ------------------------------------------------------------------ */
/*  Security Items                                                     */
/* ------------------------------------------------------------------ */
const securityItems = [
  { icon: Shield, label: 'TLS 1.2/1.3 Encryption', desc: 'All data encrypted in transit' },
  { icon: Database, label: 'AES-256-GCM', desc: 'Credentials and keys encrypted at rest' },
  { icon: Cloud, label: 'Isolated Sandboxes', desc: 'Each project runs in its own container' },
  { icon: Zap, label: 'Rate Limiting', desc: 'Per-IP limits on all endpoints' },
  { icon: Shield, label: 'No AI Training', desc: 'Your data is never used to train models' },
  { icon: CreditCard, label: 'Stripe Payments', desc: 'PCI DSS Level 1 — card data never on our servers' },
];

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */
export default function SpacesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      CustomWiggle.create('priceWiggle', { wiggles: 5, type: 'uniform' });

      gsap.to('.nebula-orb', {
        x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)',
        duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true },
      });

      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
        gsap.to(p, {
          y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 4 + Math.random() * 6, repeat: -1, delay: i * 0.3, ease: 'power1.out',
          onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); }
        });
      });

      gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

      if (titleRef.current) {
        gsap.fromTo(titleRef.current, { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
      }
      if (subtitleRef.current) {
        gsap.fromTo(subtitleRef.current, { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });
      }

      if (typewriterRef.current) {
        const phrases = ['4 AI apps at spaces.sanbayfusion.com', 'Credit-based, no subscriptions', '268 AI tools across 39 categories', 'Pay only for what you use', 'Credits never expire'];
        const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tl.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tl.to({}, { duration: 2 });
          tl.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(139, 92, 246, 0.5), 0 0 160px rgba(139, 92, 246, 0.2)',
        scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      ScrollTrigger.batch('.app-card', { onEnter: (batch) => gsap.from(batch, { opacity: 0, y: 60, scale: 0.92, stagger: 0.1, duration: 0.7, ease: 'power3.out' }) });
      ScrollTrigger.batch('.credit-card', { onEnter: (batch) => gsap.from(batch, { opacity: 0, y: 50, scale: 0.9, stagger: 0.08, duration: 0.6, ease: 'back.out(1.7)' }) });
      ScrollTrigger.batch('.tool-chip', { onEnter: (batch) => gsap.from(batch, { opacity: 0, scale: 0.85, stagger: 0.02, duration: 0.4, ease: 'back.out(1.5)' }) });
      ScrollTrigger.batch('.security-card', { onEnter: (batch) => gsap.from(batch, { opacity: 0, y: 40, stagger: 0.08, duration: 0.6, ease: 'power3.out' }) });

      gsap.utils.toArray<HTMLElement>('.faq-card').forEach((el) => {
        gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 92%' }, opacity: 0, y: 30, duration: 0.5, ease: 'power3.out' });
      });

      gsap.from('.cta-block', { scrollTrigger: { trigger: '.cta-block', start: 'top 85%' }, opacity: 0, y: 50, scale: 0.95, duration: 0.8, ease: 'power4.out' });

      gsap.from('.trust-badge', { opacity: 0, y: 30, scale: 0.9, stagger: 0.1, duration: 0.6, delay: 1, ease: 'back.out(1.5)' });

    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

      {/* ═══ BACKGROUND ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" style={{ top: '-2px' }} />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="stardust absolute rounded-full" style={{ left: `${3 + i * 4.8}%`, top: `${60 + (i % 5) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 3 === 0 ? 'rgba(139,92,246,0.6)' : i % 3 === 1 ? 'rgba(6,182,212,0.6)' : 'rgba(16,185,129,0.5)', opacity: 0.6 }} />
        ))}
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 250, top: mousePos.y - 250, background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)' }} />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-violet-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-violet-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-emerald-400/40 shadow-2xl shadow-emerald-600/30" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(6,182,212,0.25) 50%, rgba(16,185,129,0.3) 100%)' }}>
              <Globe className="w-14 h-14 relative z-10" style={{ color: '#a7f3d0', filter: 'drop-shadow(0 0 18px rgba(16,185,129,0.8)) drop-shadow(0 0 40px rgba(16,185,129,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a7f3d0, #a5f3fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI Apps</span>
            <br />
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a7f3d0, #a5f3fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>&amp; Spaces</span>
          </h1>

          <p ref={subtitleRef} className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed font-light" style={{ opacity: 0 }}>
            4 powerful AI applications at{' '}
            <a href="https://spaces.sanbayfusion.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline decoration-emerald-400/40 hover:decoration-emerald-400 transition">spaces.sanbayfusion.com</a>.
            <span className="text-emerald-400"> Credit-based pay-as-you-go — no subscriptions.</span>
          </p>

          {/* Quick Stat Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {[
              { icon: Layers, label: '4 Apps' },
              { icon: Wrench, label: '268 AI Tools' },
              { icon: CreditCard, label: 'Credit System' },
              { icon: Shield, label: 'No Subscriptions' },
            ].map((b, i) => (
              <div key={i} className="trust-badge flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/20 transition-colors duration-500">
                <b.icon className="w-4 h-4 text-emerald-300" />
                <span className="text-gray-300 text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-14">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600/15 via-cyan-600/10 to-emerald-600/15 border border-emerald-500/25 backdrop-blur-sm shadow-lg shadow-emerald-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-emerald-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4 APP CARDS ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-4">
              <Bot className="w-4 h-4" /> 4 AI Applications
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Choose Your App</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm">Each app is built for a specific workflow. Credits are purchased per app — use what you need, when you need it.</p>
          </div>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
            {apps.map((app, i) => {
              const Icon = app.icon;
              return (
                <div key={i} className="app-card group relative rounded-2xl overflow-hidden" style={{ perspective: '800px' }}>
                  <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(135deg, ${app.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                  <div className="relative p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm h-full transition-all duration-500 group-hover:border-white/[0.12] group-hover:bg-white/[0.04]">
                    <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r opacity-0 group-hover:opacity-40 transition-opacity duration-500" style={{ backgroundImage: `linear-gradient(to right, ${app.glow}, transparent)` }} />
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-5">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`} style={{ boxShadow: `0 0 20px ${app.glow.replace('0.4', '0.15')}` }}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-200 group-hover:text-white transition-colors">{app.name}</h3>
                          <p className="text-xs text-gray-600">{app.tagline}</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-5">
                        {app.features.map((feat, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-400/70" />
                            <span className="text-xs text-gray-400 leading-relaxed">{feat}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04] mb-5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400/60" />
                        <span className="text-[11px] text-gray-500 font-medium">Separate credit balance — credits for this app only</span>
                      </div>
                      <a href={app.href} target="_blank" rel="noopener noreferrer"
                        className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r ${app.gradient} hover:opacity-90 transition shadow-lg`}
                        style={{ boxShadow: `0 4px 20px ${app.glow.replace('0.4', '0.2')}` }}>
                        Open {app.name} <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW CREDITS WORK ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">How Credits Work</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm">Simple pay-as-you-go. No subscriptions, no monthly fees. Buy credits for the app you want to use.</p>
          </div>
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: CreditCard, title: 'Buy Credits', desc: 'Purchase a credit pack for any app. Min $5, max $500.', glow: 'rgba(6,182,212,0.4)' },
              { icon: Layers, title: 'Per-App Balance', desc: 'Each app has its own credit balance. Not shareable between apps.', glow: 'rgba(139,92,246,0.4)' },
              { icon: Zap, title: 'Use As You Go', desc: 'Each AI action consumes credits based on complexity. 1 credit = $0.10.', glow: 'rgba(16,185,129,0.4)' },
              { icon: Shield, title: 'Never Expires', desc: 'Credits never expire. No auto-renewal. No surprise charges.', glow: 'rgba(234,179,8,0.4)' },
            ].map((item, i) => (
              <div key={i} className="credit-card text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-violet-500/20 transition-colors duration-500">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 border border-violet-400/20" style={{ background: `linear-gradient(135deg, ${item.glow.replace('0.4', '0.2')}, rgba(139,92,246,0.1))` }}>
                  <item.icon className="w-6 h-6" style={{ color: '#ddd6fe', filter: `drop-shadow(0 0 8px ${item.glow})` }} />
                </div>
                <p className="font-semibold text-gray-200 mb-1 text-sm">{item.title}</p>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CREDIT PACKS ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-4">
              <CreditCard className="w-4 h-4" /> Credit Packs
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Buy Credits for Any App</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm">Purchase credits inside each app. 1 credit = $0.10 value. Credits are loaded into the specific app you buy them from.</p>
          </div>
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {creditPacks.map((pack, i) => (
              <div key={i} className={`credit-card group relative rounded-2xl overflow-hidden ${pack.popular ? '' : ''}`}>
                {pack.popular && (
                  <div className="absolute -inset-px rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(192,38,211,0.3), rgba(139,92,246,0.2))', filter: 'blur(1px)' }} />
                )}
                <div className={`relative p-6 rounded-2xl bg-white/[0.02] border ${pack.popular ? 'border-violet-500/30' : 'border-white/[0.06]'} backdrop-blur-sm h-full transition-all duration-500 group-hover:border-white/[0.12] group-hover:bg-white/[0.04]`}>
                  {pack.popular && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-4 py-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-b-lg text-[10px] font-bold text-white uppercase tracking-wider">Best Value</div>
                  )}
                  <div className={pack.popular ? 'pt-3' : ''}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pack.gradient} flex items-center justify-center mb-4`} style={{ boxShadow: `0 0 16px ${pack.glow.replace('0.4', '0.15')}` }}>
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-200 mb-1">{pack.name}</h3>
                    <p className="text-xs text-gray-600 mb-4">{pack.description}</p>
                    <div className="mb-4">
                      <span className="text-3xl font-black text-white">${pack.price}</span>
                      <span className="text-gray-600 ml-2 text-xs">one-time</span>
                    </div>
                    <div className="space-y-2 mb-5">
                      <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0" /><span className="text-gray-400"><strong className="text-gray-300">{pack.credits}</strong> credits</span></div>
                      {pack.bonus > 0 && <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0" /><span className="text-gray-400"><strong className="text-gray-300">+{pack.bonus}</strong> bonus credits</span></div>}
                      <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0" /><span className="text-gray-400"><strong className="text-gray-300">{pack.total}</strong> total credits</span></div>
                      <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0" /><span className="text-gray-400">Credits never expire</span></div>
                      <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0" /><span className="text-gray-400">No auto-renewal</span></div>
                    </div>
                    <a href="https://spaces.sanbayfusion.com" target="_blank" rel="noopener noreferrer"
                      className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${pack.popular ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40' : 'bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:text-white'}`}>
                      Buy in App <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="max-w-5xl mx-auto mt-6">
            <div className="px-5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
              <p className="text-xs text-gray-600">Credits are purchased inside each app. Minimum $5, maximum $500 per transaction. Each app maintains its own separate balance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CREDIT COSTS PER ACTION ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Credit Costs Per Action</h2>
            <p className="text-gray-500 text-sm">How many credits each type of action uses. Costs vary by complexity and length.</p>
          </div>
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-6 py-4 text-left font-semibold text-gray-300">Action</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-300">Credit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {creditCosts.map((row, i) => (
                    <tr key={i} className={`border-b border-white/[0.03] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                      <td className="px-6 py-3.5 text-gray-400 font-medium">{row.action}</td>
                      <td className="px-6 py-3.5 text-right text-emerald-300/70 font-mono text-xs">{row.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-white/[0.04]">
              <p className="text-[11px] text-gray-700 text-center">1 credit = $0.10 USD value. Minimum charge per request is 0.01 credits. Costs depend on message length and action complexity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE COMPARISON (23 rows × 4 apps) ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">App Feature Comparison</h2>
            <p className="text-gray-500 text-sm">See which features each app includes</p>
          </div>
          <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-white/[0.08]">
                    <th className="px-5 py-4 text-left font-semibold text-gray-300 sticky left-0 bg-[#030304]">Feature</th>
                    <th className="px-4 py-4 text-center font-semibold text-violet-400 whitespace-nowrap">Neural Chat</th>
                    <th className="px-4 py-4 text-center font-semibold text-cyan-400 whitespace-nowrap">Canvas Studio</th>
                    <th className="px-4 py-4 text-center font-semibold text-emerald-400 whitespace-nowrap">GenCraft Pro</th>
                    <th className="px-4 py-4 text-center font-semibold text-amber-400 whitespace-nowrap">Maula Editor</th>
                  </tr>
                </thead>
                <tbody>
                  {featureRows.map((row, i) => (
                    <tr key={i} className={`border-b border-white/[0.03] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                      <td className="px-5 py-3 text-gray-400 font-medium sticky left-0 bg-[#030304] whitespace-nowrap">{row.feature}</td>
                      {(['neural', 'studio', 'gencraft', 'maula'] as const).map((key) => (
                        <td key={key} className="px-4 py-3 text-center">
                          {row[key] ? (
                            <svg className="w-4 h-4 mx-auto text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <span className="text-gray-800">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TOOL CATEGORIES (39) ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" /> 268 Tools &middot; 39 Categories
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">AI Tool Categories</h2>
            <p className="text-gray-500 text-sm">Available across all 4 apps</p>
          </div>
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2.5">
            {toolCategories.map((cat, i) => (
              <span key={i} className="tool-chip inline-flex items-center px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm font-medium text-gray-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-300 transition-colors duration-300 cursor-default">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECURITY ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Enterprise-Grade Security</h2>
            <p className="text-gray-500 text-sm">Your code and data are protected at every layer</p>
          </div>
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {securityItems.map((item, i) => {
              const SIcon = item.icon;
              return (
                <div key={i} className="security-card flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/20 transition-colors duration-500">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border border-violet-400/20" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(139,92,246,0.1))' }}>
                    <SIcon className="w-5 h-5" style={{ color: '#a7f3d0', filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.4))' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-200 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-600">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FAQs ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" /> Common Questions
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Frequently Asked Questions</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-card rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-emerald-500/15 transition-colors duration-500">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left group">
                  <span className="font-bold text-gray-200 pr-4 text-sm group-hover:text-white transition-colors">{faq.q}</span>
                  <svg className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ display: 'grid', gridTemplateRows: openFaq === i ? '1fr' : '0fr' }}>
                  <div className="min-h-0">
                    <div className="px-5 pb-5">
                      <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container mx-auto px-4">
          <div className="cta-block max-w-4xl mx-auto rounded-2xl p-10 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.1) 50%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-3">Start Using AI Apps Today</h2>
              <p className="text-gray-500 mb-8 max-w-xl mx-auto text-sm">4 powerful apps, 268 AI tools, credit-based pricing. No subscriptions — pay only for what you use.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <a href="https://spaces.sanbayfusion.com" target="_blank" rel="noopener noreferrer" className="px-7 py-3.5 bg-gradient-to-r from-emerald-600/90 to-cyan-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/30 transition-all duration-400 flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4" /> Visit spaces.sanbayfusion.com <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <Link href="/overview" className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
                  All Plans <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER NOTE ═══ */}
      <section className="relative pb-16 pt-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[11px] text-gray-800">© {new Date().getFullYear()} Maula AI — All rights reserved. Prices in USD.</p>
        </div>
      </section>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
        @keyframes cursorBlink { 0%, 45% { opacity: 1; } 50%, 95% { opacity: 0; } 100% { opacity: 1; } }
        .typewriter-cursor { animation: cursorBlink 0.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}