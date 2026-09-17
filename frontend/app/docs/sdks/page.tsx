'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function DocsSDKsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('javascript');

  const sdks = [
    { id: 'javascript', name: 'JavaScript', icon: '🟨', version: '2.5.0', installs: '45K+', color: 'yellow' },
    { id: 'python', name: 'Python', icon: '🐍', version: '3.1.2', installs: '38K+', color: 'blue' },
    { id: 'go', name: 'Go', icon: '🔵', version: '1.4.0', installs: '12K+', color: 'cyan' },
    { id: 'php', name: 'PHP', icon: '🟣', version: '2.0.1', installs: '8K+', color: 'purple' },
    { id: 'ruby', name: 'Ruby', icon: '💎', version: '1.2.3', installs: '5K+', color: 'red' },
    { id: 'java', name: 'Java', icon: '☕', version: '1.8.0', installs: '15K+', color: 'orange' }
  ];

  const codeExamples: Record<string, { install: string; code: string }> = {
    javascript: {
      install: 'npm install @maula/sdk',
      code: `import { MaulaClient } from '@maula/sdk';

const client = new MaulaClient({
  apiKey: process.env.MAULA_API_KEY
});

const response = await client.agents.chat({
  agentId: 'your-agent-id',
  message: 'Hello, can you help me?'
});

console.log(response.message);`
    },
    python: {
      install: 'pip install maula-sdk',
      code: `from maula import MaulaClient

client = MaulaClient(
    api_key=os.environ.get("MAULA_API_KEY")
)

response = client.agents.chat(
    agent_id="your-agent-id",
    message="Hello, can you help me?"
)

print(response.message)`
    },
    go: {
      install: 'go get github.com/maula-ai/go-sdk',
      code: `package main

import (
    "fmt"
    maula "github.com/maula-ai/go-sdk"
)

func main() {
    client := maula.NewClient(os.Getenv("MAULA_API_KEY"))
    
    response, _ := client.Agents.Chat(
        "your-agent-id",
        "Hello, can you help me?",
    )
    
    fmt.Println(response.Message)
}`
    },
    php: {
      install: 'composer require maula/sdk',
      code: `<?php
use Maula\\Client;

$client = new Client([
    'api_key' => getenv('MAULA_API_KEY')
]);

$response = $client->agents->chat([
    'agent_id' => 'your-agent-id',
    'message' => 'Hello, can you help me?'
]);

echo $response->message;`
    },
    ruby: {
      install: 'gem install maula-sdk',
      code: `require 'maula'

client = Maula::Client.new(
  api_key: ENV['MAULA_API_KEY']
)

response = client.agents.chat(
  agent_id: 'your-agent-id',
  message: 'Hello, can you help me?'
)

puts response.message`
    },
    java: {
      install: 'implementation "ai.maula:sdk:1.8.0"',
      code: `import ai.maula.MaulaClient;
import ai.maula.models.ChatResponse;

public class Example {
    public static void main(String[] args) {
        MaulaClient client = new MaulaClient(
            System.getenv("MAULA_API_KEY")
        );
        
        ChatResponse response = client.agents().chat(
            "your-agent-id",
            "Hello, can you help me?"
        );
        
        System.out.println(response.getMessage());
    }
}`
    }
  };

  const features = [
    { icon: '🔒', title: 'Type Safe', desc: 'Full TypeScript support with comprehensive type definitions' },
    { icon: '⚡', title: 'Async/Await', desc: 'Modern async patterns for non-blocking operations' },
    { icon: '🔄', title: 'Auto Retry', desc: 'Built-in retry logic with exponential backoff' },
    { icon: '📊', title: 'Streaming', desc: 'Stream responses for real-time message display' }
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroTitle.chars, { y: 100, opacity: 0, rotateX: -90 });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-badge', { y: 30, opacity: 0, scale: 0.8 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.02 }, '-=0.3')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.3');

      // 2. ScrambleText on SDK names
      gsap.utils.toArray<HTMLElement>('.sdk-name').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 0.8, scrambleText: { text: originalText, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', speed: 0.5 }, delay: i * 0.05 });
          }
        });
      });

      // 3. ScrollTrigger for SDK cards
      gsap.set('.sdk-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.sdk-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for feature cards
      gsap.set('.feature-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.features-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.feature-card').forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.5, delay: i * 0.1, ease: 'power2.out' });
          });
        }
      });

      // 5. Observer for parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.08, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting element
      gsap.to('.orbit-element', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 60, y: -30 }, { x: 120, y: 0 }, { x: 60, y: 30 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 14,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on action buttons
      gsap.utils.toArray<HTMLElement>('.action-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'sdksWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.sdks-section',
        start: 'top 80%',
        onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' })
      });

      // 9. Draggable cards
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-card', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function() {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-50, 50)`,
          y: `random(-40, 40)`,
          rotation: `random(-90, 90)`,
          duration: `random(5, 8)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.15
        });
      });

      // 11. Code block animation
      gsap.set('.code-block', { y: 30, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.code-section',
        start: 'top 85%',
        onEnter: () => gsap.to('.code-block', { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' })
      });

      // 12. SDK icon hover animation
      gsap.utils.toArray<HTMLElement>('.sdk-icon').forEach((icon) => {
        icon.addEventListener('mouseenter', () => {
          gsap.to(icon, { scale: 1.3, rotation: 15, duration: 0.3, ease: 'back.out(2)' });
        });
        icon.addEventListener('mouseleave', () => {
          gsap.to(icon, { scale: 1, rotation: 0, duration: 0.3 });
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const currentExample = codeExamples[activeTab];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-teal-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-cyan-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-teal-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 backdrop-blur-sm rounded-full border border-cyan-500/30 mb-6">
            <span className="text-xl">📦</span>
            <span className="font-medium">Official SDKs</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>SDKs & Libraries</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Official client libraries for your favorite programming language
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#sdks" className="action-btn px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
              Browse SDKs
            </a>
            <a href="#quickstart" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
              Quick Start
            </a>
          </div>
        </div>
      </section>

      {/* SDK Cards */}
      <section id="sdks" className="sdks-section relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#sdksGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="sdksGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-8">Available SDKs</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {sdks.map((sdk) => (
              <button key={sdk.id} onClick={() => setActiveTab(sdk.id)} className={`sdk-card draggable-card group relative p-4 rounded-2xl bg-white/[0.02] border backdrop-blur-sm transition-all text-center ${activeTab === sdk.id ? 'border-cyan-500/70 shadow-lg shadow-cyan-500/20' : 'border-white/[0.06] hover:border-cyan-500/50'}`}>
                <div className="sdk-icon text-4xl mb-3">{sdk.icon}</div>
                <h3 className="sdk-name text-sm font-bold text-white mb-1">{sdk.name}</h3>
                <p className="text-xs text-gray-400">v{sdk.version}</p>
                <p className="text-xs text-cyan-400 mt-1">{sdk.installs}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section id="quickstart" className="code-section relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Quick Start</h2>
          <div className="code-block relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-lg" />
            
            {/* Install Command */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Install the SDK:</p>
                <button onClick={() => handleCopy(currentExample.install)} className="action-btn text-xs px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                  Copy
                </button>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-lg">
                <code className="text-cyan-400 font-mono text-sm">{currentExample.install}</code>
              </div>
            </div>

            {/* Code Example */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Example usage:</p>
                <button onClick={() => handleCopy(currentExample.code)} className="action-btn text-xs px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                  Copy
                </button>
              </div>
              <pre className="bg-white/[0.03] p-4 rounded-lg overflow-x-auto">
                <code className="text-gray-300 font-mono text-sm whitespace-pre">{currentExample.code}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">SDK Features</h2>
          <div className="features-grid grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, idx) => (
              <div key={idx} className="feature-card relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-sm font-bold text-white mb-1">{feature.title}</h3>
                <p className="text-gray-400 text-xs">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-cyan-900/30 to-teal-900/30 border border-cyan-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Need Help Getting Started?</h2>
              <p className="text-gray-400 mb-6">Check out our tutorials for step-by-step guides on using our SDKs.</p>
              <Link href="/docs/tutorials" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                📚 View Tutorials
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
