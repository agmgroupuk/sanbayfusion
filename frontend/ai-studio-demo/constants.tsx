
import { SettingsState, NavItem } from './types';

/**
 * PROVIDER_CONFIG - Simplified: Anthropic primary, all others are backend fallbacks
 * 
 * No API keys needed here - all calls go through secure backend
 * Backend handles: Anthropic → OpenAI → xAI → Groq → Gemini → Mistral → Cerebras
 * Image generation auto-routes to OpenAI (DALL-E)
 * Voice auto-routes to OpenAI (TTS/Whisper)
 */
export const PROVIDER_CONFIG = [
  {
    id: 'anthropic',
    name: 'Maula AI',
    icon: '🧠',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude' }
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    description: 'Powered by Claude with auto-fallback',
    status: 'active'
  }
];

// Agent Voice Mapping - ElevenLabs voice IDs for each agent
// Female agents use female voices, Male agents use male voices
export const AGENT_VOICE_MAP: Record<string, { voiceId: string; name: string; gender: 'female' | 'male' }> = {
  // Female Agents (6)
  'mrs-boss': { voiceId: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female' },           // Professional, authoritative
  'julie-girlfriend': { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female' }, // Warm, romantic
  'emma-emotional': { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female' },  // Empathetic, caring
  'drama-queen': { voiceId: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female' },       // Dramatic, theatrical
  'chef-biew': { voiceId: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', gender: 'female' },      // Warm, culinary
  'nid-gaming': { voiceId: 'jsCqWAovK2LkecY7zXl4', name: 'Freya', gender: 'female' },       // Energetic, gamer

  // Male Agents (12)
  'einstein': { voiceId: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'male' },            // Wise, educational
  'tech-wizard': { voiceId: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male' },       // Tech-savvy
  'travel-buddy': { voiceId: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male' },        // Adventurous
  'fitness-guru': { voiceId: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male' },      // Energetic, motivational
  'comedy-king': { voiceId: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male' },          // Funny, witty
  'chess-player': { voiceId: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male' },        // Strategic, calm
  'professor-astrology': { voiceId: 'ODq5zmih8GrVes37Dizd', name: 'Patrick', gender: 'male' }, // Mystical, wise
  'ben-sega': { voiceId: 'g5CIjZEefAph4nQFvHAz', name: 'Ethan', gender: 'male' },           // Retro, nostalgic
  'bishop-burger': { voiceId: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry', gender: 'male' },      // Fun, hungry
  'knight-logic': { voiceId: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'male' },      // Strategic
  'lazy-pawn': { voiceId: 'ZQe5CZNOzWyzPSCn5a3c', name: 'James', gender: 'male' },          // Relaxed, chill
  'rook-jokey': { voiceId: 'bVMeCyTHy58xNoL34h3p', name: 'Jeremy', gender: 'male' },        // Playful, humorous

  // Default fallback
  'default': { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female' },
};

export const DEFAULT_SETTINGS: SettingsState = {
  customPrompt: "You are a helpful assistant.",
  agentName: "AI Assistant",
  agentId: "default",
  temperature: 0.7,
  maxTokens: 8192,
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  activeTool: 'none',
  portalUrl: 'https://www.google.com/search?igu=1'
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Create Image', icon: '🎨', tool: 'image_gen', description: 'Generate images with AI' },
  { label: 'Thinking', icon: '💡', tool: 'thinking', description: 'Step-by-step reasoning' },
  { label: 'Deep Research', icon: '🔭', tool: 'deep_research', description: 'In-depth analysis' },
  { label: 'Web Portal', icon: '🌐', tool: 'browser', description: 'Browse the web' },
  { label: 'Study and Learn', icon: '📚', tool: 'study', description: 'Educational assistance' },
  { label: 'Web Search', icon: '🔍', tool: 'web_search', description: 'Search the internet' },
  { label: 'Quizzes', icon: '📝', tool: 'quizzes', description: 'Test your knowledge' }
];

export const NEURAL_PRESETS: Record<string, { prompt: string; temp: number }> = {
  educational: { prompt: "You are an educational mentor. Use clear logic and analogies.", temp: 0.5 },
  professional: { prompt: "You are a professional business advisor. Use formal language and precise data.", temp: 0.3 },
  creative: { prompt: "You are a creative visionary. Generate imaginative and novel thoughts.", temp: 1.5 },
  coding: { prompt: "You are a senior software engineer. Provide clean, documented code.", temp: 0.4 }
};
