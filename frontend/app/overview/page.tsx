'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';
import { Sparkles, Check, Crown, Zap, Shield, CreditCard, ArrowRight, Bot, Paintbrush, Globe, HelpCircle, ChevronDown, Layers } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, CustomEase);

const overviewCards = [
    {
        title: 'Per-Agent Pricing',
        description: 'Simple, transparent pricing for AI agents. Pay per agent — daily, weekly, monthly, or yearly. No auto-renewal, no hidden fees.',
        href: '/overview/per-agent',
        icon: Bot,
        glow: 'rgba(6,182,212,0.4)',
        gradient: 'from-cyan-500 to-blue-500',
        stats: [
            { label: 'Starting at', value: '$1/day' },
            { label: 'Agents', value: '18+' },
            { label: 'Max Savings', value: '59%' },
        ],
        features: ['Access any single AI agent', 'Unlimited conversations', 'Voice interaction support', '50% OFF Welcome Gift'],
    },
    {
        title: 'GenCraft Pro Pricing',
        description: 'Full-stack app generation powered by cutting-edge AI. Weekly, monthly, or yearly plans for GenCraft Pro IDE.',
        href: '/overview/pricing',
        icon: Paintbrush,
        glow: 'rgba(139,92,246,0.4)',
        gradient: 'from-violet-500 to-fuchsia-500',
        stats: [
            { label: 'As low as', value: '$7/week' },
            { label: 'AI Models', value: '8+' },
            { label: 'Max Savings', value: '50%' },
        ],
        features: ['AI-powered app generation', 'Multiple AI models', 'Live preview & editing', '50% OFF Welcome Gift'],
    },
    {
        title: 'Canvas Studio',
        description: 'AI-powered web builder with Sandpack live preview, CloudPreview via AWS, sandbox execution, and one-click deployment.',
        href: '/overview/studio',
        icon: Layers,
        glow: 'rgba(249,115,22,0.4)',
        gradient: 'from-orange-500 to-amber-500',
        stats: [
            { label: 'As low as', value: '$10/week' },
            { label: 'AI Tools', value: '268' },
            { label: 'Max Savings', value: '50%' },
        ],
        features: ['Sandpack + CloudPreview', 'Sandbox code execution', 'One-click cloud deploy', '50% OFF Welcome Gift'],
    },
    {
        title: 'Spaces — maula.dev',
        description: 'Professional AI code editor & IDE at maula.dev. 268 AI tools across 39 categories. Credit-based billing with sandbox execution.',
        href: '/overview/spaces',
        icon: Globe,
        glow: 'rgba(16,185,129,0.4)',
        gradient: 'from-emerald-500 to-teal-500',
        stats: [
            { label: 'AI Tools', value: '268' },
            { label: 'Categories', value: '39' },
            { label: 'Providers', value: '9+' },
        ],
        features: ['Canvas Studio IDE', 'Maula Editor (maula.dev)', 'Sandbox code execution', 'One-click cloud deploy'],
    },
];

const comparisonRows = [
    { feature: 'Billing Model', agent: 'Per-agent', gencraft: 'Subscription', studio: 'Subscription', spaces: 'Credits' },
    { feature: 'Starting Price', agent: '$1/day (50% OFF)', gencraft: '$7/week (50% OFF)', studio: '$10/week (50% OFF)', spaces: '$5 pack' },
    { feature: 'AI Chat', agent: '✅', gencraft: '✅', studio: '✅', spaces: '✅' },
    { feature: 'Code Generation', agent: '—', gencraft: '✅', studio: '✅', spaces: '✅' },
    { feature: 'Live Preview', agent: '—', gencraft: '✅', studio: '✅ Sandpack', spaces: '✅' },
    { feature: 'Cloud Deployment', agent: '—', gencraft: '—', studio: '✅ AWS', spaces: '✅' },
    { feature: 'AI Tools', agent: 'Agent-specific', gencraft: 'Code tools', studio: '268 tools', spaces: '268 tools' },
    { feature: 'Video Generation', agent: '—', gencraft: '✅', studio: '✅', spaces: '✅' },
    { feature: 'Sandbox Execution', agent: '—', gencraft: '—', studio: '✅', spaces: '✅' },
    { feature: 'Voice Interaction', agent: '✅', gencraft: '—', studio: '—', spaces: '—' },
];

const faqItems = [
    { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, MasterCard, American Express) via Stripe. All payments are PCI DSS Level 1 compliant — your card details never touch our servers.' },
    { q: 'Is there auto-renewal on any plans?', a: 'No. All purchases are one-time. Your access expires at the end of your chosen period and you manually repurchase when you want to continue. No surprise charges.' },
    { q: 'Can I switch between plans or products?', a: 'Yes! Since each purchase is one-time, you can freely switch between per-agent pricing, GenCraft Pro, or Spaces credits at any time. There are no lock-in contracts.' },
    { q: 'Do you offer enterprise or custom plans?', a: 'Yes. Contact our sales team at support@maula.ai for custom enterprise pricing, volume discounts, dedicated support, and SLA guarantees.' },
    { q: 'What AI models are available?', a: 'We support 9+ AI providers including Anthropic (Claude Sonnet 4, Opus 4, Haiku), OpenAI (GPT-4o), Google (Gemini 2.5 Pro/Flash), Mistral, xAI (Grok 3), Groq, Cerebras, HuggingFace, and local models via Ollama.' },
    { q: 'Is my data safe?', a: 'Absolutely. All data is encrypted in transit (TLS 1.2/1.3) and at rest (AES-256). Credentials are encrypted with AES-256-GCM. We do not use your data to train AI models. See our Privacy Policy for full details.' },
    { q: 'What is the refund policy?', a: 'Given the low-cost, no-commitment nature of our pricing (starting at $1/day), all purchases are final and non-refundable. See our Payments & Refunds policy for details.' },
    { q: 'How does the credit system work on Spaces?', a: 'Each AI request on Spaces (maula.dev) consumes credits based on the model used, token count, and tool complexity. You purchase credit packs and use them across all 268 tools. Credits never expire.' },
];

export default function PricingOverviewPage() {
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
            CustomWiggle.create('overviewWiggle', { wiggles: 5, type: 'uniform' });

            gsap.to('.nebula-orb', { x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)', duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
            gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
                gsap.to(p, { y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 4 + Math.random() * 6, repeat: -1, delay: i * 0.3, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
            });
            gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

            if (titleRef.current) gsap.fromTo(titleRef.current, { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
            if (subtitleRef.current) gsap.fromTo(subtitleRef.current, { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });

            if (typewriterRef.current) {
                const phrases = ['No hidden fees, no auto-renewal', 'From AI agents to code generation', 'Simple transparent pricing', 'Pay only for what you use', '9+ AI providers available'];
                const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
                phrases.forEach((phrase) => {
                    tl.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
                    tl.to({}, { duration: 2 });
                    tl.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
                });
            }

            gsap.to('.hero-icon-container', { boxShadow: '0 0 80px rgba(139, 92, 246, 0.5), 0 0 160px rgba(139, 92, 246, 0.2)', scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

            ScrollTrigger.batch('.product-card', { onEnter: (els) => gsap.fromTo(els, { y: 60, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.15, ease: 'power3.out' }), start: 'top 90%', once: true });

            gsap.utils.toArray<HTMLElement>('.faq-card').forEach((el, i) => {
                gsap.set(el, { opacity: 0, y: 30 });
                ScrollTrigger.create({
                    trigger: el,
                    start: 'top 92%',
                    once: true,
                    onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.5, delay: i * 0.06, ease: 'power3.out' }),
                });
            });

            ScrollTrigger.create({
                trigger: '.cta-block',
                start: 'top 90%',
                once: true,
                onEnter: () => {
                    gsap.fromTo('.cta-block', { y: 40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' });
                    gsap.fromTo('.cta-glow', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.3 });
                },
            });

        }, containerRef);
        return () => ctx.revert();
    }, []);

    const handleCardHover = (cardId: string, isEntering: boolean) => {
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        if (!card) return;
        if (isEntering) {
            gsap.to(card, { y: -10, scale: 1.03, duration: 0.4, ease: 'power2.out' });
            gsap.to(card.querySelector('.card-shine'), { opacity: 1, duration: 0.4 });
            gsap.to(card.querySelector('.card-border-glow'), { opacity: 1, duration: 0.3 });
            gsap.to(card.querySelector('.card-icon-wrap'), { scale: 1.15, rotate: 8, duration: 0.5, ease: 'back.out(2)' });
        } else {
            gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
            gsap.to(card.querySelector('.card-shine'), { opacity: 0, duration: 0.4 });
            gsap.to(card.querySelector('.card-border-glow'), { opacity: 0, duration: 0.3 });
            gsap.to(card.querySelector('.card-icon-wrap'), { scale: 1, rotate: 0, duration: 0.4, ease: 'power2.out' });
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
                <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" style={{ top: '-2px' }} />
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="stardust absolute rounded-full" style={{ left: `${3 + i * 4.8}%`, top: `${60 + (i % 5) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 3 === 0 ? 'rgba(139,92,246,0.6)' : i % 3 === 1 ? 'rgba(6,182,212,0.6)' : 'rgba(16,185,129,0.5)', opacity: 0.6 }} />
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
                            <Crown className="w-14 h-14 relative z-10" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 18px rgba(167,139,250,0.8)) drop-shadow(0 0 40px rgba(139,92,246,0.5))' }} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-400/60 animate-pulse" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-fuchsia-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
                        </div>
                    </div>

                    <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Simple, Transparent</span>
                        <br />
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pricing</span>
                    </h1>

                    <p ref={subtitleRef} className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed font-light" style={{ opacity: 0 }}>
                        From AI agents to full-stack code generation — choose the plan that fits your workflow.
                        <span className="text-violet-400"> No hidden fees, no auto-renewal, no lock-in.</span>
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                        {[
                            { icon: Shield, label: 'Secure Stripe Payments' },
                            { icon: CreditCard, label: 'No Auto-Renewal' },
                            { icon: Zap, label: 'Instant Access' },
                        ].map((badge, i) => (
                            <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400">
                                <badge.icon className="w-4 h-4 text-violet-400" />
                                {badge.label}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center mb-14">
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-violet-600/15 border border-violet-500/25 backdrop-blur-sm shadow-lg shadow-violet-900/20">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30">
                                <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                            </div>
                            <span className="text-sm text-gray-300 font-mono">
                                <span ref={typewriterRef} className="text-gray-200"></span>
                                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle" />
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CHOOSE YOUR PRODUCT — 3 CARDS ═══ */}
            <section className="relative py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Choose Your Product</h2>
                        <p className="text-gray-500 text-sm text-center mb-10">Four powerful products, each with its own pricing model. Pick what you need.</p>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {overviewCards.map((card, i) => (
                                <Link key={i} href={card.href} data-card-id={`product-${i}`}
                                    className="product-card group relative block"
                                    style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                                    onMouseEnter={() => handleCardHover(`product-${i}`, true)}
                                    onMouseLeave={() => { handleCardHover(`product-${i}`, false); handleCardLeave(`product-${i}`); }}
                                    onMouseMove={(e) => handleCardMove(e, `product-${i}`)}>
                                    <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${card.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                                    <div className="relative h-full rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden transition-colors duration-500 group-hover:border-white/[0.12] group-hover:bg-white/[0.04]">
                                        <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                                        {/* Header gradient strip */}
                                        <div className={`relative p-6 bg-gradient-to-br ${card.gradient} overflow-hidden`}>
                                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
                                            <div className="relative z-10 flex items-center gap-3 mb-3">
                                                <div className="card-icon-wrap w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 border border-white/30">
                                                    <card.icon className="w-6 h-6 text-white" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white">{card.title}</h3>
                                            </div>
                                            <p className="text-white/80 text-sm leading-relaxed relative z-10">{card.description}</p>
                                        </div>

                                        {/* Stats row */}
                                        <div className="grid grid-cols-3 border-b border-white/[0.06]">
                                            {card.stats.map((stat, j) => (
                                                <div key={j} className="text-center p-3 border-r last:border-r-0 border-white/[0.06]">
                                                    <p className="text-sm font-bold text-white">{stat.value}</p>
                                                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">{stat.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Features */}
                                        <div className="p-6">
                                            <ul className="space-y-2.5 mb-5">
                                                {card.features.map((f, j) => (
                                                    <li key={j} className="flex items-center gap-2.5 text-sm text-gray-400">
                                                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-400/30" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.15))' }}>
                                                            <Check className="w-2.5 h-2.5 text-emerald-300" />
                                                        </div>
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="flex items-center justify-center gap-2 text-violet-400 font-semibold text-sm group-hover:gap-3 transition-all">
                                                View Details <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ QUICK COMPARISON TABLE ═══ */}
            <section className="relative py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Quick Comparison</h2>
                        <p className="text-gray-500 text-sm text-center mb-10">See how our products differ at a glance</p>

                        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/[0.08]">
                                            <th className="px-6 py-4 text-left font-semibold text-gray-300">Feature</th>
                                            <th className="px-6 py-4 text-center font-semibold text-cyan-400">
                                                <Bot className="w-5 h-5 mx-auto mb-1" />Per-Agent
                                            </th>
                                            <th className="px-6 py-4 text-center font-semibold text-violet-400">
                                                <Paintbrush className="w-5 h-5 mx-auto mb-1" />GenCraft Pro
                                            </th>
                                            <th className="px-6 py-4 text-center font-semibold text-orange-400">
                                                <Layers className="w-5 h-5 mx-auto mb-1" />Canvas Studio
                                            </th>
                                            <th className="px-6 py-4 text-center font-semibold text-emerald-400">
                                                <Globe className="w-5 h-5 mx-auto mb-1" />Spaces
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonRows.map((row, i) => (
                                            <tr key={i} className={`border-b border-white/[0.04] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''} hover:bg-white/[0.03] transition-colors`}>
                                                <td className="px-6 py-3.5 font-medium text-gray-300">{row.feature}</td>
                                                <td className="px-6 py-3.5 text-center text-gray-500">{row.agent}</td>
                                                <td className="px-6 py-3.5 text-center text-gray-500">{row.gencraft}</td>
                                                <td className="px-6 py-3.5 text-center text-gray-500">{row.studio}</td>
                                                <td className="px-6 py-3.5 text-center text-gray-500">{row.spaces}</td>
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
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-600/15 border border-violet-500/25 text-sm text-violet-400 font-medium mb-4">
                                <HelpCircle className="w-4 h-4" /> Common Questions
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Frequently Asked Questions</h2>
                            <p className="text-gray-500 text-sm">Everything you need to know about our plans and pricing</p>
                        </div>
                        <div className="space-y-3">
                            {faqItems.map((faq, i) => (
                                <div key={i} className="faq-card rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 transition-colors duration-300">
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="relative z-10 w-full flex items-center justify-between p-5 text-left cursor-pointer select-none hover:bg-white/[0.03] rounded-2xl transition-colors"
                                    >
                                        <span className="font-semibold text-gray-200 pr-4 text-sm">{faq.q}</span>
                                        <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-violet-400' : 'text-gray-600'}`} />
                                    </button>
                                    <div
                                        className="grid transition-all duration-300 ease-in-out"
                                        style={{
                                            gridTemplateRows: openFaq === i ? '1fr' : '0fr',
                                            opacity: openFaq === i ? 1 : 0,
                                        }}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="px-5 pb-5 pt-0">
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
                        {/* CTA glow orbs */}
                        <div className="cta-glow absolute -top-32 -left-32 w-64 h-64 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)' }} />
                        <div className="cta-glow absolute -bottom-24 -right-24 w-56 h-56 rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)' }} />
                        <div className="cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 60%)' }} />

                        {/* CTA content */}
                        <div className="relative p-12 text-center border border-violet-500/20 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(15,15,20,0.95) 40%, rgba(6,182,212,0.08) 100%)' }}>
                            <div className="absolute inset-0 rounded-2xl opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                            <div className="relative z-10">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(6,182,212,0.2) 100%)', boxShadow: '0 0 40px rgba(139,92,246,0.15)' }}>
                                    <Sparkles className="w-8 h-8 text-violet-300" style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.6))' }} />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Ready to get started?</h3>
                                <p className="text-gray-400 mb-10 max-w-xl mx-auto text-sm leading-relaxed">
                                    Choose a product above, or explore our AI agents and tools to find the perfect fit for your workflow.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center gap-4">
                                    <Link href="https://maula.ai/agents" className="group relative px-8 py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-600/20" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.85) 0%, rgba(192,38,211,0.75) 100%)' }}>
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-400/0 via-white/10 to-violet-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <Bot className="w-4 h-4 relative z-10" />
                                        <span className="relative z-10">Browse Agents</span>
                                    </Link>
                                    <Link href="/support/contact-us" className="px-8 py-3.5 rounded-xl text-gray-300 font-semibold text-sm flex items-center justify-center gap-2 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:text-white hover:border-violet-500/30 transition-all duration-300">
                                        Contact Sales <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
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