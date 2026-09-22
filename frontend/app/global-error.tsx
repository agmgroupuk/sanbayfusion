'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[Maula AI] Global error:', error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{ margin: 0, background: '#020617', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                }}>
                    <div style={{ textAlign: 'center', maxWidth: '480px' }}>
                        {/* Brand logo */}
                        <div style={{ marginBottom: '32px' }}>
                            <img src="/images/logos/company-logo.png" alt="Maula AI" style={{ height: '40px', width: 'auto', opacity: 0.8, margin: '0 auto' }} />
                        </div>

                        {/* Error icon */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px',
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>

                        <h1 style={{
                            fontSize: '64px',
                            fontWeight: 900,
                            lineHeight: 1,
                            letterSpacing: '-0.05em',
                            marginBottom: '16px',
                            background: 'linear-gradient(135deg, #ef4444, #f97316)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            500
                        </h1>

                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
                            Critical Error
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, marginBottom: '32px' }}>
                            Something went seriously wrong. Please try refreshing the page.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => reset()}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                                    transition: 'transform 0.2s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                Try Again
                            </button>
                            <a
                                href="/"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: '1px solid #334155',
                                    color: '#cbd5e1',
                                    fontWeight: 600,
                                    fontSize: '16px',
                                    textDecoration: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.borderColor = '#0ea5e9')}
                                onMouseOut={(e) => (e.currentTarget.style.borderColor = '#334155')}
                            >
                                Go Home
                            </a>
                        </div>

                        <p style={{ marginTop: '40px', color: '#475569', fontSize: '14px' }}>
                            Error code: 500 &middot; sanbayfusion.com
                        </p>
                    </div>
                </div>
            </body>
        </html>
    );
}
