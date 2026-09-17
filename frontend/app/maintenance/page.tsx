'use client';

import Link from 'next/link';

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-neural-950 flex items-center justify-center relative overflow-hidden">
            {/* Background glow */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: 'radial-gradient(600px circle at 50% 40%, rgba(14,165,233,0.15), transparent 60%)',
                }}
            />

            {/* Animated dots */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full animate-pulse"
                        style={{
                            width: `${4 + i * 3}px`,
                            height: `${4 + i * 3}px`,
                            background: '#0ea5e9',
                            opacity: 0.15,
                            left: `${10 + i * 10}%`,
                            top: `${15 + (i % 4) * 20}%`,
                            animationDelay: `${i * 0.3}s`,
                            animationDuration: `${2 + i * 0.4}s`,
                        }}
                    />
                ))}
            </div>

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
                    <img src="/images/logos/company-logo.png" alt="Maula AI" className="h-10 w-auto opacity-80" />
                </div>

                {/* Wrench icon */}
                <div className="relative mb-6 inline-flex">
                    <div className="w-24 h-24 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                        <svg className="w-12 h-12 text-brand-400 animate-spin" style={{ animationDuration: '8s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m-.26 17.726a7.5 7.5 0 01-2.605 0" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1
                    className="text-5xl sm:text-6xl font-black leading-none tracking-tighter mb-4 select-none"
                    style={{
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    503
                </h1>

                <div className="space-y-3 mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">
                        Under Maintenance
                    </h2>
                    <p className="text-neural-400 text-base sm:text-lg leading-relaxed">
                        We&apos;re upgrading our AI agents to serve you better.
                        We&apos;ll be back shortly.
                    </p>
                </div>

                {/* Status indicator */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neural-900/50 border border-neural-800 mb-8">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-neural-400 text-sm">Maintenance in progress</span>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-brand-500/25 cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                        Check Again
                    </button>
                </div>

                <p className="mt-10 text-neural-600 text-sm">
                    Status: 503 &middot; maula.ai
                </p>
            </div>
        </div>
    );
}
