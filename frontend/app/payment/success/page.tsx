'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { gsap, ScrollTrigger, CustomWiggle, CustomEase, Observer } from '@/lib/gsap';
import { CheckCircle, Sparkles, ArrowRight, Zap, MessageSquare, Clock, Download, Crown, ChevronRight, Shield, CreditCard, Calendar, Star, Gift, Settings } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, CustomWiggle, CustomEase, Observer);

/* ═══════════════════════════════════════════════════
   FIREWORK PARTICLE SYSTEM
   ═══════════════════════════════════════════════════ */
interface Particle {
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number;
    color: string; alpha: number; decay: number;
    trail: { x: number; y: number; alpha: number }[];
}

interface Firework {
    x: number; y: number; targetY: number; vy: number;
    color: string; exploded: boolean; particles: Particle[];
    sparkTrail: { x: number; y: number; alpha: number }[];
}

const FIREWORK_COLORS = [
    '#8b5cf6', '#a78bfa', '#c4b5fd', // violet
    '#06b6d4', '#22d3ee', '#a5f3fc', // cyan
    '#f59e0b', '#fbbf24', '#fde68a', // amber
    '#10b981', '#34d399', '#6ee7b7', // emerald
    '#ec4899', '#f472b6', '#fbcfe8', // pink
    '#f97316', '#fb923c', '#fed7aa', // orange
];

function createFirework(canvasW: number, canvasH: number): Firework {
    return {
        x: canvasW * 0.15 + Math.random() * canvasW * 0.7,
        y: canvasH,
        targetY: canvasH * 0.15 + Math.random() * canvasH * 0.35,
        vy: -(6 + Math.random() * 4),
        color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
        exploded: false,
        particles: [],
        sparkTrail: [],
    };
}

function explodeFirework(fw: Firework) {
    const count = 60 + Math.floor(Math.random() * 40);
    const baseColor = fw.color;
    const colorIdx = FIREWORK_COLORS.indexOf(baseColor);
    const colorGroup = Math.floor(colorIdx / 3) * 3;

    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 1.5 + Math.random() * 4;
        const pColor = FIREWORK_COLORS[colorGroup + Math.floor(Math.random() * 3)] || baseColor;
        fw.particles.push({
            x: fw.x, y: fw.y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 1, maxLife: 1, size: 1.5 + Math.random() * 2,
            color: pColor, alpha: 1, decay: 0.008 + Math.random() * 0.012,
            trail: [],
        });
    }
    // Inner burst — smaller, brighter
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2;
        fw.particles.push({
            x: fw.x, y: fw.y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 1, maxLife: 1, size: 1 + Math.random(),
            color: '#ffffff', alpha: 1, decay: 0.02 + Math.random() * 0.02,
            trail: [],
        });
    }
    fw.exploded = true;
}

/* ═══════════════════════════════════════════════════
   TWINKLING STAR SYSTEM (brand background)
   ═══════════════════════════════════════════════════ */
interface TwinklingStar { x: number; y: number; size: number; opacity: number; speed: number; phase: number; color: string; }

/* ═══════════════════════════════════════════════════
   SUCCESS CONTENT COMPONENT
   ═══════════════════════════════════════════════════ */
function SuccessContent() {
    const searchParams = useSearchParams();
    const containerRef = useRef<HTMLDivElement>(null);
    const fireworkCanvasRef = useRef<HTMLCanvasElement>(null);
    const starCanvasRef = useRef<HTMLCanvasElement>(null);
    const fireworksRef = useRef<Firework[]>([]);
    const starsRef = useRef<TwinklingStar[]>([]);
    const animFrameRef = useRef<number>(0);
    const starFrameRef = useRef<number>(0);
    const fireworkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const sessionId = searchParams.get('session_id');
    const agentName = searchParams.get('agent') || 'AI Agent';
    const agentSlug = searchParams.get('slug') || agentName.toLowerCase().replace(/\s+/g, '-');
    const appTypeFromUrl = searchParams.get('app'); // 'canvas-studio' | 'gencraft-pro' | 'maula-editor' | null

    // App may come from the URL or be discovered by the payment verification service.
    const [resolvedApp, setResolvedApp] = useState<string | null>(appTypeFromUrl);
    const appType = resolvedApp;
    const isCanvasStudio = appType === 'canvas-studio' || appType === 'gencraft-pro';
    const isGencraft = appType === 'gencraft-pro';
    const isStudio = appType === 'canvas-studio';
    const isEditor = appType === 'maula-editor';
    // Derived URLs for buttons
    const openAppUrl = isStudio
        ? 'https://studio.sanbayfusion.com'
        : isGencraft
            ? 'https://canvas.sanbayfusion.com'
            : isEditor
                ? 'https://editor.sanbayfusion.com'
                : `https://${agentSlug}-chat.sanbayfusion.com/`;
    const openAppLabel = isStudio
        ? 'Open Canvas Studio'
        : isGencraft
            ? 'Open GenCraft Pro'
            : isEditor
                ? 'Open Maula Editor'
                : 'Start Chatting';
    const dashboardUrl = isStudio
        ? 'https://sanbayfusion.com/dashboard/canvas-studio'
        : isGencraft
            ? 'https://sanbayfusion.com/dashboard/billing'
            : isEditor
                ? 'https://sanbayfusion.com/dashboard/billing'
                : '/dashboard';

    // Subscription data from API
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [subData, setSubData] = useState<{ plan?: string; price?: number; daysRemaining?: number; status?: string; expiryDate?: string; agentId?: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [introComplete, setIntroComplete] = useState(false);

    // Checkout provider removed — always show static success state.
    useEffect(() => {
        setStatus('success');
    }, [sessionId, isCanvasStudio, isEditor]);

    // Twinkling stars (brand background)
    const initStars = useCallback(() => {
        const c = starCanvasRef.current; if (!c) return;
        const stars: TwinklingStar[] = [];
        for (let i = 0; i < 120; i++) stars.push({ x: Math.random() * c.width, y: Math.random() * c.height, size: 0.3 + Math.random() * 1.5, opacity: Math.random(), speed: 0.3 + Math.random() * 0.7, phase: Math.random() * Math.PI * 2, color: ['#ffffff', '#a5f3fc', '#c4b5fd', '#fde68a'][Math.floor(Math.random() * 4)] });
        starsRef.current = stars;
    }, []);

    const animateStars = useCallback(() => {
        const c = starCanvasRef.current; const ctx = c?.getContext('2d'); if (!c || !ctx) return;
        const draw = () => {
            ctx.clearRect(0, 0, c.width, c.height);
            starsRef.current.forEach(s => { s.phase += s.speed * 0.015; s.opacity = 0.2 + Math.abs(Math.sin(s.phase)) * 0.8; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fillStyle = s.color; ctx.globalAlpha = s.opacity * 0.6; ctx.fill(); ctx.globalAlpha = 1; });
            starFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
    }, []);

    useEffect(() => {
        const c = starCanvasRef.current; if (!c) return;
        c.width = window.innerWidth; c.height = Math.max(document.documentElement.scrollHeight, window.innerHeight * 2);
        initStars(); animateStars();
        const h = () => { if (c) { c.width = window.innerWidth; c.height = Math.max(document.documentElement.scrollHeight, window.innerHeight * 2); initStars(); } };
        window.addEventListener('resize', h);
        return () => { cancelAnimationFrame(starFrameRef.current); window.removeEventListener('resize', h); };
    }, [initStars, animateStars]);

    // Fireworks canvas animation
    const startFireworks = useCallback(() => {
        const c = fireworkCanvasRef.current; const ctx = c?.getContext('2d'); if (!c || !ctx) return;
        c.width = window.innerWidth; c.height = window.innerHeight;

        // Launch initial burst \u2014 5 at once
        for (let i = 0; i < 5; i++) {
            setTimeout(() => fireworksRef.current.push(createFirework(c.width, c.height)), i * 200);
        }

        // Then continuous at intervals
        fireworkIntervalRef.current = setInterval(() => {
            if (fireworksRef.current.length < 15) {
                fireworksRef.current.push(createFirework(c.width, c.height));
                if (Math.random() > 0.5) setTimeout(() => fireworksRef.current.push(createFirework(c.width, c.height)), 100 + Math.random() * 300);
            }
        }, 600);

        // Stop spawning after 6 seconds, let existing fade
        setTimeout(() => { if (fireworkIntervalRef.current) clearInterval(fireworkIntervalRef.current); }, 6000);

        const render = () => {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.globalCompositeOperation = 'lighter';

            fireworksRef.current.forEach((fw) => {
                if (!fw.exploded) {
                    // Rising trail
                    fw.sparkTrail.push({ x: fw.x + (Math.random() - 0.5) * 2, y: fw.y, alpha: 0.8 });
                    fw.sparkTrail = fw.sparkTrail.filter(t => { t.alpha -= 0.03; return t.alpha > 0; });
                    fw.sparkTrail.forEach(t => {
                        ctx.beginPath(); ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
                        ctx.fillStyle = fw.color; ctx.globalAlpha = t.alpha * 0.5; ctx.fill();
                    });

                    // Rising dot
                    ctx.beginPath(); ctx.arc(fw.x, fw.y, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9; ctx.fill();
                    ctx.beginPath(); ctx.arc(fw.x, fw.y, 4, 0, Math.PI * 2);
                    ctx.fillStyle = fw.color; ctx.globalAlpha = 0.4; ctx.fill();

                    fw.y += fw.vy; fw.vy += 0.04; // gravity on rise
                    if (fw.y <= fw.targetY) explodeFirework(fw);
                } else {
                    fw.particles.forEach(p => {
                        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha * 0.5 });
                        if (p.trail.length > 6) p.trail.shift();

                        // Draw trail
                        p.trail.forEach(t => {
                            ctx.beginPath(); ctx.arc(t.x, t.y, p.size * 0.4, 0, Math.PI * 2);
                            ctx.fillStyle = p.color; ctx.globalAlpha = t.alpha * 0.3; ctx.fill();
                        });

                        // Draw particle
                        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill();

                        // Glow
                        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha * 0.15; ctx.fill();

                        p.x += p.vx; p.y += p.vy;
                        p.vy += 0.025; // gravity
                        p.vx *= 0.99; // friction
                        p.alpha -= p.decay;
                        p.life -= p.decay;
                    });
                    fw.particles = fw.particles.filter(p => p.alpha > 0.01);
                }
            });
            ctx.globalAlpha = 1;
            fireworksRef.current = fireworksRef.current.filter(fw => !fw.exploded || fw.particles.length > 0);
            animFrameRef.current = requestAnimationFrame(render);
        };
        render();
    }, []);

    // MAIN GSAP TIMELINE: 2s dark -> fireworks -> reveal
    useEffect(() => {
        if (status === 'loading') return;
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            CustomWiggle.create('successW', { wiggles: 5, type: 'uniform' });

            // Initially everything hidden behind dark overlay
            gsap.set('.dark-overlay', { opacity: 1 });
            gsap.set('.page-content', { opacity: 0 });
            gsap.set('.success-icon-wrap', { scale: 0, rotation: -180, opacity: 0 });
            gsap.set('.success-ring', { scale: 0, opacity: 0 });
            gsap.set('.success-title', { y: 60, opacity: 0, filter: 'blur(20px)' });
            gsap.set('.success-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });
            gsap.set('.badge-item', { scale: 0, opacity: 0 });
            gsap.set('.detail-card', { y: 50, opacity: 0, scale: 0.9 });
            gsap.set('.detail-row', { x: -30, opacity: 0 });
            gsap.set('.action-btn', { y: 30, opacity: 0 });
            gsap.set('.next-block', { y: 40, opacity: 0 });
            gsap.set('.next-item', { x: -20, opacity: 0 });

            const tl = gsap.timeline();

            // Phase 1: 2 seconds of pure dark
            tl.to('.dark-overlay', { duration: 2, opacity: 1 });

            // Phase 2: Start fireworks + fade overlay
            tl.call(() => {
                startFireworks();
                setIntroComplete(true);
            });
            tl.to('.dark-overlay', { opacity: 0, duration: 1.5, ease: 'power2.inOut' }, '+=0.3');
            tl.to('.page-content', { opacity: 1, duration: 0.5 }, '<');

            // Phase 3: Reveal icon
            tl.to('.success-ring', { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.5)' }, '-=0.8');
            tl.to('.success-icon-wrap', { scale: 1, rotation: 0, opacity: 1, duration: 1.2, ease: 'elastic.out(1, 0.5)' }, '-=0.6');

            // Phase 4: Title + subtitle
            tl.to('.success-title', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power4.out' }, '-=0.5');
            tl.to('.success-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }, '-=0.4');

            // Phase 5: Badges fly in
            tl.to('.badge-item', { scale: 1, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(2)' }, '-=0.3');

            // Phase 6: Subscription card
            tl.to('.detail-card', { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.5)' }, '-=0.2');
            tl.to('.detail-row', { x: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power3.out' }, '-=0.3');

            // Phase 7: Action buttons
            tl.to('.action-btn', { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'power3.out' }, '-=0.2');

            // Phase 8: What's next
            tl.to('.next-block', { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, '-=0.1');
            tl.to('.next-item', { x: 0, opacity: 1, duration: 0.35, stagger: 0.06, ease: 'power3.out' }, '-=0.3');

            // Looping ambient animations
            gsap.to('.success-icon-wrap', { scale: 1.06, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 5 });
            gsap.to('.success-ring-dashed', { rotation: 360, duration: 25, repeat: -1, ease: 'none' });

            // Nebula drift
            gsap.to('.nebula-orb', { x: 'random(-80,80)', y: 'random(-60,60)', scale: 'random(0.7,1.3)', opacity: 'random(0.02,0.06)', duration: 14, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });

            // Stardust
            gsap.utils.toArray<HTMLElement>('.stardust-p').forEach((p, i) => {
                gsap.to(p, { y: '-=200', x: 'random(-50,50)', opacity: 0, duration: 5 + Math.random() * 5, repeat: -1, delay: i * 0.4, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
            });

            // Scan line
            gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

        }, containerRef);

        return () => {
            ctx.revert();
            cancelAnimationFrame(animFrameRef.current);
            if (fireworkIntervalRef.current) clearInterval(fireworkIntervalRef.current);
        };
    }, [status, startFireworks]);

    // Mouse-following light
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const el = document.querySelector('.ambient-cursor') as HTMLElement;
        if (el) { el.style.left = `${e.clientX - 200}px`; el.style.top = `${e.clientY - 200}px`; }
    }, []);

    const planLabel = subData?.plan ? subData.plan.charAt(0).toUpperCase() + subData.plan.slice(1) : 'Monthly';
    const priceLabel = subData?.price != null ? `$${subData.price}` : '$19';
    const daysLabel = subData?.daysRemaining != null ? `${subData.daysRemaining} days` : '28 days';
    const statusLabel = subData?.status || 'active';

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#030304] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                    <p className="text-gray-600 text-sm">Verifying your payment...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-[#030304] flex items-center justify-center px-6">
                <div className="max-w-md text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <span className="text-3xl">{'\u26a0\ufe0f'}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Verification Issue</h1>
                    <p className="text-gray-500 text-sm mb-8">{errorMsg}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href={`${dashboardUrl}${dashboardUrl.includes('?') ? '&' : '?'}justPurchased=true`} className="px-6 py-3 rounded-xl bg-violet-600/90 text-white font-medium text-sm">Go to Dashboard</Link>
                        <Link href="/contact" className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 text-sm">Contact Support</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-hidden relative" onMouseMove={handleMouseMove}>

            {/* DARK OVERLAY \u2014 2 second blackout */}
            <div className="dark-overlay fixed inset-0 bg-[#030304] z-[100] pointer-events-none" />

            {/* FIREWORK CANVAS \u2014 on top of everything */}
            <canvas ref={fireworkCanvasRef} className="fixed inset-0 z-[90] pointer-events-none" style={{ opacity: introComplete ? 1 : 0 }} />

            {/* STAR CANVAS \u2014 ambient background */}
            <canvas ref={starCanvasRef} className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.7 }} />

            {/* BACKGROUND LAYER */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[2]">
                <div className="nebula-orb absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
                <div className="nebula-orb absolute top-[55%] right-[15%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }} />
                <div className="nebula-orb absolute bottom-[15%] left-[40%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)' }} />

                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" style={{ top: '-2px' }} />

                {[...Array(15)].map((_, i) => <div key={i} className="stardust-p absolute rounded-full" style={{ left: `${5 + i * 6.2}%`, top: `${60 + (i % 4) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 2 === 0 ? 'rgba(139,92,246,0.6)' : 'rgba(6,182,212,0.5)', opacity: 0.6 }} />)}
                <div className="ambient-cursor fixed w-[400px] h-[400px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
            </div>

            {/* PAGE CONTENT */}
            <div className="page-content relative z-10 min-h-screen flex items-center justify-center py-20 px-4">
                <div className="max-w-2xl w-full mx-auto text-center">

                    {/* Success Icon */}
                    <div className="relative mb-10 inline-block">
                        <div className="success-ring absolute -inset-6 w-40 h-40 rounded-full opacity-[0.2]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.7) 0%, transparent 70%)' }} />
                        <div className="success-ring-dashed absolute -inset-4 rounded-full border-2 border-dashed border-emerald-500/25" />
                        <div className="success-icon-wrap relative w-24 h-24 rounded-3xl flex items-center justify-center border border-emerald-400/30" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.2))', boxShadow: '0 0 40px rgba(16,185,129,0.2), 0 0 80px rgba(16,185,129,0.08), inset 0 1px 1px rgba(255,255,255,0.05)' }}>
                            <CheckCircle className="w-12 h-12" style={{ color: '#6ee7b7', filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.5))' }} />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="success-title text-5xl md:text-7xl font-bold mb-4 leading-tight tracking-tight">
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Thank You!</span>
                    </h1>

                    <p className="success-subtitle text-lg text-gray-400 mb-8 font-light max-w-lg mx-auto">
                        You now have full access to <span className="text-emerald-400 font-semibold">{agentName}</span>.
                    </p>

                    {/* Status Badges */}
                    <div className="flex flex-wrap justify-center gap-3 mb-10">
                        <div className="badge-item px-5 py-2 rounded-xl bg-white/[0.03] border border-emerald-500/20 backdrop-blur-sm">
                            <span className="text-sm font-semibold text-emerald-400 tracking-wide">SUCCESS</span>
                        </div>
                        <div className="badge-item px-5 py-2 rounded-xl bg-white/[0.03] border border-violet-500/20 backdrop-blur-sm">
                            <span className="text-sm font-semibold text-violet-400 tracking-wide">SUBSCRIBED</span>
                        </div>
                        <div className="badge-item px-5 py-2 rounded-xl bg-white/[0.03] border border-cyan-500/20 backdrop-blur-sm">
                            <span className="text-sm font-semibold text-cyan-400 tracking-wide">ACTIVE</span>
                        </div>
                    </div>

                    {/* SUBSCRIPTION DETAILS CARD */}
                    <div className="detail-card relative p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm mb-10 overflow-hidden">
                        {/* Corner accents */}
                        <div className="absolute top-0 left-0 w-12 h-12 border-t border-l border-emerald-500/20 rounded-tl-2xl" />
                        <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-violet-500/20 rounded-tr-2xl" />
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b border-l border-cyan-500/20 rounded-bl-2xl" />
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-emerald-500/20 rounded-br-2xl" />

                        {/* Glow dots */}
                        <div className="absolute top-3 right-4 w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
                        <div className="absolute bottom-3 left-4 w-1.5 h-1.5 rounded-full bg-violet-400/50" />

                        <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Subscription Details</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="detail-row p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Plan</span>
                                    <span className="text-sm font-bold text-white">{planLabel}</span>
                                </div>
                            </div>
                            <div className="detail-row p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Status</span>
                                    <span className="text-sm font-bold text-emerald-400">{statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}</span>
                                </div>
                            </div>
                            <div className="detail-row p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Price</span>
                                    <span className="text-sm font-bold text-white">{priceLabel}</span>
                                </div>
                            </div>
                            <div className="detail-row p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Access Period</span>
                                    <span className="text-sm font-bold text-emerald-400">{daysLabel}</span>
                                </div>
                            </div>
                        </div>

                        {sessionId && (
                            <div className="detail-row mt-4 flex justify-between items-center py-3 px-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <span className="text-xs text-gray-600 uppercase tracking-widest">Transaction</span>
                                <span className="text-gray-500 font-mono text-xs">{sessionId.substring(0, 20)}...</span>
                            </div>
                        )}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
                        <Link href={openAppUrl} className="action-btn inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-300 gap-2 hover:scale-[1.02]">
                            <MessageSquare className="w-4 h-4" />{openAppLabel}
                        </Link>
                        <Link href={`${dashboardUrl}${dashboardUrl.includes('?') ? '&' : '?'}justPurchased=true`} className="action-btn inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-300 gap-2 hover:scale-[1.02]">
                            Go to Dashboard<ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* WHAT'S NEXT */}
                    <div className="next-block p-7 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm text-left">
                        <h3 className="text-base font-bold text-white mb-5 flex items-center gap-3 tracking-tight">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-violet-400/20" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.1))' }}>
                                <Sparkles className="w-4 h-4 text-violet-300" />
                            </div>
                            What&apos;s Next?
                        </h3>
                        <ul className="space-y-3">
                            <li className="next-item flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15 flex-shrink-0"><MessageSquare className="w-3.5 h-3.5 text-emerald-400" /></div>
                                <span className="text-gray-400 text-sm">Enjoy unlimited conversations with your subscribed agent.</span>
                            </li>
                            <li className="next-item flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/15 flex-shrink-0"><Zap className="w-3.5 h-3.5 text-cyan-400" /></div>
                                <span className="text-gray-400 text-sm">Your access is now active and ready to use immediately.</span>
                            </li>
                            <li className="next-item flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10 border border-violet-500/15 flex-shrink-0"><Settings className="w-3.5 h-3.5 text-violet-400" /></div>
                                <span className="text-gray-400 text-sm">Manage billing or cancel anytime from your dashboard.</span>
                            </li>
                            <li className="next-item flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/15 flex-shrink-0"><Gift className="w-3.5 h-3.5 text-amber-400" /></div>
                                <span className="text-gray-400 text-sm">A confirmation email has been sent to your inbox.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* GLOBAL STYLES */}
            <style jsx global>{`
                .detail-card::before { content: ''; position: absolute; inset: 0; border-radius: 1rem; opacity: 0.015; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"); pointer-events: none; z-index: 1; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #030304; }
                ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
            `}</style>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#030304] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}
