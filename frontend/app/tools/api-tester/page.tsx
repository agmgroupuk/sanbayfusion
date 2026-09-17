'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, Copy, Clock, ArrowLeft, Check, Zap, Code, Key, Lock, ChevronDown, Sparkles, Play, Terminal } from 'lucide-react';
import Link from 'next/link';
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer);

interface Header {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  time?: number;
}

const quickPresets = [
  {
    name: 'JSONPlaceholder - Get Posts',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts',
    icon: '📝',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'JSONPlaceholder - Create Post',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    body: JSON.stringify({ title: 'Test Post', body: 'Test content', userId: 1 }, null, 2),
    headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
    icon: '✏️',
    color: 'from-green-500 to-emerald-500',
  },
  {
    name: 'GitHub API - Get User',
    method: 'GET',
    url: 'https://api.github.com/users/github',
    icon: '🐱',
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'REST Countries - Get Country',
    method: 'GET',
    url: 'https://restcountries.com/v3.1/name/canada',
    icon: '🌍',
    color: 'from-orange-500 to-red-500',
  },
  {
    name: 'Cat Facts API',
    method: 'GET',
    url: 'https://catfact.ninja/fact',
    icon: '🐱',
    color: 'from-yellow-500 to-orange-500',
  },
];

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const methodColors: Record<string, string> = {
  GET: 'from-emerald-500 to-green-500',
  POST: 'from-blue-500 to-cyan-500',
  PUT: 'from-orange-500 to-amber-500',
  PATCH: 'from-violet-500 to-purple-500',
  DELETE: 'from-red-500 to-rose-500',
  HEAD: 'from-gray-500 to-slate-500',
  OPTIONS: 'from-teal-500 to-cyan-500',
};

export default function ApiTesterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [authType, setAuthType] = useState('none');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [headers, setHeaders] = useState<Header[]>([]);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([]);
  const [bodyType, setBodyType] = useState('json');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'auth' | 'body'>('params');

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('apiWiggle', { wiggles: 8, type: 'easeOut' });
      CustomEase.create('apiBounce', 'M0,0 C0.14,0 0.27,0.9 0.5,1 0.73,1.1 0.86,1 1,1');

      // Background orbs
      gsap.to('.api-gradient-orb', {
        x: 'random(-80, 80)',
        y: 'random(-40, 40)',
        scale: 'random(0.9, 1.1)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 1, repeat: -1, yoyo: true },
      });

      // Floating code symbols
      const floatingSymbols = document.querySelectorAll('.floating-code-symbol');
      floatingSymbols.forEach((symbol, i) => {
        gsap.to(symbol, {
          y: -30,
          rotation: i % 2 === 0 ? 15 : -15,
          duration: 3 + i * 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      // SplitText title
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars, words' });
        gsap.from(titleSplit.chars, {
          opacity: 0,
          y: 60,
          rotationX: -90,
          scale: 0.5,
          stagger: 0.03,
          duration: 0.8,
          ease: 'back.out(1.7)',
          delay: 0.2,
        });
      }

      // Subtitle typewriter
      if (subtitleRef.current) {
        const text = subtitleRef.current.textContent || '';
        subtitleRef.current.textContent = '';
        gsap.to(subtitleRef.current, {
          text: { value: text, delimiter: '' },
          duration: 1.5,
          delay: 1,
          ease: 'none',
        });
      }

      // Hero icon pulse
      gsap.to('.hero-api-icon', {
        boxShadow: '0 0 50px rgba(59, 130, 246, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Preset cards entrance
      gsap.from('.preset-card', {
        opacity: 0,
        y: 40,
        rotationX: -30,
        scale: 0.9,
        stagger: 0.1,
        duration: 0.6,
        delay: 1.2,
        ease: 'back.out(1.5)',
      });

      // Method buttons entrance
      gsap.from('.method-btn', {
        opacity: 0,
        x: -20,
        stagger: 0.05,
        duration: 0.4,
        delay: 1.5,
        ease: 'power2.out',
      });

      // Tab buttons entrance
      gsap.from('.tab-btn', {
        opacity: 0,
        y: 20,
        stagger: 0.08,
        duration: 0.5,
        delay: 1.7,
        ease: 'power2.out',
      });

      // Main form area
      gsap.from('.request-form', {
        opacity: 0,
        y: 50,
        duration: 0.8,
        delay: 0.8,
        ease: 'power3.out',
      });

      // Response area
      gsap.from('.response-area', {
        opacity: 0,
        y: 50,
        duration: 0.8,
        delay: 1,
        ease: 'power3.out',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Method switch animation
  const handleMethodChange = (newMethod: string) => {
    const methodBtn = document.querySelector(`[data-method="${method}"]`);
    const newMethodBtn = document.querySelector(`[data-method="${newMethod}"]`);
    
    if (methodBtn && newMethodBtn) {
      gsap.to(methodBtn, { scale: 0.95, duration: 0.1 });
      gsap.to(newMethodBtn, { 
        scale: 1.1, 
        duration: 0.2, 
        ease: 'back.out(1.7)',
        onComplete: () => gsap.to(newMethodBtn, { scale: 1, duration: 0.1 })
      });
    }
    setMethod(newMethod);
  };

  // Tab switch with Flip
  const handleTabChange = (tab: typeof activeTab) => {
    const state = Flip.getState('.tab-content');
    setActiveTab(tab);
    requestAnimationFrame(() => {
      Flip.from(state, { duration: 0.3, ease: 'power2.out' });
    });
  };

  // Animate adding header/param
  const addHeader = () => {
    const newHeader = { id: Date.now().toString(), key: '', value: '', enabled: true };
    setHeaders([...headers, newHeader]);
    setTimeout(() => {
      const newEl = document.querySelector(`[data-header-id="${newHeader.id}"]`);
      if (newEl) {
        gsap.from(newEl, { 
          opacity: 0, 
          x: -30, 
          height: 0,
          duration: 0.3, 
          ease: 'power2.out' 
        });
      }
    }, 10);
  };

  const removeHeader = (id: string) => {
    const el = document.querySelector(`[data-header-id="${id}"]`);
    if (el) {
      gsap.to(el, { 
        opacity: 0, 
        x: 30, 
        height: 0,
        duration: 0.2, 
        ease: 'power2.in',
        onComplete: () => setHeaders(headers.filter(h => h.id !== id))
      });
    } else {
      setHeaders(headers.filter(h => h.id !== id));
    }
  };

  const updateHeader = (id: string, field: keyof Header, value: string | boolean) => {
    setHeaders(headers.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const addQueryParam = () => {
    const newParam = { id: Date.now().toString(), key: '', value: '', enabled: true };
    setQueryParams([...queryParams, newParam]);
    setTimeout(() => {
      const newEl = document.querySelector(`[data-param-id="${newParam.id}"]`);
      if (newEl) {
        gsap.from(newEl, { 
          opacity: 0, 
          x: -30, 
          height: 0,
          duration: 0.3, 
          ease: 'power2.out' 
        });
      }
    }, 10);
  };

  const removeQueryParam = (id: string) => {
    const el = document.querySelector(`[data-param-id="${id}"]`);
    if (el) {
      gsap.to(el, { 
        opacity: 0, 
        x: 30, 
        height: 0,
        duration: 0.2, 
        ease: 'power2.in',
        onComplete: () => setQueryParams(queryParams.filter(q => q.id !== id))
      });
    } else {
      setQueryParams(queryParams.filter(q => q.id !== id));
    }
  };

  const updateQueryParam = (id: string, field: keyof QueryParam, value: string | boolean) => {
    setQueryParams(queryParams.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const loadPreset = (preset: typeof quickPresets[0]) => {
    // Animate preset card
    const cards = document.querySelectorAll('.preset-card');
    cards.forEach(card => {
      gsap.to(card, { scale: 0.98, duration: 0.1 });
      gsap.to(card, { scale: 1, duration: 0.2, delay: 0.1, ease: 'back.out(1.7)' });
    });

    setMethod(preset.method);
    setUrl(preset.url);
    if ('body' in preset && preset.body) {
      setBody(preset.body);
      setBodyType('json');
    } else {
      setBody('');
    }
    if ('headers' in preset && preset.headers) {
      setHeaders(preset.headers as Header[]);
    } else {
      setHeaders([]);
    }
    setQueryParams([]);
    setAuthType('none');
    setResponse(null);
    setError('');

    // Animate URL input fill
    const urlInput = document.querySelector('.url-input');
    if (urlInput) {
      gsap.fromTo(urlInput, 
        { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
        { backgroundColor: 'transparent', duration: 0.5 }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Animate send button
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) {
      gsap.to(sendBtn, {
        scale: 0.95,
        duration: 0.1,
        onComplete: () => gsap.to(sendBtn, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.3)' })
      });
    }

    setLoading(true);
    setError('');
    setResponse(null);

    // Loading pulse animation
    gsap.to('.loading-indicator', {
      opacity: 1,
      scale: 1,
      duration: 0.3,
    });

    try {
      let finalUrl = url.trim();
      const enabledParams = queryParams.filter(p => p.enabled && p.key);
      if (enabledParams.length > 0) {
        const params = new URLSearchParams();
        enabledParams.forEach(p => params.append(p.key, p.value));
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + params.toString();
      }

      const finalHeaders: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => {
        finalHeaders[h.key] = h.value;
      });

      if (authType === 'bearer' && bearerToken) {
        finalHeaders['Authorization'] = `Bearer ${bearerToken}`;
      } else if (authType === 'basic' && basicUsername) {
        finalHeaders['Authorization'] = `Basic ${btoa(`${basicUsername}:${basicPassword}`)}`;
      } else if (authType === 'apikey' && apiKeyValue) {
        finalHeaders[apiKeyHeader] = apiKeyValue;
      }

      const startTime = Date.now();
      const res = await fetch('/api/tools/api-tester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          url: finalUrl,
          headers: finalHeaders,
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
        }),
      });

      const data = await res.json();
      const endTime = Date.now();

      if (data.success) {
        setResponse({
          ...data.response,
          time: endTime - startTime,
        });

        // Success animation
        gsap.to('.response-area', {
          borderColor: 'rgba(34, 197, 94, 0.5)',
          duration: 0.3,
          onComplete: () => gsap.to('.response-area', { borderColor: 'rgba(255,255,255,0.1)', duration: 1, delay: 1 })
        });

        // Animate response content
        gsap.from('.response-content', {
          opacity: 0,
          y: 20,
          duration: 0.5,
          ease: 'power2.out',
        });
      } else {
        setError(data.error || 'Request failed');
        // Error shake
        const tl = gsap.timeline();
        tl.to('.response-area', { x: -10, duration: 0.1 })
          .to('.response-area', { x: 10, duration: 0.1 })
          .to('.response-area', { x: -5, duration: 0.1 })
          .to('.response-area', { x: 5, duration: 0.1 })
          .to('.response-area', { x: 0, duration: 0.1 });
      }
    } catch (err) {
      setError('Failed to send request');
    } finally {
      setLoading(false);
      gsap.to('.loading-indicator', { opacity: 0, scale: 0.8, duration: 0.3 });
    }
  };

  const copyResponse = async () => {
    if (response?.data) {
      await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      
      // Copy success animation
      const copyBtn = document.querySelector('.copy-btn');
      if (copyBtn) {
        gsap.to(copyBtn, {
          scale: 1.2,
          duration: 0.2,
          ease: 'back.out(1.7)',
          onComplete: () => gsap.to(copyBtn, { scale: 1, duration: 0.2 })
        });
      }
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (status >= 300 && status < 400) return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    if (status >= 400 && status < 500) return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="api-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-[100px]" />
        <div className="api-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-violet-600/15 to-purple-600/15 blur-[80px]" />
      </div>

      {/* Floating Code Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['{ }', '< />', '[ ]', '( )', '=> ', '...'].map((symbol, i) => (
          <div
            key={i}
            className="floating-code-symbol absolute text-2xl font-mono text-white/10"
            style={{ left: `${10 + i * 15}%`, top: `${15 + (i % 3) * 30}%` }}
          >
            {symbol}
          </div>
        ))}
      </div>

      {/* Hero Header */}
      <section className="relative py-16 border-b border-white/[0.06]">
        <div className="container mx-auto px-4">
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tools
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div className="hero-api-icon w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border border-blue-500/30 flex items-center justify-center">
              <Code className="w-10 h-10 text-blue-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>API Tester</span>
              </h1>
              <p ref={subtitleRef} className="text-xl text-gray-400">
                Professional API testing with authentication, presets, and advanced features
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-3">
            {quickPresets.map((preset, i) => (
              <button
                key={i}
                onClick={() => loadPreset(preset)}
                className={`preset-card px-4 py-2 rounded-xl bg-gradient-to-r ${preset.color} bg-opacity-20 border border-white/[0.06] hover:border-white/[0.15] transition-all duration-300 flex items-center gap-2 group`}
              >
                <span className="text-lg">{preset.icon}</span>
                <span className="text-white text-sm font-medium">{preset.name}</span>
                <Play className="w-3 h-3 text-white/50 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Request Panel */}
          <div className="request-form space-y-6">
            {/* URL Bar */}
            <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
              <form onSubmit={handleSubmit}>
                <div className="flex gap-3 mb-6">
                  {/* Method Selector */}
                  <div className="relative">
                    <select
                      value={method}
                      onChange={(e) => handleMethodChange(e.target.value)}
                      className={`method-btn appearance-none px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r ${methodColors[method]} cursor-pointer pr-10`}
                    >
                      {httpMethods.map(m => (
                        <option key={m} value={m} data-method={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
                  </div>

                  {/* URL Input */}
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter request URL..."
                    className="url-input flex-1 px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="send-btn px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/[0.15] border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b border-white/[0.06] pb-4">
                {(['params', 'headers', 'auth', 'body'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`tab-btn px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/[0.02] text-gray-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {tab}
                    {tab === 'params' && queryParams.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-white/[0.08] rounded text-xs">{queryParams.length}</span>
                    )}
                    {tab === 'headers' && headers.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-white/[0.08] rounded text-xs">{headers.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="tab-content min-h-[200px]">
                {/* Query Params Tab */}
                {activeTab === 'params' && (
                  <div className="space-y-3">
                    {queryParams.map((param) => (
                      <div
                        key={param.id}
                        data-param-id={param.id}
                        className="flex items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          checked={param.enabled}
                          onChange={(e) => updateQueryParam(param.id, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded border-white/[0.10] bg-white/[0.02] text-blue-500 focus:ring-blue-500/20"
                        />
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => updateQueryParam(param.id, 'key', e.target.value)}
                          placeholder="Key"
                          className="flex-1 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:border-blue-500/50 outline-none"
                        />
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => updateQueryParam(param.id, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:border-blue-500/50 outline-none"
                        />
                        <button
                          onClick={() => removeQueryParam(param.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addQueryParam}
                      className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Parameter
                    </button>
                  </div>
                )}

                {/* Headers Tab */}
                {activeTab === 'headers' && (
                  <div className="space-y-3">
                    {headers.map((header) => (
                      <div
                        key={header.id}
                        data-header-id={header.id}
                        className="flex items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          checked={header.enabled}
                          onChange={(e) => updateHeader(header.id, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded border-white/[0.10] bg-white/[0.02] text-blue-500 focus:ring-blue-500/20"
                        />
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                          placeholder="Header Name"
                          className="flex-1 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:border-blue-500/50 outline-none"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:border-blue-500/50 outline-none"
                        />
                        <button
                          onClick={() => removeHeader(header.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addHeader}
                      className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Header
                    </button>
                  </div>
                )}

                {/* Auth Tab */}
                {activeTab === 'auth' && (
                  <div className="space-y-4">
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value)}
                      className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-white focus:border-blue-500/50 outline-none"
                    >
                      <option value="none">No Authentication</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                    </select>

                    {authType === 'bearer' && (
                      <div className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-xl">
                        <Key className="w-5 h-5 text-blue-400" />
                        <input
                          type="password"
                          value={bearerToken}
                          onChange={(e) => setBearerToken(e.target.value)}
                          placeholder="Enter Bearer Token"
                          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                        />
                      </div>
                    )}

                    {authType === 'basic' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-xl">
                          <Lock className="w-5 h-5 text-blue-400" />
                          <input
                            type="text"
                            value={basicUsername}
                            onChange={(e) => setBasicUsername(e.target.value)}
                            placeholder="Username"
                            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-xl">
                          <Lock className="w-5 h-5 text-blue-400" />
                          <input
                            type="password"
                            value={basicPassword}
                            onChange={(e) => setBasicPassword(e.target.value)}
                            placeholder="Password"
                            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {authType === 'apikey' && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={apiKeyHeader}
                          onChange={(e) => setApiKeyHeader(e.target.value)}
                          placeholder="Header Name (e.g., X-API-Key)"
                          className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 outline-none"
                        />
                        <input
                          type="password"
                          value={apiKeyValue}
                          onChange={(e) => setApiKeyValue(e.target.value)}
                          placeholder="API Key Value"
                          className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Body Tab */}
                {activeTab === 'body' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {['json', 'text', 'form'].map(type => (
                        <button
                          key={type}
                          onClick={() => setBodyType(type)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                            bodyType === type
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/[0.02] text-gray-400 hover:bg-white/[0.06]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Enter request body...'}
                      className="w-full h-48 px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-white font-mono text-sm placeholder-gray-500 focus:border-blue-500/50 outline-none resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Response Panel */}
          <div className="response-area bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-400" />
                Response
              </h2>
              {response && (
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg border font-mono text-sm ${getStatusColor(response.status)}`}>
                    {response.status} {response.statusText}
                  </span>
                  {response.time && (
                    <span className="flex items-center gap-1 text-gray-400 text-sm">
                      <Clock className="w-4 h-4" />
                      {response.time}ms
                    </span>
                  )}
                  <button
                    onClick={copyResponse}
                    className="copy-btn p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="loading-indicator flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-gray-400">Sending request...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Response Content */}
            {response && !loading && (
              <div className="response-content space-y-4">
                {/* Response Headers */}
                <details className="group">
                  <summary className="cursor-pointer text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    Response Headers ({Object.keys(response.headers || {}).length})
                  </summary>
                  <div className="mt-2 p-3 bg-white/[0.02] rounded-lg">
                    {Object.entries(response.headers || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-sm py-1">
                        <span className="text-blue-400 font-mono">{key}:</span>
                        <span className="text-gray-300 font-mono break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                </details>

                {/* Response Body */}
                <div>
                  <h3 className="text-gray-400 mb-2">Response Body</h3>
                  <pre className="bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4 overflow-auto max-h-[400px] text-sm">
                    <code className="text-gray-300 font-mono">
                      {typeof response.data === 'object'
                        ? JSON.stringify(response.data, null, 2)
                        : response.data}
                    </code>
                  </pre>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && !response && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Response Yet</h3>
                <p className="text-gray-500 max-w-sm">
                  Enter a URL and click Send to make an API request. Try one of the presets above to get started!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
