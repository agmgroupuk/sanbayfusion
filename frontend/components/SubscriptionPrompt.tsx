'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SubscriptionPromptProps {
  agentName: string;
  agentSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscriptionPrompt({
  agentName,
  agentSlug,
  isOpen,
  onClose,
}: SubscriptionPromptProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-dark max-w-lg w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-3">
            Subscribe to Access {agentName}
          </h2>
          <p className="text-neutral-300">
            To chat with {agentName}, you need an active subscription. Choose
            from our simple pricing options.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-neutral-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-lg">$1</span>
                <span className="text-neutral-400 ml-2">per day</span>
              </div>
              <span className="text-sm text-neutral-400">Daily</span>
            </div>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4 ring-2 ring-brand-500">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-sm text-neutral-500 line-through mr-1">$10</span>
                <span className="font-bold text-lg text-brand-400">$5</span>
                <span className="text-neutral-400 ml-2">per week</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">50% OFF</span>
                <span className="text-sm bg-brand-500 text-white px-2 py-1 rounded">
                  Popular
                </span>
              </div>
            </div>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-sm text-neutral-500 line-through mr-1">$30</span>
                <span className="font-bold text-lg">$15</span>
                <span className="text-neutral-400 ml-2">per month</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">50% OFF</span>
                <span className="text-sm text-neutral-400">Best Value</span>
              </div>
            </div>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-sm text-neutral-500 line-through mr-1">$300</span>
                <span className="font-bold text-lg">$150</span>
                <span className="text-neutral-400 ml-2">per year</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">50% OFF</span>
                <span className="text-sm text-neutral-400">Save 59%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-6">
          <p className="text-emerald-200 text-sm">
            🎉 50% OFF Welcome Gift on all plans! Each agent is a separate one-time purchase. No auto-renewal.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <Link
            href={`https://sanbayfusion.com/subscribe?agent=${encodeURIComponent(
              agentName
            )}&slug=${agentSlug}`}
            className="flex-1 py-3 px-6 bg-brand-500 hover:bg-brand-600 text-center rounded-lg font-semibold transition-colors"
          >
            Choose Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
