
export type Sender = 'YOU' | 'AGENT' | 'SYSTEM';

export interface FileAttachment {
  name: string;
  type: 'pdf' | 'doc' | 'docx' | 'csv' | 'tsv' | 'code' | 'text' | 'image' | 'video' | 'spreadsheet' | 'unknown';
  sizeKB: number;
  meta?: string; // e.g. "5,000 rows, 60 columns" or "12 pages"
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: string;
  isImage?: boolean;
  isStreaming?: boolean;
  groundingUrls?: string[];
  imagePreview?: string; // Base64 image for display only (not sent to API)
  fileAttachment?: FileAttachment; // Uploaded file metadata for display
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
  | 'video_generate'
  | 'thinking'
  | 'deep_research'
  | 'shopping'
  | 'study'
  | 'web_search'
  | 'canvas'
  | 'canvas_app'
  | 'quizzes'
  | 'browser';

export type WorkspaceMode = 'CHAT' | 'PORTAL' | 'CANVAS';

export interface CanvasState {
  content: string;
  type: 'text' | 'code' | 'html' | 'video' | 'image';
  language?: string;
  title: string;
}

export interface SettingsState {
  customPrompt: string;
  agentName: string;
  agentId: string;
  temperature: number;
  maxTokens: number;
  provider: string;
  model: string;
  activeTool: NeuralTool;
  workspaceMode: WorkspaceMode;
  portalUrl: string;
  canvas: CanvasState;
}

export interface NavItem {
  label: string;
  icon: string;
  tool: NeuralTool;
  description: string;
}
