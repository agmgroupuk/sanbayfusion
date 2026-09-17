'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        console.error('[Maula AI] Runtime error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-neural-950 flex items-center justify-center relative overflow-hidden">
            {/* Pulsing red radial */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: 'radial-gradient(600px circle at 50% 40%, rgba(239,68,68,0.2), transparent 60%)',
                }}
            />

            {/* Grid overlay */}
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

                {/* Error icon */}
                <div className="relative mb-6 inline-flex">
                    <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                </div>

                {/* Error code */}
                <h1
                    className="text-7xl sm:text-8xl font-black leading-none tracking-tighter mb-4 select-none"
                    style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    500
                </h1>

                {/* Message */}
                <div className="space-y-3 mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">
                        Something Went Wrong
                    </h2>
                    <p className="text-neural-400 text-base sm:text-lg leading-relaxed">
                        An unexpected error occurred. Our AI agents are already looking into it.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                    <button
                        onClick={() => reset()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-brand-500/25 cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                        Try Again
                    </button>
                    <Link
                        href="/home"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 border border-neural-700 text-neural-300 hover:border-brand-500/50 hover:text-white hover:bg-neural-800/50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Go Home
                    </Link>
                </div>

                {/* Error details toggle */}
                {error?.digest && (
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-neural-500 text-sm hover:text-neural-400 transition-colors cursor-pointer"
                    >
                        {showDetails ? 'Hide' : 'Show'} error details
                    </button>
                )}

                {showDetails && error?.digest && (
                    <div className="mt-3 p-4 rounded-xl bg-neural-900/50 border border-neural-800 text-left">
                        <p className="text-neural-500 text-xs font-mono break-all">
                            Digest: {error.digest}
                        </p>
                    </div>
                )}

                <p className="mt-8 text-neural-600 text-sm">
                    Error code: 500 &middot; maula.ai
                </p>
            </div>
        </div>
    );
}
