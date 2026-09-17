'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { gsap, SplitText } from '@/lib/gsap';
import TurnstileWidget from '@/components/TurnstileWidget';

function ConfirmResetForm() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    useEffect(() => {
        if (!token) { setError('Invalid reset link. Please request a new password reset.'); }
    }, [token]);

    // ─── Ice particles canvas ───
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let raf: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        const particles = Array.from({ length: 35 }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            r: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.4 - 0.1,
            opacity: Math.random() * 0.4 + 0.1, phase: Math.random() * Math.PI * 2,
        }));
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const t = Date.now() * 0.001;
            particles.forEach(p => {
                p.x += p.vx + Math.sin(t + p.phase) * 0.15; p.y += p.vy;
                if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
                if (p.x < -5) p.x = canvas.width + 5; if (p.x > canvas.width + 5) p.x = -5;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180, 220, 255, ${Math.max(0, p.opacity + Math.sin(t * 2 + p.phase) * 0.1)})`;
                ctx.fill();
            });
            raf = requestAnimationFrame(draw);
        };
        draw();
        window.addEventListener('resize', resize);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);

    // ─── GSAP Animations ───
    useEffect(() => {
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            const title = new SplitText('.confirm-title', { type: 'chars' });
            gsap.set(title.chars, { y: 50, opacity: 0, rotateX: -90 });
            gsap.set('.confirm-subtitle', { y: 20, opacity: 0 });
            gsap.set('.confirm-icon', { scale: 0, rotation: -180 });
            gsap.set('.confirm-form', { y: 40, opacity: 0 });
            gsap.set('.confirm-footer', { y: 20, opacity: 0 });

            const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
            tl
                .to('.confirm-icon', { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.7)' })
                .to(title.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.6, stagger: 0.03 }, '-=0.4')
                .to('.confirm-subtitle', { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')
                .to('.confirm-form', { y: 0, opacity: 1, duration: 0.6 }, '-=0.2')
                .to('.confirm-footer', { y: 0, opacity: 1, duration: 0.4 }, '-=0.2');

            gsap.to('.fog-layer-1', { x: 40, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.fog-layer-2', { x: -30, duration: 15, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.frost-glow', { opacity: 0.06, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(''); setMessage('');
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
        if (newPassword.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return; }
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword, turnstileToken }),
            });
            const data = await response.json();
            if (response.ok) { setMessage('Password reset successfully! Redirecting to login...'); setTimeout(() => router.push('/auth/login'), 2000); }
            else { setError(data.message || 'Failed to reset password'); }
        } catch (err) { setError('An error occurred. Please try again.'); }
        finally { setLoading(false); }
    };

    const inputStyle = { background: 'rgba(147,197,253,0.04)', border: '1px solid rgba(147,197,253,0.1)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' };
    const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.25)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 12px rgba(147,197,253,0.08)'; };
    const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.1)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3)'; };

    return (
        <div ref={containerRef} className="min-h-screen text-white flex items-center justify-center py-12 px-4 overflow-hidden" style={{ backgroundColor: '#030304' }}>
            {/* ── Frost / Fog Background ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.15) 20%, rgba(186,230,253,0.25) 50%, rgba(147,197,253,0.15) 80%, transparent)' }} />
                <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(147,197,253,0.08) 0%, transparent 70%)' }} />
                <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(186,230,253,0.06) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(186,230,253,1) 1px, transparent 1px), linear-gradient(90deg, rgba(186,230,253,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="fog-layer-1 absolute top-[20%] left-[-10%] w-[60%] h-[300px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,0.04) 0%, transparent 70%)' }} />
                <div className="fog-layer-2 absolute top-[60%] right-[-5%] w-[50%] h-[250px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(186,230,253,0.03) 0%, transparent 70%)' }} />
                <div className="frost-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,1) 0%, transparent 60%)' }} />
            </div>

            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />

            <div className="relative z-10 max-w-md w-full">
                <div>
                    {/* ── Glass Header ── */}
                    <div className="confirm-icon text-center py-5 rounded-t-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.05) 0%, rgba(186,230,253,0.02) 50%, rgba(96,165,250,0.04) 100%)', border: '1px solid rgba(147,197,253,0.1)', borderBottom: '1px solid rgba(147,197,253,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.15)' }}>
                        <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)' }} />
                        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 70%, transparent)' }} />
                        <Link href="/home" className="relative inline-block mb-3">
                            <Image src="/images/logos/company-logo-original.png" alt="Maula AI" width={52} height={52} className="w-[52px] h-[52px] object-contain" priority />
                        </Link>
                        <h1 className="relative text-xl font-bold leading-tight">
                            <span className="confirm-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>New Password</span>
                        </h1>
                        <p className="confirm-subtitle relative text-xs mt-1" style={{ color: 'rgba(186,230,253,0.7)' }}>Enter your new password below (min 8 characters)</p>
                    </div>

                    {/* ── Confirm Form Card ── */}
                    <div className="confirm-form relative p-8 rounded-b-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.04) 0%, rgba(186,230,253,0.02) 50%, rgba(96,165,250,0.03) 100%)', border: '1px solid rgba(147,197,253,0.08)', borderTop: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(147,197,253,0.04), inset 0 1px 0 rgba(186,230,253,0.06)' }}>
                        <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(147,197,253,0.06) 0%, transparent 70%)' }} />
                        <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none" style={{ background: 'radial-gradient(circle at bottom right, rgba(96,165,250,0.04) 0%, transparent 70%)' }} />

                        <form onSubmit={handleSubmit} className="relative space-y-4">
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium mb-2" style={{ color: 'rgba(186,230,253,0.5)' }}>New Password</label>
                                <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8}
                                    className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none transition-all duration-300"
                                    placeholder="Enter new password" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'rgba(186,230,253,0.5)' }}>Confirm Password</label>
                                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8}
                                    className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none transition-all duration-300"
                                    placeholder="Confirm new password" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                            </div>

                            {message && (
                                <div className="p-3 rounded-xl" style={{ background: 'rgba(147,197,253,0.06)', border: '1px solid rgba(147,197,253,0.15)' }}>
                                    <p className="text-sm flex items-center gap-2" style={{ color: 'rgba(186,230,253,0.9)' }}>✅ {message}</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <p className="text-red-400 text-sm flex items-center gap-2">⚠️ {error}</p>
                                </div>
                            )}

                            <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} className="mb-2" />

                            <button type="submit" disabled={loading || !token || !turnstileToken}
                                className="w-full py-3 px-4 font-semibold rounded-xl text-white transition-all duration-300 hover:scale-[1.02]"
                                style={loading || !token
                                    ? { background: 'rgba(147,197,253,0.06)', color: 'rgba(148,163,184,0.4)', cursor: 'not-allowed' }
                                    : { background: 'linear-gradient(135deg, rgba(59,130,246,0.7) 0%, rgba(6,182,212,0.5) 100%)', border: '1px solid rgba(147,197,253,0.2)', boxShadow: '0 4px 16px rgba(59,130,246,0.2), inset 0 1px 0 rgba(186,230,253,0.15)' }
                                }
                            >
                                {loading ? 'Resetting...' : '🔐 Reset Password'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="confirm-footer mt-4 text-center">
                    <Link href="/auth/login" className="font-medium text-sm transition-colors duration-200" style={{ color: 'rgba(147,197,253,0.7)' }}>
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ConfirmResetPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030304' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full animate-spin" style={{ border: '3px solid rgba(147,197,253,0.2)', borderTopColor: 'rgba(147,197,253,0.8)' }} />
                    <p style={{ color: 'rgba(148,163,184,0.6)' }}>Loading...</p>
                </div>
            </div>
        }>
            <ConfirmResetForm />
        </Suspense>
    );
}
