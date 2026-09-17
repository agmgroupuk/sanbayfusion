'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Star, 
  Crown, 
  Mic, 
  Clock, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Pause,
  Volume2,
  Settings,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import Image from 'next/image';
import VoiceInput from './VoiceInput';

interface Agent {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  category: string;
  capabilities: string[];
  voiceEnabled: boolean;
  subscription: {
    tier: 'free' | 'premium' | 'enterprise';
    monthlyPrice: number;
    voiceQuotaMinutes: number;
    features: string[];
  };
  personality: {
    tone: string;
    expertise: string[];
    responseStyle: string;
  };
  defaultVoice: string;
}

interface VoiceAgentsProps {
  userId?: string;
  onAgentSelect?: (agent: Agent) => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent?: string;
  feedback?: 'positive' | 'negative' | null;
}

const VoiceAgents: React.FC<VoiceAgentsProps> = ({
  userId = 'anonymous',
  onAgentSelect,
  className = ''
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId,
        voiceOnly: 'true'
      });
      
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }

      const response = await fetch(`/api/agents?${params}`);
      const data = await response.json();

      if (data.success) {
        setAgents(data.agents || []);
        setUserSubscriptions(data.userSubscriptions || []);
        if (data.metadata?.categories) {
          setCategories(['all', ...data.metadata.categories]);
        }
      } else {
        setError(data.error || 'Failed to load agents');
      }
    } catch (err) {
      setError('Network error loading agents');
      console.error('Load agents error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedCategory, setLoading, setAgents, setUserSubscriptions, setCategories, setError]);

  useEffect(() => {
    loadAgents();
  }, [selectedCategory, loadAgents]);

  const handleSubscription = async (agentId: string, action: 'subscribe' | 'unsubscribe') => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, agentId, action })
      });

      const data = await response.json();
      if (data.success) {
        setUserSubscriptions(data.userSubscriptions || []);
      } else {
        setError(data.error || 'Subscription failed');
      }
    } catch (err) {
      setError('Network error during subscription');
      console.error('Subscription error:', err);
    }
  };

  const startVoiceChat = (agent: Agent) => {
    setActiveAgent(agent);
    setShowChat(true);
    
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: `welcome-${Date.now()}`,
      type: 'assistant',
      content: `Hello! I'm ${agent.name}. ${agent.description}. How can I help you today?`,
      timestamp: new Date().toISOString(),
      agent: agent.id
    };
    
    setMessages([welcomeMessage]);
    onAgentSelect?.(agent);
  };

  const handleVoiceTranscription = (text: string) => {
    if (!activeAgent) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      agent: activeAgent.id
    };
    
    setMessages(prev => [...prev, userMessage]);
  };

  const handleVoiceResponse = (text: string) => {
    if (!activeAgent) return;
    
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
      agent: activeAgent.id
    };
    
    setMessages(prev => [...prev, assistantMessage]);
  };

  const handleVoiceError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium': return <Star className="w-4 h-4 text-yellow-500" />;
      case 'enterprise': return <Crown className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'border-yellow-200 bg-yellow-50';
      case 'enterprise': return 'border-purple-200 bg-purple-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const isSubscribed = (agentId: string) => userSubscriptions.includes(agentId);

  if (loading) {
    return (
      <div className={`voice-agents-container ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading voice agents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-agents-container ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎤 Premium Voice Agents
        </h2>
        <p className="text-gray-600">
          18 specialized AI agents with voice chat capabilities. Subscribe to unlock advanced expertise.
        </p>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'All Categories' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {agents.map(agent => (
          <div
            key={agent.id}
            className={`agent-card border rounded-lg p-6 transition-all hover:shadow-lg ${getTierColor(agent.subscription.tier)}`}
          >
            {/* Agent Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Image
                  src={agent.avatarUrl}
                  alt={`${agent.name} avatar`}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <span>{agent.name}</span>
                    {getTierIcon(agent.subscription.tier)}
                  </h3>
                  <p className="text-sm text-gray-600">{agent.category}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {agent.voiceEnabled && (
                  <div title="Voice Enabled">
                    <Mic className="w-4 h-4 text-green-500" />
                  </div>
                )}
                {isSubscribed(agent.id) && (
                  <div title="Subscribed">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 mb-4">{agent.description}</p>

            {/* Capabilities */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map(capability => (
                  <span
                    key={capability}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {capability}
                  </span>
                ))}
                {agent.capabilities.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{agent.capabilities.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Subscription Info */}
            <div className="mb-4 p-3 bg-white rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">
                  ${agent.subscription.monthlyPrice}/month
                </span>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  {agent.subscription.voiceQuotaMinutes}m voice
                </div>
              </div>
              <div className="text-xs text-gray-600">
                {agent.subscription.features.slice(0, 2).join(' • ')}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {!isSubscribed(agent.id) ? (
                <button
                  onClick={() => handleSubscription(agent.id, 'subscribe')}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Subscribe
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => startVoiceChat(agent)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Voice Chat</span>
                  </button>
                  <button
                    onClick={() => handleSubscription(agent.id, 'unsubscribe')}
                    className="w-full bg-gray-200 text-gray-700 py-1 px-4 rounded-lg hover:bg-gray-300 transition-colors text-xs"
                  >
                    Unsubscribe
                  </button>
                </div>
              )}
            </div>

            {/* Expand Details */}
            <button
              onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
              className="w-full mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center space-x-1"
            >
              <span>Details</span>
              {expandedAgent === agent.id ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Expanded Details */}
            {expandedAgent === agent.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 text-sm">
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-1">Personality</h4>
                  <p className="text-gray-600">{agent.personality.tone}</p>
                  <p className="text-gray-600">{agent.personality.responseStyle}</p>
                </div>
                
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-1">Expertise</h4>
                  <div className="flex flex-wrap gap-1">
                    {agent.personality.expertise.map(skill => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">All Features</h4>
                  <ul className="text-gray-600 text-xs space-y-1">
                    {agent.subscription.features.map(feature => (
                      <li key={feature} className="flex items-center space-x-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Voice Chat Modal */}
      {showChat && activeAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl h-3/4 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <Image
                  src={activeAgent.avatarUrl}
                  alt={`${activeAgent.name} avatar`}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{activeAgent.name}</h3>
                  <p className="text-sm text-gray-600">Voice Chat Session</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Voice Input */}
            <div className="border-t p-4">
              <VoiceInput
                agent={activeAgent.id}
                voice={activeAgent.defaultVoice}
                userId={userId}
                onTranscription={handleVoiceTranscription}
                onResponse={handleVoiceResponse}
                onError={handleVoiceError}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAgents;