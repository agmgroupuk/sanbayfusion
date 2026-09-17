'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Cookie, Shield, ChevronDown, ChevronUp, X } from 'lucide-react';

// ─── Cookie categories ────────────────────────────────────────────────────
const COOKIE_CATEGORIES = [
    {
        key: 'essential',
        label: 'Essential',
        description: 'Authentication, session security, CSRF protection. Required for the site to function.',
        locked: true,
        default: true,
    },
    {
        key: 'analytics',
        label: 'Analytics',
        description: 'Anonymous usage metrics (visitor ID, page views). First-party only — no Google Analytics, no Facebook Pixel.',
        locked: false,
        default: true,
    },
    {
        key: 'functional',
        label: 'Functional',
        description: 'Preferences, theme settings, and UI state stored in localStorage.',
        locked: false,
        default: true,
    },
];

interface CookieConsent {
    essential: boolean;
    analytics: boolean;
    functional: boolean;
    timestamp: string;
    version: number;
}

const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = 1;

function getConsent(): CookieConsent | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CONSENT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed.version !== CONSENT_VERSION) return null;
        return parsed;
    } catch {
        return null;
    }
}

function saveConsent(consent: Omit<CookieConsent, 'timestamp' | 'version'>) {
    const full: CookieConsent = {
        ...consent,
        timestamp: new Date().toISOString(),
        version: CONSENT_VERSION,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(full));

    // Also set a simple cookie so server can read consent status
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `cookie_consent=accepted; path=/; expires=${expires}; SameSite=Lax; Secure`;
}

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [prefs, setPrefs] = useState({ essential: true, analytics: true, functional: true });
    const [animating, setAnimating] = useState(false);
    const bannerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Small delay so it doesn't flash during page load
        const timer = setTimeout(() => {
            const existing = getConsent();
            if (!existing) {
                setVisible(true);
                setAnimating(true);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const handleAcceptAll = useCallback(() => {
        saveConsent({ essential: true, analytics: true, functional: true });
        setAnimating(false);
        setTimeout(() => setVisible(false), 300);
    }, []);

    const handleRejectNonEssential = useCallback(() => {
        saveConsent({ essential: true, analytics: false, functional: false });
        setPrefs({ essential: true, analytics: false, functional: false });
        setAnimating(false);
        setTimeout(() => setVisible(false), 300);
    }, []);

    const handleSavePreferences = useCallback(() => {
        saveConsent(prefs);
        setAnimating(false);
        setTimeout(() => setVisible(false), 300);
    }, [prefs]);

    if (!visible) return null;

    return (
        <div
            ref={bannerRef}
            className={`fixed bottom-0 left-0 right-0 z-[9999] transition-all duration-300 ease-out ${animating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        >
            {/* Backdrop blur layer */}
            <div className="absolute inset-0 backdrop-blur-xl" style={{ background: 'rgba(3,3,4,0.92)' }} />

            {/* Top frost line */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.2) 20%, rgba(186,230,253,0.35) 50%, rgba(147,197,253,0.2) 80%, transparent)' }} />

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
                {/* Main row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Icon + Text */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(147,197,253,0.08)', border: '1px solid rgba(147,197,253,0.12)' }}>
                            <Cookie className="w-4 h-4" style={{ color: 'rgba(186,230,253,0.7)' }} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white leading-snug">
                                We use cookies for authentication and analytics
                            </p>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
                                Only essential + first-party analytics. Zero third-party tracking. Zero ads.{' '}
                                <Link href="/legal/cookie-policy" className="underline underline-offset-2 transition-colors" style={{ color: 'rgba(147,197,253,0.7)' }}>
                                    Cookie Policy
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
                            style={{ color: 'rgba(148,163,184,0.6)', background: 'transparent' }}
                        >
                            Customize
                            {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        </button>

                        <button
                            onClick={handleRejectNonEssential}
                            className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.02]"
                            style={{ color: 'rgba(186,230,253,0.7)', background: 'rgba(147,197,253,0.06)', border: '1px solid rgba(147,197,253,0.1)' }}
                        >
                            Essential Only
                        </button>

                        <button
                            onClick={handleAcceptAll}
                            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.7), rgba(6,182,212,0.5))', border: '1px solid rgba(147,197,253,0.2)', boxShadow: '0 2px 8px rgba(59,130,246,0.15)' }}
                        >
                            Accept All
                        </button>
                    </div>
                </div>

                {/* Expanded details */}
                {showDetails && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(147,197,253,0.08)' }}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {COOKIE_CATEGORIES.map((cat) => (
                                <div
                                    key={cat.key}
                                    className="rounded-xl p-3 transition-all duration-200"
                                    style={{ background: 'rgba(147,197,253,0.03)', border: '1px solid rgba(147,197,253,0.06)' }}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-white">{cat.label}</span>
                                        {cat.locked ? (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: 'rgba(74,222,128,0.8)', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                                                Always On
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => setPrefs(p => ({ ...p, [cat.key]: !p[cat.key as keyof typeof p] }))}
                                                className="relative w-9 h-5 rounded-full transition-all duration-200"
                                                style={{
                                                    background: prefs[cat.key as keyof typeof prefs]
                                                        ? 'linear-gradient(135deg, rgba(59,130,246,0.7), rgba(6,182,212,0.5))'
                                                        : 'rgba(147,197,253,0.1)',
                                                    border: `1px solid ${prefs[cat.key as keyof typeof prefs] ? 'rgba(147,197,253,0.2)' : 'rgba(147,197,253,0.08)'}`,
                                                }}
                                            >
                                                <div
                                                    className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-200"
                                                    style={{ left: prefs[cat.key as keyof typeof prefs] ? '18px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                                                />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.5)' }}>{cat.description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1.5">
                                <Shield className="w-3 h-3" style={{ color: 'rgba(74,222,128,0.5)' }} />
                                <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>GDPR · CCPA · ePrivacy compliant</span>
                            </div>
                            <button
                                onClick={handleSavePreferences}
                                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.02]"
                                style={{ color: 'rgba(186,230,253,0.8)', background: 'rgba(147,197,253,0.08)', border: '1px solid rgba(147,197,253,0.12)' }}
                            >
                                Save Preferences
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
