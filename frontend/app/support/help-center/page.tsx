'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, CustomWiggle } from '@/lib/gsap';
import {
  BookOpen, Users, MessageSquare, Lightbulb, FileText, Video,
  ShoppingCart, BarChart3, Zap, Phone, Scroll, Map, HelpCircle, ArrowRight
} from 'lucide-react';

export default function HelpCenterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [animationsReady, setAnimationsReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    {
      category: 'Learning & Resources',
      cards: [
        { title: 'Documentation', description: 'Complete guides and API documentation for developers', icon: BookOpen, href: '/docs', color: 'from-blue-500 to-cyan-500', features: ['Getting Started', 'API Reference', 'Integration Guide'] },
        { title: 'Tutorials', description: 'Step-by-step tutorials for all agents and features', icon: Video, href: '/resources/tutorials', color: 'from-purple-500 to-pink-500', features: ['Agent Walkthroughs', 'Best Practices', 'Video Guides'] },
        { title: 'FAQ & Help', description: 'Answers to frequently asked questions', icon: FileText, href: '/support/faqs', color: 'from-green-500 to-emerald-500', features: ['Common Questions', 'Troubleshooting', 'Tips & Tricks'] },
        { title: 'Blog & Case Studies', description: 'Insights, case studies, and product updates', icon: Scroll, href: '/resources/blog', color: 'from-orange-500 to-red-500', features: ['Industry News', 'Success Stories', 'Use Cases'] }
      ]
    },
    {
      category: 'Community & Support',
      cards: [
        { title: 'Community', description: 'Connect with other users and get community support', icon: Users, href: '/community', color: 'from-pink-500 to-rose-500', features: ['Community Forum', 'Events', 'Networking'] },
        { title: 'Product Roadmap', description: "See what we're building next and share feedback", icon: Map, href: '/community/roadmap', color: 'from-indigo-500 to-purple-500', features: ['Upcoming Features', 'Status Updates', 'Public Roadmap'] },
        { title: 'Submit Ideas', description: 'Share feature requests and improvement ideas', icon: Lightbulb, href: '/community/suggestions', color: 'from-yellow-500 to-orange-500', features: ['Feature Requests', 'Improvements', 'Community Voting'] },
        { title: 'Live Support', description: 'Get real-time assistance from our support team', icon: MessageSquare, href: '/support/live-support', color: 'from-cyan-500 to-blue-500', features: ['Live Chat', 'Real-time Help', 'Expert Support'] }
      ]
    },
    {
      category: 'Services & Information',
      cards: [
        { title: 'Pricing Plans', description: 'Explore our pricing options and choose the right plan', icon: ShoppingCart, href: '/overview/spaces', color: 'from-red-500 to-rose-500', features: ['Per-Agent Pricing', 'Feature Comparison', 'Plans Overview'] },
        { title: 'Book Consultation', description: 'Schedule a one-on-one consultation with an expert', icon: Phone, href: '/support/book-consultation', color: 'from-emerald-500 to-teal-500', features: ['Expert Consultation', 'Personalized Support', 'Training'] },
        { title: 'Contact Us', description: 'Get in touch with our team for any inquiries', icon: Zap, href: '/support/contact-us', color: 'from-cyan-500 to-violet-500', features: ['Email Support', 'Contact Form', 'Response Guarantee'] },
        { title: 'Support Ticket', description: 'Submit a ticket for technical issues or problems', icon: BarChart3, href: '/support/create-ticket', color: 'from-teal-500 to-green-500', features: ['Issue Tracking', 'Priority Support', 'Ticket History'] }
      ]
    }
  ];

  const quickLinks = [
    { icon: '❓', label: 'FAQs', href: '/support/faqs', color: 'bg-brand-50 hover:bg-brand-100', textColor: 'text-brand-600' },
    { icon: '📚', label: 'Docs', href: '/docs', color: 'bg-accent-50 hover:bg-accent-100', textColor: 'text-accent-600' },
    { icon: '💬', label: 'Live Chat', href: '/support/live-support', color: 'bg-green-500/20 hover:bg-green-500/30', textColor: 'text-green-400' },
    { icon: '🎫', label: 'Ticket', href: '/support/create-ticket', color: 'bg-purple-500/20 hover:bg-purple-500/30', textColor: 'text-purple-400' }
  ];

  useEffect(() => {
    setAnimationsReady(true);
  }, []);

  useEffect(() => {
    if (!animationsReady || !containerRef.current) return;

    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        // Custom effects
        CustomWiggle.create('helpWiggle', { wiggles: 6, type: 'easeOut' });

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
          borderRadius: '50% 40% 60% 50% / 40% 60% 40% 60%',
          x: '+=20',
          y: '-=10',
          duration: 10,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 1
        });

        // Floating help icons
        const helpIcons = document.querySelectorAll('.help-particle');
        helpIcons.forEach((icon) => {
          gsap.set(icon, {
            x: Math.random() * 200 - 100,
            y: Math.random() * 200 - 100,
            scale: Math.random() * 0.5 + 0.5
          });

          gsap.to(icon, {
            y: `-=${Math.random() * 80 + 40}`,
            rotation: Math.random() * 30 - 15,
            duration: Math.random() * 5 + 4,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        });

        // Search bar entrance
        gsap.fromTo('.search-bar',
          { opacity: 0, scale: 0.8, y: 30 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.8,
            ease: 'back.out(2)',
            delay: 0.3
          }
        );

        // Search bar focus pulse
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
          searchInput.addEventListener('focus', () => {
            gsap.to('.search-bar', {
              boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.3)',
              scale: 1.02,
              duration: 0.3
            });
          });
          searchInput.addEventListener('blur', () => {
            gsap.to('.search-bar', {
              boxShadow: 'none',
              scale: 1,
              duration: 0.3
            });
          });
        }

        // Quick links entrance
        gsap.utils.toArray('.quick-link').forEach((link: any, i) => {
          gsap.fromTo(link,
            { opacity: 0, y: 30, scale: 0.8 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.5,
              ease: 'back.out(2)',
              scrollTrigger: { trigger: '.quick-links-container', start: 'top 85%' },
              delay: i * 0.1
            }
          );

          link.addEventListener('mouseenter', () => {
            gsap.to(link, { scale: 1.1, y: -5, duration: 0.2 });
          });

          link.addEventListener('mouseleave', () => {
            gsap.to(link, { scale: 1, y: 0, duration: 0.2 });
          });
        });

        // Section headers entrance
        gsap.utils.toArray('.section-header').forEach((header: any) => {
          gsap.fromTo(header,
            { opacity: 0, x: -50 },
            {
              opacity: 1,
              x: 0,
              duration: 0.6,
              ease: 'power2.out',
              scrollTrigger: { trigger: header, start: 'top 85%' }
            }
          );
        });

        // Resource cards entrance
        gsap.utils.toArray('.resource-card').forEach((card: any, i) => {
          gsap.fromTo(card,
            { opacity: 0, y: 30, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              ease: 'back.out(1.5)',
              scrollTrigger: { trigger: card, start: 'top 90%' },
              delay: (i % 4) * 0.1
            }
          );

          // Icon animation on hover
          const icon = card.querySelector('.card-icon-wrapper');
          card.addEventListener('mouseenter', () => {
            gsap.to(card, { y: -8, duration: 0.3 });
            gsap.to(icon, {
              scale: 1.15,
              rotation: 10,
              duration: 0.3,
              ease: 'helpWiggle'
            });
          });

          card.addEventListener('mouseleave', () => {
            gsap.to(card, { y: 0, duration: 0.3 });
            gsap.to(icon, { scale: 1, rotation: 0, duration: 0.3 });
          });

          // Feature tags stagger
          const features = card.querySelectorAll('.feature-tag');
          gsap.fromTo(features,
            { opacity: 0, x: -10 },
            {
              opacity: 1,
              x: 0,
              duration: 0.3,
              stagger: 0.1,
              scrollTrigger: { trigger: card, start: 'top 85%' },
              delay: 0.4 + (i % 4) * 0.1
            }
          );
        });

        // Pulsing rings
        gsap.to('.pulse-ring', {
          scale: 2,
          opacity: 0,
          duration: 2,
          repeat: -1,
          stagger: 0.6,
          ease: 'power2.out'
        });

        ScrollTrigger.refresh();
      }, containerRef);

      return () => ctx.revert();
    }, 50);

    return () => clearTimeout(timer);
  }, [animationsReady]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-hidden">
      {/* Nebula Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="absolute top-[50%] right-[15%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] left-[40%] w-[350px] h-[350px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Help Particles */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="help-particle fixed text-2xl opacity-15 pointer-events-none z-0"
          style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 60}%` }}
        >
          {['📚', '💡', '🔍', '📖', '✨'][i % 5]}
        </div>
      ))}

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[55vh] flex items-center justify-center py-20 px-4">
        {/* Gradient Orbs */}
        <div className="hero-orb absolute top-10 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="hero-orb absolute bottom-10 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="hero-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />

        {/* Floating Book */}
        <div className="floating-book absolute top-24 right-20 text-6xl opacity-60">
          📚
        </div>

        {/* Pulse Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="pulse-ring absolute w-32 h-32 rounded-full border-2 border-white/[0.06]" />
          <div className="pulse-ring absolute w-32 h-32 rounded-full border-2 border-white/[0.06]" />
          <div className="pulse-ring absolute w-32 h-32 rounded-full border-2 border-white/[0.06]" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Help Center</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Find everything you need to get the most out of Maula AI. Browse our documentation, tutorials, community resources, and support options.
          </p>

          {/* Search Bar */}
          <div className="search-bar relative max-w-2xl mx-auto bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles, tutorials, guides..."
              className="search-input w-full px-6 py-5 pl-14 bg-transparent text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 px-4">
        <div className="quick-links-container max-w-4xl mx-auto">
          <div className="relative p-6 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
            {/* Corner accents */}
            <div className="grid grid-cols-4 gap-4">
              {quickLinks.map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className={`quick-link text-center p-4 ${link.color} rounded-xl transition-colors cursor-pointer`}
                >
                  <div className="text-2xl mb-1">{link.icon}</div>
                  <div className={`text-sm font-semibold ${link.textColor}`}>{link.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Resource Sections */}
      {sections.map((section, sectionIndex) => (
        <section key={section.category} className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="section-header text-2xl font-bold text-white mb-8 pb-4 border-b border-white/[0.06] flex items-center gap-3">
              <span className="w-2 h-8 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
              {section.category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {section.cards.map((card, cardIndex) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="resource-card group relative block p-6 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] hover:border-white/[0.1] transition-all overflow-hidden"
                >
                  {/* Corner accents */}
                  <div className={`card-icon-wrapper w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-violet-300 transition-colors flex items-center gap-2">
                    {card.title}
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>

                  <p className="text-gray-400 text-sm mb-4">{card.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {card.features.map((feature, fi) => (
                      <span key={fi} className="feature-tag px-2 py-1 text-xs bg-white/10 rounded-full text-gray-500">
                        {feature}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Contact CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5" />

            <div className="relative z-10">
              <div className="text-5xl mb-4">🤝</div>
              <h2 className="text-2xl font-bold text-white mb-3">Can't find what you're looking for?</h2>
              <p className="text-gray-400 mb-6 max-w-xl mx-auto">
                Our support team is available 24/7 to help you with any questions or issues you might have.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/support/live-support"
                  className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-violet-600 rounded-xl font-semibold hover:from-violet-500 hover:to-purple-500 transition-all"
                >
                  💬 Start Live Chat
                </Link>
                <Link
                  href="/support/contact-us"
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
                >
                  ✉️ Send Message
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
