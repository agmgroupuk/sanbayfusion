
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Upload,
  Mic,
  Check,
  ExternalLink,
  Globe,
  MessageSquare,
  Edit3,
  Monitor,
  FileCode,
  FileText,
  Layout,
  Image as ImageIcon,
  Video,
  Radio,
  MicOff,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  Share2,
  Volume2,
  VolumeX,
  Loader2,
  Pencil,
  ChevronDown,
  Phone,
  Download,
  X,
  Square,
  Sparkles,
  Zap,
  FileDown,
  Search,
  Command,
  CornerDownLeft,
  Keyboard,
  Info,
  BarChart3,
  Activity,
  AlertCircle,
  Clock,
  TrendingUp,
  Hash,
  Pin,
  Brain,
  ChevronRight,
  User,
  Trash2,
  Save,
  ToggleLeft,
  ToggleRight,
  Briefcase,
  Heart,
  Languages,
  MapPin,
  Calendar,
  Gamepad2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Message, SettingsState } from '../types';
import { PROVIDER_CONFIG, AGENT_VOICE_MAP } from '../constants';
import feedbackService from '../services/feedbackService';
import statsService from '../services/statsService';
import agentMemoryService from '../services/agentMemoryService';
import ttsService from '../services/ttsService';
import VoiceCallModal from './VoiceCallModal';

interface ChatBoxProps {
  messages: Message[];
  isThinking: boolean;
  isRecordingSTT: boolean;
  isLiveActive: boolean;
  onSend: (text: string) => void;
  onFileUpload: (file: File) => void;
  onToggleSTT: () => void;
  onToggleLive: () => void;
  onRegenerateResponse?: () => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onStopGeneration?: () => void;
  agentSettings: SettingsState;
  onUpdateSettings: (settings: SettingsState) => void;
  voiceText?: string;
  onClearVoiceText?: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  isThinking,
  isRecordingSTT,
  isLiveActive,
  onSend,
  onFileUpload,
  onToggleSTT,
  onToggleLive,
  onRegenerateResponse,
  onEditMessage,
  onStopGeneration,
  agentSettings,
  onUpdateSettings,
  voiceText = '',
  onClearVoiceText
}) => {
  const [inputText, setInputText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [liveToast, setLiveToast] = useState(false);
  const [demoRestriction, setDemoRestriction] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Pinned messages — in-memory only, loaded from DB via effect (NO localStorage)
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Liked/disliked messages — in-memory only, loaded from DB via effect (NO localStorage)
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState<string | null>(null);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  // Load liked/disliked from DB on mount (NO localStorage)
  const feedbackUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const { secureAuthStorage } = require('../../../lib/secure-auth-storage');
      const user = secureAuthStorage.getUser();
      if (!user) return;
      const userId = user?.id || user?.userId;
      if (!userId) return;
      feedbackUserIdRef.current = userId;
      feedbackService.load(userId)
        .then(data => {
          if (data.success) {
            if (data.liked?.length) setLikedMessages(prev => new Set([...prev, ...data.liked!]));
            if (data.disliked?.length) setDislikedMessages(prev => new Set([...prev, ...data.disliked!]));
          }
        })
        .catch(() => { });
    } catch { }
  }, []);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [thinkingDots, setThinkingDots] = useState(0);
  const [thinkingMessage, setThinkingMessage] = useState('Thinking');
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [showPromptTemplates, setShowPromptTemplates] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [memoryTab, setMemoryTab] = useState<'intro' | 'agent'>('intro');
  const [memoryProfile, setMemoryProfile] = useState({ name: '', dateOfBirth: '', gender: '', nationality: '', language: '', profession: '', workplace: '', interests: '', hobbies: '' });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [memoryProfileSaved, setMemoryProfileSaved] = useState(false);
  const [agentMemories, setAgentMemories] = useState<Array<{ id: string; type: string; content: string; importance: number; createdAt: string }>>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memorySaving, setMemorySaving] = useState(false);
  const [dobError, setDobError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toolbarScrollRef = useRef<HTMLDivElement>(null);
  const [toolbarScrollHint, setToolbarScrollHint] = useState(false);

  // Session stats tracking
  const [sessionStats, setSessionStats] = useState({
    totalMessages: 0,
    totalRequests: 0,
    totalErrors: 0,
    totalTokensUsed: 0,
    sessionStartTime: Date.now(),
    requestLog: [] as Array<{ timestamp: number; tokens: number; latencyMs: number; success: boolean }>,
  });
  const sessionIdRef = useRef<string>(`studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const prevMessageCountRef = useRef(0);
  const statsLoadedRef = useRef(false);

  // Request timer tracking
  const [requestTimer, setRequestTimer] = useState(0);
  const [lastRequestTime, setLastRequestTime] = useState<number | null>(null);
  const requestStartRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load session stats from DB on mount (DB-first)
  useEffect(() => {
    if (statsLoadedRef.current) return;
    statsLoadedRef.current = true;

    const sid = sessionIdRef.current;
    if (!sid) return;

    (async () => {
      try {
        const data = await statsService.load(sid);
        if (data.success && data.stats) {
          const s = data.stats;
          setSessionStats(prev => ({
            totalMessages: s.totalMessages ?? prev.totalMessages,
            totalRequests: s.totalRequests ?? prev.totalRequests,
            totalErrors: s.totalErrors ?? prev.totalErrors,
            totalTokensUsed: s.totalTokensUsed ?? prev.totalTokensUsed,
            sessionStartTime: s.sessionStartTime ? new Date(s.sessionStartTime).getTime() : prev.sessionStartTime,
            requestLog: s.requestLog ?? prev.requestLog,
          }));
          // Update prevMessageCountRef to current message count so we don't double-count
          prevMessageCountRef.current = messages.length;
        }
      } catch {
        // Stats API unreachable — start fresh (no data loss, just reset counters)
      }
    })();
  }, []);

  // Load memory data from DB when memory panel opens
  const loadMemoryData = useCallback(async () => {
    const userId = feedbackUserIdRef.current;
    const agentId = agentSettings.agentId || 'default';
    if (!userId) return;

    setMemoryLoading(true);
    try {
      const memData = await agentMemoryService.load(userId, agentId);
      if (memData.success && memData.data) {
        const d = memData.data;
        // Load user profile
        if (d.userProfile && typeof d.userProfile === 'object') {
          setMemoryProfile({
            name: d.userProfile.name || '',
            dateOfBirth: d.userProfile.dateOfBirth || '',
            gender: d.userProfile.gender || '',
            nationality: d.userProfile.nationality || '',
            language: d.userProfile.language || '',
            profession: d.userProfile.profession || '',
            workplace: d.userProfile.workplace || '',
            interests: d.userProfile.interests || '',
            hobbies: d.userProfile.hobbies || '',
          });
          setMemoryProfileSaved(!!d.userProfile.name || !!d.userProfile.dateOfBirth || !!d.userProfile.gender || !!d.userProfile.nationality);
        }
        // Load memories array
        if (d.memories && Array.isArray(d.memories)) {
          setAgentMemories(d.memories);
        }
        // Load memory enabled status
        if (typeof d.memoryEnabled === 'boolean') {
          setMemoryEnabled(d.memoryEnabled);
        }
      }
    } catch {
      // Memory API unreachable
    } finally {
      setMemoryLoading(false);
    }
  }, [agentSettings.agentId]);

  useEffect(() => {
    if (showMemoryPanel) {
      loadMemoryData();
    }
  }, [showMemoryPanel, loadMemoryData]);

  // Close custom dropdowns on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.space-y-1.relative')) {
        setOpenDropdown(null);
        setDropdownSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  // Save memory profile to DB
  const saveMemoryProfile = useCallback(async () => {
    const userId = feedbackUserIdRef.current;
    const agentId = agentSettings.agentId || 'default';
    if (!userId) return;

    // Enforce 18+ age requirement
    if (memoryProfile.dateOfBirth) {
      const dob = new Date(memoryProfile.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        setDobError('You must be at least 18 years old');
        return;
      }
    }
    setDobError('');

    setMemorySaving(true);
    try {
      await agentMemoryService.saveProfile(userId, agentId, memoryProfile);
      setMemoryProfileSaved(true);
    } catch { /* ignore */ } finally {
      setMemorySaving(false);
    }
  }, [agentSettings.agentId, memoryProfile]);

  // Delete memory profile from DB
  const deleteMemoryProfile = useCallback(async () => {
    const userId = feedbackUserIdRef.current;
    const agentId = agentSettings.agentId || 'default';
    if (!userId) return;

    setMemorySaving(true);
    try {
      await agentMemoryService.deleteProfile(userId, agentId);
      setMemoryProfile({ name: '', dateOfBirth: '', gender: '', nationality: '', language: '', profession: '', workplace: '', interests: '', hobbies: '' });
      setMemoryProfileSaved(false);
    } catch { /* ignore */ } finally {
      setMemorySaving(false);
    }
  }, [agentSettings.agentId]);

  // Toggle memory enabled/disabled
  const toggleMemoryEnabled = useCallback(async (enabled: boolean) => {
    const userId = feedbackUserIdRef.current;
    const agentId = agentSettings.agentId || 'default';
    if (!userId) return;

    setMemoryEnabled(enabled);
    try {
      // Store memory enabled flag in profile
      await agentMemoryService.toggleEnabled(userId, agentId, enabled, memoryProfile);
    } catch { /* ignore */ }
  }, [agentSettings.agentId, memoryProfile]);

  // Clear all agent memories
  const clearAgentMemories = useCallback(async () => {
    const userId = feedbackUserIdRef.current;
    const agentId = agentSettings.agentId || 'default';
    if (!userId) return;

    setMemorySaving(true);
    try {
      await agentMemoryService.clearAll(userId, agentId);
      setAgentMemories([]);
    } catch { /* ignore */ } finally {
      setMemorySaving(false);
    }
  }, [agentSettings.agentId]);

  // Auto-scroll hint for mobile toolbar (runs once)
  useEffect(() => {
    const el = toolbarScrollRef.current;
    if (!el) return;
    // Only trigger on smaller screens where content overflows
    const checkAndAnimate = () => {
      if (el.scrollWidth > el.clientWidth + 10) {
        setToolbarScrollHint(true);
        const maxScroll = el.scrollWidth - el.clientWidth;
        const duration = 1800;
        const pause = 400;
        let start: number | null = null;

        const animateScroll = (timestamp: number) => {
          if (!start) start = timestamp;
          const elapsed = timestamp - start;

          if (elapsed < duration) {
            // Phase 1: scroll right (ease-in-out)
            const progress = elapsed / duration;
            const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress);
            el.scrollLeft = eased * maxScroll;
            requestAnimationFrame(animateScroll);
          } else if (elapsed < duration + pause) {
            // Pause at the end
            el.scrollLeft = maxScroll;
            requestAnimationFrame(animateScroll);
          } else if (elapsed < duration * 2 + pause) {
            // Phase 2: scroll back left (ease-in-out)
            const progress = (elapsed - duration - pause) / duration;
            const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress);
            el.scrollLeft = maxScroll * (1 - eased);
            requestAnimationFrame(animateScroll);
          } else {
            el.scrollLeft = 0;
            setToolbarScrollHint(false);
          }
        };

        setTimeout(() => requestAnimationFrame(animateScroll), 600);
      }
    };
    checkAndAnimate();
  }, []);

  // Thinking animation messages
  const thinkingMessages = [
    'Thinking', 'Processing', 'Analyzing', 'Generating', 'Computing',
    'Understanding', 'Reasoning', 'Crafting response'
  ];

  // Prompt templates for quick actions
  const promptTemplates = [
    { emoji: '💻', label: 'Code', prompt: 'Write code to ' },
    { emoji: '📝', label: 'Write', prompt: 'Write a detailed ' },
    { emoji: '🔍', label: 'Explain', prompt: 'Explain in simple terms: ' },
    { emoji: '📊', label: 'Analyze', prompt: 'Analyze the following: ' },
    { emoji: '🎨', label: 'Creative', prompt: 'Create a creative ' },
    { emoji: '📋', label: 'Summarize', prompt: 'Summarize the following: ' },
    { emoji: '🔧', label: 'Fix', prompt: 'Fix this issue: ' },
    { emoji: '💡', label: 'Ideas', prompt: 'Give me 5 ideas for ' },
    { emoji: '📧', label: 'Email', prompt: 'Write a professional email about ' },
    { emoji: '🗣️', label: 'Translate', prompt: 'Translate the following to ' },
    { emoji: '🧪', label: 'Debug', prompt: 'Debug this code and explain the issue: ' },
    { emoji: '📐', label: 'Design', prompt: 'Design a system architecture for ' },
    { emoji: '🗺️', label: 'Plan', prompt: 'Create a step-by-step plan to ' },
    { emoji: '📖', label: 'Story', prompt: 'Write a short story about ' },
    { emoji: '🧠', label: 'Brainstorm', prompt: 'Brainstorm 10 creative ideas for ' },
    { emoji: '📊', label: 'Compare', prompt: 'Compare and contrast: ' },
    { emoji: '✅', label: 'Review', prompt: 'Review this code for best practices: ' },
    { emoji: '🎯', label: 'Optimize', prompt: 'Optimize the following for performance: ' },
    { emoji: '📚', label: 'Research', prompt: 'Research and explain: ' },
    { emoji: '🤖', label: 'Automate', prompt: 'Write an automation script for ' },
  ];

  const applyTemplate = (prompt: string) => {
    setInputText(prompt);
    setShowPromptTemplates(false);
    inputRef.current?.focus();
  };

  // Track messages for stats
  useEffect(() => {
    const currentCount = messages.length;
    if (currentCount > prevMessageCountRef.current) {
      const newMessages = messages.slice(prevMessageCountRef.current);
      let newUserMsgs = 0;
      let newAssistantMsgs = 0;
      let newTokens = 0;

      newMessages.forEach(m => {
        if (m.sender === 'YOU') newUserMsgs++;
        if (m.sender === 'AGENT') newAssistantMsgs++;
        newTokens += Math.ceil(m.text.length / 4);
      });

      setSessionStats(prev => {
        const updated = {
          ...prev,
          totalMessages: prev.totalMessages + newMessages.length,
          totalRequests: prev.totalRequests + newUserMsgs,
          totalTokensUsed: prev.totalTokensUsed + newTokens,
          requestLog: [
            ...prev.requestLog,
            ...newMessages.map(m => ({
              timestamp: Date.now(),
              tokens: Math.ceil(m.text.length / 4),
              latencyMs: 0,
              success: true,
            })),
          ],
        };
        // Persist stats to backend (fire-and-forget)
        persistStats(updated);
        return updated;
      });
    }
    prevMessageCountRef.current = currentCount;
  }, [messages.length]);

  // Track errors when generation fails
  useEffect(() => {
    if (!isThinking && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === 'AGENT' && (lastMsg.text.includes('Error:') || lastMsg.text.includes('error occurred'))) {
        setSessionStats(prev => ({ ...prev, totalErrors: prev.totalErrors + 1 }));
      }
    }
  }, [isThinking, messages]);

  // Persist stats to database
  const persistStats = useCallback(async (stats: typeof sessionStats) => {
    try {
      await statsService.save({
        sessionId: sessionIdRef.current,
        totalMessages: stats.totalMessages,
        totalRequests: stats.totalRequests,
        totalErrors: stats.totalErrors,
        totalTokensUsed: stats.totalTokensUsed,
        sessionStartTime: stats.sessionStartTime,
        requestLog: stats.requestLog.slice(-50), // Keep last 50 entries
      });
    } catch {
      // Silent fail - don't interrupt user experience
    }
  }, []);

  // Sync voice text with input when recording
  useEffect(() => {
    if (voiceText && isRecordingSTT) {
      setInputText(voiceText);
    }
  }, [voiceText, isRecordingSTT]);

  // Animated thinking indicator
  useEffect(() => {
    if (isThinking) {
      const dotsInterval = setInterval(() => {
        setThinkingDots(d => (d + 1) % 4);
      }, 400);
      const messageInterval = setInterval(() => {
        setThinkingMessage(thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)]);
      }, 2000);
      return () => {
        clearInterval(dotsInterval);
        clearInterval(messageInterval);
      };
    }
  }, [isThinking]);

  // Request timer - tracks how long each request takes
  useEffect(() => {
    if (isThinking) {
      // New request started
      requestStartRef.current = Date.now();
      setRequestTimer(0);
      setLastRequestTime(null);
      timerIntervalRef.current = setInterval(() => {
        if (requestStartRef.current) {
          setRequestTimer(((Date.now() - requestStartRef.current) / 1000));
        }
      }, 100);
    } else {
      // Request finished
      if (requestStartRef.current) {
        const elapsed = (Date.now() - requestStartRef.current) / 1000;
        setLastRequestTime(elapsed);
        setRequestTimer(elapsed);
        requestStartRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isThinking]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter: Send message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (inputText.trim() && !isThinking) {
          handleSend();
        }
      }
      // Ctrl/Cmd + K: Focus search/input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Ctrl/Cmd + Shift + S: Stop generation
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (isThinking && onStopGeneration) {
          onStopGeneration();
        }
      }
      // Escape: Close modals, stop editing
      if (e.key === 'Escape') {
        setShowKeyboardShortcuts(false);
        setShowExportMenu(false);
        setShowStats(false);
        setShowPromptTemplates(false);
        setLightboxImage(null);
        if (editingMessageId) {
          cancelEdit();
        }
      }
      // Ctrl/Cmd + /: Show keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputText, isThinking, editingMessageId, onStopGeneration]);

  // Export chat functionality
  const exportChat = useCallback((format: 'md' | 'json' | 'txt') => {
    const chatName = agentSettings.agentName || 'AI Chat';
    const timestamp = new Date().toISOString().slice(0, 10);
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'md') {
      content = `# ${chatName} - Chat Export\n\n_Exported: ${new Date().toLocaleString()}_\n\n---\n\n`;
      messages.forEach(msg => {
        const role = msg.sender === 'YOU' ? '👤 **You**' : `🤖 **${chatName}**`;
        content += `### ${role}\n_${msg.timestamp}_\n\n${msg.text}\n\n---\n\n`;
      });
      filename = `${chatName}-${timestamp}.md`;
      mimeType = 'text/markdown';
    } else if (format === 'json') {
      content = JSON.stringify({
        chatName,
        exportedAt: new Date().toISOString(),
        messages: messages.map(m => ({
          role: m.sender,
          content: m.text,
          timestamp: m.timestamp
        }))
      }, null, 2);
      filename = `${chatName}-${timestamp}.json`;
      mimeType = 'application/json';
    } else {
      content = `${chatName} - Chat Export\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
      messages.forEach(msg => {
        const role = msg.sender === 'YOU' ? 'You' : chatName;
        content += `[${msg.timestamp}] ${role}:\n${msg.text}\n\n`;
      });
      filename = `${chatName}-${timestamp}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [messages, agentSettings.agentName]);

  // Token estimation (rough approximation: ~4 chars per token for English text)
  const estimateTokens = useCallback((text: string): number => {
    // Simple estimation: average 4 characters per token
    return Math.ceil(text.length / 4);
  }, []);

  // Calculate total tokens in conversation
  const conversationTokens = messages.reduce((total, msg) => total + estimateTokens(msg.text), 0);
  const inputTokens = estimateTokens(inputText);
  const totalTokens = conversationTokens + inputTokens;

  // Get context limit for token display
  const getContextLimit = () => {
    return 200000; // Anthropic Claude context window
  };

  const contextLimit = getContextLimit();
  const tokenPercentage = Math.min((totalTokens / contextLimit) * 100, 100);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
        setShowProviderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = () => {
    if (!inputText.trim() || isThinking) return;
    onSend(inputText.trim());
    setInputText("");
    // Reset textarea height after sending
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    // Clear voice text when sending
    onClearVoiceText?.();
  };

  // Copy message to clipboard
  const handleCopy = async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Like/Unlike message
  const handleLike = (messageId: string) => {
    const newLiked = new Set(likedMessages);
    const newDisliked = new Set(dislikedMessages);
    const wasLiked = newLiked.has(messageId);
    if (wasLiked) {
      newLiked.delete(messageId);
    } else {
      newLiked.add(messageId);
      newDisliked.delete(messageId);
    }
    setLikedMessages(newLiked);
    setDislikedMessages(newDisliked);
    // Save to DB only (NO localStorage)
    if (feedbackUserIdRef.current) {
      feedbackService.submit(feedbackUserIdRef.current, messageId, wasLiked ? 'remove' : 'like').catch(() => { });
    }
  };

  // Dislike message
  const handleDislike = (messageId: string) => {
    const newLiked = new Set(likedMessages);
    const newDisliked = new Set(dislikedMessages);
    const wasDisliked = newDisliked.has(messageId);
    if (wasDisliked) {
      newDisliked.delete(messageId);
    } else {
      newDisliked.add(messageId);
      newLiked.delete(messageId);
    }
    setLikedMessages(newLiked);
    setDislikedMessages(newDisliked);
    // Save to DB only (NO localStorage)
    if (feedbackUserIdRef.current) {
      feedbackService.submit(feedbackUserIdRef.current, messageId, wasDisliked ? 'remove' : 'dislike').catch(() => { });
    }
  };

  // Share message
  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
    }
  };

  // Toggle pin on a message (in-memory only — NO localStorage)
  const handleTogglePin = (msgId: string) => {
    setPinnedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  // Toggle search bar
  const handleToggleSearch = () => {
    setSearchOpen(prev => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery("");
      }
      return !prev;
    });
  };

  // Filter messages by search
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Pinned messages for display at top
  const pinnedMessages = messages.filter(m => pinnedMessageIds.has(m.id));

  // Share image
  const handleShareImage = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Generated Image',
          text: 'Check out this AI generated image!',
          url: imageUrl
        });
      } catch (err) {
        // User cancelled or error - fallback to copy
        await navigator.clipboard.writeText(imageUrl);
      }
    } else {
      // Fallback: copy URL to clipboard
      await navigator.clipboard.writeText(imageUrl);
      alert('Image URL copied to clipboard!');
    }
  };

  // Download image
  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // If CORS blocks, open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  // Text-to-speech for agent messages using ElevenLabs with agent-specific voices
  const handleSpeak = async (messageId: string, text: string) => {
    // If already playing this message, stop it (toggle off)
    if (speakingMessageId === messageId) {
      // Stop ElevenLabs audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      // Stop browser speech synthesis
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      setIsTTSLoading(null);
      return;
    }

    // Stop any currently playing audio (from another message)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Stop any browser speech
    window.speechSynthesis.cancel();

    // Get voice for current agent
    const agentId = agentSettings.agentId || 'default';
    const voiceConfig = AGENT_VOICE_MAP[agentId] || AGENT_VOICE_MAP['default'];

    setIsTTSLoading(messageId);
    setSpeakingMessageId(messageId);

    try {
      // Call ElevenLabs TTS API via service
      const response = await ttsService.synthesize(text, voiceConfig.voiceId);

      if (!response.ok) {
        // Fallback to browser speech synthesis if API fails
        console.warn('ElevenLabs TTS failed, using browser fallback');
        setIsTTSLoading(null);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => setSpeakingMessageId(null);
        window.speechSynthesis.speak(utterance);
        return;
      }

      // Get audio blob and create URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeakingMessageId(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setSpeakingMessageId(null);
        setIsTTSLoading(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        // Fallback to browser synthesis
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = () => setSpeakingMessageId(null);
        window.speechSynthesis.speak(utterance);
      };

      setIsTTSLoading(null);
      await audio.play();

    } catch (error) {
      console.error('TTS error:', error);
      setIsTTSLoading(null);
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start editing a user message
  const startEditing = (messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditingText(text);
  };

  // Submit edited message
  const submitEdit = () => {
    if (editingMessageId && editingText.trim()) {
      if (onEditMessage) {
        onEditMessage(editingMessageId, editingText.trim());
      } else {
        // Fallback: just resend as new message
        onSend(editingText.trim());
      }
      setEditingMessageId(null);
      setEditingText("");
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('[ChatBox] File selected:', file?.name, file?.type, file?.size);
    if (file) {
      onFileUpload(file);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <main className="relative flex-grow bg-black/20 flex flex-col overflow-hidden z-10">


      <div className="flex-grow flex flex-col relative overflow-hidden bg-black/10">
        {/* CHAT VIEW */}
        <div className="absolute inset-0 flex flex-col overflow-y-auto custom-scrollbar" ref={scrollRef}>
          {/* Message count header - non-sticky so it scrolls with content */}
          {messages.length > 0 && (
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-gray-500" />
                <span className="text-xs text-gray-400 font-medium">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
              </div>
              <button onClick={handleToggleSearch} className={`transition-colors p-1 ${searchOpen ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`} title="Search messages">
                <Search size={14} />
              </button>
            </div>
          )}

          {/* Search Bar (slides open) */}
          {searchOpen && (
            <div className="flex-shrink-0 px-4 sm:px-6 py-2 border-b border-white/5 bg-[#0a0a0a]/60 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-3 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full bg-[#151515] border border-gray-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 text-gray-500 hover:text-gray-300 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <span className="text-[10px] text-gray-600 mt-1 block">{filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          {/* Pinned Messages Section */}
          {pinnedMessages.length > 0 && !searchOpen && (
            <div className="flex-shrink-0 px-4 sm:px-6 py-2 border-b border-amber-500/10 bg-amber-500/[0.02]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Pin size={11} className="text-amber-400" />
                <span className="text-[10px] text-amber-400/80 font-medium uppercase tracking-widest">Pinned</span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                {pinnedMessages.map(pm => (
                  <div key={pm.id} className="flex items-start gap-2 group/pin">
                    <span className="text-[10px] text-gray-500 shrink-0 mt-0.5">[{pm.timestamp}]</span>
                    <p className="text-[11px] text-gray-400 truncate flex-1">{pm.text.slice(0, 120)}{pm.text.length > 120 ? '...' : ''}</p>
                    <button onClick={() => handleTogglePin(pm.id)} className="opacity-0 group-hover/pin:opacity-100 text-gray-600 hover:text-amber-400 transition-all shrink-0">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col p-4 sm:p-6">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className={`group mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col ${msg.sender === 'YOU' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-baseline gap-3 mb-1 ${msg.sender === 'YOU' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className={`font-bold text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm ${msg.sender === 'YOU' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                    {msg.sender === 'AGENT' ? agentSettings.agentName : msg.sender}:
                  </span>
                  <span className="text-[9px] text-gray-700 select-none tabular-nums">[{msg.timestamp}]</span>
                </div>

                <div className={`max-w-[85%] sm:max-w-[75%] px-4 border-l ${msg.sender === 'YOU' ? 'border-l-0 border-r text-right border-emerald-500/20' : 'border-l border-cyan-500/20'} mb-2`}>
                  {/* Editing mode for user messages */}
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
                        className="w-full bg-black/40 border border-emerald-500/50 rounded px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={cancelEdit} className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1">
                          Cancel
                        </button>
                        <button onClick={submitEdit} className="text-[10px] text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                          Send
                        </button>
                      </div>
                    </div>
                  ) : msg.isImage ? (
                    <div className="relative group/img overflow-hidden rounded-lg border border-cyan-500/30 shadow-2xl">
                      <img src={msg.text} alt="Synth" className="max-w-full transition-transform duration-500 group-hover/img:scale-105" />
                    </div>
                  ) : msg.imagePreview ? (
                    // User uploaded image with preview
                    <div className="space-y-3">
                      <div className="relative group/img overflow-hidden rounded-lg border border-emerald-500/30 shadow-lg max-w-[300px]">
                        <img src={msg.imagePreview} alt="Uploaded" className="max-w-full transition-transform duration-300 group-hover/img:scale-105" />
                      </div>
                      <p className="text-sm text-gray-300">{msg.text.replace(/\[Uploaded Image:.*?\]\n\n/g, '')}</p>
                    </div>
                  ) : (
                    <div className="markdown-body text-[15px] leading-[1.7] text-gray-100 max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match && !String(children).includes('\n');
                            const codeString = String(children).replace(/\n$/, '');

                            if (isInline) {
                              return (
                                <code
                                  className="mx-0.5 px-[0.4em] py-[0.2em] rounded-md bg-[#1e1e2e] text-[#f38ba8] text-[0.9em] font-mono border border-[#313244]"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }

                            return (
                              <div className="my-4 rounded-xl overflow-hidden bg-[#0d0d0d] border border-[#262626] shadow-2xl">
                                {/* Professional Header Bar */}
                                <div className="flex items-center justify-between px-4 py-3 bg-[#161616] border-b border-[#262626]">
                                  <div className="flex items-center gap-3">
                                    {/* macOS-style dots */}
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
                                      <div className="w-3 h-3 rounded-full bg-[#febc2e]"></div>
                                      <div className="w-3 h-3 rounded-full bg-[#28c840]"></div>
                                    </div>
                                    {/* Language badge */}
                                    <div className="flex items-center gap-2 ml-2">
                                      <span className="text-xs font-medium text-gray-400 bg-[#262626] px-2.5 py-1 rounded-md">
                                        {match?.[1]?.toUpperCase() || 'CODE'}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Copy button */}
                                  <button
                                    onClick={() => handleCopy(msg.id + '-code-' + Math.random(), codeString)}
                                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-white/5"
                                  >
                                    <Copy size={14} />
                                    <span>Copy code</span>
                                  </button>
                                </div>
                                {/* Code content with line numbers */}
                                <SyntaxHighlighter
                                  style={oneDark}
                                  language={match?.[1] || 'text'}
                                  PreTag="div"
                                  showLineNumbers={true}
                                  lineNumberStyle={{
                                    minWidth: '3em',
                                    paddingRight: '1em',
                                    color: '#4a4a5a',
                                    textAlign: 'right',
                                    userSelect: 'none',
                                    borderRight: '1px solid #262626',
                                    marginRight: '1em',
                                  }}
                                  customStyle={{
                                    margin: 0,
                                    padding: '1.25rem',
                                    background: '#0d0d0d',
                                    fontSize: '13px',
                                    lineHeight: '1.6',
                                    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                                  }}
                                  codeTagProps={{
                                    style: {
                                      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                                    }
                                  }}
                                >
                                  {codeString}
                                </SyntaxHighlighter>
                              </div>
                            );
                          },
                          p({ children }) {
                            return <p className="mb-4 last:mb-0 text-gray-200">{children}</p>;
                          },
                          ul({ children }) {
                            return <ul className="my-4 ml-1 space-y-2">{children}</ul>;
                          },
                          ol({ children }) {
                            return <ol className="my-4 ml-1 space-y-2 list-decimal list-inside">{children}</ol>;
                          },
                          li({ children, className, node, ...props }) {
                            // Check if this is a task list item
                            const isTaskItem = node?.properties?.className?.includes('task-list-item');
                            const checkbox = node?.children?.[0];
                            const isChecked = checkbox?.properties?.checked;

                            if (isTaskItem) {
                              return (
                                <li className="flex items-start gap-3 text-gray-200 list-none">
                                  <span className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isChecked
                                    ? 'bg-emerald-500 border-emerald-400'
                                    : 'border-gray-600 bg-transparent'
                                    }`}>
                                    {isChecked && <Check size={10} className="text-white" />}
                                  </span>
                                  <span className={`flex-1 ${isChecked ? 'text-gray-500 line-through' : ''}`}>
                                    {children}
                                  </span>
                                </li>
                              );
                            }

                            return (
                              <li className="flex items-start gap-2 text-gray-200">
                                <span className="text-cyan-400 mt-1.5 text-xs">●</span>
                                <span className="flex-1">{children}</span>
                              </li>
                            );
                          },
                          // Image rendering with thumbnail preview - hover for actions
                          img({ src, alt }) {
                            const isGeneratedImage = alt === 'Generated Image';
                            return (
                              <div
                                className={`my-3 rounded-xl overflow-hidden border border-[#262626] shadow-lg group/imgbox ${isGeneratedImage ? 'max-w-[200px]' : 'max-w-full'
                                  }`}
                              >
                                <div className="relative">
                                  <img
                                    src={src}
                                    alt={alt || 'Image'}
                                    className={`w-full h-auto transition-all duration-200 ${isGeneratedImage ? 'aspect-square object-cover' : ''
                                      }`}
                                    loading="lazy"
                                  />
                                  {/* Overlay with action buttons on hover */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/imgbox:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); src && setLightboxImage(src); }}
                                      className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white"
                                      title="View full size"
                                    >
                                      <ExternalLink size={18} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); src && handleShareImage(src); }}
                                      className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white"
                                      title="Share"
                                    >
                                      <Share2 size={18} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); src && handleDownloadImage(src); }}
                                      className="p-2.5 bg-cyan-500/30 hover:bg-cyan-500/50 rounded-full transition-all text-white"
                                      title="Download"
                                    >
                                      <Download size={18} />
                                    </button>
                                  </div>
                                </div>
                                {isGeneratedImage && (
                                  <div className="px-2 py-1.5 bg-[#161616] border-t border-[#262626]">
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                      <ImageIcon size={10} />
                                      AI Generated
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          },
                          strong({ children }) {
                            return <strong className="font-semibold text-white">{children}</strong>;
                          },
                          em({ children }) {
                            return <em className="italic text-gray-300">{children}</em>;
                          },
                          h1({ children }) {
                            return (
                              <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0 pb-2 border-b border-gray-700/50">
                                {children}
                              </h1>
                            );
                          },
                          h2({ children }) {
                            return (
                              <h2 className="text-xl font-bold text-white mb-3 mt-6 first:mt-0 flex items-center gap-2">
                                <span className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-full"></span>
                                {children}
                              </h2>
                            );
                          },
                          h3({ children }) {
                            return (
                              <h3 className="text-lg font-semibold text-white mb-2 mt-5 first:mt-0">
                                {children}
                              </h3>
                            );
                          },
                          h4({ children }) {
                            return <h4 className="text-base font-semibold text-gray-200 mb-2 mt-4 first:mt-0">{children}</h4>;
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote className="my-4 pl-4 py-2 border-l-4 border-gradient-to-b from-cyan-500 to-purple-500 bg-gradient-to-r from-cyan-500/5 to-transparent rounded-r-lg">
                                <div className="text-gray-300 italic">{children}</div>
                              </blockquote>
                            );
                          },
                          a({ href, children }) {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/30 underline-offset-2 hover:decoration-cyan-400 transition-all"
                              >
                                {children}
                                <ExternalLink size={12} className="inline ml-1 opacity-50" />
                              </a>
                            );
                          },
                          table({ children }) {
                            return (
                              <div className="my-4 overflow-x-auto rounded-xl border border-[#262626] shadow-lg">
                                <table className="min-w-full divide-y divide-[#262626]">
                                  {children}
                                </table>
                              </div>
                            );
                          },
                          thead({ children }) {
                            return <thead className="bg-[#161616]">{children}</thead>;
                          },
                          tbody({ children }) {
                            return <tbody className="divide-y divide-[#262626] bg-[#0d0d0d]">{children}</tbody>;
                          },
                          tr({ children }) {
                            return <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>;
                          },
                          th({ children }) {
                            return (
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                {children}
                              </th>
                            );
                          },
                          td({ children }) {
                            return <td className="px-4 py-3 text-sm text-gray-300">{children}</td>;
                          },
                          hr() {
                            return <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />;
                          },
                          // Delete/strikethrough text
                          del({ children }) {
                            return <del className="text-gray-500 line-through">{children}</del>;
                          },
                          // Keyboard input
                          kbd({ children }) {
                            return (
                              <kbd className="px-2 py-0.5 text-xs font-mono bg-[#1e1e2e] border border-[#313244] rounded shadow-sm text-gray-300">
                                {children}
                              </kbd>
                            );
                          },
                          // Mark/highlight text
                          mark({ children }) {
                            return (
                              <mark className="bg-yellow-500/30 text-yellow-200 px-1 rounded">
                                {children}
                              </mark>
                            );
                          },
                          pre({ children }) {
                            return <>{children}</>;
                          },
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                      {/* Streaming cursor indicator */}
                      {msg.isStreaming && (
                        <span className="inline-block w-2 h-5 ml-1 bg-cyan-400 animate-pulse rounded-sm" />
                      )}
                    </div>
                  )}
                  {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {msg.groundingUrls.map((url, i) => (
                        <button key={i} onClick={() => mountPortal(url)} className="flex items-center gap-1.5 text-[9px] text-cyan-400 hover:text-white transition-all bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 hover:border-cyan-400 shadow-sm">
                          <Globe size={10} /> OPEN_PORTAL_{i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Action Buttons */}
                {editingMessageId !== msg.id && (
                  <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${msg.sender === 'YOU' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.sender === 'AGENT' ? (
                      <>
                        {/* Agent Message Actions: Thumbs Up, Thumbs Down, Copy, Refresh, Share, Speaker */}
                        <button
                          onClick={() => handleLike(msg.id)}
                          className={`p-1.5 rounded transition-all ${likedMessages.has(msg.id) ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                          title="Positive Feedback"
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          onClick={() => handleDislike(msg.id)}
                          className={`p-1.5 rounded transition-all ${dislikedMessages.has(msg.id) ? 'text-red-400 bg-red-500/10' : 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'}`}
                          title="Negative Feedback"
                        >
                          <ThumbsDown size={14} />
                        </button>
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className={`p-1.5 rounded transition-all ${copiedId === msg.id ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
                          title={copiedId === msg.id ? "Copied!" : "Copy Response"}
                        >
                          {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => onRegenerateResponse?.()}
                          className="p-1.5 text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-all"
                          title="Regenerate Response"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => handleShare(msg.text)}
                          className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                          title="Share Response"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          onClick={() => handleTogglePin(msg.id)}
                          className={`p-1.5 rounded transition-all ${pinnedMessageIds.has(msg.id) ? 'text-amber-400 bg-amber-500/10' : 'text-gray-600 hover:text-amber-400 hover:bg-amber-500/10'}`}
                          title={pinnedMessageIds.has(msg.id) ? "Unpin message" : "Pin message"}
                        >
                          <Pin size={14} />
                        </button>
                        <button
                          onClick={() => handleSpeak(msg.id, msg.text)}
                          disabled={isTTSLoading === msg.id}
                          className={`p-1.5 rounded transition-all ${isTTSLoading === msg.id
                            ? 'text-yellow-400 bg-yellow-500/10 cursor-wait'
                            : speakingMessageId === msg.id
                              ? 'text-cyan-400 bg-cyan-500/10 animate-pulse'
                              : 'text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10'
                            }`}
                          title={
                            isTTSLoading === msg.id
                              ? "Loading voice..."
                              : speakingMessageId === msg.id
                                ? "Stop Speaking"
                                : "Listen to Response"
                          }
                        >
                          {isTTSLoading === msg.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : speakingMessageId === msg.id ? (
                            <VolumeX size={14} />
                          ) : (
                            <Volume2 size={14} />
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        {/* User Message Actions: Copy, Edit */}
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className={`p-1.5 rounded transition-all ${copiedId === msg.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                          title={copiedId === msg.id ? "Copied!" : "Copy Message"}
                        >
                          {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => startEditing(msg.id, msg.text)}
                          className="p-1.5 text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                          title="Edit & Resend"
                        >
                          <Pencil size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            {/* Enhanced Thinking Indicator with Stop Button */}
            {isThinking && (
              <div className="flex items-center gap-4 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Sparkles size={16} className="text-cyan-400 animate-pulse" />
                      <div className="absolute inset-0 bg-cyan-400/20 blur-md animate-ping"></div>
                    </div>
                    <span className="text-cyan-400 text-xs font-medium">
                      {thinkingMessage}{'.'.repeat(thinkingDots)}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
                {onStopGeneration && (
                  <button
                    onClick={onStopGeneration}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 text-xs font-medium transition-all group"
                    title="Stop generation (Ctrl+Shift+S)"
                  >
                    <Square size={12} className="group-hover:scale-110 transition-transform" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Token Counter & Tools Bar */}
      <div className="relative z-40 border-t border-gray-800/30 bg-[#0a0a0a]/80 text-[11px]">
        <div
          ref={toolbarScrollRef}
          className={`flex items-center gap-3 px-4 py-2 overflow-x-auto scrollbar-hide transition-colors duration-700 ${toolbarScrollHint ? 'bg-gradient-to-r from-purple-500/5 via-cyan-500/8 to-purple-500/5' : ''}`}
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Export Button */}
          <button
            onClick={() => { setShowExportMenu(!showExportMenu); setShowKeyboardShortcuts(false); setShowPromptTemplates(false); setShowStats(false); setShowMemoryPanel(false); }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all whitespace-nowrap shrink-0 ${showExportMenu ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-500 hover:text-cyan-400 hover:bg-gray-800/50'}`}
            title="Export chat"
          >
            <FileDown size={14} />
            <span>Export</span>
          </button>

          {/* Shortcuts Button */}
          <button
            onClick={() => { setShowKeyboardShortcuts(!showKeyboardShortcuts); setShowExportMenu(false); setShowPromptTemplates(false); setShowStats(false); setShowMemoryPanel(false); }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all whitespace-nowrap shrink-0 ${showKeyboardShortcuts ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-500 hover:text-cyan-400 hover:bg-gray-800/50'}`}
            title="Keyboard shortcuts (Ctrl+/)"
          >
            <Keyboard size={14} />
            <span>Shortcuts</span>
          </button>

          {/* Templates Button */}
          <button
            onClick={() => { setShowPromptTemplates(!showPromptTemplates); setShowExportMenu(false); setShowKeyboardShortcuts(false); setShowStats(false); setShowMemoryPanel(false); }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all whitespace-nowrap shrink-0 ${showPromptTemplates ? 'text-purple-400 bg-purple-500/10' : 'text-gray-500 hover:text-purple-400 hover:bg-gray-800/50'}`}
            title="Prompt templates"
          >
            <Sparkles size={14} />
            <span>Templates</span>
          </button>

          {/* Stats Button */}
          <button
            onClick={() => { setShowStats(!showStats); setShowExportMenu(false); setShowKeyboardShortcuts(false); setShowPromptTemplates(false); setShowMemoryPanel(false); }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all whitespace-nowrap shrink-0 ${showStats ? 'text-green-400 bg-green-500/10' : 'text-gray-500 hover:text-green-400 hover:bg-gray-800/50'}`}
            title="Session statistics"
          >
            <BarChart3 size={14} />
            <span>Stats</span>
          </button>

          {/* Memory Button */}
          <button
            onClick={() => setDemoRestriction('Agent memory & personalization is not available in the demo version.')}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition-all whitespace-nowrap shrink-0 text-gray-500 hover:text-amber-400 hover:bg-gray-800/50"
            title="Agent memory & personalization"
          >
            <Brain size={14} />
            <span>Memory</span>
          </button>

          {/* Token limit bar */}
          <div
            className="relative flex items-center gap-3 cursor-pointer group shrink-0 min-w-[120px] sm:min-w-[200px] md:flex-1 md:max-w-md"
            onMouseEnter={() => setShowTokenInfo(true)}
            onMouseLeave={() => setShowTokenInfo(false)}
          >
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${tokenPercentage > 80 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                  tokenPercentage > 50 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                    'bg-gradient-to-r from-cyan-600 to-cyan-400'
                  }`}
                style={{ width: `${tokenPercentage}%` }}
              />
            </div>
            <span className={`font-mono whitespace-nowrap ${tokenPercentage > 80 ? 'text-red-400' :
              tokenPercentage > 50 ? 'text-yellow-400' :
                'text-gray-500'
              }`}>
              {totalTokens.toLocaleString()} tok
            </span>
            {showTokenInfo && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#111] border border-gray-800 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="text-gray-400 font-medium mb-2 flex items-center gap-2">
                  <Info size={12} className="text-cyan-500" />
                  Token Breakdown
                </div>
                <div className="space-y-1.5 text-gray-500">
                  <div className="flex justify-between">
                    <span>Conversation:</span>
                    <span className="text-gray-300 font-mono">{conversationTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current input:</span>
                    <span className="text-cyan-400 font-mono">{inputTokens.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-800 pt-1.5 mt-1.5 flex justify-between">
                    <span>Context limit:</span>
                    <span className="text-gray-300 font-mono">{contextLimit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage:</span>
                    <span className={`font-mono ${tokenPercentage > 80 ? 'text-red-400' :
                      tokenPercentage > 50 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>{tokenPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Request Timer */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded font-mono transition-all whitespace-nowrap shrink-0 ${isThinking ? 'text-orange-400 bg-orange-500/10' : lastRequestTime !== null ? 'text-green-400' : 'text-gray-600'
            }`} title={isThinking ? 'Request in progress...' : lastRequestTime !== null ? `Last request: ${lastRequestTime.toFixed(1)}s` : 'No requests yet'}>
            <Clock size={14} className={isThinking ? 'animate-spin' : ''} />
            <span className="tabular-nums">
              {isThinking ? `${requestTimer.toFixed(1)}s` : lastRequestTime !== null ? `${lastRequestTime.toFixed(1)}s` : '0.0s'}
            </span>
          </div>

          {/* File Upload */}
          <button
            onClick={() => setDemoRestriction('File upload is not available in the demo version.')}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition-all whitespace-nowrap shrink-0 text-gray-500 hover:text-emerald-400 hover:bg-gray-800/50"
            title="Upload file or image"
          >
            <Paperclip size={14} />
            <span>Upload</span>
          </button>

          {/* STT (Speech-to-Text) Mic */}
          <button
            onClick={onToggleSTT}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all whitespace-nowrap shrink-0 ${isRecordingSTT ? 'text-red-400 bg-red-500/10' : 'text-gray-500 hover:text-cyan-400 hover:bg-gray-800/50'}`}
            title="Voice input"
          >
            {isRecordingSTT ? <MicOff size={14} /> : <Mic size={14} />}
            <span>{isRecordingSTT ? 'Stop' : 'Mic'}</span>
          </button>

          {/* Voice to Voice Conversation */}
          <button
            onClick={() => setDemoRestriction('Live voice conversation is not available in the demo version.')}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition-all whitespace-nowrap shrink-0 text-gray-500 hover:text-purple-400 hover:bg-gray-800/50"
            title="Live conversation"
          >
            <Radio size={14} />
            <span>Live</span>
          </button>
        </div>
      </div>

      {/* Export Panel - Full Width Inline */}
      {showExportMenu && (
        <div className="relative z-40 border-t border-gray-800/30 bg-[#0a0a0a]/95 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="grid grid-cols-3 gap-3 p-4">
            <button onClick={() => exportChat('md')} className="flex flex-col items-center gap-2 p-4 bg-[#111] rounded-xl border border-gray-800/50 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group">
              <span className="text-2xl">📝</span>
              <span className="text-sm font-medium text-gray-400 group-hover:text-purple-300">Markdown</span>
              <span className="text-[10px] text-gray-600">.md format</span>
            </button>
            <button onClick={() => exportChat('json')} className="flex flex-col items-center gap-2 p-4 bg-[#111] rounded-xl border border-gray-800/50 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group">
              <span className="text-2xl">📊</span>
              <span className="text-sm font-medium text-gray-400 group-hover:text-cyan-300">JSON</span>
              <span className="text-[10px] text-gray-600">.json format</span>
            </button>
            <button onClick={() => exportChat('txt')} className="flex flex-col items-center gap-2 p-4 bg-[#111] rounded-xl border border-gray-800/50 hover:border-gray-500/30 hover:bg-gray-500/5 transition-all group">
              <span className="text-2xl">📄</span>
              <span className="text-sm font-medium text-gray-400 group-hover:text-gray-300">Plain Text</span>
              <span className="text-[10px] text-gray-600">.txt format</span>
            </button>
          </div>
        </div>
      )}

      {/* Shortcuts Panel - Full Width Inline */}
      {showKeyboardShortcuts && (
        <div className="relative z-40 border-t border-gray-800/30 bg-[#0a0a0a]/95 animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[280px] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-2 p-4">
            {[
              { keys: ['Ctrl', 'Enter'], action: 'Send message', icon: '⏎' },
              { keys: ['Ctrl', 'K'], action: 'Focus input', icon: '🔍' },
              { keys: ['Ctrl', 'Shift', 'S'], action: 'Stop generation', icon: '⏹' },
              { keys: ['Ctrl', '/'], action: 'Toggle shortcuts', icon: '⌨' },
              { keys: ['Escape'], action: 'Close panel / Cancel', icon: '✕' },
              { keys: ['Ctrl', 'Shift', 'E'], action: 'Export chat', icon: '📤' },
              { keys: ['↑'], action: 'Previous message', icon: '⬆' },
              { keys: ['↓'], action: 'Next message', icon: '⬇' },
            ].map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-[#111] rounded-xl border border-gray-800/50 hover:border-cyan-500/20 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{shortcut.icon}</span>
                  <span className="text-gray-400 text-xs">{shortcut.action}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {shortcut.keys.map((key, j) => (
                    <React.Fragment key={j}>
                      <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-300 font-mono min-w-[22px] text-center">
                        {key}
                      </kbd>
                      {j < shortcut.keys.length - 1 && <span className="text-gray-700 text-[10px]">+</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates Panel - Full Width Inline */}
      {showPromptTemplates && (
        <div className="relative z-40 border-t border-gray-800/30 bg-[#0a0a0a]/95 animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[320px] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
            {promptTemplates.map((t, i) => (
              <button
                key={i}
                onClick={() => applyTemplate(t.prompt)}
                className="flex flex-col items-center gap-1.5 p-3 bg-[#111] rounded-xl border border-gray-800/50 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group text-center"
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="text-xs font-medium text-gray-400 group-hover:text-purple-300">{t.label}</span>
                <span className="text-[9px] text-gray-600 truncate w-full">{t.prompt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Panel - Full Width Inline */}
      {showStats && (
        <div className="relative z-40 border-t border-gray-800/30 bg-[#0a0a0a]/95 animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[320px] overflow-y-auto custom-scrollbar">
          {/* Gauges Row */}
          <div className="grid grid-cols-3 gap-3 p-4">
            {/* Total Messages */}
            <div className="flex flex-col items-center p-4 bg-[#111] rounded-xl border border-gray-800/50 hover:border-cyan-500/20 transition-colors">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Messages</span>
              <span className="text-2xl font-mono font-bold text-cyan-400 tabular-nums">{sessionStats.totalMessages}</span>
              <div className="w-full mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(sessionStats.totalMessages / Math.max(sessionStats.totalMessages, 50) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Total Requests */}
            <div className="flex flex-col items-center p-4 bg-[#111] rounded-xl border border-gray-800/50 hover:border-purple-500/20 transition-colors">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Requests</span>
              <span className="text-2xl font-mono font-bold text-purple-400 tabular-nums">{sessionStats.totalRequests}</span>
              <div className="w-full mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(sessionStats.totalRequests / Math.max(sessionStats.totalRequests, 25) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Errors */}
            <div className="flex flex-col items-center p-4 bg-[#111] rounded-xl border border-gray-800/50 hover:border-green-500/20 transition-colors">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Errors</span>
              <span className={`text-2xl font-mono font-bold tabular-nums ${sessionStats.totalErrors > 0 ? 'text-red-400' : 'text-green-400'}`}>{sessionStats.totalErrors}</span>
              <div className="w-full mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${sessionStats.totalErrors > 0 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: sessionStats.totalErrors > 0 ? `${Math.min(sessionStats.totalErrors / 10 * 100, 100)}%` : '100%' }} />
              </div>
            </div>
          </div>

          {/* Counters Row */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Total Tokens</span>
              <span className="text-sm font-mono font-bold text-cyan-400 tabular-nums">{sessionStats.totalTokensUsed.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Avg/Req</span>
                <span className="text-sm font-mono font-bold text-purple-400 tabular-nums">
                  {sessionStats.totalRequests > 0 ? Math.round(sessionStats.totalTokensUsed / sessionStats.totalRequests).toLocaleString() : '0'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Session</span>
                <span className="text-sm font-mono font-bold text-green-400 tabular-nums flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Token Usage Log */}
          <div className="border-t border-gray-800/30 px-4 py-3 max-h-32 overflow-y-auto custom-scrollbar">
            {sessionStats.requestLog.length > 0 ? (
              <div className="space-y-1">
                {sessionStats.requestLog.slice().reverse().slice(0, 20).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-1 px-3 text-[11px] bg-[#111] rounded-lg hover:bg-gray-800/30 transition-colors">
                    <span className="text-gray-600 font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-500 font-mono">{entry.tokens} tok</span>
                      {entry.success ?
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> :
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      }
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-600 text-sm py-2">
                No requests yet — send a message to start tracking
              </div>
            )}
          </div>
        </div>
      )}

      {/* Memory Panel - Full Width Inline */}
      {showMemoryPanel && (
        <div className="relative z-40 border-t border-gray-800/30 bg-[#0a0a0a]/95 animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[480px] overflow-y-auto custom-scrollbar">
          {memoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-amber-400" />
              <span className="ml-2 text-gray-500 text-sm">Loading memory...</span>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Tab Switcher */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMemoryTab('intro')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${memoryTab === 'intro' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300 bg-gray-800/30 border border-transparent'}`}
                >
                  <User size={12} />
                  About Yourself
                </button>
                <button
                  onClick={() => setMemoryTab('agent')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${memoryTab === 'agent' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300 bg-gray-800/30 border border-transparent'}`}
                >
                  <Brain size={12} />
                  Agent Memory
                </button>
                <div className="flex-1" />
                <span className="text-[10px] text-gray-600 uppercase tracking-widest">Memory</span>
              </div>

              {/* Introduction / About Yourself Tab */}
              {memoryTab === 'intro' && (
                <div className="space-y-3">
                  {/* Personal Info Section */}
                  <div className="p-4 rounded-xl bg-[#111] border border-gray-800/40">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <User size={13} className="text-amber-400" />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-widest">Personal</span>
                      {memoryProfileSaved && (
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto flex items-center gap-1"><Check size={8} /> Saved</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Call me</label>
                        <input
                          type="text"
                          value={memoryProfile.name}
                          onChange={(e) => setMemoryProfile(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Your name or nickname"
                          className="w-full bg-[#0a0a0a] border border-gray-800/60 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all"
                        />
                      </div>
                      {/* Date of Birth - Calendar (18+ only) */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1"><Calendar size={9} /> Date of Birth <span className="text-gray-600 normal-case tracking-normal">(18+)</span></label>
                        <input
                          type="date"
                          value={memoryProfile.dateOfBirth}
                          max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0]; })()}
                          onChange={(e) => { setMemoryProfile(prev => ({ ...prev, dateOfBirth: e.target.value })); setDobError(''); }}
                          className={`w-full bg-[#0a0a0a] border rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all [color-scheme:dark] ${dobError ? 'border-red-500/60' : 'border-gray-800/60'}`}
                        />
                        {dobError && <p className="text-[10px] text-red-400 mt-0.5">{dobError}</p>}
                      </div>
                      {/* Gender - Custom Dropdown */}
                      <div className="space-y-1 relative">
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Gender</label>
                        <button
                          type="button"
                          onClick={() => { setOpenDropdown(openDropdown === 'gender' ? null : 'gender'); setDropdownSearch(''); }}
                          className={`w-full bg-[#0a0a0a] border rounded-lg px-3 py-2 text-xs text-left flex items-center justify-between transition-all cursor-pointer ${openDropdown === 'gender' ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-gray-800/60'}`}
                        >
                          <span className={memoryProfile.gender ? 'text-gray-200' : 'text-gray-600'}>{memoryProfile.gender || 'Select gender'}</span>
                          <ChevronDown size={12} className={`text-gray-500 transition-transform ${openDropdown === 'gender' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'gender' && (
                          <div className="mt-1 bg-[#0c0c0c] border border-gray-800/60 rounded-lg overflow-hidden shadow-xl shadow-black/40 z-50 relative">
                            <div className="max-h-[140px] overflow-y-auto custom-scrollbar">
                              {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(g => (
                                <button key={g} type="button" onClick={() => { setMemoryProfile(prev => ({ ...prev, gender: g })); setOpenDropdown(null); }}
                                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${memoryProfile.gender === g ? 'bg-amber-500/15 text-amber-400' : 'text-gray-300 hover:bg-gray-800/50'}`}
                                >{g}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Nationality - Custom Dropdown */}
                      <div className="space-y-1 relative">
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1"><MapPin size={9} /> Nationality</label>
                        <button
                          type="button"
                          onClick={() => { setOpenDropdown(openDropdown === 'nationality' ? null : 'nationality'); setDropdownSearch(''); }}
                          className={`w-full bg-[#0a0a0a] border rounded-lg px-3 py-2 text-xs text-left flex items-center justify-between transition-all cursor-pointer ${openDropdown === 'nationality' ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-gray-800/60'}`}
                        >
                          <span className={memoryProfile.nationality ? 'text-gray-200' : 'text-gray-600'}>{memoryProfile.nationality || 'Select country'}</span>
                          <ChevronDown size={12} className={`text-gray-500 transition-transform ${openDropdown === 'nationality' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'nationality' && (
                          <div className="mt-1 bg-[#0c0c0c] border border-gray-800/60 rounded-lg overflow-hidden shadow-xl shadow-black/40 z-50 relative">
                            <div className="sticky top-0 bg-[#0c0c0c] p-2 border-b border-gray-800/40">
                              <div className="flex items-center gap-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg px-2.5 py-1.5">
                                <Search size={11} className="text-gray-500 shrink-0" />
                                <input
                                  type="text" autoFocus
                                  value={dropdownSearch}
                                  onChange={(e) => setDropdownSearch(e.target.value)}
                                  placeholder="Search countries..."
                                  className="w-full bg-transparent text-xs text-gray-200 placeholder-gray-600 focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                              {['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe']
                                .filter(c => !dropdownSearch || c.toLowerCase().includes(dropdownSearch.toLowerCase()))
                                .map(c => (
                                  <button key={c} type="button" onClick={() => { setMemoryProfile(prev => ({ ...prev, nationality: c })); setOpenDropdown(null); setDropdownSearch(''); }}
                                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${memoryProfile.nationality === c ? 'bg-amber-500/15 text-amber-400' : 'text-gray-300 hover:bg-gray-800/50'}`}
                                  >{c}</button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Language - Custom Dropdown */}
                      <div className="space-y-1 relative sm:col-span-2">
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1"><Languages size={9} /> Language</label>
                        <button
                          type="button"
                          onClick={() => { setOpenDropdown(openDropdown === 'language' ? null : 'language'); setDropdownSearch(''); }}
                          className={`w-full bg-[#0a0a0a] border rounded-lg px-3 py-2 text-xs text-left flex items-center justify-between transition-all cursor-pointer ${openDropdown === 'language' ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-gray-800/60'}`}
                        >
                          <span className={memoryProfile.language ? 'text-gray-200' : 'text-gray-600'}>{memoryProfile.language || 'Select language'}</span>
                          <ChevronDown size={12} className={`text-gray-500 transition-transform ${openDropdown === 'language' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'language' && (
                          <div className="mt-1 bg-[#0c0c0c] border border-gray-800/60 rounded-lg overflow-hidden shadow-xl shadow-black/40 z-50 relative">
                            <div className="sticky top-0 bg-[#0c0c0c] p-2 border-b border-gray-800/40">
                              <div className="flex items-center gap-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg px-2.5 py-1.5">
                                <Search size={11} className="text-gray-500 shrink-0" />
                                <input
                                  type="text" autoFocus
                                  value={dropdownSearch}
                                  onChange={(e) => setDropdownSearch(e.target.value)}
                                  placeholder="Search languages..."
                                  className="w-full bg-transparent text-xs text-gray-200 placeholder-gray-600 focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                              {['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Arabic', 'Hindi', 'Bengali', 'Urdu', 'Turkish', 'Vietnamese', 'Thai', 'Indonesian', 'Malay', 'Filipino', 'Swahili', 'Dutch', 'Polish', 'Romanian', 'Greek', 'Czech', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Hungarian', 'Hebrew', 'Persian', 'Ukrainian', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Sinhala', 'Nepali', 'Burmese', 'Khmer', 'Lao', 'Amharic', 'Somali', 'Hausa', 'Yoruba', 'Igbo', 'Zulu', 'Afrikaans', 'Catalan', 'Basque', 'Welsh', 'Irish', 'Scottish Gaelic', 'Icelandic', 'Estonian', 'Latvian', 'Lithuanian', 'Slovak', 'Slovenian', 'Croatian', 'Serbian', 'Bosnian', 'Macedonian', 'Albanian', 'Georgian', 'Armenian', 'Azerbaijani', 'Kazakh', 'Uzbek', 'Mongolian', 'Tibetan', 'Pashto', 'Kurdish', 'Maltese', 'Luxembourgish', 'Latin', 'Esperanto']
                                .filter(l => !dropdownSearch || l.toLowerCase().includes(dropdownSearch.toLowerCase()))
                                .map(l => (
                                  <button key={l} type="button" onClick={() => { setMemoryProfile(prev => ({ ...prev, language: l })); setOpenDropdown(null); setDropdownSearch(''); }}
                                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${memoryProfile.language === l ? 'bg-amber-500/15 text-amber-400' : 'text-gray-300 hover:bg-gray-800/50'}`}
                                  >{l}</button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Professional Section */}
                  <div className="p-4 rounded-xl bg-[#111] border border-gray-800/40">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Briefcase size={13} className="text-purple-400" />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-widest">Professional</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Profession */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Profession</label>
                        <input
                          type="text"
                          value={memoryProfile.profession}
                          onChange={(e) => setMemoryProfile(prev => ({ ...prev, profession: e.target.value }))}
                          placeholder="e.g. Software Engineer"
                          className="w-full bg-[#0a0a0a] border border-gray-800/60 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all"
                        />
                      </div>
                      {/* Workplace */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Workplace</label>
                        <input
                          type="text"
                          value={memoryProfile.workplace}
                          onChange={(e) => setMemoryProfile(prev => ({ ...prev, workplace: e.target.value }))}
                          placeholder="Company or organization"
                          className="w-full bg-[#0a0a0a] border border-gray-800/60 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interests & Hobbies Section */}
                  <div className="p-4 rounded-xl bg-[#111] border border-gray-800/40">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Heart size={13} className="text-cyan-400" />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-widest">Interests & Hobbies</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Interests */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1"><Heart size={9} /> Interests</label>
                        <input
                          type="text"
                          value={memoryProfile.interests}
                          onChange={(e) => setMemoryProfile(prev => ({ ...prev, interests: e.target.value }))}
                          placeholder="e.g. AI, Music, Travel"
                          className="w-full bg-[#0a0a0a] border border-gray-800/60 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
                        />
                      </div>
                      {/* Hobbies */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1"><Gamepad2 size={9} /> Hobbies</label>
                        <input
                          type="text"
                          value={memoryProfile.hobbies}
                          onChange={(e) => setMemoryProfile(prev => ({ ...prev, hobbies: e.target.value }))}
                          placeholder="e.g. Reading, Gaming, Cooking"
                          className="w-full bg-[#0a0a0a] border border-gray-800/60 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save / Delete Actions */}
                  <div className="flex items-center gap-2 px-1">
                    <button
                      onClick={saveMemoryProfile}
                      disabled={memorySaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/30 hover:from-amber-500/30 hover:to-amber-600/20 hover:shadow-[0_0_12px_rgba(245,158,11,0.1)] transition-all disabled:opacity-50"
                    >
                      {memorySaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save Profile
                    </button>
                    <button
                      onClick={deleteMemoryProfile}
                      disabled={memorySaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Reset All
                    </button>
                  </div>
                </div>
              )}

              {/* Agent Memory Tab */}
              {memoryTab === 'agent' && (
                <div className="space-y-3">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#111] border border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <Brain size={14} className="text-amber-400" />
                      <span className="text-xs font-medium text-gray-300">Agent Memory</span>
                      <span className="text-[9px] text-gray-600">({agentMemories.length} memories)</span>
                    </div>
                    <button
                      onClick={() => toggleMemoryEnabled(!memoryEnabled)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${memoryEnabled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800/50 text-gray-500 border border-gray-700/30'}`}
                    >
                      {memoryEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {memoryEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Memories List */}
                  <div className="rounded-xl bg-[#111] border border-gray-800/50 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {agentMemories.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {agentMemories.slice().reverse().map((mem, i) => (
                          <div key={mem.id || i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-800/30 transition-colors group">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${mem.type === 'user_fact' ? 'bg-cyan-500' :
                              mem.type === 'user_preference' ? 'bg-purple-500' :
                                mem.type === 'correction' ? 'bg-orange-500' :
                                  mem.type === 'emotional_cue' ? 'bg-pink-500' :
                                    'bg-gray-500'
                              }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-gray-300 leading-relaxed break-words">{mem.content}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-gray-600 uppercase tracking-wider">{mem.type?.replace(/_/g, ' ')}</span>
                                {mem.createdAt && (
                                  <span className="text-[9px] text-gray-700">{new Date(mem.createdAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Brain size={24} className="mx-auto text-gray-700 mb-2" />
                        <p className="text-xs text-gray-600">No memories yet</p>
                        <p className="text-[10px] text-gray-700 mt-1">Chat with the agent to build memory</p>
                      </div>
                    )}
                  </div>

                  {/* Clear Memories */}
                  {agentMemories.length > 0 && (
                    <div className="flex justify-end">
                      <button
                        onClick={clearAgentMemories}
                        disabled={memorySaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                      >
                        <Trash2 size={11} />
                        Clear All Memories
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Universal Input Bar - Gaming Style */}
      <div className="relative z-40 px-3 py-2 border-t border-gray-800/50 bg-[#0a0a0a]/90 backdrop-blur-xl flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept="image/*,video/*,.pdf,.doc,.docx,.js,.ts,.py,.html,.css,.json,.txt,.md,.csv,.xml,.yaml,.yml"
          className="hidden"
        />

        {/* Search Mode Dropdown */}
        <div className="relative" ref={providerDropdownRef}>
          <button
            onClick={() => setShowProviderDropdown(!showProviderDropdown)}
            className="flex items-center gap-2 px-3 py-2.5 bg-[#151515] border border-gray-800 rounded-lg hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] transition-all duration-300 text-sm"
            title="Select mode"
          >
            <span className="text-lg">
              {agentSettings.activeTool === 'web_search' ? '🔍' :
                agentSettings.activeTool === 'deep_research' ? '🔭' :
                  agentSettings.activeTool === 'image_gen' ? '🎨' :
                    agentSettings.activeTool === 'thinking' ? '💡' : '💬'}
            </span>
            <span className="hidden sm:inline text-gray-400 text-xs max-w-[80px] truncate">
              {agentSettings.activeTool === 'web_search' ? 'Web Search' :
                agentSettings.activeTool === 'deep_research' ? 'Deep Research' :
                  agentSettings.activeTool === 'image_gen' ? 'Create Image' :
                    agentSettings.activeTool === 'thinking' ? 'Thinking' : 'Chat'}
            </span>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Mode Dropdown Menu */}
          {showProviderDropdown && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#111] border border-gray-800/80 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5),0_0_15px_rgba(168,85,247,0.1)] overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-2 border-b border-gray-800/50 bg-gradient-to-r from-purple-500/5 to-transparent">
                <span className="text-[10px] text-gray-500 px-2">Select Mode</span>
              </div>
              <div className="p-1">
                {[
                  { id: 'none', icon: '💬', label: 'Chat', desc: 'Normal conversation', color: 'cyan' },
                  { id: 'web_search', icon: '🔍', label: 'Web Search', desc: 'Search the internet', color: 'blue' },
                  { id: 'deep_research', icon: '🔭', label: 'Deep Research', desc: 'In-depth analysis', color: 'purple' },
                  { id: 'thinking', icon: '💡', label: 'Thinking', desc: 'Step-by-step reasoning', color: 'yellow' },
                  { id: 'image_gen', icon: '🎨', label: 'Create Image', desc: 'Generate images with AI', color: 'pink' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      onUpdateSettings({ ...agentSettings, activeTool: mode.id });
                      setShowProviderDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${agentSettings.activeTool === mode.id
                      ? 'bg-gradient-to-r from-purple-500/15 to-cyan-500/10 text-purple-300 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                      }`}
                  >
                    <span className="text-lg">{mode.icon}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium">{mode.label}</div>
                      <div className="text-[10px] text-gray-500">{mode.desc}</div>
                    </div>
                    {agentSettings.activeTool === mode.id && (
                      <Check size={14} className="ml-auto text-purple-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* typer / input field container */}
        <div className="flex-grow relative group">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              // Auto-resize: reset height then set to scrollHeight, capped at 10 lines (~240px)
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 240) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            className={`w-full bg-[#151515] border border-gray-800 rounded-lg px-4 py-2 pr-12 text-gray-200 placeholder:text-gray-600 text-sm focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-colors duration-300 resize-none overflow-y-auto custom-scrollbar ${isRecordingSTT ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}`}
            style={{ minHeight: '38px', maxHeight: '240px' }}
            placeholder={
              isRecordingSTT ? "Listening..." :
                isThinking ? "AI is generating..." :
                  "Type a message... (Shift+Enter for new line)"
            }
            disabled={isThinking}
          />

          {/* Send or Stop Button Inside Input */}
          {isThinking ? (
            <button
              onClick={onStopGeneration}
              className="absolute right-3 bottom-3 text-red-500 hover:text-red-400 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-300 p-1"
              title="Stop generation (Ctrl+Shift+S)"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="absolute right-3 bottom-3 text-cyan-500 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] disabled:text-gray-700 transition-all duration-300 p-1"
              title="Send message (Ctrl+Enter)"
            >
              <Send size={18} className={!inputText.trim() ? "" : "glow-green"} />
            </button>
          )}

          {isRecordingSTT && (
            <div className="absolute right-12 bottom-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            </div>
          )}
        </div>


      </div>

      {/* Voice Call Modal */}
      <VoiceCallModal
        isOpen={showVoiceCall}
        onClose={() => setShowVoiceCall(false)}
        agentId={agentSettings.agentId}
        agentName={agentSettings.agentName || 'AI Assistant'}
        systemPrompt={agentSettings.customPrompt}
      />

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              title="Close"
            >
              <X size={28} />
            </button>

            {/* Image */}
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl border border-white/10"
            />

            {/* Action buttons */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4">
              {/* Share button */}
              <button
                onClick={() => handleShareImage(lightboxImage)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/20 hover:border-white/40"
                title="Share"
              >
                <Share2 size={18} />
                <span className="text-sm font-medium">Share</span>
              </button>

              {/* Download button */}
              <button
                onClick={() => handleDownloadImage(lightboxImage)}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full transition-all border border-cyan-500/30 hover:border-cyan-500/50"
                title="Download"
              >
                <Download size={18} />
                <span className="text-sm font-medium">Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Demo Restriction Modal */}
      {demoRestriction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDemoRestriction(null)}>
          <div className="relative mx-4 max-w-md w-full bg-[#111] border border-gray-700/50 rounded-2xl shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDemoRestriction(null)} className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
            <div className="text-4xl mb-4">🚫</div>
            <h3 className="text-lg font-semibold text-white mb-2">{demoRestriction}</h3>
            <p className="text-gray-400 text-sm mb-5">Visit <a href="https://www.maula.ai" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-medium">www.maula.ai</a> and sign up for full access to all AI features including live voice, file uploads, agent memory, and more.</p>
            <div className="flex gap-3 justify-center">
              <a href="https://www.maula.ai" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all text-sm">Sign Up Free</a>
              <button onClick={() => setDemoRestriction(null)} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-all text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ChatBox;
