'use client';

import Link from 'next/link';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Heart, Landmark, ShoppingCart, Factory, Cpu, GraduationCap, ArrowRight, Sparkles, ChevronRight, Zap, Shield, TrendingUp, Headphones } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, MotionPathPlugin, DrawSVGPlugin } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, MotionPathPlugin, DrawSVGPlugin);

const colorMap: Record<string, { gradient: string; glow: string; border: string; text: string; bg: string }> = {
    red: { gradient: 'from-rose-500 to-red-500', glow: 'rgba(244,63,94,0.35)', border: 'border-rose-500/20', text: 'text-rose-400', bg: 'bg-rose-500/10' },
    green: { gradient: 'from-emerald-500 to-green-500', glow: 'rgba(16,185,129,0.35)', border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    purple: { gradient: 'from-violet-500 to-purple-500', glow: 'rgba(139,92,246,0.35)', border: 'border-violet-500/20', text: 'text-violet-400', bg: 'bg-violet-500/10' },
    orange: { gradient: 'from-amber-500 to-orange-500', glow: 'rgba(245,158,11,0.35)', border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
    blue: { gradient: 'from-blue-500 to-cyan-500', glow: 'rgba(59,130,246,0.35)', border: 'border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10' },
    pink: { gradient: 'from-pink-500 to-fuchsia-500', glow: 'rgba(236,72,153,0.35)', border: 'border-pink-500/20', text: 'text-pink-400', bg: 'bg-pink-500/10' },
};

const iconMap: Record<string, React.ComponentType<any>> = {
    Healthcare: Heart, 'Finance & Banking': Landmark, 'Retail & E-commerce': ShoppingCart,
    Manufacturing: Factory, Technology: Cpu, Education: GraduationCap,
};

export default function IndustriesOverview() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const industries = [
        { title: 'Healthcare', description: 'AI-powered solutions for patient care, diagnostics, and healthcare management', icon: '🏥', link: '/industries/healthcare', useCases: ['Patient Support', 'Medical Documentation', 'Appointment Scheduling'], color: 'red' },
        { title: 'Finance & Banking', description: 'Intelligent financial services, risk assessment, and customer support', icon: '🏦', link: '/industries/finance-banking', useCases: ['Customer Service', 'Risk Analysis', 'Fraud Detection'], color: 'green' },
        { title: 'Retail & E-commerce', description: 'Personalized shopping experiences and intelligent customer engagement', icon: '🛒', link: '/industries/retail-ecommerce', useCases: ['Product Recommendations', 'Customer Support', 'Inventory Management'], color: 'purple' },
        { title: 'Manufacturing', description: 'Smart manufacturing processes and predictive maintenance solutions', icon: '🏭', link: '/industries/manufacturing', useCases: ['Quality Control', 'Predictive Maintenance', 'Supply Chain Optimization'], color: 'orange' },
        { title: 'Technology', description: 'Advanced AI integration for tech companies and software development', icon: '💻', link: '/industries/technology', useCases: ['Code Review', 'Technical Support', 'Product Development'], color: 'blue' },
        { title: 'Education', description: 'Personalized learning experiences and educational support systems', icon: '🎓', link: '/industries/education', useCases: ['Personalized Tutoring', 'Administrative Support', 'Learning Analytics'], color: 'pink' },
    ];

    const benefits = [
        { icon: Zap, title: 'Fast Deployment', desc: 'Get up and running in days, not months' },
        { icon: Shield, title: 'Enterprise Security', desc: 'Bank-grade security and compliance' },
        { icon: TrendingUp, title: 'Proven ROI', desc: 'Measurable results and cost savings' },
        { icon: Headphones, title: 'Dedicated Support', desc: '24/7 expert assistance' },
    ];

    const handleMouseMove = useCallback((e: React.MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; }, []);

    /* twinkling stars canvas */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let raf: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
        resize(); window.addEventListener('resize', resize);
        const starColors = ['#ffffff', '#c4b5fd', '#93c5fd', '#86efac', '#fca5a5', '#fde68a'];
        const stars = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            r: Math.random() * 1.4 + 0.3, alpha: Math.random(),
            speed: Math.random() * 0.008 + 0.003,
            color: starColors[Math.floor(Math.random() * starColors.length)],
        }));
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                s.alpha += s.speed; if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
                ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
                ctx.fillStyle = s.color;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
                if (s.r > 1) { ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.15; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2); ctx.fill(); }
            });
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);

    /* GSAP full plugin animations */
    useEffect(() => {
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            /* Hero entrance */
            gsap.set('.ov-hero-badge', { y: 20, opacity: 0, scale: 0.8 });
            gsap.set('.ov-hero-sub', { y: 30, opacity: 0 });
            const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
            tl.to('.ov-hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });

            /* Hero title */
            gsap.set('.ov-hero-title', { opacity: 0, y: 40 });
            tl.to('.ov-hero-title', { opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)' }, '-=0.3');
            tl.to('.ov-hero-sub', { y: 0, opacity: 1, duration: 0.5 }, '-=0.4');
            tl.from('.ov-hero-cta', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.2');

            /* Benefit cards flip */
            gsap.set('.ov-benefit', { opacity: 0, y: 30 });
            ScrollTrigger.create({
                trigger: '.ov-benefits-grid',
                start: 'top 80%',
                onEnter: () => {
                    gsap.utils.toArray<HTMLElement>('.ov-benefit').forEach((el, i) => {
                        const state = Flip.getState(el);
                        gsap.set(el, { opacity: 1, y: 0 });
                        Flip.from(state, { duration: 0.5, delay: i * 0.1, ease: 'power2.out' });
                    });
                },
            });

            /* Industry cards stagger */
            gsap.set('.ov-industry', { y: 60, opacity: 0, scale: 0.95 });
            ScrollTrigger.batch('.ov-industry', {
                start: 'top 88%',
                onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)' }),
                onLeaveBack: batch => gsap.to(batch, { y: 60, opacity: 0, scale: 0.95, duration: 0.3 }),
            });

            /* DrawSVG decorative line */
            gsap.set('.ov-draw-line', { drawSVG: '0%' });
            ScrollTrigger.create({
                trigger: '.ov-industries-section',
                start: 'top 80%',
                onEnter: () => gsap.to('.ov-draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }),
            });

            /* CTA reveal */
            gsap.set('.ov-cta', { y: 40, opacity: 0 });
            ScrollTrigger.create({ trigger: '.ov-cta', start: 'top 85%', onEnter: () => gsap.to('.ov-cta', { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }) });

            /* Observer parallax */
            Observer.create({
                target: window, type: 'scroll',
                onChangeY: (self) => {
                    const s = self.scrollY;
                    gsap.to('.ov-nebula-1', { y: s * 0.12, duration: 0.4, ease: 'none' });
                    gsap.to('.ov-nebula-2', { y: s * -0.08, duration: 0.4, ease: 'none' });
                },
            });

            /* MotionPath orbit dot */
            gsap.to('.ov-orbit-dot', {
                motionPath: { path: [{ x: 0, y: 0 }, { x: 50, y: -25 }, { x: 100, y: 0 }, { x: 50, y: 25 }, { x: 0, y: 0 }], curviness: 2 },
                duration: 16, repeat: -1, ease: 'none',
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const handleCardMove = useCallback((e: React.MouseEvent<HTMLElement>, idx: number) => {
        setHoveredCard(idx);
        const card = e.currentTarget; const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, duration: 0.3, ease: 'power2.out' });
        const shine = card.querySelector('.card-shine') as HTMLElement;
        if (shine) { shine.style.opacity = '1'; shine.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.06) 0%, transparent 60%)`; }
        const glow = card.querySelector('.card-glow') as HTMLElement;
        if (glow) glow.style.opacity = '1';
    }, []);

    const handleCardLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
        setHoveredCard(null);
        const card = e.currentTarget;
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
        const shine = card.querySelector('.card-shine') as HTMLElement;
        const glow = card.querySelector('.card-glow') as HTMLElement;
        if (shine) shine.style.opacity = '0';
        if (glow) glow.style.opacity = '0';
    }, []);

    return (
        <div ref={containerRef} onMouseMove={handleMouseMove} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

            {/* nebula orbs + orbit dot */}
            <div className="fixed inset-0 pointer-events-none z-[1]">
                <div className="ov-nebula-1 absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
                <div className="ov-nebula-2 absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)' }} />
                <div className="ov-orbit-dot absolute top-48 left-1/3 w-2 h-2 bg-violet-400/40 rounded-full" />
            </div>

            {/* scan line + micro grid */}
            <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,92,246,0.015) 2px, rgba(139,92,246,0.015) 4px)' }} />
            <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            {/* mouse ambient light */}
            <div className="fixed inset-0 pointer-events-none z-[3] opacity-[0.02]" style={{ background: `radial-gradient(600px circle at ${mouseRef.current.x}px ${mouseRef.current.y}px, rgba(139,92,246,0.15), transparent 70%)` }} />

            {/* stardust particles */}
            <div className="fixed inset-0 pointer-events-none z-[2]">
                {[...Array(18)].map((_, i) => (
                    <div key={i} className="absolute rounded-full" style={{
                        width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px',
                        left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
                        background: 'rgba(139,92,246,0.3)',
                        animation: `float-particle ${10 + Math.random() * 20}s linear infinite`,
                        animationDelay: `-${Math.random() * 20}s`,
                    }} />
                ))}
            </div>

            {/* HERO */}
            <section className="relative z-10 pt-28 pb-16 lg:pt-36 lg:pb-20 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="ov-hero-badge inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-violet-500/20 bg-white/[0.02] backdrop-blur-sm mb-8">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">Complete Industry Overview</span>
                    </div>
                    <h1 className="ov-hero-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ background: 'linear-gradient(to right, #ffffff, #c4b5fd, #d8b4fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Industry Solutions</span>
                    </h1>
                    <p className="ov-hero-sub text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Specialized AI solutions tailored for specific industries, addressing unique challenges and delivering measurable results
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/support/book-consultation" className="ov-hero-cta group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20">
                            Industry Consultation <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/resources/case-studies" className="ov-hero-cta inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
                            View Case Studies
                        </Link>
                    </div>
                </div>
            </section>

            {/* BENEFITS */}
            <section className="relative z-10 py-12 px-4">
                <div className="ov-benefits-grid max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                    {benefits.map((b, idx) => {
                        const Icon = b.icon;
                        return (
                            <div key={idx} className="ov-benefit relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
                                <Icon className="w-5 h-5 text-violet-400/60 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-white mb-1">{b.title}</h3>
                                <p className="text-gray-500 text-xs">{b.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* INDUSTRIES GRID */}
            <section className="ov-industries-section relative z-10 py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14 relative">
                        <svg className="absolute -top-4 left-1/2 -translate-x-1/2 w-48 h-1 overflow-visible" viewBox="0 0 200 2"><line className="ov-draw-line" x1="0" y1="1" x2="200" y2="1" stroke="rgba(139,92,246,0.3)" strokeWidth="2" /></svg>
                        <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">Explore Industries</h2>
                        <p className="text-gray-500 text-lg">Tailored AI for every sector</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {industries.map((industry, idx) => {
                            const c = colorMap[industry.color] || colorMap.purple;
                            const Icon = iconMap[industry.title] || Cpu;
                            return (
                                <Link key={idx} href={industry.link}
                                    className="ov-industry group relative rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/[0.12]"
                                    style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
                                    onMouseMove={(e) => handleCardMove(e, idx)} onMouseLeave={handleCardLeave}
                                >
                                    <div className="card-shine absolute inset-0 opacity-0 pointer-events-none z-10 transition-opacity duration-300" />
                                    <div className="card-glow absolute -inset-px rounded-2xl opacity-0 pointer-events-none z-0 transition-opacity duration-300" style={{ boxShadow: `0 0 30px ${c.glow}` }} />
                                    <div className="relative z-10 p-8">
                                        <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${c.gradient} opacity-20`} />
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}><Icon className={`w-6 h-6 ${c.text}`} /></div>
                                            <span className="text-3xl">{industry.icon}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">{industry.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed mb-5">{industry.description}</p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {industry.useCases.map((uc, i) => (
                                                <span key={i} className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text} border ${c.border}`}>{uc}</span>
                                            ))}
                                        </div>
                                        <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${c.text} group-hover:gap-2.5 transition-all`}>Learn More <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* BOTTOM CTA */}
            <section className="ov-cta relative z-10 py-24 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="relative p-12 md:p-16 rounded-3xl overflow-hidden" style={{ background: 'rgba(3,3,4,0.85)', backdropFilter: 'blur(12px)' }}>
                        <div className="absolute inset-0 rounded-3xl border border-white/[0.06]" />
                        <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
                        <div className="relative z-10">
                            <Sparkles className="w-8 h-8 text-violet-400/60 mx-auto mb-4" />
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-violet-200 to-purple-300 bg-clip-text text-transparent">Don&apos;t See Your Industry?</h2>
                            <p className="text-gray-500 mb-8 text-lg max-w-xl mx-auto leading-relaxed">Contact us to discuss custom AI solutions for your specific business needs.</p>
                            <Link href="/support/contact" className="group inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold text-lg shadow-lg shadow-violet-500/20 transition-all">
                                Contact Us <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <style jsx global>{`
        @keyframes float-particle { 0%, 100% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 50% { transform: translateY(-100px) translateX(30px); } }
      `}</style>
        </div>
    );
}
