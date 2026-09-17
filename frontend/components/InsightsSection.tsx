'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, DrawSVGPlugin, CustomEase, Observer, Flip, Draggable } from '@/lib/gsap';

/* ── Status Card Data (mirroring real /status page) ── */
const statusCards = [
  { icon: '🖥️', name: 'Platform', stat: '99.90%', label: 'Uptime', color: '#22d3ee' },
  { icon: '⚡', name: 'API', stat: '28ms', label: 'Avg Response Time', color: '#f59e0b' },
  { icon: '🗄️', name: 'PostgreSQL', stat: '3ms', label: 'Response Time', color: '#10b981' },
  { icon: '📡', name: 'Cache (redis)', stat: '1ms', label: 'Connected', color: '#ef4444' },
  { icon: '👥', name: 'Active Users', stat: '1', label: 'Across All Agents', color: '#a78bfa' },
];

const liveMetrics = [
  { label: 'Requests / min', value: '42', color: '#22d3ee' },
  { label: 'Error rate', value: '0.0%', color: '#22c55e' },
  { label: 'Requests today', value: '1,847', color: '#ffffff' },
  { label: 'Errors today', value: '0', color: '#22c55e' },
];

const topAgents = [
  { name: 'Knight Logic', count: 7, color: 'from-cyan-400 to-blue-500' },
  { name: 'Einstein', count: 6, color: 'from-cyan-400 to-purple-500' },
  { name: 'Canvas Studio', count: 4, color: 'from-blue-400 to-purple-500' },
  { name: 'Comedy King', count: 4, color: 'from-purple-400 to-pink-500' },
  { name: 'Bishop Burger', count: 3, color: 'from-cyan-400 to-emerald-400' },
];

const realtimeAnalytics = [
  { icon: '📈', title: 'Sessions Today', value: '30', desc: 'User sessions started today', color: '#22d3ee' },
  { icon: '📊', title: 'Page Views Today', value: '10', desc: 'Pages viewed today', color: '#10b981' },
  { icon: '👥', title: 'Active Right Now', value: '1', desc: 'Users active in last 15 min', color: '#a78bfa' },
];

/* ── 7-Day Uptime Bar Heights (visual %) ── */
const uptimeBars = [92, 88, 95, 90, 96, 85, 93];
const requestBars = [55, 35, 42, 68, 50, 78, 30];
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function InsightsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const statusGridRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    gsap.registerPlugin(DrawSVGPlugin, Observer, Flip, Draggable);
    CustomEase.create('statusReveal', 'M0,0 C0.084,0.61 0.214,0.802 0.318,0.886 0.46,1.002 0.639,1.006 1,1');

    const ctx = gsap.context(() => {
      /* ── TITLE: whole-element entrance (preserves gradient) ── */
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0, y: 50, scale: 0.92, filter: 'blur(10px)' },
          {
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
            duration: 1.2, ease: 'power3.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 90%', toggleActions: 'play none none reverse' },
          }
        );
      }

      /* ── DESCRIPTION ── */
      if (descRef.current) {
        gsap.fromTo(
          descRef.current,
          { opacity: 0, y: 20, filter: 'blur(6px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: 1.0, ease: 'power2.out',
            scrollTrigger: { trigger: descRef.current, start: 'top 88%', toggleActions: 'play none none reverse' },
          }
        );
      }

      /* ── STATUS CARDS: stagger in ── */
      if (statusGridRef.current) {
        const cards = statusGridRef.current.querySelectorAll('.status-card');
        cards.forEach((card, i) => {
          gsap.fromTo(card,
            { opacity: 0, y: 40, scale: 0.85, filter: 'blur(4px)' },
            {
              opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
              duration: 0.8, delay: i * 0.08, ease: 'back.out(1.4)',
              scrollTrigger: { trigger: statusGridRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
            }
          );
          card.addEventListener('mouseenter', () => gsap.to(card, { y: -6, scale: 1.03, duration: 0.3, ease: 'power2.out' }));
          card.addEventListener('mouseleave', () => gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1,0.4)' }));
        });
      }

      /* ── LIVE METRICS: slide in ── */
      if (metricsRef.current) {
        const items = metricsRef.current.querySelectorAll('.metric-item');
        items.forEach((item, i) => {
          gsap.fromTo(item,
            { opacity: 0, x: -30 },
            {
              opacity: 1, x: 0,
              duration: 0.6, delay: i * 0.06, ease: 'power2.out',
              scrollTrigger: { trigger: metricsRef.current, start: 'top 88%', toggleActions: 'play none none reverse' },
            }
          );
        });
      }

      /* ── CHARTS: bars grow up ── */
      if (chartsRef.current) {
        const bars = chartsRef.current.querySelectorAll('.chart-bar');
        bars.forEach((bar, i) => {
          gsap.fromTo(bar,
            { scaleY: 0 },
            {
              scaleY: 1,
              duration: 0.8, delay: i * 0.06, ease: 'elastic.out(1, 0.6)',
              scrollTrigger: { trigger: chartsRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
            }
          );
        });

        // Panel entrance
        const panels = chartsRef.current.querySelectorAll('.chart-panel');
        panels.forEach((panel, i) => {
          gsap.fromTo(panel,
            { opacity: 0, y: 50, scale: 0.9 },
            {
              opacity: 1, y: 0, scale: 1,
              duration: 0.8, delay: i * 0.12, ease: 'power3.out',
              scrollTrigger: { trigger: chartsRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
            }
          );
        });
      }

      /* ── CTA ── */
      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current,
          { opacity: 0, y: 30, scale: 0.9 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: ctaRef.current, start: 'top 92%', toggleActions: 'play none none reverse' },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 md:py-48 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-gradient-radial from-emerald-600/[0.06] to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-radial from-cyan-600/[0.06] to-transparent rounded-full blur-3xl -z-10" />

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
            <span className="text-sm font-medium tracking-wide" style={{ color: 'rgba(16,185,129,0.9)' }}>All Systems Operational</span>
          </div>
          <h2
            ref={titleRef}
            className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            style={{
              opacity: 0,
              background: 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(167,243,208,0.9), rgba(16,185,129,0.6))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.15))',
            }}
          >
            {'Live Platform Status'}
          </h2>
          <p ref={descRef} className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(167,243,208,0.5)', opacity: 0 }}>
            Real-time monitoring across all services. 99.9% uptime SLA with instant incident detection and automated recovery.
          </p>
        </div>

        {/* ── Status Cards Row ── */}
        <div ref={statusGridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {statusCards.map((s, i) => (
            <div key={i} className="status-card rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05), rgba(0,0,0,0.2))', border: '1px solid rgba(16,185,129,0.18)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 16px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{s.icon}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Operational
                </span>
              </div>
              <div className="text-white/80 text-xs font-medium mb-1">{s.name}</div>
              <div className="text-2xl font-bold mb-0.5" style={{ color: s.color }}>{s.stat}</div>
              <div className="text-gray-500 text-[11px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Live Metrics Strip ── */}
        <div ref={metricsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {liveMetrics.map((m, i) => (
            <div key={i} className="metric-item rounded-xl px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(0,0,0,0.2))', border: '1px solid rgba(6,182,212,0.16)', boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
              <div className="text-gray-500 text-xs mb-1">{m.label}</div>
              <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* ── Charts: 7-Day Uptime + API Requests ── */}
        <div ref={chartsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Uptime Chart */}
          <div className="chart-panel rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.04), rgba(0,0,0,0.25))', border: '1px solid rgba(6,182,212,0.16)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 20px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <h3 className="text-white font-semibold text-lg mb-4">7-Day Uptime</h3>
            <div className="relative" style={{ height: '160px' }}>
              <div className="absolute inset-0 flex items-end justify-between gap-3 pb-6">
                {uptimeBars.map((pct, i) => (
                  <div key={i} className="flex-1 relative" style={{ height: '100%' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-lg chart-bar"
                      style={{
                        height: `${pct}%`,
                        background: 'linear-gradient(to top, #06b6d4, #22d3ee)',
                        transformOrigin: 'bottom',
                        boxShadow: '0 0 16px rgba(6,182,212,0.35)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                {days.map((d) => <span key={d} className="text-[10px] text-gray-500 flex-1 text-center">{d}</span>)}
              </div>
            </div>
            <div className="text-center mt-3 text-xs text-gray-500">Average: <span className="text-cyan-300 font-medium">99.77%</span></div>
          </div>

          {/* API Requests Chart */}
          <div className="chart-panel rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.04), rgba(0,0,0,0.25))', border: '1px solid rgba(16,185,129,0.16)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <h3 className="text-white font-semibold text-lg mb-4">API Requests (7 Days)</h3>
            <div className="relative" style={{ height: '160px' }}>
              <div className="absolute inset-0 flex items-end justify-between gap-3 pb-6">
                {requestBars.map((pct, i) => (
                  <div key={i} className="flex-1 relative" style={{ height: '100%' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-lg chart-bar"
                      style={{
                        height: `${pct}%`,
                        background: 'linear-gradient(to top, #10b981, #34d399)',
                        transformOrigin: 'bottom',
                        boxShadow: '0 0 16px rgba(16,185,129,0.35)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                {days.map((d) => <span key={d} className="text-[10px] text-gray-500 flex-1 text-center">{d}</span>)}
              </div>
            </div>
            <div className="text-center mt-3 text-xs text-gray-500">Total Today: <span className="text-emerald-300 font-medium">1,847 requests</span></div>
          </div>
        </div>

        {/* ── Top Agents + Requests vs Errors ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top Agents by Active Users */}
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.04), rgba(0,0,0,0.25))', border: '1px solid rgba(6,182,212,0.16)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 20px rgba(6,182,212,0.05), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <h3 className="text-white font-semibold text-lg mb-5">Top Agents by Active Users</h3>
            <div className="space-y-4">
              {topAgents.map((a, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-gray-300 text-sm">{a.name}</span>
                    <span className="text-cyan-300 text-sm font-semibold">{a.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${a.color} chart-bar`}
                      style={{ width: `${(a.count / 7) * 100}%`, transformOrigin: 'left', boxShadow: '0 0 8px rgba(6,182,212,0.3)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Requests vs Errors Donut */}
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(6,182,212,0.04), rgba(0,0,0,0.25))', border: '1px solid rgba(16,185,129,0.15)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.05), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <h3 className="text-white font-semibold text-lg mb-2">Requests vs Errors (Today)</h3>
            <p className="text-gray-500 text-xs mb-4">0 errors of 1,847 requests</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: '#22d3ee' }} />
                  <span className="text-gray-400 text-sm">Requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                  <span className="text-gray-400 text-sm">Errors</span>
                </div>
              </div>
              {/* Donut chart */}
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                  <circle cx="18" cy="18" r="13" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                  <circle cx="18" cy="18" r="13" fill="none" stroke="#22d3ee" strokeWidth="5" strokeDasharray="81.68" strokeDashoffset="0" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.5))' }} />
                  <circle cx="31" cy="18" r="1.5" fill="#ef4444" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.8))' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">0.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Requests / Minute + Error Rate (SVG line charts) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Requests / Minute */}
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.04), rgba(0,0,0,0.25))', border: '1px solid rgba(6,182,212,0.16)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 20px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <h3 className="text-white font-semibold text-lg mb-1">Requests / Minute</h3>
            <p className="text-gray-600 text-xs mb-4">Live last ~10 minutes</p>
            <svg viewBox="0 0 400 100" className="w-full h-24">
              <defs>
                <linearGradient id="reqGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((y) => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.03)" />)}
              <path d="M0,80 C20,75 40,60 60,65 C80,70 100,45 140,50 C180,55 200,30 240,35 C280,40 300,20 340,25 C360,28 380,15 400,18" fill="url(#reqGrad)" stroke="none" />
              <path d="M0,80 C20,75 40,60 60,65 C80,70 100,45 140,50 C180,55 200,30 240,35 C280,40 300,20 340,25 C360,28 380,15 400,18" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.6))' }} />
              {[[0, 80], [140, 50], [240, 35], [400, 18]].map(([cx, cy], j) => <circle key={j} cx={cx} cy={cy} r="3" fill="#22d3ee" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.8))' }} />)}
            </svg>
          </div>

          {/* Error Rate */}
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.04), rgba(0,0,0,0.25))', border: '1px solid rgba(16,185,129,0.15)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.05), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <h3 className="text-white font-semibold text-lg mb-1">Error Rate</h3>
            <p className="text-gray-600 text-xs mb-4">Live last ~10 minutes</p>
            <svg viewBox="0 0 400 100" className="w-full h-24">
              <defs>
                <linearGradient id="errGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((y) => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.03)" />)}
              <path d="M0,95 C50,94 100,95 150,94 C200,95 250,94 300,95 C350,94 380,95 400,95" fill="url(#errGrad)" stroke="none" />
              <path d="M0,95 C50,94 100,95 150,94 C200,95 250,94 300,95 C350,94 380,95 400,95" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.6))' }} />
            </svg>
          </div>
        </div>

        {/* ── Real-time Analytics Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {realtimeAnalytics.map((r, i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(16,185,129,0.05), rgba(0,0,0,0.2))', border: '1px solid rgba(6,182,212,0.16)', backdropFilter: 'blur(24px)', boxShadow: '0 6px 32px rgba(0,0,0,0.4), 0 0 16px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{r.icon}</span>
                <span className="font-semibold text-sm" style={{ color: r.color }}>{r.title}</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1" style={{ color: r.color }}>{r.value}</div>
              <div className="text-gray-500 text-xs">{r.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Server Health Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {/* CPU */}
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.04), rgba(0,0,0,0.2))', border: '1px solid rgba(245,158,11,0.18)', backdropFilter: 'blur(24px)', boxShadow: '0 6px 32px rgba(0,0,0,0.4), 0 0 16px rgba(245,158,11,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <div className="text-white font-semibold text-sm mb-3">CPU Usage</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-xs">2 cores &middot; Load: 0.08</div>
              </div>
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="87.96" strokeDashoffset={87.96 * (1 - 0.04)} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">4%</div>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.04), rgba(0,0,0,0.2))', border: '1px solid rgba(16,185,129,0.18)', backdropFilter: 'blur(24px)', boxShadow: '0 6px 32px rgba(0,0,0,0.4), 0 0 16px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <div className="text-white font-semibold text-sm mb-3">Memory Usage</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-xs">0.9 GB / 7.6 GB</div>
              </div>
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="87.96" strokeDashoffset={87.96 * (1 - 0.12)} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">12%</div>
              </div>
            </div>
          </div>

          {/* Server Uptime */}
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.09), rgba(59,130,246,0.05), rgba(0,0,0,0.2))', border: '1px solid rgba(6,182,212,0.18)', backdropFilter: 'blur(24px)', boxShadow: '0 6px 32px rgba(0,0,0,0.4), 0 0 16px rgba(6,182,212,0.07), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🕐</span>
              <span className="text-white font-semibold text-sm">Server Uptime</span>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: '#22d3ee' }}>22h 11m</div>
            <div className="text-gray-500 text-xs">production &middot; v2.0.0</div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div ref={ctaRef} className="text-center">
          <a
            href="https://maula.ai/status"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 group"
            style={{
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              boxShadow: '0 0 30px rgba(16,185,129,0.25), 0 8px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              textShadow: '0 0 10px rgba(255,255,255,0.3)',
            }}
          >
            View Live Status
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      </div>
    </section>
  );
}
