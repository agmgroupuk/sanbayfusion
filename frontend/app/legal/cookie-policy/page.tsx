'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, Observer } from '@/lib/gsap';
import Link from 'next/link';
import { Cookie, Shield, BarChart3, Cog, Target, Settings, Fingerprint, ArrowLeft, ChevronDown, Clock, Check, Globe, Server, Eye, RefreshCw } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, Observer);

interface TwinklingStar { x: number; y: number; size: number; opacity: number; speed: number; phase: number; color: string; }

export default function CookiePolicyPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<TwinklingStar[]>([]);
    const animFrameRef = useRef<number>(0);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [cookiePrefs, setCookiePrefs] = useState({ essential: true, analytics: true, functional: true, marketing: false });

    const sections = [
        {
            id: 'introduction', icon: Cookie, title: '1. Introduction & Legal Framework', glow: 'rgba(245,158,11,0.4)', content: [
                { subtitle: 'Scope', text: 'This Cookie Policy explains how One Last AI (\u201cwe,\u201d \u201cour,\u201d or \u201cus\u201d) uses cookies and similar tracking technologies on our websites at maula.ai and spaces.maula.ai, including all sub-applications (Canvas App, Canvas Studio, GenCraft Pro, and Maula Editor). By using our website, you consent to our use of cookies in accordance with this policy and our Privacy Policy.' },
                { subtitle: 'Legal Framework', text: 'Our cookie practices comply with: the ePrivacy Directive (EU Cookie Law, Directive 2002/58/EC as amended by 2009/136/EC) \u2014 prior informed consent required for non-essential cookies, clear information about cookie use, ability to refuse cookies; the General Data Protection Regulation (GDPR) \u2014 lawful basis required, data minimisation, right to withdraw consent; the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA) \u2014 right to know what PI is collected via cookies, right to opt-out, right to non-discrimination, honour Global Privacy Control (GPC) signals; Thailand\'s Personal Data Protection Act (PDPA B.E. 2562/2019); Singapore\'s Personal Data Protection Act 2012 (as amended 2020); and the UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL).' },
                { subtitle: 'Our Commitment', text: 'We use ZERO third-party tracking cookies and ZERO advertising cookies across all our platforms. All analytics are self-hosted and first-party. We do not use Google Analytics, Facebook Pixel, or any third-party tracking tools. Our cookie usage is minimal, transparent, and focused exclusively on providing you a functional, secure service. Non-compliance with the ePrivacy Directive can result in fines up to \u20ac20 million or 4% of global annual revenue under GDPR enforcement; CCPA fines can reach $7,500 per intentional violation \u2014 we take these obligations seriously.' },
            ]
        },
        {
            id: 'what-are', icon: Eye, title: '2. What Are Cookies', glow: 'rgba(245,158,11,0.4)', content: [
                { subtitle: 'Cookie Definition', text: 'Cookies are small text files stored on your device when you visit a website. They help websites remember you (store login status and preferences), analyse usage (track how visitors use the site), improve performance (optimise loading times and functionality), and personalise your experience (customise content and features).' },
                { subtitle: 'Cookie Types by Duration', text: 'Session cookies are temporary and deleted when you close your browser \u2014 our studio_session cookie (30 minutes) is short-lived. Persistent cookies remain on your device for a set period \u2014 our sessionId / session_id cookies persist for 7 days to keep you logged in, while visitorId persists for 1 year for first-party analytics. We do not set any long-lived tracking cookies and all cookie expiry times are minimised to what is strictly necessary.' },
                { subtitle: 'Cookie Types by Source', text: 'First-party cookies are set by the website you are visiting (maula.ai or spaces.maula.ai) \u2014 ALL our cookies are first-party. Third-party cookies are set by other domains embedded in the page \u2014 we set ZERO third-party cookies. Stripe.js (payment processing) may store strictly necessary payment tokens during checkout but does not set tracking cookies. No other third-party services set cookies on our domains.' },
                { subtitle: 'How We Use Cookies', text: 'We use cookies for essential functionality (authentication, session management, security) and first-party analytics (self-hosted page-view tracking with no third-party data sharing). We do NOT use third-party tracking cookies (no Google Analytics, no Facebook Pixel, no ad networks). We do NOT use cookies to profile users, serve advertisements, or track you across other websites. We have zero third-party cookie dependencies.' },
            ]
        },
        {
            id: 'cookies-we-use', icon: Shield, title: '3. Cookies We Use', glow: 'rgba(6,182,212,0.4)', content: [
                { subtitle: 'Overview \u2014 8 First-Party Cookies Total', text: 'We use exactly 8 cookies, ALL first-party. Four are strictly necessary for authentication and session management (no consent required under ePrivacy Art. 5(3)). Three are first-party analytics cookies (self-hosted, no third-party data sharing). One is a functional preference cookie. We use ZERO third-party tracking cookies and ZERO advertising cookies.' },
                { subtitle: '\ud83d\udd12 sessionId (Essential)', text: 'Type: Persistent (7 days) \u00b7 HttpOnly \u00b7 Secure (production) \u00b7 SameSite: Lax \u00b7 Path: / \u00b7 First-party. Your primary authentication session identifier \u2014 a 64-character cryptographically random hex string generated via crypto.randomBytes(32). Set on login, signup, and 2FA verification. Cannot be read by JavaScript (HttpOnly). Cleared on logout and session expiry. Purpose: Authentication.' },
                { subtitle: '\ud83d\udd12 session_id (Essential)', text: 'Type: Persistent (7 days) \u00b7 HttpOnly \u00b7 Secure (production) \u00b7 SameSite: Lax \u00b7 Path: / \u00b7 First-party. Stores the same value as sessionId for frontend API route compatibility. Set alongside sessionId during authentication. Purpose: Authentication (frontend API routes).' },
                { subtitle: '\ud83d\udd12 studio_session (Essential)', text: 'Type: Short-lived (30 minutes) \u00b7 HttpOnly \u00b7 Secure (production) \u00b7 SameSite: Lax \u00b7 First-party. Temporary session identifier for Canvas Studio guest access when no authenticated session exists. Automatically expires after 30 minutes of inactivity. Purpose: Guest session management.' },
                { subtitle: '\ud83d\udd12 maula_guest (Functional)', text: 'Type: Persistent (30 days) \u00b7 SameSite: Lax \u00b7 Path: / \u00b7 First-party. Identifies guest users in the universal chat widget before login, allowing conversation continuity. Format: guest_{timestamp}_{random}. Set via client-side JavaScript. Purpose: Guest chat identification.' },
                { subtitle: '\ud83d\udcca visitorId (Analytics)', text: 'Type: Persistent (1 year) \u00b7 HttpOnly \u00b7 Secure (production) \u00b7 SameSite: Lax \u00b7 First-party. Anonymous UUID for self-hosted page-view analytics. Set automatically by our server-side tracking middleware on the first request. Data is stored exclusively in our own PostgreSQL database \u2014 never shared with third parties. Purpose: First-party analytics.' },
                { subtitle: '\ud83d\udcca trackingSessionId (Analytics)', text: 'Type: Short-lived (30 minutes) \u00b7 HttpOnly \u00b7 Secure (production) \u00b7 SameSite: Lax \u00b7 First-party. Groups page views within a single browsing session for analytics. Automatically expires after 30 minutes of inactivity, creating a new session on the next visit. Data stored in our own PostgreSQL database only. Purpose: Session-level analytics grouping.' },
                { subtitle: '\ud83d\udcca _vid (Analytics)', text: 'Type: Persistent (1 year) \u00b7 SameSite: Lax \u00b7 Path: / \u00b7 First-party. Client-side visitor identifier for frontend analytics event tracking. Format: visitor_{timestamp}_{random}. Works alongside the server-side visitorId to provide consistent analytics across page navigations. All data stored in our own PostgreSQL database. Purpose: Frontend analytics continuity.' },
                { subtitle: '\ud83c\udfa8 theme (Functional)', text: 'Type: Persistent (1 year) \u00b7 SameSite: Lax \u00b7 Path: / \u00b7 First-party. Stores your dark/light theme preference (value: \u201cdark\u201d or \u201clight\u201d). Set via client-side JavaScript when you toggle the theme. Does not contain any personally identifiable information. Purpose: Remember display preference.' },
                { subtitle: 'Additional Client-Side Storage (localStorage, Not Cookies)', text: 'User preferences such as AI model choice (canvas_studio_model), provider (canvas_studio_provider), usage counters (canvas_studio_usage), and project history (gencraft_v4_history) are stored in browser localStorage \u2014 not cookies. localStorage data never leaves your browser and is not sent with HTTP requests.' },
            ]
        },
        {
            id: 'third-party', icon: Server, title: '4. Third-Party Services', glow: 'rgba(99,102,241,0.4)', content: [
                { subtitle: 'No Third-Party Tracking Cookies', text: 'We do NOT use Google Analytics, Facebook Pixel, Google Tag Manager, or any third-party tracking/advertising cookies. All analytics are self-hosted in our own PostgreSQL database on AWS infrastructure we control. This is a core design principle \u2014 not an afterthought.' },
                { subtitle: 'Stripe (Payment Processing)', text: 'PCI DSS Level 1 compliant payment processor. Stripe may set its own strictly necessary cookies for fraud detection during checkout. Your card details never touch our servers \u2014 all payment data is processed client-side by Stripe.js directly to Stripe\'s servers. Privacy: stripe.com/privacy.' },
                { subtitle: 'AI Model Providers \u2014 Server-Side Only, Zero Cookies', text: 'All AI API calls are made through One Last AI\'s own platform API keys on your behalf \u2014 you never need accounts with any AI provider. Providers process requests server-to-server; they do NOT set cookies in your browser. Providers: Anthropic (Claude Sonnet 4, Opus 4, Haiku), OpenAI (GPT-4o, TTS, DALL\u00b7E 3, Whisper), Google (Gemini 2.5 Pro/Flash), Mistral AI (Codestral, Mistral Large), xAI (Grok 3), Groq (LLaMA 3.3 70B), Cerebras, HuggingFace, Ollama (local/self-hosted), fal.ai / Minimax (video generation), Azure AI Vision (image analysis). We do NOT sell, share, or license your data to any AI provider for training.' },
                { subtitle: 'AWS S3 (File Storage)', text: 'Generated files (project archives, images, videos) are stored in AWS S3 with AES-256 server-side encryption. Files are accessed via time-limited signed URLs \u2014 no cookies are set by AWS S3.' },
                { subtitle: 'Deployment Platforms (User-Initiated)', text: 'When you deploy projects to Vercel, Netlify, GitHub, or AWS using your stored deploy credentials, those platforms operate under their own cookie and privacy policies. Deployment is entirely user-initiated and optional. Your deploy tokens are encrypted with AES-256-GCM, never stored in plaintext, and never logged.' },
            ]
        },
        {
            id: 'localstorage', icon: Cog, title: '5. Local Storage & Client-Side Data', glow: 'rgba(16,185,129,0.4)', content: [
                { subtitle: 'What Is localStorage', text: 'In addition to cookies, we use browser localStorage to persist user preferences on the client side. localStorage data never leaves your browser unless explicitly synced to our servers. Unlike cookies, localStorage data is not sent with HTTP requests. Data stored on maula.ai is not readable by spaces.maula.ai and vice versa (same-origin policy).' },
                { subtitle: 'maula.ai localStorage Keys', text: 'canvas_dark_mode (dark/light theme preference, persistent), canvas_studio_model (selected AI model name, persistent), canvas_studio_provider (selected AI provider name, persistent), canvas_studio_usage (project/chat counts for UI display, persistent), gencraft_v4_history (project history for quick access, persistent), userEmail (UI display only \u2014 never sent to AI providers, persistent), maulaai_user_id (anonymous visitor UUID for session continuity, persistent).' },
                { subtitle: 'spaces.maula.ai (Maula Editor) localStorage', text: 'auth_token (JWT for Maula Editor authentication, session-scoped). Additional editor-specific preferences are stored locally and never transmitted to third parties.' },
                { subtitle: 'How to Clear', text: 'Open your browser Developer Tools (F12) \u2192 Application tab \u2192 Local Storage. Select maula.ai or spaces.maula.ai and delete individual keys or clear all entries. Alternatively, use your browser\'s privacy/site data settings to clear all data for the domain. Clearing localStorage resets preferences to defaults but does NOT affect server-side account data (projects, chat history, agent memories, billing records remain safe in PostgreSQL and S3).' },
                { subtitle: 'Not Shared \u2014 Ever', text: 'localStorage data is browser-specific and origin-scoped by design. None of this data is sent to third parties, AI providers, analytics services, or any external entity. We do not use localStorage for tracking, advertising, or profiling.' },
            ]
        },
        {
            id: 'ai-cookies', icon: Cookie, title: '6. Cookies & AI Services', glow: 'rgba(34,211,238,0.4)', content: [
                { subtitle: 'AI Providers Set ZERO Cookies', text: 'Our AI provider integrations (Anthropic, OpenAI, Google, Mistral, xAI, Groq, Cerebras, HuggingFace) are all server-side API calls. These providers never interact with your browser directly and therefore cannot set any cookies or access any client-side storage. All AI requests flow: Your browser \u2192 Our server \u2192 AI provider API \u2192 Our server \u2192 Your browser.' },
                { subtitle: 'Our Own API Keys', text: 'All AI services are accessed using Maula AI\'s own paid API keys and accounts. Users never connect directly to third-party AI APIs. This means AI providers have no mechanism to set cookies, track your browser, or identify you in any way. Your identity is completely shielded from all providers.' },
                { subtitle: 'No AI Training from Cookies or Storage', text: 'No data stored in cookies or localStorage is ever sent to AI providers. Cookie data (authentication tokens, session IDs) is used exclusively for platform authentication. Your AI interactions are processed server-side using only the prompt, project context, and conversation history you explicitly provide. Anthropic (our primary provider) and all API-tier providers do not use API request data for model training.' },
                { subtitle: 'Model/Provider Preferences', text: 'Your selected AI model and provider preferences (e.g., canvas_studio_model, canvas_studio_provider) are stored in localStorage, not cookies. These preferences stay on your device and are used only to remember your UI selections. They are never transmitted to AI providers.' },
            ]
        },
        {
            id: 'marketing', icon: Target, title: '7. Marketing & Advertising', glow: 'rgba(236,72,153,0.4)', content: [
                { subtitle: 'No Marketing Cookies \u2014 ZERO', text: 'Maula AI does NOT set any marketing, advertising, or retargeting cookies. We do not participate in ad networks or behavioural advertising programs. We have no plans to add marketing cookies in the future. Our business model is based on agent subscriptions, GenCraft Pro plans, and Spaces credits \u2014 not advertising.' },
                { subtitle: 'No Cross-Site Tracking', text: 'We do not track your activity across other websites. We do not build advertising profiles. We do not share data with ad exchanges, data brokers, or data management platforms (DMPs). We do not use any form of browser fingerprinting for tracking purposes.' },
                { subtitle: 'No Third-Party Pixels or Tags', text: 'We do not embed Facebook Pixel, Google Ads tags, Google Tag Manager, LinkedIn Insight, TikTok Pixel, Twitter/X Pixel, Pinterest Tag, Snapchat Pixel, or any other conversion/tracking pixel on maula.ai or spaces.maula.ai.' },
                { subtitle: 'Do Not Track (DNT) & GPC', text: 'Our service does not currently respond to Do Not Track browser signals as there is no industry-standard technology for recognising DNT. However, since we do not engage in any form of cross-site tracking, behavioural advertising, or third-party data sharing, DNT compliance is effectively met by default. We honour Global Privacy Control (GPC) signals as required by CCPA/CPRA.' },
                { subtitle: 'We Never Sell Cookie Data', text: 'We do NOT sell any data derived from cookies or localStorage under any definition, including CCPA \u00a7 1798.140(ad) and CPRA definitions. We do NOT share cookie data for cross-context behavioural advertising. Cookie data is used exclusively for authentication and session management on our own platform.' },
            ]
        },
        {
            id: 'regional', icon: Globe, title: '8. Regional Cookie Compliance', glow: 'rgba(168,85,247,0.4)', content: [
                { subtitle: 'EU/EEA \u2014 ePrivacy Directive & GDPR', text: 'ePrivacy Directive (2002/58/EC, the \u201cCookie Law\u201d): prior informed consent required for non-essential cookies; clear and comprehensive information about cookie use; users must be able to refuse; consent must be freely given, specific, informed, and unambiguous. Cookie categories: (1) Strictly Necessary \u2014 no consent required; (2) Performance/Analytics \u2014 consent required; (3) Functional \u2014 consent required; (4) Targeting/Advertising \u2014 consent required. Our first-party-only, zero-tracking approach exceeds typical compliance requirements.' },
                { subtitle: '\ud83c\uddf9\ud83c\udded Thailand \u2014 PDPA (B.E. 2562 / 2019)', text: 'Under Thailand\'s PDPA, cookies that collect personal data require a lawful basis. Our strictly necessary cookies are processed under contractual necessity. Non-essential localStorage preferences require consent through our preferences panel. We do not use any third-party tracking cookies. Thai users may withdraw consent at any time without affecting the lawfulness of prior processing. Supervisory Authority: Personal Data Protection Committee (PDPC) \u2014 pdpc.or.th.' },
                { subtitle: '\ud83c\uddf8\ud83c\uddec Singapore \u2014 PDPA (2012, amended 2020)', text: 'Singapore\'s PDPA requires organisations to obtain consent before collecting personal data through cookies. Our strictly necessary cookies fall under the contractual necessity exception. We comply with all nine PDPA obligations regarding cookie data: Consent, Purpose Limitation, Notification, Access, Correction, Accuracy, Protection, Retention Limitation, and Transfer Limitation. Supervisory Authority: Personal Data Protection Commission (PDPC) \u2014 pdpc.gov.sg.' },
                { subtitle: '\ud83c\udde6\ud83c\uddea UAE \u2014 PDPL (Federal Decree-Law No. 45 of 2021)', text: 'The UAE PDPL requires that personal data processing (including via cookies) has a lawful basis and that data subjects are informed. Our essential cookies are justified under contractual necessity. No cookie data is transferred to third parties or used for profiling. UAE users may exercise their data rights by contacting privacy@maula.ai. Supervisory Authority: UAE Data Office.' },
                { subtitle: 'California \u2014 CCPA/CPRA', text: 'Under CCPA/CPRA, consumers have the right to know what PI is collected via cookies, opt-out of sale (we do NOT sell), and non-discrimination. We do NOT sell cookie data. We do NOT share cookie data for cross-context behavioural advertising. We honour Global Privacy Control (GPC) signals. Fines: up to $7,500 per intentional violation.' },
            ]
        },
        {
            id: 'managing', icon: Settings, title: '9. Managing Your Cookie Preferences', glow: 'rgba(59,130,246,0.4)', content: [
                { subtitle: 'On-Site Preferences', text: 'You can manage your cookie preferences using the Cookie Preferences panel below on this page. Essential cookies cannot be disabled as they are required for authentication and security. Non-essential localStorage preferences can be toggled on or off.' },
                { subtitle: 'Browser Settings \u2014 Chrome', text: 'Settings \u2192 Privacy and Security \u2192 Cookies and other site data. You can block all cookies, block third-party cookies, or clear cookies on exit. You can also manage site-specific cookie permissions for maula.ai and spaces.maula.ai.' },
                { subtitle: 'Browser Settings \u2014 Firefox', text: 'Settings \u2192 Privacy & Security \u2192 Cookies and Site Data. Firefox provides Enhanced Tracking Protection with Standard, Strict, and Custom modes. You can manage exceptions and block third-party cookies while allowing ours.' },
                { subtitle: 'Browser Settings \u2014 Safari', text: 'Preferences \u2192 Privacy \u2192 Cookies and website data. Safari blocks cross-site tracking by default via Intelligent Tracking Prevention (ITP). You can manage per-site data in Manage Website Data. macOS and iOS.' },
                { subtitle: 'Browser Settings \u2014 Edge', text: 'Settings \u2192 Cookies and site permissions \u2192 Cookies and site data. Edge offers Basic, Balanced, and Strict tracking prevention levels. You can manage site-specific permissions and clear data on exit.' },
                { subtitle: 'Mobile Devices', text: 'Safari (iOS): Settings \u2192 Safari \u2192 Website Data. Chrome (Android): Settings \u2192 Privacy \u2192 Clear Browsing Data. Firefox Mobile: Settings \u2192 Privacy \u2192 Manage Data. All mobile browsers support clearing site-specific data for maula.ai.' },
                { subtitle: 'Opt-Out & Privacy Tools', text: 'Global Privacy Control (GPC): Enable in your browser to automatically signal your privacy preferences \u2014 we honour GPC. Incognito/Private Browsing: All cookies and localStorage are automatically deleted when you close the private window. Browser Extensions: Privacy Badger, uBlock Origin, and similar extensions can manage cookies. Important: Blocking our essential cookies (sessionId, session_id, studio_session) will prevent login and session management.' },
                { subtitle: 'Clear localStorage', text: 'Open your browser Developer Tools (F12) \u2192 Application tab \u2192 Local Storage. Select maula.ai or spaces.maula.ai and delete individual keys or clear all entries. This resets preferences to defaults but does not affect server-side account data.' },
            ]
        },
        {
            id: 'legal-basis', icon: Fingerprint, title: '10. Legal Basis Summary', glow: 'rgba(99,102,241,0.4)', content: [
                { subtitle: 'Consent (Non-Essential)', text: 'We obtain your consent before storing non-essential data in localStorage through our preferences panel, as required by ePrivacy regulations. Essential cookies do not require consent as they are strictly necessary for the service you requested (ePrivacy Directive Art. 5(3) exemption).' },
                { subtitle: 'GDPR \u2014 Lawful Bases', text: 'Essential cookies: Performance of Contract (Art. 6(1)(b)). Analytics (server-side, no cookies): Legitimate Interest (Art. 6(1)(f)). Preference localStorage: Consent (Art. 6(1)(a)). Our first-party-only, zero-tracking approach minimises data exposure and exceeds typical compliance requirements. No data processing agreements are needed for cookie-related third parties because there are none.' },
                { subtitle: 'CalOPPA & ePrivacy', text: 'Our cookie practices align with the ePrivacy Directive (2002/58/EC as amended by 2009/136/EC) and CalOPPA requirements. We provide clear information about all cookies and localStorage keys used across maula.ai and spaces.maula.ai. Our approach of using only strictly necessary cookies means we comply with even the strictest interpretations of cookie consent requirements.' },
                { subtitle: 'Regular Audits', text: 'We regularly audit our cookie and localStorage usage to ensure compliance with evolving privacy regulations including GDPR, ePrivacy, CCPA/CPRA, PDPA Thailand, PDPA Singapore, and UAE PDPL. We remove any storage that is no longer necessary and document all changes. Our last comprehensive cookie audit was performed in January 2026.' },
            ]
        },
        {
            id: 'updates', icon: RefreshCw, title: '11. Updates to This Policy', glow: 'rgba(251,146,60,0.4)', content: [
                { subtitle: 'Policy Changes', text: 'We may update this Cookie Policy from time to time to reflect changes in our practices, legal requirements, or operational needs. Updates will be posted on this page with a new effective date.' },
                { subtitle: 'Notification', text: 'When we make material changes to this Cookie Policy, we will: notify you via email (at the address associated with your account), post a prominent notice on our platform, update the \u201cEffective Date\u201d at the top of this page, and for changes requiring consent under GDPR or PDPA, obtain your renewed consent.' },
                { subtitle: 'Your Continued Use', text: 'Your continued use of maula.ai and spaces.maula.ai after the updated policy becomes effective constitutes acceptance of the changes, except where consent is required by applicable law including GDPR, PDPA Thailand, PDPA Singapore, and UAE PDPL.' },
            ]
        },
    ];

    const toggleSection = (id: string) => {
        setExpandedSections(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    };

    useEffect(() => { const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY }); window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h); }, []);

    const initStars = useCallback(() => {
        const c = canvasRef.current; if (!c) return;
        c.width = window.innerWidth; c.height = document.documentElement.scrollHeight || window.innerHeight * 5;
        const colors = ['rgba(255,255,255,', 'rgba(245,158,11,', 'rgba(139,92,246,', 'rgba(6,182,212,'];
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

    useEffect(() => { initStars(); animateStars(); const h = () => { const c = canvasRef.current; if (c) { c.width = window.innerWidth; c.height = document.documentElement.scrollHeight || window.innerHeight * 5; initStars(); } }; window.addEventListener('resize', h); return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener('resize', h); }; }, [initStars, animateStars]);

    useEffect(() => {
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            CustomWiggle.create('cookieW', { wiggles: 5, type: 'uniform' });
            gsap.to('.nebula-orb', { x: 'random(-100,100)', y: 'random(-70,70)', scale: 'random(0.6,1.4)', opacity: 'random(0.03,0.07)', duration: 14, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
            gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => { gsap.to(p, { y: '-=200', x: 'random(-50,50)', opacity: 0, duration: 5 + Math.random() * 5, repeat: -1, delay: i * 0.35, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } }); });
            gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });
            gsap.fromTo('.hero-title', { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
            gsap.fromTo('.hero-subtitle', { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });
            gsap.to('.hero-icon-container', { boxShadow: '0 0 60px rgba(245,158,11,0.4), 0 0 120px rgba(245,158,11,0.15)', scale: 1.06, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });
            gsap.from('.hero-badge', { scale: 0, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.8 });
            gsap.utils.toArray<HTMLElement>('.section-card').forEach((card, i) => { gsap.from(card, { scrollTrigger: { trigger: card, start: 'top 90%' }, opacity: 0, y: 50, duration: 0.6, delay: i * 0.05, ease: 'power3.out' }); });
            gsap.set('.prefs-block', { y: 40, opacity: 0 }); ScrollTrigger.create({ trigger: '.prefs-block', start: 'top 85%', onEnter: () => gsap.to('.prefs-block', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }) });
            gsap.set('.contact-block', { y: 40, opacity: 0 }); ScrollTrigger.create({ trigger: '.contact-block', start: 'top 88%', onEnter: () => gsap.to('.contact-block', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }) });
            Observer.create({ target: containerRef.current, type: 'scroll', onChangeY: (self) => { const v = Math.min(Math.abs(self.velocityY) / 1200, 0.8); gsap.to('.section-card', { skewY: self.velocityY > 0 ? v : -v, duration: 0.2 }); }, onStop: () => gsap.to('.section-card', { skewY: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }) });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const prefItems = [
        { key: 'essential' as const, icon: Shield, label: 'Essential Cookies', desc: 'Required for core functionality', color: 'cyan', locked: true },
        { key: 'analytics' as const, icon: BarChart3, label: 'First-Party Analytics', desc: 'Server-side page view tracking (no cookies)', color: 'violet', locked: false },
        { key: 'functional' as const, icon: Cog, label: 'localStorage Preferences', desc: 'Theme, model selection, project history', color: 'emerald', locked: false },
        { key: 'marketing' as const, icon: Target, label: 'Marketing (None Used)', desc: 'No marketing cookies or pixels are set', color: 'pink', locked: false },
    ];

    const colorMap: Record<string, { bg: string; border: string; glow: string; on: string }> = {
        cyan: { bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)', glow: 'rgba(6,182,212,0.5)', on: 'bg-cyan-500' },
        violet: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)', glow: 'rgba(139,92,246,0.5)', on: 'bg-violet-500' },
        emerald: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.5)', on: 'bg-emerald-500' },
        pink: { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.3)', glow: 'rgba(236,72,153,0.5)', on: 'bg-pink-500' },
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.7 }} />
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="nebula-orb absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.5) 0%, transparent 70%)' }} />
                <div className="nebula-orb absolute top-[55%] right-[15%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" style={{ top: '-2px' }} />
                {[...Array(15)].map((_, i) => <div key={i} className="stardust absolute rounded-full" style={{ left: `${5 + i * 6.2}%`, top: `${60 + (i % 4) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 2 === 0 ? 'rgba(245,158,11,0.6)' : 'rgba(139,92,246,0.5)', opacity: 0.6 }} />)}
                <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 200, top: mousePos.y - 200, background: 'radial-gradient(circle, rgba(245,158,11,0.5) 0%, transparent 70%)' }} />
            </div>

            <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-20 z-10">
                <div className="container mx-auto px-4 text-center relative z-10">
                    <div className="absolute top-6 left-4 lg:top-8 lg:left-6">
                        <Link href="/legal" className="inline-flex items-center gap-2 text-gray-500 hover:text-amber-400 transition-colors text-sm group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />Back to Legal
                        </Link>
                    </div>
                    <div className="relative inline-block mb-8">
                        <div className="hero-ring absolute -inset-5 rounded-full border-2 border-dashed border-amber-500/30" />
                        <div className="hero-icon-container relative inline-flex items-center justify-center w-24 h-24 rounded-3xl border border-amber-400/40 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(249,115,22,0.25))' }}>
                            <Cookie className="w-12 h-12 relative z-10" style={{ color: '#fde68a', filter: 'drop-shadow(0 0 15px rgba(245,158,11,0.7))' }} />
                        </div>
                    </div>
                    <h1 className="hero-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Cookie Policy</span>
                    </h1>
                    <p className="hero-subtitle text-lg text-gray-400 max-w-2xl mx-auto mb-8 font-light" style={{ opacity: 0 }}>Learn how we use cookies and similar technologies across <span className="text-amber-400">maula.ai</span> and <span className="text-amber-400">spaces.maula.ai</span> (Canvas App, Canvas Studio, GenCraft Pro, Maula Editor). <strong className="text-amber-300">We use ZERO third-party tracking cookies and ZERO advertising cookies.</strong></p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-sm flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /><span className="text-sm text-gray-400 font-medium">Effective: February 18, 2026</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-orange-500/20 backdrop-blur-sm flex items-center gap-2"><Fingerprint className="w-4 h-4 text-orange-400" /><span className="text-sm text-gray-400 font-medium">ePrivacy Compliant</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-yellow-500/20 backdrop-blur-sm flex items-center gap-2"><Shield className="w-4 h-4 text-yellow-400" /><span className="text-sm text-gray-400 font-medium">PDPA Compliant</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-green-500/20 backdrop-blur-sm flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" /><span className="text-sm text-gray-400 font-medium">UAE PDPL Compliant</span></div>
                    </div>
                </div>
            </section>

            <section className="relative py-12 z-10">
                <div className="container mx-auto px-4"><div className="max-w-4xl mx-auto">
                    <div className="space-y-3">
                        {sections.map((section) => {
                            const Icon = section.icon;
                            const isExpanded = expandedSections.has(section.id);
                            return (
                                <div key={section.id} className="section-card">
                                    <button onClick={() => toggleSection(section.id)} className="w-full p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300 text-left group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/[0.08]" style={{ background: `linear-gradient(135deg, ${section.glow.replace('0.4', '0.2')}, rgba(245,158,11,0.1))`, boxShadow: `0 0 16px ${section.glow.replace('0.4', '0.08')}` }}>
                                                    <Icon className="w-5 h-5" style={{ color: '#fde68a', filter: `drop-shadow(0 0 6px ${section.glow})` }} />
                                                </div>
                                                <h3 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors">{section.title}</h3>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                                        </div>
                                        {isExpanded && (
                                            <div className="mt-5 pt-5 border-t border-white/[0.04] space-y-5">
                                                {section.content.map((item, idx) => (
                                                    <div key={idx} className="pl-[60px]">
                                                        <h4 className="text-sm font-semibold text-amber-400 mb-1.5">{item.subtitle}</h4>
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

                    <div className="prefs-block mt-12 p-7 rounded-2xl bg-white/[0.02] border border-amber-500/15">
                        <h3 className="text-xl font-bold text-white mb-2">Cookie Preferences</h3>
                        <p className="text-gray-600 text-sm mb-6">Manage your cookie preferences below. Essential cookies cannot be disabled.</p>
                        <div className="space-y-4">
                            {prefItems.map((item) => {
                                const Icon = item.icon;
                                const cm = colorMap[item.color];
                                const isOn = cookiePrefs[item.key];
                                return (
                                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: cm.bg, borderColor: cm.border }}>
                                                <Icon className="w-5 h-5" style={{ color: '#fde68a', filter: `drop-shadow(0 0 6px ${cm.glow})` }} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-200">{item.label}</h4>
                                                <p className="text-gray-600 text-xs">{item.desc}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => !item.locked && setCookiePrefs(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${item.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isOn ? cm.on : 'bg-white/[0.08]'}`}
                                            disabled={item.locked}
                                        >
                                            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${isOn ? 'translate-x-[22px]' : 'translate-x-0.5'}`}>
                                                {isOn && item.locked && <Check className="w-3 h-3 text-gray-600" />}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <button className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-500/25 text-amber-300 font-medium text-sm hover:border-amber-500/40 hover:from-amber-600/40 hover:to-orange-600/40 transition-all">Save Preferences</button>
                    </div>

                    <div className="contact-block mt-14 p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                        <h3 className="text-xl font-bold text-white mb-3">Cookie Questions?</h3>
                        <p className="text-gray-600 text-sm mb-6">For questions about our cookie usage, localStorage practices, or how AI services interact with client-side storage across maula.ai and spaces.maula.ai, contact our privacy team. We respond within 30 days as required by GDPR, PDPA, and UAE PDPL.</p>
                        <div className="flex flex-wrap gap-3">
                            <Link href="mailto:privacy@maula.ai" className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/25 text-amber-400 font-medium text-sm hover:border-amber-500/40 transition-all">privacy@maula.ai</Link>
                            <Link href="mailto:support@maula.ai" className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/25 text-cyan-400 font-medium text-sm hover:border-cyan-500/40 transition-all">support@maula.ai</Link>
                            <Link href="mailto:dpo@maula.ai" className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/25 text-violet-400 font-medium text-sm hover:border-violet-500/40 transition-all">dpo@maula.ai</Link>
                            <Link href="/contact" className="px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 font-medium text-sm hover:bg-white/[0.06] hover:text-white transition-all">Contact Support</Link>
                        </div>
                    </div>
                </div></div>
            </section>

            <style jsx global>{`
                .section-card::before { content: ''; position: absolute; inset: 0; border-radius: 1rem; opacity: 0.015; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"); pointer-events: none; z-index: 1; }
                ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #030304; } ::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.3); border-radius: 3px; } ::-webkit-scrollbar-thumb:hover { background: rgba(245,158,11,0.5); }
            `}</style>
        </div>
    );
}
