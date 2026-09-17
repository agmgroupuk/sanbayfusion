'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, Observer } from '@/lib/gsap';
import Link from 'next/link';
import { AlertTriangle, Flag, UserX, Shield, Bug, Scale, MessageSquare, Eye, ArrowLeft, Clock, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, Observer);

interface TwinklingStar { x: number; y: number; size: number; opacity: number; speed: number; phase: number; color: string; }

const reportTypes = [
    { id: 'inappropriate-content', icon: Flag, label: 'Inappropriate Content', color: 'rgba(245,158,11,' },
    { id: 'abuse', icon: UserX, label: 'Abuse or Harassment', color: 'rgba(239,68,68,' },
    { id: 'security', icon: Shield, label: 'Security Vulnerability', color: 'rgba(6,182,212,' },
    { id: 'bug', icon: Bug, label: 'Technical Bug', color: 'rgba(139,92,246,' },
    { id: 'policy-violation', icon: Scale, label: 'Policy Violation', color: 'rgba(236,72,153,' },
    { id: 'other', icon: MessageSquare, label: 'Other Issue', color: 'rgba(156,163,175,' },
];

const severityLevels = [
    { id: 'low', label: 'Low', desc: 'Minor issue, no urgency', color: 'emerald', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    { id: 'medium', label: 'Medium', desc: 'Moderate impact', color: 'amber', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
    { id: 'high', label: 'High', desc: 'Significant impact', color: 'orange', border: 'border-orange-500/20', bg: 'bg-orange-500/10' },
    { id: 'critical', label: 'Critical', desc: 'Urgent, immediate risk', color: 'red', border: 'border-red-500/20', bg: 'bg-red-500/10' },
];

export default function ReportsPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<TwinklingStar[]>([]);
    const animFrameRef = useRef<number>(0);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', reportType: '', severity: '', description: '', evidence: '', agentName: '', agreeToTerms: false });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await new Promise(r => setTimeout(r, 2000));
        setIsSubmitting(false);
        setIsSubmitted(true);
    };

    useEffect(() => { const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY }); window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h); }, []);

    const initStars = useCallback(() => {
        const c = canvasRef.current; if (!c) return;
        c.width = window.innerWidth; c.height = document.documentElement.scrollHeight || window.innerHeight * 5;
        const colors = ['rgba(255,255,255,', 'rgba(239,68,68,', 'rgba(245,158,11,', 'rgba(139,92,246,'];
        const stars: TwinklingStar[] = [];
        for (let i = 0; i < 120; i++) stars.push({ x: Math.random() * c.width, y: Math.random() * c.height, size: Math.random() * 2 + 0.4, opacity: Math.random() * 0.7 + 0.2, speed: Math.random() * 0.02 + 0.005, phase: Math.random() * Math.PI * 2, color: colors[Math.floor(Math.random() * colors.length)] });
        starsRef.current = stars;
    }, []);

    const animateStars = useCallback(() => {
        const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        starsRef.current.forEach(s => { s.phase += s.speed; const t = (Math.sin(s.phase) + 1) / 2; const a = s.opacity * (0.3 + t * 0.7); ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fillStyle = `${s.color}${a.toFixed(2)})`; ctx.fill(); if (s.size > 1.4 && t > 0.6) { ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2); const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3); g.addColorStop(0, `${s.color}${(a * 0.25).toFixed(2)})`); g.addColorStop(1, `${s.color}0)`); ctx.fillStyle = g; ctx.fill(); } });
        animFrameRef.current = requestAnimationFrame(animateStars);
    }, []);

    useEffect(() => { initStars(); animateStars(); const h = () => { const c = canvasRef.current; if (c) { c.width = window.innerWidth; c.height = document.documentElement.scrollHeight || window.innerHeight * 5; initStars(); } }; window.addEventListener('resize', h); return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener('resize', h); }; }, [initStars, animateStars]);

    useEffect(() => {
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            CustomWiggle.create('rptW', { wiggles: 5, type: 'uniform' });
            gsap.to('.nebula-orb', { x: 'random(-100,100)', y: 'random(-70,70)', scale: 'random(0.6,1.4)', opacity: 'random(0.03,0.07)', duration: 14, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
            gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => { gsap.to(p, { y: '-=200', x: 'random(-50,50)', opacity: 0, duration: 5 + Math.random() * 5, repeat: -1, delay: i * 0.35, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } }); });
            gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });
            gsap.fromTo('.hero-title', { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
            gsap.fromTo('.hero-subtitle', { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });
            gsap.to('.hero-icon-container', { boxShadow: '0 0 60px rgba(239,68,68,0.4), 0 0 120px rgba(239,68,68,0.15)', scale: 1.06, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });
            gsap.from('.hero-badge', { scale: 0, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.8 });
            gsap.from('.info-card', { scrollTrigger: { trigger: '.info-cards-grid', start: 'top 85%' }, opacity: 0, y: 50, duration: 0.6, stagger: 0.1, ease: 'power3.out' });
            gsap.set('.form-container', { y: 40, opacity: 0 }); ScrollTrigger.create({ trigger: '.form-container', start: 'top 88%', onEnter: () => gsap.to('.form-container', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }) });
            gsap.set('.disclaimer-block', { y: 40, opacity: 0 }); ScrollTrigger.create({ trigger: '.disclaimer-block', start: 'top 88%', onEnter: () => gsap.to('.disclaimer-block', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }) });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const infoCards = [
        { icon: Eye, title: 'Review Process', desc: 'Every report is reviewed by our team within 24 hours. We take all reports seriously.', glow: 'rgba(6,182,212,0.4)' },
        { icon: Shield, title: 'Your Privacy', desc: 'Reports are confidential. Your identity will not be shared with the reported party.', glow: 'rgba(139,92,246,0.4)' },
        { icon: Scale, title: 'Fair Investigation', desc: 'We conduct thorough, impartial investigations based on our community guidelines.', glow: 'rgba(16,185,129,0.4)' },
    ];

    if (isSubmitted) {
        return (
            <div ref={containerRef} className="min-h-screen bg-[#030304] text-white flex items-center justify-center overflow-x-hidden">
                <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.7 }} />
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="nebula-orb absolute top-[30%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)' }} />
                </div>
                <div className="relative z-10 text-center p-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl border border-emerald-400/40 mb-6" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.15))' }}>
                        <CheckCircle className="w-10 h-10" style={{ color: '#6ee7b7', filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.6))' }} />
                    </div>
                    <h2 className="text-3xl font-black mb-3"><span className="bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">Report Submitted</span></h2>
                    <p className="text-gray-500 max-w-md mx-auto mb-8">Thank you for your report. Our team will review it within 24 hours and take appropriate action. You&apos;ll receive updates at your email.</p>
                    <Link href="/legal" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/25 text-emerald-400 font-medium text-sm hover:border-emerald-500/40 transition-all">
                        <ArrowLeft className="w-4 h-4" />Back to Legal
                    </Link>
                </div>
                <style jsx global>{`
                    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #030304; } ::-webkit-scrollbar-thumb { background: rgba(239,68,68,0.3); border-radius: 3px; }
                `}</style>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.7 }} />
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="nebula-orb absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.5) 0%, transparent 70%)' }} />
                <div className="nebula-orb absolute top-[55%] right-[15%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" style={{ top: '-2px' }} />
                {[...Array(15)].map((_, i) => <div key={i} className="stardust absolute rounded-full" style={{ left: `${5 + i * 6.2}%`, top: `${60 + (i % 4) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 2 === 0 ? 'rgba(239,68,68,0.6)' : 'rgba(245,158,11,0.5)', opacity: 0.6 }} />)}
                <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 200, top: mousePos.y - 200, background: 'radial-gradient(circle, rgba(239,68,68,0.5) 0%, transparent 70%)' }} />
            </div>

            <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-20 z-10">
                <div className="container mx-auto px-4 text-center relative z-10">
                    <div className="absolute top-6 left-4 lg:top-8 lg:left-6">
                        <Link href="/legal" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-400 transition-colors text-sm group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />Back to Legal
                        </Link>
                    </div>
                    <div className="relative inline-block mb-8">
                        <div className="hero-ring absolute -inset-5 rounded-full border-2 border-dashed border-red-500/30" />
                        <div className="hero-icon-container relative inline-flex items-center justify-center w-24 h-24 rounded-3xl border border-red-400/40 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.35), rgba(245,158,11,0.25))' }}>
                            <AlertTriangle className="w-12 h-12 relative z-10" style={{ color: '#fca5a5', filter: 'drop-shadow(0 0 15px rgba(239,68,68,0.7))' }} />
                        </div>
                    </div>
                    <h1 className="hero-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Submit a Report</span>
                    </h1>
                    <p className="hero-subtitle text-lg text-gray-400 max-w-2xl mx-auto mb-8 font-light" style={{ opacity: 0 }}>Help us maintain a safe community. Report issues, concerns, or <span className="text-red-400">violations.</span></p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-red-500/20 backdrop-blur-sm flex items-center gap-2"><Clock className="w-4 h-4 text-red-400" /><span className="text-sm text-gray-400 font-medium">24h Response Time</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-sm flex items-center gap-2"><Lock className="w-4 h-4 text-amber-400" /><span className="text-sm text-gray-400 font-medium">Confidential</span></div>
                    </div>
                </div>
            </section>

            <section className="relative py-8 z-10">
                <div className="container mx-auto px-4"><div className="max-w-4xl mx-auto">
                    <div className="info-cards-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                        {infoCards.map((card, i) => {
                            const Icon = card.icon;
                            return (
                                <div key={i} className="info-card p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                                    <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-white/[0.08] mb-3" style={{ background: `linear-gradient(135deg, ${card.glow.replace('0.4', '0.2')}, rgba(239,68,68,0.1))`, boxShadow: `0 0 16px ${card.glow.replace('0.4', '0.08')}` }}>
                                        <Icon className="w-5 h-5" style={{ color: '#fca5a5', filter: `drop-shadow(0 0 6px ${card.glow})` }} />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-200 mb-1.5">{card.title}</h3>
                                    <p className="text-gray-600 text-xs leading-relaxed">{card.desc}</p>
                                </div>
                            );
                        })}
                    </div>

                    <form onSubmit={handleSubmit} className="form-container space-y-8">
                        {/* Report Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-3">Report Type *</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {reportTypes.map((rt) => {
                                    const Icon = rt.icon;
                                    const sel = form.reportType === rt.id;
                                    return (
                                        <button key={rt.id} type="button" onClick={() => setForm(p => ({ ...p, reportType: rt.id }))} className={`p-4 rounded-xl border text-left transition-all duration-300 ${sel ? 'bg-white/[0.05] border-white/[0.15]' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'}`}>
                                            <Icon className="w-5 h-5 mb-2" style={{ color: `${rt.color}0.8)`, filter: `drop-shadow(0 0 6px ${rt.color}0.5))` }} />
                                            <span className="text-xs font-medium text-gray-300">{rt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Severity */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-3">Severity Level *</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {severityLevels.map((sl) => {
                                    const sel = form.severity === sl.id;
                                    return (
                                        <button key={sl.id} type="button" onClick={() => setForm(p => ({ ...p, severity: sl.id }))} className={`p-3 rounded-xl border text-center transition-all duration-300 ${sel ? `${sl.bg} ${sl.border}` : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'}`}>
                                            <span className={`block text-sm font-bold ${sel ? `text-${sl.color}-400` : 'text-gray-300'}`}>{sl.label}</span>
                                            <span className="text-[11px] text-gray-600">{sl.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Text inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Your Name *</label>
                                <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/[0.15] transition-colors" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address *</label>
                                <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/[0.15] transition-colors" placeholder="john@example.com" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Agent Name <span className="text-gray-600 font-normal">(optional)</span></label>
                            <input type="text" value={form.agentName} onChange={e => setForm(p => ({ ...p, agentName: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/[0.15] transition-colors" placeholder="Name of the AI agent involved" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Detailed Description *</label>
                            <textarea required rows={5} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/[0.15] transition-colors resize-none" placeholder="Please describe the issue in detail..." />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Supporting Evidence <span className="text-gray-600 font-normal">(optional)</span></label>
                            <textarea rows={3} value={form.evidence} onChange={e => setForm(p => ({ ...p, evidence: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/[0.15] transition-colors resize-none" placeholder="Links, screenshots, conversation IDs, etc." />
                        </div>

                        {/* Agreement */}
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" required checked={form.agreeToTerms} onChange={e => setForm(p => ({ ...p, agreeToTerms: e.target.checked }))} className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 accent-red-500" />
                            <span className="text-gray-500 text-sm">I agree to the <Link href="/legal/terms-of-service" className="text-red-400 hover:text-red-300 underline underline-offset-2">Terms of Service</Link> and <Link href="/legal/privacy-policy" className="text-red-400 hover:text-red-300 underline underline-offset-2">Privacy Policy</Link>. I confirm this report is made in good faith.</span>
                        </label>

                        <button type="submit" disabled={isSubmitting || !form.reportType || !form.severity || !form.name || !form.email || !form.description || !form.agreeToTerms} className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600/30 to-amber-600/30 border border-red-500/25 text-red-300 font-bold text-sm hover:border-red-500/40 hover:from-red-600/40 hover:to-amber-600/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : 'Submit Report'}
                        </button>
                    </form>

                    <div className="disclaimer-block mt-12 p-5 rounded-2xl bg-white/[0.02] border border-amber-500/15 overflow-hidden">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border border-amber-400/30" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(245,158,11,0.1))' }}><AlertCircle className="w-5 h-5" style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.4))' }} /></div>
                            <div><h3 className="text-base font-bold text-gray-200 mb-1">Legal Disclaimer</h3><p className="text-gray-600 text-[13px] leading-relaxed">False or malicious reports may result in account suspension. All reports are logged and may be shared with law enforcement if they involve illegal activity. By submitting, you confirm your report is truthful and made in good faith.</p></div>
                        </div>
                    </div>
                </div></div>
            </section>

            <style jsx global>{`
                ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #030304; } ::-webkit-scrollbar-thumb { background: rgba(239,68,68,0.3); border-radius: 3px; } ::-webkit-scrollbar-thumb:hover { background: rgba(239,68,68,0.5); }
            `}</style>
        </div>
    );
}
