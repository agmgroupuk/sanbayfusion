'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Agent {
  name: string;
  slug: string;
  specialty: string;
  emoji: string;
}

interface AgentSidebarProps {
  currentAgentSlug: string;
}

export default function AgentSidebar({ currentAgentSlug }: AgentSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // All available agents
  const allAgents: Agent[] = [
    {
      name: 'Ben Sega',
      slug: 'ben-sega',
      specialty: 'Gaming & Entertainment',
      emoji: '🎮',
    },
    {
      name: 'Einstein',
      slug: 'einstein',
      specialty: 'Scientific Research',
      emoji: '🧠',
    },
    {
      name: 'Chef Biew',
      slug: 'chef-biew',
      specialty: 'Culinary Arts',
      emoji: '👨‍🍳',
    },
    {
      name: 'Tech Wizard',
      slug: 'tech-wizard',
      specialty: 'Technology Support',
      emoji: '🧙‍♂️',
    },
    {
      name: 'Travel Buddy',
      slug: 'travel-buddy',
      specialty: 'Travel Planning',
      emoji: '✈️',
    },
    {
      name: 'Fitness Guru',
      slug: 'fitness-guru',
      specialty: 'Health & Fitness',
      emoji: '💪',
    },
    {
      name: 'Comedy King',
      slug: 'comedy-king',
      specialty: 'Entertainment & Humor',
      emoji: '😂',
    },
    {
      name: 'Drama Queen',
      slug: 'drama-queen',
      specialty: 'Creative Writing',
      emoji: '🎭',
    },
    {
      name: 'Chess Player',
      slug: 'chess-player',
      specialty: 'Strategy & Games',
      emoji: '♟️',
    },
    {
      name: 'Emma Emotional',
      slug: 'emma-emotional',
      specialty: 'Emotional Support',
      emoji: '💝',
    },
    {
      name: 'Julie Girlfriend',
      slug: 'julie-girlfriend',
      specialty: 'Relationship Advice',
      emoji: '💕',
    },
    {
      name: 'Mrs Boss',
      slug: 'mrs-boss',
      specialty: 'Business & Leadership',
      emoji: '👩‍💼',
    },
    {
      name: 'Knight Logic',
      slug: 'knight-logic',
      specialty: 'Logic & Reasoning',
      emoji: '⚔️',
    },
    {
      name: 'Lazy Pawn',
      slug: 'lazy-pawn',
      specialty: 'Casual Conversation',
      emoji: '😴',
    },
    {
      name: 'Nid Gaming',
      slug: 'nid-gaming',
      specialty: 'Gaming Strategy',
      emoji: '🎯',
    },
    {
      name: 'Professor Astrology',
      slug: 'professor-astrology',
      specialty: 'Astrology & Mysticism',
      emoji: '🔮',
    },
    {
      name: 'Rook Jokey',
      slug: 'rook-jokey',
      specialty: 'Jokes & Entertainment',
      emoji: '🃏',
    },
    {
      name: 'Bishop Burger',
      slug: 'bishop-burger',
      specialty: 'Food & Restaurants',
      emoji: '🍔',
    },
  ];

  // Filter out the current agent to show only unsubscribed ones
  const otherAgents = allAgents.filter(
    (agent) => agent.slug !== currentAgentSlug
  );

  // Filter agents based on search query
  const filteredAgents = otherAgents.filter(
    (agent) =>
      searchQuery === '' ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 bg-brand-500 hover:bg-brand-600 text-white p-3 rounded-l-lg shadow-lg transition-all duration-300"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium">Other</span>
          <span className="text-xs font-medium">Agents</span>
          <span className="text-lg">{isOpen ? '→' : '←'}</span>
          <span className="text-xs bg-white/20 rounded px-1">
            {filteredAgents.length}
          </span>
        </div>
      </button>

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-neutral-900/95 backdrop-blur-sm shadow-2xl transform transition-transform duration-300 z-30 ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Available Agents</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full px-3 py-2 pl-10 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results Count */}
          {searchQuery && (
            <div className="mb-4 text-sm text-neutral-400">
              Found {filteredAgents.length} agent
              {filteredAgents.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          )}

          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-emerald-200 text-sm">
              🎉 50% OFF Welcome Gift! Click "Unlock" to purchase access to any agent.
              Each agent is a separate one-time purchase ($1/day, <span className="line-through text-neutral-400">$10</span> $5/week, <span className="line-through text-neutral-400">$30</span> $15/month, <span className="line-through text-neutral-400">$300</span> $150/year).
            </p>
          </div>

          <div className="space-y-3">
            {filteredAgents.length === 0 && searchQuery ? (
              <div className="text-center py-8">
                <div className="text-neutral-400 mb-2">No agents found</div>
                <div className="text-sm text-neutral-500">
                  Try adjusting your search terms
                </div>
              </div>
            ) : (
              filteredAgents.map((agent) => (
                <div
                  key={agent.slug}
                  className="card-dark p-4 hover:card-dark-hover transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{agent.emoji}</span>
                      <div>
                        <h4 className="font-bold text-white">{agent.name}</h4>
                        <p className="text-xs text-neutral-400">
                          {agent.specialty}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-neutral-700 px-2 py-1 rounded">
                      🔒
                    </span>
                  </div>

                  <Link
                    href={`https://maula.ai/subscribe?agent=${encodeURIComponent(
                      agent.name
                    )}&slug=${agent.slug}`}
                    className="block w-full py-2 px-4 bg-brand-500 hover:bg-brand-600 text-center text-sm font-semibold rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Unlock Agent
                  </Link>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-700">
            <Link
              href="https://maula.ai/agents"
              className="block w-full py-3 px-4 bg-neutral-700 hover:bg-neutral-600 text-center font-semibold rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              View All Agents
            </Link>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
