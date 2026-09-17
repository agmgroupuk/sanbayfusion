'use client';

import Link from 'next/link';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Shield, TrendingUp, BarChart3, Lock, Users, ArrowRight, ChevronRight } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, MotionPathPlugin, DrawSVGPlugin } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, MotionPathPlugin, DrawSVGPlugin);

export default function FinanceBankingPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const features = [
        { icon: Shield, title: 'Fraud Detection', description: 'Real-time AI-powered fraud detection and prevention across all transaction channels', benefits: ['Real-time Monitoring', 'Pattern Recognition', 'Zero False Positives'] },
        { icon: BarChart3, title: 'Risk Assessment', description: 'Advanced risk modeling and credit scoring using machine learning algorithms', benefits: ['Credit Scoring', 'Portfolio Risk', 'Stress Testing'] },
        { icon: Users, title: 'Customer Analytics', description: 'Deep customer insights for personalized banking experiences and retention', benefits: ['Behavioral Analysis', 'Churn Prediction', 'Segmentation'] },
        { icon: Lock, title: 'Compliance Automation', description: 'Automated regulatory compliance monitoring and reporting systems', benefits: ['KYC/AML', 'Auto-Reporting', 'Audit Trail'] },
    ];

    const stats = [
        { value: '99.9%', label: 'Fraud Detection Rate', icon: Shield },
        { value: '50%', label: 'Faster Processing', icon: TrendingUp },
        { value: '80%', label: 'Cost Reduction', icon: BarChart3 },
        { value: '$2B+', label: 'Transactions Protected', icon: Lock },
    ];

    const services = [
        { title: 'Smart Banking Assistant', desc: 'AI-powered customer service and support' },
        { title: 'Transaction Monitoring', desc: 'Real-time fraud detection and alerts' },
        { title: 'Loan Processing', desc: 'Automated underwriting and approvals' },
        { title: 'Portfolio Management', desc: 'AI-driven investment optimization' },
        { title: 'Regulatory Compliance', desc: 'Automated KYC and AML monitoring' },
        { title: 'Risk Analytics', desc: 'Predictive risk modeling and assessment' },
    ];

    const handleMouseMove = useCallback((e: React.MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let raf: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
        resize(); window.addEventListener('resize', resize);
        const starColors = ['#ffffff', '#6ee7b7', '#a7f3d0', '#34d399', '#c4b5fd', '#fde68a'];
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

    useEffect(() => {
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            gsap.set('.fb-badge', { y: 20, opacity: 0, scale: 0.8 });
            gsap.set('.fb-sub', { y: 30, opacity: 0 });
            const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
            tl.to('.fb-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });

            gsap.set('.fb-title', { opacity: 0, y: 40 });
            tl.to('.fb-title', { opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)' }, '-=0.3');
            tl.to('.fb-sub', { y: 0, opacity: 1, duration: 0.5 }, '-=0.4');
            tl.from('.fb-cta-btn', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.2');

            gsap.utils.toArray<HTMLElement>('.fb-stat-value').forEach((el, i) => {
                const orig = el.textContent || '';
                ScrollTrigger.create({
                    trigger: el, start: 'top 90%',
                    onEnter: () => { gsap.to(el, { duration: 1, scrambleText: { text: orig, chars: '0123456789+%$B.', speed: 0.3 }, delay: i * 0.1 }); },
                });
            });

            gsap.set('.fb-stat', { opacity: 0, y: 30 });
            ScrollTrigger.create({
                trigger: '.fb-stats-grid', start: 'top 80%',
                onEnter: () => {
                    gsap.utils.toArray<HTMLElement>('.fb-stat').forEach((el, i) => {
                        const state = Flip.getState(el);
                        gsap.set(el, { opacity: 1, y: 0 });
                        Flip.from(state, { duration: 0.5, delay: i * 0.1, ease: 'power2.out' });
                    });
                },
            });

            gsap.set('.fb-feature', { y: 60, opacity: 0, scale: 0.95 });
            ScrollTrigger.batch('.fb-feature', {
                start: 'top 88%',
                onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)' }),
                onLeaveBack: batch => gsap.to(batch, { y: 60, opacity: 0, scale: 0.95, duration: 0.3 }),
            });

            gsap.set('.fb-service', { y: 40, opacity: 0 });
            ScrollTrigger.batch('.fb-service', {
                start: 'top 88%',
                onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out' }),
            });

            gsap.set('.fb-draw-line', { drawSVG: '0%' });
            ScrollTrigger.create({ trigger: '.fb-features-section', start: 'top 80%', onEnter: () => gsap.to('.fb-draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }) });

            gsap.set('.fb-bottom-cta', { y: 40, opacity: 0 });
            ScrollTrigger.create({ trigger: '.fb-bottom-cta', start: 'top 85%', onEnter: () => gsap.to('.fb-bottom-cta', { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }) });

            Observer.create({
                target: window, type: 'scroll', onChangeY: (self) => {
                    gsap.to('.fb-nebula-1', { y: self.scrollY * 0.12, duration: 0.4, ease: 'none' });
                    gsap.to('.fb-nebula-2', { y: self.scrollY * -0.08, duration: 0.4, ease: 'none' });
                }
            });

            gsap.to('.fb-orbit-dot', {
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
            <div className="fixed inset-0 pointer-events-none z-[1]">
                <div className="fb-nebula-1 absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
                <div className="fb-nebula-2 absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 70%)' }} />
                <div className="fb-orbit-dot absolute top-48 left-1/3 w-2 h-2 bg-emerald-400/40 rounded-full" />
            </div>
            <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.012) 2px, rgba(16,185,129,0.012) 4px)' }} />
            <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            <div className="fixed inset-0 pointer-events-none z-[3] opacity-[0.02]" style={{ background: `radial-gradient(600px circle at ${mouseRef.current.x}px ${mouseRef.current.y}px, rgba(16,185,129,0.15), transparent 70%)` }} />
            <div className="fixed inset-0 pointer-events-none z-[2]">
                {[...Array(16)].map((_, i) => (
                    <div key={i} className="absolute rounded-full" style={{ width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%', background: 'rgba(16,185,129,0.3)', animation: `float-particle ${10 + Math.random() * 20}s linear infinite`, animationDelay: `-${Math.random() * 20}s` }} />
                ))}
            </div>

            <section className="relative z-10 pt-28 pb-16 lg:pt-36 lg:pb-20 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="fb-badge inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-emerald-500/20 bg-white/[0.02] backdrop-blur-sm mb-8">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium bg-gradient-to-r from-emerald-300 to-green-300 bg-clip-text text-transparent">Finance & Banking Solutions</span>
                    </div>
                    <h1 className="fb-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ background: 'linear-gradient(to right, #ffffff, #6ee7b7, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI for Finance</span>
                    </h1>
                    <p className="fb-sub text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Secure, intelligent AI solutions powering the future of financial services
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="https://maula.ai/agents" className="fb-cta-btn group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 transition-all shadow-lg shadow-emerald-500/20">
                            Explore Solutions <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/support/book-consultation" className="fb-cta-btn inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
                            Book Consultation
                        </Link>
                    </div>
                </div>
            </section>

            <section className="relative z-10 py-12 px-4">
                <div className="fb-stats-grid max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((s, idx) => {
                        const Icon = s.icon;
                        return (
                            <div key={idx} className="fb-stat relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
                                <Icon className="w-5 h-5 text-emerald-400/60 mx-auto mb-3" />
                                <div className="fb-stat-value text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">{s.value}</div>
                                <p className="text-gray-500 text-xs">{s.label}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="fb-features-section relative z-10 py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14 relative">
                        <svg className="absolute -top-4 left-1/2 -translate-x-1/2 w-48 h-1 overflow-visible" viewBox="0 0 200 2"><line className="fb-draw-line" x1="0" y1="1" x2="200" y2="1" stroke="rgba(16,185,129,0.3)" strokeWidth="2" /></svg>
                        <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">Financial Features</h2>
                        <p className="text-gray-500 text-lg">Enterprise-grade AI for financial institutions</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {features.map((f, idx) => {
                            const Icon = f.icon;
                            return (
                                <div key={idx} className="fb-feature group relative rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/[0.12]"
                                    style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
                                    onMouseMove={(e) => handleCardMove(e, idx)} onMouseLeave={handleCardLeave}
                                >
                                    <div className="card-shine absolute inset-0 opacity-0 pointer-events-none z-10 transition-opacity duration-300" />
                                    <div className="card-glow absolute -inset-px rounded-2xl opacity-0 pointer-events-none z-0 transition-opacity duration-300" style={{ boxShadow: '0 0 30px rgba(16,185,129,0.2)' }} />
                                    <div className="relative z-10 p-8">
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500 to-green-500 opacity-20" />
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5"><Icon className="w-6 h-6 text-emerald-400" /></div>
                                        <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed mb-4">{f.description}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {f.benefits.map((b, i) => (<span key={i} className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{b}</span>))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="relative z-10 py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">Financial Services</h2>
                        <p className="text-gray-500 text-lg">AI-powered solutions for every financial need</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {services.map((svc, idx) => (
                            <div key={idx} className="fb-service relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0" />
                                <h3 className="text-base font-bold text-white mb-2">{svc.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{svc.desc}</p>
                                <ChevronRight className="w-4 h-4 text-emerald-400/40 absolute top-6 right-6 group-hover:translate-x-1 group-hover:text-emerald-400 transition-all" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="fb-bottom-cta relative z-10 py-24 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="relative p-12 md:p-16 rounded-3xl overflow-hidden" style={{ background: 'rgba(3,3,4,0.85)', backdropFilter: 'blur(12px)' }}>
                        <div className="absolute inset-0 rounded-3xl border border-white/[0.06]" />
                        <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
                        <div className="relative z-10">
                            <Shield className="w-8 h-8 text-emerald-400/60 mx-auto mb-4" />
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-200 to-green-300 bg-clip-text text-transparent">Ready to Transform Finance?</h2>
                            <p className="text-gray-500 mb-8 text-lg max-w-xl mx-auto leading-relaxed">Join leading financial institutions using our AI to protect assets and drive growth.</p>
                            <Link href="/support/book-consultation" className="group inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl font-semibold text-lg shadow-lg shadow-emerald-500/20 transition-all">
                                Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
