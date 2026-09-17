'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, ScrambleTextPlugin, Observer } from '@/lib/gsap';
import { Code2, Terminal, Lock, Bot, MessageSquare, Palette, FlaskConical, Wrench, Users, Trophy, CreditCard, Headphones, BarChart3, ChevronRight, Copy, Check, ArrowUp, Menu, X, Sparkles, Globe, Shield, Zap, Server, BookOpen } from 'lucide-react';

// ─── API Category Data ───
const apiCategories = [
    {
        id: 'authentication', label: 'Authentication', icon: Lock, color: 'emerald',
        description: 'Secure your API requests with token-based authentication. All endpoints require a valid Bearer token unless marked as public.',
        endpoints: [
            { method: 'POST', path: '/api/auth/signup', desc: 'Register a new user account' },
            { method: 'POST', path: '/api/auth/login', desc: 'Authenticate and receive access token' },
            { method: 'POST', path: '/api/auth/logout', desc: 'Invalidate current session token' },
            { method: 'GET', path: '/api/auth/verify', desc: 'Verify token validity and get user info' },
            { method: 'POST', path: '/api/auth/reset-password', desc: 'Initiate password reset flow' },
        ]
    },
    {
        id: 'agents', label: 'Agents', icon: Bot, color: 'violet',
        description: 'Create, configure, and manage AI agents. Each agent can have custom personality, capabilities, and connected tools.',
        endpoints: [
            { method: 'GET', path: '/api/agents', desc: 'List all available agents' },
            { method: 'POST', path: '/api/agents', desc: 'Create a new AI agent' },
            { method: 'POST', path: '/api/agents/multimodal', desc: 'Create a multimodal agent (text + vision + audio)' },
            { method: 'GET', path: '/api/agent/performance/:agentId', desc: 'Get performance metrics for an agent' },
            { method: 'GET', path: '/api/agent-collections', desc: 'List agent collections' },
            { method: 'POST', path: '/api/agent-subscriptions', desc: 'Subscribe to a premium agent' },
            { method: 'GET', path: '/api/agent/subscriptions/check/:userId/:agentId', desc: 'Check subscription status' },
        ]
    },
    {
        id: 'conversations', label: 'Chat & Conversations', icon: MessageSquare, color: 'sky',
        description: 'Interact with agents through real-time chat, manage conversation history, and stream responses.',
        endpoints: [
            { method: 'POST', path: '/api/agent/chat', desc: 'Send a message to an agent and get a response' },
            { method: 'POST', path: '/api/agent/chat-stream', desc: 'Stream a real-time response from an agent (SSE)' },
            { method: 'GET', path: '/api/chat/sessions', desc: 'List all chat sessions for the user' },
            { method: 'POST', path: '/api/chat/sessions', desc: 'Create a new chat session' },
            { method: 'GET', path: '/api/chat/sessions/:sessionId', desc: 'Get messages in a session' },
            { method: 'DELETE', path: '/api/chat/sessions/:sessionId', desc: 'Delete a chat session' },
            { method: 'POST', path: '/api/chat/interactions', desc: 'Log a chat interaction event' },
            { method: 'POST', path: '/api/secure-chat', desc: 'Encrypted end-to-end chat message' },
        ]
    },
    {
        id: 'canvas', label: 'Canvas & Studio', icon: Palette, color: 'pink',
        description: 'Build, deploy, and manage AI-powered web applications with Canvas. Studio provides a collaborative agent workspace.',
        endpoints: [
            { method: 'GET', path: '/api/canvas/apps', desc: 'List all canvas applications' },
            { method: 'POST', path: '/api/canvas/apps', desc: 'Create a new canvas application' },
            { method: 'GET', path: '/api/canvas/apps/:appId', desc: 'Get app details' },
            { method: 'PUT', path: '/api/canvas/apps/:appId', desc: 'Update an app' },
            { method: 'DELETE', path: '/api/canvas/apps/:appId', desc: 'Delete an app' },
            { method: 'POST', path: '/api/canvas/generate', desc: 'Generate app code with AI' },
            { method: 'POST', path: '/api/canvas/stream', desc: 'Stream AI generation progress' },
            { method: 'POST', path: '/api/canvas/deploy-external', desc: 'Deploy app to external hosting' },
            { method: 'GET', path: '/api/canvas-projects', desc: 'List canvas projects' },
            { method: 'POST', path: '/api/studio/chat', desc: 'Chat within studio workspace' },
            { method: 'POST', path: '/api/studio/chat/stream', desc: 'Stream studio chat response' },
        ]
    },
    {
        id: 'lab', label: 'AI Lab', icon: FlaskConical, color: 'amber',
        description: 'Access experimental AI capabilities — image generation, voice synthesis, dream analysis, creative storytelling, and more.',
        endpoints: [
            { method: 'POST', path: '/api/lab/image-generation', desc: 'Generate images from text prompts' },
            { method: 'POST', path: '/api/lab/voice-generation', desc: 'Generate realistic speech audio' },
            { method: 'POST', path: '/api/lab/music-generation', desc: 'Create AI-composed music tracks' },
            { method: 'POST', path: '/api/lab/story-generation', desc: 'Generate creative stories' },
            { method: 'POST', path: '/api/lab/neural-art', desc: 'Create neural art from prompts' },
            { method: 'POST', path: '/api/lab/battle-arena', desc: 'Pit two AI agents against each other' },
            { method: 'POST', path: '/api/lab/debate-arena', desc: 'Start an AI debate on a topic' },
            { method: 'GET', path: '/api/lab/dream-analysis', desc: 'Analyze dream descriptions with AI' },
            { method: 'POST', path: '/api/lab/emotion-analysis', desc: 'Detect emotions in text' },
            { method: 'POST', path: '/api/lab/personality-analysis', desc: 'AI personality profiling' },
            { method: 'POST', path: '/api/lab/future-prediction', desc: 'AI-powered trend predictions' },
        ]
    },
    {
        id: 'tools', label: 'Network Tools', icon: Wrench, color: 'cyan',
        description: 'Suite of network analysis and security tools — DNS lookups, SSL checks, port scanning, threat intelligence, and more.',
        endpoints: [
            { method: 'POST', path: '/api/tools/dns-lookup', desc: 'Perform DNS record lookups' },
            { method: 'POST', path: '/api/tools/dns-lookup-advanced', desc: 'Advanced DNS queries with all record types' },
            { method: 'POST', path: '/api/tools/ssl-checker', desc: 'Check SSL certificate details' },
            { method: 'POST', path: '/api/tools/whois-lookup', desc: 'WHOIS domain information' },
            { method: 'POST', path: '/api/tools/ip-geolocation', desc: 'Geolocate an IP address' },
            { method: 'POST', path: '/api/tools/port-scanner', desc: 'Scan open ports on a host' },
            { method: 'POST', path: '/api/tools/ping-test', desc: 'Ping a host and get latency' },
            { method: 'POST', path: '/api/tools/traceroute', desc: 'Trace network route to a host' },
            { method: 'POST', path: '/api/tools/speed-test', desc: 'Run a network speed test' },
            { method: 'POST', path: '/api/tools/threat-intelligence', desc: 'Lookup threat data for an IP/domain' },
            { method: 'POST', path: '/api/tools/domain-reputation', desc: 'Check domain reputation score' },
            { method: 'POST', path: '/api/tools/domain-availability', desc: 'Check if a domain is available' },
            { method: 'POST', path: '/api/tools/domain-research', desc: 'Full domain research report' },
            { method: 'POST', path: '/api/tools/api-tester', desc: 'Test any API endpoint' },
            { method: 'POST', path: '/api/tools/hash', desc: 'Generate hash digests (MD5, SHA, etc.)' },
            { method: 'POST', path: '/api/tools/mac-lookup', desc: 'Look up MAC address vendor' },
            { method: 'POST', path: '/api/tools/ip-netblocks', desc: 'Get IP netblock information' },
            { method: 'POST', path: '/api/tools/website-categorization', desc: 'Categorize a website\'s content' },
        ]
    },
    {
        id: 'user', label: 'User Management', icon: Users, color: 'indigo',
        description: 'Manage user profiles, preferences, analytics, security settings, 2FA, and session history.',
        endpoints: [
            { method: 'GET', path: '/api/user/profile/:userId', desc: 'Get user profile' },
            { method: 'PUT', path: '/api/user/profile/:userId', desc: 'Update user profile' },
            { method: 'PUT', path: '/api/user/profile/:userId/avatar', desc: 'Update profile avatar' },
            { method: 'GET', path: '/api/user/preferences/:userId', desc: 'Get user preferences' },
            { method: 'PUT', path: '/api/user/preferences/:userId', desc: 'Update preferences' },
            { method: 'GET', path: '/api/user/analytics/:userId', desc: 'Get user analytics' },
            { method: 'GET', path: '/api/user/analytics/advanced', desc: 'Get advanced analytics dashboard' },
            { method: 'GET', path: '/api/user/billing/:userId', desc: 'Get billing information' },
            { method: 'GET', path: '/api/user/conversations/:userId', desc: 'List user conversations' },
            { method: 'GET', path: '/api/user/conversations/:userId/export', desc: 'Export conversations' },
            { method: 'GET', path: '/api/user/achievements/:userId', desc: 'Get user achievements' },
            { method: 'GET', path: '/api/user/badges/:userId', desc: 'Get earned badges' },
            { method: 'GET', path: '/api/user/streak/:userId', desc: 'Get login streak data' },
        ]
    },
    {
        id: 'security', label: 'Security & 2FA', icon: Shield, color: 'red',
        description: 'Two-factor authentication, device management, login history, and password management endpoints.',
        endpoints: [
            { method: 'POST', path: '/api/user/security/2fa', desc: 'Enable two-factor authentication' },
            { method: 'POST', path: '/api/user/security/2fa/verify', desc: 'Verify 2FA code' },
            { method: 'POST', path: '/api/user/security/2fa/disable', desc: 'Disable 2FA' },
            { method: 'GET', path: '/api/user/security/2fa/backup-codes', desc: 'Get backup recovery codes' },
            { method: 'GET', path: '/api/user/security/:userId', desc: 'Get security settings overview' },
            { method: 'POST', path: '/api/user/security/change-password', desc: 'Change account password' },
            { method: 'GET', path: '/api/user/security/devices/:userId', desc: 'List trusted devices' },
            { method: 'GET', path: '/api/user/security/login-history/:userId', desc: 'Get login history' },
        ]
    },
    {
        id: 'community', label: 'Community', icon: Globe, color: 'teal',
        description: 'Social features — create posts, like content, view top members, and get real-time presence updates.',
        endpoints: [
            { method: 'GET', path: '/api/community/posts', desc: 'List community posts' },
            { method: 'POST', path: '/api/community/posts', desc: 'Create a new post' },
            { method: 'POST', path: '/api/community/posts/:id/like', desc: 'Like a post' },
            { method: 'POST', path: '/api/community/posts/:id/unlike', desc: 'Unlike a post' },
            { method: 'GET', path: '/api/community/top-members', desc: 'Get top community members' },
            { method: 'POST', path: '/api/community/presence/ping', desc: 'Send presence heartbeat' },
            { method: 'GET', path: '/api/community/stream', desc: 'Real-time community event stream (SSE)' },
        ]
    },
    {
        id: 'rewards', label: 'Rewards & Gamification', icon: Trophy, color: 'yellow',
        description: 'Points system, achievement tracking, rewards catalog, and leaderboard APIs.',
        endpoints: [
            { method: 'GET', path: '/api/rewards/catalog', desc: 'Browse available rewards' },
            { method: 'POST', path: '/api/rewards/redeem', desc: 'Redeem points for a reward' },
            { method: 'GET', path: '/api/rewards/leaderboard', desc: 'Get the points leaderboard' },
            { method: 'GET', path: '/api/gamification/:path', desc: 'Dynamic gamification endpoints' },
            { method: 'GET', path: '/api/user/points-history/:userId', desc: 'Get point transaction history' },
            { method: 'GET', path: '/api/user/rewards/:userId', desc: 'Get user\'s redeemed rewards' },
            { method: 'GET', path: '/api/user/check-achievements/:userId', desc: 'Check for new achievements' },
        ]
    },
    {
        id: 'billing', label: 'Billing & Subscriptions', icon: CreditCard, color: 'orange',
        description: 'Manage subscriptions, process payments via Stripe, and handle billing lifecycle events.',
        endpoints: [
            { method: 'POST', path: '/api/stripe/checkout', desc: 'Create a Stripe checkout session' },
            { method: 'POST', path: '/api/stripe/verify-session', desc: 'Verify a completed checkout' },
            { method: 'POST', path: '/api/stripe/webhook', desc: 'Stripe webhook handler' },
            { method: 'GET', path: '/api/subscriptions', desc: 'List subscription plans' },
            { method: 'GET', path: '/api/subscriptions/:userId', desc: 'Get user subscription details' },
            { method: 'GET', path: '/api/subscriptions/check', desc: 'Check subscription status' },
            { method: 'POST', path: '/api/subscriptions/cancel', desc: 'Cancel a subscription' },
            { method: 'POST', path: '/api/canvas/studio-checkout', desc: 'Studio plan checkout' },
        ]
    },
    {
        id: 'support', label: 'Support & Contact', icon: Headphones, color: 'rose',
        description: 'Submit support tickets, contact forms, live chat support, and demo request endpoints.',
        endpoints: [
            { method: 'POST', path: '/api/contact', desc: 'Submit a contact form message' },
            { method: 'POST', path: '/api/demo-request', desc: 'Request a product demo' },
            { method: 'GET', path: '/api/support/tickets', desc: 'List support tickets' },
            { method: 'POST', path: '/api/support/tickets', desc: 'Create a new support ticket' },
            { method: 'POST', path: '/api/live-support', desc: 'Start a live support session' },
            { method: 'GET', path: '/api/live-support/tickets', desc: 'List live support tickets' },
            { method: 'POST', path: '/api/live-support/ticket', desc: 'Create a live support ticket' },
            { method: 'POST', path: '/api/job-applications', desc: 'Submit a job application' },
        ]
    },
    {
        id: 'misc', label: 'Status & Utilities', icon: BarChart3, color: 'slate',
        description: 'System status, analytics, file uploads, text-to-speech, real-time sessions, and more.',
        endpoints: [
            { method: 'GET', path: '/api/status', desc: 'Get system health status' },
            { method: 'GET', path: '/api/status/api-status', desc: 'Detailed API health check' },
            { method: 'GET', path: '/api/status/analytics', desc: 'System analytics data' },
            { method: 'GET', path: '/api/status/stream', desc: 'Real-time status updates (SSE)' },
            { method: 'POST', path: '/api/tts', desc: 'Convert text to speech audio' },
            { method: 'POST', path: '/api/uploads/presign', desc: 'Get a presigned S3 upload URL' },
            { method: 'GET', path: '/api/uploads/proxy-download', desc: 'Proxy download a file from S3' },
            { method: 'POST', path: '/api/extract-document', desc: 'Extract text from a document' },
            { method: 'GET', path: '/api/ipinfo', desc: 'Get IP address information' },
            { method: 'POST', path: '/api/realtime/session', desc: 'Create a real-time WebSocket session' },
            { method: 'POST', path: '/api/email/newsletter-confirmation', desc: 'Confirm newsletter signup' },
        ]
    },
];

const codeExamples: Record<string, { title: string; language: string; code: string }> = {
    authentication: {
        title: 'Login & Get Token', language: 'JavaScript', code: `const res = await fetch('https://maula.ai/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'your_password'
  })
});
const { token, user } = await res.json();
// Use token in subsequent requests:
// headers: { 'Authorization': \`Bearer \${token}\` }` },
    agents: {
        title: 'List All Agents', language: 'JavaScript', code: `const res = await fetch('https://maula.ai/api/agents', {
  headers: { 'Authorization': \`Bearer \${token}\` }
});
const { agents } = await res.json();
console.log(agents);` },
    conversations: {
        title: 'Chat with an Agent', language: 'JavaScript', code: `const res = await fetch('https://maula.ai/api/agent/chat', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agentId: 'agent_abc123',
    message: 'Hello, how can you help me?'
  })
});
const { reply } = await res.json();` },
    canvas: {
        title: 'Generate a Canvas App', language: 'JavaScript', code: `const res = await fetch('https://maula.ai/api/canvas/generate', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Create a weather dashboard app',
    framework: 'react'
  })
});
const { code, preview_url } = await res.json();` },
    lab: {
        title: 'Generate an Image', language: 'Python', code: `import requests

res = requests.post(
    'https://maula.ai/api/lab/image-generation',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'prompt': 'A futuristic cityscape at sunset',
        'style': 'photorealistic',
        'size': '1024x1024'
    }
)
image_url = res.json()['url']` },
    tools: {
        title: 'DNS Lookup', language: 'JavaScript', code: `const res = await fetch('https://maula.ai/api/tools/dns-lookup', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ domain: 'example.com', type: 'A' })
});
const { records } = await res.json();` },
};

const methodColors: Record<string, string> = {
    GET: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    POST: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    PUT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    DELETE: 'text-red-400 bg-red-400/10 border-red-400/20',
    PATCH: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
};

const iconColorMap: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-400/30 text-emerald-400',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-400/30 text-violet-400',
    sky: 'from-sky-500/20 to-sky-600/10 border-sky-400/30 text-sky-400',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-400/30 text-pink-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-400/30 text-amber-400',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-400/30 text-cyan-400',
    indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-400/30 text-indigo-400',
    red: 'from-red-500/20 to-red-600/10 border-red-400/30 text-red-400',
    teal: 'from-teal-500/20 to-teal-600/10 border-teal-400/30 text-teal-400',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-400/30 text-yellow-400',
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-400/30 text-orange-400',
    rose: 'from-rose-500/20 to-rose-600/10 border-rose-400/30 text-rose-400',
    slate: 'from-slate-500/20 to-slate-600/10 border-slate-400/30 text-slate-400',
};

const sidebarDotColors: Record<string, string> = {
    emerald: 'bg-emerald-400', violet: 'bg-violet-400', sky: 'bg-sky-400', pink: 'bg-pink-400',
    amber: 'bg-amber-400', cyan: 'bg-cyan-400', indigo: 'bg-indigo-400', red: 'bg-red-400',
    teal: 'bg-teal-400', yellow: 'bg-yellow-400', orange: 'bg-orange-400', rose: 'bg-rose-400', slate: 'bg-slate-400',
};

// ─── Typewriter phrases ───
const typewriterPhrases = [
    'list all agents',
    'create a canvas app',
    'stream chat responses',
    'generate neural art',
    'run DNS lookups',
    'check system status',
    'manage subscriptions',
    'analyze emotions',
];

export default function DocsAPIPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState('authentication');
    const [mobileNav, setMobileNav] = useState(false);

    const copyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // ─── Scroll to top on mount ───
    useEffect(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
    }, []);

    // ─── Twinkling stars ───
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let raf: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
        resize();
        const stars = Array.from({ length: 140 }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            r: Math.random() * 1.2 + 0.3, base: Math.random() * 0.5 + 0.2, phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.008 + 0.003,
            color: ['255,255,255', '180,220,255', '255,200,150', '200,180,255'][Math.floor(Math.random() * 4)]
        }));
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const t = Date.now() * 0.001;
            stars.forEach(s => {
                const a = s.base + Math.sin(t * s.speed * 60 + s.phase) * 0.3;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.color},${Math.max(0, a)})`; ctx.fill();
            });
            raf = requestAnimationFrame(draw);
        };
        draw();
        const ro = new ResizeObserver(resize);
        ro.observe(document.documentElement);
        return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    }, []);

    // ─── Handle hash navigation on mount ───
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            setTimeout(() => {
                const el = document.getElementById(hash);
                if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                    setActiveSection(hash);
                }
            }, 600);
        }
    }, []);

    // ─── GSAP Animations ───
    useEffect(() => {
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            // Hero
            const badge = containerRef.current!.querySelector('.hero-badge');
            const titleEl = containerRef.current!.querySelector('.hero-title');
            const subEl = containerRef.current!.querySelector('.hero-sub');
            if (badge) gsap.from(badge, { y: 20, opacity: 0, scale: 0.8, duration: 0.6, ease: 'back.out(1.7)' });
            if (titleEl) {
                const split = new SplitText(titleEl, { type: 'chars,words' });
                gsap.from(split.chars, { y: 60, opacity: 0, rotateX: -90, duration: 0.6, stagger: 0.02, ease: 'power4.out', delay: 0.2 });
            }
            if (subEl) {
                const splitSub = new SplitText(subEl, { type: 'words' });
                gsap.from(splitSub.words, { y: 30, opacity: 0, duration: 0.5, stagger: 0.02, ease: 'power3.out', delay: 0.5 });
            }

            // Hero icon glow + rings
            gsap.to('.hero-icon-box', { boxShadow: '0 0 40px rgba(59,130,246,0.15), 0 0 80px rgba(59,130,246,0.05)', duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.hero-ring-1', { rotation: 360, duration: 20, repeat: -1, ease: 'none', transformOrigin: 'center center' });
            gsap.to('.hero-ring-2', { rotation: -360, duration: 30, repeat: -1, ease: 'none', transformOrigin: 'center center' });

            // Typewriter
            const twEl = containerRef.current!.querySelector('.tw-text');
            if (twEl) {
                const tl = gsap.timeline({ repeat: -1 });
                typewriterPhrases.forEach(phrase => {
                    tl.to(twEl, { duration: phrase.length * 0.04, text: { value: phrase, delimiter: '' }, ease: 'none' })
                        .to({}, { duration: 1.8 })
                        .to(twEl, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' })
                        .to({}, { duration: 0.3 });
                });
            }

            // Scramble base URL
            const baseUrlEl = containerRef.current!.querySelector('.base-url-code');
            if (baseUrlEl) {
                ScrollTrigger.create({
                    trigger: baseUrlEl,
                    start: 'top 85%',
                    onEnter: () => gsap.to(baseUrlEl, { duration: 1.5, scrambleText: { text: 'https://maula.ai/api', chars: 'abcdefghijklmnopqrstuvwxyz./:', speed: 0.4 } })
                });
            }

            // Section cards
            gsap.set('.api-section-card', { y: 40, opacity: 0 });
            ScrollTrigger.batch('.api-section-card', {
                start: 'top 90%',
                onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out' }),
            });

            // Endpoint rows
            gsap.set('.endpoint-row', { x: -20, opacity: 0 });
            ScrollTrigger.batch('.endpoint-row', {
                start: 'top 92%',
                onEnter: batch => gsap.to(batch, { x: 0, opacity: 1, duration: 0.4, stagger: 0.03, ease: 'power2.out' }),
            });

            // Track active section on scroll
            apiCategories.forEach(cat => {
                ScrollTrigger.create({
                    trigger: `#${cat.id}`,
                    start: 'top 30%',
                    end: 'bottom 30%',
                    onEnter: () => setActiveSection(cat.id),
                    onEnterBack: () => setActiveSection(cat.id),
                });
            });

        }, containerRef);
        return () => ctx.revert();
    }, []);

    const scrollToSection = (id: string) => {
        setMobileNav(false);
        const el = document.getElementById(id);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const totalEndpoints = apiCategories.reduce((sum, c) => sum + c.endpoints.length, 0);

    return (
        <div ref={containerRef} className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: '#030304' }}>
            {/* ── Stars ── */}
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

            {/* ── Nebula Orbs ── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[15%] left-[10%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
                <div className="absolute top-[50%] right-[5%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.035) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[10%] left-[30%] w-[550px] h-[550px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)' }} />
            </div>

            {/* ── Scan Line ── */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59,130,246,0.015) 2px, rgba(59,130,246,0.015) 4px)' }} />
            </div>

            {/* ── Micro Grid ── */}
            <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            {/* ── Mobile Nav Toggle ── */}
            <button onClick={() => setMobileNav(!mobileNav)} className="fixed top-20 right-4 z-50 lg:hidden p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white backdrop-blur-sm">
                {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* ── Layout: Sidebar + Content ── */}
            <div className="relative z-10 flex">

                {/* Sidebar */}
                <aside className={`fixed top-0 left-0 h-screen w-64 pt-20 pb-8 px-4 overflow-y-auto border-r border-white/[0.06] bg-[#030304]/90 backdrop-blur-md z-40 transition-transform duration-300 ${mobileNav ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                    <div className="mb-6">
                        <Link href="/docs" className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-4">
                            <BookOpen className="w-4 h-4" /> Back to Docs
                        </Link>
                        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">API Reference</h3>
                        <div className="text-xs text-white/40 mb-4 px-2 py-1.5 rounded bg-white/[0.03] border border-white/[0.06]">
                            {apiCategories.length} categories &middot; {totalEndpoints} endpoints
                        </div>
                    </div>
                    <nav className="space-y-0.5">
                        {apiCategories.map(cat => (
                            <button key={cat.id} onClick={() => scrollToSection(cat.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 ${activeSection === cat.id ? 'bg-white/[0.06] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${activeSection === cat.id ? sidebarDotColors[cat.color] : 'bg-white/20'}`} />
                                <span className="truncate">{cat.label}</span>
                            </button>
                        ))}
                        <div className="pt-2 border-t border-white/[0.04] mt-2">
                            <button onClick={() => scrollToSection('rate-limits')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 text-white/40 hover:text-white/70 hover:bg-white/[0.03]`}>
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white/20" />
                                <span className="truncate">Rate Limits</span>
                            </button>
                            <button onClick={() => scrollToSection('errors')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 text-white/40 hover:text-white/70 hover:bg-white/[0.03]`}>
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white/20" />
                                <span className="truncate">Error Handling</span>
                            </button>
                        </div>
                    </nav>
                    {/* Quick stats */}
                    <div className="mt-8 pt-6 border-t border-white/[0.06] space-y-3">
                        <div className="flex items-center gap-2 text-xs text-white/30">
                            <Server className="w-3.5 h-3.5" /> Base URL
                        </div>
                        <code className="block text-xs text-blue-400 font-mono break-all">https://maula.ai/api</code>
                        <div className="flex items-center gap-2 text-xs text-white/30 mt-3">
                            <Shield className="w-3.5 h-3.5" /> Auth
                        </div>
                        <code className="block text-xs text-emerald-400 font-mono">Bearer token</code>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="w-full lg:pl-64">

                    {/* ── Hero ── */}
                    <section className="relative pt-24 pb-16 px-4 sm:px-8">
                        <div className="max-w-4xl mx-auto">
                            {/* Badge */}
                            <div className="hero-badge flex items-center gap-2 w-fit mx-auto mb-8 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                                <Terminal className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-white/50">I can</span>
                                <span className="tw-text text-sm text-blue-400 font-mono" />
                                <span className="inline-block w-[2px] h-4 bg-blue-400 animate-[blink_1s_steps(2)_infinite]" />
                            </div>

                            {/* Animated Icon */}
                            <div className="flex justify-center mb-10">
                                <div className="relative">
                                    <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-400/40 flex items-center justify-center hero-icon-box">
                                        <Code2 className="w-14 h-14 text-blue-400" />
                                    </div>
                                    <div className="absolute inset-[-18px] rounded-full border border-dashed border-blue-400/20 hero-ring-1" />
                                    <div className="absolute inset-[-34px] rounded-full border border-dashed border-cyan-400/15 hero-ring-2" />
                                    <div className="absolute -top-[34px] left-1/2 w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                                    <div className="absolute -bottom-[18px] right-0 w-1 h-1 rounded-full bg-cyan-400/40" />
                                </div>
                            </div>

                            {/* Title */}
                            <h1 className="hero-title text-center sm:text-6xl text-5xl md:text-7xl font-bold mb-4 leading-tight">
                                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>API Reference</span>
                            </h1>

                            <p className="hero-sub text-center text-lg sm:text-xl text-white/40 max-w-2xl mx-auto mb-10">
                                {totalEndpoints} endpoints across {apiCategories.length} categories. Build powerful integrations with the Maula AI platform.
                            </p>

                            {/* Quick info cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                                {[
                                    { icon: Server, label: 'Base URL', value: 'https://maula.ai/api', cls: 'base-url-code' },
                                    { icon: Lock, label: 'Auth', value: 'Bearer token in header' },
                                    { icon: Zap, label: 'Format', value: 'JSON request & response' },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                                        <item.icon className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                                        <div className="text-xs text-white/30 mb-1">{item.label}</div>
                                        <div className={`text-sm font-mono text-white/70 ${item.cls || ''}`}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── API Sections ── */}
                    <div className="px-4 sm:px-8 pb-24 space-y-16 max-w-4xl mx-auto">
                        {apiCategories.map(cat => {
                            const Icon = cat.icon;
                            const colorCls = iconColorMap[cat.color] || iconColorMap.slate;
                            const example = codeExamples[cat.id];
                            return (
                                <section key={cat.id} id={cat.id} className="api-section-card scroll-mt-24">
                                    {/* Section Header */}
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorCls} border flex items-center justify-center flex-shrink-0`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-1">{cat.label}</h2>
                                            <p className="text-sm text-white/40">{cat.description}</p>
                                        </div>
                                    </div>

                                    {/* Endpoints Table */}
                                    <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-6">
                                        <div className="grid grid-cols-[70px_1fr_auto] sm:grid-cols-[80px_1fr_1fr] gap-0 text-xs font-semibold text-white/30 uppercase tracking-wider px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                                            <span>Method</span>
                                            <span>Endpoint</span>
                                            <span className="hidden sm:block">Description</span>
                                        </div>
                                        {cat.endpoints.map((ep, i) => (
                                            <div key={i} className={`endpoint-row grid grid-cols-[70px_1fr] sm:grid-cols-[80px_1fr_1fr] gap-0 items-center px-4 py-2.5 text-sm ${i !== cat.endpoints.length - 1 ? 'border-b border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}>
                                                <span className={`inline-flex items-center justify-center w-14 py-0.5 rounded text-[10px] font-bold border ${methodColors[ep.method]}`}>
                                                    {ep.method}
                                                </span>
                                                <code className="font-mono text-white/70 text-xs sm:text-sm truncate">{ep.path}</code>
                                                <span className="hidden sm:block text-white/40 text-xs">{ep.desc}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Code Example */}
                                    {example && (
                                        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-white/70">{example.title}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-white/40 font-mono">{example.language}</span>
                                                </div>
                                                <button onClick={() => copyCode(example.code, cat.id)} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors">
                                                    {copiedId === cat.id ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></> : <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>}
                                                </button>
                                            </div>
                                            <pre className="p-4 text-xs sm:text-sm text-white/60 font-mono overflow-x-auto leading-relaxed">
                                                <code>{example.code}</code>
                                            </pre>
                                        </div>
                                    )}
                                </section>
                            );
                        })}

                        {/* ── Rate Limits ── */}
                        <section id="rate-limits" className="api-section-card scroll-mt-24">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-400/30 flex items-center justify-center flex-shrink-0">
                                    <Zap className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Rate Limits</h2>
                                    <p className="text-sm text-white/40">API rate limits by plan tier to ensure fair usage.</p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                <div className="grid grid-cols-3 gap-0 text-xs font-semibold text-white/30 uppercase tracking-wider px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                                    <span>Plan</span><span>Requests/min</span><span>Daily Limit</span>
                                </div>
                                {[
                                    { plan: 'Free', rpm: '30', daily: '1,000' },
                                    { plan: 'Pro', rpm: '120', daily: '10,000' },
                                    { plan: 'Enterprise', rpm: '600', daily: 'Unlimited' },
                                ].map((r, i) => (
                                    <div key={i} className={`grid grid-cols-3 gap-0 px-4 py-3 text-sm ${i < 2 ? 'border-b border-white/[0.04]' : ''}`}>
                                        <span className="text-white/70 font-medium">{r.plan}</span>
                                        <span className="text-white/50 font-mono">{r.rpm}</span>
                                        <span className="text-white/50 font-mono">{r.daily}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-white/30 mt-3">Rate limit headers: <code className="text-white/50">X-RateLimit-Limit</code>, <code className="text-white/50">X-RateLimit-Remaining</code>, <code className="text-white/50">X-RateLimit-Reset</code></p>
                        </section>

                        {/* ── Error Codes ── */}
                        <section id="errors" className="api-section-card scroll-mt-24">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-400/30 flex items-center justify-center flex-shrink-0">
                                    <X className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Error Handling</h2>
                                    <p className="text-sm text-white/40">All errors return a consistent JSON structure with status code and message.</p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-6">
                                <div className="grid grid-cols-[80px_1fr] gap-0 text-xs font-semibold text-white/30 uppercase tracking-wider px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                                    <span>Code</span><span>Description</span>
                                </div>
                                {[
                                    { code: '400', desc: 'Bad Request — Invalid parameters or missing required fields' },
                                    { code: '401', desc: 'Unauthorized — Invalid or missing authentication token' },
                                    { code: '403', desc: 'Forbidden — Insufficient permissions for this resource' },
                                    { code: '404', desc: 'Not Found — The requested resource does not exist' },
                                    { code: '429', desc: 'Too Many Requests — Rate limit exceeded' },
                                    { code: '500', desc: 'Internal Server Error — Something went wrong on our end' },
                                ].map((e, i) => (
                                    <div key={i} className={`grid grid-cols-[80px_1fr] gap-0 px-4 py-2.5 text-sm ${i < 5 ? 'border-b border-white/[0.04]' : ''}`}>
                                        <span className="font-mono text-red-400/80 font-bold">{e.code}</span>
                                        <span className="text-white/50">{e.desc}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                <div className="flex items-center px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
                                    <span className="text-sm font-medium text-white/70">Error Response Format</span>
                                </div>
                                <pre className="p-4 text-xs sm:text-sm text-white/60 font-mono overflow-x-auto leading-relaxed">
                                    <code>{`{
  "error": true,
  "status": 401,
  "message": "Invalid or expired authentication token",
  "code": "AUTH_TOKEN_INVALID"
}`}</code>
                                </pre>
                            </div>
                        </section>

                        {/* ── CTA ── */}
                        <section className="api-section-card">
                            <div className="relative p-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden text-center">
                                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
                                <div className="relative z-10">
                                    <Sparkles className="w-10 h-10 text-blue-400 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold mb-3">Ready to Build?</h2>
                                    <p className="text-white/40 mb-6 max-w-md mx-auto">Get your API key from the dashboard and start building powerful integrations today.</p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all">
                                            Go to Dashboard <ChevronRight className="w-4 h-4" />
                                        </Link>
                                        <Link href="/docs/sdks" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-all">
                                            View SDKs
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>

            {/* ── Scroll to top ── */}
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.1] transition-all backdrop-blur-sm" aria-label="Scroll to top">
                <ArrowUp className="w-5 h-5" />
            </button>

            {/* ── Custom Scrollbar ── */}
            <style jsx>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.5); }
      `}</style>
        </div>
    );
}
