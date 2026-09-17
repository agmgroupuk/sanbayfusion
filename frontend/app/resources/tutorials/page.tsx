'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, CustomWiggle, TextPlugin } from '@/lib/gsap';
import { GraduationCap, Play, Clock, Star, ArrowRight, BookOpen, Code, ChefHat, Dumbbell, Plane, Brain, Heart, Briefcase, Gamepad2, Sparkles, CheckCircle, ChevronRight, Terminal, Layout, Monitor, Wrench, FlaskConical } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, CustomWiggle, TextPlugin);

const tutorials = [
  {
    id: 'gencraft-pro',
    name: 'GenCraft Pro',
    avatar: '🎨',
    description: 'AI App Builder — Text to App',
    color: 'purple',
    gradient: 'from-purple-500 to-fuchsia-500',
    difficulty: 'All Levels',
    duration: '20 min',
    topics: ['Text to App', 'Image to Code', 'Voice Input', '170+ Tools', 'One-Click Deploy', 'Live Preview'],
    steps: [
      'Open GenCraft Pro at maula.ai/canvas — you\'ll see the AI prompt bar',
      'Type a description like "Build a task management app with drag and drop"',
      'Or upload a screenshot/mockup — AI will convert it to working code',
      'Use Voice Input to speak your app ideas naturally',
      'Watch the live preview update in real-time as AI generates code',
      'Edit code directly in the Monaco editor with IntelliSense',
      'Use 170+ built-in tools across 16 categories (Web Apps, Games, Data Viz, AI/ML, etc.)',
      'Deploy with one click to Netlify, Vercel, or download the full project'
    ]
  },
  {
    id: 'canvas-studio',
    name: 'Canvas Studio',
    avatar: '🖥️',
    description: 'Professional AI Code Editor',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-500',
    difficulty: 'Intermediate',
    duration: '25 min',
    topics: ['16 Panels', 'Knowledge Graph', 'Collaboration', 'AI Image Gen', 'Security Scanner', 'Terminal'],
    steps: [
      'Open Canvas Studio at studio.maula.ai — the professional code editor',
      'Create a new project or open an existing one from the Workspace panel',
      'Use the AI Chat panel to describe what you want to build or modify',
      'Navigate files with the File Explorer panel and edit with Monaco editor',
      'Visualize your project architecture using the Knowledge Graph panel (Tree, Force, or Radial layout)',
      'Generate images and assets with the AI Image Generation panel',
      'Run security scans with the Security Scanner to find and fix vulnerabilities',
      'Invite team members with roles (Owner, Admin, Editor, Viewer) for real-time collaboration',
      'Use the integrated Terminal for package management and build commands',
      'Access all 16 specialized panels from the sidebar for a complete development workflow'
    ]
  },
  {
    id: 'einstein',
    name: 'Einstein',
    avatar: '🧠',
    description: 'Physics & Mathematics Expert',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    difficulty: 'Intermediate',
    duration: '15 min',
    topics: ['Scientific Reasoning', 'Complex Math', 'Physics Concepts'],
    steps: [
      'Start with a clear question about physics or math',
      'Einstein will break down complex concepts step by step',
      'Ask follow-up questions to deepen understanding',
      'Use GenCraft Pro or Canvas Studio for visual explanations'
    ]
  },
  {
    id: 'tech-wizard',
    name: 'Tech Wizard',
    avatar: '💻',
    description: 'Technology & Programming',
    color: 'emerald',
    gradient: 'from-emerald-500 to-cyan-500',
    difficulty: 'All Levels',
    duration: '20 min',
    topics: ['Code Review', 'Debugging', 'Best Practices'],
    steps: [
      'Share your code or describe the problem',
      'Tech Wizard will analyze and provide solutions',
      'Request code examples in any language',
      'Open GenCraft Pro for interactive code generation, or Canvas Studio for full projects'
    ]
  },
  {
    id: 'chef-biew',
    name: 'Chef Biew',
    avatar: '👨‍🍳',
    description: 'Cooking & Recipes',
    color: 'orange',
    gradient: 'from-amber-500 to-orange-500',
    difficulty: 'Beginner',
    duration: '10 min',
    topics: ['Recipes', 'Cooking Techniques', 'Meal Planning'],
    steps: [
      'Tell Chef Biew what ingredients you have',
      'Get personalized recipe suggestions',
      'Ask for cooking tips and substitutions',
      'Request step-by-step cooking instructions'
    ]
  },
  {
    id: 'fitness-guru',
    name: 'Fitness Guru',
    avatar: '💪',
    description: 'Fitness & Health',
    color: 'red',
    gradient: 'from-red-500 to-rose-500',
    difficulty: 'All Levels',
    duration: '15 min',
    topics: ['Workout Plans', 'Nutrition', 'Form Guidance'],
    steps: [
      'Share your fitness goals and experience level',
      'Get a personalized workout plan',
      'Ask about proper exercise form',
      'Request nutrition and recovery advice'
    ]
  },
  {
    id: 'travel-buddy',
    name: 'Travel Buddy',
    avatar: '✈️',
    description: 'Travel & Exploration',
    color: 'sky',
    gradient: 'from-sky-500 to-indigo-500',
    difficulty: 'Beginner',
    duration: '12 min',
    topics: ['Destination Planning', 'Itineraries', 'Travel Tips'],
    steps: [
      'Tell Travel Buddy your destination or interests',
      'Get personalized travel recommendations',
      'Request a detailed itinerary',
      'Ask about local customs and tips'
    ]
  },
  {
    id: 'julie-girlfriend',
    name: 'Julie Girlfriend',
    avatar: '💕',
    description: 'Relationship Advice',
    color: 'pink',
    gradient: 'from-pink-500 to-rose-500',
    difficulty: 'Beginner',
    duration: '10 min',
    topics: ['Relationships', 'Communication', 'Dating Tips'],
    steps: [
      'Share your relationship question or situation',
      'Get thoughtful, empathetic advice',
      'Discuss communication strategies',
      'Explore different perspectives'
    ]
  },
  {
    id: 'mrs-boss',
    name: 'Mrs Boss',
    avatar: '📊',
    description: 'Business & Management',
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
    difficulty: 'Intermediate',
    duration: '18 min',
    topics: ['Leadership', 'Strategy', 'Career Growth'],
    steps: [
      'Describe your business challenge or goal',
      'Get strategic advice and frameworks',
      'Discuss team management techniques',
      'Plan your career development path'
    ]
  },
  {
    id: 'ben-sega',
    name: 'Ben Sega',
    avatar: '🎮',
    description: 'Gaming & Retro Entertainment',
    color: 'indigo',
    gradient: 'from-indigo-500 to-blue-500',
    difficulty: 'All Levels',
    duration: '10 min',
    topics: ['Game Recommendations', 'Retro Gaming', 'Gaming Culture'],
    steps: [
      'Tell Ben Sega your gaming preferences',
      'Get personalized game recommendations',
      'Discuss gaming strategies and tips',
      'Explore retro gaming history'
    ]
  }
];

export default function TutorialsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [selectedTutorial, setSelectedTutorial] = useState(tutorials[0]);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize(); window.addEventListener('resize', resize);
    const colors = ['#ffffff', '#c4b5fd', '#93c5fd', '#86efac', '#fca5a5', '#fde68a'];
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3, alpha: Math.random(), speed: Math.random() * 0.008 + 0.003,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed; if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
        ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        if (s.r > 1) { ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.15; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2); ctx.fill(); }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      CustomWiggle.create('tutorialWiggle', { wiggles: 5, type: 'uniform' });

      gsap.set('.hero-title-wrap', { y: 60, opacity: 0, filter: 'blur(20px)' });
      gsap.set('.hero-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-title-wrap', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, delay: 0.2 })
        .to('.hero-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2 }, '-=0.9');

      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(236,72,153,0.5), 0 0 160px rgba(236,72,153,0.2), inset 0 0 30px rgba(236,72,153,0.1)',
        scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });

      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      if (typewriterRef.current) {
        const phrases = [
          'Build apps with GenCraft Pro',
          'Code in Canvas Studio',
          'Learn Einstein AI in 15 min',
          'Master Tech Wizard coding',
          'Cook with Chef Biew',
          'Train with Fitness Guru',
          'Plan trips with Travel Buddy',
        ];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      gsap.utils.toArray<HTMLElement>('.floating-icon').forEach((icon, i) => {
        gsap.fromTo(icon,
          { y: 30, opacity: 0, scale: 0 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, delay: 0.3 + i * 0.1, ease: 'back.out(2)' }
        );
        gsap.to(icon, {
          y: `random(-15, 15)`, x: `random(-10, 10)`, rotation: `random(-10, 10)`,
          duration: `random(3, 5)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.2
        });
      });

      gsap.fromTo('.agent-btn',
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, delay: 0.6 }
      );

      gsap.fromTo('.tutorial-content',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.8 }
      );

      ScrollTrigger.create({
        trigger: '.cta-section', start: 'top 90%', once: true,
        onEnter: () => { gsap.fromTo('.cta-section', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }); }
      });

      ScrollTrigger.refresh();
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSelectTutorial = (tutorial: typeof tutorials[0]) => {
    setSelectedTutorial(tutorial);
    gsap.fromTo('.tutorial-content',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
  };

  const card = 'rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm';

  return (
    <div ref={containerRef} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)' }} />
        <div className="absolute top-[55%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
      </div>

      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,92,246,0.015) 2px, rgba(139,92,246,0.015) 4px)' }} />
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="fixed inset-0 pointer-events-none z-[3]">
        <div className="floating-icon absolute top-24 left-[10%]">
          <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-fuchsia-500/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-fuchsia-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-40 right-[12%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-violet-500/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-violet-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-48 left-[12%]">
          <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-cyan-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-32 right-[8%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-16 lg:pt-36 lg:pb-24 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-fuchsia-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-fuchsia-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-fuchsia-400/40 shadow-2xl shadow-fuchsia-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.35) 0%, rgba(139,92,246,0.25) 50%, rgba(236,72,153,0.3) 100%)' }}>
              <GraduationCap className="w-14 h-14 relative z-10" style={{ color: '#f9a8d4', filter: 'drop-shadow(0 0 18px rgba(236,72,153,0.8)) drop-shadow(0 0 40px rgba(236,72,153,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-fuchsia-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Tutorials</span>
            </h1>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
            Learn how to get the most out of each agent with our
            <span className="text-fuchsia-400"> interactive tutorials.</span>
          </p>

          <div className="flex justify-center items-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600/15 via-violet-600/10 to-fuchsia-600/15 border border-fuchsia-500/25 backdrop-blur-sm shadow-lg shadow-fuchsia-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-fuchsia-600/30 border border-fuchsia-500/30">
                <Terminal className="w-3.5 h-3.5 text-fuchsia-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span className="text-fuchsia-400 font-semibold">Learn</span>{' '}
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-fuchsia-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
          {/* Agent Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
                Select an Agent
              </h3>
              {tutorials.map((tutorial) => (
                <button
                  key={tutorial.id}
                  onClick={() => handleSelectTutorial(tutorial)}
                  className={`agent-btn group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all overflow-hidden ${selectedTutorial.id === tutorial.id
                      ? `bg-gradient-to-r ${tutorial.gradient} text-white shadow-lg`
                      : 'bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.04] border border-white/[0.06]'
                    }`}
                >
                  <span className="text-2xl">{tutorial.avatar}</span>
                  <div>
                    <div className="font-medium">{tutorial.name}</div>
                    <div className={`text-xs ${selectedTutorial.id === tutorial.id ? 'text-white/70' : 'text-gray-500'}`}>
                      {tutorial.duration}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tutorial Content */}
          <div className="flex-1 min-w-0">
            <div className="tutorial-content">
              <div className={`group relative p-8 ${card} hover:bg-white/[0.04] hover:border-white/[0.1] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/[0.06] rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedTutorial.gradient} flex items-center justify-center text-3xl shadow-lg`}>
                      {selectedTutorial.avatar}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedTutorial.name}</h2>
                      <p className="text-gray-400">{selectedTutorial.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {selectedTutorial.duration}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.06]">
                      {selectedTutorial.difficulty}
                    </span>
                  </div>
                </div>

                {/* Topics */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">What You&apos;ll Learn</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTutorial.topics.map((topic, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-white/[0.04] text-gray-300 text-sm border border-white/[0.06]">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Tutorial Steps</h3>
                  <div className="space-y-4">
                    {selectedTutorial.steps.map((step, i) => (
                      <div key={i} className={`flex items-start gap-4 p-4 ${card} hover:bg-white/[0.04] transition-all`}>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${selectedTutorial.gradient} flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-md`}>
                          {i + 1}
                        </div>
                        <p className="text-gray-300 pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={`/agents/${selectedTutorial.id}`}
                    className={`flex-1 inline-flex items-center justify-center px-6 py-4 rounded-xl bg-gradient-to-r ${selectedTutorial.gradient} text-white font-bold hover:shadow-lg transition-all`}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Try {selectedTutorial.name}
                  </Link>
                  <Link
                    href="/resources/documentation"
                    className="flex-1 inline-flex items-center justify-center px-6 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 font-semibold hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all"
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    View Documentation
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className={`cta-section relative p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden text-center`}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(236,72,153,0.04) 0%, transparent 70%)' }} />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-fuchsia-500/20 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-violet-500/20 rounded-bl-lg" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Explore All Agents?
              </h2>
              <p className="text-gray-500 mb-8 max-w-xl mx-auto">
                Browse our full collection of 18+ specialized AI agents.
              </p>
              <Link
                href="/agents"
                className="inline-flex items-center px-7 py-3.5 bg-gradient-to-r from-fuchsia-600/90 to-violet-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-fuchsia-600/15 hover:shadow-fuchsia-600/30 transition-all gap-2"
              >
                Browse All Agents
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
        .typewriter-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
