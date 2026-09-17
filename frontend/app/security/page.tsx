'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, Observer } from '@/lib/gsap';
import { Shield, Lock, Key, Server, FileCheck, Eye, AlertTriangle, CheckCircle, Globe, ChevronRight, Sparkles, Mail, ExternalLink, ArrowRight, Fingerprint, ScanEye, Database, Wifi } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, Observer);

/* ── Twinkling star ── */
interface TwinklingStar { x: number; y: number; size: number; opacity: number; speed: number; phase: number; color: string; }

const securityFeatures = [
    {
        title: 'Data Encryption',
        description: 'All data is encrypted in transit and at rest using industry-standard AES-256 encryption.',
        icon: Lock,
        glow: 'rgba(6,182,212,0.4)',
        details: ['End-to-end encryption', 'TLS 1.3 for data in transit', 'AES-256 for data at rest', 'Regular encryption audits'],
    },
    {
        title: 'Access Control',
        description: 'Advanced authentication and authorization mechanisms to protect your accounts.',
        icon: Key,
        glow: 'rgba(139,92,246,0.4)',
        details: ['Multi-factor authentication (MFA)', 'Role-based access control (RBAC)', 'Single Sign-On (SSO)', 'API key management'],
    },
    {
        title: 'Infrastructure Security',
        description: 'Enterprise-grade infrastructure with multiple layers of security protection.',
        icon: Server,
        glow: 'rgba(16,185,129,0.4)',
        details: ['Cloud-based redundancy', 'DDoS protection', 'Firewall protection', 'Intrusion detection systems'],
    },
    {
        title: 'Compliance & Certifications',
        description: 'We maintain the highest industry standards and certifications.',
        icon: FileCheck,
        glow: 'rgba(249,115,22,0.4)',
        details: ['SOC 2 Type II certified', 'GDPR compliant', 'ISO 27001 certified', 'HIPAA compliant'],
    },
    {
        title: 'Monitoring & Logging',
        description: 'Continuous monitoring and comprehensive logging of all system activities.',
        icon: Eye,
        glow: 'rgba(236,72,153,0.4)',
        details: ['24/7 system monitoring', 'Detailed audit logs', 'Real-time alerts', 'Security incident response'],
    },
    {
        title: 'Vulnerability Management',
        description: 'Proactive identification and remediation of security vulnerabilities.',
        icon: Shield,
        glow: 'rgba(99,102,241,0.4)',
        details: ['Regular penetration testing', 'Security code reviews', 'Bug bounty program', 'Vulnerability scanning'],
    },
];

const complianceStandards = [
    { name: 'GDPR', description: 'General Data Protection Regulation compliance for EU users.', icon: Globe, glow: 'rgba(59,130,246,0.4)' },
    { name: 'SOC 2 Type II', description: 'Independently audited security, availability, and confidentiality.', icon: FileCheck, glow: 'rgba(139,92,246,0.4)' },
    { name: 'ISO 27001', description: 'International standard for information security management.', icon: Shield, glow: 'rgba(16,185,129,0.4)' },
    { name: 'HIPAA', description: 'Health Insurance Portability and Accountability Act compliance.', icon: Lock, glow: 'rgba(236,72,153,0.4)' },
];

const bestPractices = [
    { title: 'Use Strong Passwords', description: 'Create passwords with at least 12 characters including uppercase, lowercase, numbers, and symbols.', icon: Key, glow: 'rgba(6,182,212,0.4)' },
    { title: 'Enable MFA', description: 'Always enable multi-factor authentication on your account for an extra layer of security.', icon: Fingerprint, glow: 'rgba(139,92,246,0.4)' },
    { title: 'Keep Software Updated', description: 'Regularly update your browser and operating system to receive the latest security patches.', icon: Server, glow: 'rgba(16,185,129,0.4)' },
    { title: 'Be Cautious with Links', description: "Don't click suspicious links or download files from untrusted sources.", icon: AlertTriangle, glow: 'rgba(249,115,22,0.4)' },
    { title: 'Review Access Logs', description: 'Regularly review your account access logs and remove any unauthorized sessions.', icon: ScanEye, glow: 'rgba(236,72,153,0.4)' },
    { title: 'Report Vulnerabilities', description: 'Report any security issues to our security team at security@maula.ai.', icon: Shield, glow: 'rgba(99,102,241,0.4)' },
];

const faqs = [
    { q: 'Where is my data stored?', a: 'Your data is stored in secure, redundant data centers across multiple geographic locations. All data is encrypted both in transit and at rest.', icon: Database },
    { q: 'How often do you perform security audits?', a: 'We perform comprehensive security audits quarterly and maintain continuous monitoring. We also engage third-party security firms for penetration testing twice yearly.', icon: ScanEye },
    { q: 'Can I export my data?', a: 'Yes, you can export your data at any time in standard formats. We support GDPR data portability requirements for all users.', icon: ExternalLink },
    { q: "What happens if there's a data breach?", a: 'In the unlikely event of a breach, we will notify affected users within 24 hours as required by law. We maintain comprehensive incident response procedures.', icon: AlertTriangle },
    { q: 'Is my data shared with third parties?', a: 'No, we do not sell or share your personal data with third parties. We only share data with service providers under strict data processing agreements.', icon: Wifi },
    { q: 'How do I enable two-factor authentication?', a: 'You can enable 2FA in your account settings. We support authenticator apps and SMS-based verification methods for maximum security.', icon: Fingerprint },
];

/* ── Floating badge icon data ── */
const floatingBadges = [
    { icon: Shield, x: '8%', y: '12%', size: 52, glow: 'rgba(6,182,212,0.35)', border: 'rgba(6,182,212,0.25)', color: '#67e8f9', delay: 0 },
    { icon: Lock, x: '88%', y: '8%', size: 44, glow: 'rgba(139,92,246,0.35)', border: 'rgba(139,92,246,0.25)', color: '#c4b5fd', delay: 0.15 },
    { icon: Key, x: '6%', y: '55%', size: 48, glow: 'rgba(16,185,129,0.35)', border: 'rgba(16,185,129,0.25)', color: '#6ee7b7', delay: 0.3 },
    { icon: Fingerprint, x: '92%', y: '45%', size: 40, glow: 'rgba(236,72,153,0.3)', border: 'rgba(236,72,153,0.2)', color: '#f9a8d4', delay: 0.45 },
    { icon: ScanEye, x: '14%', y: '82%', size: 38, glow: 'rgba(249,115,22,0.3)', border: 'rgba(249,115,22,0.2)', color: '#fdba74', delay: 0.6 },
    { icon: Database, x: '85%', y: '78%', size: 42, glow: 'rgba(99,102,241,0.3)', border: 'rgba(99,102,241,0.2)', color: '#a5b4fc', delay: 0.75 },
];

export default function SecurityPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<TwinklingStar[]>([]);
    const animFrameRef = useRef<number>(0);
    const typewriterRef = useRef<HTMLSpanElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    /* ── Mouse tracking ── */
    useEffect(() => {
        const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', h);
        return () => window.removeEventListener('mousemove', h);
    }, []);

    /* ── Twinkling stars ── */
    const initStars = useCallback(() => {
        const c = canvasRef.current; if (!c) return;
        c.width = window.innerWidth; c.height = document.documentElement.scrollHeight || window.innerHeight * 4;
        const colors = ['rgba(255,255,255,', 'rgba(6,182,212,', 'rgba(139,92,246,', 'rgba(167,139,250,', 'rgba(34,211,238,'];
        const stars: TwinklingStar[] = [];
        for (let i = 0; i < 180; i++) {
            stars.push({ x: Math.random() * c.width, y: Math.random() * c.height, size: Math.random() * 2.2 + 0.4, opacity: Math.random() * 0.7 + 0.2, speed: Math.random() * 0.02 + 0.004, phase: Math.random() * Math.PI * 2, color: colors[Math.floor(Math.random() * colors.length)] });
        }
        starsRef.current = stars;
    }, []);

    const animateStars = useCallback(() => {
        const c = canvasRef.current; if (!c) return;
        const ctx = c.getContext('2d'); if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        starsRef.current.forEach((s) => {
            s.phase += s.speed;
            const t = (Math.sin(s.phase) + 1) / 2;
            const a = s.opacity * (0.25 + t * 0.75);
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `${s.color}${a.toFixed(2)})`; ctx.fill();
            if (s.size > 1.4 && t > 0.65) {
                ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
                const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3);
                g.addColorStop(0, `${s.color}${(a * 0.25).toFixed(2)})`); g.addColorStop(1, `${s.color}0)`);
                ctx.fillStyle = g; ctx.fill();
            }
        });
        animFrameRef.current = requestAnimationFrame(animateStars);
    }, []);

    useEffect(() => {
        initStars(); animateStars();
        const h = () => { const c = canvasRef.current; if (c) { c.width = window.innerWidth; c.height = document.documentElement.scrollHeight || window.innerHeight * 4; initStars(); } };
        window.addEventListener('resize', h);
        return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener('resize', h); };
    }, [initStars, animateStars]);

    /* ── GSAP animations ── */
    useEffect(() => {
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            CustomWiggle.create('secWiggle', { wiggles: 5, type: 'uniform' });

            /* Background layers */
            gsap.to('.nebula-orb', { x: 'random(-100, 100)', y: 'random(-70, 70)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.07)', duration: 14, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
            gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
                gsap.to(p, { y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 5 + Math.random() * 5, repeat: -1, delay: i * 0.3, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
            });
            gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

            /* Floating badge icons entrance + drift */
            gsap.from('.floating-badge', { scale: 0, opacity: 0, duration: 0.6, stagger: 0.12, ease: 'back.out(2.5)', delay: 0.3 });
            document.querySelectorAll('.floating-badge').forEach((el, i) => {
                gsap.to(el, { y: 'random(-18, 18)', x: 'random(-12, 12)', rotation: 'random(-6, 6)', duration: 4 + i * 0.6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.25 });
            });

            /* Hero entrance */
            gsap.fromTo('.hero-title', { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
            gsap.fromTo('.hero-subtitle', { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });

            /* Hero shield pulse */
            gsap.to('.hero-icon-container', {
                boxShadow: '0 0 80px rgba(6,182,212,0.5), 0 0 160px rgba(6,182,212,0.2), inset 0 0 30px rgba(6,182,212,0.1)',
                scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
            });
            gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

            /* Typewriter */
            if (typewriterRef.current) {
                const phrases = ['AES-256 encryption', 'SOC 2 Type II certified', 'Zero-trust architecture', 'GDPR & HIPAA compliant', '24/7 threat monitoring'];
                const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
                phrases.forEach((p) => { tl.to(typewriterRef.current, { duration: 0.6, text: { value: p, delimiter: '' }, ease: 'none' }); tl.to({}, { duration: 2 }); tl.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' }); });
            }

            /* Section badges */
            gsap.from('.hero-badge', { scale: 0, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.8 });

            /* Security feature cards */
            gsap.utils.toArray<HTMLElement>('.security-card').forEach((card, i) => {
                gsap.from(card, { scrollTrigger: { trigger: card, start: 'top 90%' }, opacity: 0, y: 60, scale: 0.92, duration: 0.7, delay: (i % 3) * 0.12, ease: 'power3.out' });
            });

            /* Compliance cards */
            gsap.utils.toArray<HTMLElement>('.compliance-card').forEach((card, i) => {
                gsap.from(card, { scrollTrigger: { trigger: card, start: 'top 90%' }, opacity: 0, y: 50, scale: 0.9, duration: 0.6, delay: i * 0.08, ease: 'back.out(1.5)' });
            });

            /* Practice cards */
            gsap.utils.toArray<HTMLElement>('.practice-card').forEach((card, i) => {
                gsap.from(card, { scrollTrigger: { trigger: card, start: 'top 90%' }, opacity: 0, y: 50, scale: 0.9, duration: 0.6, delay: (i % 3) * 0.1, ease: 'power3.out' });
            });

            /* FAQ cards */
            gsap.utils.toArray<HTMLElement>('.faq-card').forEach((card, i) => {
                gsap.from(card, { scrollTrigger: { trigger: card, start: 'top 92%' }, opacity: 0, x: -30, duration: 0.5, delay: i * 0.06, ease: 'power3.out' });
            });

            /* Report + CTA sections */
            gsap.set('.report-section, .cta-section', { y: 50, opacity: 0 });
            ScrollTrigger.create({ trigger: '.report-section', start: 'top 85%', onEnter: () => gsap.to('.report-section', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }) });
            ScrollTrigger.create({ trigger: '.cta-section', start: 'top 90%', onEnter: () => gsap.to('.cta-section', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }) });

            /* Scroll velocity skew */
            Observer.create({
                target: containerRef.current, type: 'scroll',
                onChangeY: (self) => { const v = Math.min(Math.abs(self.velocityY) / 1000, 1); gsap.to('.security-card, .compliance-card, .practice-card', { skewY: self.velocityY > 0 ? v * 1.5 : -v * 1.5, duration: 0.3, ease: 'power2.out' }); },
                onStop: () => gsap.to('.security-card, .compliance-card, .practice-card', { skewY: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }),
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    /* ── Card hover (3D tilt + shine + glow) ── */
    const handleCardHover = (id: string, entering: boolean) => {
        const card = document.querySelector(`[data-card-id="${id}"]`);
        if (!card) return;
        if (entering) {
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

    const handleCardMove = (e: React.MouseEvent, id: string) => {
        const card = document.querySelector(`[data-card-id="${id}"]`) as HTMLElement;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, duration: 0.3, ease: 'power2.out' });
        const shine = card.querySelector('.card-shine') as HTMLElement;
        if (shine) shine.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`;
    };

    const handleCardLeave = (id: string) => {
        const card = document.querySelector(`[data-card-id="${id}"]`);
        if (card) gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

            {/* ═══ TWINKLING STARS ═══ */}
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.75 }} />

            {/* ═══ BACKGROUND LAYERS ═══ */}
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

            {/* ═══ FLOATING BADGE ICONS ═══ */}
            <div className="fixed inset-0 pointer-events-none z-[2] overflow-hidden">
                {floatingBadges.map((b, i) => {
                    const Icon = b.icon;
                    return (
                        <div key={i} className="floating-badge absolute" style={{ left: b.x, top: b.y }}>
                            <div className="relative flex items-center justify-center rounded-2xl backdrop-blur-md transition-all duration-500"
                                style={{
                                    width: b.size, height: b.size,
                                    background: `linear-gradient(135deg, ${b.glow.replace('0.35', '0.08')}, ${b.glow.replace('0.35', '0.02')})`,
                                    border: `1px solid ${b.border}`,
                                    boxShadow: `0 0 30px ${b.glow.replace('0.35', '0.1')}, inset 0 0 15px ${b.glow.replace('0.35', '0.04')}`,
                                }}>
                                <Icon style={{ width: b.size * 0.45, height: b.size * 0.45, color: b.color, filter: `drop-shadow(0 0 6px ${b.glow})`, opacity: 0.8 }} />
                                {/* Subtle corner dot */}
                                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: b.color, opacity: 0.5 }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ HERO SECTION ═══ */}
            <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden z-10">
                <div className="container mx-auto px-4 text-center relative z-10">

                    {/* Hero icon with rotating ring */}
                    <div className="relative inline-block mb-10">
                        <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-cyan-500/30" />
                        <div className="hero-ring absolute -inset-12 rounded-full border border-cyan-400/15" style={{ animationDirection: 'reverse' }} />
                        <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-cyan-400/40 shadow-2xl shadow-cyan-600/30"
                            style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.35) 0%, rgba(139,92,246,0.25) 50%, rgba(6,182,212,0.3) 100%)' }}>
                            <Shield className="w-14 h-14 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 18px rgba(6,182,212,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.5))' }} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
                        </div>
                    </div>

                    {/* Typewriter badge */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600/15 via-violet-600/10 to-cyan-600/15 border border-cyan-500/25 backdrop-blur-sm shadow-lg shadow-cyan-900/20">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30">
                                <Shield className="w-3.5 h-3.5 text-cyan-300" />
                            </div>
                            <span className="text-sm text-gray-300 font-mono">
                                <span ref={typewriterRef} className="text-gray-200"></span>
                                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-cyan-400 ml-0.5 align-middle" />
                            </span>
                        </div>
                    </div>

                    <h1 className="hero-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Security</span>
                        <br />
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>First</span>
                    </h1>

                    <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed font-light" style={{ opacity: 0 }}>
                        Your data security and privacy are our <span className="text-cyan-400">top priorities.</span>
                    </p>

                    {/* Hero badges */}
                    <div className="flex flex-wrap justify-center gap-3">
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 backdrop-blur-sm flex items-center gap-2">
                            <Lock className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm text-gray-400 font-medium">AES-256 Encryption</span>
                        </div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-violet-500/20 backdrop-blur-sm flex items-center gap-2">
                            <Shield className="w-4 h-4 text-violet-400" />
                            <span className="text-sm text-gray-400 font-medium">SOC 2 Certified</span>
                        </div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-emerald-500/20 backdrop-blur-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm text-gray-400 font-medium">Zero-Trust Architecture</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ SECURITY FEATURES ═══ */}
            <section className="relative py-16 z-10">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-cyan-400/30" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.15))' }}>
                                <Lock className="w-5 h-5" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.4))' }} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Security Features</h2>
                                <p className="text-sm text-gray-600">Comprehensive measures protecting your data</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {securityFeatures.map((f, i) => {
                                const Icon = f.icon;
                                const id = `sec-${i}`;
                                return (
                                    <div key={i} data-card-id={id} className="security-card group relative" style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                                        onMouseEnter={() => handleCardHover(id, true)} onMouseLeave={() => { handleCardHover(id, false); handleCardLeave(id); }} onMouseMove={(e) => handleCardMove(e, id)}>
                                        <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${f.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                                        <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
                                            <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
                                            <div className="relative z-10">
                                                <div className="card-icon-wrap mb-4">
                                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-white/[0.08]"
                                                        style={{ background: `linear-gradient(135deg, ${f.glow.replace('0.4', '0.2')}, rgba(6,182,212,0.1))`, boxShadow: `0 0 20px ${f.glow.replace('0.4', '0.1')}, 0 0 40px ${f.glow.replace('0.4', '0.05')}` }}>
                                                        <Icon className="w-7 h-7" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 8px ${f.glow})` }} />
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300">{f.title}</h3>
                                                <p className="text-gray-600 text-[13px] leading-relaxed mb-4 group-hover:text-gray-500 transition-colors duration-300">{f.description}</p>
                                                <div className="pt-3 border-t border-white/[0.04] space-y-2">
                                                    {f.details.map((d, j) => (
                                                        <div key={j} className="flex items-center gap-2 text-[12px] text-gray-600 group-hover:text-gray-500 transition-colors">
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500/60 flex-shrink-0" />
                                                            {d}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ COMPLIANCE STANDARDS ═══ */}
            <section className="relative py-16 z-10">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.15))' }}>
                                <FileCheck className="w-5 h-5" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Compliance Standards</h2>
                                <p className="text-sm text-gray-600">We maintain the highest industry certifications</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                            {complianceStandards.map((s, i) => {
                                const Icon = s.icon;
                                const id = `comp-${i}`;
                                return (
                                    <div key={i} data-card-id={id} className="compliance-card group relative" style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                                        onMouseEnter={() => handleCardHover(id, true)} onMouseLeave={() => { handleCardHover(id, false); handleCardLeave(id); }} onMouseMove={(e) => handleCardMove(e, id)}>
                                        <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${s.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                                        <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full text-center transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
                                            <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
                                            <div className="relative z-10">
                                                <div className="card-icon-wrap inline-block mb-4">
                                                    <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto border border-white/[0.08]"
                                                        style={{ background: `linear-gradient(135deg, ${s.glow.replace('0.4', '0.2')}, rgba(139,92,246,0.1))`, boxShadow: `0 0 20px ${s.glow.replace('0.4', '0.1')}` }}>
                                                        <Icon className="w-8 h-8" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 8px ${s.glow})` }} />
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300">{s.name}</h3>
                                                <p className="text-gray-600 text-[13px] leading-relaxed group-hover:text-gray-500 transition-colors duration-300">{s.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ BEST PRACTICES ═══ */}
            <section className="relative py-16 z-10">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-emerald-400/30" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.15))' }}>
                                <CheckCircle className="w-5 h-5" style={{ color: '#6ee7b7', filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.4))' }} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Security Best Practices</h2>
                                <p className="text-sm text-gray-600">Tips to keep your account and data secure</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {bestPractices.map((p, i) => {
                                const Icon = p.icon;
                                const id = `prac-${i}`;
                                return (
                                    <div key={i} data-card-id={id} className="practice-card group relative" style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                                        onMouseEnter={() => handleCardHover(id, true)} onMouseLeave={() => { handleCardHover(id, false); handleCardLeave(id); }} onMouseMove={(e) => handleCardMove(e, id)}>
                                        <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${p.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                                        <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
                                            <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
                                            <div className="relative z-10">
                                                <div className="card-icon-wrap mb-4">
                                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.08]"
                                                        style={{ background: `linear-gradient(135deg, ${p.glow.replace('0.4', '0.2')}, rgba(6,182,212,0.1))`, boxShadow: `0 0 16px ${p.glow.replace('0.4', '0.08')}` }}>
                                                        <Icon className="w-6 h-6" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 6px ${p.glow})` }} />
                                                    </div>
                                                </div>
                                                <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300">{p.title}</h3>
                                                <p className="text-gray-600 text-[13px] leading-relaxed group-hover:text-gray-500 transition-colors duration-300">{p.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ REPORT A SECURITY ISSUE ═══ */}
            <section className="report-section relative py-16 z-10">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative p-8 md:p-12 rounded-2xl border border-white/[0.06] overflow-hidden text-center" style={{ background: 'rgba(3,3,4,0.85)', backdropFilter: 'blur(12px)' }}>
                            <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                            <div className="relative z-10">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-400/20"
                                    style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(245,158,11,0.06))', boxShadow: '0 0 40px rgba(249,115,22,0.08), inset 0 0 20px rgba(249,115,22,0.03)' }}>
                                    <AlertTriangle className="w-8 h-8" style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.6))' }} />
                                </div>
                                <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">Report a Security Issue</h2>
                                <p className="text-gray-500 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
                                    If you discover a security vulnerability, please report it responsibly to our security team.
                                </p>
                                <div className="inline-block p-5 rounded-xl border border-amber-500/10 mb-6" style={{ background: 'rgba(249,115,22,0.03)' }}>
                                    <p className="text-gray-600 text-xs mb-2 uppercase tracking-wider font-medium">Security Email</p>
                                    <a href="mailto:security@maula.ai" className="text-lg font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center justify-center gap-2" style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.3))' }}>
                                        <Mail className="w-5 h-5" />
                                        security@maula.ai
                                    </a>
                                </div>
                                <p className="text-xs text-gray-600">Please provide detailed information and allow 48 hours for our team to respond.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ SECURITY FAQ ═══ */}
            <section className="relative py-16 z-10">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-pink-400/30" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(139,92,246,0.15))' }}>
                                <Sparkles className="w-5 h-5" style={{ color: '#f9a8d4', filter: 'drop-shadow(0 0 6px rgba(236,72,153,0.4))' }} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Security FAQ</h2>
                                <p className="text-sm text-gray-600">Common questions about our security practices</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {faqs.map((faq, i) => {
                                const Icon = faq.icon;
                                return (
                                    <div key={i} className="faq-card group relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/20 transition-all duration-300 overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] to-violet-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <div className="relative flex gap-4">
                                            <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border border-white/[0.06]"
                                                style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.1))' }}>
                                                <Icon className="w-5 h-5" style={{ color: '#67e8f9', filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.3))' }} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-base font-bold text-gray-200 mb-1.5 group-hover:text-white transition-colors">{faq.q}</h3>
                                                <p className="text-gray-600 text-[13px] leading-relaxed group-hover:text-gray-500 transition-colors">{faq.a}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section className="cta-section relative py-20 mt-8 z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="container mx-auto px-4 text-center">
                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Ready to Get Started?</h3>
                    <p className="text-gray-600 mb-10 max-w-xl mx-auto text-sm">
                        Your security is guaranteed. Start using our AI platform with confidence.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <Link href="/auth/signup" className="px-7 py-3.5 bg-gradient-to-r from-cyan-600/90 to-violet-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-cyan-600/15 hover:shadow-cyan-600/30 transition-all duration-400 flex items-center justify-center gap-2">
                            Create Account
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link href="/legal" className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
                            <ExternalLink className="w-4 h-4" /> Legal Documents
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══ GLOBAL STYLES ═══ */}
            <style jsx global>{`
                html { scroll-behavior: smooth; }
                .security-card::before, .compliance-card::before, .practice-card::before, .faq-card::before {
                    content: ''; position: absolute; inset: 0; border-radius: 1rem; opacity: 0.015;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
                    pointer-events: none; z-index: 1;
                }
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
