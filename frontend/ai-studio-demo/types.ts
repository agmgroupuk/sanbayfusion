
export type Sender = 'YOU' | 'AGENT' | 'SYSTEM';

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: string;
  isImage?: boolean;
  isStreaming?: boolean;
  groundingUrls?: string[];
  imagePreview?: string; // Base64 image for display only (not sent to API)
}

export interface ChatSession {
  id: string;
  name: string;
  active: boolean;
  messages: Message[];
  settings: SettingsState;
}

export type NeuralTool =
  | 'none'
  | 'image_gen'
  | 'thinking'
  | 'deep_research'
  | 'shopping'
  | 'study'
  | 'web_search'
  | 'quizzes'
  | 'browser';

export interface SettingsState {
  customPrompt: string;
  agentName: string;
  agentId: string;
  temperature: number;
  maxTokens: number;
  provider: string;
  model: string;
  activeTool: NeuralTool;
}

export interface NavItem {
  label: string;
  icon: string;
  tool: NeuralTool;
  description: string;
}
