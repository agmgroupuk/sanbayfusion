'use client';

import Link from 'next/link';

export default function AccountLockedPage() {
    return (
        <div className="min-h-screen bg-neural-950 flex items-center justify-center relative overflow-hidden">
            {/* Background glow */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: 'radial-gradient(600px circle at 50% 40%, rgba(239,68,68,0.15), transparent 60%)',
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

                {/* Shield icon */}
                <div className="relative mb-6 inline-flex">
                    <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1
                    className="text-5xl sm:text-6xl font-black leading-none tracking-tighter mb-4 select-none"
                    style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    423
                </h1>

                <div className="space-y-3 mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">
                        Account Locked
                    </h2>
                    <p className="text-neural-400 text-base sm:text-lg leading-relaxed">
                        This account has been locked due to multiple failed login
                        attempts. Please contact our support team to regain access.
                    </p>
                </div>

                {/* Support card */}
                <div className="p-5 rounded-2xl bg-neural-900/50 border border-neural-800 mb-8 text-left">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        Contact Support
                    </h3>
                    <p className="text-neural-400 text-sm mb-2">
                        Email us to unlock your account. Please include your registered email address.
                    </p>
                    <a
                        href="mailto:support@sanbayfusion.com?subject=Account%20Locked%20-%20Please%20Unlock"
                        className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium text-sm transition-colors"
                    >
                        support@sanbayfusion.com
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                    </a>
                </div>

                <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 border border-neural-700 text-neural-300 hover:border-brand-500/50 hover:text-white hover:bg-neural-800/50"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Go Home
                </Link>

                <p className="mt-10 text-neural-600 text-sm">
                    Error code: 423 &middot; sanbayfusion.com
                </p>
            </div>
        </div>
    );
}
