'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Settings,
  Plus,
  MessageSquare,
  Bot,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Share2,
  MoreHorizontal,
  Sparkles,
  Zap,
  Clock,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Code2,
  ImageIcon,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// Helper function to extract text content from React children
// This fixes the [object Object] issue when copying code blocks
const extractTextFromChildren = (children: React.ReactNode): string => {
  if (typeof children === 'string') {
    return children;
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    const element = children as React.ReactElement;
    return extractTextFromChildren(element.props?.children);
  }
  return '';
};

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: Attachment[];
  feedback?: 'up' | 'down' | null;
}

interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'code';
  url?: string;
  content?: string;
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  agentId: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  systemPrompt: string;
  welcomeMessage: string;
  model?: string;
  provider?: string;
  color?: string;
  capabilities?: string[];
}

interface ShadcnAgentChatProps {
  agent: AgentConfig;
  className?: string;
  onClose?: () => void;
}

// Message Bubble Component
const MessageBubble = React.memo(
  ({
    message,
    agent,
    onCopy,
    onFeedback,
    onListen,
    onShare,
    copiedId,
  }: {
    message: Message;
    agent: AgentConfig;
    onCopy: (id: string, content: string) => void;
    onFeedback: (id: string, type: 'up' | 'down') => void;
    onListen: (content: string) => void;
    onShare: (content: string) => void;
    copiedId: string | null;
  }) => {
    const isUser = message.role === 'user';
    const isStreaming = message.isStreaming;

    return (
      <div
        className={cn(
          'group flex gap-3 px-4 py-3 transition-colors',
          isUser ? 'flex-row-reverse' : 'flex-row',
          !isUser && 'hover:bg-muted/50'
        )}
      >
        {/* Avatar */}
        <Avatar
          className={cn('h-8 w-8 shrink-0', isUser && 'ring-2 ring-primary/20')}
        >
          {isUser ? (
            <>
              <AvatarImage src="/user-avatar.png" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </>
          ) : (
            <>
              <AvatarImage src={agent.avatar} />
              <AvatarFallback
                className="text-xs"
                style={{ backgroundColor: agent.color || '#6366f1' }}
              >
                <Bot className="h-4 w-4 text-white" />
              </AvatarFallback>
            </>
          )}
        </Avatar>

        {/* Message Content */}
        <div
          className={cn(
            'flex flex-col gap-1 max-w-[80%]',
            isUser && 'items-end'
          )}
        >
          {/* Name & Time */}
          <div
            className={cn(
              'flex items-center gap-2 text-xs text-muted-foreground',
              isUser && 'flex-row-reverse'
            )}
          >
            <span className="font-medium">{isUser ? 'You' : agent.name}</span>
            <span>•</span>
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {isStreaming && (
              <Badge
                variant="secondary"
                className="animate-pulse text-[10px] px-1.5 py-0"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Thinking...
              </Badge>
            )}
          </div>

          {/* Content Bubble */}
          <Card
            className={cn(
              'overflow-hidden',
              isUser
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border'
            )}
          >
            <CardContent className="p-3">
              {isStreaming && !message.content ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    'prose prose-sm max-w-none',
                    isUser && 'prose-invert'
                  )}
                >
                  <ReactMarkdown
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;
                        return !isInline ? (
                          <div className="relative group/code my-2">
                            <div className="flex items-center justify-between bg-zinc-900 px-3 py-1.5 rounded-t-lg border-b border-zinc-700">
                              <span className="text-xs text-zinc-400">
                                {match?.[1] || 'code'}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
                                onClick={() =>
                                  onCopy(message.id + '-code', extractTextFromChildren(children))
                                }
                              >
                                {copiedId === message.id + '-code' ? (
                                  <Check className="h-3 w-3 mr-1" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                Copy
                              </Button>
                            </div>
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match?.[1] || 'text'}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                borderTopLeftRadius: 0,
                                borderTopRightRadius: 0,
                              }}
                            >
                              {extractTextFromChildren(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code
                            className="bg-muted px-1.5 py-0.5 rounded text-sm"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {message.attachments.map((att) => (
                <Badge key={att.id} variant="outline" className="gap-1">
                  {att.type === 'image' && <ImageIcon className="h-3 w-3" />}
                  {att.type === 'file' && <FileText className="h-3 w-3" />}
                  {att.type === 'code' && <Code2 className="h-3 w-3" />}
                  {att.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions (only for assistant messages) */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onCopy(message.id, message.content)}
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7',
                        message.feedback === 'up' && 'text-green-500'
                      )}
                      onClick={() => onFeedback(message.id, 'up')}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Good response</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7',
                        message.feedback === 'down' && 'text-red-500'
                      )}
                      onClick={() => onFeedback(message.id, 'down')}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bad response</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onListen(message.content)}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Listen</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onShare(message.content)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    );
  }
);

MessageBubble.displayName = 'MessageBubble';

// Session Item Component
const SessionItem = React.memo(
  ({
    session,
    isActive,
    onClick,
    onDelete,
    onExport,
  }: {
    session: ChatSession;
    isActive: boolean;
    onClick: () => void;
    onDelete: () => void;
    onExport: () => void;
  }) => (
    <div
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
        isActive
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'hover:bg-muted'
      )}
      onClick={onClick}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{session.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {session.messages.length} messages •{' '}
          {new Date(session.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onExport();
          }}
        >
          <Download className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
);

SessionItem.displayName = 'SessionItem';

// Main Component
export default function ShadcnAgentChat({
  agent,
  className,
  onClose,
}: ShadcnAgentChatProps) {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'session-1',
      name: 'Welcome Chat',
      messages: [
        {
          id: 'msg-welcome',
          role: 'assistant',
          content: agent.welcomeMessage,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      agentId: agent.id,
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState('session-1');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  // Handlers
  const handleNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      name: `Chat ${sessions.length + 1}`,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `👋 **New conversation started!**\n\nI'm ${agent.name}, ready to help. How can I assist you?`,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      agentId: agent.id,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, [sessions.length, agent.id, agent.name]);

  const handleDeleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        if (activeSessionId === id && filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        }
        return filtered.length > 0
          ? filtered
          : [
              {
                id: 'session-1',
                name: 'New Chat',
                messages: [
                  {
                    id: 'msg-new',
                    role: 'assistant',
                    content: agent.welcomeMessage,
                    timestamp: new Date(),
                  },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
                agentId: agent.id,
              },
            ];
      });
    },
    [activeSessionId, agent.id, agent.welcomeMessage]
  );

  const handleExportSession = useCallback(
    (id: string) => {
      const session = sessions.find((s) => s.id === id);
      if (!session) return;

      let text = `# ${session.name}\nAgent: ${agent.name}\nExported: ${new Date().toISOString()}\n\n---\n\n`;
      session.messages.forEach((msg) => {
        text += `**${msg.role === 'user' ? 'You' : agent.name}** (${new Date(msg.timestamp).toLocaleString()}):\n${msg.content}\n\n`;
      });

      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.name.replace(/\s+/g, '-')}-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [sessions, agent.name]
  );

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleFeedback = useCallback(
    (messageId: string, type: 'up' | 'down') => {
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === messageId
              ? { ...m, feedback: m.feedback === type ? null : type }
              : m
          ),
        }))
      );
    },
    []
  );

  const handleListen = useCallback((content: string) => {
    // ALWAYS cancel any ongoing speech first to prevent overlapping voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    const clean = content.replace(/[*#`]/g, '').replace(/```[\s\S]*?```/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }, []);

  const handleShare = useCallback(
    (content: string) => {
      if (navigator.share) {
        navigator.share({ title: `${agent.name} Response`, text: content });
      } else {
        navigator.clipboard.writeText(content);
      }
    },
    [agent.name]
  );

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !activeSession || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMsg], updatedAt: new Date() }
          : s
      )
    );

    const input = inputValue;
    setInputValue('');
    setIsLoading(true);

    const assistantMsgId = `asst-${Date.now()}`;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [
                ...s.messages,
                {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: '',
                  timestamp: new Date(),
                  isStreaming: true,
                },
              ],
            }
          : s
      )
    );

    try {
      const conversationHistory = activeSession.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory,
          agentId: agent.id,
          provider: agent.provider || 'mistral',
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to send message');

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: data.message, isStreaming: false }
                    : m
                ),
              }
            : s
        )
      );
    } catch (error) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: `❌ **Error:** ${error instanceof Error ? error.message : 'Something went wrong'}`,
                        isStreaming: false,
                      }
                    : m
                ),
              }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    inputValue,
    activeSession,
    activeSessionId,
    isLoading,
    agent.id,
    agent.provider,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col border-r bg-muted/30 transition-all duration-300',
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={agent.avatar} />
              <AvatarFallback
                style={{ backgroundColor: agent.color || '#6366f1' }}
              >
                <Bot className="h-5 w-5 text-white" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-sm">{agent.name}</h2>
              <p className="text-xs text-muted-foreground">AI Assistant</p>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={handleNewSession}
            className="w-full gap-2"
            variant="default"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <Separator />

        {/* Sessions List */}
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-1">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => setActiveSessionId(session.id)}
                onDelete={() => handleDeleteSession(session.id)}
                onExport={() => handleExportSession(session.id)}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              {agent.provider || 'Mistral'} • {agent.model || 'Large'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <div>
              <h1 className="font-semibold">{activeSession?.name || 'Chat'}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {activeSession?.messages.length || 0} messages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agent.capabilities?.map((cap) => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                activeSession && handleExportSession(activeSession.id)
              }
            >
              <Download className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="py-4">
            {activeSession?.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                agent={agent}
                onCopy={handleCopy}
                onFeedback={handleFeedback}
                onListen={handleListen}
                onShare={handleShare}
                copiedId={copiedId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${agent.name}...`}
                className="min-h-[44px] max-h-[200px] pr-24 resize-none"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.py"
                />
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach file</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7',
                          isRecording && 'text-red-500 animate-pulse'
                        )}
                        onClick={() => setIsRecording(!isRecording)}
                      >
                        {isRecording ? (
                          <MicOff className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isRecording ? 'Stop recording' : 'Voice input'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="h-[44px] px-4"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {agent.name} can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
