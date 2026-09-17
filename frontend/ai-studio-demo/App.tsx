// Build: 2026-02-23T01
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import ChatBox from './components/ChatBox';
import NavigationDrawer from './components/NavigationDrawer';
// CanvasAppDrawer removed — Canvas Studio is now a standalone app at studio.sanbayfusion.com
// CanvasNavDrawer removed — canvas-studio directory was removed
import FilePanel from './components/FilePanel';
import Overlay from './components/Overlay';
import Footer from './components/Footer';
// Fix: Import WorkspaceMode which was missing and causing a reference error on line 312
import { ChatSession, Message, SettingsState, NavItem } from './types';
import { DEFAULT_SETTINGS, NEURAL_PRESETS } from './constants';
import { sendMessage, sendMessageStream, formatConversationHistory, ImageData, extractDocumentText, FileOperation } from './services/chatService';
import { sessionService } from './services/sessionService';
import { guestSessionService } from './services/guestSessionService';
import { sessionApiService } from './services/sessionApiService';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

// Standalone mode: no auth storage needed
const secureAuthStorage = { getUser: () => null, getToken: () => null };

// Guest session constants
const GUEST_MESSAGE_LIMIT = 20;
const GUEST_SESSION_KEY = 'maula_guest_session';

interface GuestSession {
  guestId: string;
  messageCount: number;
  createdAt: number;
  lastMessageAt: number;
}

interface AppProps {
  initialAgentId?: string;
  initialAgentName?: string;
  initialSystemPrompt?: string;
  initialProvider?: string;
  initialModel?: string;
  agentIcon?: string;
  agentSpecialty?: string;
  agentColor?: string;
  agentCategory?: string;
  agentFallbacks?: string[];
}

const App: React.FC<AppProps> = ({
  initialAgentId = 'default',
  initialAgentName = 'AI Assistant',
  initialSystemPrompt,
  initialProvider,
  initialModel,
  agentIcon = '🤖',
  agentSpecialty = '',
  agentColor = 'from-emerald-400 to-cyan-500',
  agentCategory = '',
  agentFallbacks = []
}) => {
  // UI State
  const [isOverlayActive, setIsOverlayActive] = useState(true);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isFilePanelOpen, setIsFilePanelOpen] = useState(false);
  const [demoRestriction, setDemoRestriction] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecordingSTT, setIsRecordingSTT] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [voiceText, setVoiceText] = useState(''); // Voice transcript to pass to ChatBox

  // Virtual filesystem state — files created/modified by AI agent
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});

  // Guest session state
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Gemini Live & STT Refs
  const recognitionRef = useRef<any>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create initial settings with agent-specific values
  // Studio mode defaults to xAI, agents use their registry provider, fallback to openai
  const isStudio = initialAgentId === 'ai-studio';
  // Universal-chat always uses Anthropic (with OpenAI fallback in backend)
  const resolvedProvider = 'anthropic';
  const resolvedModel = 'claude-sonnet-4-20250514';
  const initialSettings: SettingsState = {
    ...DEFAULT_SETTINGS,
    agentId: initialAgentId,
    agentName: initialAgentName,
    customPrompt: initialSystemPrompt || DEFAULT_SETTINGS.customPrompt,
    provider: resolvedProvider,
    model: resolvedModel
  };

  // Default session for SSR and first load
  // Use static timestamp to avoid hydration mismatch
  const defaultSessions: ChatSession[] = [
    {
      id: '1',
      name: "New Chat",
      active: true,
      messages: [
        {
          id: 'init-1',
          sender: 'AGENT',
          text: 'Hello! I\'m ready to help you. Feel free to ask me anything, upload images, or request me to generate images for you.',
          timestamp: '--:--:-- --'  // Static for SSR, will be updated on client
        }
      ],
      settings: initialSettings
    }
  ];

  // App Data State - SSR safe
  const [sessions, setSessions] = useState<ChatSession[]>(defaultSessions);

  // Check if this is studio/demo mode (should not persist)
  const isStudioMode = isStudio;

  // Helper to get userId from in-memory auth storage (NO localStorage)
  const getUserId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const user = secureAuthStorage.getUser();
      if (user) {
        return user?.id || user?.userId || null;
      }
    } catch { }
    return null;
  }, []);

  // Get user-specific storage key (used for in-memory cache keying)
  const getStorageKey = () => {
    if (typeof window === 'undefined') return 'neural_sessions_guest';
    const userId = getUserId();
    if (userId) return `neural_sessions_${userId}_${initialAgentId}`;
    return `neural_sessions_guest_${initialAgentId}`;
  };

  // ── SERVER-SIDE GUEST SESSION MANAGEMENT ──────────────────────────────────
  const initGuestSession = useCallback(async () => {
    if (typeof window === 'undefined') return null;

    // Check if user is logged in
    const userId = getUserId();
    if (userId) {
      setIsLoggedIn(true);
      return null;
    }

    setIsLoggedIn(false);

    // Load or create guest ID from cookie (NO localStorage)
    let guestId: string;
    const cookieMatch = document.cookie.match(/(?:^|;\s*)maula_guest=([^;]*)/);
    if (cookieMatch) {
      guestId = decodeURIComponent(cookieMatch[1]);
    } else {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      document.cookie = `maula_guest=${encodeURIComponent(guestId)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }

    // Check with server
    try {
      const data = await guestSessionService.check(guestId);
      if (data.success) {
        const session: GuestSession = {
          guestId,
          messageCount: data.messageCount || 0,
          createdAt: Date.now(),
          lastMessageAt: Date.now(),
        };
        setGuestSession(session);
        if (!data.allowed) {
          setShowLimitModal(true);
        }
        return session;
      }
    } catch {
      // Server unreachable — fall back to in-memory tracking
    }

    // In-memory fallback
    const fallbackSession: GuestSession = {
      guestId,
      messageCount: 0,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    };
    setGuestSession(fallbackSession);
    return fallbackSession;
  }, [getUserId]);

  // Initialize guest session on mount
  useEffect(() => {
    if (isStudioMode) {
      initGuestSession();
    }
  }, [isStudioMode, initGuestSession]);

  // Check if guest can send more messages
  const canGuestSendMessage = useCallback(() => {
    if (isLoggedIn) return true;
    if (!guestSession) return true;
    return guestSession.messageCount < GUEST_MESSAGE_LIMIT;
  }, [isLoggedIn, guestSession]);

  // Get remaining messages for guest
  const getRemainingMessages = useCallback(() => {
    if (isLoggedIn) return Infinity;
    if (!guestSession) return GUEST_MESSAGE_LIMIT;
    return Math.max(0, GUEST_MESSAGE_LIMIT - guestSession.messageCount);
  }, [isLoggedIn, guestSession]);

  // Increment guest message count (server-side)
  const incrementGuestMessageCount = useCallback(async () => {
    if (isLoggedIn || !guestSession) return;

    // Optimistic in-memory update (NO localStorage)
    const updatedSession: GuestSession = {
      ...guestSession,
      messageCount: guestSession.messageCount + 1,
      lastMessageAt: Date.now()
    };
    setGuestSession(updatedSession);

    if (updatedSession.messageCount >= GUEST_MESSAGE_LIMIT) {
      setShowLimitModal(true);
    }

    // Server-side increment (fire-and-forget)
    guestSessionService.increment(guestSession.guestId).then(data => {
      if (data.success && !data.allowed) {
        setShowLimitModal(true);
      }
    }).catch(() => { });
  }, [isLoggedIn, guestSession]);

  // ── DB-FIRST SESSION LOADING ──────────────────────────────────────────────
  const dbLoadDoneRef = useRef(false);
  const clientTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || isStudioMode || dbLoadDoneRef.current) return;

    // Generate timestamp once to avoid hydration mismatch
    if (!clientTimestampRef.current) {
      clientTimestampRef.current = new Date().toLocaleTimeString();
    }
    const currentTimestamp = clientTimestampRef.current;

    const userId = getUserId();

    if (userId) {
      // LOGGED-IN USER: Load sessions from DB (DB is source of truth — NO localStorage)
      setIsLoggedIn(true);
      dbLoadDoneRef.current = true;
      sessionService.setAuthenticated(true);

      (async () => {
        try {
          const data = await sessionApiService.loadSessions(initialAgentId, userId, 50);

          if (data.success && data.sessions?.length > 0) {
            // Use DB sessions as source of truth
            const dbSessions: ChatSession[] = data.sessions.map((s: any) => ({
              id: s.id,
              name: s.name,
              active: s.active || false,
              messages: s.messages || [],
              settings: { ...initialSettings, ...(s.settings || {}) },
            }));

            // Ensure at least one is active
            const hasActive = dbSessions.some(s => s.active);
            if (!hasActive && dbSessions.length > 0) {
              dbSessions[0].active = true;
            }

            setSessions(dbSessions);

            // Load virtual files for active session
            const activeId = data.activeSessionId || dbSessions.find((s: ChatSession) => s.active)?.id;
            if (activeId) {
              sessionApiService.loadFiles(activeId as string, userId).then(fData => {
                if (fData.success && fData.files) {
                  setProjectFiles(fData.files);
                }
              }).catch(() => { });
            }

            return; // DB load successful
          }
        } catch (e) {
          console.error('[App] DB session load failed:', e);
        }

        // DB had no sessions or failed → start fresh with defaults
        setSessions(prev => prev.map(s => ({
          ...s,
          messages: s.messages.map(m => ({
            ...m,
            timestamp: m.timestamp === '--:--:-- --' ? currentTimestamp : m.timestamp
          }))
        })));
      })();
    } else {
      // GUEST USER: in-memory only (no DB, no localStorage)
      setSessions(prev => prev.map(s => ({
        ...s,
        messages: s.messages.map(m => ({
          ...m,
          timestamp: m.timestamp === '--:--:-- --' ? currentTimestamp : m.timestamp
        }))
      })));
    }
  }, [initialAgentId]);

  // Sessions are DB-backed for logged-in users, in-memory for guests
  // NO localStorage cache needed

  // ── SYNC ACTIVE SESSION TO DB ─────────────────────────────────────────────
  const lastActiveRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || isStudioMode || !isLoggedIn) return;
    const active = sessions.find(s => s.active);
    if (active && active.id !== lastActiveRef.current) {
      lastActiveRef.current = active.id;
      const userId = getUserId();
      if (userId) {
        sessionApiService.setActive(active.id, userId).catch(() => { });
      }
    }
  }, [sessions, isStudioMode, isLoggedIn, getUserId]);

  // ── PERSIST VIRTUAL FILES TO DB ───────────────────────────────────────────
  const filesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || isStudioMode || !isLoggedIn) return;
    if (Object.keys(projectFiles).length === 0) return;

    // Debounce: save files 2s after last change
    if (filesSaveTimerRef.current) clearTimeout(filesSaveTimerRef.current);
    filesSaveTimerRef.current = setTimeout(() => {
      const active = sessions.find(s => s.active);
      const userId = getUserId();
      if (active && userId) {
        sessionApiService.saveFiles(active.id, userId, projectFiles).catch(() => { });
      }
    }, 2000);

    return () => {
      if (filesSaveTimerRef.current) clearTimeout(filesSaveTimerRef.current);
    };
  }, [projectFiles, isStudioMode, isLoggedIn, sessions, getUserId]);

  const activeSession = sessions.find(s => s.active) || sessions[0];

  const handleSend = async (text: string, imageData?: ImageData) => {
    if (isThinking) {
      console.log('[Chat] Blocked - already processing a request');
      return;
    }

    // Check guest message limit for studio mode
    if (isStudioMode && !canGuestSendMessage()) {
      setShowLimitModal(true);
      return;
    }

    // Get userId for DB persistence (from in-memory auth — NO localStorage)
    let persistUserId: string | undefined;
    try {
      const user = secureAuthStorage.getUser();
      if (user) {
        persistUserId = user?.id || user?.userId;
      }
    } catch { }
    const persistSessionId = activeSession?.id;

    const timestamp = new Date().toLocaleTimeString();
    const userMsg: Message = { id: Date.now().toString(), sender: 'YOU', text, timestamp };

    setSessions(prev => prev.map(s =>
      s.active ? { ...s, messages: [...s.messages, userMsg] } : s
    ));

    setIsThinking(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Create placeholder message for streaming
    const agentMsgId = (Date.now() + 1).toString();
    const streamingMsg: Message = {
      id: agentMsgId,
      sender: 'AGENT',
      text: '',
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: true,
    };

    // Add empty agent message immediately for streaming
    setSessions(prev => prev.map(s =>
      s.active ? { ...s, messages: [...s.messages, streamingMsg] } : s
    ));

    try {
      // Build conversation history for backend API
      const history = formatConversationHistory(
        activeSession.messages.map(m => ({ sender: m.sender, text: m.text }))
      );

      // If there's an image, use non-streaming API (vision)
      if (imageData) {
        console.log('[Chat] Sending request with vision (non-streaming)...');
        const result = await sendMessage(
          text,
          activeSession.settings,
          history,
          imageData,
          abortControllerRef.current.signal,
          persistSessionId,
          persistUserId
        );

        // Update the streaming message with final result
        setSessions(prev => prev.map(s =>
          s.active ? {
            ...s,
            messages: s.messages.map(m =>
              m.id === agentMsgId
                ? { ...m, text: result.text, isStreaming: false }
                : m
            )
          } : s
        ));
      } else {
        // Use streaming API for text-only requests
        console.log('[Chat] Starting streaming response...');

        await sendMessageStream(
          text,
          activeSession.settings,
          history,
          {
            onToken: (token: string) => {
              // Immediate token-by-token rendering (React 18 auto-batches)
              setSessions(prev => prev.map(s =>
                s.active ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === agentMsgId
                      ? { ...m, text: m.text + token }
                      : m
                  )
                } : s
              ));
            },
            onComplete: (fullText: string, provider: string) => {
              console.log(`[Neural-Link] Streaming complete from: ${provider}`);
              // Set final complete text and mark done
              setSessions(prev => prev.map(s =>
                s.active ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === agentMsgId
                      ? { ...m, text: fullText, isStreaming: false }
                      : m
                  )
                } : s
              ));
            },
            onError: (error: Error) => {
              console.error('[Chat] Streaming error:', error);
              // Update message with error
              setSessions(prev => prev.map(s =>
                s.active ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === agentMsgId
                      ? { ...m, text: `❌ Error: ${error.message}`, isStreaming: false }
                      : m
                  )
                } : s
              ));
            },
            onFileOperation: (op: FileOperation) => {
              console.log('[Chat] File operation received:', op.action, op.path);
              setProjectFiles(prev => {
                const next = { ...prev };
                switch (op.action) {
                  case 'update_file':
                  case 'create_folder':
                  case 'append_to_file':
                    if (op.path && op.content !== undefined) {
                      next[op.path] = op.content;
                    }
                    break;
                  case 'delete_file':
                    if (op.path) delete next[op.path];
                    break;
                  case 'rename_file':
                    if (op.oldPath && op.newPath && next[op.oldPath] !== undefined) {
                      next[op.newPath] = next[op.oldPath];
                      delete next[op.oldPath];
                    }
                    break;
                  case 'copy_file':
                    if (op.sourcePath && op.destinationPath && next[op.sourcePath] !== undefined) {
                      next[op.destinationPath] = next[op.sourcePath];
                    }
                    break;
                }
                return next;
              });
              // File panel available via toolbar button — code renders inline in chat
            },
          },
          abortControllerRef.current.signal,
          projectFiles,  // Send current files so backend can read/list them
          persistSessionId,
          persistUserId
        );
      }

      // Increment guest message count for studio mode
      if (isStudioMode) {
        incrementGuestMessageCount();
      }
    } catch (error: any) {
      console.error('[Chat] Error:', error);

      // Update the streaming message with error
      setSessions(prev => prev.map(s =>
        s.active ? {
          ...s,
          messages: s.messages.map(m =>
            m.id === agentMsgId
              ? { ...m, text: `❌ Error: ${error.message || 'Failed to get response. Please try again.'}`, isStreaming: false }
              : m
          )
        } : s
      ));
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  // Stop generation handler
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('[Chat] User requested to stop generation');
      abortControllerRef.current.abort();
      setIsThinking(false);

      // Add a stopped message to the chat
      const stoppedMsg: Message = {
        id: Date.now().toString(),
        sender: 'AGENT',
        text: '⏹️ Generation stopped by user.',
        timestamp: new Date().toLocaleTimeString()
      };

      setSessions(prev => prev.map(s =>
        s.active ? { ...s, messages: [...s.messages, stoppedMsg] } : s
      ));
    }
  }, []);

  // Regenerate last response — remove last agent message and resend the last user message
  const handleRegenerateResponse = useCallback(() => {
    if (isThinking) return;
    const msgs = activeSession.messages;
    // Find the last user message
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender === 'YOU') { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;
    const lastUserText = msgs[lastUserIdx].text;
    // Remove all messages after the last user message (the agent responses)
    setSessions(prev => prev.map(s =>
      s.active ? { ...s, messages: s.messages.slice(0, lastUserIdx + 1) } : s
    ));
    // Re-send the same message
    setTimeout(() => handleSend(lastUserText), 100);
  }, [activeSession, isThinking, handleSend]);

  const handleFileUpload = (file: File) => {
    console.log('[App] handleFileUpload called with:', file.name, file.type, file.size);

    // Prevent uploading while already thinking
    if (isThinking) {
      console.log('[Upload] Blocked - already processing');
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isDocument = ['pdf', 'doc', 'docx'].includes(fileExt);
    const isCode = ['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'sql', 'sh'].includes(fileExt);

    console.log('[Upload] File type detection:', { isImage, isVideo, isDocument, isCode, fileExt });

    // Handle PDF/DOCX documents - extract text server-side
    if (isDocument) {
      setIsThinking(true);

      // Show processing message
      const processingMsg: Message = {
        id: Date.now().toString(),
        sender: 'YOU',
        text: `📄 Uploaded: **${file.name}**\n\n_Extracting text content..._`,
        timestamp: new Date().toLocaleTimeString()
      };
      setSessions(prev => prev.map(s =>
        s.active ? { ...s, messages: [...s.messages, processingMsg] } : s
      ));

      // Extract document text via server API
      extractDocumentText(file)
        .then(async (docData) => {
          console.log('[Upload] Document extracted:', {
            fileName: docData.fileName,
            type: docData.fileType,
            pages: docData.pageCount,
            chars: docData.content.length
          });

          // Update the user message with actual content preview
          const contentPreview = docData.content.length > 500
            ? docData.content.slice(0, 500) + '...'
            : docData.content;

          setSessions(prev => prev.map(s => {
            if (!s.active) return s;
            const msgs = [...s.messages];
            const lastIdx = msgs.length - 1;
            if (msgs[lastIdx]?.id === processingMsg.id) {
              msgs[lastIdx] = {
                ...msgs[lastIdx],
                text: `📄 **${file.name}**${docData.pageCount ? ` (${docData.pageCount} pages)` : ''}\n\n\`\`\`\n${contentPreview}\n\`\`\``
              };
            }
            return { ...s, messages: msgs };
          }));

          // Send the full document to AI for analysis
          try {
            const history = formatConversationHistory(
              activeSession.messages.map(m => ({ sender: m.sender, text: m.text }))
            );

            const prompt = `I have uploaded a document: "${docData.fileName}"${docData.pageCount ? ` with ${docData.pageCount} pages` : ''}.\n\nHere is the extracted text content:\n\n---\n${docData.content}\n---\n\nPlease analyze this document and provide a summary of its key points.`;

            // Use streaming for the response
            const agentMsgId = (Date.now() + 1).toString();
            const agentMsg: Message = {
              id: agentMsgId,
              sender: 'AGENT',
              text: '',
              timestamp: new Date().toLocaleTimeString(),
              isStreaming: true
            };

            setSessions(prev => prev.map(s =>
              s.active ? { ...s, messages: [...s.messages, agentMsg] } : s
            ));

            await sendMessageStream(
              prompt,
              activeSession.settings,
              history,
              undefined,
              {
                onToken: (token) => {
                  setSessions(prev => prev.map(s => {
                    if (!s.active) return s;
                    return {
                      ...s,
                      messages: s.messages.map(m =>
                        m.id === agentMsgId ? { ...m, text: m.text + token } : m
                      )
                    };
                  }));
                },
                onComplete: (result) => {
                  console.log(`[Neural-Link] Document analysis complete: ${result.provider} (${result.durationMs}ms)`);
                  setSessions(prev => prev.map(s => {
                    if (!s.active) return s;
                    return {
                      ...s,
                      messages: s.messages.map(m =>
                        m.id === agentMsgId ? { ...m, isStreaming: false } : m
                      )
                    };
                  }));
                  setIsThinking(false);
                },
                onError: (error) => {
                  console.error('[Upload] Document analysis failed:', error);
                  setSessions(prev => prev.map(s => {
                    if (!s.active) return s;
                    return {
                      ...s,
                      messages: s.messages.map(m =>
                        m.id === agentMsgId ? {
                          ...m,
                          text: `❌ Error analyzing document: ${error}`,
                          isStreaming: false
                        } : m
                      )
                    };
                  }));
                  setIsThinking(false);
                }
              }
            );
          } catch (err) {
            console.error('[Upload] Document analysis failed:', err);
            const errorMsg: Message = {
              id: (Date.now() + 1).toString(),
              sender: 'AGENT',
              text: `❌ Error analyzing document: ${err instanceof Error ? err.message : 'Unknown error'}`,
              timestamp: new Date().toLocaleTimeString()
            };
            setSessions(prev => prev.map(s =>
              s.active ? { ...s, messages: [...s.messages, errorMsg] } : s
            ));
            setIsThinking(false);
          }
        })
        .catch((err) => {
          console.error('[Upload] Document extraction failed:', err);
          const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'AGENT',
            text: `❌ Error extracting document text: ${err instanceof Error ? err.message : 'Unknown error'}`,
            timestamp: new Date().toLocaleTimeString()
          };
          setSessions(prev => prev.map(s =>
            s.active ? { ...s, messages: [...s.messages, errorMsg] } : s
          ));
          setIsThinking(false);
        });
      return;
    }

    // Handle other file types with FileReader
    const reader = new FileReader();
    reader.onload = async (e) => {
      console.log('[Upload] FileReader loaded');
      const content = e.target?.result as string;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isCode = file.name.endsWith('.js') || file.name.endsWith('.py') || file.name.endsWith('.html') || file.name.endsWith('.css');

      console.log('[Upload] File type detection:', { isImage, isVideo, isCode });

      // For images: Extract base64 and send to AI with vision capability
      if (isImage && content.startsWith('data:')) {
        const base64Match = content.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          const mimeType = base64Match[1];
          const base64Data = base64Match[2];

          console.log(`[Upload] Sending image to vision AI: ${file.name} (${(base64Data.length / 1024).toFixed(0)}KB base64)`);

          // Add user message with image preview to chat
          // NOTE: Don't store base64 in message text - use a placeholder
          const timestamp = new Date().toLocaleTimeString();
          const userMsgWithImage: Message = {
            id: Date.now().toString(),
            sender: 'YOU',
            text: `[Uploaded Image: ${file.name}]\n\nAnalyze this image`,
            timestamp,
            imagePreview: content // Store image separately for display only
          };

          setSessions(prev => prev.map(s =>
            s.active ? { ...s, messages: [...s.messages, userMsgWithImage] } : s
          ));

          setIsThinking(true);

          // Send image with vision-enabled AI for real analysis
          try {
            const history = formatConversationHistory(
              activeSession.messages.map(m => ({ sender: m.sender, text: m.text }))
            );

            const result = await sendMessage(
              `Please analyze this image in detail. Describe what you see, any text, objects, people, colors, and any relevant information.`,
              activeSession.settings,
              history,
              { base64: base64Data, mimeType, fileName: file.name }
            );

            console.log(`[Neural-Link] Response from: ${result.provider} (${result.durationMs}ms) [Vision]`);

            const agentMsg: Message = {
              id: (Date.now() + 1).toString(),
              sender: 'AGENT',
              text: result.text,
              timestamp: new Date().toLocaleTimeString()
            };

            setSessions(prev => prev.map(s =>
              s.active ? { ...s, messages: [...s.messages, agentMsg] } : s
            ));
          } catch (err) {
            console.error('[Upload] Vision request failed:', err);
            const errorMsg: Message = {
              id: (Date.now() + 1).toString(),
              sender: 'AGENT',
              text: `❌ Error analyzing image: ${err instanceof Error ? err.message : 'Unknown error'}`,
              timestamp: new Date().toLocaleTimeString()
            };
            setSessions(prev => prev.map(s =>
              s.active ? { ...s, messages: [...s.messages, errorMsg] } : s
            ));
          } finally {
            setIsThinking(false);
          }
          return;
        }
      }

      // For text files (code, documents): Include content in message
      if (!isImage && !isVideo) {
        await handleSend(`I have uploaded a file: ${file.name}\n\nHere is the content:\n\`\`\`\n${content}\n\`\`\`\n\nPlease analyze this file.`);
        return;
      }

      // Fallback for other file types
      await handleSend(`I have uploaded a file: ${file.name}. Please analyze it in the workspace.`);
    };

    reader.onerror = (err) => {
      console.error('[Upload] File read error:', err);
    };

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const toggleSTT = () => {
    if (isRecordingSTT) {
      // Stop recording - set flag to prevent restart
      if (recognitionRef.current) {
        (recognitionRef.current as any).__shouldRestart = false;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecordingSTT(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition not supported in this browser environment.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Track final transcripts to avoid duplicates
      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';

        // Process results - only add new final results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Update voice text with final + interim (interim shown in grey in input)
        setVoiceText(finalTranscript + interimTranscript);
      };

      // Don't auto-close - only close when user manually stops
      // Use a flag on the recognition object to track if we should restart
      (recognition as any).__shouldRestart = true;

      recognition.onend = () => {
        // If still supposed to be recording, restart (handles browser auto-stop)
        if (recognitionRef.current && (recognitionRef.current as any).__shouldRestart) {
          try {
            recognition.start();
          } catch (e) {
            // Already started or other error
            console.log('[STT] Could not restart:', e);
            setIsRecordingSTT(false);
          }
        } else {
          setIsRecordingSTT(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[STT] Error:', event.error);
        if (event.error === 'aborted') {
          // User stopped - this is fine
          return;
        }
        // Prevent onend from restarting after a real error
        (recognition as any).__shouldRestart = false;
        recognitionRef.current = null;
        setIsRecordingSTT(false);
      };

      recognition.start();
      setIsRecordingSTT(true);
      setVoiceText(''); // Clear previous transcript
      recognitionRef.current = recognition;
    }
  };

  const toggleLive = async () => {
    if (isLiveActive) {
      liveSessionRef.current?.close();
      setIsLiveActive(false);
    } else {
      // Fix: Use process.env.API_KEY directly and initialize inside the trigger to follow SDK guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      setIsLiveActive(true);

      // Audio setup
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;

                const binary = new Uint8Array(int16.buffer);
                // Fix: Implemented manual audio encoding following GenAI SDK guidelines
                let bStr = '';
                for (let i = 0; i < binary.length; i++) bStr += String.fromCharCode(binary[i]);
                const base64 = btoa(bStr);

                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              const base64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64) {
                // Fix: Implemented manual audio decoding following GenAI SDK guidelines
                const binStr = atob(base64);
                const bytes = new Uint8Array(binStr.length);
                for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

                const dataInt16 = new Int16Array(bytes.buffer);
                const buffer = outputCtx.createBuffer(1, dataInt16.length, 24000);
                const channelData = buffer.getChannelData(0);
                for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

                const source = outputCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputCtx.destination);

                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
              }
              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onclose: () => setIsLiveActive(false),
            onerror: () => setIsLiveActive(false)
          },
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: activeSession.settings.customPrompt
          }
        });
        liveSessionRef.current = await sessionPromise;
      } catch (err) {
        console.error("Live failed:", err);
        setIsLiveActive(false);
      }
    }
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) return [
        { id: Date.now().toString(), name: "NEW_PROTOCOL", active: true, messages: [], settings: initialSettings }
      ];
      if (prev.find(s => s.id === id)?.active) filtered[0].active = true;
      return filtered;
    });
    // Sync delete to DB (fire-and-forget)
    const userId = getUserId();
    if (userId) {
      sessionApiService.deleteSession(id, userId).catch(() => { });
    }
  };

  const renameSession = (id: string, newName: string) => {
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, name: newName } : s
    ));
    // Sync rename to DB (fire-and-forget)
    const userId = getUserId();
    if (userId) {
      sessionApiService.renameSession(id, userId, newName).catch(() => { });
    }
  };

  const handleApplyPreset = (type: string) => {
    const preset = NEURAL_PRESETS[type];
    if (!preset) return;
    updateActiveSettings({ ...activeSession.settings, customPrompt: preset.prompt, temperature: preset.temp });
  };

  const createNewSession = () => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id, name: `PROTOCOL_LOG_${id.slice(-4)}`, active: true,
      messages: [{ id: `init-${id}`, sender: 'AGENT', text: 'Hi! How can I help you today?', timestamp: new Date().toLocaleTimeString() }],
      settings: initialSettings
    };
    setSessions(prev => prev.map(s => ({ ...s, active: false })).concat(newSession));
    // Sync create to DB (fire-and-forget)
    const userId = getUserId();
    if (userId) {
      sessionApiService.createSession(userId, {
        title: newSession.name,
        agentId: initialAgentId,
        settings: newSession.settings,
        localId: id,
      }).catch(() => { });
    }
  };

  const selectSession = (id: string) => {
    setSessions(prev => prev.map(s => ({ ...s, active: s.id === id })));
    // Load virtual files for newly selected session
    if (isLoggedIn) {
      const userId = getUserId();
      if (userId) {
        sessionApiService.loadFiles(id, userId).then(data => {
          if (data.success && data.files) {
            setProjectFiles(data.files);
          } else {
            setProjectFiles({});
          }
        }).catch(() => { setProjectFiles({}); });
      }
    }
  };

  const updateActiveSettings = (settings: SettingsState) => {
    setSessions(prev => prev.map(s => s.active ? { ...s, settings } : s));
  };

  return (
    <div className="text-gray-300 h-screen flex flex-col overflow-hidden relative selection:bg-green-500/30 selection:text-white font-mono" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(74, 222, 128, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(34, 211, 238, 0.08) 0%, transparent 40%), linear-gradient(135deg, #0A0A0A 0%, #111111 100%)' }}>
      {/* Guest Message Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16162a] rounded-2xl p-8 max-w-md mx-4 border border-purple-500/30 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-3xl">🚀</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You're on a Roll!</h2>
              <p className="text-gray-400 mb-6">
                You've used all {GUEST_MESSAGE_LIMIT} free messages. Sign up for free to continue chatting with unlimited messages!
              </p>
              <div className="space-y-3">
                <a
                  href="https://sanbayfusion.com/auth/signup"
                  className="block w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Sign Up Free
                </a>
                <a
                  href="https://sanbayfusion.com/auth/login"
                  className="block w-full py-3 px-6 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
                >
                  Already have an account? Log In
                </a>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Overlay active={isOverlayActive} onActivate={() => setIsOverlayActive(false)} agentName={initialAgentName} />
      <div className={`flex flex-col h-full transition-opacity duration-300 ${isNavDrawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Header
          onToggleLeft={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          onToggleRight={() => setIsRightPanelOpen(!isRightPanelOpen)}
          onToggleNav={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
          onToggleFiles={() => setIsFilePanelOpen(!isFilePanelOpen)}
          fileCount={Object.keys(projectFiles).length}
          onClear={() => setSessions(prev => prev.map(s => s.active ? { ...s, messages: [] } : s))}
          onLock={() => setIsOverlayActive(true)}
          leftOpen={isLeftPanelOpen} rightOpen={isRightPanelOpen}
        />
        <div className="flex-grow flex relative overflow-hidden z-10">
          {(isLeftPanelOpen || isRightPanelOpen) && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[50] transition-opacity animate-in fade-in duration-300" onClick={() => { setIsLeftPanelOpen(false); setIsRightPanelOpen(false); }}></div>
          )}
          <Sidebar
            sessions={sessions}
            onSelect={selectSession}
            onCreate={createNewSession}
            onDelete={deleteSession}
            onRename={renameSession}
            isOpen={isLeftPanelOpen}
          />
          <ChatBox
            messages={activeSession.messages} isThinking={isThinking}
            isRecordingSTT={isRecordingSTT} isLiveActive={isLiveActive}
            onSend={handleSend} onFileUpload={handleFileUpload}
            onToggleSTT={toggleSTT} onToggleLive={toggleLive}
            agentSettings={activeSession.settings} onUpdateSettings={updateActiveSettings}
            onStopGeneration={handleStopGeneration}
            onRegenerateResponse={handleRegenerateResponse}
            voiceText={voiceText}
            onClearVoiceText={() => setVoiceText('')}
          />
          <SettingsPanel settings={activeSession.settings} onChange={updateActiveSettings} onApplyPreset={handleApplyPreset} onReset={() => updateActiveSettings({ ...activeSession.settings, ...DEFAULT_SETTINGS })} isOpen={isRightPanelOpen} />
        </div>
        <Footer />
      </div>
      <NavigationDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        currentSettings={activeSession.settings}
        onSettingsChange={updateActiveSettings}
        agentId={initialAgentId}
        agentName={initialAgentName}
        agentIcon={agentIcon}
        agentSpecialty={agentSpecialty}
        agentColor={agentColor}
        agentCategory={agentCategory}
        agentProvider={initialProvider || 'anthropic'}
        agentModel={initialModel || 'claude-sonnet-4-20250514'}
        agentFallbacks={agentFallbacks}
        messages={activeSession.messages}
        sessions={sessions}
        onModuleSelect={(item: NavItem) => {
          // Canvas App — redirect to standalone Canvas Studio
          if (item.tool === 'canvas_app') {
            setIsNavDrawerOpen(false);
            window.open('https://studio.sanbayfusion.com', '_blank');
            return;
          }

          // Handle Canvas writing mode - show demo restriction
          if (item.tool === 'canvas') {
            setIsNavDrawerOpen(false);
            setDemoRestriction('Canvas writing workspace is not available in the free demo. Sign up at www.sanbayfusion.com to access all features!');
            return;
          }

          let mode = 'CHAT';
          if (item.tool === 'browser') mode = 'PORTAL';
          updateActiveSettings({ ...activeSession.settings, activeTool: item.tool });
          setIsNavDrawerOpen(false);
        }} />


      <FilePanel
        files={projectFiles}
        isOpen={isFilePanelOpen}
        onClose={() => setIsFilePanelOpen(false)}
        onDeleteFile={(path) => setProjectFiles(prev => {
          const next = { ...prev };
          delete next[path];
          return next;
        })}
      />

      {/* Demo Restriction Modal */}
      {demoRestriction && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDemoRestriction(null)}>
          <div className="bg-[#1a1a2e] border border-cyan-500/30 rounded-2xl p-8 max-w-md mx-4 shadow-[0_0_40px_rgba(6,182,212,0.2)] text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">🚫</div>
            <h3 className="text-xl font-bold text-white mb-3">Premium Feature</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">{demoRestriction}</p>
            <div className="flex gap-3 justify-center">
              <a
                href="https://www.sanbayfusion.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
              >
                Sign Up Free
              </a>
              <button
                onClick={() => setDemoRestriction(null)}
                className="px-6 py-2.5 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
