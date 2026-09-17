'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Regex, ArrowLeft, Copy, Check, Play, AlertCircle, Info, Flag, Hash } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

const commonPatterns = [
  { name: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { name: 'URL', pattern: 'https?://[\\w\\-._~:/?#[\\]@!$&\'()*+,;=]+' },
  { name: 'Phone (US)', pattern: '\\(?\\d{3}\\)?[-\\s.]?\\d{3}[-\\s.]?\\d{4}' },
  { name: 'IP Address', pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b' },
  { name: 'Date (MM/DD/YYYY)', pattern: '(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])/(19|20)\\d{2}' },
  { name: 'Hex Color', pattern: '#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})' },
  { name: 'Credit Card', pattern: '\\b(?:\\d[ -]*?){13,16}\\b' },
  { name: 'UUID', pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' },
];

interface MatchResult {
  match: string;
  index: number;
  groups: string[];
}

export default function RegexTesterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [pattern, setPattern] = useState('');
  const [testString, setTestString] = useState('');
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('regexWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.regex-gradient-orb', {
        x: 'random(-50, 50)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.12)',
        duration: 5.5,
        ease: 'sine.inOut',
        stagger: { each: 0.7, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-regex-symbol');
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

      gsap.to('.hero-regex-icon', {
        boxShadow: '0 0 50px rgba(34, 197, 94, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.regex-panel', {
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

  const results = useMemo(() => {
    if (!pattern || !testString) return { matches: [], highlighted: testString, error: null };

    try {
      const flagString = Object.entries(flags)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join('');

      const regex = new RegExp(pattern, flagString);
      const matches: MatchResult[] = [];
      let match;

      if (flags.g) {
        while ((match = regex.exec(testString)) !== null) {
          matches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
          });
          if (match.index === regex.lastIndex) regex.lastIndex++;
        }
      } else {
        match = regex.exec(testString);
        if (match) {
          matches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
          });
        }
      }

      let highlighted = testString;
      const sortedMatches = [...matches].sort((a, b) => b.index - a.index);
      sortedMatches.forEach((m) => {
        const before = highlighted.slice(0, m.index);
        const after = highlighted.slice(m.index + m.match.length);
        highlighted = `${before}<mark class="bg-green-500/40 text-green-200 px-0.5 rounded">${m.match}</mark>${after}`;
      });

      setError(null);
      return { matches, highlighted, error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Invalid regex';
      setError(errorMsg);
      return { matches: [], highlighted: testString, error: errorMsg };
    }
  }, [pattern, testString, flags]);

  const copyValue = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const applyPattern = (p: string) => {
    setPattern(p);
    gsap.fromTo('.pattern-input', { borderColor: 'rgba(34, 197, 94, 0.8)' }, { borderColor: 'rgba(255, 255, 255, 0.1)', duration: 0.5 });
  };

  const toggleFlag = (flag: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="regex-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-green-600/20 to-emerald-600/20 blur-[100px]" />
        <div className="regex-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-teal-600/15 to-cyan-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['/g', '\\d+', '[a-z]', '.*', '\\w+', '^$'].map((sym, i) => (
          <div
            key={i}
            className="floating-regex-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-regex-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600/30 to-emerald-600/30 border border-green-500/30 flex items-center justify-center">
              <Regex className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Regex Tester</span>
              </h1>
              <p className="text-gray-400">
                Test and debug regular expressions with real-time matching
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="regex-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Regex className="w-5 h-5 text-green-400" />
                  Pattern
                </h3>
                <div className="flex items-center gap-2">
                  {(['g', 'i', 'm', 's'] as const).map((flag) => (
                    <button
                      key={flag}
                      onClick={() => toggleFlag(flag)}
                      className={`w-8 h-8 rounded-lg font-mono font-bold text-sm transition-colors ${flags[flag]
                          ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                          : 'bg-white/[0.02] text-gray-500 border border-white/[0.06] hover:bg-white/[0.06]'
                        }`}
                      title={
                        flag === 'g' ? 'Global' :
                          flag === 'i' ? 'Case Insensitive' :
                            flag === 'm' ? 'Multiline' : 'Dot All'
                      }
                    >
                      {flag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">/</span>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="pattern-input w-full p-4 pl-8 pr-24 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white font-mono focus:border-green-500/50 outline-none"
                  placeholder="Enter regex pattern"
                />
                <span className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-500 font-mono">
                  /{Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('')}
                </span>
                <button
                  onClick={() => copyValue(`/${pattern}/${Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('')}`, 'pattern')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
                >
                  {copied === 'pattern' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
                </button>
              </div>

              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            <div className="regex-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-400" />
                Test String
              </h3>
              <textarea
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                className="w-full h-40 p-4 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white font-mono focus:border-blue-500/50 outline-none resize-none"
                placeholder="Enter text to test against the regex pattern..."
              />
            </div>

            <div className="regex-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Flag className="w-5 h-5 text-purple-400" />
                  Highlighted Matches
                </h3>
                <span className="text-sm text-gray-400">
                  {results.matches.length} match{results.matches.length !== 1 ? 'es' : ''} found
                </span>
              </div>
              <div
                className="p-4 bg-[#0d0d12] rounded-xl font-mono text-white whitespace-pre-wrap min-h-[100px]"
                dangerouslySetInnerHTML={{ __html: results.highlighted || '<span class="text-gray-500">Enter a pattern and test string to see matches</span>' }}
              />
            </div>

            {results.matches.length > 0 && (
              <div className="regex-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-orange-400" />
                  Match Details
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {results.matches.map((match, index) => (
                    <div key={index} className="p-3 bg-[#0d0d12] rounded-xl flex items-start justify-between group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Match {index + 1}</span>
                          <span className="text-xs text-gray-500">Index: {match.index}</span>
                        </div>
                        <p className="text-white font-mono">&quot;{match.match}&quot;</p>
                        {match.groups.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Groups:</p>
                            {match.groups.map((group, gIndex) => (
                              <span key={gIndex} className="inline-block mr-2 mt-1 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-mono">
                                ${gIndex + 1}: &quot;{group}&quot;
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => copyValue(match.match, `match-${index}`)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/[0.06] rounded transition-all"
                      >
                        {copied === `match-${index}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="regex-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sticky top-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                Common Patterns
              </h3>
              <div className="space-y-2">
                {commonPatterns.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => applyPattern(item.pattern)}
                    className="w-full p-3 bg-[#0d0d12] hover:bg-white/[0.04] rounded-xl text-left transition-colors group"
                  >
                    <p className="text-white text-sm font-medium mb-1">{item.name}</p>
                    <p className="text-gray-500 text-xs font-mono truncate group-hover:text-gray-400">
                      {item.pattern}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <h4 className="text-sm font-semibold text-white mb-3">Flag Reference</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-green-400 font-bold">g</span>
                    <span className="text-gray-400">Global - Find all matches</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-green-400 font-bold">i</span>
                    <span className="text-gray-400">Case insensitive matching</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-green-400 font-bold">m</span>
                    <span className="text-gray-400">Multiline mode for ^ and $</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-green-400 font-bold">s</span>
                    <span className="text-gray-400">Dot matches newlines</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <h4 className="text-sm font-semibold text-white mb-3">Quick Reference</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { symbol: '.', desc: 'Any char' },
                    { symbol: '\\d', desc: 'Digit' },
                    { symbol: '\\w', desc: 'Word char' },
                    { symbol: '\\s', desc: 'Whitespace' },
                    { symbol: '^', desc: 'Start' },
                    { symbol: '$', desc: 'End' },
                    { symbol: '*', desc: '0 or more' },
                    { symbol: '+', desc: '1 or more' },
                    { symbol: '?', desc: 'Optional' },
                    { symbol: '[ ]', desc: 'Char class' },
                    { symbol: '( )', desc: 'Group' },
                    { symbol: '|', desc: 'Alternation' },
                  ].map((item, index) => (
                    <div key={index} className="p-2 bg-[#0d0d12] rounded">
                      <span className="font-mono text-green-400">{item.symbol}</span>
                      <span className="text-gray-500 ml-2">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
