'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, Observer } from '@/lib/gsap';
import Link from 'next/link';
import { FileText, Gavel, AlertTriangle, Users, Ban, CheckCircle, Scale, ArrowLeft, ChevronDown, Shield, Clock, XCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, Observer);

interface TwinklingStar { x: number; y: number; size: number; opacity: number; speed: number; phase: number; color: string; }

export default function TermsOfServicePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<TwinklingStar[]>([]);
  const animFrameRef = useRef<number>(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const sections = [
    {
      id: 'acceptance', icon: CheckCircle, title: 'Acceptance of Terms', glow: 'rgba(139,92,246,0.4)', content: [
        { subtitle: 'Agreement to Terms', text: 'By accessing or using any Maula AI service — including maula.ai, spaces.maula.ai, Canvas App, Canvas Studio, GenCraft Pro, and Maula Editor — you agree to be bound by these Terms of Service. If you disagree with any part, you may not access our services.' },
        { subtitle: 'Eligibility', text: 'You must be at least 18 years old to use our services. By using Maula AI, you represent that you meet this age requirement and have the legal capacity to enter into a binding agreement.' },
        { subtitle: 'Modifications', text: 'We reserve the right to modify these terms at any time. We will notify users of significant changes via email or platform notification at least 30 days before they take effect. Continued use after changes constitutes acceptance.' },
        { subtitle: 'Additional Terms', text: 'Certain features (e.g., Maula Editor at spaces.maula.ai, Canvas Studio deployments, agent subscriptions) may be subject to additional terms or guidelines. Such additional terms are incorporated by reference into these Terms of Service.' },
      ]
    },
    {
      id: 'services', icon: Scale, title: 'Service Description', glow: 'rgba(6,182,212,0.4)', content: [
        { subtitle: 'Platform Overview', text: 'Maula AI operates maula.ai and spaces.maula.ai, providing four applications: Canvas App (AI web-app builder, 20 panels, CodeMirror 6), Canvas Studio (AI builder with Sandpack and CloudPreview via AWS ECS), GenCraft Pro (full IDE with dual editors, Monaco + CodeMirror 6, xterm.js terminal), and Maula Editor (professional IDE with NestJS server, 54 components, 50 services). The shared backend offers 268 AI tools across 39 categories.' },
        { subtitle: 'Access Model — Per-Agent Pricing', text: 'Agent access is sold as one-time purchases (not recurring subscriptions): $1/day, $10→$5/week (50% OFF Welcome Gift, save 29%), $30→$15/month (50% OFF, save 37%), or $300→$150/year (50% OFF, save 59%) per agent. Each purchase unlocks one specific agent for the selected duration. All agent plans include unlimited conversations, real-time AI responses, voice interaction, agent memory, and analytics. Purchases do not automatically renew. No hidden fees, no free-tier data harvesting, no advertising-based monetisation.' },
        { subtitle: 'GenCraft Pro Pricing', text: 'GenCraft Pro — our full-featured IDE — offers one-time purchase plans (no auto-renewal): $14→$7/week (50% OFF Welcome Gift), $38→$19/month (50% OFF, Most Popular), or $240→$120/year ($10/month, 50% OFF, Best Value). Every plan includes: 9+ AI providers, 40+ programming languages, Sandpack live preview, Monaco + CodeMirror 6 dual editors, 35+ AI tools, deployment to 5 platforms (Vercel, Netlify, GitHub Pages, AWS, custom), image-to-code analysis, AI video generation, and unlimited generations.' },
        { subtitle: 'Canvas Studio Pricing', text: 'Canvas Studio — our AI builder with Sandpack live preview and CloudPreview via AWS ECS — offers one-time purchase plans (no auto-renewal): $20→$10/week (50% OFF Welcome Gift), $60→$30/month (50% OFF, Most Popular), or $600→$300/year ($25/month, 50% OFF, Best Value). Every plan includes: AI-powered code generation, Sandpack live preview, cloud sandbox execution, real-time collaboration, and unlimited generations.' },
        { subtitle: 'Spaces Credit System', text: 'Maula AI Spaces (spaces.maula.ai) uses a transparent credit-based system across four applications: Neural Chat, Canvas Studio, GenCraft Pro, and Maula Editor. Credit packs (one-time purchase, no auto-renewal): Starter ($5 → 10 credits), Pro ($20 → 55 credits with 5 bonus), Power ($35 → 115 credits with 15 bonus), Enterprise ($150 → 600 credits with 100 bonus). 1 credit = $0.10 USD. Credits never expire and there are no subscriptions. Credit costs per action: standard chat 0.01–0.15 credits, advanced chat 0.15–0.75 credits, HD image generation ~0.80 credits, AI video generation 5–8 credits, text-to-speech ~0.15 credits per 1,000 characters, code generation 0.03–0.50 credits, image-to-code 0.10–0.30 credits, web search 0.05–0.20 credits.' },
        { subtitle: 'AI Providers — Our Own API Keys', text: 'Our services integrate with multiple AI providers, all accessed through Maula AI\u2019s own paid API accounts and API keys. You never connect directly to third-party AI APIs — all requests are proxied through our secure backend infrastructure. Current providers include: Anthropic (Claude Sonnet 4, Claude Opus 4, Claude Haiku — our primary provider for chat, code, and agent intelligence), OpenAI (GPT-4o, GPT-4o-mini for chat; DALL\u00b7E 3 for images; Whisper for speech-to-text; TTS for text-to-speech), Google (Gemini 2.5 Pro and Gemini 2.5 Flash), Mistral AI (Mistral Large, Codestral), xAI (Grok 3), Groq (LLaMA 3.3 70B hardware-accelerated inference), Cerebras (ultra-fast inference), HuggingFace (open-source model inference), fal.ai (AI video generation — Minimax, Kling, Hunyuan), Azure AI Vision (image-to-code analysis), and optionally Ollama (local/self-hosted — runs entirely on your device). Provider availability may change. We do not guarantee any specific AI model will remain available indefinitely.' },
        { subtitle: 'Service Availability', text: 'We strive for high availability but do not guarantee uninterrupted service. Scheduled maintenance and updates may temporarily affect access. Sandboxed execution environments (AWS ECS Fargate) are provisioned per session and may have resource limits.' },
      ]
    },
    {
      id: 'data-protection', icon: Shield, title: 'Data Protection Commitments', glow: 'rgba(16,185,129,0.4)', content: [
        { subtitle: 'We NEVER Sell Your Data', text: 'Maula AI does NOT sell, rent, lease, or trade your personal information, usage data, AI interaction data, or any other data to any third party under any circumstances. This commitment is absolute and applies to all data categories as defined by CCPA \u00a7 1798.140(ad) and CPRA. Our revenue comes exclusively from agent subscriptions — never from your data.' },
        { subtitle: 'We NEVER Use Your Data for AI Training', text: 'Your prompts, code, generated outputs, conversation history, agent memories, project files, and all other content are NEVER used to train, fine-tune, improve, or evaluate any AI model — not by Maula AI and not by any of our AI providers under our commercial API agreements. Anthropic, OpenAI, Google, Mistral, xAI, Groq, Cerebras, and HuggingFace all operate under commercial API terms that prohibit using API inputs for model training.' },
        { subtitle: 'Your Identity Is Shielded from AI Providers', text: 'All AI requests are made using our API keys from our servers. AI providers see "Maula AI" as the client, never individual users. Your email, name, IP address, payment details, and all other personal identifiers are never sent to any AI provider. This architectural design ensures your privacy is protected at the infrastructure level.' },
        { subtitle: 'Encryption & Security', text: 'All data in transit is encrypted with TLS 1.2/1.3. User credentials and deploy tokens are encrypted with AES-256-GCM at the application level. Passwords are hashed with bcrypt. Payment data is handled exclusively by Stripe (PCI DSS Level 1) and never touches our servers. Code execution runs in isolated AWS ECS Fargate containers.' },
        { subtitle: 'Your Control Over Your Data', text: 'You can: export all your data in JSON/CSV format, delete individual projects or entire account data, view and delete AI agent memories at any time, disable agent memory auto-saving, request a complete data erasure via privacy@maula.ai. We comply with GDPR, CCPA/CPRA, CalOPPA, COPPA, PDPA Thailand, PDPA Singapore, and UAE PDPL.' },
        { subtitle: 'International Data Protection Compliance', text: 'In addition to GDPR and CCPA/CPRA, we comply with: PDPA Thailand (Personal Data Protection Act B.E. 2562, 2019) — we respect all data subject rights under Sections 30–35, obtain consent where required, and ensure cross-border transfers comply with Section 28. PDPA Singapore (Personal Data Protection Act 2012) — we meet all nine obligations including Consent, Purpose Limitation, Notification, Access, Correction, Accuracy, Protection, Retention Limitation, and Transfer Limitation. UAE PDPL (Federal Decree-Law No. 45 of 2021) — we comply with data subject rights, cross-border transfer requirements, and conduct Data Protection Impact Assessments where required. Users in these jurisdictions may exercise all applicable rights by contacting privacy@maula.ai.' },
      ]
    },
    {
      id: 'user-accounts', icon: Users, title: 'User Accounts & Responsibilities', glow: 'rgba(16,185,129,0.4)', content: [
        { subtitle: 'Account Creation', text: 'You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials. Your account works across maula.ai and spaces.maula.ai via your Maula AI User ID.' },
        { subtitle: 'Account Security', text: 'You are responsible for all activities under your account. Notify us immediately if you suspect unauthorized access. We enforce a 3-tier progressive lockout (15 min, 24 hr, permanent) after repeated failed login attempts. Login alerts are sent via email when new device or location access is detected.' },
        { subtitle: 'Credential Storage', text: 'You may store third-party deploy tokens (GitHub, Vercel, Netlify, AWS) and API keys in our platform. These are encrypted with AES-256-GCM at the application level — never stored in plaintext, never logged, never included in AI prompts, and accessible only to the owning user. You are solely responsible for any actions taken using your stored credentials.' },
        { subtitle: 'Content Responsibility', text: 'You are solely responsible for content you generate using our AI tools, including code, media, and deployed applications. We do not claim ownership of your outputs but require responsible use in compliance with applicable laws.' },
      ]
    },
    {
      id: 'prohibited', icon: Ban, title: 'Prohibited Activities', glow: 'rgba(239,68,68,0.4)', content: [
        { subtitle: 'Harmful Content', text: 'Using AI agents to generate content that is illegal, harmful, threatening, abusive, defamatory, obscene, or otherwise objectionable is strictly prohibited.' },
        { subtitle: 'System Abuse', text: 'Attempting to hack, reverse engineer, or interfere with our systems, or using automated tools to access services beyond normal usage, is prohibited. This includes attempting to extract or abuse our API keys, bypass rate limits, or access other users\u2019 data.' },
        { subtitle: 'Fraudulent Activities', text: 'Using our services for fraud, phishing, impersonation, or any deceptive practices that could harm others is strictly forbidden.' },
        { subtitle: 'Intellectual Property Violations', text: 'Using our AI agents to infringe upon copyrights, trademarks, or other intellectual property rights of third parties is prohibited.' },
        { subtitle: 'Data Extraction', text: 'Attempting to access, scrape, or extract other users\u2019 data, AI training data, or proprietary system information through any means \u2014 including prompt injection attacks \u2014 is strictly prohibited and may result in immediate account termination.' },
      ]
    },
    {
      id: 'intellectual-property', icon: FileText, title: 'Intellectual Property', glow: 'rgba(249,115,22,0.4)', content: [
        { subtitle: 'Platform Ownership', text: 'Maula AI, including all software, content, features, and trademarks across maula.ai and spaces.maula.ai, is owned by us or our licensors and protected by intellectual property laws.' },
        { subtitle: 'User Content', text: 'You retain full ownership of content you create using our AI tools. We claim no intellectual property rights over your code, projects, or creative outputs. We require only a limited technical licence to host, store, and deliver this content to you as part of the service. Project files stored on our servers can be exported or deleted at any time.' },
        { subtitle: 'AI-Generated Content', text: 'Content generated by AI providers (Anthropic, OpenAI, Google, Mistral, xAI, Groq, Cerebras, HuggingFace) is subject to each provider\u2019s terms of use regarding AI-generated output ownership. Generally, AI-generated code and content can be used commercially, but you are responsible for verifying licensing compliance. We do not warrant that AI-generated content is free from third-party intellectual property claims.' },
        { subtitle: 'No AI Training Rights', text: 'We do not claim any right to use your content for AI training, model fine-tuning, or machine learning purposes. Your content is your own and is used solely to provide the services you have requested.' },
        { subtitle: 'Feedback', text: 'Any feedback, suggestions, or ideas you provide about our services become our property and may be used without compensation or attribution.' },
      ]
    },
    {
      id: 'ai-services', icon: Scale, title: 'AI Services & Provider Terms', glow: 'rgba(34,211,238,0.4)', content: [
        { subtitle: 'AI Provider Architecture', text: 'All AI capabilities are delivered through our backend infrastructure using our own paid API accounts. When you use an AI feature, your request flows: Your Browser \u2192 Our Secure Server \u2192 AI Provider API (using our API key) \u2192 Our Server \u2192 Your Browser. You never interact directly with third-party AI services.' },
        { subtitle: 'Provider-Specific Terms', text: 'Each AI provider has their own acceptable use policies that apply to content processed through their APIs. By using our AI features, you agree to comply with the applicable provider\u2019s usage policies. Key policies: Anthropic Acceptable Use Policy, OpenAI Usage Policies, Google Gemini API Terms, Mistral AI Terms of Service, xAI Terms, and others as applicable.' },
        { subtitle: 'AI Output Accuracy', text: 'AI-generated content (code, text, images, audio, video) is produced by machine learning models and may contain errors, inaccuracies, biases, security vulnerabilities, or outdated information. You are solely responsible for reviewing, testing, and validating all AI outputs before use in any production, commercial, medical, legal, or safety-critical context.' },
        { subtitle: 'Model Changes & Deprecation', text: 'AI models are updated, improved, and sometimes deprecated by their respective providers. We may substitute equivalent or improved models when a specific model becomes unavailable. We will make reasonable efforts to notify users of significant model changes that may affect their workflows.' },
        { subtitle: 'Rate Limits & Fair Use', text: 'AI services are subject to rate limits and fair use policies. Excessive automated usage, bulk generation, or abuse of AI endpoints may result in temporary rate limiting or account restrictions.' },
      ]
    },
    {
      id: 'liability', icon: Shield, title: 'Limitation of Liability', glow: 'rgba(59,130,246,0.4)', content: [
        { subtitle: 'Disclaimer of Warranties', text: 'Our services are provided "as is" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, or non-infringement. AI-generated code and deployments are not guaranteed to be error-free.' },
        { subtitle: 'Limitation of Damages', text: 'To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of maula.ai, spaces.maula.ai, or any deployed application.' },
        { subtitle: 'Maximum Liability', text: 'Our total liability for any claims arising from these terms shall not exceed the amount you paid to us in the twelve months preceding the claim.' },
        { subtitle: 'AI Output Disclaimer', text: 'AI-generated content from any provider (Anthropic, OpenAI, Google, Mistral, xAI, Groq, Cerebras, HuggingFace, fal.ai, Azure AI Vision) may contain errors, biases, security vulnerabilities, or inaccuracies. You are responsible for reviewing and validating any outputs before use in production, and we accept no liability for damages arising from unreviewed AI-generated code or content.' },
        { subtitle: 'Third-Party Provider Liability', text: 'We are not liable for outages, errors, policy changes, or service disruptions by our AI providers (Anthropic, OpenAI, Google, Mistral, xAI, Groq, Cerebras, HuggingFace), infrastructure providers (AWS), or payment processors (Stripe). We will make reasonable efforts to mitigate service disruptions.' },
      ]
    },
    {
      id: 'termination', icon: XCircle, title: 'Termination', glow: 'rgba(236,72,153,0.4)', content: [
        { subtitle: 'Your Right to Terminate', text: 'You may terminate your account at any time through your account settings or by contacting support. Access will end immediately upon termination.' },
        { subtitle: 'Our Right to Terminate', text: 'We may suspend or terminate your access immediately if you violate these terms, engage in prohibited activities, or for any other reason at our discretion.' },
        { subtitle: 'Effect of Termination', text: 'Upon termination, your right to use our services ends immediately. Certain provisions of these terms survive termination, including liability limitations, intellectual property provisions, and dispute resolution.' },
        { subtitle: 'Data After Termination', text: 'After termination, we may retain certain data as required by law or for legitimate business purposes, subject to our Privacy Policy. Project files, chat history, agent memories, and personal data will be permanently deleted within 30 days upon request. You may request a full data export before account closure. AI provider retention: third-party providers may retain cached data per their own policies (typically \u226430 days) before automatic deletion.' },
      ]
    },
    {
      id: 'device-security-service', icon: Gavel, title: 'Device Security Service', glow: 'rgba(239,68,68,0.4)', content: [
        { subtitle: 'Voluntary Opt-In', text: 'The Maula Device Security application ("Security Module") is an entirely optional, separately installed Android application. You are under no obligation to install it. Installation requires your explicit consent through a disclosed opt-in prompt during first use of the Maula chat application, or by downloading it directly. The Security Module is never installed silently or without your knowledge.' },
        { subtitle: 'Dormant by Default — No Auto-Activation', text: 'The Security Module is installed in a dormant state and will NOT collect any location, camera, or sensor data until ALL of the following conditions are met: (1) you submit a lost-device report via our website; (2) you provide satisfactory identity verification to our security team; (3) a human security team member manually reviews and authorises activation. Automated activation is technically and operationally prevented.' },
        { subtitle: 'Scope of Tracking Once Activated', text: 'Upon manual activation by our team following verified identity confirmation, the Security Module may: transmit GPS location at approximately 30-second intervals; capture front-camera photographs at approximately 5-minute intervals; report device battery level, network type, and SIM hash. This data collection continues until our team deactivates tracking, you revoke device admin permissions and uninstall the app, or the case is resolved.' },
        { subtitle: 'Report Fee & Payment', text: 'After a sufficient period of data collection, our security team will compile a Location & Photo Report containing your device\'s tracked locations and captured images. Access to this report requires a one-time fee of $9.99 USD (subject to change with notice), payable via Stripe. Upon successful payment, you receive a single-use secure download link valid for 48 hours. Payment is non-refundable once the download link is delivered.' },
        { subtitle: 'Prohibited Uses', text: 'You may only install and use the Security Module for legitimate anti-theft protection of a device you own. You may NOT install the Security Module on a device owned by another person without their explicit, informed consent. You may NOT use the Security Module to track another individual. Misuse of the Security Module may result in account termination and potential legal liability.' },
        { subtitle: 'Limitation of Liability for Security Service', text: 'Maula AI does not guarantee that the Security Module will locate or recover your device, or that photographs will capture the thief\'s face or usable evidence. Device tracking depends on: the device remaining powered on and connected to data, Android killing the background service, and other environmental factors outside our control. THE SECURITY SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF RECOVERY OR ACCURACY.' },
        { subtitle: 'Removal & Uninstall', text: 'You may deactivate and uninstall the Security Module at any time by revoking its Device Administrator privileges (Settings → Security → Device Admin Apps → Maula Security → Deactivate) and then uninstalling the app through Settings → Apps. You may also trigger a remote self-destruct via your account dashboard at maula.ai/dashboard/security.' },
      ]
    },
    {
      id: 'disputes', icon: Gavel, title: 'Dispute Resolution', glow: 'rgba(99,102,241,0.4)', content: [
        { subtitle: 'Governing Law', text: 'These terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.' },
        { subtitle: 'Informal Resolution', text: 'Before filing any legal claim, you agree to attempt to resolve disputes informally by contacting us at legal@maula.ai. We will make good-faith efforts to resolve disputes within 30 days.' },
        { subtitle: 'Arbitration', text: 'Any disputes not resolved informally shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.' },
        { subtitle: 'Class Action Waiver', text: 'You agree to resolve disputes on an individual basis and waive any right to participate in class action lawsuits or class-wide arbitration.' },
      ]
    },
  ];

  const toggleSection = (id: string) => {
    setExpandedSections(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  useEffect(() => { const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY }); window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h); }, []);

  const initStars = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = window.innerWidth; c.height = document.documentElement.scrollHeight || window.innerHeight * 4;
    const colors = ['rgba(255,255,255,', 'rgba(139,92,246,', 'rgba(6,182,212,', 'rgba(167,139,250,'];
    const stars: TwinklingStar[] = [];
    for (let i = 0; i < 120; i++) stars.push({ x: Math.random() * c.width, y: Math.random() * c.height, size: Math.random() * 2 + 0.4, opacity: Math.random() * 0.7 + 0.2, speed: Math.random() * 0.02 + 0.005, phase: Math.random() * Math.PI * 2, color: colors[Math.floor(Math.random() * colors.length)] });
    starsRef.current = stars;
  }, []);

  const animateStars = useCallback(() => {
    const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    starsRef.current.forEach(s => { s.phase += s.speed; const t = (Math.sin(s.phase) + 1) / 2; const a = s.opacity * (0.3 + t * 0.7); ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fillStyle = `${s.color}${a.toFixed(2)})`; ctx.fill(); if (s.size > 1.4 && t > 0.6) { ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2); const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3); g.addColorStop(0, `${s.color}${(a * 0.25).toFixed(2)})`); g.addColorStop(1, `${s.color}0)`); ctx.fillStyle = g; ctx.fill(); } });
    animFrameRef.current = requestAnimationFrame(animateStars);
  }, []);

  useEffect(() => { initStars(); animateStars(); const h = () => { const c = canvasRef.current; if (c) { c.width = window.innerWidth; c.height = document.documentElement.scrollHeight || window.innerHeight * 4; initStars(); } }; window.addEventListener('resize', h); return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener('resize', h); }; }, [initStars, animateStars]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      CustomWiggle.create('termsW', { wiggles: 5, type: 'uniform' });
      gsap.to('.nebula-orb', { x: 'random(-100,100)', y: 'random(-70,70)', scale: 'random(0.6,1.4)', opacity: 'random(0.03,0.07)', duration: 14, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => { gsap.to(p, { y: '-=200', x: 'random(-50,50)', opacity: 0, duration: 5 + Math.random() * 5, repeat: -1, delay: i * 0.35, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } }); });
      gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });
      gsap.fromTo('.hero-title', { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
      gsap.fromTo('.hero-subtitle', { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });
      gsap.to('.hero-icon-container', { boxShadow: '0 0 60px rgba(139,92,246,0.4), 0 0 120px rgba(139,92,246,0.15)', scale: 1.06, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });
      gsap.from('.hero-badge', { scale: 0, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.8 });
      gsap.utils.toArray<HTMLElement>('.section-card').forEach((card, i) => { gsap.from(card, { scrollTrigger: { trigger: card, start: 'top 90%' }, opacity: 0, y: 50, duration: 0.6, delay: i * 0.05, ease: 'power3.out' }); });
      gsap.set('.notice-block', { y: 40, opacity: 0 }); ScrollTrigger.create({ trigger: '.notice-block', start: 'top 85%', onEnter: () => gsap.to('.notice-block', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }) });
      gsap.set('.contact-block', { y: 40, opacity: 0 }); ScrollTrigger.create({ trigger: '.contact-block', start: 'top 88%', onEnter: () => gsap.to('.contact-block', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }) });
      Observer.create({ target: containerRef.current, type: 'scroll', onChangeY: (self) => { const v = Math.min(Math.abs(self.velocityY) / 1200, 0.8); gsap.to('.section-card', { skewY: self.velocityY > 0 ? v : -v, duration: 0.2 }); }, onStop: () => gsap.to('.section-card', { skewY: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }) });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.7 }} />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="nebula-orb absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute top-[55%] right-[15%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" style={{ top: '-2px' }} />
        {[...Array(15)].map((_, i) => <div key={i} className="stardust absolute rounded-full" style={{ left: `${5 + i * 6.2}%`, top: `${60 + (i % 4) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 2 === 0 ? 'rgba(139,92,246,0.6)' : 'rgba(6,182,212,0.5)', opacity: 0.6 }} />)}
        <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 200, top: mousePos.y - 200, background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
      </div>

      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-20 z-10">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="absolute top-6 left-4 lg:top-8 lg:left-6">
            <Link href="/legal" className="inline-flex items-center gap-2 text-gray-500 hover:text-violet-400 transition-colors text-sm group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />Back to Legal
            </Link>
          </div>
          <div className="relative inline-block mb-8">
            <div className="hero-ring absolute -inset-5 rounded-full border-2 border-dashed border-violet-500/30" />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-24 h-24 rounded-3xl border border-violet-400/40 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(236,72,153,0.25))' }}>
              <FileText className="w-12 h-12 relative z-10" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 15px rgba(139,92,246,0.7))' }} />
            </div>
          </div>
          <h1 className="hero-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Terms of Service</span>
          </h1>
          <p className="hero-subtitle text-lg text-gray-400 max-w-2xl mx-auto mb-8 font-light" style={{ opacity: 0 }}>These terms govern your use of <span className="text-violet-400">maula.ai</span> and <span className="text-violet-400">spaces.maula.ai</span> (Canvas App, Canvas Studio, GenCraft Pro, Maula Editor). <strong className="text-violet-300">We never sell your data and never use it to train AI models.</strong> Compliant with GDPR, CCPA/CPRA, PDPA Thailand, PDPA Singapore, and UAE PDPL.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-violet-500/20 backdrop-blur-sm flex items-center gap-2"><Clock className="w-4 h-4 text-violet-400" /><span className="text-sm text-gray-400 font-medium">Effective: February 18, 2026</span></div>
            <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-pink-500/20 backdrop-blur-sm flex items-center gap-2"><Scale className="w-4 h-4 text-pink-400" /><span className="text-sm text-gray-400 font-medium">~10 min read</span></div>
            <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-emerald-500/20 backdrop-blur-sm flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" /><span className="text-sm text-gray-400 font-medium">GDPR · CCPA · PDPA · UAE</span></div>
          </div>
        </div>
      </section>

      <section className="relative py-12 z-10">
        <div className="container mx-auto px-4"><div className="max-w-4xl mx-auto">
          <div className="notice-block mb-10 p-5 rounded-2xl bg-white/[0.02] border border-amber-500/15 overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border border-amber-400/30" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(245,158,11,0.1))' }}><AlertTriangle className="w-5 h-5" style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.4))' }} /></div>
              <div><h3 className="text-base font-bold text-gray-200 mb-1">Important Notice</h3><p className="text-gray-600 text-[13px] leading-relaxed">By using maula.ai or spaces.maula.ai, you agree to these Terms of Service. These terms cover Canvas App, Canvas Studio, GenCraft Pro, and Maula Editor. We use our own API keys to access all AI providers (Anthropic, OpenAI, Google, Mistral, xAI, Groq, Cerebras, HuggingFace) — your identity is never shared with them. We never sell your data and never use it for AI training. We comply with GDPR, CCPA/CPRA, PDPA Thailand, PDPA Singapore, and UAE PDPL. These terms include a mandatory arbitration clause and class action waiver. Please review the Dispute Resolution section carefully.</p></div>
            </div>
          </div>

          <div className="space-y-3">
            {sections.map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSections.has(section.id);
              return (
                <div key={section.id} className="section-card">
                  <button onClick={() => toggleSection(section.id)} className="w-full p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300 text-left group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/[0.08]" style={{ background: `linear-gradient(135deg, ${section.glow.replace('0.4', '0.2')}, rgba(139,92,246,0.1))`, boxShadow: `0 0 16px ${section.glow.replace('0.4', '0.08')}` }}>
                          <Icon className="w-5 h-5" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 6px ${section.glow})` }} />
                        </div>
                        <h3 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors">{section.title}</h3>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-violet-400' : ''}`} />
                    </div>
                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-white/[0.04] space-y-5">
                        {section.content.map((item, idx) => (
                          <div key={idx} className="pl-[60px]">
                            <h4 className="text-sm font-semibold text-violet-400 mb-1.5">{item.subtitle}</h4>
                            <p className="text-gray-500 text-[13px] leading-relaxed">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="contact-block mt-14 p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-xl font-bold text-white mb-3">Questions About These Terms?</h3>
            <p className="text-gray-600 text-sm mb-6">If you have any questions about these Terms of Service, please contact our legal team.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="mailto:legal@maula.ai" className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-pink-600/20 border border-violet-500/25 text-violet-400 font-medium text-sm hover:border-violet-500/40 transition-all">legal@maula.ai</Link>
              <Link href="/contact" className="px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 font-medium text-sm hover:bg-white/[0.06] hover:text-white transition-all">Contact Support</Link>
            </div>
          </div>
        </div></div>
      </section>

      <style jsx global>{`
                .section-card::before { content: ''; position: absolute; inset: 0; border-radius: 1rem; opacity: 0.015; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"); pointer-events: none; z-index: 1; }
                ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #030304; } ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; } ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
            `}</style>
    </div>
  );
}
