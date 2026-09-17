'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import AgentDetailsModal from './AgentDetailsModal';
import type { AgentConfig } from '@/types/agents';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import Image from 'next/image';

interface AgentCardProps {
  agent: AgentConfig;
  index?: number;
}

export default function AgentCard({ agent, index = 0 }: AgentCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { hasActiveSubscription, getSubscription, getDaysRemaining, loading } =
    useSubscriptions();

  const isSubscribed = hasActiveSubscription(agent.id);
  const subscription = getSubscription(agent.id);
  const daysRemaining = getDaysRemaining(agent.id);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking the details button
    if ((e.target as HTMLElement).closest('[data-details-button]')) {
      e.preventDefault();
      return;
    }
  };

  // Determine link and text based on subscription status
  const linkHref = isSubscribed
    ? `https://${agent.id}-chat.maula.ai/`
    : `https://maula.ai/subscribe?agent=${encodeURIComponent(agent.name)}&slug=${agent.id}`;

  const actionText = loading
    ? 'Checking...'
    : isSubscribed
      ? `✓ Subscribed (${daysRemaining}d left)`
      : 'Subscribe to Access';

  return (
    <>
      <Link
        href={linkHref}
        className="agent-card animate-fade-in-up relative"
        style={{ animationDelay: `${index * 100}ms` }}
        onClick={handleCardClick}
      >
        <div className={`agent-avatar bg-gradient-to-r ${agent.color} relative overflow-hidden`}>
          <Image
            src={agent.avatarUrl}
            alt={`${agent.name} avatar`}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover"
            unoptimized
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="agent-name truncate" title={agent.name}>{agent.name}</h3>

          <div className="text-sm font-medium text-brand-600 mb-3">
            {agent.specialty}
          </div>

          <p className="agent-description mb-4">{agent.description}</p>

          <div className="flex flex-wrap gap-2">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs font-medium bg-brand-50 text-brand-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-neural-100 gap-3">
          <span
            className={`text-sm font-medium flex-1 ${isSubscribed ? 'text-green-600' : 'text-brand-600'}`}
          >
            {actionText}
          </span>

          <div className="flex items-center gap-2">
            {/* Details Button */}
            {agent.details && (
              <button
                data-details-button
                onClick={(e) => {
                  e.preventDefault();
                  setShowDetails(true);
                }}
                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all duration-200 hover:scale-110"
                title="View agent details"
              >
                <InformationCircleIcon className="w-5 h-5" />
              </button>
            )}

            {/* Arrow */}
            <svg
              className="w-5 h-5 text-brand-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </Link>

      {/* Details Modal */}
      {agent.details && (
        <AgentDetailsModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          agentName={agent.name}
          agentIcon={agent.details.icon}
          sections={agent.details.sections}
        />
      )}
    </>
  );
}
