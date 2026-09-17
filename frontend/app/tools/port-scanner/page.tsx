'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Scan, ArrowLeft, Play, Loader2, Copy, Check, Globe, Shield, Lock, Unlock, Server } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface PortResult {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  service: string;
  banner?: string;
}

interface ScanResult {
  host: string;
  ip: string;
  scanTime: number;
  ports: PortResult[];
  summary: {
    open: number;
    closed: number;
    filtered: number;
  };
}

const commonPorts = [
  { port: 21, name: 'FTP' },
  { port: 22, name: 'SSH' },
  { port: 23, name: 'Telnet' },
  { port: 25, name: 'SMTP' },
  { port: 53, name: 'DNS' },
  { port: 80, name: 'HTTP' },
  { port: 110, name: 'POP3' },
  { port: 143, name: 'IMAP' },
  { port: 443, name: 'HTTPS' },
  { port: 993, name: 'IMAPS' },
  { port: 995, name: 'POP3S' },
  { port: 3306, name: 'MySQL' },
  { port: 5432, name: 'PostgreSQL' },
  { port: 6379, name: 'Redis' },
  { port: 8080, name: 'HTTP Alt' },
];

export default function PortScannerPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [host, setHost] = useState('');
  const [portRange, setPortRange] = useState('common');
  const [customPorts, setCustomPorts] = useState('80,443,22,21');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('scanWiggle', { wiggles: 6, type: 'easeOut' });

      gsap.to('.scan-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.85, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-scan-symbol');
      symbols.forEach((el, i) => {
        gsap.to(el, {
          y: -20 - i * 5,
          rotation: i % 2 === 0 ? 10 : -10,
          duration: 3 + i * 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      if (titleRef.current) {
        const split = new SplitText(titleRef.current, { type: 'chars' });
        gsap.from(split.chars, {
          opacity: 0,
          y: 50,
          rotationX: -90,
          stagger: 0.03,
          duration: 0.6,
          ease: 'back.out(1.7)',
          delay: 0.2,
        });
      }

      gsap.to('.hero-scan-icon', {
        boxShadow: '0 0 50px rgba(239, 68, 68, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.scan-form', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

      gsap.from('.port-chip', {
        opacity: 0,
        scale: 0.8,
        stagger: 0.03,
        duration: 0.4,
        delay: 0.7,
        ease: 'back.out(1.7)',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;

    const btn = document.querySelector('.scan-btn');
    if (btn) {
      gsap.to(btn, {
        scale: 0.95,
        duration: 0.1,
        onComplete: () => gsap.to(btn, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.3)' }),
      });
    }

    setLoading(true);
    setError('');
    setData(null);

    // Build portRange string for API
    const portRangeStr = portRange === 'common'
      ? commonPorts.map(p => p.port).join(',')
      : customPorts;

    try {
      const response = await fetch('/api/tools/port-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host.trim(), portRange: portRangeStr }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.port-result-row', {
            opacity: 0,
            x: -20,
            stagger: 0.05,
            duration: 0.4,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Port scan failed');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Unlock className="w-4 h-4 text-green-400" />;
      case 'closed':
        return <Lock className="w-4 h-4 text-red-400" />;
      default:
        return <Shield className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'closed':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    }
  };

  const copyResults = async () => {
    if (!data) return;
    const openPorts = data.ports.filter(p => p.status === 'open');
    const text = openPorts.map(p => `${p.port} - ${p.service}`).join('\n') || 'No open ports found';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="scan-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-red-600/20 to-orange-600/20 blur-[100px]" />
        <div className="scan-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-rose-600/15 to-pink-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['TCP', 'UDP', ':443', ':80', 'SYN', 'ACK'].map((sym, i) => (
          <div
            key={i}
            className="floating-scan-symbol absolute text-lg font-mono text-white/10"
            style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}
          >
            {sym}
          </div>
        ))}
      </div>

      <section className="relative py-12 border-b border-white/[0.06]">
        <div className="container mx-auto px-4">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tools
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div className="hero-scan-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600/30 to-orange-600/30 border border-red-500/30 flex items-center justify-center">
              <Scan className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Port Scanner</span>
              </h1>
              <p className="text-gray-400">
                Scan for open ports and services on any host
              </p>
            </div>
          </div>

          <form onSubmit={handleScan} className="scan-form max-w-3xl space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="Enter hostname or IP address"
                  className="w-full pl-12 pr-4 py-4 bg-[#0d0d12] rounded-xl text-white placeholder-gray-500 outline-none border border-white/[0.06] focus:border-red-500/50"
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPortRange('common')}
                  className={`flex-1 py-3 rounded-xl border transition-all ${portRange === 'common'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-white/[0.15]'
                    }`}
                >
                  Common Ports
                </button>
                <button
                  type="button"
                  onClick={() => setPortRange('custom')}
                  className={`flex-1 py-3 rounded-xl border transition-all ${portRange === 'custom'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-white/[0.15]'
                    }`}
                >
                  Custom Ports
                </button>
              </div>

              {portRange === 'common' && (
                <div className="flex flex-wrap gap-2">
                  {commonPorts.map((p) => (
                    <span key={p.port} className="port-chip px-3 py-1.5 bg-white/[0.06] border border-white/[0.10] rounded-lg text-sm text-gray-300">
                      {p.port} <span className="text-gray-500">({p.name})</span>
                    </span>
                  ))}
                </div>
              )}

              {portRange === 'custom' && (
                <div className="relative">
                  <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={customPorts}
                    onChange={(e) => setCustomPorts(e.target.value)}
                    placeholder="Enter ports (comma-separated, e.g., 80,443,22)"
                    className="w-full pl-12 pr-4 py-4 bg-[#0d0d12] rounded-xl text-white font-mono placeholder-gray-500 outline-none border border-white/[0.06] focus:border-red-500/50"
                    disabled={loading}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !host.trim()}
                className="scan-btn w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scan className="w-5 h-5" />}
                {loading ? 'Scanning...' : 'Start Scan'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-600/10 to-orange-600/10 border border-red-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Target Host</p>
                  <h2 className="text-2xl font-bold text-white">{data.host}</h2>
                  {data.ip && <p className="text-gray-400 font-mono text-sm mt-1">{data.ip}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 bg-white/[0.02] rounded-xl">
                    <p className="text-2xl font-bold text-green-400">{data.summary.open}</p>
                    <p className="text-xs text-gray-400">Open</p>
                  </div>
                  <div className="text-center px-4 py-2 bg-white/[0.02] rounded-xl">
                    <p className="text-2xl font-bold text-red-400">{data.summary.closed}</p>
                    <p className="text-xs text-gray-400">Closed</p>
                  </div>
                  <div className="text-center px-4 py-2 bg-white/[0.02] rounded-xl">
                    <p className="text-2xl font-bold text-yellow-400">{data.summary.filtered}</p>
                    <p className="text-xs text-gray-400">Filtered</p>
                  </div>
                  <button
                    onClick={copyResults}
                    className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="font-semibold text-white">Scan Results</h3>
                <span className="text-sm text-gray-400">Scan time: {data.scanTime}ms</span>
              </div>
              <div className="divide-y divide-white/5">
                {data.ports.map((port, idx) => (
                  <div key={idx} className="port-result-row flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="w-16 text-center py-2 rounded-lg bg-white/[0.06] font-mono text-white font-bold">
                        {port.port}
                      </span>
                      <div>
                        <p className="text-white font-medium">{port.service}</p>
                        {port.banner && <p className="text-gray-500 text-sm truncate max-w-md">{port.banner}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(port.status)}
                      <span className={`px-3 py-1 rounded-lg border text-sm capitalize ${getStatusColor(port.status)}`}>
                        {port.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Scan className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Port Scanner</h3>
            <p className="text-gray-500">
              Enter a hostname to scan for open ports and detect running services. Only scan hosts you own or have permission to test.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
