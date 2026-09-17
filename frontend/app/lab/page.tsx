'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, TextPlugin, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { LockedCard } from '@/components/LockedCard';
import { FlaskConical, Sparkles, ArrowRight, Swords, Image, Mic, Music, Palette, Moon, BookOpen, User, Crystal, Heart, MessageSquare, BarChart3, Zap } from 'lucide-react';

gsap.registerPlugin(SplitText, ScrambleTextPlugin, ScrollTrigger, TextPlugin, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin);

const API_BASE = '';

interface Experiment {
    id: string;
    name: string;
    description: string;
    icon: string;
    glow: string;
    href: string;
    status: 'live' | 'beta' | 'coming-soon';
    category: string;
    categoryColor: string;
}

interface LabStats {
    totalTestsAllTime: number;
    labActiveUsers: number;
    totalUsers: number;
}

export default function AILabPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const typewriterRef = useRef<HTMLSpanElement>(null);
    const { hasActiveSubscription } = useSubscriptionStatus();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [labStats, setLabStats] = useState<LabStats>({ totalTestsAllTime: 0, labActiveUsers: 0, totalUsers: 0 });
    const [experimentTestCounts, setExperimentTestCounts] = useState<Record<string, number>>({});

    const fetchLabStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/analytics/lab/stats`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
            if (!response.ok) return;
            const result = await response.json();
            if (result.success && result.data) {
                setLabStats({ totalTestsAllTime: result.data.realtime.totalTestsAllTime || 0, labActiveUsers: result.data.realtime.labActiveUsers || 0, totalUsers: result.data.realtime.totalUsers || 0 });
                const counts: Record<string, number> = {};
                result.data.experiments?.forEach((exp: { id: string; tests: number }) => { counts[exp.id] = exp.tests || 0; });
                setExperimentTestCounts(counts);
            }
        } catch (err) { console.error('Error fetching lab stats:', err); }
    }, []);

    useEffect(() => {
        fetchLabStats();
        const interval = setInterval(fetchLabStats, 10000);
        return () => clearInterval(interval);
    }, [fetchLabStats]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const experiments: Experiment[] = [
        { id: 'battle-arena', name: 'AI Battle Arena', description: 'Watch AI models compete head-to-head and vote for the winner', icon: '⚔️', glow: 'rgba(234,179,8,0.4)', href: '/lab/battle-arena', status: 'live', category: 'AI Battle', categoryColor: 'rgba(234,179,8,' },
        { id: 'image-playground', name: 'AI Image Playground', description: 'Generate stunning images with cutting-edge AI models', icon: '✨', glow: 'rgba(236,72,153,0.4)', href: '/lab/image-playground', status: 'live', category: 'Creative', categoryColor: 'rgba(236,72,153,' },
        { id: 'voice-cloning', name: 'Voice Cloning Studio', description: 'Clone voices and create custom speech synthesis', icon: '🎙️', glow: 'rgba(139,92,246,0.4)', href: '/lab/voice-cloning', status: 'live', category: 'Audio', categoryColor: 'rgba(139,92,246,' },
        { id: 'music-generator', name: 'AI Music Generator', description: 'Compose original music from text descriptions', icon: '🎵', glow: 'rgba(6,182,212,0.4)', href: '/lab/music-generator', status: 'live', category: 'Audio', categoryColor: 'rgba(6,182,212,' },
        { id: 'neural-art', name: 'Neural Art Studio', description: 'Transform photos with AI-powered style transfer', icon: '🎨', glow: 'rgba(249,115,22,0.4)', href: '/lab/neural-art', status: 'live', category: 'Creative', categoryColor: 'rgba(249,115,22,' },
        { id: 'dream-interpreter', name: 'Dream Interpreter', description: 'Analyze dreams and discover subconscious patterns', icon: '🌙', glow: 'rgba(167,139,250,0.4)', href: '/lab/dream-interpreter', status: 'live', category: 'Analysis', categoryColor: 'rgba(167,139,250,' },
        { id: 'story-weaver', name: 'Story Weaver', description: 'Create interactive narratives with AI assistance', icon: '📖', glow: 'rgba(16,185,129,0.4)', href: '/lab/story-weaver', status: 'live', category: 'Creative', categoryColor: 'rgba(16,185,129,' },
        { id: 'personality-mirror', name: 'Personality Mirror', description: 'Discover your communication style and traits', icon: '🪞', glow: 'rgba(20,184,166,0.4)', href: '/lab/personality-mirror', status: 'live', category: 'Analysis', categoryColor: 'rgba(20,184,166,' },
        { id: 'future-predictor', name: 'Future Predictor', description: 'Forecast trends and explore future scenarios', icon: '🔮', glow: 'rgba(99,102,241,0.4)', href: '/lab/future-predictor', status: 'live', category: 'Analysis', categoryColor: 'rgba(99,102,241,' },
        { id: 'emotion-visualizer', name: 'Emotion Visualizer', description: 'Analyze emotions and visualize feelings in text', icon: '❤️', glow: 'rgba(239,68,68,0.4)', href: '/lab/emotion-visualizer', status: 'live', category: 'Analysis', categoryColor: 'rgba(239,68,68,' },
        { id: 'debate-arena', name: 'Debate Arena', description: 'Watch AI agents debate on any topic', icon: '💬', glow: 'rgba(14,165,233,0.4)', href: '/lab/debate-arena', status: 'live', category: 'AI Battle', categoryColor: 'rgba(14,165,233,' },
    ];

    const stats = [
        { value: labStats.totalTestsAllTime.toLocaleString(), label: 'Total Experiments', glow: 'rgba(139,92,246,0.4)' },
        { value: labStats.labActiveUsers.toLocaleString(), label: 'Active Users', glow: 'rgba(6,182,212,0.4)' },
        { value: '11', label: 'AI Tools', glow: 'rgba(236,72,153,0.4)' },
        { value: '24/7', label: 'Availability', glow: 'rgba(16,185,129,0.4)' },
    ];

    useEffect(() => {
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            CustomWiggle.create('labWiggle', { wiggles: 5, type: 'uniform' });

            /* ── Background ── */
            gsap.to('.nebula-orb', { x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)', duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
            gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
                gsap.to(p, { y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 4 + Math.random() * 6, repeat: -1, delay: i * 0.3, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
            });
            gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

            /* ── Hero ── */
            if (titleRef.current) gsap.fromTo(titleRef.current, { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
            if (subtitleRef.current) gsap.fromTo(subtitleRef.current, { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });
            gsap.to('.hero-icon-container', { boxShadow: '0 0 80px rgba(6,182,212,0.5), 0 0 160px rgba(6,182,212,0.2)', scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

            if (typewriterRef.current) {
                const phrases = ['11 AI experiments to explore', 'Generate art, music & more', 'Real-time AI battles', 'Voice cloning technology', 'Free to experiment'];
                const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
                phrases.forEach((phrase) => {
                    tl.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
                    tl.to({}, { duration: 2 });
                    tl.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
                });
            }

            /* ── ScrambleText on stat values ── */
            gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
                const originalText = el.textContent || '';
                ScrollTrigger.create({
                    trigger: el, start: 'top 90%',
                    onEnter: () => { gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: '0123456789,', speed: 0.5 }, delay: i * 0.1 }); }
                });
            });

            /* ── Cards ── */
            ScrollTrigger.batch('.experiment-card', {
                start: 'top 90%', once: true,
                onEnter: (batch) => gsap.fromTo(batch, { y: 50, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
            });

            /* ── Observer parallax ── */
            Observer.create({
                target: window, type: 'scroll',
                onChangeY: (self) => {
                    const scrollY = self.scrollY;
                    gsap.to('.nebula-orb-1', { y: scrollY * 0.15, duration: 0.4, ease: 'none' });
                    gsap.to('.nebula-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
                }
            });

            /* ── MotionPath orbiting particle ── */
            gsap.to('.orbit-particle', {
                motionPath: { path: [{ x: 0, y: 0 }, { x: 80, y: -40 }, { x: 160, y: 0 }, { x: 80, y: 40 }, { x: 0, y: 0 }], curviness: 2 },
                duration: 16, repeat: -1, ease: 'none'
            });

            /* ── DrawSVG ── */
            gsap.set('.draw-line', { drawSVG: '0%' });
            ScrollTrigger.create({ trigger: '.experiments-section', start: 'top 80%', onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }) });

            /* ── Status badge pulse ── */
            gsap.utils.toArray<HTMLElement>('.status-live').forEach((badge) => {
                gsap.to(badge, { boxShadow: '0 0 12px rgba(34, 197, 94, 0.5)', duration: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            });

        }, containerRef);
        return () => ctx.revert();
    }, [labStats]);

    /* ── Card Hover Handlers (tools-page style) ── */
    const handleCardHover = (cardId: string, isEntering: boolean) => {
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        if (!card) return;
        if (isEntering) {
            gsap.to(card, { y: -10, scale: 1.03, duration: 0.4, ease: 'power2.out' });
            gsap.to(card.querySelector('.card-shine'), { opacity: 1, duration: 0.4 });
            gsap.to(card.querySelector('.card-border-glow'), { opacity: 1, duration: 0.3 });
            gsap.to(card.querySelector('.card-icon-wrap'), { scale: 1.15, rotate: 8, duration: 0.5, ease: 'back.out(2)' });
            gsap.to(card.querySelector('.card-arrow'), { x: 6, opacity: 1, duration: 0.3 });
        } else {
            gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
            gsap.to(card.querySelector('.card-shine'), { opacity: 0, duration: 0.4 });
            gsap.to(card.querySelector('.card-border-glow'), { opacity: 0, duration: 0.3 });
            gsap.to(card.querySelector('.card-icon-wrap'), { scale: 1, rotate: 0, duration: 0.4, ease: 'power2.out' });
            gsap.to(card.querySelector('.card-arrow'), { x: 0, opacity: 0.3, duration: 0.3 });
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
                <div className="nebula-orb nebula-orb-1 absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
                <div className="nebula-orb nebula-orb-2 absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
                <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ top: '-2px' }} />
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="stardust absolute rounded-full" style={{ left: `${3 + i * 4.8}%`, top: `${60 + (i % 5) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 3 === 0 ? 'rgba(6,182,212,0.6)' : i % 3 === 1 ? 'rgba(139,92,246,0.6)' : 'rgba(236,72,153,0.5)', opacity: 0.6 }} />
                ))}
                <div className="orbit-particle absolute top-40 left-1/3 w-2 h-2 bg-cyan-400/60 rounded-full" />
                <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 250, top: mousePos.y - 250, background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)' }} />
            </div>

            {/* ═══ HERO ═══ */}
            <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
                <div className="container mx-auto px-4 text-center relative z-10">
                    <div className="relative inline-block mb-10">
                        <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-cyan-500/30" />
                        <div className="hero-ring absolute -inset-12 rounded-full border border-cyan-400/15" style={{ animationDirection: 'reverse' }} />
                        <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-cyan-400/40 shadow-2xl shadow-cyan-600/30" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.35) 0%, rgba(139,92,246,0.25) 50%, rgba(6,182,212,0.3) 100%)' }}>
                            <FlaskConical className="w-14 h-14 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.5))' }} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
                        </div>
                    </div>

                    <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI</span>
                        <br />
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Laboratory</span>
                    </h1>

                    <p ref={subtitleRef} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light" style={{ opacity: 0 }}>
                        Explore cutting-edge AI experiments. Generate art, clone voices, compose music, and
                        <span className="text-cyan-400"> discover the future of AI.</span>
                    </p>

                    <div className="flex justify-center mb-10">
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600/15 via-violet-600/10 to-cyan-600/15 border border-cyan-500/25 backdrop-blur-sm shadow-lg shadow-cyan-900/20">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30">
                                <FlaskConical className="w-3.5 h-3.5 text-cyan-300" />
                            </div>
                            <span className="text-sm text-gray-300 font-mono">
                                <span ref={typewriterRef} className="text-gray-200"></span>
                                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-cyan-400 ml-0.5 align-middle" />
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="#experiments" className="px-7 py-3.5 bg-gradient-to-r from-cyan-600/90 to-violet-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-cyan-600/15 hover:shadow-cyan-600/30 transition-all duration-400 flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4" /> Start Experimenting
                        </Link>
                        <Link href="/lab/analytics" className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
                            <BarChart3 className="w-4 h-4" /> View Analytics
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══ STATS ═══ */}
            <section className="relative py-10 z-10">
                <div className="container mx-auto px-4">
                    <div className="max-w-5xl mx-auto stats-grid grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="stat-card text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-white/[0.1] transition-colors duration-500">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-cyan-400/30"
                                    style={{ background: `linear-gradient(135deg, ${stat.glow.replace('0.4', '0.25')}, rgba(6,182,212,0.15))` }}>
                                    <Sparkles className="w-5 h-5" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 6px ${stat.glow})` }} />
                                </div>
                                <div className="stat-value text-2xl md:text-3xl font-black text-white mb-1">{stat.value}</div>
                                <div className="text-gray-600 text-xs uppercase tracking-widest font-medium">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ EXPERIMENTS GRID ═══ */}
            <section id="experiments" className="experiments-section relative py-20 z-10">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <svg className="absolute left-1/2 -translate-x-1/2 -top-6 h-1 w-1/2 opacity-30" preserveAspectRatio="none">
                            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#labGrad)" strokeWidth="2" />
                            <defs><linearGradient id="labGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#06b6d4" /><stop offset="50%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                        </svg>

                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-cyan-400/30" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.15))' }}>
                                <FlaskConical className="w-5 h-5" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.4))' }} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">AI Experiments</h2>
                                <p className="text-sm text-gray-600">11 cutting-edge tools to explore</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {experiments.map((exp) => {
                                const testCount = experimentTestCounts[exp.id] || 0;
                                const CardContent = (
                                    <div
                                        data-card-id={exp.id}
                                        className="experiment-card group relative block"
                                        style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                                        onMouseEnter={() => handleCardHover(exp.id, true)}
                                        onMouseLeave={() => { handleCardHover(exp.id, false); handleCardLeave(exp.id); }}
                                        onMouseMove={(e) => handleCardMove(e, exp.id)}
                                    >
                                        <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${exp.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                                        <div className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
                                            <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
                                            <div className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-40 transition-opacity duration-500" style={{ background: `linear-gradient(to right, ${exp.glow}, transparent)` }} />

                                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                                <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wider" style={{ background: `${exp.categoryColor}0.1)`, border: `1px solid ${exp.categoryColor}0.25)`, color: `${exp.categoryColor}0.9)` }}>
                                                    {exp.category}
                                                </span>
                                                <span className={`status-live text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${exp.status === 'live' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : exp.status === 'beta' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-white/[0.04] text-gray-600 border border-white/[0.08]'}`}>
                                                    {exp.status === 'live' ? '● Live' : exp.status === 'beta' ? '● Beta' : 'Soon'}
                                                </span>
                                            </div>

                                            <div className="relative z-10">
                                                <div className="card-icon-wrap mb-4">
                                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl border border-cyan-400/30"
                                                        style={{ background: `linear-gradient(135deg, ${exp.glow.replace('0.4', '0.25')}, rgba(6,182,212,0.15))`, boxShadow: `0 0 20px ${exp.glow.replace('0.4', '0.08')}` }}>
                                                        <span style={{ filter: `drop-shadow(0 0 6px ${exp.glow})` }}>{exp.icon}</span>
                                                    </div>
                                                </div>
                                                <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300">{exp.name}</h3>
                                                <p className="text-gray-600 text-[13px] leading-relaxed mb-4 line-clamp-2 group-hover:text-gray-500 transition-colors duration-300">{exp.description}</p>
                                                <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                                                    <span className="text-[11px] text-gray-700 font-medium">{testCount.toLocaleString()} runs</span>
                                                    <ArrowRight className="card-arrow w-4 h-4 text-gray-700 opacity-30 transition-all duration-300" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );

                                if (!hasActiveSubscription && exp.status !== 'live') {
                                    return <LockedCard key={exp.id} title={exp.name} description="Subscribe to unlock">{CardContent}</LockedCard>;
                                }
                                return <Link key={exp.id} href={exp.href} className="block">{CardContent}</Link>;
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section className="relative py-20 z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="container mx-auto px-4 text-center">
                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Ready to Experiment?</h3>
                    <p className="text-gray-600 mb-10 max-w-xl mx-auto text-sm">Dive into our AI laboratory and discover what's possible with cutting-edge technology.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <Link href="/lab/battle-arena" className="px-7 py-3.5 bg-gradient-to-r from-cyan-600/90 to-violet-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-cyan-600/15 hover:shadow-cyan-600/30 transition-all duration-400 flex items-center justify-center gap-2">
                            ⚔️ Start with Battle Arena
                        </Link>
                        <Link href="https://sanbayfusion.com/agents" className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
                            Browse AI Agents <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <style jsx global>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }
        @keyframes cursorBlink { 0%, 45% { opacity: 1; } 50%, 95% { opacity: 0; } 100% { opacity: 1; } }
        .typewriter-cursor { animation: cursorBlink 0.8s ease-in-out infinite; }
      `}</style>
        </div>
    );
}