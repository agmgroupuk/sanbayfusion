import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, MicOff, Paperclip, X, FileText, Image, File, Square, ChevronDown, ChevronRight, Copy, Check, Terminal, Eye, CheckCircle2, Zap, Bot, MessageSquare } from 'lucide-react';
import { ChatMessage, FileAction } from '../types';
import { speak } from '../services/speechService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

// ------------------------------------------------------------------
// Speech Recognition setup (Web Speech API)
// ------------------------------------------------------------------
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export interface ChatAttachment {
  file: File;
  name: string;
  size: number;
  type: string;          // MIME
  preview?: string;      // data-URL for images
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, attachments?: ChatAttachment[], mode?: 'agent' | 'chat') => void;
  isGenerating: boolean;
  onStopGeneration?: () => void;
  onFileClick?: (path: string) => void;
  streamingMessage?: ChatMessage | null;
  progressMessage?: string;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/javascript',
  'application/typescript',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

function humanFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (type === 'application/pdf') return <FileText className="w-3.5 h-3.5 text-primary-400 shrink-0" />;
  return <File className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
}

// ------------------------------------------------------------------
// File action helpers
// ------------------------------------------------------------------
function getFileExtIcon(path: string): { color: string; label: string } {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, { color: string; label: string }> = {
    html: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', label: 'HTML' },
    css: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'CSS' },
    scss: { color: 'text-pink-400 bg-pink-500/10 border-pink-500/20', label: 'SCSS' },
    js: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', label: 'JS' },
    jsx: { color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20', label: 'JSX' },
    ts: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'TS' },
    tsx: { color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', label: 'TSX' },
    json: { color: 'text-green-400 bg-green-500/10 border-green-500/20', label: 'JSON' },
    py: { color: 'text-green-500 bg-green-500/10 border-green-500/20', label: 'PY' },
    md: { color: 'text-canvas-muted bg-gray-500/10 border-gray-500/20', label: 'MD' },
    svg: { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'SVG' },
    sh: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'SH' },
    sql: { color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', label: 'SQL' },
  };
  return map[ext] || { color: 'text-canvas-muted bg-gray-500/10 border-gray-500/20', label: ext.toUpperCase() || 'FILE' };
}

// ------------------------------------------------------------------
// Markdown Code Block with copy button
// ------------------------------------------------------------------
const MarkdownCodeBlock: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace('language-', '') || '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-2 rounded-lg border border-canvas-border bg-canvas-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-white/[0.03] border-b border-canvas-border">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-canvas-muted-deep" />
          <span className="text-[9px] text-canvas-muted-deep uppercase font-semibold tracking-wider">{lang || 'code'}</span>
        </div>
        <button onClick={handleCopy} className="flex items-center gap-1 text-[9px] text-canvas-muted-deep hover:text-cyan-400 transition-colors">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 text-[10px] font-mono leading-relaxed overflow-x-auto custom-scrollbar !bg-transparent !m-0">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};

// ------------------------------------------------------------------
// File Actions Card — VS Code style file activity card
// ------------------------------------------------------------------
const FileActionsCard: React.FC<{ actions: FileAction[]; onFileClick?: (path: string) => void }> = ({ actions, onFileClick }) => {
  const created = actions.filter(a => a.action === 'created').length;
  const modified = actions.filter(a => a.action === 'modified').length;
  const deleted = actions.filter(a => a.action === 'deleted').length;

  return (
    <div className="my-2 rounded-lg border border-canvas-border bg-canvas-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border-b border-canvas-border">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] font-semibold text-canvas-text">Files Changed</span>
        <div className="ml-auto flex items-center gap-1.5">
          {created > 0 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">+{created}</span>}
          {modified > 0 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">~{modified}</span>}
          {deleted > 0 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-400">-{deleted}</span>}
        </div>
      </div>
      {/* File list */}
      <div className="py-0.5">
        {actions.map((action, i) => {
          const { color, label } = getFileExtIcon(action.path);
          const filename = action.path.split('/').pop() || action.path;
          const dir = action.path.includes('/') ? action.path.slice(0, action.path.lastIndexOf('/') + 1) : '';
          return (
            <button
              key={i}
              onClick={() => onFileClick?.(action.path)}
              className="w-full flex items-center gap-2 px-3 py-1 hover:bg-white/[0.04] transition-colors group text-left"
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${action.action === 'created' ? 'bg-emerald-400' : action.action === 'modified' ? 'bg-amber-400' : 'bg-primary-400'
                }`} />
              <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${color} shrink-0`}>{label}</span>
              <span className="flex-1 min-w-0 truncate">
                {dir && <span className="text-[9px] text-gray-600 font-mono">{dir}</span>}
                <span className="text-[10px] text-canvas-text font-mono group-hover:text-white transition-colors">{filename}</span>
              </span>
              {action.lineCount && action.lineCount > 0 && (
                <span className="text-[8px] text-gray-600 shrink-0">{action.lineCount}L</span>
              )}
              <Eye className="w-3 h-3 text-gray-700 group-hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// Markdown Renderer — shared between agent and chat modes
// ------------------------------------------------------------------
const markdownComponents = {
  code: ({ className, children, ...props }: any) => {
    const isInline = !className && typeof children === 'string' && !children.includes('\n');
    if (isInline) {
      return <code className="px-1 py-0.5 bg-white/[0.06] rounded text-cyan-300 text-[10px] font-mono">{children}</code>;
    }
    return <MarkdownCodeBlock className={className}>{children}</MarkdownCodeBlock>;
  },
  pre: ({ children }: any) => <>{children}</>,
  p: ({ children }: any) => <p className="text-[11px] leading-relaxed mb-1">{children}</p>,
  h1: ({ children }: any) => <h2 className="text-xs font-bold text-white mt-2 mb-1">{children}</h2>,
  h2: ({ children }: any) => <h3 className="text-[11px] font-bold text-white mt-2 mb-1">{children}</h3>,
  h3: ({ children }: any) => <h4 className="text-[11px] font-bold text-white mt-1.5 mb-0.5">{children}</h4>,
  ul: ({ children }: any) => <ul className="space-y-0.5 ml-1 my-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="space-y-0.5 ml-1 my-1 list-decimal list-inside">{children}</ol>,
  li: ({ children }: any) => (
    <li className="flex items-start gap-1.5 text-[11px] leading-relaxed">
      <span className="text-cyan-400 mt-0.5 text-[8px] shrink-0">●</span>
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-canvas-text">{children}</em>,
  a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">{children}</a>,
  blockquote: ({ children }: any) => <blockquote className="border-l-2 border-cyan-500/30 pl-2 my-1 text-canvas-muted italic">{children}</blockquote>,
  table: ({ children }: any) => <div className="overflow-x-auto my-2"><table className="text-[10px] border-collapse w-full">{children}</table></div>,
  th: ({ children }: any) => <th className="border border-canvas-border px-2 py-1 bg-white/[0.03] text-left text-canvas-text font-semibold">{children}</th>,
  td: ({ children }: any) => <td className="border border-canvas-border px-2 py-1 text-canvas-muted">{children}</td>,
};

// ------------------------------------------------------------------
// Rich Message Content Renderer
// ------------------------------------------------------------------
const RichMessageContent: React.FC<{ msg: ChatMessage; onFileClick?: (path: string) => void; chatMode: 'agent' | 'chat' }> = ({ msg, onFileClick, chatMode }) => {
  return (
    <div className="space-y-1">
      {/* File activity card — shown in agent mode */}
      {chatMode === 'agent' && msg.fileActions && msg.fileActions.length > 0 && (
        <FileActionsCard actions={msg.fileActions} onFileClick={onFileClick} />
      )}
      {/* Markdown-rendered message text */}
      <div className="chat-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>
          {msg.text}
        </ReactMarkdown>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, isGenerating, onStopGeneration, onFileClick, streamingMessage, progressMessage }) => {
  const [input, setInput] = useState('');
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatMode, setChatMode] = useState<'agent' | 'chat'>('agent');

  // ── Speech-to-text state ──
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── File attachments state ──
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Speech Recognition lifecycle ──
  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setInput(prev => {
        // Replace the last interim chunk with the final one
        if (final) return (prev ? prev + ' ' : '') + final;
        return prev;
      });
    };

    recognitionRef.current = recognition;
    return () => { try { recognition.stop(); } catch { } };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try { recognitionRef.current.start(); } catch { }
    }
  }, [isListening]);

  // ── File handling ──
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid: ChatAttachment[] = [];

    for (const file of files) {
      if (attachments.length + valid.length >= MAX_FILES) break;
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;

      const attachment: ChatAttachment = { file, name: file.name, size: file.size, type: file.type };

      // Build image preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments(prev => prev.map(a => a.name === file.name ? { ...a, preview: reader.result as string } : a));
        };
        reader.readAsDataURL(file);
      }
      valid.push(attachment);
    }

    setAttachments(prev => [...prev, ...valid]);
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [attachments.length]);

  const removeAttachment = useCallback((name: string) => {
    setAttachments(prev => prev.filter(a => a.name !== name));
  }, []);

  // ── Submit ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isGenerating) return;
    onSendMessage(input, attachments.length > 0 ? attachments : undefined, chatMode);
    setInput('');
    setAttachments([]);
  };

  const handleSpeak = async (text: string, idx: number) => {
    setSpeakingIdx(idx);
    await speak(text);
    setSpeakingIdx(null);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-canvas-card w-full overflow-hidden">
      {/* Agent / Chat Mode Toggle */}
      <div className="px-3 py-1.5 border-b border-canvas-border flex items-center gap-1 shrink-0 bg-canvas-card">
        <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-lg border border-canvas-border">
          <button
            onClick={() => setChatMode('agent')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${chatMode === 'agent' ? 'bg-cyan-500/20 text-cyan-300' : 'text-canvas-muted-deep hover:text-canvas-text'
              }`}
          >
            <Bot className="w-3 h-3" />
            <span>Agent</span>
          </button>
          <button
            onClick={() => setChatMode('chat')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${chatMode === 'chat' ? 'bg-cyan-500/20 text-cyan-300' : 'text-canvas-muted-deep hover:text-canvas-text'
              }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chat</span>
          </button>
        </div>
        <span className="text-[9px] text-gray-600 ml-auto">{chatMode === 'agent' ? 'Build & edit apps' : 'Ask questions'}</span>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-cyan-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p className="text-sm font-bold text-canvas-muted mb-1">Nova AI Assistant</p>
            <p className="text-[10px] text-gray-600 leading-relaxed max-w-[200px]">
              Describe what you want to build. I'll create the files and preview for you.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {/* AI Avatar */}
            {msg.role !== 'user' && (
              <div className="shrink-0 mr-2 mt-1">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 flex items-center justify-center ring-1 ring-cyan-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
              </div>
            )}

            <div className={`group relative max-w-[88%]`}>
              <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.role === 'user'
                ? 'bg-gradient-to-r from-cyan-500/90 to-emerald-500/90 text-white rounded-tr-sm shadow-lg shadow-cyan-500/10'
                : 'bg-canvas-card text-canvas-text rounded-tl-sm border border-canvas-border shadow-lg shadow-black/20'
                }`}>
                {/* Attachment chips */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.attachments.map((a, j) => (
                      <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[10px]">
                        {fileIcon(a.type)} {a.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Message content */}
                {msg.role === 'user' ? (
                  <span>{msg.text}</span>
                ) : (
                  <RichMessageContent msg={msg} onFileClick={onFileClick} chatMode={chatMode} />
                )}
              </div>

              {/* Speak button */}
              {msg.role !== 'user' && (
                <button
                  onClick={() => handleSpeak(msg.text, i)}
                  className={`absolute -right-7 top-1 p-1 text-gray-600 hover:text-cyan-400 transition-opacity ${speakingIdx === i ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              )}

              <span className="text-[9px] text-gray-600 mt-0.5 px-1 block">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}

        {/* Live streaming message from agent */}
        {isGenerating && streamingMessage && streamingMessage.text && (
          <div className="flex justify-start">
            <div className="shrink-0 mr-2 mt-1">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 flex items-center justify-center ring-1 ring-cyan-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
            </div>
            <div className="group relative max-w-[88%]">
              <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-canvas-card text-canvas-text text-xs leading-relaxed border border-cyan-500/10 shadow-lg shadow-black/20">
                <RichMessageContent msg={streamingMessage} onFileClick={onFileClick} chatMode={chatMode} />
              </div>
            </div>
          </div>
        )}

        {/* Generating indicator */}
        {isGenerating && (
          <div className="flex items-start gap-2">
            <div className="shrink-0">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 flex items-center justify-center ring-1 ring-cyan-500/20 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-canvas-card border border-cyan-500/10">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-cyan-400/80 font-medium">{progressMessage || 'Thinking...'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachment preview strip */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-canvas-border bg-canvas-card flex flex-wrap gap-2">
          {attachments.map(a => (
            <div key={a.name} className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-canvas-card rounded-lg border border-canvas-border text-[10px] text-canvas-muted max-w-[180px]">
              {a.preview ? (
                <img src={a.preview} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
              ) : (
                fileIcon(a.type)
              )}
              <span className="truncate flex-1">{a.name}</span>
              <span className="text-gray-600 shrink-0">{humanFileSize(a.size)}</span>
              <button onClick={() => removeAttachment(a.name)} className="p-0.5 hover:bg-primary-500/20 rounded transition-colors">
                <X className="w-3 h-3 text-canvas-muted-deep hover:text-primary-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-canvas-border bg-canvas-card">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="relative flex items-center gap-1.5 bg-canvas-card rounded-xl px-2 py-1 border border-canvas-border focus-within:border-cyan-500/30 transition-colors">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || attachments.length >= MAX_FILES}
            title="Attach files"
            className="p-1.5 text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors disabled:opacity-30"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {SpeechRecognition && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isGenerating}
              title={isListening ? 'Stop listening' : 'Speech to text'}
              className={`p-1.5 rounded-lg transition-colors ${isListening
                ? 'text-primary-400 bg-primary-500/15 animate-pulse'
                : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10'
                } disabled:opacity-30`}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isGenerating}
            placeholder={isListening ? 'Listening...' : 'Ask Nova to build, edit, or explain...'}
            className="flex-1 px-2 py-2.5 text-xs bg-transparent outline-none placeholder:text-gray-600 text-canvas-text"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={() => onStopGeneration?.()}
              className="p-1.5 bg-primary-500/80 hover:bg-primary-500 text-white rounded-lg transition-colors animate-pulse"
              title="Stop generation"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && attachments.length === 0}
              className="p-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-lg disabled:opacity-30 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
