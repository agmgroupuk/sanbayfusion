
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, GeneratedApp } from '../types';
import { speak } from '../services/speechService';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, fileData?: { name: string; type: string; base64: string } | null, mode?: 'agent' | 'chat') => void;
  isGenerating: boolean;
  onNewChat?: () => void;
  onCancel?: () => void;
  isDarkMode?: boolean;
  onVoiceClick?: () => void;
  chatSessions: GeneratedApp[];
  onLoadSession?: (app: GeneratedApp) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, isGenerating, onNewChat, onCancel, isDarkMode = true, onVoiceClick, chatSessions, onLoadSession }) => {
  const [input, setInput] = useState('');
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatMode, setChatMode] = useState<'agent' | 'chat'>('agent');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileData, setPendingFileData] = useState<{ name: string; type: string; base64: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);



  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input, pendingFileData, chatMode);
      setInput('');
      setPendingFile(null);
      setPendingFileData(null);
    }
  };

  const handleSpeak = async (text: string, idx: number) => {
    setSpeakingIdx(idx);
    await speak(text);
    setSpeakingIdx(null);
  };

  // Voice recording using Web Speech API
  const toggleVoiceRecording = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      const { toast } = await import('./shared/Toast');
      toast.warning('Not Supported', 'Voice recognition is not supported in this browser');
      return;
    }

    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        (recognitionRef.current as any).__shouldRestart = false;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Track to prevent duplicates
    let finalTranscript = '';
    (recognition as any).__shouldRestart = true;

    recognition.onstart = () => setIsRecording(true);

    recognition.onend = () => {
      // Only restart if we should continue
      if (recognitionRef.current && (recognitionRef.current as any).__shouldRestart) {
        try {
          recognition.start();
        } catch (e) {
          console.log('[STT] Could not restart:', e);
          setIsRecording(false);
        }
      } else {
        setIsRecording(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') return;
      console.error('[STT] Error:', event.error);
      // Prevent onend from restarting after a real error
      (recognition as any).__shouldRestart = false;
      recognitionRef.current = null;
      setIsRecording(false);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      // Process results - avoid duplicates
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Update input with final + interim
      setInput(finalTranscript + interimTranscript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // File upload handler — reads actual file content as base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);

      // Read file as base64
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // result is "data:<mime>;base64,<data>" — extract the base64 part
        const base64 = result.split(',')[1] || '';
        setPendingFileData({
          name: file.name,
          type: file.type,
          base64,
        });
      };
      reader.readAsDataURL(file);

      // Add context about the file to the input
      if (file.type.startsWith('image/')) {
        setInput(prev => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} [📷 Image: ${file.name}]` : `Analyze this image and generate code based on it`;
        });
      } else {
        setInput(prev => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} [📎 File: ${file.name}]` : `[📎 File: ${file.name}]`;
        });
      }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-canvas-card' : 'bg-white'} w-full relative`}>
      {/* Chat Header with History and New Chat */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-canvas-border bg-canvas-card' : 'border-gray-200 bg-white'} shrink-0`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChatHistory(!showChatHistory)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${showChatHistory
              ? 'text-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/10'
              : isDarkMode
                ? 'text-canvas-text bg-white/[0.06] hover:bg-cyan-500/15 hover:text-cyan-400 border border-canvas-border hover:border-cyan-500/30'
                : 'text-gray-700 bg-gray-100 hover:bg-cyan-50 hover:text-cyan-600 border border-gray-300 hover:border-cyan-400'
              }`}
            title="Chat History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
          </button>
        </div>

        <button
          onClick={() => {
            onNewChat?.();
            setShowChatHistory(false);
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 rounded-lg transition-all shadow-lg shadow-cyan-600/30 hover:shadow-cyan-500/40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">New Chat</span>
        </button>
      </div>

      {/* Chat History Panel */}
      {showChatHistory && (
        <div className={`absolute inset-0 top-[52px] ${isDarkMode ? 'bg-canvas-card' : 'bg-white'} z-10 flex flex-col`}>
          <div className={`p-4 border-b ${isDarkMode ? 'border-canvas-border' : 'border-gray-200'}`}>
            <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} uppercase tracking-wider flex items-center gap-2`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Conversations
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
            {chatSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-canvas-muted-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'}`}>No chat history yet</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} mt-1`}>Start a conversation to see it here</p>
              </div>
            ) : (
              chatSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => { onLoadSession?.(session); setShowChatHistory(false); }}
                  className={`w-full text-left p-3 ${isDarkMode ? 'bg-white/[0.06] hover:bg-white/[0.08] border-canvas-border hover:border-cyan-500/30' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-cyan-400/50'} border rounded-lg transition-all group`}
                >
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-200 group-hover:text-cyan-400' : 'text-gray-700 group-hover:text-cyan-600'} truncate`}>{session.name || session.prompt?.substring(0, 30) || 'Untitled'}</p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'} mt-1 flex items-center gap-2`}>
                    <span>{new Date(session.timestamp).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{(session.history || []).length} messages</span>
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="p-3">
            <button
              onClick={() => setShowChatHistory(false)}
              className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 rounded-lg transition-all uppercase tracking-wider shadow-lg shadow-cyan-600/20"
            >
              ← Back to Chat
            </button>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">Hey! I'm Nova 👋</p>
            <p className="text-xs text-canvas-muted leading-relaxed max-w-[250px]">Your web dev partner. Tell me what you want to build, or just say hi!</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <button
                onClick={() => onSendMessage("Build me a landing page")}
                className="px-3 py-1.5 text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full hover:bg-cyan-500/20 transition-all"
              >
                🚀 Landing page
              </button>
              <button
                onClick={() => onSendMessage("Create a dashboard")}
                className="px-3 py-1.5 text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full hover:bg-purple-500/20 transition-all"
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => onSendMessage("Make a portfolio site")}
                className="px-3 py-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full hover:bg-emerald-500/20 transition-all"
              >
                🎨 Portfolio
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`group relative max-w-[90%] px-4 py-3 rounded-lg text-xs leading-relaxed ${msg.role === 'user'
              ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-tr-none shadow-[0_0_15px_rgba(34,211,238,0.2)]'
              : isDarkMode
                ? 'bg-black/40 text-canvas-text rounded-tl-none border border-gray-800'
                : 'bg-gray-100 text-gray-700 rounded-tl-none border border-gray-200'
              }`}>
              {msg.text}

              {msg.role === 'model' && (
                <button
                  onClick={() => handleSpeak(msg.text, i)}
                  className={`absolute -right-8 top-1 p-1 text-canvas-muted-deep hover:text-cyan-400 transition-all ${speakingIdx === i ? 'opacity-100 text-cyan-400 animate-pulse' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              )}
            </div>
            <span className="text-[10px] text-gray-600 mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        {isGenerating && (
          <div className="flex items-center gap-2 text-cyan-400 text-[10px] px-2 font-bold uppercase tracking-widest italic animate-pulse">
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
              <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce delay-150"></span>
            </span>
            Processing...
          </div>
        )}
      </div>

      {/* Agent / Chat Mode Toggle */}
      <div className={`px-3 py-1.5 border-t ${isDarkMode ? 'border-canvas-border bg-canvas-card' : 'border-gray-200 bg-white'} flex items-center gap-1 shrink-0`}>
        <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-lg border border-canvas-border">
          <button
            type="button"
            onClick={() => setChatMode('agent')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${chatMode === 'agent' ? 'bg-cyan-500/20 text-cyan-300' : 'text-canvas-muted-deep hover:text-canvas-text'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a3.375 3.375 0 01-2.392.993H9.862a3.375 3.375 0 01-2.392-.993L5 14.5m14 0V5.846a1.5 1.5 0 00-1.078-1.44 48.354 48.354 0 00-5.422-.87" /></svg>
            <span>Agent</span>
          </button>
          <button
            type="button"
            onClick={() => setChatMode('chat')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${chatMode === 'chat' ? 'bg-cyan-500/20 text-cyan-300' : 'text-canvas-muted-deep hover:text-canvas-text'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span>Chat</span>
          </button>
        </div>
        <span className="text-[9px] text-gray-600 ml-auto">{chatMode === 'agent' ? 'Build & edit apps' : 'Ask questions'}</span>
      </div>

      <form onSubmit={handleSubmit} className={`p-3 ${isDarkMode ? 'bg-canvas-card' : 'bg-white'} shrink-0`}>
        <div className="flex items-center gap-2">
          {/* Voice Recording Button */}
          <button
            type="button"
            onClick={onVoiceClick ?? toggleVoiceRecording}
            className={`p-2.5 rounded-lg transition-all border ${isRecording ? 'bg-primary-500/20 text-primary-400 border-primary-500/30 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]' : isDarkMode ? 'bg-black/40 text-canvas-muted-deep border-gray-800 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30' : 'bg-gray-50 text-canvas-muted border-gray-200 hover:bg-cyan-50 hover:text-cyan-500 hover:border-cyan-400/30'}`}
            title="Voice Input"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2.5 ${isDarkMode ? 'bg-black/40 text-canvas-muted-deep border-gray-800 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30' : 'bg-gray-50 text-canvas-muted border-gray-200 hover:bg-cyan-50 hover:text-cyan-500 hover:border-cyan-400/30'} rounded-lg transition-all border`}
            title="Upload File"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isGenerating}
              placeholder="Enter modification request..."
              className={`w-full pl-4 pr-4 py-3 text-xs ${isDarkMode ? 'bg-black/40 border-gray-800 text-canvas-text placeholder:text-gray-600' : 'bg-gray-50 border-gray-200 text-gray-700 placeholder:text-canvas-muted'} border rounded-lg focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all`}
            />
          </div>

          {/* Send or Stop Button */}
          {isGenerating ? (
            <button
              type="button"
              onClick={onCancel}
              className="p-2.5 bg-gradient-to-r from-primary-600 to-orange-600 text-white rounded-lg transition-all shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95 animate-pulse"
              title="Stop Generating"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg disabled:bg-gray-800 disabled:from-gray-700 disabled:to-gray-700 transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)] hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] active:scale-95"
              title="Send Message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
