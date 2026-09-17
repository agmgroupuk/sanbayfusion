'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, DrawSVGPlugin, CustomEase, Observer, ScrambleTextPlugin } from '@/lib/gsap';

const faqs = [
  {
    q: 'What is Maula AI and what can I do with it?',
    a: 'Maula AI is an all-in-one AI platform with 20+ specialized AI agents, Canvas Studio for building and deploying web apps, and powerful creative tools. You can chat with unique AI personalities, generate code, build full-stack web apps, create images and videos, process data, and much more — all from one place at maula.ai and spaces.maula.ai.'
  },
  {
    q: 'How do the AI agents work?',
    a: 'Each agent has a unique personality, specialization, and voice. Character agents (Julie, Emma, Comedy King, Drama Queen) are great for role-playing, while utility agents (Ben Sega for coding, Einstein for science, Tech Wizard for architecture) are built for productivity. Every agent has persistent memory — it learns your name, preferences, and goals across conversations — so your experience gets better over time.'
  },
  {
    q: 'What is Canvas Studio?',
    a: 'Canvas Studio is an AI-powered web app builder where you describe what you want and the AI generates, edits, and deploys full-stack applications for you. It includes a code editor, multi-file project management, live preview, and one-click deployment. You can build complete websites, apps, and tools without writing code yourself.'
  },
  {
    q: 'What tools can agents use for me?',
    a: 'Agents can run code, search the web, generate AI images in multiple styles, edit images, read and parse documents (PDF, DOCX, CSV, Excel), generate and convert videos, transcribe audio, create data reports and visualizations, scrape websites, and manage files — all within your conversation. Just ask and the agent handles the details.'
  },
  {
    q: 'How much does it cost?',
    a: 'Simple per-agent pricing with no subscriptions: $1/day, $10→$5/week, $30→$15/month, or $300→$150/year per agent — enjoy our 50% OFF Welcome Gift! Each one-time purchase unlocks full access to one specific agent for the chosen duration. No auto-renewal, no hidden fees — your access simply expires and you can repurchase whenever you want.'
  },
  {
    q: 'Do agents have voice capabilities?',
    a: 'Yes! Most agents have emotion-aware text-to-speech with their own unique voice. The system detects emotion from the conversation — joyful, dramatic, calm, funny, and more — and adjusts the voice delivery accordingly. Just click the speaker icon on any message to hear it spoken aloud.'
  },
  {
    q: 'Is my data private and secure?',
    a: 'Yes. All data is encrypted in transit and at rest. Passwords are securely hashed and never stored in plaintext. Any credentials you store (deploy tokens, API keys) are encrypted with AES-256-GCM. We never sell your data, we do not use third-party tracking cookies, and we comply with GDPR, CCPA/CPRA, and CalOPPA. See our Privacy Policy and Cookie Policy for full details.'
  },
  {
    q: 'What are my rights over my data?',
    a: 'You have full control. You can access, export (JSON), correct, or delete your personal data at any time. AI agent memories about your preferences can be individually viewed, disabled, or deleted. If you delete your account, all your data (projects, chats, memories, credentials) is permanently removed within 30 days. Contact privacy@maula.ai for any data request.'
  },
];

export default function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const faqsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('faqSmooth', 'M0,0 C0.19,1 0.22,1 0.4,1 0.62,1 0.7,0.98 1,1');
    const ctx = gsap.context(() => {
      /* ── Title: whole-element blur entrance (no SplitText) ── */
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 30, filter: 'blur(12px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── FAQ ITEMS: Staggered slide-in with DrawSVG border + ScrambleText question ───
      if (faqsRef.current) {
        const items = faqsRef.current.querySelectorAll('.faq-item');
        items.forEach((item, i) => {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: faqsRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
          });

          // Slide in with clip-path + scale
          tl.fromTo(item,
            { opacity: 0, x: 100, scale: 0.9, clipPath: 'inset(0 100% 0 0)' },
            { opacity: 1, x: 0, scale: 1, clipPath: 'inset(0 0 0 0)', duration: 0.7, delay: i * 0.08, ease: 'faqSmooth' }
          );

          // DrawSVG border animation
          const svgBorder = item.querySelector('.faq-border-svg line');
          if (svgBorder) {
            tl.fromTo(svgBorder,
              { drawSVG: '0%' },
              { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut' },
              '-=0.5'
            );
          }

          // ScrambleText for question text on scroll
          const questionBtn = item.querySelector('button span:first-child');
          if (questionBtn) {
            const text = questionBtn.textContent || '';
            tl.to(questionBtn, {
              duration: 0.5,
              scrambleText: { text, chars: '?!@#$%ABCxyz', speed: 0.6 },
            }, '-=0.5');
          }

          // Observer: subtle tilt on hover
          const el = item as HTMLElement;
          el.addEventListener('mouseenter', () => gsap.to(el, { x: 6, scale: 1.01, duration: 0.3, ease: 'power2.out' }));
          el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, scale: 1, duration: 0.4, ease: 'elastic.out(1,0.5)' }));
        });
      }

      /* ── CTA button entrance ── */
      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: ctaRef.current, start: 'top 92%', toggleActions: 'play none none reverse' }
          }
        );
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const toggleFAQ = (index: number) => {
    if (openIndex === index) {
      // Close
      const answer = document.querySelector(`#faq-answer-${index}`) as HTMLElement;
      if (answer) {
        gsap.to(answer, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.inOut' });
      }
      setOpenIndex(null);
    } else {
      // Close previous
      if (openIndex !== null) {
        const prev = document.querySelector(`#faq-answer-${openIndex}`) as HTMLElement;
        if (prev) gsap.to(prev, { height: 0, opacity: 0, duration: 0.2, ease: 'power2.in' });
      }
      // Open new
      setOpenIndex(index);
      setTimeout(() => {
        const answer = document.querySelector(`#faq-answer-${index}`) as HTMLElement;
        if (answer) {
          gsap.set(answer, { height: 'auto', opacity: 1 });
          const h = answer.offsetHeight;
          gsap.fromTo(answer, { height: 0, opacity: 0 }, { height: h, opacity: 1, duration: 0.4, ease: 'power2.out' });
        }
      }, 10);
    }
  };

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-16 overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
                <span className="text-cyan-300 text-sm font-medium">❓ FAQ</span>
              </div>
              <h2 ref={titleRef} className="text-4xl md:text-6xl font-bold bg-gradient-to-b from-white via-cyan-100 to-blue-300/60 bg-clip-text text-transparent leading-tight mb-4">
                Questions & Answers
              </h2>
              <p className="text-gray-400 text-lg">Everything you need to know about Maula AI.</p>
            </div>

            <div ref={faqsRef} className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="faq-item relative">
                  {/* DrawSVG left border accent */}
                  <svg className="faq-border-svg absolute left-0 top-0 h-full w-1 overflow-visible" preserveAspectRatio="none">
                    <line x1="2" y1="0" x2="2" y2="100%" stroke="url(#faqGrad)" strokeWidth="3" strokeLinecap="round" />
                    <defs><linearGradient id="faqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
                  </svg>

                  <div className="ml-3 backdrop-blur-xl rounded-xl hover:border-cyan-500/30 transition-all duration-300 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(0,0,0,0.25))', border: '1px solid rgba(6,182,212,0.13)', boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => toggleFAQ(i)}
                      className="w-full text-left p-5 flex items-center justify-between gap-4 group"
                    >
                      <span className="text-white font-medium text-sm sm:text-base group-hover:text-cyan-300 transition-colors">{faq.q}</span>
                      <span className={`text-cyan-400 transition-transform duration-300 shrink-0 ${openIndex === i ? 'rotate-45' : ''}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </span>
                    </button>
                    <div id={`faq-answer-${i}`} className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
                      <p className="px-5 pb-5 text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div ref={ctaRef} className="text-center mt-10">
              <Link
                href="https://maula.ai/support/faqs"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-lg shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] hover:scale-105 transition-all duration-300"
              >
                View All FAQs
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
