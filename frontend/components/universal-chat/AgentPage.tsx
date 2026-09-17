/**
 * AgentPage — Route wrapper for /agents/:agentId
 *
 * Extracts the agent ID from the URL and renders <App> with the correct props.
 * Agent metadata is kept inline to avoid cross-directory imports from Next.js app/.
 */

import React, { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import App from './App';
import { AGENTS, agentIds } from './agentRegistry';

const AgentPage: React.FC = () => {
    const { agentId } = useParams<{ agentId: string }>();

    // Handle /agents/random — pick a random agent
    const resolvedId = useMemo(() => {
        if (!agentId) return null;
        if (agentId === 'random') return agentIds[Math.floor(Math.random() * agentIds.length)];
        return AGENTS[agentId] ? agentId : null;
    }, [agentId]);

    const agent = resolvedId ? AGENTS[resolvedId] : null;

    if (!resolvedId || !agent) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="universal-agent-chat" style={{ height: '100vh' }}>
            <App
                initialAgentId={resolvedId}
                initialAgentName={agent.name}
                agentIcon={agent.icon}
                agentSpecialty={agent.specialty}
                agentColor={agent.color}
                agentCategory={agent.category}
            />
        </div>
    );
};

export default AgentPage;
