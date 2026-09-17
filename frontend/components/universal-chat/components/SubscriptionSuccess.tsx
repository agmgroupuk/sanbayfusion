import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';

export default function SubscriptionSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const agentName = searchParams.get('agent') || 'AI Agent';
    const agentSlug = searchParams.get('slug') || 'agent';
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-[#030304] text-white flex items-center justify-center">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-green-600/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10 text-center max-w-lg mx-auto px-6">
                {/* Success icon */}
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                        <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                </div>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                    <Sparkles className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300 font-medium">SUBSCRIBED</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                    Welcome to {agentName}!
                </h1>
                <p className="text-gray-400 text-lg mb-8">
                    Your subscription is active. Enjoy unlimited conversations with your AI agent.
                </p>

                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25"
                >
                    Start Chatting <ArrowRight className="w-5 h-5" />
                </button>

                <p className="text-gray-600 text-sm mt-6">
                    Redirecting in {countdown} seconds...
                </p>
            </div>
        </div>
    );
}
