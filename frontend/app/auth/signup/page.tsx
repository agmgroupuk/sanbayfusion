'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { gsap, SplitText } from '@/lib/gsap';
import TurnstileWidget from '@/components/TurnstileWidget';

function SignupPageContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

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
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            const title = new SplitText('.signup-title', { type: 'chars' });
            gsap.set(title.chars, { y: 50, opacity: 0, rotateX: -90 });
            gsap.set('.signup-subtitle', { y: 20, opacity: 0 });
            gsap.set('.signup-logo', { scale: 0, rotation: -180 });
            gsap.set('.signup-form', { y: 40, opacity: 0 });
            gsap.set('.signup-footer', { y: 20, opacity: 0 });

            const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
            tl
                .to('.signup-logo', { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.7)' })
                .to(title.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.6, stagger: 0.03 }, '-=0.4')
                .to('.signup-subtitle', { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')
                .to('.signup-form', { y: 0, opacity: 1, duration: 0.6 }, '-=0.2')
                .to('.signup-footer', { y: 0, opacity: 1, duration: 0.4 }, '-=0.2');

            gsap.to('.fog-layer-1', { x: 40, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.fog-layer-2', { x: -30, duration: 15, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.frost-glow', { opacity: 0.06, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const handlePasswordSignup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        if (!turnstileToken) { setError('Please complete the security check'); return; }
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const name = formData.get('name') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) { setError('Passwords do not match'); setIsLoading(false); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); setIsLoading(false); return; }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, password, authMethod: 'password', turnstileToken }),
            });
            const data = await response.json();
            if (!response.ok) { setError(data.message || 'Failed to create account'); return; }

            // Redirect to email verification page
            if (data.requiresVerification) {
                router.push(`/auth/verify-email?userId=${data.userId}&email=${encodeURIComponent(data.email)}`);
            } else {
                const redirectTo = searchParams.get('redirect') || '/dashboard/overview';
                const loginUrl = `/auth/login?message=Account created successfully! Please sign in.${redirectTo !== '/dashboard/overview' ? `&redirect=${encodeURIComponent(redirectTo)}` : ''}`;
                router.push(loginUrl);
            }
        } catch (err) {
            setError('Failed to create account. Please try again.');
            console.error('Password signup error:', err);
        } finally { setIsLoading(false); }
    };

    const inputStyle = { background: 'rgba(147,197,253,0.04)', border: '1px solid rgba(147,197,253,0.1)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' };
    const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.25)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 12px rgba(147,197,253,0.08)'; };
    const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.1)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3)'; };

    return (
        <div ref={containerRef} className="min-h-screen text-white flex flex-col items-center justify-center py-4 px-4 overflow-hidden" style={{ backgroundColor: '#030304' }}>
            {/* ── Frost / Fog Background ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.15) 20%, rgba(186,230,253,0.25) 50%, rgba(147,197,253,0.15) 80%, transparent)' }} />
                <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(147,197,253,0.08) 0%, transparent 70%)' }} />
                <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(186,230,253,0.06) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(186,230,253,1) 1px, transparent 1px), linear-gradient(90deg, rgba(186,230,253,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="fog-layer-1 absolute top-[20%] left-[-10%] w-[60%] h-[300px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,0.04) 0%, transparent 70%)' }} />
                <div className="fog-layer-2 absolute top-[60%] right-[-5%] w-[50%] h-[250px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(186,230,253,0.03) 0%, transparent 70%)' }} />
                <div className="frost-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,1) 0%, transparent 60%)' }} />
            </div>

            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />

            <div className="relative z-10 w-full max-w-xl">

                {/* ── Glass Header ── */}
                <div className="signup-logo text-center py-5 rounded-t-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.05) 0%, rgba(186,230,253,0.02) 50%, rgba(96,165,250,0.04) 100%)', border: '1px solid rgba(147,197,253,0.1)', borderBottom: '1px solid rgba(147,197,253,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.15)' }}>
                    <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)' }} />
                    <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 70%, transparent)' }} />
                    <Link href="/" className="relative inline-block mb-3">
                        <Image src="/images/logos/company-logo-original.png" alt="Maula AI" width={52} height={52} className="w-[52px] h-[52px] object-contain" priority />
                    </Link>
                    <h1 className="relative text-xl font-bold leading-tight">
                        <span className="signup-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Join Maula AI</span>
                    </h1>
                    <p className="signup-subtitle relative text-xs mt-1" style={{ color: 'rgba(186,230,253,0.7)' }}>Create your account in seconds and start exploring</p>
                </div>

                {/* ── Main Card ── */}
                <div className="signup-form relative p-5 rounded-b-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.04) 0%, rgba(186,230,253,0.02) 50%, rgba(96,165,250,0.03) 100%)', border: '1px solid rgba(147,197,253,0.08)', borderTop: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(147,197,253,0.04), inset 0 1px 0 rgba(186,230,253,0.03)' }}>
                    <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(147,197,253,0.04) 0%, transparent 70%)' }} />
                    <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none" style={{ background: 'radial-gradient(circle at bottom right, rgba(96,165,250,0.03) 0%, transparent 70%)' }} />

                    {error && (
                        <div className="relative mb-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <p className="text-red-400 text-xs text-center">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handlePasswordSignup} className="relative space-y-3">
                        {/* Row 1: Email + Name side by side */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="email" className="block text-xs font-medium mb-1" style={{ color: 'rgba(186,230,253,0.5)' }}>Email Address</label>
                                <input id="email" name="email" type="email" required placeholder="you@example.com"
                                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none transition-all duration-300"
                                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                            </div>
                            <div>
                                <label htmlFor="name" className="block text-xs font-medium mb-1" style={{ color: 'rgba(186,230,253,0.5)' }}>Full Name</label>
                                <input id="name" name="name" type="text" required placeholder="John Doe"
                                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none transition-all duration-300"
                                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                            </div>
                        </div>

                        {/* Row 2: Password + Confirm side by side */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="password" className="block text-xs font-medium mb-1" style={{ color: 'rgba(186,230,253,0.5)' }}>Password</label>
                                <input id="password" name="password" type="password" required minLength={8} placeholder="Min 8 characters"
                                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none transition-all duration-300"
                                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-xs font-medium mb-1" style={{ color: 'rgba(186,230,253,0.5)' }}>Confirm Password</label>
                                <input id="confirmPassword" name="confirmPassword" type="password" required placeholder="Confirm password"
                                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none transition-all duration-300"
                                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                            </div>
                        </div>

                        <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} className="mb-2" />

                        <button type="submit" disabled={isLoading || !turnstileToken}
                            className="w-full py-2.5 font-semibold rounded-xl text-white text-sm transition-all duration-300 hover:scale-[1.02]"
                            style={isLoading
                                ? { background: 'rgba(147,197,253,0.06)', color: 'rgba(148,163,184,0.4)', cursor: 'not-allowed' }
                                : { background: 'linear-gradient(135deg, rgba(59,130,246,0.7) 0%, rgba(6,182,212,0.5) 100%)', border: '1px solid rgba(147,197,253,0.2)', boxShadow: '0 4px 16px rgba(59,130,246,0.2), inset 0 1px 0 rgba(186,230,253,0.15)' }
                            }
                        >
                            {isLoading ? 'Creating account...' : '👤 Create Account'}
                        </button>

                        <p className="text-[10px] text-center leading-relaxed" style={{ color: 'rgba(148,163,184,0.35)' }}>
                            By signing up, you agree to our <Link href="/legal/terms-of-service" className="underline" style={{ color: 'rgba(148,163,184,0.5)' }}>Terms of Service</Link> and <Link href="/legal/privacy-policy" className="underline" style={{ color: 'rgba(148,163,184,0.5)' }}>Privacy Policy</Link>
                        </p>
                    </form>

                    {/* ── Divider ── */}
                    <div className="relative flex items-center my-4">
                        <div className="flex-grow h-px" style={{ background: 'rgba(147,197,253,0.1)' }} />
                        <span className="px-3 text-[10px] font-medium" style={{ color: 'rgba(148,163,184,0.4)' }}>or continue with</span>
                        <div className="flex-grow h-px" style={{ background: 'rgba(147,197,253,0.1)' }} />
                    </div>

                    {/* ── OAuth 2x2 Grid ── */}
                    <div className="relative grid grid-cols-2 gap-2.5">
                        <a href={`/api/auth/google${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`}
                            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm transition-all duration-300 hover:scale-[1.02]"
                            style={{ background: 'rgba(147,197,253,0.04)', border: '1px solid rgba(147,197,253,0.1)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.2)'; e.currentTarget.style.background = 'rgba(147,197,253,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.1)'; e.currentTarget.style.background = 'rgba(147,197,253,0.04)'; }}>
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span style={{ color: 'rgba(186,230,253,0.8)' }}>Google</span>
                        </a>

                        <a href={`/api/auth/github${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`}
                            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm transition-all duration-300 hover:scale-[1.02]"
                            style={{ background: 'rgba(147,197,253,0.04)', border: '1px solid rgba(147,197,253,0.1)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.2)'; e.currentTarget.style.background = 'rgba(147,197,253,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.1)'; e.currentTarget.style.background = 'rgba(147,197,253,0.04)'; }}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            <span style={{ color: 'rgba(186,230,253,0.8)' }}>GitHub</span>
                        </a>

                        <a href={`/api/auth/microsoft${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`}
                            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm transition-all duration-300 hover:scale-[1.02]"
                            style={{ background: 'rgba(147,197,253,0.04)', border: '1px solid rgba(147,197,253,0.1)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.2)'; e.currentTarget.style.background = 'rgba(147,197,253,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.1)'; e.currentTarget.style.background = 'rgba(147,197,253,0.04)'; }}>
                            <svg className="w-4 h-4" viewBox="0 0 23 23">
                                <path d="M0 0h11v11H0z" fill="#F25022" /><path d="M12 0h11v11H12z" fill="#7FBA00" />
                                <path d="M0 12h11v11H0z" fill="#00A4EF" /><path d="M12 12h11v11H12z" fill="#FFB900" />
                            </svg>
                            <span style={{ color: 'rgba(186,230,253,0.8)' }}>Microsoft</span>
                        </a>

                        <a href={`/api/auth/yahoo${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`}
                            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm transition-all duration-300 hover:scale-[1.02]"
                            style={{ background: 'rgba(147,197,253,0.04)', border: '1px solid rgba(147,197,253,0.1)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.2)'; e.currentTarget.style.background = 'rgba(147,197,253,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.1)'; e.currentTarget.style.background = 'rgba(147,197,253,0.04)'; }}>
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M12.246 0C6.206 0 1.037 4.282.067 9.934h5.12c.77-2.88 3.397-5.005 6.527-5.005 1.804 0 3.44.71 4.64 1.866l3.512-3.512C17.752 1.252 15.15 0 12.246 0z" fill="#720E9E" />
                                <path d="M23.93 9.934h-5.12c.314 1.174.314 2.412 0 3.586h5.12c.42-1.16.42-2.427 0-3.586z" fill="#720E9E" />
                                <path d="M12.246 24c2.904 0 5.506-1.252 7.62-3.283l-3.512-3.512c-1.2 1.156-2.836 1.866-4.64 1.866-3.13 0-5.757-2.125-6.527-5.005H.067C1.037 19.718 6.206 24 12.246 24z" fill="#720E9E" />
                            </svg>
                            <span style={{ color: 'rgba(186,230,253,0.8)' }}>Yahoo</span>
                        </a>
                    </div>

                    {/* Already have account */}
                    <div className="text-center mt-4">
                        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>
                            Already have an account?{' '}
                            <Link href={`/auth/login${searchParams.get('redirect') ? `?redirect=${searchParams.get('redirect')}` : ''}`} className="font-semibold transition-colors duration-200" style={{ color: 'rgba(6,182,212,0.9)' }}>
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* ── Back to homepage ── */}
                <div className="signup-footer text-center mt-4">
                    <Link href="/" className="text-xs transition-colors duration-200" style={{ color: 'rgba(148,163,184,0.4)' }}>
                        ← Back to homepage
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030304', color: 'rgba(148,163,184,0.5)' }}>Loading...</div>}>
            <SignupPageContent />
        </Suspense>
    );
}
