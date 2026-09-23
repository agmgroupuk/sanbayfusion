'use client';

import Link from 'next/link';

export default function ForbiddenPage() {
    return (
        <div className="min-h-screen bg-neural-950 flex items-center justify-center relative overflow-hidden">
            {/* Background glow */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: 'radial-gradient(600px circle at 50% 40%, rgba(245,158,11,0.15), transparent 60%)',
                }}
            />

            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />

            <div className="relative z-10 text-center px-6 max-w-lg">
                {/* Brand logo */}
                <div className="mb-8 flex justify-center">
                    <img src="/images/logos/company-logo.png" alt="Sanbay Fusion" className="h-10 w-auto opacity-80" />
                </div>

                {/* Lock icon */}
                <div className="relative mb-6 inline-flex">
                    <div className="w-24 h-24 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <svg className="w-12 h-12 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>
                </div>

                {/* Error code */}
                <h1
                    className="text-7xl sm:text-8xl font-black leading-none tracking-tighter mb-4 select-none"
                    style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    403
                </h1>

                <div className="space-y-3 mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">
                        Access Denied
                    </h2>
                    <p className="text-neural-400 text-base sm:text-lg leading-relaxed">
                        You don&apos;t have permission to access this page.
                        Please sign in or upgrade your plan.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/signin"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-brand-500/25"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Sign In
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 border border-neural-700 text-neural-300 hover:border-brand-500/50 hover:text-white hover:bg-neural-800/50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Go Home
                    </Link>
                </div>

                <p className="mt-10 text-neural-600 text-sm">
                    Error code: 403 &middot; sanbayfusion.com
                </p>
            </div>
        </div>
    );
}
