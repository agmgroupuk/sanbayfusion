import type { AIProvider } from '../types/agents';

export interface ProviderModelOption {
  provider: AIProvider;
  label: string;
  models: {
    value: string;
    label: string;
  }[];
}

// ============================================================================
// AGENT-SPECIFIC AI PROVIDER OPTIONS (USER-FACING)
// ============================================================================
// Users see SIMPLE options - backend handles model fallback automatically:
// 1. [Agent Name] - Anthropic Claude (Character/Personality AI)
// 2. Sanbay Fusion - Mistral (Platform Branding)
// 3. Image Generator - OpenAI (Best for image generation/vision)
// 4. Code Builder - Cerebras (Fastest for code)
// 5. Fast Response - Groq (Ultra-fast inference)
// 6. Planner - xAI Grok (Strategic planning)
// 7. Research Helper - xAI Grok (Deep analysis & search)
//
// FALLBACK LOGIC (handled in backend):
// - When a model fails (rate limit, overloaded, etc.), system tries next model
// - Failed models are cached for 5 minutes to avoid repeated failures
// - Each provider cycles through all available models until one succeeds
// - 32K max tokens maintained across all providers
// ============================================================================

// Helper to create standard agent options with agent-specific name
// Users only see ONE default model per provider - backend handles fallbacks
function createAgentOptions(agentName: string): ProviderModelOption[] {
  return [
    // 1. Sanbay Fusion - Anthropic Claude (Main platform AI)
    {
      provider: 'anthropic',
      label: 'Sanbay Fusion',
      models: [
        { value: 'claude-opus-4-20250514', label: 'Nova Pro' },
      ],
    },
    // 2. One Last AI - Mistral (Platform Branding)
    {
      provider: 'mistral',
      label: 'One Last AI',
      models: [
        { value: 'mistral-large-2501', label: 'Maula Large' },
      ],
    },
    // 3. Planner - xAI Grok (Strategic planning)
    {
      provider: 'xai',
      label: 'Planner',
      models: [
        { value: 'grok-3-beta', label: 'Architect' },
      ],
    },
    // 4. Code Expert - Cerebras (Fastest for code)
    {
      provider: 'cerebras',
      label: 'Code Expert',
      models: [
        { value: 'llama-4-scout-17b-16e-instruct', label: 'Fast Code' },
      ],
    },
    // 5. Designer - OpenAI (Best for visuals)
    {
      provider: 'openai',
      label: 'Designer',
      models: [
        { value: 'gpt-4.5-preview', label: 'Vision Pro' },
      ],
    },
    // 6. Speed AI - Groq (Ultra-fast inference)
    {
      provider: 'groq',
      label: 'Speed AI',
      models: [
        { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Turbo' },
      ],
    },
    // 7. Research - xAI Grok (Deep analysis)
    {
      provider: 'xai',
      label: 'Research',
      models: [
        { value: 'grok-3', label: 'Deep Thinker' },
      ],
    },
  ];
}

// ============================================================================
// 1. EINSTEIN - Theoretical Physicist (Education)
// ============================================================================
const EINSTEIN_OPTIONS = createAgentOptions('Albert Einstein');

// ============================================================================
// 2. CHESS PLAYER - Strategic Thinker (Business)
// ============================================================================
const CHESS_PLAYER_OPTIONS = createAgentOptions('Chess Player');

// ============================================================================
// 3. COMEDY KING - Humor & Entertainment
// ============================================================================
const COMEDY_KING_OPTIONS = createAgentOptions('Comedy King');

// ============================================================================
// 4. DRAMA QUEEN - Emotional Expression (Entertainment)
// ============================================================================
const DRAMA_QUEEN_OPTIONS = createAgentOptions('Drama Queen');

// ============================================================================
// 5. LAZY PAWN - Casual & Relaxed (Entertainment)
// ============================================================================
const LAZY_PAWN_OPTIONS = createAgentOptions('Lazy Pawn');

// ============================================================================
// 6. KNIGHT LOGIC - Problem Solver (Business)
// ============================================================================
const KNIGHT_LOGIC_OPTIONS = createAgentOptions('Knight Logic');

// ============================================================================
// 7. ROOK JOKEY - Direct Communication (Companion)
// ============================================================================
const ROOK_JOKEY_OPTIONS = createAgentOptions('Rook Jokey');

// ============================================================================
// 8. BISHOP BURGER - Culinary Arts (Home & Lifestyle)
// ============================================================================
const BISHOP_BURGER_OPTIONS = createAgentOptions('Bishop Burger');

// ============================================================================
// 9. EMMA EMOTIONAL - Emotional Intelligence (Health & Wellness)
// ============================================================================
const EMMA_EMOTIONAL_OPTIONS = createAgentOptions('Emma Emotional');

// ============================================================================
// 10. JULIE GIRLFRIEND - Companion & Chat
// ============================================================================
const JULIE_GIRLFRIEND_OPTIONS = createAgentOptions('Julie Girlfriend');

// ============================================================================
// 11. MRS BOSS - Leadership & Management (Business)
// ============================================================================
const MRS_BOSS_OPTIONS = createAgentOptions('Mrs Boss');

// ============================================================================
// 12. PROFESSOR ASTROLOGY - Mysticism (Entertainment)
// ============================================================================
const PROFESSOR_ASTROLOGY_OPTIONS = createAgentOptions('Professor Astrology');

// ============================================================================
// 13. NID GAMING - Gaming Expert (Entertainment)
// ============================================================================
const NID_GAMING_OPTIONS = createAgentOptions('Nid Gaming');

// ============================================================================
// 14. CHEF BIEW - Cooking Expert (Home & Lifestyle)
// ============================================================================
const CHEF_BIEW_OPTIONS = createAgentOptions('Chef Biew');

// ============================================================================
// 15. BEN SEGA - Retro Gaming (Entertainment)
// ============================================================================
const BEN_SEGA_OPTIONS = createAgentOptions('Ben Sega');

// ============================================================================
// 16. TECH WIZARD - Technology Expert (Technology)
// ============================================================================
const TECH_WIZARD_OPTIONS = createAgentOptions('Tech Wizard');

// ============================================================================
// 17. FITNESS GURU - Health & Fitness (Health & Wellness)
// ============================================================================
const FITNESS_GURU_OPTIONS = createAgentOptions('Fitness Guru');

// ============================================================================
// 18. TRAVEL BUDDY - Travel Expert (Home & Lifestyle)
// ============================================================================
const TRAVEL_BUDDY_OPTIONS = createAgentOptions('Travel Buddy');

// ============================================================================
// GET AGENT-SPECIFIC PROVIDER OPTIONS
// ============================================================================
export function getAgentProviderOptions(agentId: string): ProviderModelOption[] {
  switch (agentId) {
    // Education & Science
    case 'einstein':
      return EINSTEIN_OPTIONS;

    // Business & Strategy
    case 'chess-player':
      return CHESS_PLAYER_OPTIONS;
    case 'knight-logic':
      return KNIGHT_LOGIC_OPTIONS;
    case 'mrs-boss':
      return MRS_BOSS_OPTIONS;

    // Entertainment & Humor
    case 'comedy-king':
      return COMEDY_KING_OPTIONS;
    case 'drama-queen':
      return DRAMA_QUEEN_OPTIONS;
    case 'lazy-pawn':
      return LAZY_PAWN_OPTIONS;
    case 'rook-jokey':
      return ROOK_JOKEY_OPTIONS;
    case 'professor-astrology':
      return PROFESSOR_ASTROLOGY_OPTIONS;

    // Gaming
    case 'nid-gaming':
      return NID_GAMING_OPTIONS;
    case 'ben-sega':
      return BEN_SEGA_OPTIONS;

    // Companions
    case 'emma-emotional':
      return EMMA_EMOTIONAL_OPTIONS;
    case 'julie-girlfriend':
      return JULIE_GIRLFRIEND_OPTIONS;

    // Home & Lifestyle
    case 'bishop-burger':
      return BISHOP_BURGER_OPTIONS;
    case 'chef-biew':
      return CHEF_BIEW_OPTIONS;
    case 'travel-buddy':
      return TRAVEL_BUDDY_OPTIONS;

    // Technology
    case 'tech-wizard':
      return TECH_WIZARD_OPTIONS;

    // Health & Wellness
    case 'fitness-guru':
      return FITNESS_GURU_OPTIONS;

    // Default fallback
    default:
      return PROVIDER_MODEL_OPTIONS;
  }
}

// ============================================================================
// GET AGENT-SPECIFIC CANVAS PROVIDER OPTIONS
// ============================================================================
// For Canvas app - CODE-FOCUSED providers only for building UI/apps
// Order: Cerebras (fast code) → Grok (planning) → Gemini → Anthropic (fallback)
// User-friendly names - no technical AI brand names exposed
// ============================================================================
export function getAgentCanvasProviders(agentId: string, agentName?: string): Record<string, { name: string; models: { id: string; name: string }[] }> {
  return {
    // 1. Code Expert - Cerebras (fastest for code generation)
    cerebras: {
      name: '⚡ Code Expert',
      models: [
        { id: 'llama-3.3-70b', name: 'Fast Code' },
      ],
    },
    // 2. Planner - xAI Grok (great for planning & reasoning)
    xai: {
      name: '🧠 Planner',
      models: [
        { id: 'grok-3', name: 'Architect' },
      ],
    },
    // 3. Designer - Gemini (multimodal, good for UI)
    gemini: {
      name: '🎨 Designer',
      models: [
        { id: 'gemini-2.0-flash', name: 'Design Flash' },
      ],
    },
    // 4. Sanbay Fusion - Claude (high quality)
    anthropic: {
      name: '✨ Sanbay Fusion',
      models: [
        { id: 'claude-sonnet-4-20250514', name: 'Nova' },
      ],
    },
  };
}

// Canvas default provider is Cerebras (fast code generation)
export function getCanvasDefaultProvider(): string {
  return 'cerebras';
}

// Canvas default model is Llama 3.3 70B
export function getCanvasDefaultModel(): string {
  return 'llama-3.3-70b';
}

// ============================================================================
// HELPER: Get Agent Display Name
// ============================================================================
export function getAgentDisplayName(agentId: string): string {
  const names: Record<string, string> = {
    'einstein': 'Albert Einstein',
    'chess-player': 'Chess Player',
    'comedy-king': 'Comedy King',
    'drama-queen': 'Drama Queen',
    'lazy-pawn': 'Lazy Pawn',
    'knight-logic': 'Knight Logic',
    'rook-jokey': 'Rook Jokey',
    'bishop-burger': 'Bishop Burger',
    'emma-emotional': 'Emma Emotional',
    'julie-girlfriend': 'Julie Girlfriend',
    'mrs-boss': 'Mrs Boss',
    'professor-astrology': 'Professor Astrology',
    'nid-gaming': 'Nid Gaming',
    'chef-biew': 'Chef Biew',
    'ben-sega': 'Ben Sega',
    'tech-wizard': 'Tech Wizard',
    'fitness-guru': 'Fitness Guru',
    'travel-buddy': 'Travel Buddy',
  };
  return names[agentId] || 'AI Assistant';
}

// Get first provider key for default selection (Anthropic Claude by default)
export function getAgentDefaultProvider(agentId: string): string {
  const options = getAgentProviderOptions(agentId);
  return options[0]?.provider || 'anthropic';
}

// Get first model for a provider (Claude by default)
export function getAgentDefaultModel(agentId: string, provider?: string): string {
  const options = getAgentProviderOptions(agentId);
  const targetProvider = provider || options[0]?.provider;
  const opt = options.find(o => o.provider === targetProvider);
  return opt?.models[0]?.value || 'claude-opus-4-20250514';
}

// ============================================================================
// DEFAULT USER-FRIENDLY AI OPTIONS (Fallback for unknown agents)
// ============================================================================
// Users see SIMPLE options - backend handles model fallback automatically
// ============================================================================
export const PROVIDER_MODEL_OPTIONS: ProviderModelOption[] = [
  // 1. Sanbay Fusion - Anthropic Claude
  {
    provider: 'anthropic',
    label: 'Sanbay Fusion',
    models: [
      { value: 'claude-opus-4-20250514', label: 'Nova Pro' },
    ],
  },
  // 2. One Last AI - Mistral
  {
    provider: 'mistral',
    label: 'One Last AI',
    models: [
      { value: 'mistral-large-2501', label: 'Maula Large' },
    ],
  },
  // 3. Planner - xAI Grok
  {
    provider: 'xai',
    label: 'Planner',
    models: [
      { value: 'grok-3-beta', label: 'Architect' },
    ],
  },
  // 4. Code Expert - Cerebras
  {
    provider: 'cerebras',
    label: 'Code Expert',
    models: [
      { value: 'llama-4-scout-17b-16e-instruct', label: 'Fast Code' },
    ],
  },
  // 5. Designer - OpenAI
  {
    provider: 'openai',
    label: 'Designer',
    models: [
      { value: 'gpt-4.5-preview', label: 'Vision Pro' },
    ],
  },
  // 6. Speed AI - Groq
  {
    provider: 'groq',
    label: 'Speed AI',
    models: [
      { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Turbo' },
    ],
  },
  // 7. Research - xAI Grok
  {
    provider: 'xai',
    label: 'Research',
    models: [
      { value: 'grok-3-beta', label: 'Deep Thinker' },
    ],
  },
];

// ============================================================================
// LEGACY PROVIDER OPTIONS (for backend/admin use only)
// ============================================================================
export const LEGACY_PROVIDER_OPTIONS: ProviderModelOption[] = [
  {
    provider: 'openai',
    label: 'OpenAI',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
  },
  {
    provider: 'anthropic',
    label: 'Anthropic',
    models: [
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    ],
  },
  {
    provider: 'mistral',
    label: 'Mistral',
    models: [
      { value: 'mistral-small-latest', label: 'Mistral Small' },
      { value: 'mistral-medium-latest', label: 'Mistral Medium' },
    ],
  },
  {
    provider: 'groq',
    label: 'Groq',
    models: [
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    ],
  },
  {
    provider: 'cerebras',
    label: 'Cerebras',
    models: [
      { value: 'llama3.1-8b', label: 'Llama 3.1 8B' },
      { value: 'llama-3.3-70b', label: 'Llama 3.3 70B' },
    ],
  },
  {
    provider: 'xai',
    label: 'xAI',
    models: [
      { value: 'grok-2', label: 'Grok-2' },
    ],
  },
  {
    provider: 'gemini',
    label: 'Google',
    models: [
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
  },
];
