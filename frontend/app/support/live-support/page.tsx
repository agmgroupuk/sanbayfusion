'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Send, MessageCircle, HelpCircle, Mail, Phone,
  Copy, Loader, AlertCircle, CheckCircle, Clock, Moon, Sparkles,
  LogIn, Ticket, User, ChevronRight, Headphones, Bot, ArrowLeft,
  PanelRightOpen, PanelRightClose, X
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: Array<{
    type: string;
    ticketId?: string;
    ticketNumber?: number;
    subject?: string;
  }>;
}

interface UserContextData {
  userId: string;
  email: string;
  name: string;
  plan?: string;
  subscriptionStatus?: string;
  subscriptionEnd?: string;
  totalTransactions?: number;
  openTickets?: number;
  accountAge?: string;
}

// ═══════════════════════════════════════════════════════════════════
// LUNA AVATAR COMPONENT
// ═══════════════════════════════════════════════════════════════════

const LunaAvatar = ({ 
  size = 'md', 
  isTyping = false, 
  mood = 'happy' 
}: { 
  size?: 'sm' | 'md' | 'lg', 
  isTyping?: boolean, 
  mood?: 'happy' | 'thinking' | 'concerned' 
}) => {
  const sizeClasses = { sm: 'w-9 h-9', md: 'w-11 h-11', lg: 'w-16 h-16' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-8 h-8' };
  const moodGradients = {
    happy: 'from-violet-500 via-purple-500 to-fuchsia-500',
    thinking: 'from-cyan-400 via-blue-500 to-indigo-500',
    concerned: 'from-amber-400 via-orange-400 to-rose-400'
  };

  return (
    <div className="relative flex-shrink-0 group">
      <div className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${moodGradients[mood]} p-[2px] ${isTyping ? 'animate-pulse' : ''} transition-all duration-300 group-hover:scale-105`}>
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-transparent to-fuchsia-500/10" />
          <Moon className={`${iconSizes[size]} text-amber-200 relative z-10`} />
        </div>
      </div>
      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isTyping ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
      {isTyping && <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-400 animate-ping" />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════════

const LunaTypingIndicator = () => {
  const [dots, setDots] = useState(1);
  const typingMsgs = ["Luna is thinking...", "Crafting response...", "Almost there...", "Analyzing..."];
  const [message, setMessage] = useState(typingMsgs[0]);

  useEffect(() => {
    const dotInterval = setInterval(() => setDots(d => d >= 3 ? 1 : d + 1), 400);
    const messageInterval = setInterval(() => setMessage(typingMsgs[Math.floor(Math.random() * typingMsgs.length)]), 2500);
    return () => { clearInterval(dotInterval); clearInterval(messageInterval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-start gap-3">
      <LunaAvatar size="sm" isTyping={true} mood="thinking" />
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-700/50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  dots >= n ? 'bg-violet-400 scale-100' : 'bg-slate-600 scale-75'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-400 italic">{message}</span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// GET TIME-BASED GREETING
// ═══════════════════════════════════════════════════════════════════

const getTimeBasedGreeting = (userName: string) => {
  const hour = new Date().getHours();
  const name = userName || 'there';

  if (hour >= 5 && hour < 12) return `Good morning, ${name}! ☀️ I'm Luna, your AI support assistant. I have access to your account details, subscription info, and support history to help you better. How can I assist you today?`;
  if (hour >= 12 && hour < 17) return `Hey ${name}! 🌸 I'm Luna, your personal AI assistant. I can see your account, billing history, and any open tickets. What brings you by today?`;
  if (hour >= 17 && hour < 21) return `Good evening, ${name}! 🌙 Luna here, ready to help. I have your full account context loaded up. What can I do for you?`;
  return `Hey ${name}! ✨ Burning the midnight oil? I'm Luna, your 24/7 support assistant. I've got all your account info at my fingertips. What do you need help with?`;
};

// ═══════════════════════════════════════════════════════════════════
// QUICK ACTIONS COMPONENT
// ═══════════════════════════════════════════════════════════════════

const QUICK_ACTIONS = [
  { label: 'Billing Issue', prompt: "I have a question about my billing or subscription" },
  { label: 'Technical Help', prompt: "I'm having a technical issue with the platform" },
  { label: 'Account Help', prompt: "I need help with my account settings" },
  { label: 'Refund Request', prompt: "I'd like to request a refund" },
];

// ═══════════════════════════════════════════════════════════════════
// SUPPORT OPTIONS
// ═══════════════════════════════════════════════════════════════════

const SUPPORT_OPTIONS = [
  { icon: MessageCircle, label: 'Create Ticket', href: '/support/create-ticket', color: 'from-violet-500 to-purple-600' },
  { icon: HelpCircle, label: 'FAQs', href: '/support/faqs', color: 'from-cyan-500 to-blue-600' },
  { icon: Phone, label: 'Book Call', href: '/support/book-consultation', color: 'from-emerald-500 to-teal-600' },
  { icon: Mail, label: 'Email Us', href: '/support/contact-us', color: 'from-rose-500 to-pink-600' }
];

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function LiveSupportPage() {
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth
  const { state: authState } = useAuth();
  const user = authState?.user;
  const isAuthenticated = authState?.isAuthenticated;

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lunaMood, setLunaMood] = useState<'happy' | 'thinking' | 'concerned'>('happy');
  const [createdTickets, setCreatedTickets] = useState<Array<{ ticketId: string; subject: string }>>([]);
  const [userContext, setUserContext] = useState<UserContextData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // ─── Scroll to bottom ───────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ─── Fetch user context ─────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const fetchUserContext = async () => {
      try {
        // Fetch subscription data from existing endpoint
        const subRes = await fetch('/api/subscriptions');
        const subData = subRes.ok ? await subRes.json() : null;
        
        // Get subscription from response
        const activeSubscription = subData?.subscriptions?.find((s: { status: string }) => s.status === 'active') || 
                                   subData?.subscription || null;

        // Fetch open tickets count
        let openTicketsCount = 0;
        try {
          const ticketsRes = await fetch('/api/support/tickets');
          const ticketsData = await ticketsRes.json();
          openTicketsCount = ticketsData?.tickets?.filter((t: { status: string }) => t.status === 'open')?.length || 0;
        } catch { /* ignore */ }

        setUserContext({
          userId: user.id,
          email: user.email || '',
          name: user.name || '',
          plan: activeSubscription?.planId || activeSubscription?.plan || 'free',
          subscriptionStatus: activeSubscription?.status || 'inactive',
          subscriptionEnd: activeSubscription?.endDate || activeSubscription?.currentPeriodEnd,
          totalTransactions: 0,
          openTickets: openTicketsCount,
          accountAge: 'Unknown'
        });
      } catch {
        // Fallback context
        setUserContext({
          userId: user.id,
          email: user.email || '',
          name: user.name || '',
        });
      }
    };

    fetchUserContext();
  }, [user?.id, user?.email, user?.name]);

  // ─── Fetch session from REST API ───────────────────
  useEffect(() => {
    if (!user?.id || !userContext) return;
    
    // Mark as connected since we're using REST API (no websocket needed)
    setIsConnected(true);
    
    // Fetch existing session from backend
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/live-support/session/${user.id}`);
        const data = await res.json();
        
        if (data.success && data.sessionId) {
          setSessionId(data.sessionId);
          
          // Restore previous messages if they exist
          if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
            const restored = data.messages.map((msg: { role: string; content: string }, i: number) => ({
              id: `restored-${i}`,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(),
            }));
            setMessages(prev => {
              // Don't duplicate if greeting already added
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = restored.filter((m: Message) => !existingIds.has(m.id));
              return [...prev, ...newMsgs];
            });
            setConversationHistory(data.messages);
          }
        }
      } catch (err) {
        console.error('[session fetch]', err);
      }
    };

    fetchSession();
  }, [user?.id, userContext]);

  // ─── Initialize greeting ────────────────────────────
  useEffect(() => {
    if (!user?.name && !isAuthenticated) return;
    const greeting = getTimeBasedGreeting(user?.name || '');
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: greeting,
      timestamp: new Date()
    }]);
  }, [user?.name, isAuthenticated]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ─── Copy message ───────────────────────────────────
  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Send message ───────────────────────────────────
  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || inputValue.trim();
    if (!messageToSend || isLoading || !userContext) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);
    setLunaMood('thinking');
    setError(null);

    // Update conversation history
    const updatedHistory = [...conversationHistory, { role: 'user', content: messageToSend }];
    setConversationHistory(updatedHistory);

    try {
      // Call the agent-chat endpoint with full user context and sessionId
      const response = await fetch('/api/live-support/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          conversationHistory: updatedHistory,
          userContext,
          sessionId, // Send sessionId for persistence
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Store the sessionId returned from backend
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.actions,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setConversationHistory(prev => [...prev, { role: 'assistant', content: data.response }]);

      // Handle ticket creation
      if (data.actions?.length > 0) {
        data.actions.forEach((action: { type: string; ticketId?: string; subject?: string }) => {
          if (action.type === 'ticket_created' && action.ticketId) {
            setCreatedTickets(prev => [...prev, { ticketId: action.ticketId!, subject: action.subject || 'Support Ticket' }]);
          }
        });
      }

      setLunaMood('happy');
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errMessage);
      setLunaMood('concerned');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // ─── Handle key press ───────────────────────────────
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // LOGIN GATE
  // ═══════════════════════════════════════════════════════════════════

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative max-w-md w-full">
          {/* Glass card */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl">
            {/* Luna Avatar */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-[3px]">
                  <div className="w-full h-full rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                    <Moon className="w-12 h-12 text-amber-200" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-4 border-slate-900" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">
              Chat with Luna
            </h1>
            <p className="text-slate-400 text-center mb-8">
              Log in to connect with Luna and get personalized support with full access to your account details.
            </p>

            <Link
              href="/auth/login?redirect=/support/live-support"
              className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-2xl text-white font-semibold transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]"
            >
              <LogIn className="w-5 h-5" />
              Log In to Continue
            </Link>

            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 text-center mb-4">Or explore other support options:</p>
              <div className="grid grid-cols-2 gap-3">
                {SUPPORT_OPTIONS.map((option, i) => (
                  <Link
                    key={i}
                    href={option.href}
                    className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all text-sm text-slate-400 hover:text-white"
                  >
                    <option.icon className="w-4 h-4 text-violet-400" />
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN CHAT UI
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6 h-screen flex flex-col">
        {/* Main Layout - Chat + Separate Panel */}
        <div className="flex-1 flex gap-4 min-h-0">
          
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* CHAT BOX - Separate Card */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 flex flex-col overflow-hidden shadow-2xl">
            {/* Chat Header with Panel Toggle */}
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Left: Back button + Luna info */}
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                  <Link 
                    href="/support" 
                    className="flex-shrink-0 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                    title="Back to Support"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <LunaAvatar size="md" mood={lunaMood} isTyping={isTyping} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold text-white">Luna</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-violet-500 to-purple-500 text-white">AI SUPPORT</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 truncate">
                      <Bot className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{isTyping ? 'Typing...' : 'Online 24/7 · Knows your account'}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Status + Panel Toggle */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </div>
                  {/* Mobile: Small status dot */}
                  <div className={`sm:hidden w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                  
                  {/* Panel Toggle Button */}
                  <button
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className={`p-2.5 rounded-xl transition-all ${isPanelOpen ? 'bg-violet-500/20 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                    title={isPanelOpen ? 'Close panel' : 'Open panel'}
                  >
                    {isPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Messages */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {/* Quick Actions - only show if no user messages yet */}
                  {messages.length <= 1 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-3">Quick actions:</p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_ACTIONS.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => handleSend(action.prompt)}
                            className="px-3 sm:px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-violet-500/30 rounded-xl text-xs sm:text-sm text-slate-300 hover:text-white transition-all duration-300"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fadeIn`}
                    >
                      {msg.role === 'assistant' && <LunaAvatar size="sm" mood={lunaMood} />}
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                        </div>
                      )}

                      <div className={`relative max-w-[85%] sm:max-w-[80%] group ${msg.role === 'user' ? '' : ''}`}>
                        <div className={`p-3 sm:p-4 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-violet-600 to-purple-700 rounded-tr-sm shadow-lg shadow-violet-500/10'
                            : 'bg-slate-800/80 border border-slate-700/50 rounded-tl-sm'
                        }`}>
                          <p className="text-xs sm:text-sm text-white leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                          {/* Ticket action */}
                          {msg.actions?.map((action, i) => (
                            action.type === 'ticket_created' && (
                              <div key={i} className="mt-3 p-2 sm:p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                                  <Ticket className="w-4 h-4" />
                                  Ticket Created: {action.ticketId}
                                </div>
                              </div>
                            )
                          ))}
                        </div>

                      {/* Timestamp & Actions */}
                      <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-slate-500">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-all"
                        >
                          {copiedId === msg.id ? (
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && <LunaTypingIndicator />}

                {error && (
                  <div className="flex items-center gap-2 p-3 sm:p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

              {/* Input */}
              <div className="flex-shrink-0 p-3 sm:p-5 border-t border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message to Luna..."
                      className="w-full px-3 sm:px-5 py-3 sm:py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || !inputValue.trim()}
                    className="p-3 sm:p-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl sm:rounded-2xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 disabled:hover:scale-100"
                  >
                    {isLoading ? <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center hidden sm:block">
                  Luna has access to your account info for personalized support · Press Enter to send
                </p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SEPARATE PANEL CARD - Right Side (NOT attached to chat) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          
          {/* Mobile Overlay Backdrop */}
          {isPanelOpen && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setIsPanelOpen(false)}
            />
          )}

          {/* Panel - Separate Card on Desktop, Overlay on Mobile */}
          {isPanelOpen && (
            <div className="fixed lg:static inset-y-0 right-0 lg:inset-auto w-full sm:w-80 lg:w-80 lg:flex-shrink-0 z-50 lg:z-auto flex flex-col pt-6 pb-6 lg:pt-0 lg:pb-0">
              <div className="h-full bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col overflow-hidden mx-4 lg:mx-0">
                {/* Panel Header */}
                <div className="flex-shrink-0 p-4 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Account & Support</h3>
                  <button
                    onClick={() => setIsPanelOpen(false)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                    title="Close panel"
                    aria-label="Close panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

              {/* Panel Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* User Context Card */}
                {userContext && (
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-violet-400" />
                      Your Account
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                        <span className="text-slate-400">Name</span>
                        <span className="text-white font-medium">{userContext.name || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                        <span className="text-slate-400">Plan</span>
                        <span className="text-violet-400 font-medium capitalize">{userContext.plan || 'Free'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                        <span className="text-slate-400">Status</span>
                        <span className={`font-medium ${userContext.subscriptionStatus === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {userContext.subscriptionStatus || 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-400">Open Tickets</span>
                        <span className="text-white font-medium">{userContext.openTickets || 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Created Tickets */}
                {createdTickets.length > 0 && (
                  <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-emerald-400" />
                      New Tickets
                    </h3>
                    <div className="space-y-2">
                      {createdTickets.map((t, i) => (
                        <div key={i} className="p-2.5 bg-slate-900/30 rounded-xl border border-emerald-500/10">
                          <p className="text-xs text-emerald-400 font-mono">{t.ticketId}</p>
                          <p className="text-xs text-slate-400 mt-1 truncate">{t.subject}</p>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/dashboard/support-tickets"
                      className="mt-3 flex items-center justify-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      View all tickets <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {/* Support Options */}
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-cyan-400" />
                    Other Support
                  </h3>
                  <div className="space-y-2">
                    {SUPPORT_OPTIONS.map((option, i) => (
                      <Link
                        key={i}
                        href={option.href}
                        className="flex items-center gap-3 p-2.5 bg-slate-800/30 hover:bg-slate-700/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-all group"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center`}>
                          <option.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-slate-400 group-hover:text-white transition-colors">{option.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Response Times */}
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Response Times
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Luna AI</span>
                      <span className="text-emerald-400 font-medium">Instant</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Support Tickets</span>
                      <span className="text-cyan-400 font-medium">~2 hours</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Consultations</span>
                      <span className="text-violet-400 font-medium">Scheduled</span>
                    </div>
                  </div>
                </div>

                {/* Luna Tip */}
                <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-2xl border border-violet-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">💡</div>
                    <div>
                      <h4 className="font-semibold text-white text-sm mb-1">Pro Tip</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Luna can create support tickets, check your billing, and answer questions about your account instantly!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Custom CSS for animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
