/**
 * agentRegistry.ts — Single source of truth for agent UI metadata
 *
 * Used by:
 *   - AgentPage.tsx  (URL-based routing: sanbayfusion.com/agents/:agentId)
 *   - index.tsx      (subdomain-based routing: ben-sega-chat.sanbayfusion.com → Ben Sega)
 *
 * AI config (provider, model, fallbacks, prompts) lives in:
 *   backend/universal-chat-backend/lib/agent-strict-prompts.js
 */

export interface AgentMeta {
  name: string;
  icon: string;
  specialty: string;
  color: string;
  category: string;
}

export const AGENTS: Record<string, AgentMeta> = {
  'julie-girlfriend':    { name: 'Julie Girlfriend',    icon: '💕', specialty: 'Companionship & Conversation',  color: 'from-pink-400 to-rose-500',     category: 'Companion'         },
  'ben-sega':            { name: 'Ben Sega',            icon: '🎮', specialty: 'Retro Gaming & Nostalgia',       color: 'from-blue-400 to-indigo-500',   category: 'Entertainment'     },
  'bishop-burger':       { name: 'Bishop Burger',       icon: '🍔', specialty: 'Food & Cooking',                 color: 'from-amber-400 to-orange-500',  category: 'Home & Lifestyle'  },
  'chef-biew':           { name: 'Chef Biew',           icon: '👨‍🍳', specialty: 'Thai & Asian Cuisine',           color: 'from-orange-400 to-red-500',    category: 'Home & Lifestyle'  },
  'chess-player':        { name: 'Chess Player',        icon: '♟️', specialty: 'Chess Strategy & Analysis',      color: 'from-emerald-400 to-teal-500',  category: 'Entertainment'     },
  'comedy-king':         { name: 'Comedy King',         icon: '😂', specialty: 'Comedy & Entertainment',         color: 'from-yellow-400 to-amber-500',  category: 'Entertainment'     },
  'drama-queen':         { name: 'Drama Queen',         icon: '👑', specialty: 'Drama & Storytelling',           color: 'from-fuchsia-400 to-pink-500',  category: 'Entertainment'     },
  'einstein':            { name: 'Einstein',            icon: '🧠', specialty: 'Science & Physics',               color: 'from-violet-400 to-purple-500', category: 'Education'         },
  'emma-emotional':      { name: 'Emma Emotional',      icon: '🌸', specialty: 'Emotional Support & Wellness',   color: 'from-rose-400 to-pink-500',     category: 'Health & Wellness' },
  'fitness-guru':        { name: 'Fitness Guru',        icon: '💪', specialty: 'Fitness & Health',               color: 'from-green-400 to-emerald-500', category: 'Health & Wellness' },
  'knight-logic':        { name: 'Knight Logic',        icon: '🛡️', specialty: 'Logic & Problem Solving',        color: 'from-cyan-400 to-blue-500',     category: 'Education'         },
  'lazy-pawn':           { name: 'Lazy Pawn',           icon: '🦥', specialty: 'Casual Chat & Relaxation',       color: 'from-teal-400 to-cyan-500',     category: 'Companion'         },
  'mrs-boss':            { name: 'Mrs Boss',            icon: '👩‍💼', specialty: 'Business & Leadership',          color: 'from-indigo-400 to-violet-500', category: 'Business'          },
  'nid-gaming':          { name: 'Nid Gaming',          icon: '🎮', specialty: 'Gaming & Esports',               color: 'from-purple-400 to-indigo-500', category: 'Entertainment'     },
  'professor-astrology': { name: 'Professor Astrology', icon: '🔮', specialty: 'Astrology & Horoscopes',         color: 'from-violet-400 to-fuchsia-500',category: 'Entertainment'     },
  'rook-jokey':          { name: 'Rook Jokey',          icon: '🃏', specialty: 'Jokes & Humor',                  color: 'from-sky-400 to-blue-500',      category: 'Entertainment'     },
  'tech-wizard':         { name: 'Tech Wizard',         icon: '🧙‍♂️', specialty: 'Technology & Programming',      color: 'from-blue-400 to-cyan-500',     category: 'Technology'        },
  'travel-buddy':        { name: 'Travel Buddy',        icon: '✈️', specialty: 'Travel & Adventure',             color: 'from-lime-400 to-green-500',    category: 'Home & Lifestyle'  },
};

export const agentIds = Object.keys(AGENTS);

/**
 * Given a hostname, returns the agent slug if this is a standalone agent
 * subdomain (e.g. "ben-sega-chat.sanbayfusion.com" → "ben-sega").
 * Returns null for main chat host, localhost, or unknown slugs.
 */
export function getAgentFromHostname(hostname: string): string | null {
  // Match: {slug}-chat.sanbayfusion.com
  const match = hostname.match(/^(.+)-chat\.sanbayfusion\.com$/);
  if (!match) return null;
  const slug = match[1];
  return AGENTS[slug] ? slug : null;
}
