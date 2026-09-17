'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, MotionPathPlugin, Observer } from '@/lib/gsap';
import { Building2, Users, Handshake, ArrowRight, ChevronRight, Sparkles, Target, ShieldCheck, Rocket, Heart, Zap, Globe, MessageSquare, Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, MotionPathPlugin, Observer);

export default function About() {
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const typewriterRef = useRef<HTMLSpanElement>(null);
    const statsRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const sections = [
        {
            id: 'overview',
            title: 'About Us',
            description: 'Learn about our mission, vision, and the story behind our AI agent platform.',
            icon: Building2,
            href: '/about/overview',
            glow: 'rgba(6,182,212,0.4)',
            color: 'from-cyan-500 to-blue-500',
            highlights: ['Company Mission', 'Our Vision', 'Core Values', 'Company History'],
        },
        {
            id: 'team',
            title: 'Meet the Team',
            description: 'Get to know the talented individuals driving innovation in AI technology.',
            icon: Users,
            href: '/about/team',
            glow: 'rgba(139,92,246,0.4)',
            color: 'from-violet-500 to-purple-500',
            highlights: ['Leadership Team', 'Engineering', 'Research', 'Customer Success'],
        },
        {
            id: 'partnerships',
            title: 'Partnerships',
            description: 'Discover our strategic partnerships and ecosystem of collaborators.',
            icon: Handshake,
            href: '/about/partnerships',
            glow: 'rgba(249,115,22,0.4)',
            color: 'from-amber-500 to-orange-500',
            highlights: ['Technology Partners', 'Integration Partners', 'Channel Partners', 'Academic Research'],
        },
    ];

    const stats = [
        { value: '50M+', label: 'Conversations', icon: MessageSquare, glow: 'rgba(6,182,212,0.4)' },
        { value: '10K+', label: 'Active Users', icon: Users, glow: 'rgba(139,92,246,0.4)' },
        { value: '99.9%', label: 'Uptime', icon: Zap, glow: 'rgba(16,185,129,0.4)' },
        { value: '150+', label: 'Countries', icon: Globe, glow: 'rgba(236,72,153,0.4)' },
    ];

    const values = [
        { icon: Target, title: 'Innovation', desc: "Continuously pushing the boundaries of what's possible with AI technology.", glow: 'rgba(6,182,212,0.4)' },
        { icon: ShieldCheck, title: 'Trust', desc: 'Building secure, reliable, and transparent AI solutions you can depend on.', glow: 'rgba(139,92,246,0.4)' },
        { icon: Rocket, title: 'Excellence', desc: 'Delivering exceptional experiences that exceed expectations every time.', glow: 'rgba(249,115,22,0.4)' },
    ];

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            CustomWiggle.create('aboutWiggle', { wiggles: 5, type: 'uniform' });

            /* ── Background animations ── */
            gsap.to('.nebula-orb', { x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)', duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
            gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
                gsap.to(p, { y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 4 + Math.random() * 6, repeat: -1, delay: i * 0.3, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
            });
            gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

            /* ── Hero entrance ── */
            if (titleRef.current) {
                gsap.fromTo(titleRef.current, { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
            }
            if (subtitleRef.current) {
                gsap.fromTo(subtitleRef.current, { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });
            }

            /* ── Hero icon pulse ── */
            gsap.to('.hero-icon-container', {
                boxShadow: '0 0 80px rgba(6,182,212,0.5), 0 0 160px rgba(6,182,212,0.2), inset 0 0 30px rgba(6,182,212,0.1)',
                scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
            });
            gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

            /* ── Typewriter badge ── */
            if (typewriterRef.current) {
                const phrases = ['Our mission drives everything', 'Building the future of AI', 'Trusted by 10K+ users globally', 'Innovation at the core', '150+ countries & counting'];
                const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
                phrases.forEach((phrase) => {
                    tl.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
                    tl.to({}, { duration: 2 });
                    tl.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
                });
            }

            /* ── Stats entrance ── */
            if (statsRef.current) {
                const statCards = statsRef.current.querySelectorAll('.stat-card');
                gsap.from(statCards, {
                    scrollTrigger: { trigger: statsRef.current, start: 'top 85%' },
                    opacity: 0, y: 80, rotationX: -40, scale: 0.85, stagger: 0.15, duration: 1, ease: 'back.out(1.7)',
                });
            }

            /* ── Mission card entrance ── */
            gsap.set('.mission-card', { y: 80, opacity: 0, scale: 0.95 });
            ScrollTrigger.create({
                trigger: '.mission-card', start: 'top 85%',
                onEnter: () => gsap.to('.mission-card', { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }),
            });

            /* ── Section cards stagger ── */
            gsap.utils.toArray<HTMLElement>('.about-card').forEach((card, i) => {
                gsap.from(card, {
                    scrollTrigger: { trigger: card, start: 'top 90%' },
                    opacity: 0, y: 60, scale: 0.92, duration: 0.7, delay: i * 0.12, ease: 'power3.out',
                });
            });

            /* ── Values section ── */
            gsap.set('.values-section', { y: 60, opacity: 0 });
            ScrollTrigger.create({
                trigger: '.values-section', start: 'top 85%',
                onEnter: () => {
                    gsap.to('.values-section', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
                    gsap.from('.value-card', { y: 50, opacity: 0, scale: 0.9, stagger: 0.15, duration: 0.6, delay: 0.2, ease: 'back.out(1.7)' });
                },
            });

            /* ── CTA entrance ── */
            gsap.set('.cta-section', { y: 50, opacity: 0 });
            ScrollTrigger.create({
                trigger: '.cta-section', start: 'top 90%',
                onEnter: () => gsap.to('.cta-section', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }),
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    /* ── Card hover with tilt + glow ── */
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
        if (shine) {
            shine.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`;
        }
    };

    const handleCardLeave = (cardId: string) => {
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        if (!card) return;
        gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

            {/* ═══ DEEP DARK BACKGROUND LAYER ═══ */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
                <div className="nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
                <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ top: '-2px' }} />
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="stardust absolute rounded-full" style={{ left: `${3 + i * 4.8}%`, top: `${60 + (i % 5) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 3 === 0 ? 'rgba(6,182,212,0.6)' : i % 3 === 1 ? 'rgba(139,92,246,0.6)' : 'rgba(236,72,153,0.5)', opacity: 0.6 }} />
                ))}
                <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 250, top: mousePos.y - 250, background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)' }} />
            </div>

            {/* ═══ HERO SECTION ═══ */}
            <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
                <div className="container mx-auto px-4 text-center relative z-10">

                    {/* Animated icon with rotating ring */}
                    <div className="relative inline-block mb-10">
                        <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-cyan-500/30" />
                        <div className="hero-ring absolute -inset-12 rounded-full border border-cyan-400/15" style={{ animationDirection: 'reverse' }} />
                        <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-cyan-400/40 shadow-2xl shadow-cyan-600/30"
                            style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.35) 0%, rgba(139,92,246,0.25) 50%, rgba(6,182,212,0.3) 100%)' }}>
                            <Building2 className="w-14 h-14 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 18px rgba(6,182,212,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.5))' }} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
                        </div>
                    </div>

                    <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>About</span>
                        <br />
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Maula AI</span>
                    </h1>

                    <p ref={subtitleRef} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light" style={{ opacity: 0 }}>
                        We&apos;re building the future of AI agents, empowering businesses to automate and scale with
                        <span className="text-cyan-400"> intelligent conversational AI.</span>
                    </p>

                    {/* Typewriter badge */}
                    <div className="flex justify-center mb-10">
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600/15 via-violet-600/10 to-cyan-600/15 border border-cyan-500/25 backdrop-blur-sm shadow-lg shadow-cyan-900/20">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30">
                                <Heart className="w-3.5 h-3.5 text-cyan-300" />
                            </div>
                            <span className="text-sm text-gray-300 font-mono">
                                <span ref={typewriterRef} className="text-gray-200"></span>
                                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-cyan-400 ml-0.5 align-middle" />
                            </span>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/about/overview" className="px-7 py-3.5 bg-gradient-to-r from-cyan-600/90 to-violet-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-cyan-600/15 hover:shadow-cyan-600/30 transition-all duration-400 flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4" /> Explore Our Story
                        </Link>
                        <Link href="/about/team" className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
                            <Users className="w-4 h-4" /> Meet the Team
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══ STATS ═══ */}
            <section className="relative py-8">
                <div className="container mx-auto px-4">
                    <div ref={statsRef} className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.map((stat, idx) => {
                            const IconComp = stat.icon;
                            return (
                                <div key={idx} className="stat-card text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-white/[0.1] transition-colors duration-500">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-cyan-400/30"
                                        style={{ background: `linear-gradient(135deg, ${stat.glow.replace('0.4', '0.25')}, rgba(6,182,212,0.15))` }}>
                                        <IconComp className="w-5 h-5" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 6px ${stat.glow})` }} />
                                    </div>
                                    <div className="stat-value text-2xl md:text-3xl font-black text-white mb-1">{stat.value}</div>
                                    <div className="text-gray-600 text-xs uppercase tracking-widest font-medium">{stat.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══ MISSION STATEMENT ═══ */}
            <section className="relative py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="mission-card relative p-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
                            <div className="absolute top-4 right-4 w-12 h-12 border-t border-r border-cyan-500/20 rounded-tr-xl" />
                            <div className="absolute bottom-4 left-4 w-12 h-12 border-b border-l border-cyan-500/20 rounded-bl-xl" />
                            <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.4), transparent 70%)' }} />

                            <div className="relative z-10 max-w-3xl mx-auto text-center">
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-6">
                                    <Target className="w-3 h-3" /> Mission Statement
                                </span>
                                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                    <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">Our Mission</span>
                                </h2>
                                <p className="text-lg text-gray-400 leading-relaxed mb-4">
                                    To democratize access to advanced AI technology by creating intelligent agents that understand, learn, and adapt to help businesses achieve their goals more efficiently.
                                </p>
                                <p className="text-gray-600 leading-relaxed">
                                    We believe that AI should be accessible, transparent, and designed to augment human capabilities rather than replace them.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ SECTION CARDS ═══ */}
            <section className="relative py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">

                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-cyan-400/30" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.15))' }}>
                                <Building2 className="w-5 h-5" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.4))' }} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Discover Maula AI</h2>
                                <p className="text-sm text-gray-600">Learn more about our company, people, and partners</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {sections.map((section) => {
                                const IconComp = section.icon;
                                return (
                                    <Link
                                        key={section.id}
                                        href={section.href}
                                        data-card-id={section.id}
                                        className="about-card group relative block"
                                        style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                                        onMouseEnter={() => handleCardHover(section.id, true)}
                                        onMouseLeave={() => { handleCardHover(section.id, false); handleCardLeave(section.id); }}
                                        onMouseMove={(e) => handleCardMove(e, section.id)}
                                    >
                                        <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${section.glow}, transparent 60%)`, filter: 'blur(1px)' }} />

                                        <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
                                            <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
                                            <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${section.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />

                                            <div className="relative z-10">
                                                <div className="flex items-start justify-between mb-5">
                                                    <div className="card-icon-wrap">
                                                        <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-cyan-400/30"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${section.glow.replace('0.4', '0.25')}, rgba(6,182,212,0.15))`,
                                                                boxShadow: `0 0 20px ${section.glow.replace('0.4', '0.12')}, 0 0 40px ${section.glow.replace('0.4', '0.06')}`,
                                                            }}>
                                                            <IconComp className="w-7 h-7" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 8px ${section.glow})` }} />
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="card-arrow w-5 h-5 text-gray-700 opacity-30 mt-2 transition-all duration-300" />
                                                </div>

                                                <h3 className="text-xl font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300">{section.title}</h3>
                                                <p className="text-gray-600 text-[13px] leading-relaxed mb-5 group-hover:text-gray-500 transition-colors duration-300">{section.description}</p>

                                                <div className="space-y-2 pt-4 border-t border-white/[0.04]">
                                                    {section.highlights.map((h, j) => (
                                                        <div key={j} className="flex items-center text-sm text-gray-600 group-hover:text-gray-500 transition-colors duration-300">
                                                            <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${section.color} mr-3 flex-shrink-0`} />
                                                            {h}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CORE VALUES ═══ */}
            <section className="values-section relative py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.15))' }}>
                                <Star className="w-5 h-5" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Our Core Values</h2>
                                <p className="text-sm text-gray-600">The principles that guide everything we do</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {values.map((v, i) => {
                                const IconComp = v.icon;
                                return (
                                    <div
                                        key={i}
                                        data-card-id={`value-${i}`}
                                        className="value-card group relative block"
                                        style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                                        onMouseEnter={() => handleCardHover(`value-${i}`, true)}
                                        onMouseLeave={() => { handleCardHover(`value-${i}`, false); handleCardLeave(`value-${i}`); }}
                                        onMouseMove={(e) => handleCardMove(e, `value-${i}`)}
                                    >
                                        <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${v.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                                        <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
                                            <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
                                            <div className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-40 transition-opacity duration-500" style={{ background: `linear-gradient(to right, ${v.glow}, transparent)` }} />

                                            <div className="relative z-10 text-center">
                                                <div className="card-icon-wrap inline-block mb-5">
                                                    <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto border border-cyan-400/30"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${v.glow.replace('0.4', '0.25')}, rgba(139,92,246,0.15))`,
                                                            boxShadow: `0 0 20px ${v.glow.replace('0.4', '0.12')}, 0 0 40px ${v.glow.replace('0.4', '0.06')}`,
                                                        }}>
                                                        <IconComp className="w-8 h-8" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 8px ${v.glow})` }} />
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-200 mb-3 group-hover:text-white transition-colors duration-300">{v.title}</h3>
                                                <p className="text-gray-600 text-[13px] leading-relaxed group-hover:text-gray-500 transition-colors duration-300">{v.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CTA FOOTER ═══ */}
            <section className="cta-section relative py-20 mt-8">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="container mx-auto px-4 text-center">
                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Ready to Get Started?</h3>
                    <p className="text-gray-600 mb-10 max-w-xl mx-auto text-sm">
                        Join thousands of businesses already using Maula AI to transform their workflows
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <Link href="https://maula.ai/agents" className="px-7 py-3.5 bg-gradient-to-r from-cyan-600/90 to-violet-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-cyan-600/15 hover:shadow-cyan-600/30 transition-all duration-400 flex items-center justify-center gap-2">
                            Explore AI Agents
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                        <Link href="/overview" className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4" /> View Pricing
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══ GLOBAL STYLES ═══ */}
            <style jsx global>{`
                html { scroll-behavior: smooth; }

                .about-card::before,
                .value-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 1rem;
                    opacity: 0.015;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
                    pointer-events: none;
                    z-index: 1;
                }

                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #030304; }
                ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }

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
