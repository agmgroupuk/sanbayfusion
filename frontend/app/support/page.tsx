'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap';

export default function SupportPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const supportOptions = [
        {
            title: 'Help Center',
            description: 'Browse our comprehensive knowledge base and documentation',
            icon: '📚',
            href: '/support/help-center',
            features: ['Documentation', 'Tutorials', 'Guides'],
        },
        {
            title: 'FAQs',
            description: 'Find answers to frequently asked questions',
            icon: '❓',
            href: '/support/faqs',
            features: ['Common Questions', 'Quick Answers', 'Troubleshooting'],
        },
        {
            title: 'Live Support',
            description: 'Chat with our AI assistant Luna for real-time help',
            icon: '💬',
            href: '/support/live-support',
            features: ['24/7 Available', 'Instant Response', 'AI Powered'],
        },
        {
            title: 'Create Ticket',
            description: 'Submit a detailed support ticket for complex issues',
            icon: '🎫',
            href: '/support/create-ticket',
            features: ['Priority Support', 'Issue Tracking', 'Human Response'],
        },
        {
            title: 'Contact Us',
            description: 'Send us a direct message for general inquiries',
            icon: '📧',
            href: '/support/contact-us',
            features: ['Email Support', 'Direct Contact', 'Fast Response'],
        },
        {
            title: 'Book Consultation',
            description: 'Schedule a one-on-one call with our experts',
            icon: '📅',
            href: '/support/book-consultation',
            features: ['Expert Advice', 'Personalized', '30-min Sessions'],
        },
    ];

    const stats = [
        { value: 99, suffix: '%', label: 'Satisfaction Rate' },
        { value: 2, suffix: 'hrs', label: 'Avg Response Time' },
        { value: 24, suffix: '/7', label: 'Live Support' },
        { value: 50, suffix: 'K+', label: 'Issues Resolved' },
    ];

    /* ─── Ice particle canvas ─── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let raf: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        const particles = Array.from({ length: 45 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -Math.random() * 0.4 - 0.1,
            opacity: Math.random() * 0.4 + 0.1,
            phase: Math.random() * Math.PI * 2,
        }));
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const t = Date.now() * 0.001;
            particles.forEach(p => {
                p.x += p.vx + Math.sin(t + p.phase) * 0.15;
                p.y += p.vy;
                if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
                if (p.x < -5) p.x = canvas.width + 5;
                if (p.x > canvas.width + 5) p.x = -5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180, 220, 255, ${Math.max(0, p.opacity + Math.sin(t * 2 + p.phase) * 0.1)})`;
                ctx.fill();
            });
            raf = requestAnimationFrame(draw);
        };
        draw();
        window.addEventListener('resize', resize);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);

    /* ─── GSAP Animations ─── */
    useEffect(() => {
        if (!containerRef.current) return;
        const timer = setTimeout(() => {
            const ctx = gsap.context(() => {
                gsap.registerPlugin(ScrollTrigger);

                // Hero title split
                const title = new SplitText('.support-title', { type: 'chars' });
                gsap.set(title.chars, { y: 60, opacity: 0, rotateX: -90 });
                gsap.set('.support-badge', { y: 20, opacity: 0, scale: 0.9 });
                gsap.set('.support-subtitle', { y: 30, opacity: 0 });
                gsap.set('.support-cta', { y: 20, opacity: 0, scale: 0.95 });

                const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });
                heroTl
                    .to('.support-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6 })
                    .to(title.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.025 }, '-=0.3')
                    .to('.support-subtitle', { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
                    .to('.support-cta', { y: 0, opacity: 1, scale: 1, duration: 0.5 }, '-=0.2');

                // Stat counters
                gsap.utils.toArray<HTMLElement>('.stat-counter').forEach((stat) => {
                    const target = parseInt(stat.dataset.target || '0');
                    gsap.from(stat, {
                        textContent: 0,
                        duration: 2,
                        ease: 'power2.out',
                        snap: { textContent: 1 },
                        scrollTrigger: { trigger: stat, start: 'top 85%', once: true },
                        onUpdate() { stat.textContent = String(Math.ceil(parseFloat(stat.textContent || '0'))); },
                    });
                });

                // Stat cards stagger
                ScrollTrigger.batch('.stat-card', {
                    onEnter: (els) => gsap.fromTo(els, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.5)' }),
                    start: 'top 90%',
                    once: true,
                });

                // Support cards stagger
                ScrollTrigger.batch('.support-card', {
                    onEnter: (els) => gsap.fromTo(els, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.5)' }),
                    start: 'top 90%',
                    once: true,
                });

                // Card hover
                document.querySelectorAll('.support-card').forEach(card => {
                    const icon = card.querySelector('.card-icon');
                    card.addEventListener('mouseenter', () => {
                        gsap.to(icon, { rotation: 15, scale: 1.15, duration: 0.3 });
                        gsap.to(card, { y: -8, duration: 0.3 });
                    });
                    card.addEventListener('mouseleave', () => {
                        gsap.to(icon, { rotation: 0, scale: 1, duration: 0.3 });
                        gsap.to(card, { y: 0, duration: 0.3 });
                    });
                });

                // Emergency banner
                gsap.set('.emergency-banner', { y: 30, opacity: 0 });
                ScrollTrigger.create({
                    trigger: '.emergency-banner',
                    start: 'top 85%',
                    once: true,
                    onEnter: () => gsap.to('.emergency-banner', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }),
                });

                // Fog drift
                gsap.to('.fog-layer-1', { x: 40, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' });
                gsap.to('.fog-layer-2', { x: -30, duration: 15, repeat: -1, yoyo: true, ease: 'sine.inOut' });
                gsap.to('.frost-glow', { opacity: 0.06, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });

                ScrollTrigger.refresh();
            }, containerRef);

            return () => ctx.revert();
        }, 50);

        return () => clearTimeout(timer);
    }, []);

    /* ─── Ice-themed inline styles ─── */
    const iceCardStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
    };

    const iceCardHoverBorder = 'rgba(255,255,255,0.1)';

    return (
        <div ref={containerRef} className="min-h-screen text-white overflow-hidden" style={{ backgroundColor: '#030304' }}>
            {/* ── Background ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* Nebula orbs */}
                <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
                <div className="absolute top-[50%] right-[15%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[20%] left-[40%] w-[350px] h-[350px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
                {/* Micro grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            {/* Ice particle canvas */}
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />

            {/* ── Hero Section ── */}
            <section className="relative z-10 pt-32 pb-16 px-6">
                <div className="max-w-5xl mx-auto text-center">
                    {/* Badge */}
                    <div className="support-badge inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8 bg-white/[0.04] border border-white/[0.08]">
                        <span className="text-lg">🎧</span>
                        <span className="text-sm font-medium text-gray-400">We&apos;re Here to Help</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                        <span className="support-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            Support Center
                        </span>
                    </h1>

                    <p className="support-subtitle text-xl md:text-2xl max-w-3xl mx-auto mb-10 text-gray-500">
                        Get help, contact support, book consultations, and find answers to
                        <span className="text-gray-400"> all your questions.</span>
                    </p>

                    <Link href="/support/help-center" className="support-cta inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-[1.03] bg-gradient-to-r from-cyan-600 to-violet-600 border border-white/[0.1]">
                        <span>Get Support</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </section>

            {/* ── Stats Section ── */}
            <section className="relative z-10 py-16 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {stats.map((stat, i) => (
                            <div key={i} className="stat-card relative text-center p-6 rounded-2xl overflow-hidden group" style={iceCardStyle}>

                                <div className="relative text-4xl md:text-5xl font-bold text-white">
                                    <span className="stat-counter" data-target={stat.value}>{stat.value}</span>
                                    <span className="text-gray-400">{stat.suffix}</span>
                                </div>
                                <p className="relative mt-2 text-gray-500">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Support Options Grid ── */}
            <section className="relative z-10 py-16 px-6">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            How Can We Help You?
                        </span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {supportOptions.map((option, i) => (
                            <Link
                                key={i}
                                href={option.href}
                                className="support-card group relative block p-6 rounded-2xl overflow-hidden transition-all duration-300"
                                style={iceCardStyle}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = iceCardHoverBorder; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                            >
                                <div className="card-icon relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 bg-white/[0.04] border border-white/[0.08]">
                                    {option.icon}
                                </div>

                                <h3 className="relative text-xl font-bold mb-2 text-white/90">
                                    {option.title}
                                </h3>
                                <p className="relative mb-4 text-gray-500">{option.description}</p>

                                <div className="relative flex flex-wrap gap-2">
                                    {option.features.map((feature, fi) => (
                                        <span key={fi} className="px-3 py-1 text-xs rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500">
                                            {feature}
                                        </span>
                                    ))}
                                </div>

                                {/* Hover arrow */}
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Emergency Support Banner ── */}
            <section className="relative z-10 py-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="emergency-banner relative p-8 rounded-2xl overflow-hidden bg-white/[0.02] border border-red-500/[0.15] backdrop-blur-sm">

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-red-500/[0.08] border border-red-500/[0.2]">
                                    🚨
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white/90">Need Urgent Help?</h3>
                                    <p className="text-gray-500">For critical issues, use our priority support channel</p>
                                </div>
                            </div>
                            <Link
                                href="/support/create-ticket?priority=critical"
                                className="px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap hover:scale-[1.03] bg-gradient-to-r from-red-600 to-orange-600 border border-white/[0.1]"
                            >
                                Create Urgent Ticket
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
