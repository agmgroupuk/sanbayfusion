'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    Download, Smartphone, Monitor, Globe, Apple, Play,
    ExternalLink, Sparkles, Bot, Code2, Palette, Zap,
    ArrowRight, Check, ChevronDown, ChevronUp, Shield,
} from 'lucide-react';

/* ── App Data ── */

const APPS = [
    {
        id: 'maula-ai',
        name: 'Maula AI',
        tagline: 'Your AI Dream Team',
        description: '18 specialized AI personalities — chat with Einstein, Shakespeare, comedy legends & more. Full voice support, persistent conversations, and smart memory.',
        gradient: 'from-violet-500 to-indigo-600',
        glow: 'rgba(139,92,246,0.35)',
        icon: Bot,
        color: 'violet',
        webUrl: 'https://maula.ai',
        pwaUrl: 'https://maula.ai',
        features: ['18 AI agents', 'Voice chat', 'Session memory', 'Push notifications'],
        platforms: {
            pwa: { available: true, label: 'Install PWA', url: 'https://maula.ai' },
            playStore: { available: false, label: 'Google Play', url: '#' },
            appStore: { available: false, label: 'App Store', url: '#' },
            msStore: { available: false, label: 'Microsoft Store', url: '#' },
            macDmg: { available: false, label: 'macOS (.dmg)', url: '#' },
            windowsExe: { available: false, label: 'Windows (.exe)', url: '#' },
        },
    },
    {
        id: 'gencraft-pro',
        name: 'GenCraft Pro',
        tagline: 'AI App Builder',
        description: 'Build and deploy full-stack web apps with AI. 9+ AI providers, live preview, Monaco editor, image-to-code, AI video generation, and deploy to 5 platforms.',
        gradient: 'from-red-500 to-rose-600',
        glow: 'rgba(239,68,68,0.35)',
        icon: Code2,
        color: 'red',
        webUrl: 'https://canvas.maula.ai',
        pwaUrl: 'https://canvas.maula.ai',
        features: ['9+ AI providers', 'Live preview', 'Deploy to 5 platforms', '40+ languages'],
        platforms: {
            pwa: { available: true, label: 'Install PWA', url: 'https://canvas.maula.ai' },
            playStore: { available: false, label: 'Google Play', url: '#' },
            appStore: { available: false, label: 'App Store', url: '#' },
            msStore: { available: false, label: 'Microsoft Store', url: '#' },
            macDmg: { available: false, label: 'macOS (.dmg)', url: '#' },
            windowsExe: { available: false, label: 'Windows (.exe)', url: '#' },
        },
    },
    {
        id: 'canvas-studio',
        name: 'Canvas Studio',
        tagline: 'AI Code Editor',
        description: 'Professional AI-powered code editor with multi-file projects, Monaco editor, Sandpack runtime, and one-click deployment. Build anything with AI assistance.',
        gradient: 'from-cyan-500 to-blue-600',
        glow: 'rgba(6,182,212,0.35)',
        icon: Palette,
        color: 'cyan',
        webUrl: 'https://studio.maula.ai',
        pwaUrl: 'https://studio.maula.ai',
        features: ['Monaco Editor', 'Sandpack runtime', 'Multi-file projects', 'AI code assist'],
        platforms: {
            pwa: { available: true, label: 'Install PWA', url: 'https://studio.maula.ai' },
            playStore: { available: false, label: 'Google Play', url: '#' },
            appStore: { available: false, label: 'App Store', url: '#' },
            msStore: { available: false, label: 'Microsoft Store', url: '#' },
            macDmg: { available: false, label: 'macOS (.dmg)', url: '#' },
            windowsExe: { available: false, label: 'Windows (.exe)', url: '#' },
        },
    },
    {
        id: 'ai-studio-demo',
        name: 'AI Studio Demo',
        tagline: 'Try Before You Build',
        description: 'Interactive demo showcasing Maula AI capabilities. Explore AI chat, tools, and features before committing. No sign-up required to try.',
        gradient: 'from-amber-500 to-orange-600',
        glow: 'rgba(245,158,11,0.35)',
        icon: Sparkles,
        color: 'amber',
        webUrl: 'https://demo.maula.ai',
        pwaUrl: 'https://demo.maula.ai',
        features: ['No sign-up needed', 'Live AI chat', 'Feature showcase', 'Interactive tour'],
        platforms: {
            pwa: { available: true, label: 'Install PWA', url: 'https://demo.maula.ai' },
            playStore: { available: false, label: 'Google Play', url: '#' },
            appStore: { available: false, label: 'App Store', url: '#' },
            msStore: { available: false, label: 'Microsoft Store', url: '#' },
            macDmg: { available: false, label: 'macOS (.dmg)', url: '#' },
            windowsExe: { available: false, label: 'Windows (.exe)', url: '#' },
        },
    },
];

/* ── Platform Icon Components ── */

function GooglePlayIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 2.302-2.688-2.688 2.688-2.302-.001.386.001-.001zm-4.32-4.32l10.937 6.333-2.302 2.302-8.635-8.635z" />
        </svg>
    );
}

function AppleIcon({ className }: { className?: string }) {
    return <Apple className={className} />;
}

function WindowsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
        </svg>
    );
}

/* ── PWA Install Guide ── */

function PWAInstallGuide({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-[#0d0d12] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-violet-400" />
                    How to Install as App (PWA)
                </h3>

                <div className="space-y-4 text-sm text-gray-300">
                    <div>
                        <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-cyan-400" /> Desktop (Chrome / Edge)
                        </h4>
                        <ol className="list-decimal list-inside space-y-1 text-gray-400">
                            <li>Open the app URL in Chrome or Edge</li>
                            <li>Click the install icon in the address bar (or 3-dot menu &rarr; &quot;Install app&quot;)</li>
                            <li>Click &quot;Install&quot; in the prompt</li>
                            <li>The app will open in its own window — just like a native app!</li>
                        </ol>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-400" /> Android (Chrome)
                        </h4>
                        <ol className="list-decimal list-inside space-y-1 text-gray-400">
                            <li>Open the app URL in Chrome</li>
                            <li>Tap the 3-dot menu &rarr; &quot;Add to Home Screen&quot;</li>
                            <li>Tap &quot;Install&quot; or &quot;Add&quot;</li>
                            <li>Find the app on your home screen</li>
                        </ol>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                            <Apple className="w-4 h-4 text-gray-300" /> iOS (Safari)
                        </h4>
                        <ol className="list-decimal list-inside space-y-1 text-gray-400">
                            <li>Open the app URL in Safari</li>
                            <li>Tap the share button (box with arrow)</li>
                            <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                            <li>Tap &quot;Add&quot; — the app appears on your home screen</li>
                        </ol>
                    </div>
                </div>

                <div className="mt-5 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-xs text-violet-300">
                        <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                        PWAs work offline, receive push notifications, and feel like native apps — no app store needed!
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="mt-4 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-all"
                >
                    Got it
                </button>
            </div>
        </div>
    );
}

/* ── Main Page ── */

export default function AppsPage() {
    const [expandedApp, setExpandedApp] = useState<string | null>(null);
    const [showPWAGuide, setShowPWAGuide] = useState(false);
    const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#030304] text-white relative overflow-hidden">
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-violet-500/[0.04] blur-[150px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[120px]" />
                <div className="absolute top-2/3 left-1/6 w-[400px] h-[400px] rounded-full bg-fuchsia-500/[0.02] blur-[100px]" />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6">
                        <Download className="w-4 h-4" />
                        Download &amp; Install
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold mb-4">
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            Get Maula AI Apps
                        </span>
                    </h1>

                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Install our apps on any device. Use them as full native apps — no browser required. Available as PWAs now, with Play Store, App Store &amp; desktop apps coming soon.
                    </p>
                </div>

                {/* Platform badges */}
                <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
                    {[
                        { icon: Globe, label: 'PWA Ready', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', available: true },
                        { icon: Play, label: 'Google Play', color: 'text-gray-500 bg-white/[0.03] border-white/[0.06]', available: false },
                        { icon: Apple, label: 'App Store', color: 'text-gray-500 bg-white/[0.03] border-white/[0.06]', available: false },
                        { icon: Monitor, label: 'Desktop', color: 'text-gray-500 bg-white/[0.03] border-white/[0.06]', available: false },
                    ].map(badge => (
                        <div key={badge.label} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${badge.color}`}>
                            <badge.icon className="w-4 h-4" />
                            {badge.label}
                            {badge.available ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                                <span className="text-[10px] opacity-60">Soon</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* App Cards */}
                <div className="grid gap-6">
                    {APPS.map(app => {
                        const isExpanded = expandedApp === app.id;
                        const IconComp = app.icon;
                        const platformEntries = Object.entries(app.platforms);

                        return (
                            <div
                                key={app.id}
                                className="rounded-2xl border transition-all duration-300"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                    borderColor: isExpanded ? `rgba(139,92,246,0.2)` : 'rgba(255,255,255,0.06)',
                                    boxShadow: isExpanded ? `0 8px 40px ${app.glow.replace('0.35', '0.1')}` : '0 4px 24px rgba(0,0,0,0.3)',
                                }}
                            >
                                {/* App Header */}
                                <div
                                    className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center gap-4"
                                    onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                                >
                                    {/* Icon */}
                                    <div
                                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
                                        style={{ boxShadow: `0 8px 24px ${app.glow}` }}
                                    >
                                        <IconComp className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-xl font-bold text-white">{app.name}</h2>
                                            <span className="px-2 py-0.5 text-xs font-semibold bg-white/5 text-gray-400 rounded-full">{app.tagline}</span>
                                        </div>
                                        <p className="text-sm text-gray-400 line-clamp-2">{app.description}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {app.features.map(f => (
                                                <span key={f} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-500 border border-white/[0.06]">{f}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <a
                                            href={app.webUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-all"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <Globe className="w-4 h-4" />
                                            Open Web
                                        </a>
                                        <button className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all">
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Platforms */}
                                {isExpanded && (
                                    <div className="px-6 pb-6 border-t border-white/[0.04] pt-5">
                                        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                                            <Download className="w-4 h-4 text-violet-400" />
                                            Download &amp; Install Options
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {/* PWA - Always Available */}
                                            <button
                                                onClick={() => setShowPWAGuide(true)}
                                                onMouseEnter={() => setHoveredPlatform(`${app.id}-pwa`)}
                                                onMouseLeave={() => setHoveredPlatform(null)}
                                                className="group relative p-4 rounded-xl border transition-all duration-200 text-left bg-emerald-500/[0.06] border-emerald-500/20 hover:bg-emerald-500/[0.12] hover:border-emerald-500/30"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-emerald-500/20">
                                                        <Globe className="w-5 h-5 text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">Install as App (PWA)</p>
                                                        <p className="text-xs text-emerald-400/80">Works on all devices</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex items-center gap-1.5">
                                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                    <span className="text-[11px] text-emerald-400 font-medium">Available Now</span>
                                                </div>
                                            </button>

                                            {/* Google Play */}
                                            <div
                                                className="relative p-4 rounded-xl border transition-all duration-200 bg-white/[0.02] border-white/[0.06] opacity-60"
                                                onMouseEnter={() => setHoveredPlatform(`${app.id}-play`)}
                                                onMouseLeave={() => setHoveredPlatform(null)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-white/5">
                                                        <GooglePlayIcon className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-300">Google Play</p>
                                                        <p className="text-xs text-gray-500">Android</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 border border-amber-500/20 font-medium">Coming Soon</span>
                                                </div>
                                            </div>

                                            {/* App Store */}
                                            <div
                                                className="relative p-4 rounded-xl border transition-all duration-200 bg-white/[0.02] border-white/[0.06] opacity-60"
                                                onMouseEnter={() => setHoveredPlatform(`${app.id}-ios`)}
                                                onMouseLeave={() => setHoveredPlatform(null)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-white/5">
                                                        <Apple className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-300">App Store</p>
                                                        <p className="text-xs text-gray-500">iOS &amp; iPadOS</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 border border-amber-500/20 font-medium">Coming Soon</span>
                                                </div>
                                            </div>

                                            {/* Microsoft Store */}
                                            <div
                                                className="relative p-4 rounded-xl border transition-all duration-200 bg-white/[0.02] border-white/[0.06] opacity-60"
                                                onMouseEnter={() => setHoveredPlatform(`${app.id}-ms`)}
                                                onMouseLeave={() => setHoveredPlatform(null)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-white/5">
                                                        <WindowsIcon className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-300">Microsoft Store</p>
                                                        <p className="text-xs text-gray-500">Windows</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 border border-amber-500/20 font-medium">Coming Soon</span>
                                                </div>
                                            </div>

                                            {/* macOS Desktop */}
                                            <div
                                                className="relative p-4 rounded-xl border transition-all duration-200 bg-white/[0.02] border-white/[0.06] opacity-60"
                                                onMouseEnter={() => setHoveredPlatform(`${app.id}-mac`)}
                                                onMouseLeave={() => setHoveredPlatform(null)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-white/5">
                                                        <Apple className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-300">macOS Desktop</p>
                                                        <p className="text-xs text-gray-500">.dmg download</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 border border-amber-500/20 font-medium">Coming Soon</span>
                                                </div>
                                            </div>

                                            {/* Windows Desktop */}
                                            <div
                                                className="relative p-4 rounded-xl border transition-all duration-200 bg-white/[0.02] border-white/[0.06] opacity-60"
                                                onMouseEnter={() => setHoveredPlatform(`${app.id}-win`)}
                                                onMouseLeave={() => setHoveredPlatform(null)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-white/5">
                                                        <WindowsIcon className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-300">Windows Desktop</p>
                                                        <p className="text-xs text-gray-500">.exe installer</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 border border-amber-500/20 font-medium">Coming Soon</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* PWA Section */}
                <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-violet-900/20 via-white/[0.02] to-cyan-900/20 border border-violet-500/20">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                                <Globe className="w-7 h-7 text-violet-400" />
                                What is a PWA?
                            </h2>
                            <p className="text-gray-400 mb-4">
                                Progressive Web Apps (PWAs) let you install any Maula AI app directly from your browser — no app store needed.
                                They work offline, receive push notifications, and run in their own window just like native apps.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { icon: Zap, label: 'Instant install' },
                                    { icon: Shield, label: 'Always up to date' },
                                    { icon: Smartphone, label: 'Works on all devices' },
                                    { icon: Download, label: 'No store required' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center gap-2 text-sm text-gray-300">
                                        <item.icon className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPWAGuide(true)}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2 flex-shrink-0"
                        >
                            <Download className="w-5 h-5" />
                            Install Guide
                        </button>
                    </div>
                </div>

                {/* Coming Soon Banner */}
                <div className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-white mb-2">Native Apps Coming Soon</h3>
                        <p className="text-sm text-gray-400 max-w-xl mx-auto mb-4">
                            We&apos;re working on native apps for Google Play, App Store, Microsoft Store, and desktop downloads (macOS &amp; Windows).
                            In the meantime, install any app as a PWA for the best experience.
                        </p>
                        <div className="inline-flex items-center gap-2 text-sm text-violet-400">
                            <Sparkles className="w-4 h-4" />
                            Want to be notified when native apps launch?
                            <Link href="/auth/signup" className="underline hover:text-violet-300 transition-colors">
                                Create an account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* PWA Install Guide Modal */}
            {showPWAGuide && <PWAInstallGuide onClose={() => setShowPWAGuide(false)} />}
        </div>
    );
}
