// Centralized API configuration
// All services should import their base URLs from here

const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

/** Main backend API (billing, workspace, etc.) */
export const MAIN_API_BASE = (import.meta as any).env?.VITE_API_URL
  || (isProd ? 'https://editor.sanbayfusion.com/api' : 'http://localhost:3204/api');

/** Editor backend API (AI, files, etc.) */
export const EDITOR_API_BASE = (import.meta as any).env?.VITE_EDITOR_API_URL
  || (isProd ? 'https://editor.sanbayfusion.com/api' : 'http://localhost:3204/api');

/** Editor backend root (no /api/v1 suffix) */
export const EDITOR_SERVER_BASE = (import.meta as any).env?.VITE_EDITOR_SERVER_URL
  || (isProd ? 'https://editor.sanbayfusion.com' : 'http://localhost:3204');

/** WebSocket collaboration server */
export const COLLAB_WS_URL = (import.meta as any).env?.VITE_COLLABORATION_URL
  || (isProd ? 'wss://editor.sanbayfusion.com/collaboration' : 'ws://localhost:3204/collaboration');

/** Ollama local AI server (dev only) */
export const OLLAMA_BASE = (import.meta as any).env?.VITE_OLLAMA_URL || 'http://localhost:11434';

/** CORS proxy for git operations */
export const GIT_CORS_PROXY = (import.meta as any).env?.VITE_GIT_CORS_PROXY || 'https://cors.isomorphic-git.org';
