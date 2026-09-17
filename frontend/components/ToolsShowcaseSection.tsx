'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { gsap, ScrollTrigger, CustomEase, Observer } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, CustomEase, Observer);

const toolCategories = [
    {
        label: 'Network Tools',
        color: 'cyan',
        tools: [
            { icon: '📍', name: 'IP Information', desc: 'Get detailed information about any IP address including geolocation, ISP, and more.' },
            { icon: '🌐', name: 'DNS Lookup', desc: 'Perform DNS queries and check domain name system records.' },
            { icon: '🔌', name: 'Port Scanner', desc: 'Scan ports on any host to check open ports and services.' },
            { icon: '📡', name: 'Ping Test', desc: 'Test network connectivity and measure latency to any host.' },
            { icon: '🛤️', name: 'Traceroute', desc: 'Trace the path packets take to reach a destination.' },
            { icon: '🔍', name: 'WHOIS Lookup', desc: 'Query WHOIS database for domain registration information.' },
            { icon: '🛡️', name: 'SSL Certificate Checker', desc: 'Check SSL certificate details and validity for any website.' },
            { icon: '📶', name: 'Speed Test', desc: 'Test your internet connection speed and bandwidth.' },
        ],
    },
    {
        label: 'Domain & Security',
        color: 'violet',
        tools: [
            { icon: '⚡', name: 'API Tester', desc: 'Professional API testing tool with presets, authentication, and advanced features.' },
            { icon: '📍', name: 'IP Geolocation API', desc: 'Get detailed location and ISP information for any IP address using WHOIS XML API.' },
            { icon: '📋', name: 'DNS Lookup API', desc: 'Get comprehensive DNS records (A, AAAA, MX, NS, TXT, CNAME, SOA) for any domain.' },
            { icon: '🔎', name: 'Domain Availability', desc: 'Check if your desired domain name is available across popular TLDs.' },
            { icon: '🏷️', name: 'Website Categorization', desc: 'Automatically classify websites into content categories for filtering and analysis.' },
            { icon: '🛡️', name: 'Threat Intelligence', desc: 'Scan domains and IPs for security threats, malware, phishing, and malicious activity.' },
            { icon: '🏅', name: 'Domain Reputation', desc: 'Check domain trustworthiness and security reputation with scoring analysis.' },
            { icon: '🔗', name: 'IP Netblocks Lookup', desc: 'Get IP range and network block information for any IP address.' },
            { icon: '🖥️', name: 'MAC Address Lookup', desc: 'Find manufacturer and vendor information for any MAC address.' },
            { icon: '🔬', name: 'Domain Research Suite', desc: 'Comprehensive domain history, analysis, and research tools.' },
        ],
    },
    {
        label: 'Developer Utilities',
        color: 'emerald',
        tools: [
            { icon: '📝', name: 'JSON Formatter', desc: 'Format, validate, and beautify JSON data with syntax highlighting.' },
            { icon: '🔐', name: 'Base64 Encoder/Decoder', desc: 'Encode and decode Base64 strings easily.' },
            { icon: '#️⃣', name: 'Hash Generator', desc: 'Generate MD5, SHA-1, SHA-256, and other hash values.' },
            { icon: '🆔', name: 'UUID Generator', desc: 'Generate unique identifiers (UUID/GUID) in various formats.' },
            { icon: '🎨', name: 'Color Picker', desc: 'Pick colors and convert between HEX, RGB, HSL formats.' },
            { icon: '🕐', name: 'Timestamp Converter', desc: 'Convert between Unix timestamps and human-readable dates.' },
            { icon: '💻', name: 'Regex Tester', desc: 'Test and debug regular expressions with live matching.' },
            { icon: '🔗', name: 'URL Parser', desc: 'Parse and decode URLs to extract components.' },
        ],
    },
];

export default function ToolsShowcaseSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        CustomEase.create('cardSpring', 'M0,0 C0.12,0.82 0.23,1.1 0.5,1 0.73,0.92 0.85,1 1,1');
        const ctx = gsap.context(() => {
            // ─── TITLE ───
            if (titleRef.current) {
                gsap.fromTo(titleRef.current,
                    { opacity: 0, y: 60, filter: 'blur(20px)' },
                    {
                        opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out',
                        scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
                    }
                );
            }

            // ─── SUBTITLE ───
            if (subtitleRef.current) {
                gsap.fromTo(subtitleRef.current,
                    { opacity: 0, y: 30, filter: 'blur(10px)' },
                    {
                        opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.15,
                        scrollTrigger: { trigger: subtitleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
                    }
                );
            }

            // ─── CARDS ───
            if (gridRef.current) {
                const cards = gridRef.current.querySelectorAll('.tool-card');
                cards.forEach((card, i) => {
                    gsap.fromTo(card,
                        { opacity: 0, y: 50, scale: 0.9, filter: 'blur(4px)' },
                        {
                            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
                            duration: 0.8, delay: i * 0.04, ease: 'cardSpring',
                            scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none reverse' }
                        }
                    );

                    // 3D tilt on hover
                    const el = card as HTMLElement;
                    Observer.create({
                        target: el,
                        type: 'pointer',
                        onMove: (self) => {
                            const rect = el.getBoundingClientRect();
                            const x = ((self.x || 0) - rect.left) / rect.width - 0.5;
                            const y = ((self.y || 0) - rect.top) / rect.height - 0.5;
                            gsap.to(el, { rotateY: x * 12, rotateX: -y * 8, z: 10, duration: 0.3, ease: 'power2.out' });
                        },
                    });
                    el.addEventListener('mouseleave', () => {
                        gsap.to(el, { rotateY: 0, rotateX: 0, z: 0, duration: 0.6, ease: 'elastic.out(1,0.5)' });
                    });
                });
            }
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    const colorMap: Record<string, { icon: string; border: string; hoverBorder: string; badge: string; badgeBorder: string; badgeText: string; glow: string; cardBg: string; cardBorder: string; cardShadow: string }> = {
        cyan: {
            icon: 'from-cyan-500/30 to-blue-500/30',
            border: 'border-cyan-400/30',
            hoverBorder: 'hover:border-cyan-500/40',
            badge: 'bg-cyan-500/10',
            badgeBorder: 'border-cyan-500/20',
            badgeText: 'text-cyan-300',
            glow: 'shadow-[0_4px_20px_rgba(6,182,212,0.15)]',
            cardBg: 'rgba(6,182,212,0.06)',
            cardBorder: 'rgba(6,182,212,0.18)',
            cardShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 18px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
        },
        violet: {
            icon: 'from-violet-500/30 to-fuchsia-500/30',
            border: 'border-violet-400/30',
            hoverBorder: 'hover:border-violet-500/40',
            badge: 'bg-violet-500/10',
            badgeBorder: 'border-violet-500/20',
            badgeText: 'text-violet-300',
            glow: 'shadow-[0_4px_20px_rgba(139,92,246,0.15)]',
            cardBg: 'rgba(139,92,246,0.06)',
            cardBorder: 'rgba(139,92,246,0.18)',
            cardShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 18px rgba(139,92,246,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
        },
        emerald: {
            icon: 'from-emerald-500/30 to-teal-500/30',
            border: 'border-emerald-400/30',
            hoverBorder: 'hover:border-emerald-500/40',
            badge: 'bg-emerald-500/10',
            badgeBorder: 'border-emerald-500/20',
            badgeText: 'text-emerald-300',
            glow: 'shadow-[0_4px_20px_rgba(16,185,129,0.15)]',
            cardBg: 'rgba(16,185,129,0.06)',
            cardBorder: 'rgba(16,185,129,0.18)',
            cardShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 18px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
        },
    };

    return (
        <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden" style={{ perspective: '1200px' }}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-16 overflow-hidden">
                    <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

                    {/* Header */}
                    <div className="text-center mb-14">
                        <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
                            <span className="text-cyan-300 text-sm font-medium">🛠️ Developer Tools</span>
                        </div>
                        <h2
                            ref={titleRef}
                            className="text-4xl md:text-6xl font-black leading-tight mb-4"
                            style={{ opacity: 0 }}
                        >
                            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Powerful</span>{' '}
                            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">Tools</span>
                        </h2>
                        <p ref={subtitleRef} className="text-gray-400 text-lg max-w-2xl mx-auto" style={{ opacity: 0 }}>
                            26+ free developer and network tools — from DNS lookups and port scanning to JSON formatting and hash generation. All in one place.
                        </p>
                    </div>

                    {/* Tool Categories */}
                    <div ref={gridRef} className="space-y-10" style={{ transformStyle: 'preserve-3d' }}>
                        {toolCategories.map((cat, ci) => {
                            const c = colorMap[cat.color];
                            return (
                                <div key={ci}>
                                    {/* Category Label */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg ${c.badge} border ${c.badgeBorder} ${c.badgeText} text-xs font-bold uppercase tracking-wider`}>
                                            {cat.label}
                                        </span>
                                        <div className="flex-1 h-px bg-white/[0.06]" />
                                    </div>

                                    {/* Tools Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {cat.tools.map((tool, ti) => (
                                            <div key={ti} className="tool-card" style={{ transformStyle: 'preserve-3d' }}>
                                                <div className={`relative backdrop-blur-xl rounded-2xl p-5 ${c.hoverBorder} transition-all duration-500 hover:-translate-y-1 h-full flex flex-col`} style={{ background: `linear-gradient(135deg, ${c.cardBg}, rgba(0,0,0,0.25))`, border: `1px solid ${c.cardBorder}`, boxShadow: c.cardShadow }}>
                                                    {/* Icon */}
                                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.icon} flex items-center justify-center border ${c.border} ${c.glow} mb-3`}>
                                                        <span className="text-lg">{tool.icon}</span>
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="text-white font-bold text-sm mb-1.5">{tool.name}</h3>

                                                    {/* Description */}
                                                    <p className="text-gray-500 text-xs leading-relaxed mb-4 flex-1">{tool.desc}</p>

                                                    {/* Open Link */}
                                                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                                                        <span className={`${c.badgeText} text-xs font-semibold uppercase tracking-wider`}>Open</span>
                                                        <ChevronRight className={`w-4 h-4 ${c.badgeText} opacity-60`} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* CTA Button */}
                    <div className="text-center mt-12">
                        <Link
                            href="/tools"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-8 py-3.5 text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5 transition-all duration-300"
                        >
                            Explore All 26+ Tools
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                </div>
            </div>
        </section>
    );
}
