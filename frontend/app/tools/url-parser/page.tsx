'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Link2, ArrowLeft, Copy, Check, Globe, Lock, Search, Hash, FileText } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface ParsedURL {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  host: string;
  searchParams: [string, string][];
}

export default function URLParserPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [url, setUrl] = useState('https://user:pass@example.com:8080/path/to/page?name=value&foo=bar#section');
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('urlWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.url-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-url-symbol');
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

      gsap.to('.hero-url-icon', {
        boxShadow: '0 0 50px rgba(249, 115, 22, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.url-panel', {
        opacity: 0,
        y: 30,
        stagger: 0.12,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const parsedUrl = useMemo((): ParsedURL | null => {
    try {
      const parsed = new URL(url);
      setError(null);
      return {
        protocol: parsed.protocol,
        username: parsed.username,
        password: parsed.password,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        origin: parsed.origin,
        host: parsed.host,
        searchParams: Array.from(parsed.searchParams.entries()),
      };
    } catch (err) {
      setError('Invalid URL format');
      return null;
    }
  }, [url]);

  const copyValue = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    gsap.fromTo(`.copy-${id}`, { scale: 1.2 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
    setTimeout(() => setCopied(null), 2000);
  };

  const encodeUrl = () => {
    setUrl(encodeURIComponent(url));
    gsap.fromTo('.encode-btn', { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
  };

  const decodeUrl = () => {
    try {
      setUrl(decodeURIComponent(url));
    } catch {
      setError('Cannot decode - invalid encoding');
    }
    gsap.fromTo('.decode-btn', { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
  };

  const sampleUrls = [
    'https://api.example.com/v1/users?page=1&limit=10&sort=name',
    'https://user:password@secure.example.com:443/dashboard',
    'https://search.example.com/results?q=hello%20world&lang=en#top',
    'ftp://files.example.com/downloads/file.zip',
    'mailto:contact@example.com?subject=Hello&body=Test',
  ];

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="url-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-orange-600/20 to-amber-600/20 blur-[100px]" />
        <div className="url-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-red-600/15 to-pink-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['http', '://', '?q=', '&id', '#ref', '/api'].map((sym, i) => (
          <div
            key={i}
            className="floating-url-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-url-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600/30 to-amber-600/30 border border-orange-500/30 flex items-center justify-center">
              <Link2 className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>URL Parser</span>
              </h1>
              <p className="text-gray-400">
                Parse, analyze, and encode/decode URLs
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="url-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-400" />
              Enter URL
            </h3>
            <div className="flex gap-2">
              <button
                onClick={encodeUrl}
                className="encode-btn px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors"
              >
                Encode
              </button>
              <button
                onClick={decodeUrl}
                className="decode-btn px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors"
              >
                Decode
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-4 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white font-mono text-sm focus:border-orange-500/50 outline-none"
              placeholder="Enter URL to parse..."
            />
            <button
              onClick={() => copyValue(url, 'fullurl')}
              className="copy-fullurl absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              {copied === 'fullurl' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-red-400 text-sm">{error}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {sampleUrls.map((sample, index) => (
              <button
                key={index}
                onClick={() => setUrl(sample)}
                className="px-3 py-1.5 bg-[#0d0d12] hover:bg-white/[0.06] text-gray-400 hover:text-white rounded-lg text-xs transition-colors truncate max-w-xs"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {parsedUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="url-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                URL Components
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Protocol', value: parsedUrl.protocol, icon: <Lock className="w-4 h-4" />, color: 'text-purple-400' },
                  { label: 'Username', value: parsedUrl.username || '(none)', icon: null, color: 'text-gray-400' },
                  { label: 'Password', value: parsedUrl.password ? '••••••••' : '(none)', icon: null, color: 'text-gray-400' },
                  { label: 'Hostname', value: parsedUrl.hostname, icon: <Globe className="w-4 h-4" />, color: 'text-green-400' },
                  { label: 'Port', value: parsedUrl.port || '(default)', icon: null, color: 'text-yellow-400' },
                  { label: 'Origin', value: parsedUrl.origin, icon: null, color: 'text-blue-400' },
                  { label: 'Host', value: parsedUrl.host, icon: null, color: 'text-cyan-400' },
                  { label: 'Pathname', value: parsedUrl.pathname || '/', icon: <FileText className="w-4 h-4" />, color: 'text-orange-400' },
                  { label: 'Search', value: parsedUrl.search || '(none)', icon: <Search className="w-4 h-4" />, color: 'text-pink-400' },
                  { label: 'Hash', value: parsedUrl.hash || '(none)', icon: <Hash className="w-4 h-4" />, color: 'text-red-400' },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-[#0d0d12] rounded-xl flex justify-between items-center group hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`${item.color}`}>{item.icon}</span>
                      <span className="text-gray-400 text-sm w-20 flex-shrink-0">{item.label}</span>
                      <span className="text-white font-mono text-sm truncate">{item.value}</span>
                    </div>
                    {item.value !== '(none)' && item.value !== '(default)' && (
                      <button
                        onClick={() => copyValue(item.value, item.label)}
                        className={`copy-${item.label} opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/[0.06] rounded transition-all flex-shrink-0`}
                      >
                        {copied === item.label ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="url-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-pink-400" />
                  Query Parameters
                </h3>
                {parsedUrl.searchParams.length > 0 ? (
                  <div className="space-y-2">
                    {parsedUrl.searchParams.map(([key, value], index) => (
                      <div key={index} className="p-3 bg-[#0d0d12] rounded-xl flex justify-between items-center group hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-pink-400 font-mono text-sm">{key}</span>
                          <span className="text-gray-500">=</span>
                          <span className="text-white font-mono text-sm truncate">{value}</span>
                        </div>
                        <button
                          onClick={() => copyValue(`${key}=${value}`, `param-${index}`)}
                          className={`copy-param-${index} opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/[0.06] rounded transition-all flex-shrink-0`}
                        >
                          {copied === `param-${index}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No query parameters found</p>
                )}
              </div>

              <div className="url-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4">Path Segments</h3>
                {parsedUrl.pathname && parsedUrl.pathname !== '/' ? (
                  <div className="flex flex-wrap gap-2">
                    {parsedUrl.pathname.split('/').filter(Boolean).map((segment, index) => (
                      <button
                        key={index}
                        onClick={() => copyValue(segment, `seg-${index}`)}
                        className="px-3 py-1.5 bg-[#0d0d12] hover:bg-white/[0.06] text-orange-400 font-mono text-sm rounded-lg transition-colors"
                      >
                        /{segment}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Root path only</p>
                )}
              </div>

              <div className="url-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4">Encoded Versions</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-[#0d0d12] rounded-xl group">
                    <p className="text-xs text-gray-500 mb-1">URI Encoded</p>
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-white font-mono text-sm break-all">{encodeURIComponent(url)}</p>
                      <button
                        onClick={() => copyValue(encodeURIComponent(url), 'uriencoded')}
                        className="copy-uriencoded p-1.5 hover:bg-white/[0.06] rounded transition-all flex-shrink-0"
                      >
                        {copied === 'uriencoded' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-[#0d0d12] rounded-xl group">
                    <p className="text-xs text-gray-500 mb-1">Base64 Encoded</p>
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-white font-mono text-sm break-all">{btoa(url)}</p>
                      <button
                        onClick={() => copyValue(btoa(url), 'base64url')}
                        className="copy-base64url p-1.5 hover:bg-white/[0.06] rounded transition-all flex-shrink-0"
                      >
                        {copied === 'base64url' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
