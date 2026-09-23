'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, CustomWiggle, Flip } from '@/lib/gsap';

export default function FAQsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [animationsReady, setAnimationsReady] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Getting Started');
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      category: 'Getting Started',
      icon: '🚀',
      color: 'from-blue-500 to-cyan-500',
      questions: [
        { q: 'What is Sanbay Fusion?', a: 'Sanbay Fusion is a comprehensive AI platform with 20+ specialized AI agents, Canvas Studio for building full-stack web apps, and powerful creative tools for images, video, audio, and data. Access it through sanbayfusion.com and spaces.sanbayfusion.com (Canvas App, Canvas Studio, GenCraft Pro, and Maula Editor).' },
        { q: 'How do I get started?', a: 'Create your account, browse our AI agents, and choose the one that fits your needs. Purchase access for $1/day, $5/week, or $15/month. Once purchased, start chatting with your agent immediately — no setup required.' },
        { q: 'What can I do with AI agents?', a: 'Chat with unique AI personalities, get help with coding, science, cooking, fitness, travel, entertainment, and more. Agents can generate code, create images, process documents, build web apps, and remember your preferences across conversations.' },
        { q: 'What is Canvas Studio?', a: 'Canvas Studio is our AI-powered web app builder. Describe what you want, and the AI generates, edits, and deploys full-stack applications for you. It includes a code editor, project management, live preview, and one-click deployment.' },
        { q: 'Do I need technical skills?', a: 'Not at all! Sanbay Fusion is designed for everyone. Non-technical users can chat with agents naturally, while developers can use Canvas Studio and GenCraft Pro for advanced projects. We provide tutorials for all skill levels.' },
        { q: 'What agents are available?', a: 'We offer 20+ AI agents including Einstein (Physics & Math), Tech Wizard (Programming), Chef Biew (Cooking), Fitness Guru (Health), Travel Buddy (Travel), Comedy King (Entertainment), Emma (Emotional Support), and specialized agents for business, education, and creativity.' }
      ]
    },
    {
      category: 'Studio & Canvas',
      icon: '🎨',
      color: 'from-purple-500 to-pink-500',
      questions: [
        { q: 'What apps are available?', a: 'We offer four applications: Canvas App (AI web-app builder), Canvas Studio (advanced AI builder with live preview and deployment), GenCraft Pro (full IDE with dual editors and terminal), and Maula Editor (professional IDE at spaces.sanbayfusion.com). Each is designed for different use cases and skill levels.' },
        { q: 'How does Canvas code generation work?', a: 'Ask an agent to create an app, webpage, or code snippet. The AI generates working code that renders live in the preview panel, allowing you to see and interact with your creations in real-time. You can iterate on the design through conversation.' },
        { q: 'What can Canvas generate?', a: 'Canvas can generate React applications, HTML/CSS pages, interactive components, data visualizations, forms, dashboards, games, and more. The generated code is fully functional and can be exported or deployed directly.' },
        { q: 'Can I deploy my projects?', a: 'Yes! Canvas Studio and GenCraft Pro support one-click deployment. You can deploy your projects directly from the platform to make them available online.' },
        { q: 'Is conversation history saved?', a: 'Yes. All your conversations are automatically saved and synced to your account. You can access previous conversations and continue where you left off at any time. Chat history is stored securely in our database, not in your browser.' },
        { q: 'Do agents remember my preferences?', a: 'Yes! Every agent has persistent memory. It learns your name, preferences, coding style, and goals across conversations. You can view, disable, or delete individual memories at any time through the Agent Memory panel.' }
      ]
    },
    {
      category: 'Billing & Pricing',
      icon: '💳',
      color: 'from-green-500 to-emerald-500',
      questions: [
        { q: 'What are the pricing plans?', a: 'Simple per-agent pricing: $1/day, $5/week, or $15/month. Each one-time purchase gives you full access to one specific AI agent for the chosen duration. No subscriptions, no auto-renewal — pay only when you want access.' },
        { q: 'What does "per agent" pricing mean?', a: 'Each purchase unlocks one specific agent. If you want access to multiple agents, purchase them separately. This lets you choose exactly what you need — buy Einstein for a day of math help, or get monthly access to Tech Wizard for ongoing coding projects.' },
        { q: 'What\'s included in each purchase?', a: 'Every purchase includes: unlimited chat sessions with your chosen agent, Canvas code generation, conversation history sync across devices, agent memory (the AI remembers your preferences), and all features of that specific agent for the duration.' },
        { q: 'Is there auto-renewal?', a: 'No. There are no subscriptions or auto-renewals. Your access simply expires at the end of the purchased period. You keep full access until expiration and can repurchase whenever you want. No cancellation needed.' },
        { q: 'Do you offer refunds?', a: 'Yes. Please see our Payments & Refunds policy at sanbayfusion.com/legal/payments-refunds for full refund details, timelines, and how to submit a request. Contact support@sanbayfusion.com for refund inquiries.' },
        { q: 'What payment methods do you accept?', a: 'Payment methods will be announced when the new billing system launches.' }
      ]
    },
    {
      category: 'Account & Security',
      icon: '🔒',
      color: 'from-orange-500 to-red-500',
      questions: [
        { q: 'Is my data secure?', a: 'Yes. All data is encrypted in transit (TLS 1.2/1.3) and at rest (AES-256). Passwords are securely hashed and never stored in plaintext. Any credentials you store (deploy tokens, API keys) are encrypted with AES-256-GCM. Your account is protected by progressive lockout after failed login attempts.' },
        { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page. You\'ll receive a secure reset link via email. For additional security, your account is automatically locked after multiple failed login attempts.' },
        { q: 'Can I export my data?', a: 'Yes. You can request a full export of your personal data in JSON format by contacting privacy@sanbayfusion.com. This includes your account data, conversation history, agent memories, and project files. We will process your request within 30 days.' },
        { q: 'What happens if I delete my account?', a: 'All personal data — including account information, conversations, projects, agent memories, and stored credentials — is permanently deleted within 30 days. You can also request immediate deletion of specific data. We retain only minimal anonymised metadata as required by law.' },
        { q: 'Does Sanbay Fusion use my data for AI training?', a: 'No. We do NOT use your data to train AI models. Your prompts and generated code are used solely to provide the service you requested. See our Privacy Policy for full details on how your data is handled.' },
        { q: 'How do I delete specific conversations or memories?', a: 'In the chat interface, you can delete individual conversations. Agent memories can be viewed and individually deleted through the Agent Memory panel. Deleted data cannot be recovered.' }
      ]
    },
    {
      category: 'Privacy & Policies',
      icon: '📋',
      color: 'from-indigo-500 to-violet-500',
      questions: [
        { q: 'What data do you collect?', a: 'We collect your email, a securely hashed password, optional profile info (display name, avatar), and data you create on the platform (chats, projects, agent memories). We also collect anonymous usage analytics (page views, session data) through our own first-party system — no Google Analytics or third-party trackers.' },
        { q: 'Do you sell my data?', a: 'No. We do NOT sell personal information. We do NOT share data for advertising. We do not use third-party tracking cookies, pixels, or ad networks. See our Privacy Policy at sanbayfusion.com/legal/privacy-policy for complete details.' },
        { q: 'What cookies does Sanbay Fusion use?', a: 'We use only 3 essential cookies for authentication (neural_link_session, neural_token, session_id) — all HTTP-only and secure. No marketing cookies, no analytics cookies, no third-party cookies. We also store some preferences in your browser\'s localStorage (theme, selected model). See our Cookie Policy at sanbayfusion.com/legal/cookie-policy.' },
        { q: 'Are you GDPR and CCPA compliant?', a: 'Yes. We comply with GDPR (EU/EEA/UK), CCPA/CPRA (California), and CalOPPA. You have the right to access, correct, export, and delete your data. You can exercise any of these rights by emailing privacy@sanbayfusion.com — we respond within 30-45 days as required by law.' },
        { q: 'What are my data rights?', a: 'You can: access and download your data, correct inaccurate information, request deletion of all your data, export data in JSON format, object to processing, and control AI agent memories. For GDPR requests: dpo@sanbayfusion.com. For CCPA requests: privacy@sanbayfusion.com.' },
        { q: 'Where is my data stored?', a: 'Your data is stored in encrypted application databases and file storage. Files you upload are stored securely with encryption.' }
      ]
    },
    {
      category: 'Features & Usage',
      icon: '✨',
      color: 'from-teal-500 to-cyan-500',
      questions: [
        { q: 'How many conversations can I have?', a: 'Unlimited. Create as many chat sessions as you want with any agent you have access to. All conversations are saved automatically and accessible from your dashboard.' },
        { q: 'Do agents have voice?', a: 'Yes! Most agents have emotion-aware text-to-speech with their own unique voice. The system detects emotion from the conversation and adjusts the voice delivery accordingly. Click the speaker icon on any message to hear it spoken.' },
        { q: 'What creative tools are available?', a: 'Agents can generate AI images in multiple styles, create and convert videos, transcribe audio, process documents (PDF, DOCX, CSV, Excel, JSON, XML), create data visualizations and reports, and scrape websites — all within your conversation.' },
        { q: 'Can I use it on mobile?', a: 'Yes! Our web app is fully responsive and works great on mobile browsers. You can access all features — chat, Canvas, and project management — from your phone or tablet.' },
        { q: 'Can I use outputs for commercial purposes?', a: 'Yes. All paid agent access includes commercial usage rights. You can use agent outputs (code, content, images) in your products, services, or business operations. AI-generated content should be reviewed before production use.' },
        { q: 'What happens when my access expires?', a: 'Your chat history, projects, and agent memories are preserved — you don\'t lose anything. You simply won\'t be able to send new messages to that agent until you purchase more access. Buy more time whenever you\'re ready.' }
      ]
    }
  ];

  const handleCategoryChange = (category: string) => {
    // Use Flip for smooth category transition
    const state = Flip.getState('.faq-list');
    setActiveCategory(category);
    setOpenFAQ(null);

    requestAnimationFrame(() => {
      Flip.from(state, {
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.05
      });
    });
  };

  const toggleFAQ = (question: string) => {
    const newOpen = openFAQ === question ? null : question;
    setOpenFAQ(newOpen);

    // Animate answer expansion
    const answerEl = document.querySelector(`[data-question="${question}"]`);
    if (answerEl) {
      if (newOpen) {
        gsap.from(answerEl, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    }
  };

  const filteredFAQs = faqs.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      q => searchQuery === '' ||
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  useEffect(() => {
    setAnimationsReady(true);
  }, []);

  useEffect(() => {
    if (!animationsReady || !containerRef.current) return;

    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        // Custom effects
        CustomWiggle.create('faqWiggle', { wiggles: 4, type: 'easeOut' });

        // Hero orbs
        gsap.fromTo('.hero-orb',
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 0.4,
            duration: 2,
            ease: 'elastic.out(1, 0.5)',
            stagger: 0.3
          }
        );

        gsap.to('.hero-orb', {
          borderRadius: '40% 60% 60% 40% / 60% 40% 60% 40%',
          duration: 10,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

        // Question mark particles
        const questionMarks = document.querySelectorAll('.question-particle');
        questionMarks.forEach((mark) => {
          gsap.set(mark, {
            x: Math.random() * 300 - 150,
            y: Math.random() * 200 - 100,
            rotation: Math.random() * 40 - 20
          });

          gsap.to(mark, {
            y: `-=${Math.random() * 80 + 40}`,
            rotation: `+=${Math.random() * 30 - 15}`,
            duration: Math.random() * 5 + 4,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        });

        // Search bar entrance
        gsap.fromTo('.search-bar',
          { opacity: 0, y: 30, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            ease: 'back.out(1.7)',
            delay: 0.3
          }
        );

        // Category tabs
        gsap.utils.toArray('.category-tab').forEach((tab: any, i) => {
          gsap.fromTo(tab,
            { opacity: 0, x: -30 },
            {
              opacity: 1,
              x: 0,
              duration: 0.4,
              ease: 'power2.out',
              scrollTrigger: { trigger: '.categories-container', start: 'top 85%' },
              delay: i * 0.1
            }
          );

          tab.addEventListener('mouseenter', () => {
            gsap.to(tab, { scale: 1.05, x: 10, duration: 0.2 });
            gsap.to(tab.querySelector('.tab-icon'), {
              rotation: 15,
              scale: 1.2,
              duration: 0.3,
              ease: 'faqWiggle'
            });
          });

          tab.addEventListener('mouseleave', () => {
            gsap.to(tab, { scale: 1, x: 0, duration: 0.2 });
            gsap.to(tab.querySelector('.tab-icon'), { rotation: 0, scale: 1, duration: 0.2 });
          });
        });

        // FAQ items entrance
        gsap.utils.toArray('.faq-item').forEach((item: any, i) => {
          gsap.fromTo(item,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: 'power2.out',
              scrollTrigger: { trigger: item, start: 'top 90%' },
              delay: i * 0.05
            }
          );
        });

        // Stat counters
        gsap.utils.toArray('.stat-counter').forEach((counter: any) => {
          gsap.from(counter, {
            textContent: 0,
            duration: 2,
            ease: 'power2.out',
            snap: { textContent: 1 },
            scrollTrigger: { trigger: counter, start: 'top 85%' }
          });
        });

        ScrollTrigger.refresh();
      }, containerRef);

      return () => ctx.revert();
    }, 50);

    return () => clearTimeout(timer);
  }, [animationsReady]);

  const currentCategory = faqs.find(f => f.category === activeCategory) || faqs[0];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-hidden">
      {/* Nebula Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="absolute top-[50%] right-[15%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] left-[40%] w-[350px] h-[350px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Question Mark Particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="question-particle fixed text-3xl opacity-15 pointer-events-none z-0"
          style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 60}%` }}
        >
          ❓
        </div>
      ))}

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[50vh] flex items-center justify-center py-20 px-4">
        {/* Gradient Orbs */}
        <div className="hero-orb absolute top-10 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="hero-orb absolute bottom-10 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />

        {/* Floating Question */}
        <div className="floating-question absolute top-24 right-20 text-7xl opacity-60">
          ❓
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Frequently Asked Questions</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
            Find answers to common questions about Sanbay Fusion, our agents, and features.
          </p>

          {/* Search Bar */}
          <div className="search-bar relative max-w-xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full px-6 py-4 pl-14 bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            <div className="relative text-center p-4 bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden">
              {/* Corner accents */}
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                <span className="stat-counter" data-target="36">36</span>+
              </div>
              <p className="text-gray-400 text-sm mt-1">Questions Answered</p>
            </div>
            <div className="relative text-center p-4 bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden">
              {/* Corner accents */}
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                <span className="stat-counter" data-target="6">6</span>
              </div>
              <p className="text-gray-400 text-sm mt-1">Categories</p>
            </div>
            <div className="relative text-center p-4 bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden">
              {/* Corner accents */}
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                24/7
              </div>
              <p className="text-gray-400 text-sm mt-1">Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Category Sidebar */}
            <div className="categories-container lg:w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-2">
                {faqs.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => handleCategoryChange(cat.category)}
                    className={`category-tab w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeCategory === cat.category
                        ? 'bg-gradient-to-r ' + cat.color + ' text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                  >
                    <span className="tab-icon text-xl">{cat.icon}</span>
                    <span className="font-medium">{cat.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ List */}
            <div className="flex-1">
              <div className="faq-list space-y-4">
                {(searchQuery ? filteredFAQs : [currentCategory]).map((cat) => (
                  <div key={cat.category}>
                    {searchQuery && (
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.category}</span>
                      </h3>
                    )}
                    {cat.questions.map((faq, i) => (
                      <div
                        key={faq.q}
                        className="faq-item relative bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden mb-4"
                      >
                        {/* Corner accents */}
                        <button
                          onClick={() => toggleFAQ(faq.q)}
                          className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                        >
                          <span className="font-medium text-white pr-4">{faq.q}</span>
                          <span
                            className={`text-xl transition-transform duration-300 ${openFAQ === faq.q ? 'rotate-180' : ''
                              }`}
                          >
                            ⌄
                          </span>
                        </button>
                        {openFAQ === faq.q && (
                          <div
                            data-question={faq.q}
                            className="px-5 pb-5 text-gray-400 leading-relaxed border-t border-white/5"
                          >
                            <p className="pt-4">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {searchQuery && filteredFAQs.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
                    <p className="text-gray-400">Try a different search term or browse categories</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Still Need Help */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 bg-gradient-to-r from-violet-900/30 to-purple-900/30 rounded-2xl border border-violet-500/30 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-2xl font-bold text-white mb-3">Still have questions?</h2>
            <p className="text-gray-400 mb-6">Can't find what you're looking for? Our support team is here to help.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/support/live-support"
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors"
              >
                Chat with Luna
              </Link>
              <Link
                href="/support/create-ticket"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
              >
                Create Ticket
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
