'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Newspaper,
  Zap,
  TrendingUp,
  Award,
  Calendar,
  ArrowRight,
  MessageSquare,
  Info,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase, Observer } from '@/lib/gsap'
import { allAgents } from '@/lib/agentRegistry'

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase, Observer)

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [showAgentDetails, setShowAgentDetails] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<any>(null)
  const [showArticleModal, setShowArticleModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // Track mouse for global shine effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Build Available Agents from the central registry (18 total)
  const agentSlugs: string[] = [
    'ben-sega', 'bishop-burger', 'chef-biew', 'chess-player', 'comedy-king',
    'drama-queen', 'einstein', 'emma-emotional', 'fitness-guru', 'julie-girlfriend',
    'knight-logic', 'lazy-pawn', 'mrs-boss', 'nid-gaming', 'professor-astrology',
    'rook-jokey', 'tech-wizard', 'travel-buddy'
  ]

  const availableAgents = agentSlugs
    .map(id => allAgents.find(a => a.id === id))
    .filter(Boolean)
    .map((a: any, i: number) => ({
      key: `${a.id}-${i}`,
      id: a.id,
      name: a.name,
      emoji: a?.details?.icon || '🤖',
      description: a.description,
      path: `/agents/${a.id}`,
      specialties: a?.personality?.specialties || [],
      details: a?.details?.sections || []
    }))

  // Coming Soon Agents
  const comingSoonAgents = [
    { id: 1, name: 'Quantum Einstein', emoji: '⚛️', description: 'Quantum Physics Specialist' },
    { id: 2, name: 'Marketing Maven', emoji: '📢', description: 'Marketing Strategy Expert' },
    { id: 3, name: 'Financial Advisor Pro', emoji: '💼', description: 'Investment & Finance Expert' },
    { id: 4, name: 'Legal Eagle', emoji: '⚖️', description: 'Legal Advice Specialist' },
    { id: 5, name: 'Health Guru', emoji: '🏥', description: 'Medical Information Expert' },
    { id: 6, name: 'Design Master', emoji: '🎨', description: 'UI/UX Design Expert' },
    { id: 7, name: 'Yoga Master', emoji: '🧘', description: 'Meditation & Yoga Guide' },
    { id: 8, name: 'Music Producer', emoji: '🎵', description: 'Music & Sound Expert' },
    { id: 9, name: 'Photography Pro', emoji: '📸', description: 'Photography Tips' },
    { id: 10, name: 'Writing Wizard', emoji: '✍️', description: 'Content Writing Expert' },
    { id: 11, name: 'History Scholar', emoji: '📚', description: 'Historical Knowledge' },
    { id: 12, name: 'Language Master', emoji: '🌍', description: 'Language Learning' },
    { id: 13, name: 'Poetry Poet', emoji: '🖋️', description: 'Poetry & Literature' },
    { id: 14, name: 'Movie Critic', emoji: '🎬', description: 'Film & Entertainment' },
    { id: 15, name: 'Sports Analyst', emoji: '⚽', description: 'Sports News & Analysis' },
    { id: 16, name: 'Weather Wizard', emoji: '🌦️', description: 'Weather & Climate Expert' },
    { id: 17, name: 'Car Enthusiast', emoji: '🚗', description: 'Automotive Expert' },
    { id: 18, name: 'Fashion Guru', emoji: '👗', description: 'Fashion & Style Advisor' },
    { id: 19, name: 'Architecture Expert', emoji: '🏛️', description: 'Building & Design Expert' },
    { id: 20, name: 'Astronomy Ace', emoji: '🌌', description: 'Space Science Expert' },
    { id: 21, name: 'Gardening Guide', emoji: '🌿', description: 'Plant Care Expert' },
    { id: 22, name: 'Pet Companion', emoji: '🐕', description: 'Pet Care Advisor' },
    { id: 23, name: 'Coffee Connoisseur', emoji: '☕', description: 'Coffee Expert' },
    { id: 24, name: 'Wine Sommelier', emoji: '🍷', description: 'Wine & Beverages' },
    { id: 25, name: 'Sustainability Expert', emoji: '♻️', description: 'Environmental Expert' },
    { id: 26, name: 'Robotics Engineer', emoji: '🤖', description: 'Robotics & Automation' },
    { id: 27, name: 'Data Scientist', emoji: '📊', description: 'Data Analytics Expert' },
    { id: 28, name: 'Cloud Architect', emoji: '☁️', description: 'Cloud Computing Expert' },
    { id: 29, name: 'Cybersecurity Guard', emoji: '🔐', description: 'Security Expert' },
    { id: 30, name: 'DevOps Master', emoji: '⚙️', description: 'DevOps Specialist' },
    { id: 31, name: 'Mobile Developer', emoji: '📱', description: 'App Development Expert' },
    { id: 32, name: 'Web Designer', emoji: '💻', description: 'Web Development' },
    { id: 33, name: 'Database Pro', emoji: '🗄️', description: 'Database Management' },
    { id: 34, name: 'AI Researcher', emoji: '🤖', description: 'AI & Machine Learning' },
    { id: 35, name: 'Crypto Expert', emoji: '₿', description: 'Cryptocurrency Advisor' },
    { id: 36, name: 'Startup Coach', emoji: '🚀', description: 'Entrepreneurship Guide' },
    { id: 37, name: 'Career Counselor', emoji: '💼', description: 'Career Development' },
    { id: 38, name: 'Lifestyle Coach', emoji: '🌟', description: 'Personal Development' },
    { id: 39, name: 'Parenting Expert', emoji: '👨‍👩‍👧‍👦', description: 'Parenting Advice' },
    { id: 40, name: 'Education Tutor', emoji: '📖', description: 'Learning & Tutoring' },
    { id: 41, name: 'Philosophy Thinker', emoji: '🤔', description: 'Philosophy Expert' },
    { id: 42, name: 'Psychology Analyst', emoji: '🧠', description: 'Psychology & Mind' },
    { id: 43, name: 'Nutrition Specialist', emoji: '🥗', description: 'Diet & Nutrition' },
    { id: 44, name: 'Meditation Guide', emoji: '🙏', description: 'Mindfulness Expert' },
    { id: 45, name: 'Adventure Seeker', emoji: '⛰️', description: 'Adventure & Exploration' },
  ]

  const categories = [
    { id: 'all', label: '📰 All News', icon: Newspaper },
    { id: 'product', label: '🚀 Product Updates', icon: Zap },
    { id: 'industry', label: '📊 Industry News', icon: TrendingUp },
    { id: 'awards', label: '🏆 Awards & Recognition', icon: Award }
  ]

  const newsArticles = [
    {
      id: 1,
      title: 'Maula AI Launches New $1/Day Testing Plan',
      description: 'We\'re excited to announce our affordable new testing plan, allowing users to evaluate all features for just $1 per day before committing to larger subscriptions.',
      category: 'product',
      date: 'October 22, 2025',
      image: '🚀',
      readTime: '3 min read',
      featured: true,
      color: 'from-cyan-500 to-blue-500',
      glow: 'rgba(6,182,212,0.4)',
      content: `We're making it easier than ever to try our agents. With the new $1/day testing plan,\n\n- Get full access to core features\n- Test any agent at your own pace\n- Upgrade or cancel any time\n\nThis plan is perfect for experimenting with agent workflows, evaluating voice and chat experiences, and validating your use cases before moving to higher tiers.`
    },
    {
      id: 2,
      title: 'AI Adoption Reaches All-Time High in Enterprise',
      description: 'A new industry report shows that 78% of enterprises have adopted some form of AI technology, with chatbots and intelligent agents leading the charge.',
      category: 'industry',
      date: 'October 20, 2025',
      image: '📈',
      readTime: '5 min read',
      featured: true,
      color: 'from-violet-500 to-fuchsia-500',
      glow: 'rgba(139,92,246,0.4)',
      content: `The latest industry data shows enterprise AI adoption at unprecedented levels.\n\nTop drivers include:\n- Intelligent customer support agents\n- Automated content workflows\n- Real-time analytics and insights\n\nOrganizations report faster response times, improved customer satisfaction, and reduced operational costs.`
    },
    {
      id: 3,
      title: 'Maula AI Recognized as Top AI Platform',
      description: 'We\'re thrilled to announce that Maula AI has been recognized by TechCrunch as one of the top 10 emerging AI platforms for 2025.',
      category: 'awards',
      date: 'October 18, 2025',
      image: '🏆',
      readTime: '2 min read',
      featured: true,
      color: 'from-amber-500 to-orange-500',
      glow: 'rgba(245,158,11,0.4)',
      content: `We're honored to be recognized for product innovation, real-time community features, and voice-enabled experiences.\n\nThe judges highlighted:\n- Agent catalog breadth\n- Production-ready App Router APIs\n- Robust infrastructure behind Cloudflare with SSE support`
    },
    {
      id: 4,
      title: 'New Voice Integration Features Now Available',
      description: 'We\'ve rolled out enhanced voice capabilities for all agents, enabling more natural and human-like conversations with users.',
      category: 'product',
      date: 'October 15, 2025',
      image: '🎙️',
      readTime: '4 min read',
      featured: false,
      color: 'from-emerald-500 to-teal-500',
      glow: 'rgba(16,185,129,0.4)',
      content: `Voice just got better: improved TTS quality, expressive styles, and lower latency.\n\nWhat's new:\n- Emotional TTS presets\n- Faster streaming responses\n- Fine-grained voice controls`
    },
    {
      id: 5,
      title: 'The Future of Customer Service with AI',
      description: 'Industry experts discuss how AI-powered agents are transforming customer service and improving customer satisfaction scores.',
      category: 'industry',
      date: 'October 12, 2025',
      image: '💬',
      readTime: '6 min read',
      featured: false,
      color: 'from-purple-500 to-pink-500',
      glow: 'rgba(168,85,247,0.4)',
      content: `AI agents are redefining service with 24/7 availability, instant routing, and personalized responses.\n\nKey takeaways:\n- Augment, don't replace, human teams\n- Use analytics to continuously improve\n- Ensure privacy and security from day one`
    },
    {
      id: 6,
      title: 'Maula AI Community Continues to Grow',
      description: 'Our community is growing rapidly with active members sharing insights, best practices, and innovative use cases across the platform.',
      category: 'product',
      date: 'October 10, 2025',
      image: '👥',
      readTime: '3 min read',
      featured: false,
      color: 'from-indigo-500 to-blue-500',
      glow: 'rgba(99,102,241,0.4)',
      content: `Thank you to our growing global community!\n\nWhat's happening:\n- Real-time presence and metrics\n- Weekly AMAs with the dev team\n- Community-driven feature requests`
    },
    {
      id: 7,
      title: 'Natural Language Processing Breakthrough',
      description: 'Researchers announce major advancements in NLP technology, enabling more accurate understanding of human intent and context.',
      category: 'industry',
      date: 'October 8, 2025',
      image: '🧠',
      readTime: '7 min read',
      featured: false,
      color: 'from-rose-500 to-pink-500',
      glow: 'rgba(244,63,94,0.4)',
      content: `Emerging architectures improve context retention, reasoning, and controllability. Expect better performance on complex tasks with fewer tokens.`
    },
    {
      id: 8,
      title: 'Maula AI Security Certification Achieved',
      description: 'We\'re proud to announce that Maula AI has achieved SOC 2 Type II certification, ensuring the highest security standards.',
      category: 'awards',
      date: 'October 5, 2025',
      image: '🔒',
      readTime: '3 min read',
      featured: false,
      color: 'from-teal-500 to-green-500',
      glow: 'rgba(20,184,166,0.4)',
      content: `Security first: SOC 2 Type II compliance validates our processes, monitoring, and controls across the platform.`
    }
  ]

  const filteredArticles = selectedCategory === 'all'
    ? newsArticles
    : newsArticles.filter(article => article.category === selectedCategory)

  const featuredArticles = filteredArticles.filter(article => article.featured)
  const regularArticles = filteredArticles.filter(article => !article.featured)

  // ═══ GSAP Animations — matching tools page exactly ═══
  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('newsWiggle', { wiggles: 6, type: 'easeOut' })
      CustomEase.create('newsBounce', 'M0,0 C0.14,0 0.27,0.9 0.5,1 0.73,1.1 0.86,1 1,1')

      // Nebula orbs — slow floating
      gsap.to('.nebula-orb', {
        x: 'random(-120, 120)',
        y: 'random(-80, 80)',
        scale: 'random(0.6, 1.4)',
        opacity: 'random(0.03, 0.08)',
        duration: 12,
        ease: 'sine.inOut',
        stagger: { each: 2, repeat: -1, yoyo: true },
      })

      // Stardust particles
      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
        gsap.to(p, {
          y: '-=200',
          x: `random(-60, 60)`,
          opacity: 0,
          duration: 4 + Math.random() * 6,
          repeat: -1,
          delay: i * 0.3,
          ease: 'power1.out',
          onRepeat: function () {
            gsap.set(p, { y: '+=200', opacity: 0.6 })
          }
        })
        gsap.to(p, {
          scale: 'random(0.5, 1.5)',
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      })

      // Hero title entrance
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 60, filter: 'blur(20px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 }
        )
      }

      // Subtitle entrance
      if (subtitleRef.current) {
        gsap.fromTo(subtitleRef.current,
          { opacity: 0, y: 40, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 }
        )
      }

      // Hero icon pulse with luxurious glow
      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(6,182,212,0.5), 0 0 160px rgba(6,182,212,0.2), inset 0 0 30px rgba(6,182,212,0.1)',
        scale: 1.08,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      // Rotating ring around hero icon
      gsap.to('.hero-ring', {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: 'none',
      })

      // Stats cards 3D entrance
      if (statsRef.current) {
        const statCards = statsRef.current.querySelectorAll('.stat-card')
        gsap.from(statCards, {
          scrollTrigger: { trigger: statsRef.current, start: 'top 85%' },
          opacity: 0,
          y: 80,
          rotationX: -40,
          scale: 0.85,
          stagger: 0.15,
          duration: 1,
          ease: 'back.out(1.7)',
        })
      }

      // Section headers fade in
      gsap.utils.toArray<HTMLElement>('.section-header').forEach((header) => {
        gsap.from(header, {
          scrollTrigger: { trigger: header, start: 'top 90%' },
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: 'power3.out',
        })
      })

      // News cards staggered reveal with scroll
      const newsCards = document.querySelectorAll('.news-card')
      newsCards.forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 90%' },
          opacity: 0,
          y: 60,
          scale: 0.92,
          duration: 0.7,
          delay: (i % 4) * 0.08,
          ease: 'power3.out',
        })
      })

      // Agent cards staggered reveal
      const agentCards = document.querySelectorAll('.agent-card')
      agentCards.forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 92%' },
          opacity: 0,
          y: 60,
          scale: 0.92,
          duration: 0.7,
          delay: (i % 4) * 0.08,
          ease: 'power3.out',
        })
      })

      // Scan line effect
      gsap.to('.scan-line', {
        y: '100vh',
        duration: 8,
        repeat: -1,
        ease: 'none',
      })

    }, containerRef)

    return () => ctx.revert()
  }, [])

  // Card hover with tilt + glow — exact tools page pattern
  const handleCardHover = (cardId: string, isEntering: boolean) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`)
    if (!card) return

    if (isEntering) {
      setHoveredCard(cardId)
      gsap.to(card, { y: -10, scale: 1.03, duration: 0.4, ease: 'power2.out' })
      gsap.to(card.querySelector('.card-shine'), { opacity: 1, duration: 0.4 })
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 1, duration: 0.3 })
      gsap.to(card.querySelector('.card-icon-wrap'), {
        scale: 1.15, rotate: 8, duration: 0.5, ease: 'back.out(2)',
      })
      gsap.to(card.querySelector('.card-arrow'), { x: 6, opacity: 1, duration: 0.3 })
    } else {
      setHoveredCard(null)
      gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
      gsap.to(card.querySelector('.card-shine'), { opacity: 0, duration: 0.4 })
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 0, duration: 0.3 })
      gsap.to(card.querySelector('.card-icon-wrap'), {
        scale: 1, rotate: 0, duration: 0.4, ease: 'power2.out',
      })
      gsap.to(card.querySelector('.card-arrow'), { x: 0, opacity: 0.3, duration: 0.3 })
    }
  }

  // 3D tilt on mouse move — exact tools page pattern
  const handleCardMove = (e: React.MouseEvent, cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height

    gsap.to(card, {
      rotateY: x * 8,
      rotateX: -y * 8,
      duration: 0.3,
      ease: 'power2.out',
    })

    // Shine follows mouse
    const shine = card.querySelector('.card-shine') as HTMLElement
    if (shine) {
      shine.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`
    }
  }

  const handleCardLeave = (cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`)
    if (!card) return
    gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

      {/* ═══ DEEP DARK BACKGROUND LAYER — exact tools page match ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Ultra-subtle nebula blobs */}
        <div className="nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />

        {/* Micro grid — very faint */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Horizontal scan line */}
        <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ top: '-2px' }} />

        {/* Stardust particles */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="stardust absolute rounded-full"
            style={{
              left: `${3 + i * 4.8}%`,
              top: `${60 + (i % 5) * 10}%`,
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              background: i % 3 === 0 ? 'rgba(139,92,246,0.6)' : i % 3 === 1 ? 'rgba(6,182,212,0.6)' : 'rgba(236,72,153,0.5)',
              opacity: 0.6,
            }}
          />
        ))}

        {/* Mouse-following ambient light */}
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]"
          style={{
            left: mousePos.x - 250,
            top: mousePos.y - 250,
            background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ═══ HERO SECTION ═══ */}
      <section ref={heroRef} className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">

          {/* Animated icon with rotating ring */}
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-cyan-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-cyan-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-cyan-400/40 shadow-2xl shadow-cyan-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.35) 0%, rgba(59,130,246,0.25) 50%, rgba(6,182,212,0.3) 100%)' }}>
              <Newspaper className="w-14 h-14 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 18px rgba(103,232,249,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.5))' }} />
              {/* Corner sparkles */}
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-blue-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <h1
            ref={titleRef}
            className="text-5xl md:text-7xl font-bold mb-4 leading-tight"
            style={{ opacity: 0 }}
          >
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>News &</span>
            <br />
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Updates</span>
          </h1>

          <p
            ref={subtitleRef}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light"
            style={{ opacity: 0 }}
          >
            Stay updated with the latest news, product announcements, and industry insights about AI and Maula AI.
          </p>

          {/* Badge similar to tools */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600/15 via-blue-600/10 to-cyan-600/15 border border-cyan-500/25 backdrop-blur-sm shadow-lg shadow-cyan-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <span className="text-sm text-gray-300">
                <span className="text-cyan-400 font-semibold">Latest</span>{' '}
                <span className="text-gray-200">product updates & AI industry news</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ QUICK STATS — exact tools page stat card style ═══ */}
      <section className="relative py-6">
        <div className="container mx-auto px-4">
          <div ref={statsRef} className="max-w-3xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card text-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm hover:border-cyan-500/20 transition-colors duration-500">
                <div className="stat-value text-3xl font-black text-white mb-1 tracking-tight">{agentSlugs.length}</div>
                <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium">Agents</div>
              </div>
              <div className="stat-card text-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm hover:border-violet-500/20 transition-colors duration-500">
                <div className="stat-value text-3xl font-black text-white mb-1 tracking-tight">{comingSoonAgents.length}</div>
                <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium">Coming Soon</div>
              </div>
              <div className="stat-card text-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm hover:border-emerald-500/20 transition-colors duration-500">
                <div className="stat-value text-3xl font-black text-white mb-1 tracking-tight">{newsArticles.length}</div>
                <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium">Articles</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CATEGORY FILTER — tools page button style ═══ */}
      <section className="relative py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm ${selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white shadow-lg shadow-violet-600/15'
                  : 'bg-white/[0.03] text-gray-600 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.15] border border-white/[0.08]'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED ARTICLES — tools page card structure ═══ */}
      {featuredArticles.length > 0 && (
        <section className="relative py-16">
          <div className="container mx-auto px-4">

            {/* Section Header — exact tools page pattern */}
            <div className="section-header flex items-center gap-4 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Featured News</h2>
                <p className="text-sm text-gray-600">Top stories and announcements</p>
              </div>
            </div>

            {/* Featured Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredArticles.map((article) => (
                <div
                  key={article.id}
                  data-card-id={`featured-${article.id}`}
                  className="news-card group relative block cursor-pointer"
                  style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                  onMouseEnter={() => handleCardHover(`featured-${article.id}`, true)}
                  onMouseLeave={() => { handleCardHover(`featured-${article.id}`, false); handleCardLeave(`featured-${article.id}`) }}
                  onMouseMove={(e) => handleCardMove(e, `featured-${article.id}`)}
                  onClick={() => { setSelectedArticle(article); setShowArticleModal(true) }}
                >
                  {/* Outer glow on hover */}
                  <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${article.glow}, transparent 60%)`, filter: 'blur(1px)' }} />

                  <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">

                    {/* Mouse-follow shine overlay */}
                    <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                    {/* Top accent line */}
                    <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${article.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />

                    {/* Image area */}
                    <div className="h-40 flex items-center justify-center relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${article.glow.replace('0.4', '0.08')}, transparent 70%)` }}>
                      <div className="card-icon-wrap text-5xl group-hover:scale-110 transition-transform duration-500">
                        {article.image}
                      </div>
                    </div>

                    <div className="relative z-10 p-5">
                      {/* Date + read time */}
                      <div className="flex items-center gap-2 text-[13px] text-gray-600 mb-3">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{article.date}</span>
                        <span className="text-[11px] bg-white/[0.04] text-gray-500 px-2 py-0.5 rounded-full border border-white/[0.06]">
                          {article.readTime}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300 line-clamp-2">
                        {article.title}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-600 text-[13px] leading-relaxed mb-4 line-clamp-2 group-hover:text-gray-500 transition-colors duration-300">
                        {article.description}
                      </p>

                      {/* Action */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-cyan-400 transition-colors duration-300 uppercase tracking-wider">
                          Read More
                        </span>
                        <ArrowRight className="card-arrow w-4 h-4 text-gray-700 opacity-30 group-hover:text-cyan-400 transition-all duration-300" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ ALL ARTICLES — tools page card structure ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">

          {/* Section Header */}
          <div className="section-header flex items-center gap-4 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/15 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {selectedCategory === 'all' ? 'All News' : 'Latest News'}
              </h2>
              <p className="text-sm text-gray-600">Browse all articles and updates</p>
            </div>
          </div>

          {regularArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {regularArticles.map((article) => (
                <div
                  key={article.id}
                  data-card-id={`article-${article.id}`}
                  className="news-card group relative block cursor-pointer"
                  style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                  onMouseEnter={() => handleCardHover(`article-${article.id}`, true)}
                  onMouseLeave={() => { handleCardHover(`article-${article.id}`, false); handleCardLeave(`article-${article.id}`) }}
                  onMouseMove={(e) => handleCardMove(e, `article-${article.id}`)}
                  onClick={() => { setSelectedArticle(article); setShowArticleModal(true) }}
                >
                  {/* Outer glow on hover */}
                  <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${article.glow}, transparent 60%)`, filter: 'blur(1px)' }} />

                  <div className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">

                    {/* Mouse-follow shine overlay */}
                    <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                    {/* Top accent line */}
                    <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${article.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />

                    <div className="relative z-10">
                      {/* Icon */}
                      <div className="card-icon-wrap mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.08] text-2xl"
                          style={{
                            background: `linear-gradient(135deg, ${article.glow.replace('0.4', '0.25')}, rgba(139,92,246,0.15))`,
                            boxShadow: `0 0 20px ${article.glow.replace('0.4', '0.12')}, 0 0 40px ${article.glow.replace('0.4', '0.06')}, inset 0 1px 1px rgba(255,255,255,0.05)`,
                          }}
                        >
                          {article.image}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2 text-[13px] text-gray-600 mb-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{article.date}</span>
                        <span className="text-[11px] bg-white/[0.04] text-gray-500 px-2 py-0.5 rounded-full border border-white/[0.06]">
                          {article.readTime}
                        </span>
                      </div>

                      {/* Name */}
                      <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300 line-clamp-2" title={article.title}>
                        {article.title}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-600 text-[13px] leading-relaxed mb-4 line-clamp-2 group-hover:text-gray-500 transition-colors duration-300">{article.description}</p>

                      {/* Action */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-violet-400 transition-colors duration-300 uppercase tracking-wider">
                          Read
                        </span>
                        <ArrowRight className="card-arrow w-4 h-4 text-gray-700 opacity-30 group-hover:text-violet-400 transition-all duration-300" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No news articles in this category yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ ARTICLE MODAL ═══ */}
      {showArticleModal && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowArticleModal(false)} />
          <div className="relative bg-[#0a0a0f] border border-white/[0.08] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] max-w-2xl w-full max-h-[85vh] overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="text-3xl bg-white/[0.04] w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.06]">{selectedArticle.image}</div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedArticle.title}</h2>
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> {selectedArticle.date}
                    <span className="text-[11px] bg-white/[0.04] text-gray-500 px-2 py-0.5 rounded-full border border-white/[0.06] ml-2">{selectedArticle.readTime}</span>
                  </p>
                </div>
              </div>
              <button aria-label="Close" onClick={() => setShowArticleModal(false)} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[calc(85vh-64px)]">
              <p className="whitespace-pre-line text-gray-400 leading-relaxed">{selectedArticle.content || selectedArticle.description}</p>
              <div className="pt-4 border-t border-white/[0.06] flex justify-end">
                <button onClick={() => setShowArticleModal(false)} className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-sm text-gray-600 hover:text-white transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AVAILABLE AGENTS — tools page card structure ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">

          {/* Section Header */}
          <div className="section-header flex items-center gap-4 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600/20 to-green-600/20 border border-emerald-500/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Available Agents</h2>
              <p className="text-sm text-gray-600">Chat with our AI agents now</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {availableAgents.map((agent) => (
              <div
                key={agent.id}
                data-card-id={`agent-${agent.id}`}
                className="agent-card group relative block"
                style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                onMouseEnter={() => handleCardHover(`agent-${agent.id}`, true)}
                onMouseLeave={() => { handleCardHover(`agent-${agent.id}`, false); handleCardLeave(`agent-${agent.id}`) }}
                onMouseMove={(e) => handleCardMove(e, `agent-${agent.id}`)}
              >
                {/* Outer glow on hover */}
                <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.4), transparent 60%)', filter: 'blur(1px)' }} />

                <div className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">

                  {/* Mouse-follow shine overlay */}
                  <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                  {/* Top accent line */}
                  <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-40 transition-opacity duration-500" />

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="card-icon-wrap mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-cyan-400/30 text-2xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(6,182,212,0.15))',
                          boxShadow: '0 0 20px rgba(6,182,212,0.12), 0 0 40px rgba(6,182,212,0.06), inset 0 1px 1px rgba(255,255,255,0.05)',
                        }}
                      >
                        {agent.emoji}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300 truncate" title={agent.name}>
                      {agent.name}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 text-[13px] leading-relaxed mb-4 line-clamp-2 group-hover:text-gray-500 transition-colors duration-300">{agent.description}</p>

                    {/* Action */}
                    <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
                      <Link href={agent.path} className="flex-1 text-xs font-semibold text-gray-600 group-hover:text-cyan-400 transition-colors duration-300 uppercase tracking-wider flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}>
                        Launch
                        <ArrowRight className="card-arrow w-3.5 h-3.5 text-gray-700 opacity-30 group-hover:text-cyan-400 transition-all duration-300" />
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent); setShowAgentDetails(true) }}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-600 hover:text-white transition"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMING SOON AGENTS — tools page card structure ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">

          {/* Section Header */}
          <div className="section-header flex items-center gap-4 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/15 flex items-center justify-center">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Coming Soon Agents</h2>
              <p className="text-sm text-gray-600">New agents in development</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {comingSoonAgents.map((agent) => (
              <div
                key={agent.id}
                data-card-id={`coming-${agent.id}`}
                className="agent-card group relative block"
                style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                onMouseEnter={() => handleCardHover(`coming-${agent.id}`, true)}
                onMouseLeave={() => { handleCardHover(`coming-${agent.id}`, false); handleCardLeave(`coming-${agent.id}`) }}
                onMouseMove={(e) => handleCardMove(e, `coming-${agent.id}`)}
              >
                {/* Outer glow on hover */}
                <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.4), transparent 60%)', filter: 'blur(1px)' }} />

                <div className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">

                  {/* Mouse-follow shine overlay */}
                  <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                  {/* Top accent line */}
                  <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-40 transition-opacity duration-500" />

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="card-icon-wrap mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-violet-400/30 text-2xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(192,38,211,0.15))',
                          boxShadow: '0 0 20px rgba(139,92,246,0.12), 0 0 40px rgba(139,92,246,0.06), inset 0 1px 1px rgba(255,255,255,0.05)',
                        }}
                      >
                        {agent.emoji}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300 truncate" title={agent.name}>
                      {agent.name}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 text-[13px] leading-relaxed mb-4 line-clamp-2 group-hover:text-gray-500 transition-colors duration-300">{agent.description}</p>

                    {/* Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                      <span className="text-xs font-semibold text-gray-600 group-hover:text-violet-400 transition-colors duration-300 uppercase tracking-wider">
                        Coming Soon
                      </span>
                      <button
                        onClick={() => { setSelectedAgent(agent); setShowAgentDetails(true) }}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-600 hover:text-white transition"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AGENT DETAILS MODAL ═══ */}
      {showAgentDetails && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAgentDetails(false)} />
          <div className="relative bg-[#0a0a0f] border border-white/[0.08] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] max-w-2xl w-full max-h-[85vh] overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="text-4xl bg-white/[0.04] w-14 h-14 rounded-xl flex items-center justify-center border border-white/[0.06]">{selectedAgent.emoji}</div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedAgent.name}</h2>
                  <p className="text-gray-600 text-sm">{selectedAgent.description}</p>
                </div>
              </div>
              <button aria-label="Close" onClick={() => setShowAgentDetails(false)} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[calc(85vh-64px)]">
              {selectedAgent.specialties?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.specialties.map((s: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-full text-gray-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedAgent.details?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">How this agent works</h3>
                  <div className="space-y-4">
                    {selectedAgent.details.map((section: any, idx: number) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl" aria-hidden>{section.icon}</span>
                          <h4 className="font-semibold text-white">{section.title}</h4>
                        </div>
                        {section.items?.length ? (
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            {section.items.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-600">{section.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {selectedAgent.path ? 'How to Get Started' : 'Coming Soon'}
                </h3>
                {selectedAgent.path ? (
                  <>
                    <ol className="list-decimal list-inside text-gray-600 space-y-1">
                      <li>Open the agent and try a conversation using the Launch button.</li>
                      <li>Create an account or sign in when prompted.</li>
                      <li>Choose a subscription to unlock full features. You can manage or cancel anytime.</li>
                    </ol>
                    <div className="mt-3 flex gap-3">
                      <Link href="/overview/spaces" className="px-4 py-2 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-600/15">View Plans</Link>
                      <Link href={selectedAgent.path} className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-gray-400 hover:text-white transition">Launch Agent</Link>
                    </div>
                    <p className="text-amber-400/80 text-sm mt-3 bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2">💡 Pro tip: Our lowest subscription is just $1 — test an agent before committing to a larger plan.</p>
                  </>
                ) : (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                    <p className="text-gray-400 mb-3">
                      This agent is currently in development and will be available soon! Stay tuned for updates.
                    </p>
                    <div className="flex gap-3">
                      <Link href="/overview/spaces" className="px-4 py-2 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-600/15">View Current Plans</Link>
                      <Link href="https://sanbayfusion.com/agents" className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-gray-400 hover:text-white transition">Browse Available Agents</Link>
                    </div>
                    <p className="text-gray-500 text-sm mt-3">🔔 Sign up for our newsletter to be notified when new agents launch!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NEWSLETTER SECTION ═══ */}
      <section className="relative py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-8 md:p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/[0.04] border border-white/[0.06] rounded-2xl mb-4">
              <span className="text-2xl">📧</span>
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white tracking-tight">Stay Updated</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto text-sm">
              Subscribe to our newsletter to get the latest news, product updates, and industry insights delivered directly to your inbox.
            </p>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 text-white placeholder-gray-600 text-sm"
              />
              <button className="px-7 py-3 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-400">
                Subscribe
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-3">No spam, just quality news and updates.</p>
          </div>
        </div>
      </section>

      {/* ═══ CTA FOOTER — exact tools page pattern ═══ */}
      <section className="relative py-20 mt-8">
        {/* Subtle divider */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Explore More</h3>
          <p className="text-gray-600 mb-10 max-w-xl mx-auto text-sm">
            Check out our blog, join the community, or read our documentation
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/resources/blog"
              className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Read Blog
            </Link>
            <Link
              href="/community"
              className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Join Community
            </Link>
            <Link
              href="/resources/documentation"
              className="px-7 py-3.5 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-400 flex items-center justify-center gap-2"
            >
              View Documentation
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ GLOBAL STYLES — exact tools page match ═══ */}
      <style jsx global>{`
        /* Ultra-smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Subtle noise texture overlay on cards */
        .news-card::before,
        .agent-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 1rem;
          opacity: 0.015;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
      `}</style>
    </div>
  )
}
