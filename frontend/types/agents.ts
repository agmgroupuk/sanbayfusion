// Agent configuration types
export type AgentCategory =
    | 'Companion'
    | 'Business'
    | 'Entertainment'
    | 'Home & Lifestyle'
    | 'Education'
    | 'Health & Wellness'
    | 'Creative'
    | 'Technology';

export type AIProvider =
    | 'openai'
    | 'anthropic'
    | 'gemini'
    | 'cohere'
    | 'mistral'
    | 'xai'
    | 'huggingface'
    | 'groq'
    | 'cerebras';

export interface DetailedSection {
    title: string;
    icon: string;
    items?: string[];
    content?: string;
}

export interface AgentConfig {
    id: string;
    name: string;
    icon: string;
    specialty: string;
    description: string;
    welcomeMessage: string;
    avatarUrl: string;
    color: string;
    category: AgentCategory;
    tags: string[];
    personality: {
        traits: string[];
        responseStyle: string;
        greetingMessage: string;
        specialties: string[];
        conversationStarters: string[];
    };
    settings: {
        maxTokens: number;
        temperature: number;
        enabled: boolean;
        premium: boolean;
    };
    aiProvider: {
        primary: AIProvider;
        fallbacks: AIProvider[];
        model: string;
        reasoning?: string;
    };
    details?: {
        icon: string;
        sections: DetailedSection[];
    };
}
