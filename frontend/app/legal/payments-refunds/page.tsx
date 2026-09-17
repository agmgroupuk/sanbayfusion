'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, Observer } from '@/lib/gsap';
import Link from 'next/link';
import { CreditCard, DollarSign, Clock, XCircle, AlertTriangle, Zap, ArrowLeft, ChevronDown, Shield, Ban, Check, Code, Palette, Cpu, PenTool } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, Observer);

interface TwinklingStar { x: number; y: number; size: number; opacity: number; speed: number; phase: number; color: string; }

export default function PaymentsRefundsPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<TwinklingStar[]>([]);
    const animFrameRef = useRef<number>(0);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const pricingTiers = [
        { name: '1 Day', price: '$1', perDay: '$1/day', color: 'rgba(6,182,212,', border: 'border-cyan-500/20', popular: false },
        { name: '1 Week', price: '$5', perDay: '$0.71/day', color: 'rgba(139,92,246,', border: 'border-violet-500/20', popular: true, originalPrice: '$10', discount: '50% OFF' },
        { name: '1 Month', price: '$15', perDay: '$0.50/day', color: 'rgba(16,185,129,', border: 'border-emerald-500/20', popular: false, originalPrice: '$30', discount: '50% OFF' },
        { name: '1 Year', price: '$150', perDay: '$0.41/day', color: 'rgba(245,158,11,', border: 'border-amber-500/20', popular: false, originalPrice: '$300', discount: '50% OFF' },
    ];

    const sections = [
        {
            id: 'overview', icon: DollarSign, title: '1. Overview', glow: 'rgba(16,185,129,0.4)', content: [
                { subtitle: 'One-Time Purchases — No Auto-Renewal', text: 'This Payments & Refunds Policy explains the pricing structure, payment methods, billing procedures, and refund policy for One Last AI services. By purchasing access to our services, you agree to these terms.' },
                { subtitle: 'Simple Per-Agent Model', text: 'Choose from $1/day, $10→$5/week (50% OFF), $30→$15/month (50% OFF), or $300→$150/year (50% OFF) access to any AI agent. Enjoy our Welcome Gift pricing! Each purchase is one-time only with NO automatic renewal. You only pay when you want access — no surprises, no recurring charges.' },
            ]
        },
        {
            id: 'pricing', icon: CreditCard, title: '2. Pricing Structure', glow: 'rgba(59,130,246,0.4)', content: [
                { subtitle: 'Per-Agent Pricing', text: 'Maula AI operates on a per-agent access model. Each AI agent has individual pricing — there are no bundled subscription plans. Choose from four flexible durations: 1 Day ($1), 1 Week ($10→$5 — 50% OFF), 1 Month ($30→$15 — 50% OFF), or 1 Year ($300→$150 — 50% OFF) per agent. Each purchase is one-time only with NO auto-renewal. You must manually re-purchase when access expires.' },
                { subtitle: '2.1 What\'s Included', text: 'Every purchase includes: access to 90+ specialised AI personalities, 268 tools across 39 categories, 19 network utilities and WHOIS services, emotional TTS with 15+ voices, community features to connect with users worldwide, usage analytics and performance tracking, and priority email support within 24 hours.' },
                { subtitle: '2.2 No Free Tier', text: 'Maula AI does not offer a free tier. All agent access requires a one-time payment starting at $1/day. This low-cost model ensures high-quality AI services without ads, continuous platform improvements, responsive customer support, data privacy and security investments, and no surprise recurring charges.' },
                { subtitle: 'Tax Information', text: 'Prices displayed are exclusive of applicable taxes. Sales tax, VAT, or GST may be added based on your location at checkout. Final charges will be clearly shown before payment.' },
            ]
        },
        {
            id: 'payment-methods', icon: Shield, title: '3. Payment Methods', glow: 'rgba(6,182,212,0.4)', content: [
                { subtitle: 'Accepted Payment Methods', text: 'Credit & Debit Cards: Visa, MasterCard, American Express, Discover, Diners Club, JCB. PayPal: Link your PayPal account for convenient payments. International Payments: We accept payments from most countries worldwide.' },
                { subtitle: '3.1 Payment Processing', text: 'Payments are processed securely through Stripe (PCI DSS Level 1 certified) and PayPal. All transactions use 256-bit SSL encryption. We do NOT store full credit card numbers — card data never touches our servers.' },
                { subtitle: 'Secure Payment Guarantee', text: 'Your payment information is never stored on our servers. All transactions are processed through PCI-compliant third-party providers with bank-level security.' },
                { subtitle: 'Currency', text: 'All prices are listed in USD (United States Dollars). Currency conversion is handled by your payment provider and may include additional fees from your bank.' },
            ]
        },
        {
            id: 'payment-terms', icon: Clock, title: '4. Payment Terms', glow: 'rgba(139,92,246,0.4)', content: [
                { subtitle: '4.1 One-Time Purchase — No Auto-Renewal', text: 'Your payment method will be charged once when you purchase access. Charge occurs immediately upon purchase. There is NO automatic renewal — you will NOT be charged again. Access expires after your chosen period (1 day, 1 week, 1 month, or 1 year). You must manually purchase again if you want continued access. You control when you pay — no surprises.' },
                { subtitle: '4.2 Payment Failures', text: 'If a payment fails during purchase, you will see an error message and can retry with a different payment method. Access is not granted until payment succeeds. Since there is no auto-renewal, we do not retry failed payments — you simply try again when ready.' },
                { subtitle: '4.3 Currency and Taxes', text: 'All prices are in USD (United States Dollars). Your bank may apply currency conversion fees. Sales tax or VAT may be added based on your location. Final charges will be clearly shown before payment.' },
                { subtitle: '4.4 Updating Payment Information', text: 'You can update your payment method at any time in your account settings. Updated payment information applies to future purchases immediately.' },
            ]
        },
        {
            id: 'no-refund', icon: Ban, title: '5. Refund Policy', glow: 'rgba(239,68,68,0.4)', content: [
                { subtitle: '5.1 General Policy — All Payments Are Final', text: 'As a general rule, all payments made to Maula AI are final, non-refundable, and non-transferable. This includes daily access charges ($1.00/day), weekly access charges ($10.00→$5.00/week — 50% OFF Welcome Gift), monthly access charges ($30.00→$15.00/month — 50% OFF Welcome Gift), yearly access charges ($300.00→$150.00/year — 50% OFF Welcome Gift), GenCraft Pro plans ($14→$7/week, $38→$19/month, $240→$120/year — 50% OFF Welcome Gift), Canvas Studio plans ($20→$10/week, $60→$30/month, $600→$300/year — 50% OFF Welcome Gift), and any one-time purchase fees.' },
                { subtitle: '5.2 Refund Exception — Service Failures on Our Side', text: 'We WILL issue a full or partial refund if the inability to use the service is caused by us. Eligible situations include: (1) Prolonged system outages or downtime preventing you from accessing purchased services; (2) Critical technical issues or bugs on our platform that make the service unusable for a significant portion of your access period; (3) Payment processing errors resulting in incorrect charges, duplicate charges, or overcharges; (4) Service delivery failures where you paid but did not receive the access or features promised; (5) Extended service degradation caused by infrastructure problems on our end. To request a refund under this exception, email billing@sanbayfusion.com with your account email, transaction ID, and a description of the issue. Approved refunds are processed back to your original payment method within 5–10 business days.' },
                { subtitle: '5.3 Situations NOT Eligible for Refunds', text: 'Refunds are not available for: general dissatisfaction with AI responses, accidental purchases, change of mind, lack of usage during your access period, early cancellation (access expires naturally — no pro-rated refunds), feature requests not yet implemented, user-side internet or device issues, or competitor comparisons. By purchasing, you acknowledge and accept this refund policy.' },
                { subtitle: '5.4 Rationale', text: 'Our limited-refund policy exists because: (1) Extremely Low Cost — at just $1.00 per day, our service is priced affordably for everyone; (2) Immediate Access — you receive full platform access immediately upon payment, and AI services are consumed instantly; (3) Digital Service Nature — AI computational resources and API calls cannot be "returned" once consumed; (4) Transparent Pricing — you know exactly what you are paying upfront with no hidden fees. We stand behind our service and will make it right when the issue is on our end.' },
                { subtitle: '5.5 Alternatives to Refunds', text: 'If you are experiencing issues that do not qualify for a refund: Contact Support at support@sanbayfusion.com for technical assistance. Cancel Your Access to prevent duplicate purchases. Provide Feedback to help us improve. Review Documentation and explore guides at sanbayfusion.com/docs.' },
            ]
        },
        {
            id: 'cancellation', icon: XCircle, title: '6. Cancellation & Access Management', glow: 'rgba(236,72,153,0.4)', content: [
                { subtitle: 'No Auto-Renewal = Simple Management', text: 'Since all purchases are one-time with NO auto-renewal, there is nothing to "cancel" in the traditional sense. You are never automatically charged again. Your access simply expires after your chosen period (1 day, 1 week, 1 month, or 1 year), and you can re-purchase whenever you want.' },
                { subtitle: '6.1 Stopping Access Early', text: 'If you want to stop using an agent before your access expires: Method 1 — Agent Page: Go to the /subscribe page, find your active agent, click "Cancel Subscription", and confirm. Method 2 — Email: Send an email to support@sanbayfusion.com with your account email, agent name, and "CANCEL ACCESS" in the subject line.' },
                { subtitle: '6.2 What Happens When You Cancel', text: 'Immediate Effect: Access is terminated and you can no longer use the agent. No Future Charges: Since there is no auto-renewal, you will not be charged again. Data Retention: Your conversation history is kept for 30 days. No Refund: Current purchase is not refunded (all sales final). Can Re-purchase: You can buy access again anytime you want.' },
                { subtitle: '6.3 Re-purchasing Access', text: 'You can purchase access again at any time after expiration or cancellation. Go to the /subscribe page, choose the same or different agent, select your preferred plan ($1/day, $10→$5/week, $30→$15/month, or $300→$150/year — all at 50% OFF Welcome Gift pricing), and complete payment — access starts immediately. Your previous conversation history is restored if within 30 days.' },
            ]
        },
        {
            id: 'chargebacks', icon: AlertTriangle, title: '7. Chargebacks & Disputes', glow: 'rgba(245,158,11,0.4)', content: [
                { subtitle: '7.1 Contact Us First', text: 'Before filing a chargeback or payment dispute with your bank, please contact us at billing@sanbayfusion.com. We are committed to resolving billing issues quickly.' },
                { subtitle: '7.2 Chargeback Policy', text: 'Filing a chargeback for a legitimate charge may result in: immediate account suspension, permanent ban from future services, legal action for fraudulent chargebacks, and collection of chargeback fees ($15–$25).' },
                { subtitle: '7.3 Legitimate Disputes', text: 'We will work with you on legitimate billing errors such as: charges after proper cancellation, duplicate transactions, unauthorised account access, system processing errors, or being charged for duplicate active access to the same agent. These issues will be investigated and resolved within 5–7 business days.' },
            ]
        },
        {
            id: 'price-changes', icon: Zap, title: '8. Price Changes', glow: 'rgba(6,182,212,0.4)', content: [
                { subtitle: 'Price Change Policy', text: 'We reserve the right to change our pricing at any time. Price changes will be communicated at least 30 days in advance via email, apply to all new purchases immediately upon announcement, not affect any active access periods already purchased at the old price, and allow you to make final purchases at current prices before changes take effect.' },
                { subtitle: 'No Lock-In', text: 'Since there is no auto-renewal, you are never locked into new pricing — you simply choose whether to purchase again at the new rates.' },
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
        const colors = ['rgba(255,255,255,', 'rgba(16,185,129,', 'rgba(139,92,246,', 'rgba(6,182,212,'];
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
            CustomWiggle.create('payW', { wiggles: 5, type: 'uniform' });
            gsap.to('.nebula-orb', { x: 'random(-100,100)', y: 'random(-70,70)', scale: 'random(0.6,1.4)', opacity: 'random(0.03,0.07)', duration: 14, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
            gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => { gsap.to(p, { y: '-=200', x: 'random(-50,50)', opacity: 0, duration: 5 + Math.random() * 5, repeat: -1, delay: i * 0.35, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } }); });
            gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });
            gsap.fromTo('.hero-title', { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
            gsap.fromTo('.hero-subtitle', { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });
            gsap.to('.hero-icon-container', { boxShadow: '0 0 60px rgba(16,185,129,0.4), 0 0 120px rgba(16,185,129,0.15)', scale: 1.06, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });
            gsap.from('.hero-badge', { scale: 0, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.8 });
            gsap.from('.pricing-card', { scrollTrigger: { trigger: '.pricing-grid', start: 'top 85%' }, opacity: 0, y: 60, scale: 0.93, duration: 0.7, stagger: 0.12, ease: 'power3.out' });
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
                <div className="nebula-orb absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)' }} />
                <div className="nebula-orb absolute top-[55%] right-[15%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" style={{ top: '-2px' }} />
                {[...Array(15)].map((_, i) => <div key={i} className="stardust absolute rounded-full" style={{ left: `${5 + i * 6.2}%`, top: `${60 + (i % 4) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 2 === 0 ? 'rgba(16,185,129,0.6)' : 'rgba(139,92,246,0.5)', opacity: 0.6 }} />)}
                <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 200, top: mousePos.y - 200, background: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)' }} />
            </div>

            {/* ── Fixed Back to Legal header ── */}
            <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-20 z-10">
                <div className="container mx-auto px-4 text-center relative z-10">
                    <div className="absolute top-6 left-4 lg:top-8 lg:left-6">
                        <Link href="/legal" className="inline-flex items-center gap-2 text-gray-500 hover:text-emerald-400 transition-colors text-sm group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />Back to Legal
                        </Link>
                    </div>
                    <div className="relative inline-block mb-8">
                        <div className="hero-ring absolute -inset-5 rounded-full border-2 border-dashed border-emerald-500/30" />
                        <div className="hero-icon-container relative inline-flex items-center justify-center w-24 h-24 rounded-3xl border border-emerald-400/40 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(6,182,212,0.25))' }}>
                            <CreditCard className="w-12 h-12 relative z-10" style={{ color: '#6ee7b7', filter: 'drop-shadow(0 0 15px rgba(16,185,129,0.7))' }} />
                        </div>
                    </div>
                    <h1 className="hero-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Payments & Refunds</span>
                    </h1>
                    <p className="hero-subtitle text-lg text-gray-400 max-w-2xl mx-auto mb-8 font-light" style={{ opacity: 0 }}>One-time purchases. No auto-renewal. From <span className="text-emerald-400">$1/day</span> per agent — you control when you pay.</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-emerald-500/20 backdrop-blur-sm flex items-center gap-2"><Ban className="w-4 h-4 text-emerald-400" /><span className="text-sm text-gray-400 font-medium">No Auto-Renewal</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 backdrop-blur-sm flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-400" /><span className="text-sm text-gray-400 font-medium">Secure Payments</span></div>
                        <div className="hero-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-sm text-gray-400 font-medium">Refunds for Our Errors</span></div>
                    </div>
                </div>
            </section>

            <section className="relative py-8 z-10">
                <div className="container mx-auto px-4"><div className="max-w-4xl mx-auto">
                    {/* ── Agent Pricing ── */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" />Per-Agent Access (sanbayfusion.com)</h3>
                        <div className="pricing-grid grid grid-cols-2 md:grid-cols-4 gap-3 mb-0">
                            {pricingTiers.map((tier, i) => (
                                <div key={i} className={`pricing-card relative p-5 rounded-2xl bg-white/[0.02] border ${tier.border} hover:bg-white/[0.04] transition-all duration-300 text-center`}>
                                    {tier.popular && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[10px] font-bold">BEST VALUE</div>}
                                    {'discount' in tier && tier.discount && <div className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-bold animate-pulse">🎉 {tier.discount}</div>}
                                    <h3 className="text-base font-bold text-white mt-1 mb-0.5">{tier.name}</h3>
                                    <div className="flex items-baseline justify-center gap-2">
                                        {'originalPrice' in tier && tier.originalPrice && (
                                            <span className="text-lg text-gray-500 line-through">{tier.originalPrice}</span>
                                        )}
                                        <span className="text-3xl font-black text-white">{tier.price}</span>
                                    </div>
                                    <p className="text-gray-500 text-xs mb-3">{tier.perDay}</p>
                                    <div className="space-y-1.5">
                                        {['Full agent access', 'No auto-renewal', 'Instant access'].map((f, fi) => (
                                            <div key={fi} className="flex items-center gap-2 text-gray-400 text-xs"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />{f}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Platform Products ── */}
                    <div className="mb-12">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Code className="w-4 h-4 text-violet-400" />Platform Products (spaces.sanbayfusion.com)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="pricing-card p-4 rounded-2xl bg-white/[0.02] border border-violet-500/15 hover:bg-white/[0.04] transition-all duration-300 text-center">
                                <div className="w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center border border-violet-400/20" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(192,38,211,0.1))' }}>
                                    <Palette className="w-4.5 h-4.5 text-violet-300" />
                                </div>
                                <h4 className="text-sm font-bold text-white mb-0.5">Canvas App</h4>
                                <p className="text-[10px] text-gray-500 mb-1">AI web-app builder</p>
                                <div className="text-xs text-gray-400">Agent-based pricing</div>
                            </div>
                            <div className="pricing-card p-4 rounded-2xl bg-white/[0.02] border border-purple-500/15 hover:bg-white/[0.04] transition-all duration-300 text-center">
                                <div className="w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center border border-purple-400/20" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))' }}>
                                    <Code className="w-4.5 h-4.5 text-purple-300" />
                                </div>
                                <h4 className="text-sm font-bold text-white mb-0.5">Canvas Studio</h4>
                                <p className="text-[10px] text-gray-500 mb-1">AI builder + deploy</p>
                                <div className="text-xs text-emerald-400 font-semibold">$7/wk · $19/mo · $120/yr</div>
                            </div>
                            <div className="pricing-card p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/15 hover:bg-white/[0.04] transition-all duration-300 text-center">
                                <div className="w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center border border-cyan-400/20" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.1))' }}>
                                    <Cpu className="w-4.5 h-4.5 text-cyan-300" />
                                </div>
                                <h4 className="text-sm font-bold text-white mb-0.5">GenCraft Pro</h4>
                                <p className="text-[10px] text-gray-500 mb-1">Full IDE + terminal</p>
                                <div className="text-xs text-emerald-400 font-semibold">$7/wk · $19/mo · $120/yr</div>
                            </div>
                            <div className="pricing-card p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/15 hover:bg-white/[0.04] transition-all duration-300 text-center">
                                <div className="w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center border border-emerald-400/20" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.1))' }}>
                                    <PenTool className="w-4.5 h-4.5 text-emerald-300" />
                                </div>
                                <h4 className="text-sm font-bold text-white mb-0.5">Maula Editor</h4>
                                <p className="text-[10px] text-gray-500 mb-1">Professional IDE</p>
                                <div className="text-xs text-gray-400">Agent-based pricing</div>
                            </div>
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
                                                <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/[0.08]" style={{ background: `linear-gradient(135deg, ${section.glow.replace('0.4', '0.2')}, rgba(16,185,129,0.1))`, boxShadow: `0 0 16px ${section.glow.replace('0.4', '0.08')}` }}>
                                                    <Icon className="w-5 h-5" style={{ color: '#6ee7b7', filter: `drop-shadow(0 0 6px ${section.glow})` }} />
                                                </div>
                                                <h3 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors">{section.title}</h3>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`} />
                                        </div>
                                        {isExpanded && (
                                            <div className="mt-5 pt-5 border-t border-white/[0.04] space-y-5">
                                                {section.content.map((item, idx) => (
                                                    <div key={idx} className="pl-[60px]">
                                                        <h4 className="text-sm font-semibold text-emerald-400 mb-1.5">{item.subtitle}</h4>
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

                    <div className="notice-block mt-10 p-5 rounded-2xl bg-white/[0.02] border border-amber-500/15 overflow-hidden">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border border-amber-400/30" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.1))' }}><AlertTriangle className="w-5 h-5" style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.4))' }} /></div>
                            <div><h3 className="text-base font-bold text-gray-200 mb-1">Refund Policy Summary</h3><p className="text-gray-600 text-[13px] leading-relaxed">All payments are generally final. However, we <span className="text-emerald-400 font-medium">will issue refunds</span> if the issue is on our side — including system outages, critical bugs, payment processing errors, or service delivery failures that prevent you from using the service you paid for. Contact billing@sanbayfusion.com with your transaction details.</p></div>
                        </div>
                    </div>

                    <div className="contact-block mt-14 p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                        <h3 className="text-xl font-bold text-white mb-3">Contact Billing Support</h3>
                        <p className="text-gray-600 text-sm mb-2">For billing questions, payment issues, or account access inquiries.</p>
                        <p className="text-gray-600 text-xs mb-6"><strong className="text-gray-400">Response Time:</strong> We respond to all billing inquiries within 24–48 hours (Monday–Friday, excluding holidays).</p>
                        <div className="flex flex-wrap gap-3">
                            <Link href="mailto:billing@sanbayfusion.com" className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/25 text-emerald-400 font-medium text-sm hover:border-emerald-500/40 transition-all">billing@sanbayfusion.com</Link>
                            <Link href="mailto:support@sanbayfusion.com" className="px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 font-medium text-sm hover:bg-white/[0.06] hover:text-white transition-all">support@sanbayfusion.com</Link>
                        </div>
                    </div>
                </div></div>
            </section>

            <style jsx global>{`
                .section-card::before { content: ''; position: absolute; inset: 0; border-radius: 1rem; opacity: 0.015; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"); pointer-events: none; z-index: 1; }
                ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #030304; } ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 3px; } ::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.5); }
            `}</style>
        </div>
    );
}
