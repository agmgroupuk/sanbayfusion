'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


const API_BASE = '';

interface ExperimentStat {
  id: string;
  name: string;
  tests: number;
  activeUsers: number;
  avgDuration: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  color: string;
}

interface RealtimeData {
  totalUsers: number;
  labActiveUsers: number;
  activeExperiments: number;
  testsToday: number;
  totalTestsAllTime: number;
  avgSessionTime: string;
}

export default function AnalyticsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({
    totalUsers: 0,
    labActiveUsers: 0,
    activeExperiments: 10,
    testsToday: 0,
    totalTestsAllTime: 0,
    avgSessionTime: '0m 00s'
  });
  const [experimentStats, setExperimentStats] = useState<ExperimentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/lab/stats`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const result = await response.json();
      if (result.success && result.data) {
        setRealtimeData(result.data.realtime);
        setExperimentStats(result.data.experiments);
        setLastUpdated(new Date(result.data.timestamp));
      }
    } catch (err) {
      console.error('Error fetching lab stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const topStats = [
    { label: 'Total Users', value: realtimeData.totalUsers.toLocaleString(), icon: '👥' },
    { label: 'Active Now', value: realtimeData.labActiveUsers.toLocaleString(), icon: '🟢' },
    { label: 'Tests Today', value: realtimeData.testsToday.toLocaleString(), icon: '🧪' },
    { label: 'All Time Tests', value: realtimeData.totalTestsAllTime.toLocaleString(), icon: '📊' },
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 80, opacity: 0, rotateX: -90 });
      gsap.set('.hero-badge', { scale: 0.5, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.6, stagger: 0.02 }, '-=0.2');

      // 2. ScrambleText on stat values
      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          onEnter: () => {
            gsap.to(el, { duration: 1.2, scrambleText: { text: originalText, chars: '0123456789,', speed: 0.4 }, delay: i * 0.08 });
          }
        });
      });

      // 3. ScrollTrigger batch for experiment rows
      gsap.set('.experiment-row', { x: -40, opacity: 0 });
      ScrollTrigger.batch('.experiment-row', {
        start: 'top 92%',
        onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out' }),
        onLeaveBack: (batch) => gsap.to(batch, { x: -40, opacity: 0, duration: 0.3 })
      });

      // 4. Flip for top stats
      gsap.set('.top-stat', { opacity: 0, scale: 0.8 });
      ScrollTrigger.create({
        trigger: '.top-stats-grid',
        start: 'top 90%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.top-stat').forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, scale: 1 });
            Flip.from(state, { duration: 0.4, delay: i * 0.08, ease: 'back.out(1.4)' });
          });
        }
      });

      // 5. Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.12, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.08, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting chart element
      gsap.to('.orbit-chart', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 50, y: -25 }, { x: 100, y: 0 }, { x: 50, y: 25 }, { x: 0, y: 0 }],
          curviness: 1.5,
        },
        duration: 12,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on refresh button
      gsap.utils.toArray<HTMLElement>('.refresh-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { rotation: 360, duration: 0.6, ease: 'analyticsWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { rotation: 0, duration: 0.3 });
        });
      });

      // 8. DrawSVG for chart lines
      gsap.set('.chart-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.chart-section',
        start: 'top 85%',
        onEnter: () => gsap.to('.chart-line', { drawSVG: '100%', duration: 1.5, ease: 'power2.inOut' })
      });

      // 9. Draggable stat cards
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-stat', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function () {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.analytics-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-40, 40)`,
          y: `random(-35, 35)`,
          duration: `random(6, 10)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.15
        });
      });

      // 11. Progress bar animations
      gsap.utils.toArray<HTMLElement>('.progress-bar').forEach((bar, i) => {
        const width = bar.getAttribute('data-width') || '0%';
        gsap.fromTo(bar, { width: '0%' }, {
          width,
          duration: 1,
          delay: 0.3 + i * 0.1,
          ease: 'power2.out',
          scrollTrigger: { trigger: bar, start: 'top 95%' }
        });
      });

      // 12. Live pulse indicator
      gsap.to('.live-pulse', {
        scale: 1.3,
        opacity: 0.5,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

    }, containerRef);

    return () => ctx.revert();
  }, [realtimeData, experimentStats]);

  const maxTests = Math.max(...experimentStats.map(s => s.tests), 1);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[500px] h-[500px] bg-green-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[450px] h-[450px] bg-emerald-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="analytics-particle absolute w-2 h-2 bg-green-400/25 rounded-full" style={{ left: `${10 + i * 10}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-chart absolute top-32 right-1/4 w-3 h-3 bg-emerald-400/50 rounded-full" />
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/lab" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            ← Back to AI Lab
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-full border border-green-500/30 mb-4">
                <span className="live-pulse w-2 h-2 bg-green-400 rounded-full" />
                <span className="font-medium text-green-300">Real-time Analytics</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Lab Analytics</span>
              </h1>
              {lastUpdated && (
                <p className="text-gray-500 text-sm mt-2">Last updated: {lastUpdated.toLocaleTimeString()}</p>
              )}
            </div>
            <button onClick={fetchStats} className="refresh-btn p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all">
              🔄
            </button>
          </div>
        </div>
      </section>

      {/* Top Stats */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-5xl mx-auto top-stats-grid grid grid-cols-2 md:grid-cols-4 gap-4">
          {topStats.map((stat, idx) => (
            <div key={idx} className="top-stat draggable-stat relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="stat-value text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Experiment Stats */}
      <section className="chart-section relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/2 opacity-30" preserveAspectRatio="none">
            <line className="chart-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#analyticsGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="analyticsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Experiment Performance</h2>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading analytics...</div>
          ) : (
            <div className="space-y-4">
              {experimentStats.map((exp, idx) => (
                <div key={exp.id} className="experiment-row p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${exp.color}`} />
                      <span className="font-semibold text-white">{exp.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">{exp.tests.toLocaleString()} tests</span>
                      <span className={`flex items-center gap-1 ${exp.trend === 'up' ? 'text-green-400' : exp.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                        {exp.trend === 'up' ? '↑' : exp.trend === 'down' ? '↓' : '→'} {exp.trendValue}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`progress-bar h-full rounded-full bg-gradient-to-r ${exp.color}`} data-width={`${(exp.tests / maxTests) * 100}%`} style={{ width: 0 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/20 backdrop-blur-sm overflow-hidden">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Explore All Experiments</h2>
            <p className="text-gray-400 mb-6">Try out our AI experiments and contribute to the analytics.</p>
            <Link href="/lab" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all">
              🧪 Back to Lab
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
