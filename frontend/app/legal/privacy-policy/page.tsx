'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, Observer } from '@/lib/gsap';
import Link from 'next/link';
import { Shield, Database, Eye, Globe, Lock, UserCheck, Key, Server, ArrowLeft, ChevronDown, Clock, CheckCircle, Scale, FileText, MapPin, Cpu, CreditCard, AlertTriangle, RefreshCw } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, Observer);

interface TwinklingStar { x: number; y: number; size: number; opacity: number; speed: number; phase: number; color: string; }

export default function PrivacyPolicyPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<TwinklingStar[]>([]);
    const animFrameRef = useRef<number>(0);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const sections = [
        {
            id: 'collect', icon: Database, title: '1. Information We Collect', glow: 'rgba(6,182,212,0.4)', content: [
                { subtitle: '1.1 Personal Information You Provide', text: 'Account registration data: email address, hashed password (bcrypt — never stored in plaintext), optional display name and avatar URL, and an auto-generated Maula AI User ID for cross-platform linking across maula.ai and spaces.maula.ai. Optional profile data: preferred name, age, gender, and nationality for AI personalisation (stored in PostgreSQL, entirely optional). User-generated content: chat messages, project files (code, HTML, CSS, JS), project metadata, assets uploaded to AWS S3, and AI-generated videos via fal.ai. Contact information when you email support. Encrypted deploy credentials: GitHub, Vercel, Netlify, and AWS tokens stored with AES-256-GCM encryption — never logged, never included in AI prompts, accessible only to the owning user.' },
                { subtitle: '1.2 Automatically Collected Information', text: 'Device data (browser type, OS, screen resolution, device category). IP address and approximate geolocation (country/city, derived from IP). Page views with anonymous visitor ID, path, referrer, UTM parameters, session duration, and page load time. AI usage metrics: model used, input/output token counts, request latency, endpoint category (chat, image, audio, canvas), credit cost, and success/failure status. Security data: login attempts, failed login counts, lock levels, and last-login timestamps for our 3-tier progressive account lockout (15 min → 24 hr → permanent). Cookies and session identifiers (see Section 13).' },
                { subtitle: '1.3 AI Interaction Data', text: 'Text prompts and messages sent to AI agents. Code files in the current project provided as context. Conversation history for multi-turn interactions. Selected AI model and provider. Tool invocations and parameters. Generated responses (text, code, images, audio, video). Agent memories: auto-saved preferences, facts, and interaction patterns — user-scoped, viewable, disableable, and deletable at any time via the Agent Memory panel. Memories are never shared between accounts. Source is tracked: agent (auto-saved) or user (manually saved).' },
                { subtitle: '1.4 Sensitive Personal Information (CPRA)', text: 'Under the CPRA definition of "sensitive personal information" (Cal. Civ. Code § 1798.140(ae)), we may process: account log-in credentials (email + hashed password), contents of messages you send to AI agents (which may contain sensitive content at your discretion), and debit/credit card numbers processed by Stripe (PCI DSS Level 1 — card data never touches our servers). We use sensitive PI only as necessary to provide the services you requested. You may exercise the right to limit use of sensitive PI under the CPRA (see Section 8).' },
            ]
        },
        {
            id: 'use', icon: Eye, title: '2. How We Use Your Information', glow: 'rgba(139,92,246,0.4)', content: [
                { subtitle: 'Service Delivery & Operations — GDPR Basis: Art. 6(1)(b) Contract', text: 'Powering 268 AI tools across 39 categories on Canvas App, Canvas Studio, GenCraft Pro, and Maula Editor — including AI code generation, chat, image-to-code analysis (Azure AI Vision), video generation (fal.ai), text-to-speech, and cloud deployment. Managing your account, authentication, and user preferences. Processing payments and managing credits/subscriptions via Stripe. Executing AI agent tool calls and maintaining conversation context. Persisting project files and agent memories.' },
                { subtitle: 'Communication — GDPR Basis: Art. 6(1)(b)/(f)', text: 'Sending transactional emails (account verification, password resets, billing receipts). Service updates and security alerts. Optional marketing communications — consent-based (Art. 6(1)(a)), opt-out available at any time.' },
                { subtitle: 'Analytics & Improvement — GDPR Basis: Art. 6(1)(f) Legitimate Interest', text: 'Analysing anonymised, aggregated usage metrics (token counts, latency, model distribution) for capacity planning. Tracking page views and feature engagement to improve user experience. Monitoring service performance and uptime. We do NOT use your data to train AI models. Your prompts and generated code are used solely to provide the requested service. Anthropic (our primary provider) does not use API data for training.' },
                { subtitle: 'Legal & Compliance — GDPR Basis: Art. 6(1)(c)', text: 'Complying with applicable laws and regulations (tax, financial reporting). Detecting fraud, preventing abuse, enforcing our Terms of Service, and maintaining platform integrity. Responding to lawful requests from law enforcement or regulatory bodies. Login-attempt monitoring, per-IP rate limiting, and the 3-tier progressive lockout system.' },
            ]
        },
        {
            id: 'sharing', icon: Globe, title: '3. Data Sharing & Disclosure', glow: 'rgba(245,158,11,0.4)', content: [
                { subtitle: 'We Do NOT Sell Your Data — EVER', text: 'We do NOT sell personal information under any circumstances, as defined by CCPA § 1798.140(ad). We do NOT share personal information for cross-context behavioural advertising as defined by CPRA § 1798.140(ah). We have NEVER sold user data in our history and have no plans to do so. We do not monetise your data in any way — our revenue comes exclusively from agent subscriptions. We do not use Google Analytics, Facebook Pixel, or any third-party tracking tools. We do not partner with data brokers, ad networks, or data aggregators.' },
                { subtitle: '3.1 AI Service Providers — Using OUR API Keys', text: 'IMPORTANT: All AI services are accessed through Maula AI\'s own paid API accounts and API keys. Users interact with AI providers exclusively through our infrastructure — you never connect directly to third-party AI APIs, and your identity is never exposed to these providers. We pay for all API usage on your behalf as part of the service. The AI providers we integrate with, using our own enterprise/developer API keys, include: Anthropic (Claude Sonnet 4, Claude Opus 4, Claude Haiku — our primary AI provider for chat, code generation, and agent intelligence), OpenAI (GPT-4o, GPT-4o-mini for chat; DALL·E 3 for image generation; Whisper for speech-to-text transcription; TTS for text-to-speech), Google (Gemini 2.5 Pro and Gemini 2.5 Flash for chat and code generation), Mistral AI (Mistral Large and Codestral for chat and specialised code tasks), xAI (Grok 3 for chat and reasoning), Groq (LLaMA 3.3 70B — hardware-accelerated low-latency inference), Cerebras (ultra-fast inference for supported models), HuggingFace (open-source model hosting and inference API), and optionally Ollama (local/self-hosted models — runs on your own machine, no data leaves your device). None of these providers receive your email, name, account details, or payment information — only the text prompt and project context necessary to generate a response.' },
                { subtitle: '3.1.1 What AI Providers Receive', text: 'When you use an AI feature, we send ONLY: (1) your text prompt or message, (2) relevant code files from your current project for context, and (3) conversation history for multi-turn interactions. We NEVER send: your email address, password, display name, payment information, deploy credentials, browsing history, IP address, or any other personal identifier. All requests are made from our servers using our API keys — providers see Maula AI as the client, not individual users.' },
                { subtitle: '3.1.2 Infrastructure & Media Partners', text: 'Infrastructure: AWS (EC2 compute, S3 file storage with AES-256 encryption, ECS Fargate for sandboxed code execution — one isolated container per session). Media: fal.ai (AI video generation — Minimax, Kling, Hunyuan models, accessed via our API key), Azure AI Vision (image-to-code analysis, accessed via our API key). Payments: Stripe (PCI DSS Level 1 certified — credit card data never touches our servers, processed entirely client-side by Stripe.js). Deployment Targets (user-initiated only): Vercel, Netlify, GitHub, AWS — using the user\'s own stored deploy token; we do not retain a copy after transmission. Email: self-hosted transactional email delivery. CDN: content delivery for static assets.' },
                { subtitle: '3.2 Legal Requirements', text: 'We may disclose information when required by law, court order, subpoena, or government request, or when necessary to protect our rights, safety, property, or the rights of others.' },
                { subtitle: '3.3 Business Transfers', text: 'If we are involved in a merger, acquisition, financing, reorganisation, bankruptcy, or sale of assets, your information may be transferred as part of that transaction. We will notify you via email and/or prominent notice on our platform before your data is transferred and becomes subject to a different privacy policy.' },
                { subtitle: '3.4 With Your Consent', text: 'We may share information with third parties when you give explicit consent.' },
                { subtitle: 'CCPA Disclosure Summary', text: 'Categories disclosed to service providers: (A) Identifiers → AI providers, hosting, payment, deployment; (B) Customer records → Payment processor (Stripe); (D) Commercial info → Payment processor, hosting; (F) Internet activity → AI providers (prompts), hosting (logs); (G) Geolocation → Hosting (server logs); (H) Audio/visual → AI providers (voice, images); (K) Inferences → AI providers (agent memory context). All disclosures are for stated business purposes, not for sale or cross-context behavioural advertising.' },
            ]
        },
        {
            id: 'retention', icon: Clock, title: '4. Data Retention', glow: 'rgba(59,130,246,0.4)', content: [
                { subtitle: 'Retention Periods', text: 'Active account data: retained for the duration of your account plus 30 days after deletion request. AI usage logs (token counts, latency, model): 2 years. Page view and visitor session analytics: 1 year. Security logs (login attempts, lockout events): 90 days. Billing and transaction records: 7 years (tax/legal requirements). Customer support correspondence: 3 years. Agent memories: retained until you delete them or your account is closed. Project files in S3: retained until you delete them or your account is closed. Encrypted deploy credentials: deleted immediately upon user removal or account closure.' },
                { subtitle: 'Deletion Process', text: 'When data expires or you request deletion, we securely erase or anonymise it within 30 days, unless retention is required by law. Backups containing deleted data are purged within 90 days of the deletion event.' },
                { subtitle: 'Data Minimisation', text: 'We apply the principle of data minimisation (GDPR Art. 5(1)(c)) and collect only what is adequate, relevant, and limited to what is necessary for the purposes described in this policy.' },
            ]
        },
        {
            id: 'rights', icon: UserCheck, title: '5. Your Rights', glow: 'rgba(236,72,153,0.4)', content: [
                { subtitle: 'Right to Access', text: 'Request a copy of your personal data and information about how it is processed. Available through your account settings or by contacting us.' },
                { subtitle: 'Right to Rectification', text: 'Have inaccurate or incomplete personal data corrected without undue delay.' },
                { subtitle: 'Right to Erasure ("Right to Be Forgotten")', text: 'Request deletion of your personal data where there is no compelling reason for continued processing.' },
                { subtitle: 'Right to Restriction of Processing', text: 'Restrict processing while we verify accuracy or assess an objection to processing.' },
                { subtitle: 'Right to Data Portability', text: 'Receive your data in a structured, machine-readable format (JSON or CSV) and transmit it to another controller.' },
                { subtitle: 'Right to Object / Opt-Out', text: 'Object to processing of your personal data for certain purposes, including marketing communications, analytics tracking, and non-essential data processing.' },
                { subtitle: 'Right to Withdraw Consent', text: 'Withdraw consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.' },
                { subtitle: 'Agent Memory Control', text: 'AI agent memories about your preferences and interaction patterns can be viewed, individually disabled, or deleted at any time through the Agent Memory panel. Memories are user-scoped and never shared between accounts.' },
                { subtitle: 'How to Exercise Your Rights', text: 'Email: privacy@maula.ai · In-app: Dashboard → Preferences → Privacy Controls · Mailing address: One Last AI, Attn: Privacy Team (see Contact section below). We verify your identity before processing any request. We respond within 30 days (GDPR) or 45 days (CCPA/CPRA), with extensions as permitted by law. We will not charge a fee for reasonable requests.' },
            ]
        },
        {
            id: 'gdpr', icon: Scale, title: '6. GDPR Compliance (EU/EEA/UK)', glow: 'rgba(16,185,129,0.4)', content: [
                { subtitle: '6.1 Data Controller', text: 'One Last AI is the data controller responsible for your personal data under Regulation (EU) 2016/679 (GDPR) and the UK GDPR. Contact details are set out in the Contact section below.' },
                { subtitle: '6.2 Lawful Bases for Processing (Article 6)', text: 'Performance of Contract (Art. 6(1)(b)): Creating & maintaining your account, providing AI agent services, AI code generation & tool execution, credit/billing management, processing payments, sending transactional emails. Legitimate Interest (Art. 6(1)(f)): Page view & visitor session tracking (analytics), security monitoring (login attempts, lockout), analytics & service improvement, fraud prevention & platform protection. Consent (Art. 6(1)(a)): Marketing communications (opt-in only), optional profile data (age, gender, nationality), agent memory storage (user can disable). Legal Obligation (Art. 6(1)(c)): Tax/financial record-keeping, responding to legal requests.' },
                { subtitle: '6.3 Data Subject Rights (Articles 15–22)', text: 'Right of Access (Art. 15): Obtain confirmation of processing and receive a copy. Right to Rectification (Art. 16): Have inaccurate data corrected. Right to Erasure (Art. 17): "Right to be forgotten" — request deletion. Right to Restriction (Art. 18): Restrict processing while we verify accuracy. Right to Data Portability (Art. 20): Receive data in JSON format and transmit to another controller. Right to Object (Art. 21): Object to processing based on legitimate interests. Automated Decision-Making (Art. 22): We do not make solely automated decisions that produce legal effects — AI responses are generated content, not automated legal decisions.' },
                { subtitle: '6.4 International Data Transfers (Chapter V)', text: 'Your data may be transferred outside the EU/EEA. We ensure adequate protection through: Standard Contractual Clauses (SCCs) approved by the European Commission (Decision 2021/914), Data Processing Agreements (DPAs) with all sub-processors, adequacy decisions where applicable, and supplementary measures (encryption, pseudonymization) as required by the Schrems II ruling (Case C-311/18). Request a copy of applicable SCCs at privacy@maula.ai.' },
                { subtitle: '6.5 Data Protection Officer', text: 'You may reach our Data Protection Officer at dpo@maula.ai.' },
                { subtitle: '6.6 Right to Lodge a Complaint', text: 'If you believe your data protection rights have been violated, you have the right to lodge a complaint with your local supervisory authority. A list of EU Data Protection Authorities is available at edpb.europa.eu.' },
                { subtitle: 'Data Protection Impact Assessments', text: 'We conduct DPIAs for high-risk processing activities as required by Art. 35 GDPR, including when introducing new AI features or processing special categories of data.' },
                { subtitle: 'Breach Notification (Arts. 33–34)', text: 'In the event of a personal data breach, we notify the relevant supervisory authority within 72 hours (Art. 33) and affected data subjects without undue delay where the breach is likely to result in high risk to their rights and freedoms (Art. 34).' },
            ]
        },
        {
            id: 'ccpa', icon: FileText, title: '7. CCPA & CPRA Compliance (California)', glow: 'rgba(251,146,60,0.4)', content: [
                { subtitle: 'Scope', text: 'This section applies to California residents pursuant to the California Consumer Privacy Act of 2018 (Cal. Civ. Code \u00a7\u00a7 1798.100\u20131798.199), as amended by the California Privacy Rights Act of 2020 (\u201cCPRA\u201d, effective January 1, 2023). Terms used have the meanings given in the CCPA/CPRA.' },
                { subtitle: '7.1 Categories of PI Collected (\u00a7 1798.110)', text: 'In the preceding 12 months: (A) Identifiers \u2014 name, email, username, IP, account name \u2713; (B) Customer records \u2014 name, address, phone, payment info \u2713; (C) Protected classifications \u2014 age, gender (optional profile fields only) \u2713*; (D) Commercial info \u2014 purchase history, subscription, usage \u2713; (E) Biometric info \u2717; (F) Internet/network activity \u2014 browsing, AI interactions, queries \u2713; (G) Geolocation \u2014 approximate from IP \u2713; (H) Audio/visual \u2014 voice recordings, uploaded images/videos \u2713; (I) Professional info \u2014 job title, company (optional) \u2713; (J) Education info \u2717; (K) Inferences \u2014 agent preferences, usage patterns \u2713; (L) Sensitive PI (CPRA) \u2014 login credentials, AI message contents \u2713*. [*C: Only age/gender as optional fields; *L: Used only as necessary for services].' },
                { subtitle: '7.2 Consumer Rights', text: 'Right to Know/Access (\u00a7 1798.100, \u00a7 1798.110): Request categories and specific pieces of PI, up to twice per 12 months. Right to Delete (\u00a7 1798.105): Request deletion except where retention is legally necessary. Right to Correct (\u00a7 1798.106, CPRA): Correct inaccurate PI. Right to Opt-Out of Sale/Sharing (\u00a7 1798.120): We do NOT sell or share PI \u2014 no opt-out required, but will provide one if practices change. Right to Limit Sensitive PI (\u00a7 1798.121, CPRA): Limit sensitive PI use to service delivery only. Right to Non-Discrimination (\u00a7 1798.125): We will not deny services, charge different prices, or provide different quality for exercising rights.' },
                { subtitle: '7.3 Submitting a Verifiable Consumer Request', text: 'Email privacy@maula.ai with subject \u201cCCPA Request\u201d or use in-app Privacy Controls (Dashboard \u2192 Preferences). We verify identity by matching information against our records. Authorised agents require signed written authorisation or power of attorney. Response within 10 business days (acknowledgement) and 45 calendar days (substantive), extendable by 45 days with notice (90 total).' },
                { subtitle: '7.4 Financial Incentives', text: 'We do not offer financial incentives, price differences, or service differences in exchange for the retention or sale of personal information.' },
                { subtitle: '7.5 Metrics Disclosure', text: 'Per CCPA/CPRA requirements, we will publish annual metrics on the number of requests to know, delete, correct, and opt-out received, complied with, and denied, along with median response time.' },
            ]
        },
        {
            id: 'caloppa', icon: MapPin, title: '8. CalOPPA Compliance', glow: 'rgba(168,85,247,0.4)', content: [
                { subtitle: '8.1 Privacy Policy Accessibility', text: 'Pursuant to the California Online Privacy Protection Act (Cal. Bus. & Prof. Code \u00a7\u00a7 22575\u201322579), this Privacy Policy is conspicuously posted via a \u201cPrivacy Policy\u201d link in the footer of every page on maula.ai, accessible from the registration page and account settings. The link uses the word \u201cPrivacy\u201d as required by \u00a7 22577(b)(1).' },
                { subtitle: '8.2 Categories of PII', text: 'The categories of personally identifiable information (PII) collected are described in Section 1 above. The categories of third parties with whom PII may be shared are described in Section 3 above.' },
                { subtitle: '8.3 Review & Request Changes (\u00a7 22575(b)(2))', text: 'You may review, update, or request changes to your PII by logging into Dashboard \u2192 Profile or emailing privacy@maula.ai. We process requests within 30 days.' },
                { subtitle: '8.4 Do Not Track (DNT) Disclosure (\u00a7 22575(b)(5)\u2013(6))', text: 'Our services do not currently respond to \u201cDo Not Track\u201d browser signals, as there is no industry-standard technology for recognising or honouring DNT signals. We do not engage in cross-site tracking. We do not allow third parties to collect PII about your online activities over time and across different websites. We do not use Google Analytics, Facebook Pixel, or other third-party tracking tools.' },
                { subtitle: '8.5 Effective Date & Changes (\u00a7 22575(b)(3)\u2013(4))', text: 'The effective date is stated at the top of this page. Material changes will be notified via email and prominent notice at least 30 days before taking effect. Continued use after the effective date constitutes acceptance.' },
            ]
        },
        {
            id: 'ai-processing', icon: Cpu, title: '9. AI-Specific Data Processing', glow: 'rgba(34,211,238,0.4)', content: [
                { subtitle: 'AI Training Disclosure \u2014 YOUR DATA IS NEVER USED FOR TRAINING', text: 'We make this commitment unequivocally: Your data is NEVER used to train, fine-tune, improve, or evaluate any AI model \u2014 not by us, and not by any of our AI providers under our API agreements. This applies to all data types: your text prompts, code files, generated outputs, conversation history, agent memories, project files, and any other content you create or share on our platform. Anthropic (our primary provider) explicitly does not use API data for model training under their commercial API terms. OpenAI\u2019s API data usage policy states that data sent through the API is not used for training. Google\u2019s Gemini API, Mistral AI, xAI, Groq, Cerebras, and HuggingFace inference API all operate under similar commercial terms where API inputs are not used for model training. We contractually require all AI providers to not use your data for training as part of our service agreements.' },
                { subtitle: 'Our Own API Keys \u2014 Your Privacy Shield', text: 'All AI requests are made through Maula AI\u2019s own paid API accounts. This is a critical privacy safeguard: AI providers see Maula AI as the customer, not you individually. Your personal identity is completely shielded from all AI providers. We pay for all API usage \u2014 there is no hidden data-for-service exchange. No provider can build a profile on you because they never receive your identity. This architecture means that even if a provider were to change their data practices, they would have no way to associate any data with you personally.' },
                { subtitle: 'What We Send vs. What We NEVER Send to AI Providers', text: 'SENT (only what is necessary for AI responses): User text prompts, code files in the current project (for contextual code generation), and conversation history (for multi-turn context). NEVER SENT \u2014 under any circumstances: User email address, username, display name, or password. User IP address, browser fingerprint, or device information. Payment information, billing details, or Stripe customer IDs. Deploy credentials (GitHub tokens, Vercel tokens, AWS keys). Browsing history, page views, or analytics data. Other users\u2019 data or cross-account information. Agent memories from other users.' },
                { subtitle: 'Agent Memory System', text: 'Our AI agents can auto-save memories about your preferences, facts, and interaction patterns. These are stored in PostgreSQL (agent_memories table), cryptographically scoped to your user account, and absolutely never shared between users or accounts. You have full control: view all memories, disable auto-saving, or delete individual memories at any time through the Agent Memory panel. Source is tracked: "agent" (auto-saved during conversation) or "user" (manually saved by you). Agent memories are never included in requests to AI providers for other users and are never used for any purpose other than personalising your own AI experience.' },
                { subtitle: 'Data Retention by AI Providers', text: 'Third-party AI providers may temporarily cache prompts in memory for processing (typically deleted within 30 days under their API terms). Anthropic: 30-day retention for abuse monitoring, not used for training. OpenAI API: 30-day retention for abuse monitoring, not used for training. Google Gemini API: Data processed in transit, retention per their API terms. Mistral AI: Minimal retention under EU data protection standards. xAI, Groq, Cerebras: Processing-only retention under their respective API agreements. HuggingFace: Inference API processes data in transit. We actively monitor provider policy changes and will update this section and notify users of any material changes.' },
            ]
        },
        {
            id: 'security', icon: Lock, title: '10. Data Security', glow: 'rgba(16,185,129,0.4)', content: [
                { subtitle: 'Encryption', text: 'TLS 1.2/1.3 encryption for all data in transit (HTTPS everywhere). AES-256-GCM application-level encryption for user credentials (deploy tokens, API keys, secrets). AWS EBS encryption at rest for database. AES-256 S3 server-side encryption for file storage with time-limited signed URLs. Payment card data never touches our servers \u2014 handled entirely by Stripe (PCI DSS Level 1).' },
                { subtitle: 'Authentication & Access Controls', text: 'bcrypt password hashing (never stored in plaintext). HTTP-only secure JWT session cookies (HMAC-SHA256 signed). Role-based access control (RBAC) with principle of least privilege. CORS restricted to maula.ai and app domains. COOP/COEP headers for WebContainer SharedArrayBuffer isolation.' },
                { subtitle: 'Monitoring & Lockout', text: '24/7 security monitoring and intrusion detection. Per-IP rate limiting on AI and auth endpoints. 3-tier progressive account lockout (15 min \u2192 24 hr \u2192 permanent) after failed login attempts.' },
                { subtitle: 'Infrastructure', text: 'AWS cloud infrastructure (ap-southeast-1 region) with isolated networks. PostgreSQL 16 + pgvector (89 Prisma models on shared backend, 15 on Maula Editor). Sandboxed code execution in isolated AWS ECS Fargate containers (one per session). User-supplied API keys encrypted separately with AES-256-GCM, never logged, never in AI prompts or server logs.' },
                { subtitle: 'Incident Response', text: 'Comprehensive incident response plan. In the event of a personal data breach, we notify the relevant supervisory authority within 72 hours (GDPR Art. 33) and affected users without undue delay where the breach is likely to result in high risk. Regular encrypted backups with tested disaster recovery procedures. Third-party security assessments and dependency vulnerability scanning.' },
            ]
        },
        {
            id: 'international', icon: Server, title: '11. International Data Transfers', glow: 'rgba(99,102,241,0.4)', content: [
                { subtitle: 'Data Location', text: 'Your data is primarily stored in AWS ap-southeast-1 (Singapore). AI prompts are processed by providers in the United States (Anthropic, OpenAI, xAI, Groq, Cerebras, HuggingFace) and Europe (Mistral). Payment data is processed by Stripe in the United States.' },
                { subtitle: 'Transfer Safeguards', text: 'International transfers are protected by: Standard Contractual Clauses (SCCs) approved by the European Commission, Data Processing Agreements (DPAs) with all third-party processors, adequacy decisions where applicable, supplementary technical measures (encryption, pseudonymization), and Binding Corporate Rules for intra-group transfers.' },
                { subtitle: 'EU/EEA Users', text: 'For users in the EU/EEA, we comply with GDPR Chapter V requirements. For business customers, we offer a Data Processing Agreement (DPA) upon request. Contact privacy@maula.ai to learn more about safeguards in place.' },
            ]
        },
        {
            id: 'pdpa-thailand', icon: Globe, title: '12. PDPA Thailand (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล)', glow: 'rgba(251,191,36,0.4)', content: [
                { subtitle: '12.1 Scope & Applicability', text: 'This section applies to users located in the Kingdom of Thailand, in compliance with the Personal Data Protection Act B.E. 2562 (2019) ("PDPA Thailand"), effective 1 June 2022. The PDPA Thailand governs the collection, use, disclosure, and transfer of personal data of individuals in Thailand. Maula AI acts as a Data Controller under the PDPA Thailand when processing your personal data.' },
                { subtitle: '12.2 Lawful Bases for Processing', text: 'Under the PDPA Thailand, we process personal data based on: (1) Consent — for optional profile data, marketing communications, and agent memory storage; (2) Contractual Necessity (Section 24(3)) — for account creation, service delivery, AI processing, and payment; (3) Legitimate Interest (Section 24(5)) — for analytics, security monitoring, and fraud prevention; (4) Legal Obligation (Section 24(6)) — for tax, financial, and regulatory compliance. We obtain explicit consent where required and you may withdraw consent at any time without affecting prior lawful processing.' },
                { subtitle: '12.3 Data Subject Rights Under PDPA', text: 'Thai data subjects have the right to: Access personal data (Section 30), Obtain a copy in machine-readable format (data portability, Section 31), Object to processing (Section 32), Request erasure or anonymisation (Section 33/34), Restrict processing (Section 34), Rectify inaccurate data (Section 35), Lodge a complaint with the Personal Data Protection Committee (PDPC), and Withdraw consent at any time (Section 19). To exercise these rights, contact privacy@maula.ai or use Dashboard → Preferences → Privacy Controls. We respond within 30 days.' },
                { subtitle: '12.4 Cross-Border Transfers', text: 'Your data is processed in AWS ap-southeast-1 (Singapore) and transferred to AI providers primarily in the US/EU. Under PDPA Section 28, cross-border transfers require the destination country to have adequate data protection standards or appropriate safeguards. We ensure compliance through: contractual obligations with all processors, Standard Contractual Clauses (SCCs), encryption in transit (TLS 1.3) and at rest (AES-256), and data minimisation — AI providers receive only prompts, never personal identifiers.' },
                { subtitle: '12.5 Data Protection Officer (Thailand)', text: 'For PDPA Thailand inquiries, contact our Data Protection Officer at dpo@maula.ai. You may also lodge complaints with the Personal Data Protection Committee (PDPC) of Thailand at pdpc.or.th.' },
            ]
        },
        {
            id: 'pdpa-singapore', icon: Globe, title: '13. PDPA Singapore', glow: 'rgba(56,189,248,0.4)', content: [
                { subtitle: '13.1 Scope & Applicability', text: 'This section applies to users in the Republic of Singapore, in compliance with the Personal Data Protection Act 2012 (No. 26 of 2012) ("PDPA Singapore"), as amended. The PDPA Singapore establishes a data protection framework that governs the collection, use, disclosure, and care of personal data by organisations. Maula AI is committed to complying with all obligations under the PDPA Singapore.' },
                { subtitle: '13.2 Consent & Notification', text: 'Under the PDPA Singapore, we: (1) Notify you of the purposes for which we collect, use, or disclose your personal data (Notification Obligation, Section 20); (2) Obtain your consent before collecting, using, or disclosing personal data (Consent Obligation, Section 13), except where exceptions apply (e.g., contractual necessity, legitimate interests under the 2020 amendments); (3) Allow you to withdraw consent at any time with reasonable notice (Section 16). Upon withdrawal, we inform you of the likely consequences and cease processing within a reasonable time.' },
                { subtitle: '13.3 Data Protection Obligations', text: 'We comply with all nine obligations under the PDPA Singapore: Consent, Purpose Limitation, Notification, Access, Correction, Accuracy, Protection (reasonable security), Retention Limitation, and Transfer Limitation. We implement reasonable security arrangements (TLS 1.3, AES-256-GCM, bcrypt hashing) to protect your personal data. We retain personal data only as long as necessary and dispose of it securely when no longer needed.' },
                { subtitle: '13.4 Access & Correction Rights', text: 'Singapore residents may: (1) Request access to personal data we hold about you and how it has been used or disclosed in the past year (Section 21); (2) Request correction of inaccurate personal data (Section 22). Requests can be made via privacy@maula.ai. We respond within 30 days and charge no fee for reasonable requests.' },
                { subtitle: '13.5 Do Not Call (DNC) Registry', text: 'We comply with the Do Not Call provisions (Part IX of the PDPA). We do not send unsolicited marketing messages via phone, SMS, or fax. Marketing emails are consent-based only, with opt-out available at any time. We check the Singapore DNC Registry before any telephone marketing communications.' },
                { subtitle: '13.6 Cross-Border Transfers', text: 'Under the PDPA Singapore Transfer Limitation Obligation (Section 26), we ensure that personal data transferred outside Singapore is protected to a standard comparable to the PDPA, through: binding contractual obligations with overseas recipients, standard data protection clauses, and verification that recipient jurisdictions provide comparable protection. Your data is hosted in AWS ap-southeast-1 (Singapore) as our primary data centre.' },
                { subtitle: '13.7 Data Breach Notification', text: 'Under the mandatory data breach notification provisions (effective 1 February 2021), we notify the Personal Data Protection Commission (PDPC) within 3 calendar days and affected individuals as soon as practicable if a notifiable data breach occurs — defined as a breach that results in, or is likely to result in, significant harm to affected individuals, or is of a significant scale (500+ individuals).' },
                { subtitle: '13.8 Complaints', text: 'You may lodge a complaint with the Personal Data Protection Commission (PDPC) of Singapore at pdpc.gov.sg if you believe your data protection rights have been violated.' },
            ]
        },
        {
            id: 'uae-data', icon: Globe, title: '14. UAE Data Protection (Federal Decree-Law No. 45/2021)', glow: 'rgba(34,197,94,0.4)', content: [
                { subtitle: '14.1 Scope & Applicability', text: 'This section applies to users located in the United Arab Emirates, in compliance with Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data ("UAE PDPL"), effective 2 January 2022, and its implementing regulations. The UAE PDPL establishes comprehensive data protection requirements for the processing of personal data of individuals in the UAE. Maula AI complies with the UAE PDPL, including requirements set by the UAE Data Office.' },
                { subtitle: '14.2 Lawful Bases for Processing', text: 'Under the UAE PDPL, we process personal data based on: (1) Consent of the data subject (Article 5) — for optional profile fields, marketing, and agent memory; (2) Performance of a contract (Article 5) — for account management, AI services, and payment processing; (3) Compliance with legal obligations — for tax and regulatory requirements; (4) Legitimate interests — for security monitoring, fraud prevention, and analytics, balanced against the rights and freedoms of the data subject. We obtain clear, explicit consent where required and honour withdrawal requests promptly.' },
                { subtitle: '14.3 Data Subject Rights', text: 'UAE residents have the right to: Be informed about data processing activities (transparency), Access their personal data, Rectify inaccurate or incomplete data, Request erasure of personal data ("right to be forgotten"), Restrict processing under certain conditions, Object to processing including automated decision-making, Data portability (receive data in a structured, commonly used format), Withdraw consent at any time, and Lodge a complaint with the UAE Data Office. To exercise these rights, email privacy@maula.ai. We respond within 20 working days as required by the UAE PDPL.' },
                { subtitle: '14.4 Cross-Border Data Transfers', text: 'Under the UAE PDPL, transferring personal data outside the UAE requires adequate safeguards. We ensure compliance through: an assessment that the receiving jurisdiction provides adequate data protection, Standard Contractual Clauses and binding contractual terms with all data processors, technical safeguards (encryption, pseudonymisation), and approval from the UAE Data Office where required. Our primary data centre is AWS ap-southeast-1 (Singapore), and AI providers operate primarily in the US and EU.' },
                { subtitle: '14.5 Data Protection Impact Assessments', text: 'We conduct Data Protection Impact Assessments (DPIAs) for processing activities that may present high risk to data subjects in the UAE, including when introducing new AI features or processing sensitive categories of data, as required under the UAE PDPL.' },
                { subtitle: '14.6 UAE Data Office', text: 'For UAE-specific data protection inquiries, contact dpo@maula.ai. You may also file complaints with the UAE Data Office (established under Federal Decree-Law No. 44 of 2021) at uaedataoffice.ae.' },
            ]
        },
        {
            id: 'children', icon: AlertTriangle, title: '15. Children\'s Privacy (COPPA)', glow: 'rgba(239,68,68,0.4)', content: [
                { subtitle: 'Age Restriction', text: 'Our services are NOT intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 13 (as defined by COPPA, 15 U.S.C. \u00a7\u00a7 6501\u20136506) or under 16 (as defined by GDPR Art. 8 and CCPA for \u201cminors\u201d).' },
                { subtitle: 'Parental Notice', text: 'If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at privacy@maula.ai. We will delete such information within 48 hours of verification.' },
                { subtitle: 'CCPA Minors Disclosure', text: 'We do not have actual knowledge that we sell or share the personal information of consumers under 16 years of age (CCPA \u00a7 1798.120(c)).' },
            ]
        },
        {
            id: 'cookies', icon: Key, title: '16. Cookies & Tracking', glow: 'rgba(59,130,246,0.4)', content: [
                { subtitle: 'Essential Cookies (Required)', text: 'neural_link_session: JWT authentication cookie, HTTP-only, secure, 7-day expiry. neural_token: Backup auth token, session-scoped. session_id / sessionId: Main-site session linking. These cannot be disabled \u2014 required for authentication and security.' },
                { subtitle: 'Preference Cookies (Opt-Out Available)', text: 'Theme preferences (dark mode), AI model/provider selection, and display settings. Duration: 1 year.' },
                { subtitle: 'Analytics (Self-Hosted, Opt-Out Available)', text: 'Page views, feature engagement, and usage patterns tracked via our own first-party PostgreSQL database (page_views, visitor_sessions tables). Duration: 1 year. No Google Analytics, Facebook Pixel, or third-party tracking cookies are used.' },
                { subtitle: 'No Third-Party Tracking', text: 'We do NOT use third-party advertising cookies or tracking pixels. For detailed information including localStorage keys used by sub-site applications, see our Cookie Policy at /legal/cookie-policy.' },
                { subtitle: 'Legal Basis for Cookies', text: 'Under GDPR, non-essential cookies require prior consent (ePrivacy Directive Art. 5(3) / \u201cCookie Law\u201d). Under CalOPPA and CCPA, we disclose our cookie practices above. You can manage cookie preferences through our Cookie Policy page or your browser settings.' },
            ]
        },
        {
            id: 'changes', icon: RefreshCw, title: '17. Changes to This Policy', glow: 'rgba(99,102,241,0.4)', content: [
                { subtitle: 'Notification of Changes', text: 'We may update this Privacy Policy periodically to reflect changes in our practices, legal requirements, or operational needs. When we make material changes, we will: notify you via email (at the address associated with your account), post a prominent notice on our platform, update the \u201cEffective Date\u201d at the top of this page, and for changes requiring consent under GDPR, obtain your renewed consent.' },
                { subtitle: 'Your Continued Use', text: 'We encourage you to review this Privacy Policy periodically. Your continued use of our services after the updated policy becomes effective constitutes acceptance of the changes, except where consent is required by law.' },
            ]
        },
        {
            id: 'billing', icon: CreditCard, title: '18. Billing & Payment Data', glow: 'rgba(16,185,129,0.4)', content: [
                { subtitle: 'PCI Compliance', text: 'Credit card data never touches our servers. All payment processing is handled on the client side by Stripe.js, going directly to Stripe (PCI DSS Level 1 certified). We only store Stripe Customer ID and Payment Intent references.' },
                { subtitle: 'What We Store', text: 'We store subscription status, credit balance (user_credits), transaction history (credit_transactions), and billing history in PostgreSQL. No card numbers, CVVs, or billing addresses are stored on our infrastructure.' },
                { subtitle: 'Agent Pricing Model', text: 'Agent access is sold as one-time purchases (not recurring subscriptions): $1/day, $10→$5/week (50% OFF Welcome Gift, save 29%), $30→$15/month (50% OFF, save 37%), or $300→$150/year (50% OFF, save 59%) per agent. Each purchase unlocks one specific agent for the selected duration. All agent purchases include unlimited conversations, real-time AI responses, voice interaction, agent memory, and analytics.' },
                { subtitle: 'GenCraft Pro Pricing', text: 'GenCraft Pro — our full-featured IDE — offers one-time purchase plans: $14→$7/week (50% OFF Welcome Gift), $38→$19/month (50% OFF, Most Popular), or $240→$120/year ($10/month, 50% OFF, Best Value). Every plan includes: 9+ AI providers, 40+ programming languages, Sandpack live preview, Monaco + CodeMirror 6 dual editors, 35+ AI tools, deployment to 5 platforms (Vercel, Netlify, GitHub Pages, AWS, custom), image-to-code analysis, AI video generation, and unlimited generations. All GenCraft Pro purchases are one-time — no auto-renewal, no hidden fees.' },
                { subtitle: 'Canvas Studio Pricing', text: 'Canvas Studio — our AI builder with Sandpack live preview and CloudPreview — offers one-time purchase plans: $20→$10/week (50% OFF Welcome Gift), $60→$30/month (50% OFF, Most Popular), or $600→$300/year ($25/month, 50% OFF, Best Value). Every plan includes: AI-powered code generation, Sandpack live preview, cloud sandbox execution, and unlimited generations. All Canvas Studio purchases are one-time — no auto-renewal, no hidden fees.' },
                { subtitle: 'Spaces Credit System', text: 'Maula AI Spaces (spaces.maula.ai) uses a transparent credit-based system across four applications: Neural Chat, Canvas Studio, GenCraft Pro, and Maula Editor. Credit packs: Starter ($5 → 10 credits), Pro ($20 → 55 credits, includes 5 bonus), Power ($35 → 115 credits, includes 15 bonus), Enterprise ($150 → 600 credits, includes 100 bonus). 1 credit = $0.10 USD. Credits never expire, there are no subscriptions, and no auto-renewal. Credit costs per action: standard chat 0.01–0.15 credits, advanced chat 0.15–0.75 credits, HD image generation ~0.80 credits, AI video generation 5–8 credits, text-to-speech ~0.15 credits per 1,000 characters, code generation 0.03–0.50 credits, image-to-code 0.10–0.30 credits, web search 0.05–0.20 credits.' },
                { subtitle: 'No Data Monetisation', text: 'Our revenue comes exclusively from agent subscriptions, GenCraft Pro plans, and Spaces credits. We do NOT monetise user data, serve advertisements, or engage in any data-for-service exchange. There is no free-tier data harvesting. All pricing is transparent and published on our platform.' },
                { subtitle: 'Refund & Dispute Handling', text: 'Payment disputes and refunds are handled through Stripe. All purchases are one-time with no auto-renewal. See our Payments & Refunds policy for full details.' },
            ]
        },
        {
            id: 'device-security', icon: Key, title: '19. Device Security Module', glow: 'rgba(239,68,68,0.4)', content: [
                { subtitle: '19.1 What Is the Device Security Module', text: 'Maula Device Security is an optional, separately installed Android application that provides anti-theft protection for your device. You are explicitly prompted to download and install it — it is never installed without your knowledge or consent. The app has no visible home-screen icon after installation, but its presence and purpose are fully disclosed to you before you choose to install it.' },
                { subtitle: '19.2 Data Collected by the Security Module', text: 'The security module is DORMANT after installation and collects NO data unless your device is reported lost and our security team manually activates it. Once activated (see 19.3), the app may collect: GPS location coordinates (latitude, longitude, accuracy, altitude, speed); device status at each ping (battery level, network type, SIM card hash used for swap detection); and front-camera photographs taken at intervals. All data is encrypted in transit (TLS 1.3) and at rest (AES-256 SSE via AWS S3).' },
                { subtitle: '19.3 Activation — Manual Process Only', text: 'The security module will NEVER activate automatically. Tracking only begins after ALL of the following steps occur: (1) You submit a lost-device report at maula.ai/security/report-lost; (2) You provide identity verification information (name, email, purchase proof or other ownership evidence); (3) A member of our security team manually reviews your submission and verifies your identity; (4) The security team member clicks "Activate Tracking" in our internal admin panel. This is a deliberate, human-authorised process. No automated system can activate tracking.' },
                { subtitle: '19.4 What Happens After Activation', text: 'Once tracking is activated: your device silently begins sending GPS pings at approximately 30-second intervals; the front camera may take photographs at 5-minute intervals. Your device displays no notifications or alerts about this activity — this is intentional, as any alert would warn the thief. Our security team monitors the incoming data. When sufficient data is collected, a report is compiled containing location history and photographs.' },
                { subtitle: '19.5 How You Receive Your Data', text: 'After your report is processed: (1) You receive an email notification that your report is ready; (2) A payment link for a one-time fee ($9.99 USD) is included in this email; (3) Upon payment, you receive a secure one-time download link (valid 48 hours); (4) The download contains a ZIP archive with your location history (GPS coordinates with timestamps) and photographs. The download link is single-use and expires after 48 hours. Payment is handled by Stripe (PCI DSS Level 1).' },
                { subtitle: '19.6 Data Retention for Security Data', text: 'Location pings and photographs are retained for 90 days after the tracking period ends (after your device is found, or if you close the report). The generated report ZIP is retained for 48 hours after the download link is created. Payment records are retained per our standard billing data policy (Section 18). You may request deletion of security data by emailing security@maula.ai with your report ID.' },
                { subtitle: '19.7 How to Remove the Security Module', text: 'To uninstall the app: (1) Go to Settings → Security → Device Admin Apps; (2) Deactivate "Maula Security" as a device administrator; (3) Go to Settings → Apps → Maula Security → Uninstall. If you cannot find it, the app may be installed under a neutral name — contact security@maula.ai for removal assistance. You may also send a self-destruct command through your account dashboard, which will wipe the app and all local data.' },
                { subtitle: '19.8 Legal Basis', text: 'We process security module data under: (1) Your explicit consent — given when you chose to install the security app with full disclosure of its capabilities; (2) Legitimate interests — detecting and recovering stolen devices, deterring device theft, and delivering the anti-theft service you requested. We do not use security module data for any purpose other than the lost-device recovery service described above.' },
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
        const colors = ['rgba(255,255,255,', 'rgba(6,182,212,', 'rgba(139,92,246,', 'rgba(16,185,129,'];
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
            CustomWiggle.create('privacyW', { wiggles: 5, type: 'uniform' });
            gsap.to('.nebula-orb', { x: 'random(-100,100)', y: 'random(-70,70)', scale: 'random(0.6,1.4)', opacity: 'random(0.03,0.07)', duration: 14, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
            gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => { gsap.to(p, { y: '-=200', x: 'random(-50,50)', opacity: 0, duration: 5 + Math.random() * 5, repeat: -1, delay: i * 0.35, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } }); });
            gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });
            gsap.fromTo('.hero-title', { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
            gsap.fromTo('.hero-subtitle', { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });
            gsap.to('.hero-icon-container', { boxShadow: '0 0 60px rgba(6,182,212,0.4), 0 0 120px rgba(6,182,212,0.15)', scale: 1.06, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });
            gsap.from('.hero-badge', { scale: 0, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.8 });
            gsap.utils.toArray<HTMLElement>('.section-card').forEach((card, i) => { gsap.from(card, { scrollTrigger: { trigger: card, start: 'top 90%' }, opacity: 0, y: 50, duration: 0.6, delay: i * 0.05, ease: 'power3.out' }); });
            gsap.set('.summary-block', { y: 40, opacity: 0 }); ScrollTrigger.create({ trigger: '.summary-block', start: 'top 85%', onEnter: () => gsap.to('.summary-block', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }) });
            gsap.set('.contact-block', { y: 40, opacity: 0 }); ScrollTrigger.create({ trigger: '.contact-block', start: 'top 88%', onEnter: () => gsap.to('.contact-block', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }) });
            Observer.create({ target: containerRef.current, type: 'scroll', onChangeY: (self) => { const v = Math.min(Math.abs(self.velocityY) / 1200, 0.8); gsap.to('.section-card', { skewY: self.velocityY > 0 ? v : -v, duration: 0.2 }); }, onStop: () => gsap.to('.section-card', { skewY: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }) });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.7 }} />
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="nebula-orb absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
                <div className="nebula-orb absolute top-[55%] right-[15%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ top: '-2px' }} />
                {[...Array(15)].map((_, i) => <div key={i} className="stardust absolute rounded-full" style={{ left: `${5 + i * 6.2}%`, top: `${60 + (i % 4) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 2 === 0 ? 'rgba(6,182,212,0.6)' : 'rgba(139,92,246,0.5)', opacity: 0.6 }} />)}
                <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 200, top: mousePos.y - 200, background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
            </div>

            <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-20 z-10">
                <div className="container mx-auto px-4 text-center relative z-10">
                    <div className="absolute top-6 left-4 lg:top-8 lg:left-6">
                        <Link href="/legal" className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors text-sm group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />Back to Legal
                        </Link>
                    </div>
                    <div className="relative inline-block mb-8">
                        <div className="hero-ring absolute -inset-5 rounded-full border-2 border-dashed border-cyan-500/30" />
                        <div className="hero-icon-container relative inline-flex items-center justify-center w-24 h-24 rounded-3xl border border-cyan-400/40 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.35), rgba(16,185,129,0.25))' }}>
                            <Shield className="w-12 h-12 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 15px rgba(6,182,212,0.7))' }} />
                        </div>
                    </div>
                    <h1 className="hero-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Privacy Policy</span>
                    </h1>
                    <p className="hero-subtitle text-lg text-gray-400 max-w-2xl mx-auto mb-8 font-light" style={{ opacity: 0 }}>This policy covers <span className="text-cyan-400">maula.ai</span> and <span className="text-cyan-400">spaces.maula.ai</span> (Canvas App, Canvas Studio, GenCraft Pro, Maula Editor). We are committed to protecting your privacy in compliance with GDPR, CCPA/CPRA, CalOPPA, COPPA, PIPEDA, PDPA Thailand, PDPA Singapore, and UAE PDPL.</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 backdrop-blur-sm flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-400" /><span className="text-sm text-gray-400 font-medium">Effective: February 18, 2026</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-emerald-500/20 backdrop-blur-sm flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" /><span className="text-sm text-gray-400 font-medium">GDPR Compliant</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-orange-500/20 backdrop-blur-sm flex items-center gap-2"><FileText className="w-4 h-4 text-orange-400" /><span className="text-sm text-gray-400 font-medium">CCPA + CPRA Compliant</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-purple-500/20 backdrop-blur-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-400" /><span className="text-sm text-gray-400 font-medium">CalOPPA Compliant</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-rose-500/20 backdrop-blur-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" /><span className="text-sm text-gray-400 font-medium">COPPA Compliant</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-yellow-500/20 backdrop-blur-sm flex items-center gap-2"><Globe className="w-4 h-4 text-yellow-400" /><span className="text-sm text-gray-400 font-medium">PDPA Thailand</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-sky-500/20 backdrop-blur-sm flex items-center gap-2"><Globe className="w-4 h-4 text-sky-400" /><span className="text-sm text-gray-400 font-medium">PDPA Singapore</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-green-500/20 backdrop-blur-sm flex items-center gap-2"><Globe className="w-4 h-4 text-green-400" /><span className="text-sm text-gray-400 font-medium">UAE PDPL</span></div>
                    </div>
                </div>
            </section>

            <section className="relative py-12 z-10">
                <div className="container mx-auto px-4"><div className="max-w-4xl mx-auto">
                    <div className="summary-block mb-10 p-5 rounded-2xl bg-white/[0.02] border border-cyan-500/15 overflow-hidden">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border border-cyan-400/30" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(16,185,129,0.1))' }}><CheckCircle className="w-5 h-5" style={{ color: '#67e8f9', filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.4))' }} /></div>
                            <div><h3 className="text-base font-bold text-gray-200 mb-1">Quick Summary</h3><p className="text-gray-600 text-[13px] leading-relaxed">This policy applies to maula.ai and spaces.maula.ai — covering Canvas App, Canvas Studio, GenCraft Pro, and Maula Editor. We collect minimal data necessary to power our 268-tool AI platform. <strong className="text-cyan-400">We NEVER sell your data. We NEVER use your data to train any AI model. We NEVER share your identity with AI providers.</strong> All AI services (Anthropic, OpenAI, Google, Mistral, xAI, Groq, Cerebras, HuggingFace) are accessed through our own paid API keys — your personal information is never exposed to these providers. We encrypt credentials with AES-256-GCM, and give you full control over your information including agent memories. We comply with GDPR, CCPA/CPRA, CalOPPA, COPPA, PIPEDA, PDPA Thailand, PDPA Singapore, and UAE PDPL.</p></div>
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
                                                <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/[0.08]" style={{ background: `linear-gradient(135deg, ${section.glow.replace('0.4', '0.2')}, rgba(6,182,212,0.1))`, boxShadow: `0 0 16px ${section.glow.replace('0.4', '0.08')}` }}>
                                                    <Icon className="w-5 h-5" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 6px ${section.glow})` }} />
                                                </div>
                                                <h3 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors">{section.title}</h3>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-cyan-400' : ''}`} />
                                        </div>
                                        {isExpanded && (
                                            <div className="mt-5 pt-5 border-t border-white/[0.04] space-y-5">
                                                {section.content.map((item, idx) => (
                                                    <div key={idx} className="pl-[60px]">
                                                        <h4 className="text-sm font-semibold text-cyan-400 mb-1.5">{item.subtitle}</h4>
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
                        <h3 className="text-xl font-bold text-white mb-3">Privacy Concerns?</h3>
                        <p className="text-gray-600 text-sm mb-2">If you have questions about our privacy practices or want to exercise your data rights, contact our privacy team.</p>
                        <p className="text-gray-600 text-xs mb-6">For GDPR data subject requests: <strong className="text-gray-400">dpo@maula.ai</strong> &middot; For CCPA/CPRA verifiable consumer requests: <strong className="text-gray-400">privacy@maula.ai</strong> &middot; Response within 30\u201345 days as required by applicable law.</p>
                        <div className="flex flex-wrap gap-3">
                            <Link href="mailto:privacy@maula.ai" className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 border border-cyan-500/25 text-cyan-400 font-medium text-sm hover:border-cyan-500/40 transition-all">privacy@maula.ai</Link>
                            <Link href="/contact" className="px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 font-medium text-sm hover:bg-white/[0.06] hover:text-white transition-all">Contact Support</Link>
                        </div>
                    </div>
                </div></div>
            </section>

            <style jsx global>{`
                .section-card::before { content: ''; position: absolute; inset: 0; border-radius: 1rem; opacity: 0.015; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"); pointer-events: none; z-index: 1; }
                ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #030304; } ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 3px; } ::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }
            `}</style>
        </div>
    );
}
