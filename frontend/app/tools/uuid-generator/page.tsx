'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Key, ArrowLeft, Copy, Check, RefreshCw, Sparkles, Plus, Trash2, Search, Download, ShieldCheck, AlertTriangle } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

type UUIDVersion = 'v4' | 'v1-like' | 'v7';
type UUIDFormat = 'standard' | 'braces' | 'urn' | 'base64' | 'no-hyphens';
type ActivePanel = 'generate' | 'validate';

interface GeneratedUUID {
  id: string;
  uuid: string;
  version: UUIDVersion;
  timestamp: Date;
}

interface ValidationResult {
  valid: boolean;
  version: string | null;
  variant: string | null;
  timestamp: string | null;
  components: { timeLow: string; timeMid: string; timeHiAndVersion: string; clockSeq: string; node: string } | null;
}

export default function UuidGeneratorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('generate');
  const [uuids, setUuids] = useState<GeneratedUUID[]>([]);
  const [version, setVersion] = useState<UUIDVersion>('v4');
  const [format, setFormat] = useState<UUIDFormat>('standard');
  const [count, setCount] = useState(1);
  const [uppercase, setUppercase] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [validateInput, setValidateInput] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('uuidWiggle', { wiggles: 6, type: 'easeOut' });

      gsap.to('.uuid-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.1)',
        duration: 5,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      const symbols = document.querySelectorAll('.floating-uuid-symbol');
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

      gsap.to('.hero-uuid-icon', {
        boxShadow: '0 0 50px rgba(249, 115, 22, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.uuid-panel', {
        opacity: 0,
        y: 40,
        stagger: 0.1,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const generateUUIDv4 = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const generateUUIDv1Like = (): string => {
    const now = Date.now();
    const timeHex = now.toString(16).padStart(12, '0');
    const randomPart = Array.from({ length: 20 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-1${randomPart.slice(0, 3)}-${randomPart.slice(3, 7)}-${randomPart.slice(7, 19)}`;
  };

  const generateUUIDv7 = (): string => {
    const now = Date.now();
    const timeHex = now.toString(16).padStart(12, '0');
    const randA = Array.from({ length: 3 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const randB = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const variantBits = ((parseInt(randB[0], 16) & 0x3) | 0x8).toString(16);
    return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-7${randA}-${variantBits}${randB.slice(1, 4)}-${randB.slice(4, 16)}`;
  };

  const formatUUID = (uuid: string): string => {
    let formatted = uppercase ? uuid.toUpperCase() : uuid;
    switch (format) {
      case 'no-hyphens':
        return formatted.replace(/-/g, '');
      case 'braces':
        return `{${formatted}}`;
      case 'urn':
        return `urn:uuid:${formatted}`;
      case 'base64':
        const hex = formatted.replace(/-/g, '');
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        return btoa(String.fromCharCode(...bytes));
      default:
        return formatted;
    }
  };

  const generate = () => {
    const newUUIDs: GeneratedUUID[] = [];
    for (let i = 0; i < count; i++) {
      let raw: string;
      if (version === 'v7') raw = generateUUIDv7();
      else if (version === 'v1-like') raw = generateUUIDv1Like();
      else raw = generateUUIDv4();

      newUUIDs.push({
        id: `${Date.now()}-${i}`,
        uuid: formatUUID(raw),
        version,
        timestamp: new Date(),
      });
    }
    setUuids([...newUUIDs, ...uuids]);

    setTimeout(() => {
      gsap.from('.uuid-item:first-child', {
        opacity: 0, x: -30, scale: 0.95, duration: 0.4, ease: 'back.out(1.7)',
      });
    }, 50);

    const btn = document.querySelector('.generate-btn');
    if (btn) {
      gsap.to(btn, {
        scale: 0.95, duration: 0.1,
        onComplete: () => gsap.to(btn, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.3)' }),
      });
    }
  };

  const validateUUID = () => {
    const input = validateInput.trim();
    let cleaned = input;
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) cleaned = cleaned.slice(1, -1);
    if (cleaned.startsWith('urn:uuid:')) cleaned = cleaned.slice(9);
    cleaned = cleaned.toLowerCase();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const noHyphenRegex = /^[0-9a-f]{32}$/;

    let normalized = cleaned;
    if (noHyphenRegex.test(cleaned)) {
      normalized = `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`;
    }

    if (!uuidRegex.test(normalized)) {
      setValidationResult({ valid: false, version: null, variant: null, timestamp: null, components: null });
      return;
    }

    const parts = normalized.split('-');
    const versionChar = parts[2][0];
    const variantChar = parseInt(parts[3][0], 16);

    let versionStr: string;
    switch (versionChar) {
      case '1': versionStr = 'Version 1 (Time-based)'; break;
      case '2': versionStr = 'Version 2 (DCE Security)'; break;
      case '3': versionStr = 'Version 3 (MD5 Name-based)'; break;
      case '4': versionStr = 'Version 4 (Random)'; break;
      case '5': versionStr = 'Version 5 (SHA-1 Name-based)'; break;
      case '6': versionStr = 'Version 6 (Reordered Time)'; break;
      case '7': versionStr = 'Version 7 (Unix Epoch Time)'; break;
      default: versionStr = `Version ${versionChar} (Unknown)`;
    }

    let variant: string;
    if ((variantChar & 0x8) === 0) variant = 'NCS (reserved)';
    else if ((variantChar & 0xc) === 0x8) variant = 'RFC 4122 / RFC 9562';
    else if ((variantChar & 0xe) === 0xc) variant = 'Microsoft (reserved)';
    else variant = 'Future (reserved)';

    let timestamp: string | null = null;
    if (versionChar === '7') {
      const timeHex = parts[0] + parts[1];
      const ms = parseInt(timeHex, 16);
      if (ms > 0) timestamp = new Date(ms).toISOString();
    }

    setValidationResult({
      valid: true,
      version: versionStr,
      variant,
      timestamp,
      components: {
        timeLow: parts[0],
        timeMid: parts[1],
        timeHiAndVersion: parts[2],
        clockSeq: parts[3],
        node: parts[4],
      },
    });
  };

  const copyUUID = async (uuid: string, id: string) => {
    await navigator.clipboard.writeText(uuid);
    setCopiedId(id);
    const btn = document.querySelector(`[data-copy-id="${id}"]`);
    if (btn) {
      gsap.to(btn, { scale: 1.2, duration: 0.2, ease: 'back.out(1.7)', onComplete: () => gsap.to(btn, { scale: 1, duration: 0.2 }) });
    }
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = async () => {
    const allUUIDs = uuids.map(u => u.uuid).join('\n');
    await navigator.clipboard.writeText(allUUIDs);
    gsap.to('.copy-all-btn', { scale: 1.1, duration: 0.2, ease: 'back.out(1.7)', onComplete: () => gsap.to('.copy-all-btn', { scale: 1, duration: 0.2 }) });
  };

  const exportAll = () => {
    if (uuids.length === 0) return;
    const text = uuids.map(u => u.uuid).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uuids-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeUUID = (id: string) => {
    const el = document.querySelector(`[data-uuid-id="${id}"]`);
    if (el) {
      gsap.to(el, {
        opacity: 0, x: 30, height: 0, marginBottom: 0, padding: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => setUuids(uuids.filter(u => u.id !== id)),
      });
    } else {
      setUuids(uuids.filter(u => u.id !== id));
    }
  };

  const clearAll = () => {
    gsap.to('.uuid-item', {
      opacity: 0, x: 30, stagger: 0.05, duration: 0.2, onComplete: () => setUuids([]),
    });
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="uuid-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-orange-600/20 to-red-600/20 blur-[100px]" />
        <div className="uuid-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-amber-600/15 to-yellow-600/15 blur-[80px]" />
      </div>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['uuid', 'v4', 'guid', 'xxxx', '4xxx', 'yxxx'].map((sym, i) => (
          <div key={i} className="floating-uuid-symbol absolute text-lg font-mono text-white/10" style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}>
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

          <div className="flex items-center gap-6 mb-6">
            <div className="hero-uuid-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600/30 to-red-600/30 border border-orange-500/30 flex items-center justify-center">
              <Key className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>UUID Generator</span>
              </h1>
              <p className="text-gray-400">
                Generate, validate, and analyze unique identifiers
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActivePanel('generate')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activePanel === 'generate'
                  ? 'bg-orange-600/20 border border-orange-500/40 text-orange-400'
                  : 'bg-white/[0.02] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
            <button
              onClick={() => setActivePanel('validate')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activePanel === 'validate'
                  ? 'bg-orange-600/20 border border-orange-500/40 text-orange-400'
                  : 'bg-white/[0.02] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
            >
              <Search className="w-4 h-4" />
              Validate & Analyze
            </button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* ── Generate Panel ── */}
        {activePanel === 'generate' && (
          <>
            <div className="uuid-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Version</label>
                  <select
                    value={version}
                    onChange={(e) => setVersion(e.target.value as UUIDVersion)}
                    className="w-full px-4 py-3 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white focus:border-orange-500/50 outline-none"
                  >
                    <option value="v4">UUID v4 (Random)</option>
                    <option value="v1-like">UUID v1-like (Time)</option>
                    <option value="v7">UUID v7 (Sortable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as UUIDFormat)}
                    className="w-full px-4 py-3 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white focus:border-orange-500/50 outline-none"
                  >
                    <option value="standard">Standard (hyphens)</option>
                    <option value="no-hyphens">No Hyphens</option>
                    <option value="braces">&#123;Braces&#125;</option>
                    <option value="urn">URN</option>
                    <option value="base64">Base64</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Count</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-4 py-3 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white focus:border-orange-500/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Case</label>
                  <div className="flex h-[46px] items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uppercase}
                        onChange={(e) => setUppercase(e.target.checked)}
                        className="w-4 h-4 rounded border-white/[0.10] bg-white/[0.02] text-orange-500 focus:ring-orange-500/20"
                      />
                      <span className="text-gray-300 text-sm">UPPERCASE</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={generate}
                    className="generate-btn w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate
                  </button>
                </div>
              </div>

              {uuids.length > 0 && (
                <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
                  <button onClick={copyAll} className="copy-all-btn px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-gray-300 hover:text-white rounded-lg transition-all flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Copy All ({uuids.length})
                  </button>
                  <button onClick={exportAll} className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-gray-300 hover:text-white rounded-lg transition-all flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button onClick={clearAll} className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-gray-300 hover:text-white rounded-lg transition-all flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {uuids.length === 0 ? (
                <div className="uuid-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-8 text-center">
                  <Key className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No UUIDs Generated Yet</h3>
                  <p className="text-gray-500 text-sm">Click the Generate button to create unique identifiers</p>
                </div>
              ) : (
                uuids.map((item) => (
                  <div
                    key={item.id}
                    data-uuid-id={item.id}
                    className="uuid-item uuid-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-orange-500/30 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-gray-300 font-mono text-sm md:text-base break-all">
                        {item.uuid}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="hidden md:block px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-orange-400 text-xs font-medium">
                        {item.version}
                      </span>
                      <button
                        data-copy-id={item.id}
                        onClick={() => copyUUID(item.uuid, item.id)}
                        className="p-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg transition-all"
                      >
                        {copiedId === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => removeUUID(item.id)}
                        className="p-2 bg-white/[0.02] hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── Validate & Analyze Panel ── */}
        {activePanel === 'validate' && (
          <div className="space-y-6">
            <div className="uuid-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">UUID Validator & Analyzer</h3>
              <p className="text-gray-400 text-sm mb-4">Paste a UUID to check validity, detect version, variant, and extract embedded information.</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={validateInput}
                  onChange={(e) => setValidateInput(e.target.value)}
                  placeholder="Paste UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)"
                  className="flex-1 px-4 py-3 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white font-mono placeholder-gray-500 outline-none focus:border-orange-500/50"
                  onKeyDown={(e) => e.key === 'Enter' && validateUUID()}
                />
                <button
                  onClick={validateUUID}
                  disabled={!validateInput.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Validate
                </button>
              </div>
            </div>

            {validationResult && (
              <div className="uuid-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  {validationResult.valid ? (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-400">Valid UUID</h3>
                        <p className="text-gray-400 text-sm">{validationResult.version}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-400">Invalid UUID</h3>
                        <p className="text-gray-400 text-sm">The input does not match the UUID format</p>
                      </div>
                    </>
                  )}
                </div>

                {validationResult.valid && validationResult.components && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#0d0d12] rounded-xl">
                        <p className="text-gray-400 text-xs mb-1">Version</p>
                        <p className="text-white font-medium">{validationResult.version}</p>
                      </div>
                      <div className="p-4 bg-[#0d0d12] rounded-xl">
                        <p className="text-gray-400 text-xs mb-1">Variant</p>
                        <p className="text-white font-medium">{validationResult.variant}</p>
                      </div>
                    </div>

                    {validationResult.timestamp && (
                      <div className="p-4 bg-[#0d0d12] rounded-xl">
                        <p className="text-gray-400 text-xs mb-1">Embedded Timestamp</p>
                        <p className="text-white font-medium">{validationResult.timestamp}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-gray-400 text-sm mb-3">UUID Components</p>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        {[
                          { label: 'time_low', value: validationResult.components.timeLow },
                          { label: 'time_mid', value: validationResult.components.timeMid },
                          { label: 'time_hi_ver', value: validationResult.components.timeHiAndVersion },
                          { label: 'clock_seq', value: validationResult.components.clockSeq },
                          { label: 'node', value: validationResult.components.node },
                        ].map(({ label, value }) => (
                          <div key={label} className="p-3 bg-[#0d0d12] rounded-lg text-center">
                            <p className="text-gray-500 text-xs mb-1">{label}</p>
                            <p className="text-orange-400 font-mono text-sm">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!validationResult && (
              <div className="uuid-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-8 text-center">
                <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">Paste a UUID to Analyze</h3>
                <p className="text-gray-500 text-sm">Supports all UUID formats: standard, braces, URN, and no-hyphens</p>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-3">About UUIDs</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div>
              <p className="font-medium text-white mb-1">UUID v4 (Random)</p>
              <p>Generated using random numbers. Most common type, 122 bits of randomness.</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">UUID v1 (Time-based)</p>
              <p>Based on timestamp and MAC address. Useful when ordering matters.</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">UUID v7 (Sortable)</p>
              <p>Unix epoch timestamp + random bits. Lexicographically sortable, modern standard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
