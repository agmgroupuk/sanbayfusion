'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { gsap, ScrollTrigger, CustomEase, Observer } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, CustomEase, Observer);

const categoryColors: Record<string, { bg: string; text: string; border: string; cardBg: string; cardBorder: string; cardGlow: string }> = {
    'AI Battle': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', cardBg: 'rgba(245,158,11,0.07)', cardBorder: 'rgba(245,158,11,0.18)', cardGlow: 'rgba(245,158,11,0.06)' },
    'Creative': { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/25', cardBg: 'rgba(139,92,246,0.07)', cardBorder: 'rgba(139,92,246,0.18)', cardGlow: 'rgba(139,92,246,0.06)' },
    'Audio': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', cardBg: 'rgba(16,185,129,0.07)', cardBorder: 'rgba(16,185,129,0.18)', cardGlow: 'rgba(16,185,129,0.06)' },
    'Analysis': { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/25', cardBg: 'rgba(244,63,94,0.07)', cardBorder: 'rgba(244,63,94,0.18)', cardGlow: 'rgba(244,63,94,0.06)' },
};

const labApps = [
    { icon: '⚔️', name: 'AI Battle Arena', desc: 'Watch AI models compete head-to-head and vote for the winner', category: 'AI Battle' },
    { icon: '✨', name: 'AI Image Playground', desc: 'Generate stunning images with cutting-edge AI models', category: 'Creative' },
    { icon: '🎙️', name: 'Voice Cloning Studio', desc: 'Clone voices and create custom speech synthesis', category: 'Audio' },
    { icon: '🎵', name: 'AI Music Generator', desc: 'Compose original music from text descriptions', category: 'Audio' },
    { icon: '🎨', name: 'Neural Art Studio', desc: 'Transform photos with AI-powered style transfer', category: 'Creative' },
    { icon: '🌙', name: 'Dream Interpreter', desc: 'Analyze dreams and discover subconscious patterns', category: 'Analysis' },
    { icon: '📖', name: 'Story Weaver', desc: 'Create interactive narratives with AI assistance', category: 'Creative' },
    { icon: '🪞', name: 'Personality Mirror', desc: 'Discover your communication style and traits', category: 'Analysis' },
    { icon: '🔮', name: 'Future Predictor', desc: 'Forecast trends and explore future scenarios', category: 'Analysis' },
    { icon: '❤️', name: 'Emotion Visualizer', desc: 'Analyze emotions and visualize feelings in text', category: 'Analysis' },
    { icon: '💬', name: 'Debate Arena', desc: 'Watch AI agents debate on any topic', category: 'AI Battle' },
];

export default function AILabSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        CustomEase.create('labSpring', 'M0,0 C0.12,0.82 0.23,1.1 0.5,1 0.73,0.92 0.85,1 1,1');
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
                const cards = gridRef.current.querySelectorAll('.lab-card');
                cards.forEach((card, i) => {
                    gsap.fromTo(card,
                        { opacity: 0, y: 50, scale: 0.9, filter: 'blur(4px)' },
                        {
                            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
                            duration: 0.8, delay: i * 0.06, ease: 'labSpring',
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

    return (
        <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden" style={{ perspective: '1200px' }}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-16 overflow-hidden">
                    <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

                    {/* Header */}
                    <div className="text-center mb-14">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 rounded-full px-4 py-2 mb-6 border border-emerald-500/20">
                            <span className="text-emerald-300 text-sm font-medium">🧪 AI Lab</span>
                        </div>
                        <h2
                            ref={titleRef}
                            className="text-4xl md:text-6xl font-black leading-tight mb-4"
                            style={{ opacity: 0 }}
                        >
                            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Experiment in the</span>{' '}
                            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">AI Lab</span>
                        </h2>
                        <p ref={subtitleRef} className="text-gray-400 text-lg max-w-2xl mx-auto" style={{ opacity: 0 }}>
                            11 interactive AI experiments — from image generation and voice cloning to music composition, dream analysis, and AI debates. All live and ready to explore.
                        </p>
                    </div>

                    {/* Apps Grid */}
                    <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ transformStyle: 'preserve-3d' }}>
                        {labApps.map((app, i) => {
                            const catStyle = categoryColors[app.category];
                            return (
                                <div key={i} className="lab-card" style={{ transformStyle: 'preserve-3d' }}>
                                    <div className="relative backdrop-blur-xl rounded-2xl p-5 hover:-translate-y-1 transition-all duration-500 h-full flex flex-col" style={{ background: `linear-gradient(135deg, ${catStyle.cardBg}, rgba(0,0,0,0.28))`, border: `1px solid ${catStyle.cardBorder}`, boxShadow: `0 8px 40px rgba(0,0,0,0.45), 0 0 18px ${catStyle.cardGlow}, inset 0 1px 0 rgba(255,255,255,0.08)` }}>
                                        {/* Top row: Icon + Badges */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
                                                <span className="text-2xl">{app.icon}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg ${catStyle.bg} border ${catStyle.border} ${catStyle.text} text-[10px] font-bold`}>
                                                    {app.category}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    LIVE
                                                </span>
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <h3 className="text-white font-bold text-base mb-1.5">{app.name}</h3>

                                        {/* Description */}
                                        <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">{app.desc}</p>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                                            <span className="text-gray-600 text-xs">0 runs</span>
                                            <ChevronRight className="w-4 h-4 text-gray-600" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* CTA Button */}
                    <div className="text-center mt-12">
                        <Link
                            href="/lab"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl px-8 py-3.5 text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300"
                        >
                            Explore AI Lab
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
                </div>
            </div>
        </section>
    );
}
