'use client';

/**
 * UniversalAgentChat - Bridge Component
 * 
 * This file bridges the old API (UniversalAgentChat) with the new Neural-Link App.
 * It wraps the new App component and accepts the old AgentChatConfig interface.
 */

import React from 'react';
import App from './App';

// Legacy interface for backwards compatibility
export interface AgentChatConfig {
  id?: string;
  agentId?: string;
  name?: string;
  agentName?: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  theme?: 'dark' | 'light';
  showCanvas?: boolean;
  showHistory?: boolean;
  maxHeight?: string;
  className?: string;
}

interface UniversalAgentChatProps {
  config?: AgentChatConfig;
  agent?: AgentChatConfig;
}

/**
 * UniversalAgentChat Component
 * 
 * Wrapper that accepts the old config format and renders the new Neural-Link App.
 * The new App manages its own state internally.
 */
const UniversalAgentChat: React.FC<UniversalAgentChatProps> = ({ config, agent }) => {
  // Merge config and agent props, with agent taking precedence
  const mergedConfig = { ...config, ...agent } as any;
  const agentId = mergedConfig?.id || mergedConfig?.agentId || '';
  const agentName = mergedConfig?.name || mergedConfig?.agentName || 'AI Assistant';
  const systemPrompt = mergedConfig?.systemPrompt;
  // Extract provider/model from aiProvider (registry) or direct fields
  const provider = mergedConfig?.aiProvider?.primary || mergedConfig?.provider;
  const model = mergedConfig?.aiProvider?.model || mergedConfig?.model;
  // Extract agent metadata for monitoring drawer
  const agentIcon = mergedConfig?.icon || '🤖';
  const agentSpecialty = mergedConfig?.specialty || '';
  const agentColor = mergedConfig?.color || 'from-emerald-400 to-cyan-500';
  const agentCategory = mergedConfig?.category || '';
  const agentFallbacks = mergedConfig?.aiProvider?.fallbacks || [];

  return (
    <div className={`universal-agent-chat ${mergedConfig?.className || ''}`} style={{ height: mergedConfig?.maxHeight || '100vh' }}>
      <App
        initialAgentId={agentId}
        initialAgentName={agentName}
        initialSystemPrompt={systemPrompt}
        initialProvider={provider}
        initialModel={model}
        agentIcon={agentIcon}
        agentSpecialty={agentSpecialty}
        agentColor={agentColor}
        agentCategory={agentCategory}
        agentFallbacks={agentFallbacks}
      />
    </div>
  );
};

export default UniversalAgentChat;
