'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Observer, CustomWiggle, CustomEase } from '@/lib/gsap';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle, MessageCircle, AlertTriangle, Sparkles, ShieldQuestion, CreditCard } from 'lucide-react';

export default function PaymentCancelPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      CustomWiggle.create('cancelWiggle', { wiggles: 4, type: 'uniform' });

      // Initial states
      gsap.set('.cancel-icon', { scale: 0, rotate: 180 });
      gsap.set('.cancel-ring', { scale: 0, opacity: 0 });
      gsap.set('.cancel-title', { y: 50, opacity: 0 });
      gsap.set('.cancel-subtitle', { y: 30, opacity: 0 });
      gsap.set('.cancel-card', { y: 40, opacity: 0, scale: 0.95 });
      gsap.set('.cancel-action', { y: 30, opacity: 0 });
      gsap.set('.help-item', { x: -30, opacity: 0 });
      gsap.set('.warning-particle', { opacity: 0, scale: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.to('.cancel-ring', {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        ease: 'back.out(1.5)'
      })
      .to('.cancel-icon', {
        scale: 1,
        rotate: 0,
        duration: 1,
        ease: 'elastic.out(1, 0.5)'
      }, '-=0.5')
      .to('.warning-particle', {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        stagger: 0.05,
        ease: 'back.out(2)'
      }, '-=0.6')
      .to('.cancel-title', {
        y: 0,
        opacity: 1,
        duration: 0.6
      }, '-=0.4')
      .to('.cancel-subtitle', {
        y: 0,
        opacity: 1,
        duration: 0.5
      }, '-=0.3')
      .to('.cancel-card', {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'back.out(1.5)'
      }, '-=0.3')
      .to('.cancel-action', {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.1
      }, '-=0.3')
      .to('.help-item', {
        x: 0,
        opacity: 1,
        duration: 0.4,
        stagger: 0.08
      }, '-=0.3');

      // Shake animation on icon
      gsap.to('.cancel-icon', {
        x: 3,
        duration: 0.1,
        repeat: 5,
        yoyo: true,
        ease: 'power2.inOut',
        delay: 1.2
      });

      // Floating warning particles
      document.querySelectorAll('.warning-particle').forEach((particle, i) => {
        gsap.to(particle, {
          y: `random(-30, 30)`,
          x: `random(-20, 20)`,
          rotation: `random(-20, 20)`,
          duration: `random(3, 5)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.1
        });
      });

      // Gradient orbs
      gsap.to('.gradient-orb-1', {
        x: 60,
        y: -40,
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to('.gradient-orb-2', {
        x: -50,
        y: 50,
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // Button hover animations
      const buttons = document.querySelectorAll('.hover-btn');
      buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, duration: 0.3, ease: 'back.out(2)' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3, ease: 'power2.out' });
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="gradient-orb-1 absolute top-20 left-1/3 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="gradient-orb-2 absolute bottom-20 right-1/3 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      {/* Warning Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="warning-particle absolute"
            style={{
              left: `${10 + i * 7}%`,
              top: `${20 + (i % 4) * 15}%`,
            }}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500/30" />
          </div>
        ))}
      </div>

      <div className="relative min-h-screen flex items-center justify-center py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Cancel Icon */}
          <div className="relative mb-8 inline-block">
            <div className="cancel-ring absolute inset-0 w-32 h-32 rounded-full bg-amber-500/20 blur-xl" />
            <div className="cancel-icon relative w-28 h-28 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
              <XCircle className="w-14 h-14 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="cancel-title text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Payment Cancelled</span>
          </h1>
          
          <p className="cancel-subtitle text-xl text-gray-400 mb-8">
            No worries! Your payment was not processed.
          </p>

          {/* Info Card */}
          <div className="cancel-card p-8 rounded-2xl bg-gradient-to-br from-gray-900/90 to-gray-950 border border-gray-800 mb-8">
            <div className="flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldQuestion className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">What happened?</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  The checkout process was cancelled or interrupted. Don't worry - no charges 
                  were made to your account. You can try again whenever you're ready.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="https://maula.ai/agents"
              className="cancel-action hover-btn inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg hover:shadow-2xl hover:shadow-amber-500/25 transition-shadow"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </Link>
            <Link
              href="https://maula.ai/agents"
              className="cancel-action hover-btn inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gray-800 border border-gray-700 text-white font-medium hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Browse Agents
            </Link>
          </div>

          {/* Help Section */}
          <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 text-left">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              Need Help?
            </h3>
            <ul className="space-y-3">
              <li className="help-item flex items-center gap-3 text-gray-300 text-sm">
                <CreditCard className="w-4 h-4 text-amber-400 flex-shrink-0" />
                Check your card details and try again
              </li>
              <li className="help-item flex items-center gap-3 text-gray-300 text-sm">
                <RefreshCw className="w-4 h-4 text-amber-400 flex-shrink-0" />
                Try a different payment method
              </li>
              <li className="help-item flex items-center gap-3 text-gray-300 text-sm">
                <MessageCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                Contact our support team for assistance
              </li>
              <li className="help-item flex items-center gap-3 text-gray-300 text-sm">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                Explore our free features while you decide
              </li>
            </ul>
            
            <div className="mt-6 pt-4 border-t border-gray-800">
              <Link 
                href="/support"
                className="inline-flex items-center text-cyan-400 hover:text-cyan-300 font-medium text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
