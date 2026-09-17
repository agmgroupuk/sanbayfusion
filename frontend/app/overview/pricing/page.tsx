'use client';

/**
 * GenCraft Pro Pricing Page
 * Full-featured pricing page for Canvas Studio / GenCraft Pro AI app builder.
 * Dark cosmic GSAP design — consistent with /overview/* pages.
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';
import {
  Zap, Crown, Check, Loader2, ArrowRight, Shield, Clock, Sparkles,
  Bot, Code2, Monitor, Mic, Image, Video, Layers, Cloud, Globe,
  FileCode, Terminal, ChevronDown, Paintbrush, Gift, Lock, XCircle,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, CustomEase);

const PLANS = [
  {
    id: 'weekly' as const,
    name: 'Weekly',
    price: 7,
    originalPrice: 14,
    discount: '50% OFF',
    period: '/week',
    duration: '7 days',
    description: '7-day access to GenCraft Pro',
    savings: null,
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'rgba(6,182,212,0.4)',
    popular: false,
    badge: null,
    features: [
      'Full AI-powered app generation',
      '9+ AI providers (Anthropic, OpenAI, Google, Mistral, xAI, Groq & more)',
      'Live preview & Sandpack runtime',
      'Monaco & CodeMirror editors',
      '40+ programming languages',
      'Multi-file project support',
      'Image-to-code conversion',
      'AI video generation',
      'Deploy to 5 platforms',
      'Export & download projects',
      'Unlimited generations',
      'No auto-renewal',
    ],
  },
  {
    id: 'monthly' as const,
    name: 'Monthly',
    price: 19,
    originalPrice: 38,
    discount: '50% OFF',
    period: '/month',
    duration: '30 days',
    description: '30-day access to GenCraft Pro',
    savings: 'Save 32% vs weekly',
    gradient: 'from-violet-500 to-fuchsia-500',
    glow: 'rgba(139,92,246,0.4)',
    popular: true,
    badge: 'Most Popular',
    features: [
      'Full AI-powered app generation',
      '9+ AI providers (Anthropic, OpenAI, Google, Mistral, xAI, Groq & more)',
      'Live preview & Sandpack runtime',
      'Monaco & CodeMirror editors',
      '40+ programming languages',
      'Multi-file project support',
      'Image-to-code conversion',
      'AI video generation',
      'Deploy to 5 platforms',
      'Export & download projects',
      'Unlimited generations',
      'No auto-renewal',
    ],
  },
  {
    id: 'yearly' as const,
    name: 'Yearly',
    price: 120,
    originalPrice: 240,
    discount: '50% OFF',
    period: '/year',
    duration: '365 days',
    description: '365-day access — just $10/month',
    savings: 'Save 47% vs weekly',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.4)',
    popular: false,
    badge: 'Best Value',
    features: [
      'Full AI-powered app generation',
      '9+ AI providers (Anthropic, OpenAI, Google, Mistral, xAI, Groq & more)',
      'Live preview & Sandpack runtime',
      'Monaco & CodeMirror editors',
      '40+ programming languages',
      'Multi-file project support',
      'Image-to-code conversion',
      'AI video generation',
      'Deploy to 5 platforms',
      'Export & download projects',
      'Unlimited generations',
      'No auto-renewal',
    ],
  },
];

const APP_CAPABILITIES = [
  { icon: Code2, title: 'AI Code Generation', description: 'Describe any app in natural language and GenCraft Pro generates full working code — frontend, backend, styling, and logic.' },
  { icon: Monitor, title: 'Live Preview & Sandpack', description: 'See your app running in real-time with Sandpack runtime. Edit code and watch changes instantly in the browser.' },
  { icon: FileCode, title: 'Dual Code Editors', description: 'Monaco Editor (VS Code engine) and CodeMirror 6 — syntax highlighting, IntelliSense, and multi-file editing for 40+ languages.' },
  { icon: Layers, title: 'Multi-File Projects', description: 'Full project structure with file tree, multi-file support, and project history. Build real apps, not just snippets.' },
  { icon: Terminal, title: '35 AI Tools', description: 'AI calls 35 specialized tools: file create/edit/delete, terminal execution, npm build validation, and more — up to 10 rounds per request.' },
  { icon: Globe, title: 'Deploy to 5 Platforms', description: 'One-click deployment to Vercel, Netlify, GitHub Pages, AWS, and cloud preview. Export and download projects locally.' },
  { icon: Image, title: 'Image-to-Code', description: 'Upload a screenshot or design mockup and GenCraft Pro converts it into working code using Azure AI Vision.' },
  { icon: Video, title: 'AI Video Generation', description: 'Generate videos from text prompts using integrated AI video tools powered by fal.ai and Minimax.' },
  { icon: Mic, title: 'Voice Input', description: 'Speak your instructions instead of typing. Voice-to-text input lets you describe apps hands-free.' },
  { icon: Sparkles, title: '9+ AI Providers', description: 'Choose from Anthropic Claude, OpenAI GPT-4o, Google Gemini, Mistral Codestral, xAI Grok, Groq, Cerebras, HuggingFace, and Ollama.' },
  { icon: Cloud, title: '10 Starter Templates', description: 'Kickstart projects with templates for React, Next.js, Vue, Svelte, HTML/CSS, Python, Node.js, and more.' },
  { icon: Shield, title: 'Secure & Private', description: 'All data encrypted in transit (TLS 1.2/1.3). No auto-renewal — one-time purchase. Your code stays yours.' },
];

const comparisonRows = [
  { feature: 'AI App Generation', w: true, m: true, y: true },
  { feature: 'AI Providers', w: '9+', m: '9+', y: '9+' },
  { feature: 'Programming Languages', w: '40+', m: '40+', y: '40+' },
  { feature: 'Live Preview (Sandpack)', w: true, m: true, y: true },
  { feature: 'Monaco & CodeMirror Editors', w: true, m: true, y: true },
  { feature: 'Multi-File Projects', w: true, m: true, y: true },
  { feature: 'AI Tools (per request)', w: '35', m: '35', y: '35' },
  { feature: 'Image-to-Code', w: true, m: true, y: true },
  { feature: 'AI Video Generation', w: true, m: true, y: true },
  { feature: 'Voice Input', w: true, m: true, y: true },
  { feature: 'Deploy (Vercel, Netlify, GitHub, AWS)', w: true, m: true, y: true },
  { feature: 'Export & Download', w: true, m: true, y: true },
  { feature: 'Starter Templates', w: '10', m: '10', y: '10' },
  { feature: 'Generations', w: 'Unlimited', m: 'Unlimited', y: 'Unlimited' },
  { feature: 'Auto-Renewal', w: 'No', m: 'No', y: 'No' },
  { feature: 'Access Duration', w: '7 days', m: '30 days', y: '365 days' },
  { feature: 'Effective Price', w: '$1/day', m: '~$0.63/day', y: '~$0.33/day' },
];

const faqs = [
  { q: 'What is GenCraft Pro?', a: 'GenCraft Pro is a browser-based AI IDE that generates full-stack applications from natural language descriptions. It features dual code editors (Monaco + CodeMirror), live Sandpack preview, 35 AI tools, and deployment to 5 platforms.' },
  { q: 'Are all features the same on every plan?', a: 'Yes. Weekly, Monthly, and Yearly plans all include identical features — full AI app generation, all 9+ providers, 40+ languages, deployment, video generation, and unlimited generations. The only difference is billing cycle and savings.' },
  { q: 'Which AI models can I use?', a: 'All plans include access to 9+ providers: Anthropic (Claude Sonnet 4, Opus 4, Haiku), OpenAI (GPT-4o), Google (Gemini 2.5 Pro/Flash), Mistral (Codestral), xAI (Grok 3), Groq (LLaMA 3.3), Cerebras, HuggingFace, and Ollama (local).' },
  { q: 'Is there auto-renewal?', a: 'No. All purchases are one-time. Your access expires at the end of your chosen period and you manually repurchase when you want to continue. No surprise charges ever.' },
  { q: 'Can I deploy apps I build?', a: 'Yes. GenCraft Pro supports one-click deployment to Vercel, Netlify, GitHub Pages, AWS, and cloud preview. You can also export and download your projects to run locally.' },
  { q: 'What languages and frameworks are supported?', a: 'GenCraft Pro supports 40+ programming languages and comes with 10 starter templates including React, Next.js, Vue, Svelte, HTML/CSS/JS, Python, Node.js, TypeScript, and more.' },
];

export default function CanvasStudioPricingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activePlan, setActivePlan] = useState<{ type: string; daysRemaining: number; id: string; stripeSubscriptionId?: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.valid && data.user) {
          setAuthUser({ id: data.user.id, email: data.user.email });
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // Check active plan on mount
  useEffect(() => {
    if (!authUser) return;
    const checkPlan = async () => {
      try {
        const res = await fetch(`/api/gencraft/studio-plan`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success && data.hasAccess && data.plan) {
          setActivePlan({
            type: data.plan.type,
            daysRemaining: data.plan.daysRemaining,
            id: data.plan.id,
            stripeSubscriptionId: data.plan.stripeSubscriptionId,
          });
        }
      } catch (e) {
        console.error('Plan check failed:', e);
      }
    };
    checkPlan();
  }, [authUser]);

  // GSAP animations
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      CustomWiggle.create('craftWiggle', { wiggles: 5, type: 'uniform' });

      gsap.to('.nebula-orb', { x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)', duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
        gsap.to(p, { y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 4 + Math.random() * 6, repeat: -1, delay: i * 0.3, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
      });
      gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

      if (titleRef.current) gsap.fromTo(titleRef.current, { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
      if (subtitleRef.current) gsap.fromTo(subtitleRef.current, { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });

      if (typewriterRef.current) {
        const phrases = ['AI-powered full-stack app builder', '9+ AI providers included', 'Deploy to 5 platforms', '40+ programming languages', 'No auto-renewal, one-time purchase'];
        const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tl.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tl.to({}, { duration: 2 });
          tl.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      gsap.to('.hero-icon-container', { boxShadow: '0 0 80px rgba(139, 92, 246, 0.5), 0 0 160px rgba(139, 92, 246, 0.2)', scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      ScrollTrigger.batch('.pricing-card', { onEnter: (els) => gsap.fromTo(els, { y: 60, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.15, ease: 'power3.out' }), start: 'top 90%', once: true });
      ScrollTrigger.batch('.capability-card', { onEnter: (els) => gsap.fromTo(els, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.5)' }), start: 'top 90%', once: true });

      gsap.utils.toArray<HTMLElement>('.faq-card').forEach((el, i) => {
        gsap.set(el, { opacity: 0, y: 30 });
        ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.5, delay: i * 0.06, ease: 'power3.out' }) });
      });

      ScrollTrigger.create({ trigger: '.cta-block', start: 'top 90%', once: true, onEnter: () => gsap.fromTo('.cta-block', { y: 40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }) });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleCancelPlan = async () => {
    if (!authUser || !activePlan) return;
    if (!confirm('Are you sure you want to cancel your active plan? This action cannot be undone.')) return;
    setIsCancelling(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: authUser.id, agentId: 'gencraft-pro', subscriptionId: activePlan.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActivePlan(null);
        setError(null);
      } else {
        setError(data.error || 'Failed to cancel plan');
      }
    } catch {
      setError('Network error while cancelling. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    if (!authUser) {
      window.location.href = '/auth/login?redirect=/overview/pricing';
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gencraft/studio-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan: planId,
          userEmail: authUser.email,
          returnUrl: 'https://sanbayfusion.com',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.alreadySubscribed) {
          setError(data.error || 'You already have an active plan!');
        } else {
          setError(data.error || 'Failed to create checkout session');
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardHover = (cardId: string, isEntering: boolean) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;
    if (isEntering) {
      gsap.to(card, { y: -10, scale: 1.03, duration: 0.4, ease: 'power2.out' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 1, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 1, duration: 0.3 });
    } else {
      gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 0, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 0, duration: 0.3 });
    }
  };

  const handleCardMove = (e: React.MouseEvent, cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, duration: 0.3, ease: 'power2.out' });
    const shine = card.querySelector('.card-shine') as HTMLElement;
    if (shine) shine.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`;
  };

  const handleCardLeave = (cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;
    gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

      {/* ═══ BACKGROUND ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" style={{ top: '-2px' }} />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="stardust absolute rounded-full" style={{ left: `${3 + i * 4.8}%`, top: `${60 + (i % 5) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 3 === 0 ? 'rgba(139,92,246,0.6)' : i % 3 === 1 ? 'rgba(6,182,212,0.6)' : 'rgba(236,72,153,0.5)', opacity: 0.6 }} />
        ))}
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 250, top: mousePos.y - 250, background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)' }} />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-violet-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-violet-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-violet-400/40 shadow-2xl shadow-violet-600/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(192,38,211,0.25) 50%, rgba(139,92,246,0.3) 100%)' }}>
              <Paintbrush className="w-14 h-14 relative z-10" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 18px rgba(167,139,250,0.8)) drop-shadow(0 0 40px rgba(139,92,246,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-fuchsia-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>GenCraft Pro</span>
          </h1>

          <p ref={subtitleRef} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light" style={{ opacity: 0 }}>
            AI-powered full-stack app builder. Describe any app in natural language and get working code with live preview.
            <span className="text-violet-400"> 9+ AI providers, 40+ languages, deploy to 5 platforms.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {[
              { icon: Shield, label: 'Secure Payment via Stripe' },
              { icon: Gift, label: 'No Auto-Renewal' },
              { icon: Zap, label: 'Instant Access' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400">
                <badge.icon className="w-4 h-4 text-violet-400" />
                {badge.label}
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-violet-600/15 border border-violet-500/25 backdrop-blur-sm shadow-lg shadow-violet-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30">
                <Paintbrush className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: '3', label: 'Flexible Plans', color: 'text-cyan-400' },
                { value: '$10/mo', label: 'As Low As', color: 'text-violet-400' },
                { value: '47%', label: 'Max Savings', color: 'text-emerald-400' },
                { value: '9+', label: 'AI Providers', color: 'text-fuchsia-400' },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Pricing link */}
          <div className="mt-8">
            <Link href="/overview" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400 hover:text-white hover:border-violet-500/30 transition-all duration-300 group">
              <Bot className="w-4 h-4 text-violet-400" />
              Looking for AI Agent subscriptions? View All Plans
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ ERROR ═══ */}
      {error && (
        <div className="container mx-auto px-4 mb-8">
          <div className="max-w-md mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        </div>
      )}

      {/* ═══ PRICING CARDS ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Choose Your Plan</h2>
            <p className="text-gray-500 text-sm text-center mb-10">All plans include identical features — you only choose billing cycle and savings</p>

            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((plan, i) => (
                <div key={plan.id} data-card-id={`plan-${i}`}
                  className={`pricing-card group relative block ${plan.popular ? 'md:scale-105 md:z-10' : ''}`}
                  style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                  onMouseEnter={() => handleCardHover(`plan-${i}`, true)}
                  onMouseLeave={() => { handleCardHover(`plan-${i}`, false); handleCardLeave(`plan-${i}`); }}
                  onMouseMove={(e) => handleCardMove(e, `plan-${i}`)}>
                  <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${plan.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                  <div className={`relative h-full rounded-2xl bg-white/[0.02] border ${plan.popular ? 'border-violet-500/40 shadow-lg shadow-violet-600/10' : 'border-white/[0.06]'} backdrop-blur-sm overflow-hidden transition-colors duration-500 group-hover:border-white/[0.12] group-hover:bg-white/[0.04]`}>
                    <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                    {plan.badge && (
                      <div className={`absolute -top-0.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-xl text-[10px] font-bold text-white uppercase tracking-wider z-20 ${plan.popular ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
                        {plan.badge}
                      </div>
                    )}

                    {/* Header gradient strip */}
                    <div className={`relative p-6 bg-gradient-to-br ${plan.gradient} overflow-hidden`}>
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
                      <div className="relative z-10 flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 border border-white/30">
                          {plan.popular ? <Crown className="w-5 h-5 text-white" /> : plan.id === 'yearly' ? <Sparkles className="w-5 h-5 text-white" /> : <Zap className="w-5 h-5 text-white" />}
                        </div>
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed relative z-10">{plan.description}</p>
                    </div>

                    {/* Price section */}
                    <div className="p-6">
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-gray-600 line-through">${plan.originalPrice}</span>
                          <span className="text-4xl font-black text-white">${plan.price}</span>
                          <span className="text-gray-500">{plan.period}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {plan.savings ? (
                            <p className="text-emerald-400 text-xs font-medium">{plan.savings}</p>
                          ) : (
                            <p className="text-gray-700 text-xs">One-time payment</p>
                          )}
                        </div>
                        {plan.discount && (
                          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                            🎉 {plan.discount} Welcome Gift
                          </span>
                        )}
                      </div>

                      {/* Key highlights */}
                      <ul className="space-y-2 mb-6">
                        {['Full AI app generation', '9+ AI providers', 'Live preview & editors', '40+ languages', 'Deploy to 5 platforms', 'Unlimited generations', 'No auto-renewal'].map((f, j) => (
                          <li key={j} className="flex items-center gap-2.5 text-sm text-gray-400">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-400/30" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.15))' }}>
                              <Check className="w-2.5 h-2.5 text-emerald-300" />
                            </div>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      {activePlan?.type === plan.id ? (
                        <>
                          <div className="mb-3 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
                            <Check className="w-4 h-4" /> Active Plan — {activePlan.daysRemaining} days left
                          </div>
                          <button
                            onClick={handleCancelPlan}
                            disabled={isCancelling}
                            className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer disabled:opacity-50 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50"
                          >
                            {isCancelling ? (
                              <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Cancelling...</span>
                            ) : (
                              <span className="flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Cancel Plan</span>
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handlePurchase(plan.id)}
                          disabled={isLoading || isCheckingAuth || !!activePlan}
                          className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${activePlan
                            ? 'bg-white/[0.02] border border-white/[0.06] text-gray-600 cursor-not-allowed'
                            : plan.popular
                              ? 'bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30'
                              : 'bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15]'}`}
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </span>
                          ) : activePlan ? (
                            <span className="flex items-center justify-center gap-2">
                              <Lock className="w-4 h-4" /> Current Plan Active
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              {!authUser ? 'Sign in to Purchase' : `Get ${plan.name} Plan`}
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* All plans banner */}
            <div className="mt-10 p-5 rounded-2xl bg-gradient-to-r from-violet-500/[0.08] via-fuchsia-500/[0.05] to-cyan-500/[0.08] border border-violet-500/15 text-center">
              <p className="text-violet-300 font-semibold text-sm mb-1">All plans include identical features</p>
              <p className="text-gray-500 text-xs">The only difference is billing cycle and savings. Every plan gives full access to all GenCraft Pro capabilities below.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CAPABILITIES ═══ */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">What You Can Build with GenCraft Pro</h2>
            <p className="text-gray-500 text-sm text-center mb-10 max-w-2xl mx-auto">A browser-based AI IDE that generates full-stack applications from natural language descriptions. Everything included in every plan.</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {APP_CAPABILITIES.map((cap, i) => (
                <div key={i} className="capability-card p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.04] transition-colors duration-500">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(192,38,211,0.15))' }}>
                    <cap.icon className="w-5 h-5" style={{ color: '#ddd6fe', filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }} />
                  </div>
                  <h3 className="font-semibold text-gray-200 mb-2 text-sm">{cap.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{cap.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE COMPARISON TABLE ═══ */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Plan Comparison</h2>
            <p className="text-gray-500 text-sm text-center mb-10">Every plan includes all features — you only choose your billing cycle</p>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="px-6 py-4 text-left font-semibold text-gray-300">Feature</th>
                      <th className="px-6 py-4 text-center font-semibold text-cyan-400">
                        <Zap className="w-5 h-5 mx-auto mb-1" />Weekly (<span className="line-through text-gray-500">$14</span> $7)
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-violet-400 bg-violet-500/[0.05]">
                        <Crown className="w-5 h-5 mx-auto mb-1" />Monthly (<span className="line-through text-gray-500">$38</span> $19)
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-emerald-400">
                        <Sparkles className="w-5 h-5 mx-auto mb-1" />Yearly (<span className="line-through text-gray-500">$240</span> $120)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, i) => (
                      <tr key={i} className={`border-b border-white/[0.04] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''} hover:bg-white/[0.03] transition-colors`}>
                        <td className="px-6 py-3.5 font-medium text-gray-300">{row.feature}</td>
                        {(['w', 'm', 'y'] as const).map((key) => (
                          <td key={key} className={`px-6 py-3.5 text-center text-gray-500 ${key === 'm' ? 'bg-violet-500/[0.03]' : ''}`}>
                            {typeof row[key] === 'boolean' ? (
                              <Check className="w-5 h-5 mx-auto text-emerald-400" />
                            ) : (
                              <span className={`font-medium ${key === 'm' ? 'text-violet-400' : ''}`}>{row[key]}</span>
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
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="relative py-20 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-gray-500 text-sm text-center mb-10">Everything you need to know about GenCraft Pro</p>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="faq-card rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 transition-colors duration-300">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="relative z-10 w-full flex items-center justify-between p-5 text-left cursor-pointer select-none hover:bg-white/[0.03] rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 pr-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-violet-400/20"
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(192,38,211,0.1))' }}>
                        <span className="text-sm" style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' }}>
                          {i === 0 ? '🎨' : i === 1 ? '✅' : i === 2 ? '🤖' : i === 3 ? '🔄' : i === 4 ? '🚀' : '💻'}
                        </span>
                      </div>
                      <span className="font-bold text-gray-200 text-sm">{faq.q}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-violet-400' : 'text-gray-600'}`} />
                  </button>
                  <div
                    className="grid transition-all duration-300 ease-in-out"
                    style={{ gridTemplateRows: openFaq === i ? '1fr' : '0fr', opacity: openFaq === i ? 1 : 0 }}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 pt-0 ml-14">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/20 to-transparent mb-4" />
                        <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-24 z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        <div className="container mx-auto px-4">
          <div className="cta-block relative max-w-4xl mx-auto rounded-2xl overflow-hidden">
            <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-24 -right-24 w-56 h-56 rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)' }} />

            <div className="relative p-12 text-center border border-violet-500/20 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(15,15,20,0.95) 40%, rgba(6,182,212,0.08) 100%)' }}>
              <div className="absolute inset-0 rounded-2xl opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(6,182,212,0.2) 100%)', boxShadow: '0 0 40px rgba(139,92,246,0.15)' }}>
                  <Bot className="w-8 h-8 text-violet-300" style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.6))' }} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Want AI Agent Subscriptions?</h3>
                <p className="text-gray-400 mb-10 max-w-xl mx-auto text-sm leading-relaxed">
                  Explore pricing for all 18 AI agents with unique personalities, voice capabilities, and specialized skills.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/overview" className="group relative px-8 py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-600/20" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.85) 0%, rgba(192,38,211,0.75) 100%)' }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-400/0 via-white/10 to-violet-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10">View Agent Pricing</span>
                    <ArrowRight className="w-4 h-4 relative z-10" />
                  </Link>
                  <Link href="https://sanbayfusion.com/agents" className="px-8 py-3.5 rounded-xl text-gray-300 font-semibold text-sm flex items-center justify-center gap-2 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:text-white hover:border-violet-500/30 transition-all duration-300">
                    Explore AI Agents <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER NOTE ═══ */}
      <div className="text-center pb-12 space-y-2">
        <p className="text-white/15 text-xs">Powered by Stripe • SSL encrypted • No auto-renewal</p>
        <p className="text-white/10 text-xs">GenCraft Pro by Maula AI</p>
      </div>

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
