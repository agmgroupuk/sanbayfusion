import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Check, Crown, Zap, ArrowRight, Lock, CreditCard, RefreshCw, X, Clock, Shield } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { secureAuthStorage } from '../../../lib/secure-auth-storage';

interface SubscriptionPlan {
    type: string;
    description: string;
    price: string;
    originalPrice: string | null;
    discount: string | null;
    period: string;
    perDay: string;
    features: string[];
    popular: boolean;
    billingCycle: string;
    gradient: string;
    glow: string;
}

export default function SubscribePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const agentName = searchParams.get('agent') || 'AI Agent';
    const agentSlug = searchParams.get('slug') || 'agent';
    const cancelled = searchParams.get('cancelled');

    const [checking, setChecking] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeSubscription, setActiveSubscription] = useState<any>(null);
    const [cancelling, setCancelling] = useState(false);

    // Get auth state — must call verifySession() since this page is a standalone route
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Restore session from HttpOnly cookie (not populated by App.tsx on this route)
                const session = await secureAuthStorage.verifySession();
                if (session.valid && session.user) {
                    secureAuthStorage.setUser(session.user);
                    const uid = session.user.id || session.user.userId;
                    setIsLoggedIn(true);
                    setUserId(uid);
                    setUserEmail(session.user.email);

                    // Check existing subscription
                    const data = await subscriptionService.check(uid, agentSlug);

                    if ((data.hasAccess || data.hasActiveSubscription) && data.subscription) {
                        const sub = data.subscription;
                        if (!sub.daysUntilRenewal && sub.expiryDate) {
                            const expiry = new Date(sub.expiryDate);
                            sub.daysUntilRenewal = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                        }
                        setActiveSubscription(sub);
                    }
                }
            } catch (e) {
                console.error('Auth check error:', e);
            }
            setChecking(false);
        };
        checkAuth();
    }, [agentSlug]);

    const subscriptionPlans: SubscriptionPlan[] = [
        {
            type: 'Daily Access',
            description: 'Perfect for trying out agents',
            price: '$1',
            originalPrice: null,
            discount: null,
            period: 'day',
            perDay: '$1.00/day',
            features: ['Full access to ' + agentName, 'Unlimited conversations', 'Real-time responses', 'Voice interaction', 'Agent memory', 'No auto-renewal'],
            popular: false,
            billingCycle: 'daily',
            gradient: 'from-cyan-500 to-blue-500',
            glow: 'rgba(6,182,212,0.4)',
        },
        {
            type: 'Weekly Access',
            description: 'Great value for regular use',
            price: '$5',
            originalPrice: '$10',
            discount: '50% OFF',
            period: 'week',
            perDay: '$0.71/day',
            features: ['Full access to ' + agentName, 'Unlimited conversations', 'Real-time responses', 'Voice interaction', 'Agent memory', 'No auto-renewal', 'Save 29% vs daily'],
            popular: true,
            billingCycle: 'weekly',
            gradient: 'from-violet-500 to-fuchsia-500',
            glow: 'rgba(139,92,246,0.4)',
        },
        {
            type: 'Monthly Access',
            description: 'Best value for ongoing use',
            price: '$15',
            originalPrice: '$30',
            discount: '50% OFF',
            period: 'month',
            perDay: '$0.50/day',
            features: ['Full access to ' + agentName, 'Unlimited conversations', 'Real-time responses', 'Voice interaction', 'Agent memory', 'No auto-renewal', 'Save 50% vs daily'],
            popular: false,
            billingCycle: 'monthly',
            gradient: 'from-emerald-500 to-teal-500',
            glow: 'rgba(16,185,129,0.4)',
        },
        {
            type: 'Yearly Access',
            description: 'Ultimate savings — full year',
            price: '$150',
            originalPrice: '$300',
            discount: '50% OFF',
            period: 'year',
            perDay: '$0.41/day',
            features: ['Full access to ' + agentName, 'Unlimited conversations', 'Real-time responses', 'Voice interaction', 'Agent memory', 'No auto-renewal', 'Save 59% vs daily', '365 days of access'],
            popular: false,
            billingCycle: 'yearly',
            gradient: 'from-amber-500 to-orange-500',
            glow: 'rgba(245,158,11,0.4)',
        },
    ];

    const handleSubscribe = async (plan: SubscriptionPlan) => {
        setErrorMessage(null);

        if (!isLoggedIn || !userId || !userEmail) {
            window.location.href = `https://maula.ai/auth/login?redirect=${encodeURIComponent(window.location.href)}`;
            return;
        }

        if (processingPlan) return;
        setProcessingPlan(plan.billingCycle);

        try {
            const token = secureAuthStorage.getToken?.() || '';

            const data = await subscriptionService.createCheckout({
                agentId: agentSlug,
                agentName,
                plan: plan.billingCycle,
                userId,
                userEmail,
            }, token);

            if (!data.success || !data.url) {
                if (data.alreadySubscribed && data.existingSubscription) {
                    const expiryDate = new Date(data.existingSubscription.expiryDate).toLocaleDateString();
                    throw new Error(
                        `You already have an active ${data.existingSubscription.plan} subscription. It expires on ${expiryDate} (${data.existingSubscription.daysRemaining || 0} days remaining).`
                    );
                }
                throw new Error(data.error || 'Failed to start checkout');
            }

            window.location.href = data.url;
        } catch (error) {
            console.error('Checkout error:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Unable to start checkout. Please try again.');
            setProcessingPlan(null);
        }
    };

    const handleCancel = async () => {
        if (!userId || !activeSubscription) return;
        if (!confirm(`Cancel your ${activeSubscription.plan} subscription to ${agentName}? You will lose access immediately.`)) return;

        setCancelling(true);
        setErrorMessage(null);

        try {
            const token = secureAuthStorage.getToken?.() || '';

            const data = await subscriptionService.cancel(userId, agentSlug, token);
            if (!data.success) throw new Error(data.error || 'Failed to cancel');

            setActiveSubscription(null);
            const { toast } = await import('./Toast');
            toast.success('Cancelled', 'Access cancelled successfully. You can purchase again anytime.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to cancel. Try again.');
        } finally {
            setCancelling(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen bg-[#030304] flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-400 animate-spin" />
                    </div>
                    <p className="text-gray-500 text-sm tracking-wide">Checking access status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030304] text-white overflow-auto">
            {/* Background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-violet-600/[0.06] rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/[0.05] rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-fuchsia-600/[0.03] rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
                {/* Back button */}
                <button
                    onClick={() => navigate('/')}
                    className="mb-8 flex items-center gap-2 text-gray-600 hover:text-white transition-colors text-sm"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Back to Chat
                </button>

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span className="text-sm text-violet-300 font-medium tracking-wide">Premium Access</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-violet-200 to-fuchsia-300 bg-clip-text text-transparent">
                        Unlock {agentName}
                    </h1>
                    <p className="text-gray-500 text-base max-w-2xl mx-auto leading-relaxed">
                        Get unlimited conversations with your AI agent. One-time purchase — no auto-renewal, no surprises.
                    </p>
                </div>

                {/* Error message */}
                {errorMessage && (
                    <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-red-300 text-sm">{errorMessage}</p>
                    </div>
                )}

                {/* Cancelled notice */}
                {cancelled && !activeSubscription && (
                    <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                        <p className="text-amber-300 text-sm">Payment was cancelled. You can try again anytime.</p>
                    </div>
                )}

                {/* Not logged in */}
                {!isLoggedIn && (
                    <div className="max-w-md mx-auto mb-10 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center backdrop-blur-sm">
                        <Lock className="w-10 h-10 text-violet-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2 text-white">Sign In Required</h3>
                        <p className="text-gray-500 text-sm mb-4">You need to sign in to subscribe. Click below to log in.</p>
                        <a
                            href={`https://maula.ai/auth/login?redirect=${encodeURIComponent(window.location.href)}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl font-semibold hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-lg shadow-violet-600/15"
                        >
                            Sign In <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                )}

                {/* Active subscription card */}
                {activeSubscription && (
                    <div className="max-w-lg mx-auto mb-12 p-6 rounded-2xl bg-white/[0.02] border border-emerald-500/30 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.15))' }}>
                                <Check className="w-5 h-5 text-emerald-300" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Active Subscription</h3>
                                <span className="text-sm text-emerald-400 font-medium capitalize">{activeSubscription.plan} Plan</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm">
                            <div>
                                <span className="text-gray-600 text-xs uppercase tracking-wider">Expires</span>
                                <p className="text-gray-300 font-medium">{new Date(activeSubscription.expiryDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <span className="text-gray-600 text-xs uppercase tracking-wider">Days Remaining</span>
                                <p className="text-gray-300 font-medium">{activeSubscription.daysUntilRenewal || 0}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate(`/agents/${agentSlug}`)}
                                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 hover:from-violet-600 hover:to-fuchsia-600 rounded-xl font-medium transition-all text-sm shadow-lg shadow-violet-600/15"
                            >
                                Continue Chatting
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="py-2.5 px-4 bg-white/[0.04] border border-white/[0.08] hover:bg-red-500/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-xl font-medium transition-all text-sm disabled:opacity-50"
                            >
                                {cancelling ? 'Cancelling...' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Plan cards — matches brand per-agent pricing design */}
                {!activeSubscription && (
                    <>
                        <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Choose Your Billing Cycle</h2>
                        <p className="text-gray-500 text-sm text-center mb-10">Every plan includes all features — you only choose your duration</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                            {subscriptionPlans.map((plan) => (
                                <div
                                    key={plan.billingCycle}
                                    className={`group relative ${plan.popular ? 'md:scale-105 md:z-10' : ''}`}
                                >
                                    {/* Glow border on hover */}
                                    <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${plan.glow}, transparent 60%)`, filter: 'blur(1px)' }} />

                                    <div className={`relative h-full rounded-2xl bg-white/[0.02] border ${plan.popular ? 'border-violet-500/40 shadow-lg shadow-violet-600/10' : 'border-white/[0.06]'} backdrop-blur-sm overflow-hidden transition-colors duration-500 group-hover:border-white/[0.12] group-hover:bg-white/[0.04]`}>

                                        {plan.popular && (
                                            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-b-xl text-[10px] font-bold text-white uppercase tracking-wider z-20">
                                                Most Popular
                                            </div>
                                        )}

                                        {/* Gradient header */}
                                        <div className={`relative p-5 bg-gradient-to-br ${plan.gradient} overflow-hidden`}>
                                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
                                            <div className="relative z-10 flex items-center gap-3 mb-2">
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 border border-white/30">
                                                    <Clock className="w-4 h-4 text-white" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white">{plan.type}</h3>
                                            </div>
                                            <p className="text-white/80 text-xs leading-relaxed relative z-10">{plan.description}</p>
                                        </div>

                                        <div className="p-5">
                                            {/* Price */}
                                            <div className="mb-4">
                                                <p className="text-gray-600 text-xs mb-1">Starting at</p>
                                                <div className="flex items-baseline gap-2">
                                                    {plan.originalPrice && (
                                                        <span className="text-lg font-bold text-gray-600 line-through">{plan.originalPrice}</span>
                                                    )}
                                                    <span className="text-3xl font-black text-white">{plan.price}</span>
                                                    <span className="text-gray-500">/{plan.period}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-violet-400 text-xs">{plan.perDay}</p>
                                                    {plan.discount && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                                                            🎉 {plan.discount} Welcome Gift
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Pricing structure */}
                                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
                                                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Pricing Structure</p>
                                                <p className="text-sm font-semibold text-gray-300">One Agent at a Time</p>
                                            </div>

                                            {/* Features */}
                                            <ul className="space-y-2 mb-5">
                                                {plan.features.map((feature, i) => (
                                                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400">
                                                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-400/30" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.15))' }}>
                                                            <Check className="w-2.5 h-2.5 text-emerald-300" />
                                                        </div>
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>

                                            {/* CTA */}
                                            <button
                                                onClick={() => handleSubscribe(plan)}
                                                disabled={!!processingPlan || !isLoggedIn}
                                                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${plan.popular
                                                    ? 'bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30'
                                                    : 'bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15]'
                                                    }`}
                                            >
                                                {processingPlan === plan.billingCycle ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    'Get Started'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Trust badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-emerald-400/20" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.1))' }}>
                            <Shield className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h4 className="font-semibold mb-1 text-white">Secure Payments</h4>
                        <p className="text-gray-600 text-sm">Processed by Stripe. We never see your card details.</p>
                    </div>
                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-violet-400/20" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(192,38,211,0.1))' }}>
                            <RefreshCw className="w-5 h-5 text-violet-400" />
                        </div>
                        <h4 className="font-semibold mb-1 text-white">No Auto-Renewal</h4>
                        <p className="text-gray-600 text-sm">One-time purchase. Access expires naturally — no surprise charges.</p>
                    </div>
                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-cyan-400/20" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.1))' }}>
                            <Zap className="w-5 h-5 text-cyan-400" />
                        </div>
                        <h4 className="font-semibold mb-1 text-white">Instant Access</h4>
                        <p className="text-gray-600 text-sm">Start chatting immediately after payment. No waiting.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-12 text-gray-700 text-xs">
                    <p>By subscribing, you agree to our <a href="https://maula.ai/legal/terms" className="text-violet-400 hover:text-violet-300 hover:underline transition-colors">Terms of Service</a> and <a href="https://maula.ai/legal/payments-refunds" className="text-violet-400 hover:text-violet-300 hover:underline transition-colors">Payments & Refunds Policy</a></p>
                </div>
            </div>
        </div>
    );
}
