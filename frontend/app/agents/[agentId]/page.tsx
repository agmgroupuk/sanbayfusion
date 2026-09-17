// Dynamic Agent Chat Route — redirects to per-agent subdomain {slug}-chat.sanbayfusion.com
// Each agent now has its own subdomain serving the universal chat SPA via nginx.

import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

const validAgentIds = [
    'julie-girlfriend',
    'emma-emotional',
    'professor-astrology',
    'comedy-king',
    'drama-queen',
    'nid-gaming',
    'ben-sega',
    'mrs-boss',
    'chess-player',
    'knight-logic',
    'lazy-pawn',
    'rook-jokey',
    'tech-wizard',
    'fitness-guru',
    'chef-biew',
    'bishop-burger',
    'travel-buddy'
];

export default async function AgentChatPage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params;

    if (!validAgentIds.includes(agentId)) {
        notFound();
    }

    redirect(`https://${encodeURIComponent(agentId)}-chat.sanbayfusion.com/`);
}

export function generateStaticParams() {
    return validAgentIds.map((agentId) => ({ agentId }));
}

export async function generateMetadata({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params;

    const agentName = agentId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return {
        title: `Chat with ${agentName} | Maula AI`,
        description: `Have a conversation with ${agentName}, your AI assistant specialized in their unique domain.`,
    };
}
