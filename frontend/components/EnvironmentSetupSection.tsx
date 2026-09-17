'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, ScrambleTextPlugin, Observer, CustomEase } from '@/lib/gsap';

/* ─── DATA ─── */
const platformModules = [
  { id: '01', icon: '🎯', label: 'WORKSPACE', desc: 'AI-powered creative workspace' },
  { id: '02', icon: '🤖', label: 'AI_ASSISTANT', desc: 'Neural chat interface' },
  { id: '03', icon: '📜', label: 'HISTORY', desc: 'Session vault & logs' },
  { id: '04', icon: '📁', label: 'FILES', desc: 'Project file manager' },
  { id: '05', icon: '⚡', label: 'TOOLS', desc: 'Developer toolchain' },
  { id: '06', icon: '⚙️', label: 'SETTINGS', desc: 'Neural configuration' },
  { id: '07', icon: '📋', label: 'TEMPLATES', desc: 'Pre-built starter kits' },
  { id: '08', icon: '🏠', label: 'MAIN_APP', desc: 'Return to dashboard' },
];

const engineStats = [
  { label: 'STATUS', value: 'ACTIVE', color: 'text-emerald-400' },
  { label: 'CONTEXT', value: '8.0k PKTS', color: 'text-cyan-300' },
  { label: 'VOLATILITY', value: '0.7', color: 'text-amber-400' },
  { label: 'MODE', value: 'CHAT', color: 'text-cyan-300' },
];

const liveMetrics = [
  { label: 'MESSAGES SENT', value: '247', sub: '12 agent replies', icon: '💬' },
  { label: 'WORDS GENERATED', value: '8.4k', sub: '~34 avg/reply', icon: '📝' },
  { label: 'AVG LATENCY', value: '24', unit: 'MS', sub: 'Target: <300ms', icon: '⏱️' },
  { label: 'SESSION TIME', value: '18m', sub: '3 sessions', icon: '🕐' },
];

const quickActions = [
  { emoji: '🚀', label: 'Landing page', color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30' },
  { emoji: '📊', label: 'Dashboard', color: 'from-blue-500/20 to-blue-500/5 border-blue-500/30' },
  { emoji: '🎨', label: 'Portfolio', color: 'from-purple-500/20 to-purple-500/5 border-purple-500/30' },
];

export default function EnvironmentSetupSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const modulesRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const novaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('panelPop', 'M0,0 C0.126,0.382 0.282,0.674 0.44,0.822 0.632,1.002 0.818,1.001 1,1');
    const ctx = gsap.context(() => {
      /* Title – whole-element entrance (no SplitText to preserve gradient) */
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 50, scale: 0.92, filter: 'blur(10px)' },
          {
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      /* Chat panel – cinematic 3D entrance */
      if (chatPanelRef.current) {
        gsap.fromTo(chatPanelRef.current,
          { opacity: 0, y: 60, rotateX: 15, scale: 0.9, filter: 'blur(6px)', transformOrigin: 'center bottom' },
          {
            opacity: 1, y: 0, rotateX: 0, scale: 1, filter: 'blur(0px)', duration: 1.1, ease: 'panelPop',
            scrollTrigger: { trigger: chatPanelRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
        /* Tilt on hover */
        Observer.create({
          target: chatPanelRef.current, type: 'pointer',
          onMove: (self) => {
            const rect = chatPanelRef.current!.getBoundingClientRect();
            const x = ((self.x || 0) - rect.left) / rect.width - 0.5;
            const y = ((self.y || 0) - rect.top) / rect.height - 0.5;
            gsap.to(chatPanelRef.current!, { rotateY: x * 8, rotateX: -y * 5, duration: 0.4, ease: 'power2.out', transformPerspective: 900 });
          },
        });
        chatPanelRef.current.addEventListener('mouseleave', () => {
          gsap.to(chatPanelRef.current!, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'elastic.out(1,0.5)' });
        });
      }

      /* Nova panel */
      if (novaRef.current) {
        gsap.fromTo(novaRef.current,
          { opacity: 0, y: 60, scale: 0.9, filter: 'blur(6px)' },
          {
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1, ease: 'panelPop',
            scrollTrigger: { trigger: novaRef.current, start: 'top 88%', toggleActions: 'play none none reverse' }
          }
        );
      }

      /* Module cards – staggered burst */
      if (modulesRef.current) {
        const cards = modulesRef.current.querySelectorAll('.mod-card');
        gsap.fromTo(cards,
          { opacity: 0, scale: 0.4, y: 40, filter: 'blur(6px)' },
          {
            opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.06, ease: 'elastic.out(1,0.65)',
            scrollTrigger: { trigger: modulesRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      /* Metric cards */
      if (metricsRef.current) {
        const cards = metricsRef.current.querySelectorAll('.metric-card');
        gsap.fromTo(cards,
          { opacity: 0, y: 30, scale: 0.9 },
          {
            opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out',
            scrollTrigger: { trigger: metricsRef.current, start: 'top 88%', toggleActions: 'play none none reverse' }
          }
        );
      }

      /* Blinking cursors & pulses */
      gsap.to('.cursor-blink-env', { opacity: 0, repeat: -1, yoyo: true, duration: 0.5, ease: 'steps(1)' });
      gsap.to('.live-pulse', { scale: 1.6, opacity: 0, repeat: -1, duration: 1.5, ease: 'power2.out' });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ─── HEADER ─── */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-5 py-2 mb-6 border border-cyan-500/20">
            <span className="relative flex h-2 w-2">
              <span className="live-pulse absolute inset-0 rounded-full bg-emerald-400"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-cyan-300 text-sm font-mono tracking-wider">NEURAL_INTERFACE // ONLINE</span>
          </div>
          <h2 ref={titleRef} className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-400 bg-clip-text text-transparent leading-tight mb-4">
            AI Digital Friend Zone
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto font-light">
            Meet your AI studio assistants. Chat, build, and deploy — all from one neural interface.
          </p>
        </div>

        {/* ─── TOP ROW: Chat Interface + Engine State ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Chat Panel (3/5) */}
          <div ref={chatPanelRef} className="lg:col-span-3 relative rounded-2xl border border-cyan-500/[0.15] backdrop-blur-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5),0_0_30px_rgba(6,182,212,0.06)]" style={{ perspective: '1000px', background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(59,130,246,0.03), rgba(0,0,0,0.3))' }}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs text-gray-500 font-mono">≡</span>
                <span className="text-xs text-gray-500 font-mono">🗑️</span>
                <span className="text-xs text-gray-500 font-mono">↗</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">&lt;/&gt;</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">🔒</span>
              </div>
            </div>
            {/* Messages count */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-white/[0.04]">
              <span className="text-xs text-gray-500 font-mono">📁 1 message</span>
              <span className="text-xs text-gray-500">🔍</span>
            </div>
            {/* Chat body */}
            <div className="p-6 min-h-[200px]">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">AI STUDIO ASSISTANT:</span>
                  <span className="text-xs text-gray-600 font-mono">[9:51:49 PM]</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed pl-1">
                  Hello! I&apos;m ready to help you. Feel free to ask me anything, upload images, or request me to generate images for you.
                </p>
                <div className="flex items-center gap-3 mt-3 pl-1">
                  {['👍', '👎', '📋', '🔄', '↗️', '🔊'].map((e, i) => (
                    <span key={i} className="text-gray-600 text-xs cursor-pointer hover:text-gray-300 transition-colors">{e}</span>
                  ))}
                </div>
              </div>
            </div>
            {/* Bottom bar */}
            <div className="border-t border-white/[0.06]">
              <div className="flex items-center gap-4 px-5 py-2 text-xs text-gray-500 font-mono">
                <span>📄 Export</span>
                <span>⌨️ Shortcuts</span>
                <span>✨ Templates</span>
                <span className="ml-auto">29 tokens</span>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 border-t border-white/[0.04]">
                <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/10">💬 Chat ▾</span>
                <div className="flex-1 relative">
                  <div className="flex items-center bg-white/[0.03] rounded-lg border border-white/[0.08] px-4 py-2.5">
                    <span className="text-gray-500 text-sm font-mono">Type a message... (Ctrl+Enter to send)</span>
                    <span className="ml-auto text-cyan-400 cursor-blink-env">▸</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {['📎', '🎙️', '📡', '📞'].map((e, i) => (
                    <span key={i} className="text-gray-500 text-sm cursor-pointer hover:text-cyan-300 transition-colors">{e}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Engine State (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Neural Config Panel */}
            <div className="rounded-2xl border border-cyan-500/[0.14] backdrop-blur-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.06),inset_0_1px_0_rgba(255,255,255,0.08)]" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.04), rgba(0,0,0,0.28))' }}>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-cyan-400">⚙️</span>
                <span className="text-cyan-300 font-mono font-bold text-sm tracking-wider">NEURAL_CONFIG</span>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-emerald-400 text-sm">🔋</span>
                  <span className="text-emerald-400 font-mono text-xs font-bold tracking-wider">ENGINE STATE</span>
                </div>
                <div className="space-y-2">
                  {engineStats.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-gray-500 font-mono text-xs">{s.label}:</span>
                      <span className={`font-mono text-xs font-bold ${s.color}`}>
                        {s.label === 'STATUS' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>}
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs font-mono">
                <span className="text-red-400 font-bold tracking-wider">SYSTEM DIRECTIVE</span>
                <span className="text-gray-600 ml-2">EDITABLE</span>
                <div className="mt-2 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gray-600 to-gray-500 rounded-full" style={{ width: '70%' }}></div>
                </div>
              </div>
            </div>

            {/* MAULA_AI Status Badge */}
            <div className="rounded-2xl border border-emerald-500/[0.16] backdrop-blur-2xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.07),inset_0_1px_0_rgba(255,255,255,0.08)]" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.04), rgba(0,0,0,0.28))' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-emerald-400 font-mono font-bold text-sm tracking-wider">MAULA_AI</h4>
                  <p className="text-xs font-mono mt-1">
                    <span className="text-gray-500">STATUS: </span>
                    <span className="text-emerald-400 font-bold">ONLINE</span>
                    <span className="text-gray-600 mx-1">|</span>
                    <span className="text-gray-500">LATENCY: </span>
                    <span className="text-amber-400 font-bold">24MS</span>
                  </p>
                </div>
                <span className="text-2xl">🤖</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-amber-900/30 to-amber-800/10 border border-amber-500/20 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <span className="text-white font-bold text-sm">AI Studio Assistant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="live-pulse absolute inset-0 rounded-full bg-emerald-400"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="text-emerald-400 font-mono text-xs font-bold">LIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── METRICS ROW ─── */}
        <div ref={metricsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {liveMetrics.map((m, i) => (
            <div key={i} className="metric-card rounded-xl border border-cyan-500/[0.12] backdrop-blur-2xl p-5 text-center group hover:border-cyan-500/30 transition-all duration-300" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(59,130,246,0.03), rgba(0,0,0,0.25))', boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-gray-500 tracking-wider">{m.label}</span>
                <span className="text-sm">{m.icon}</span>
              </div>
              {/* Ring gauge */}
              <div className="relative w-20 h-20 mx-auto mb-3">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                  <circle cx="40" cy="40" r="32" fill="none"
                    stroke={i === 0 ? '#94a3b8' : i === 1 ? '#22d3ee' : i === 2 ? '#facc15' : '#64748b'}
                    strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(i === 0 ? 0.65 : i === 1 ? 0.85 : i === 2 ? 0.15 : 0.3) * 201} 201`}
                  />
                  {/* Dot indicator */}
                  <circle cx="40" cy="8" r="2.5" fill={i === 0 ? '#94a3b8' : i === 1 ? '#22d3ee' : i === 2 ? '#facc15' : '#64748b'} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-emerald-400 font-mono">{m.value}</span>
                  {m.unit && <span className="text-[10px] text-gray-500 font-mono">{m.unit}</span>}
                </div>
              </div>
              <p className="text-[11px] text-gray-500">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ─── BOTTOM ROW: Canvas Navigator + Nova Assistant ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
          {/* Canvas Navigator (3/5) */}
          <div ref={modulesRef} className="lg:col-span-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎨</span>
                <div>
                  <h3 className="text-cyan-300 font-mono font-bold text-lg tracking-wider">CANVAS_NAVIGATOR</h3>
                  <p className="text-xs font-mono mt-0.5">
                    <span className="text-gray-500">BUILD STATUS: </span>
                    <span className="text-emerald-400 font-bold">READY</span>
                    <span className="text-gray-600 mx-1">|</span>
                    <span className="text-gray-500">MODE: </span>
                    <span className="text-amber-400 font-bold">CREATIVE</span>
                  </p>
                </div>
              </div>
            </div>
            {/* Module Grid */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {platformModules.map((m) => (
                <div key={m.id} className="mod-card group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-cyan-500/25 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-gray-500 tracking-wider">MODULE_{m.id}</span>
                    <span className="text-gray-600 text-xs group-hover:text-cyan-400 transition-colors">›</span>
                  </div>
                  <span className="text-2xl block mb-2">{m.icon}</span>
                  <p className="text-[10px] font-mono text-gray-400 tracking-wider truncate">{m.label}</p>
                </div>
              ))}
            </div>
            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06] bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] font-mono text-emerald-400 tracking-wider">NEURAL_CANVAS_ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Nova AI Assistant (2/5) */}
          <div ref={novaRef} className="lg:col-span-2 space-y-6">
            {/* Nova Panel */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.3)] h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyan-300 font-mono font-bold text-xs tracking-wider">AI ASSISTANT</span>
                <span className="text-gray-600 cursor-pointer hover:text-gray-300 transition-colors">✕</span>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <button className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/10 flex items-center gap-1.5">
                  🕐 HISTORY
                </button>
                <button className="text-xs font-mono px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                  + NEW CHAT
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {/* Nova Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <span className="text-3xl">⚡</span>
                </div>
                <h4 className="text-emerald-300 font-bold text-lg mb-1">Hey! I&apos;m Nova 👋</h4>
                <p className="text-gray-400 text-sm mb-5 max-w-[220px]">Your web dev partner. Tell me what you want to build, or just say hi!</p>
                {/* Quick actions */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {quickActions.map((a, i) => (
                    <span key={i} className={`text-xs px-3 py-1.5 rounded-full bg-gradient-to-r ${a.color} border font-medium cursor-pointer hover:brightness-125 transition-all`}>
                      {a.emoji} {a.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.06]">
                <span className="text-gray-500 text-sm">🎙️</span>
                <span className="text-gray-500 text-sm">📎</span>
                <div className="flex-1 bg-white/[0.03] rounded-lg border border-white/[0.08] px-3 py-2">
                  <span className="text-gray-500 text-xs font-mono">Enter modificati...</span>
                </div>
                <span className="text-xl text-amber-400">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CTA BUTTONS ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://sanbayfusion.com/agents"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl px-8 py-4 text-sm font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/50 hover:-translate-y-1 transition-all duration-300 group"
          >
            🤖 Meet AI Agents
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </a>
          <a
            href="https://demo.sanbayfusion.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white/[0.04] border border-white/[0.12] text-white rounded-xl px-8 py-4 text-sm font-bold backdrop-blur-xl hover:bg-white/[0.08] hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300 group"
          >
            🎨 Open Canvas Studio
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </a>
        </div>

      </div>
    </section>
  );
}
