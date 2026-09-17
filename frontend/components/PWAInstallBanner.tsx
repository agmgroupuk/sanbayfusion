'use client';

import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWA';

export default function PWAInstallBanner() {
    const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
    const [dismissed, setDismissed] = useState(true); // Start hidden
    const [showIOSModal, setShowIOSModal] = useState(false);

    useEffect(() => {
        // Don't show if already installed or dismissed this session
        if (isInstalled) return;
        const wasDismissed = sessionStorage.getItem('pwa-banner-dismissed');
        if (wasDismissed) return;

        // Show banner after 5 seconds for eligible users
        const timer = setTimeout(() => {
            if (canInstall || isIOS) {
                setDismissed(false);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [canInstall, isIOS, isInstalled]);

    const handleInstall = async () => {
        if (isIOS) {
            setShowIOSModal(true);
            return;
        }
        const accepted = await install();
        if (accepted) {
            setDismissed(true);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('pwa-banner-dismissed', 'true');
    };

    if (dismissed || isInstalled) return null;

    return (
        <>
            {/* Install Banner */}
            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl animate-slide-up">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">Install Maula AI</p>
                            <p className="text-xs text-white/80 truncate">
                                {isIOS ? 'Add to Home Screen for the best experience' : 'Get the app for faster access & offline support'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={handleInstall}
                            className="px-4 py-2 bg-white text-indigo-600 font-semibold rounded-lg text-sm hover:bg-white/90 transition-colors"
                        >
                            Install
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            aria-label="Dismiss"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* iOS Instructions Modal */}
            {showIOSModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4">Install Maula AI</h3>
                        <div className="space-y-4 text-sm text-slate-300">
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                                <p>
                                    Tap the <strong className="text-white">Share</strong> button
                                    <span className="inline-block ml-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                    </span>{' '}
                                    in Safari&apos;s toolbar
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                                <p>Scroll down and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong></p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                                <p>Tap <strong className="text-white">&quot;Add&quot;</strong> to install</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
        </>
    );
}
