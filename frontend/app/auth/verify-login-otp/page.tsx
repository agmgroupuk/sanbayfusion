'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { secureAuthStorage } from '@/lib/secure-auth-storage';
import { gsap, SplitText } from '@/lib/gsap';

function VerifyLoginOTPContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const router = useRouter();
    const searchParams = useSearchParams();

    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const tempToken = searchParams.get('token');

    useEffect(() => {
        if (!userId || !tempToken) { router.push('/auth/login'); }
    }, [userId, tempToken, router]);

    useEffect(() => { inputRefs.current[0]?.focus(); }, []);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => setCountdown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    // ─── Ice particles canvas ───
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let raf: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        const particles = Array.from({ length: 40 }, () => ({
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
        if (!containerRef.current || !userId) return;
        const ctx = gsap.context(() => {
            const title = new SplitText('.verify-title', { type: 'chars' });
            gsap.set(title.chars, { y: 50, opacity: 0, rotateX: -90 });
            gsap.set('.verify-subtitle', { y: 20, opacity: 0 });
            gsap.set('.verify-icon', { scale: 0, rotation: -180 });
            gsap.set('.verify-form', { y: 40, opacity: 0 });
            gsap.set('.code-input', { scale: 0, opacity: 0 });

            const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
            tl
                .to('.verify-icon', { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.7)' })
                .to(title.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.6, stagger: 0.02 }, '-=0.4')
                .to('.verify-subtitle', { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')
                .to('.verify-form', { y: 0, opacity: 1, duration: 0.6 }, '-=0.2')
                .to('.code-input', { scale: 1, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.7)' }, '-=0.3');

            gsap.to('.fog-layer-1', { x: 40, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.fog-layer-2', { x: -30, duration: 15, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.frost-glow', { opacity: 0.06, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        }, containerRef);
        return () => ctx.revert();
    }, [userId]);

    const handleInputChange = (index: number, value: string) => {
        if (value && !/^\d$/.test(value)) return;
        const newCode = [...code]; newCode[index] = value; setCode(newCode); setError(null);
        if (value && index < 5) { inputRefs.current[index + 1]?.focus(); }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) { inputRefs.current[index - 1]?.focus(); }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length === 6) { setCode(pastedData.split('')); inputRefs.current[5]?.focus(); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const verificationCode = code.join('');
        if (verificationCode.length !== 6) { setError('Please enter all 6 digits'); return; }
        setIsSubmitting(true); setError(null);
        try {
            const response = await fetch('/api/auth/verify-login-otp', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ tempToken, userId, code: verificationCode }),
            });
            const data = await response.json();
            if (!response.ok) {
                if (data.expired) {
                    setError('Code expired. Please click "Resend Code" to get a new one.');
                } else {
                    throw new Error(data.message || 'Verification failed');
                }
                return;
            }
            if (data.user) {
                secureAuthStorage.setUser(data.user);
                window.location.href = '/dashboard/overview';
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Verification failed';
            setError(message); setCode(['', '', '', '', '', '']); inputRefs.current[0]?.focus();
        } finally { setIsSubmitting(false); }
    };

    const handleResend = async () => {
        if (isResending || countdown > 0) return;
        setIsResending(true); setError(null); setSuccess(null);
        try {
            const response = await fetch('/api/auth/resend-login-otp', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tempToken, userId }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to resend');
            setSuccess('A new verification code has been sent to your email.');
            setCountdown(60);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to resend code');
        } finally { setIsResending(false); }
    };

    // Auto-submit when 6 digits entered
    useEffect(() => {
        const verificationCode = code.join('');
        if (verificationCode.length === 6 && !isSubmitting) {
            const form = document.getElementById('verify-login-otp-form') as HTMLFormElement;
            form?.requestSubmit();
        }
    }, [code, isSubmitting]);

    if (!userId || !tempToken) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030304' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full animate-spin" style={{ border: '3px solid rgba(147,197,253,0.2)', borderTopColor: 'rgba(147,197,253,0.8)' }} />
                    <p style={{ color: 'rgba(148,163,184,0.6)' }}>Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen text-white flex items-center justify-center py-12 px-4 overflow-hidden" style={{ backgroundColor: '#030304' }}>
            {/* ── Frost / Fog Background ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.15) 20%, rgba(186,230,253,0.25) 50%, rgba(147,197,253,0.15) 80%, transparent)' }} />
                <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(147,197,253,0.08) 0%, transparent 70%)' }} />
                <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(186,230,253,0.06) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(186,230,253,1) 1px, transparent 1px), linear-gradient(90deg, rgba(186,230,253,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="fog-layer-1 absolute top-[20%] left-[-10%] w-[60%] h-[300px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,0.04) 0%, transparent 70%)' }} />
                <div className="fog-layer-2 absolute top-[60%] right-[-5%] w-[50%] h-[250px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(186,230,253,0.03) 0%, transparent 70%)' }} />
                <div className="frost-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,1) 0%, transparent 60%)' }} />
            </div>

            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />

            <div className="relative z-10 max-w-md w-full">
                <div>
                    {/* ── Glass Header ── */}
                    <div className="verify-icon text-center py-5 rounded-t-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.05) 0%, rgba(186,230,253,0.02) 50%, rgba(96,165,250,0.04) 100%)', border: '1px solid rgba(147,197,253,0.1)', borderBottom: '1px solid rgba(147,197,253,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.15)' }}>
                        <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)' }} />
                        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 70%, transparent)' }} />
                        <Link href="/home" className="relative inline-block mb-3">
                            <Image src="/images/logos/company-logo-original.png" alt="Maula AI" width={52} height={52} className="w-[52px] h-[52px] object-contain" priority />
                        </Link>
                        <h1 className="relative text-xl font-bold leading-tight">
                            <span className="verify-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Verify Login</span>
                        </h1>
                        <p className="verify-subtitle relative text-xs mt-1" style={{ color: 'rgba(186,230,253,0.7)' }}>
                            We sent a 6-digit code to{' '}
                            <span style={{ color: 'rgba(96,165,250,0.9)', fontWeight: 500 }}>{email || 'your email'}</span>
                        </p>
                    </div>

                    {/* ── Verification Form Card ── */}
                    <div className="verify-form relative p-8 rounded-b-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.04) 0%, rgba(186,230,253,0.02) 50%, rgba(96,165,250,0.03) 100%)', border: '1px solid rgba(147,197,253,0.08)', borderTop: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(147,197,253,0.04), inset 0 1px 0 rgba(186,230,253,0.06)' }}>
                        <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(147,197,253,0.06) 0%, transparent 70%)' }} />
                        <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none" style={{ background: 'radial-gradient(circle at bottom right, rgba(96,165,250,0.04) 0%, transparent 70%)' }} />

                        {/* ── Error ── */}
                        {error && (
                            <div className="relative mb-4 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <p className="text-red-400 text-center font-medium text-sm">{error}</p>
                            </div>
                        )}
                        {/* ── Success ── */}
                        {success && (
                            <div className="relative mb-4 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                <p className="text-green-400 text-center font-medium text-sm">{success}</p>
                            </div>
                        )}

                        <form id="verify-login-otp-form" onSubmit={handleSubmit} className="relative space-y-6">
                            <div className="text-center mb-2">
                                <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>Enter the 6-digit verification code</p>
                            </div>

                            <div className="flex justify-center gap-3" role="group" aria-label="6-digit verification code">
                                {code.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="text" inputMode="numeric" maxLength={1} value={digit}
                                        onChange={(e) => handleInputChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={index === 0 ? handlePaste : undefined}
                                        className="code-input w-12 h-14 text-center text-2xl font-bold rounded-xl text-white focus:outline-none transition-all duration-300"
                                        style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.12)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}
                                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 16px rgba(59,130,246,0.15)'; }}
                                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.12)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3)'; }}
                                        disabled={isSubmitting}
                                    />
                                ))}
                            </div>

                            <button type="submit"
                                disabled={isSubmitting || code.join('').length !== 6}
                                className="w-full py-3 px-4 font-semibold rounded-xl text-white transition-all duration-300 hover:scale-[1.02]"
                                style={isSubmitting || code.join('').length !== 6
                                    ? { background: 'rgba(59,130,246,0.06)', color: 'rgba(148,163,184,0.4)', cursor: 'not-allowed' }
                                    : { background: 'linear-gradient(135deg, rgba(59,130,246,0.7) 0%, rgba(6,182,212,0.5) 100%)', border: '1px solid rgba(59,130,246,0.25)', boxShadow: '0 4px 16px rgba(59,130,246,0.2), inset 0 1px 0 rgba(186,230,253,0.15)' }
                                }
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 mr-2" style={{ border: '2px solid rgba(186,230,253,0.3)', borderTopColor: 'rgba(186,230,253,0.8)' }} />
                                        Verifying...
                                    </span>
                                ) : '🔑 Verify & Sign In'}
                            </button>
                        </form>

                        {/* Resend code */}
                        <div className="relative text-center mt-6 pt-4" style={{ borderTop: '1px solid rgba(147,197,253,0.06)' }}>
                            {countdown > 0 ? (
                                <p className="text-sm" style={{ color: 'rgba(148,163,184,0.4)' }}>
                                    Resend code in <span style={{ color: 'rgba(59,130,246,0.8)' }}>{countdown}s</span>
                                </p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    disabled={isResending}
                                    className="text-sm transition-colors duration-200 hover:underline"
                                    style={{ color: 'rgba(59,130,246,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    {isResending ? 'Sending...' : "Didn't receive the code? Resend"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Timer info ── */}
                <div className="text-center mt-4">
                    <p className="text-xs" style={{ color: 'rgba(148,163,184,0.35)' }}>
                        Code expires in 10 minutes • Check your spam folder
                    </p>
                </div>

                {/* ── Back to Login ── */}
                <div className="text-center mt-3">
                    <Link href="/auth/login" className="text-sm transition-colors duration-200" style={{ color: 'rgba(148,163,184,0.5)' }}>
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function VerifyLoginOTPPage() {
    return (
        <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#030304' }} />}>
            <VerifyLoginOTPContent />
        </Suspense>
    );
}
