'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  HelpCircle,
  Minimize2,
  Maximize2,
  Download,
  FileText,
  FileJson,
  Copy,
  Globe,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

// Simple markdown renderer for chat messages with emoji support
function MarkdownMessage({ content }: { content: string }) {
  // Convert markdown to HTML
  const formatText = (text: string) => {
    // Split by newlines to preserve structure
    const lines = text.split('\n');
    
    return lines.map((line, idx) => {
      // Bold text: **text** -> <strong>text</strong>
      let formatted = line.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
      
      // Italic text: *text* -> <em>text</em>
      formatted = formatted.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
      
      // Code inline: `code` -> <code>code</code>
      formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
      
      // Headers with proper styling
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-base font-bold mt-3 mb-1.5 text-gray-800" dangerouslySetInnerHTML={{ __html: formatted.substring(4) }} />;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-bold mt-3 mb-2 text-gray-800" dangerouslySetInnerHTML={{ __html: formatted.substring(3) }} />;
      }
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-bold mt-4 mb-2 text-gray-900" dangerouslySetInnerHTML={{ __html: formatted.substring(2) }} />;
      }
      
      // Bullet points with better styling
      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
          <li key={idx} className="ml-4 mb-1 list-disc" dangerouslySetInnerHTML={{ __html: formatted.replace(/^[\s•\-\*]+/, '') }} />
        );
      }
      
      // Empty lines
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      
      // Regular paragraph with proper line height
      return <p key={idx} className="mb-1.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="text-sm leading-relaxed" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif' }}>
      {formatText(content)}
    </div>
  );
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  feedback?: 'positive' | 'negative' | null;
}

interface DoctorNetworkProps {
  ipContext?: {
    ip: string;
    location?: any;
    network?: any;
    security?: any;
  };
}

export default function DoctorNetworkChat({ ipContext }: DoctorNetworkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  // Multi-language support
  const languages = {
    en: {
      name: '🇺🇸 English',
      code: 'en',
      translations: {
        title: 'Doctor Network',
        subtitle: 'Free Network Assistant',
        welcomeMessage: `Hello! I'm Doctor Network 👨‍⚕️ - your free networking assistant. I can help explain IP addresses, network security, ISPs, VPNs, and more. What would you like to know?`,
        placeholder: 'Ask about networking, IPs, security...',
        thinking: 'Doctor Network is thinking...',
        quickQuestions: 'Quick Questions',
        exportMenu: 'Export conversation',
        exportText: 'Export as Text',
        exportJson: 'Export as JSON',
        copyClipboard: 'Copy to Clipboard',
        clearChat: 'Clear chat',
        ipPrivacy: 'IP Privacy',
        networkTerms: 'Network Terms',
        hide: 'Hide',
        close: 'Close chat',
        minimize: 'Minimize',
        maximize: 'Maximize',
        wasHelpful: 'Was this helpful?',
        helpfulResponse: 'Helpful response',
        notHelpful: 'Not helpful',
        thanks: 'Thanks!',
        sorry: 'Sorry about that!'
      }
    },
    es: {
      name: '🇪🇸 Español',
      code: 'es',
      translations: {
        title: 'Doctor Network',
        subtitle: 'Asistente de Red Gratuito',
        welcomeMessage: `¡Hola! Soy Doctor Network 👨‍⚕️ - tu asistente gratuito de redes. Puedo ayudarte a explicar direcciones IP, seguridad de red, ISPs, VPNs y más. ¿Qué te gustaría saber?`,
        placeholder: 'Pregunta sobre redes, IPs, seguridad...',
        thinking: 'Doctor Network está pensando...',
        quickQuestions: 'Preguntas Rápidas',
        exportMenu: 'Exportar conversación',
        exportText: 'Exportar como Texto',
        exportJson: 'Exportar como JSON',
        copyClipboard: 'Copiar al Portapapeles',
        clearChat: 'Limpiar chat',
        ipPrivacy: 'Privacidad IP',
        networkTerms: 'Términos de Red',
        hide: 'Ocultar',
        close: 'Cerrar chat',
        minimize: 'Minimizar',
        maximize: 'Maximizar',
        wasHelpful: '¿Fue útil esto?',
        helpfulResponse: 'Respuesta útil',
        notHelpful: 'No útil',
        thanks: '¡Gracias!',
        sorry: '¡Lo siento!'
      }
    },
    fr: {
      name: '🇫🇷 Français',
      code: 'fr',
      translations: {
        title: 'Doctor Network',
        subtitle: 'Assistant Réseau Gratuit',
        welcomeMessage: `Bonjour! Je suis Doctor Network 👨‍⚕️ - votre assistant réseau gratuit. Je peux vous aider à expliquer les adresses IP, la sécurité réseau, les FAI, les VPN et plus. Que souhaitez-vous savoir?`,
        placeholder: 'Posez des questions sur les réseaux, IPs, sécurité...',
        thinking: 'Doctor Network réfléchit...',
        quickQuestions: 'Questions Rapides',
        exportMenu: 'Exporter la conversation',
        exportText: 'Exporter en Texte',
        exportJson: 'Exporter en JSON',
        copyClipboard: 'Copier dans le Presse-papiers',
        clearChat: 'Effacer le chat',
        ipPrivacy: 'Confidentialité IP',
        networkTerms: 'Termes Réseau',
        hide: 'Masquer',
        close: 'Fermer le chat',
        minimize: 'Réduire',
        maximize: 'Agrandir',
        wasHelpful: 'Était-ce utile?',
        helpfulResponse: 'Réponse utile',
        notHelpful: 'Pas utile',
        thanks: 'Merci!',
        sorry: 'Désolé pour ça!'
      }
    },
    de: {
      name: '🇩🇪 Deutsch',
      code: 'de',
      translations: {
        title: 'Doctor Network',
        subtitle: 'Kostenloser Netzwerk-Assistent',
        welcomeMessage: `Hallo! Ich bin Doctor Network 👨‍⚕️ - Ihr kostenloser Netzwerk-Assistent. Ich kann Ihnen bei IP-Adressen, Netzwerksicherheit, ISPs, VPNs und mehr helfen. Was möchten Sie wissen?`,
        placeholder: 'Fragen Sie nach Netzwerken, IPs, Sicherheit...',
        thinking: 'Doctor Network denkt nach...',
        quickQuestions: 'Schnelle Fragen',
        exportMenu: 'Unterhaltung exportieren',
        exportText: 'Als Text exportieren',
        exportJson: 'Als JSON exportieren',
        copyClipboard: 'In Zwischenablage kopieren',
        clearChat: 'Chat löschen',
        ipPrivacy: 'IP-Datenschutz',
        networkTerms: 'Netzwerk-Begriffe',
        hide: 'Verbergen',
        close: 'Chat schließen',
        minimize: 'Minimieren',
        maximize: 'Maximieren',
        wasHelpful: 'War das hilfreich?',
        helpfulResponse: 'Hilfreiche Antwort',
        notHelpful: 'Nicht hilfreich',
        thanks: 'Danke!',
        sorry: 'Entschuldigung!'
      }
    }
  };

  const t = languages[currentLanguage as keyof typeof languages]?.translations || languages.en.translations;

  // Quick question templates
  const quickQuestions = [
    {
      category: "🔍 IP Basics",
      questions: [
        "What is my IP address and what does it mean?",
        "Can people find my exact location with my IP?",
        "Why does my IP show a different city?",
        "What's the difference between IPv4 and IPv6?"
      ]
    },
    {
      category: "🛡️ Security & Privacy",
      questions: [
        "Analyze my IP security status",
        "Should I be using a VPN for privacy?",
        "What do these security flags mean?",
        "How can I protect my online privacy?",
        "Is this IP associated with any threats?",
        "Why was my IP flagged as suspicious?"
      ]
    },
    {
      category: "🌐 Networking Concepts",
      questions: [
        "What is an ISP and how do they work?",
        "What does ASN stand for in networking?",
        "How does DNS resolution work?",
        "What are ports and why are they important?"
      ]
    },
    {
      category: "⚠️ Troubleshooting",
      questions: [
        "Why is my internet connection slow?",
        "What causes network timeouts?",
        "How do firewalls protect my network?",
        "What is bandwidth and how is it measured?"
      ]
    }
  ];

  // Detect user scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Check if user is near the bottom (within 50px)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      isUserScrollingRef.current = !isNearBottom;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  // Auto-scroll to bottom only when new messages arrive and user isn't manually scrolling
  useEffect(() => {
    // Only scroll if a new message was added (not just updated)
    if (messages.length !== lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length;
      
      // Only auto-scroll if user hasn't manually scrolled up
      if (!isUserScrollingRef.current && messagesEndRef.current) {
        // Use requestAnimationFrame for smoother scroll behavior
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
          });
        });
      }
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Show welcome message and security analysis when first opened
  useEffect(() => {
    if (isOpen && (!hasGreeted || messages.length === 0)) {
      const messages = [
        {
          id: 'welcome',
          type: 'assistant' as const,
          content: t.welcomeMessage,
          timestamp: new Date().toISOString()
        }
      ];

      // Add proactive security analysis if IP context is available
      if (ipContext && (ipContext.security?.isVPN || ipContext.security?.isProxy || 
          ipContext.security?.isTor || ipContext.security?.threat === 'high')) {
        const securityMessage = {
          id: 'security-analysis',
          type: 'assistant' as const,
          content: `🔍 **Automatic Security Analysis**

I've detected some interesting aspects about your IP (${ipContext.ip}):

${ipContext.security.isVPN ? '🛡️ VPN connection detected - Good for privacy!\n' : ''}${ipContext.security.isProxy ? '⚠️ Proxy server detected - May affect some services\n' : ''}${ipContext.security.isTor ? '🚨 Tor network detected - High anonymity but may be flagged\n' : ''}${ipContext.security.threat === 'high' ? '🔴 High threat level detected - Exercise caution\n' : ''}
Ask me anything about these findings or network security in general!`,
          timestamp: new Date().toISOString()
        };
        messages.push(securityMessage);
      }

      setMessages(messages);
      setHasGreeted(true);
    }
  }, [isOpen, hasGreeted, messages.length, currentLanguage, t.welcomeMessage, ipContext]);

  // Update welcome message when language changes
  useEffect(() => {
    if (messages.length > 0 && messages[0].id === 'welcome') {
      setMessages(prev => [
        {
          ...prev[0],
          content: t.welcomeMessage
        },
        ...prev.slice(1)
      ]);
    }
  }, [currentLanguage, t.welcomeMessage, messages]);

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/doctor-network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation: messages,
          language: currentLanguage,
          ipContext: ipContext
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev => [...prev, data.response]);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `I'm sorry, I'm having trouble right now. Please try again in a moment. 

Quick networking tip: Your IP address is like your home address for the internet - it helps data find its way to your device!`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    try {
      // Update message feedback locally
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, feedback } : msg
      ));
      
      // Mark as submitted to prevent multiple submissions
      setFeedbackSubmitted(prev => new Set(Array.from(prev).concat(messageId)));

      // Send feedback to backend (optional - for analytics)
      await fetch('/api/doctor-network/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          feedback,
          timestamp: new Date().toISOString(),
          agent: 'doctor-network'
        }),
      }).catch(err => {
        // Don't block UI if feedback submission fails
        console.warn('Failed to submit feedback:', err);
      });

    } catch (error) {
      console.error('Feedback error:', error);
      // Revert the feedback if something went wrong
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, feedback: null } : msg
      ));
      setFeedbackSubmitted(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setHasGreeted(false);
    setShowQuickQuestions(true);
  };

  const selectQuickQuestion = (question: string) => {
    setCurrentMessage(question);
    setShowQuickQuestions(false);
    inputRef.current?.focus();
  };

  const toggleQuickQuestions = () => {
    setShowQuickQuestions(!showQuickQuestions);
  };

  // Export conversation functions
  const exportAsJSON = () => {
    const exportData = {
      conversation: messages,
      exportedAt: new Date().toISOString(),
      ipContext: ipContext,
      summary: {
        totalMessages: messages.length,
        userMessages: messages.filter(m => m.type === 'user').length,
        assistantMessages: messages.filter(m => m.type === 'assistant').length
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-network-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    let textContent = `Doctor Network Chat Export\n`;
    textContent += `Exported: ${new Date().toLocaleString()}\n`;
    if (ipContext) {
      textContent += `IP Context: ${ipContext.ip}\n`;
    }
    textContent += `\n${'='.repeat(50)}\n\n`;
    
    messages.forEach(message => {
      const time = new Date(message.timestamp).toLocaleString();
      const speaker = message.type === 'user' ? 'You' : 'Doctor Network';
      textContent += `[${time}] ${speaker}:\n${message.content}\n\n`;
    });
    
    textContent += `\n${'='.repeat(50)}\n`;
    textContent += `Total Messages: ${messages.length}\n`;
    textContent += `Generated by Doctor Network - Free Networking Assistant\n`;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-network-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyConversation = async () => {
    let textContent = '';
    messages.forEach(message => {
      const speaker = message.type === 'user' ? 'You' : 'Doctor Network';
      textContent += `${speaker}: ${message.content}\n\n`;
    });
    
    try {
      await navigator.clipboard.writeText(textContent);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy conversation:', err);
    }
  };

  // Floating chat button - Slim badge style with bounce animation
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full px-5 py-3 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 animate-bounce-gentle"
          title="Ask Doctor Network"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-blue-600 animate-pulse"></div>
          </div>
          <span className="font-semibold text-sm whitespace-nowrap">Dr. Network</span>
          <span className="text-blue-200 text-xs">👨‍⚕️</span>
        </button>
        
        {/* Animated glow effect */}
        <div className="absolute inset-0 -z-10 bg-blue-500 rounded-full blur-xl opacity-30 animate-pulse-slow"></div>
        
        <style jsx>{`
          @keyframes bounce-gentle {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-8px);
            }
          }
          @keyframes pulse-slow {
            0%, 100% {
              opacity: 0.3;
            }
            50% {
              opacity: 0.5;
            }
          }
          .animate-bounce-gentle {
            animation: bounce-gentle 2s ease-in-out infinite;
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // Chat window
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
        isMinimized ? 'w-80 h-14' : 'w-96 h-[500px]'
      }`}>
        
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-xs text-blue-100">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="p-1 hover:bg-blue-500 rounded transition-colors"
                title="Select language"
              >
                <Globe className="w-4 h-4" />
              </button>
              
              {showLanguageMenu && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 min-w-[140px]">
                  {Object.values(languages).map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setCurrentLanguage(lang.code);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                        currentLanguage === lang.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {messages.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-1 hover:bg-blue-500 rounded transition-colors"
                  title={t.exportMenu}
                >
                  <Download className="w-4 h-4" />
                </button>
                
                {showExportMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-[160px]">
                    <button
                      onClick={() => {
                        exportAsText();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      {t.exportText}
                    </button>
                    <button
                      onClick={() => {
                        exportAsJSON();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileJson className="w-4 h-4" />
                      {t.exportJson}
                    </button>
                    <button
                      onClick={() => {
                        copyConversation();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      {t.copyClipboard}
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-blue-500 rounded transition-colors"
              title={isMinimized ? t.maximize : t.minimize}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-blue-500 rounded transition-colors"
              title={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat messages - only show when not minimized */}
        {!isMinimized && (
          <>
            <div 
              ref={messagesContainerRef}
              className="flex-1 p-4 space-y-4 overflow-y-auto overscroll-contain" 
              style={{ 
                maxHeight: 'calc(500px - 180px)', 
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Quick Questions Panel */}
              {showQuickQuestions && messages.length <= 1 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-blue-900">Quick Questions</h4>
                    <button
                      onClick={toggleQuickQuestions}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Hide
                    </button>
                  </div>
                  <div className="space-y-3">
                    {quickQuestions.map((category, idx) => (
                      <div key={idx}>
                        <h5 className="text-xs font-medium text-blue-800 mb-2">{category.category}</h5>
                        <div className="space-y-1">
                          {category.questions.slice(0, 2).map((question, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => selectQuickQuestion(question)}
                              className="w-full text-left text-xs p-2 bg-white hover:bg-blue-100 rounded border border-blue-200 text-blue-700 hover:text-blue-900 transition-colors"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex flex-col max-w-[80%]">
                    <div
                      className={`p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      {message.type === 'user' ? (
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <MarkdownMessage content={message.content} />
                      )}
                      <div className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    
                    {/* Feedback buttons - only for assistant messages */}
                    {message.type === 'assistant' && (
                      <div className="flex items-center justify-start mt-2 space-x-2">
                        <span className="text-xs text-gray-500">{t.wasHelpful}</span>
                        <button
                          onClick={() => handleFeedback(message.id, 'positive')}
                          disabled={feedbackSubmitted.has(message.id)}
                          className={`p-1 rounded transition-colors ${
                            message.feedback === 'positive'
                              ? 'bg-green-100 text-green-600'
                              : feedbackSubmitted.has(message.id)
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={t.helpfulResponse}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, 'negative')}
                          disabled={feedbackSubmitted.has(message.id)}
                          className={`p-1 rounded transition-colors ${
                            message.feedback === 'negative'
                              ? 'bg-red-100 text-red-600'
                              : feedbackSubmitted.has(message.id)
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={t.notHelpful}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                        
                        {/* Feedback confirmation */}
                        {message.feedback && (
                          <span className={`text-xs ${
                            message.feedback === 'positive' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {message.feedback === 'positive' ? t.thanks : t.sorry}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 rounded-lg rounded-bl-sm p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{t.thinking}</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t.placeholder}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              {/* Quick actions */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-2">
                  {!showQuickQuestions && messages.length > 1 && (
                    <button
                      onClick={toggleQuickQuestions}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Quick Questions
                    </button>
                  )}
                  <button
                    onClick={() => setCurrentMessage("What does my IP address tell others about me?")}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    IP Privacy
                  </button>
                  <button
                    onClick={() => setCurrentMessage("What is an ISP and ASN?")}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Network Terms
                  </button>
                </div>
                
                {messages.length > 1 && (
                  <button
                    onClick={clearChat}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Clear chat
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}