import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';

interface PreviewProps {
  code: string;
  isBuilding?: boolean;
  buildMessage?: string;
  onOpenEditor?: () => void;
  onOpenSandbox?: () => void;
  isDarkMode?: boolean;
  previewUrl?: string | null;
}

// Console message from sandbox
interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info';
  args: string[];
  timestamp: number;
}

// Fun entertaining messages while building — rotates every 4 seconds
const BUILD_COMMENTARY = [
  { text: "Teaching pixels to cooperate... Some are more rebellious than others!", emoji: "🖼️" },
  { text: "Why do programmers prefer dark mode? Because light attracts bugs! 🐛", emoji: "😂" },
  { text: "AND THE AI IS OFF! Look at that processing speed! Absolutely magnificent!", emoji: "🏃" },
  { text: "Just adding a pinch of CSS, a dash of JavaScript, and voilà! 👨‍🍳", emoji: "🍳" },
  { text: "*dramatic voice* In a world of boring apps... one AI dared to be different...", emoji: "🎬" },
  { text: "Fun fact: You blink 15-20 times per minute. Count them. You're welcome for the distraction!", emoji: "👁️" },
  { text: "A SQL query walks into a bar, sees two tables and asks... 'Can I join you?'", emoji: "🍺" },
  { text: "The code is being assembled... OH WHAT A BEAUTIFUL COMPONENT STRUCTURE!", emoji: "⚽" },
  { text: "Currently converting caffeine into code... Standard operating procedure! ☕", emoji: "💻" },
  { text: "Plot twist: Your app is more patient than you are right now 😅", emoji: "⏳" },
  { text: "Let that UI marinate for a few more seconds... perfection takes time!", emoji: "🥘" },
  { text: "We're in the final stretch now! The CSS is looking IMMACULATE!", emoji: "🏆" },
  { text: "This app is going to be a SLAM DUNK! The crowd goes wild! 🎺", emoji: "🏀" },
  { text: "Deploying happiness.exe... No bugs detected (yet)! 🐛", emoji: "🚀" },
  { text: "CSS is like relationships: It's all about the right positioning! 💕", emoji: "💑" },
  { text: "Coming soon to a browser near you: The App You've Been Waiting For!", emoji: "🎥" },
  { text: "Your patience is impressive! You'd make a great developer 💪", emoji: "🌟" },
  { text: "*epic orchestra music* The pixels are aligning... destiny is being written...", emoji: "🎻" },
  { text: "Negotiating with the CSS gods... They demand more !important sacrifices!", emoji: "🙏" },
  { text: "What's a programmer's favorite hangout? Foo Bar! 🍸", emoji: "🎉" },
  { text: "The flexbox is flexing! The grid is gridding! Magic is happening!", emoji: "✨" },
  { text: "Did you drink water today? Stay hydrated, friend! 💧", emoji: "💙" },
  { text: "Previously on 'Building Your App': The AI accepted the challenge...", emoji: "📺" },
  { text: "I told my computer a joke and it said 'ERROR 404: Humor not found'", emoji: "🤖" },
  { text: "Why was the JavaScript developer sad? Because he didn't Node how to Express himself!", emoji: "😢" },
  { text: "A group of flamingos is called a 'flamboyance'... Just like this UI! 🦩", emoji: "💅" },
  { text: "Life hack: This is a great time to stretch. Your back will thank you later!", emoji: "🧘" },
  { text: "Summoning the UI unicorns... They're fashionably late as always! 🦄", emoji: "🌈" },
  { text: "Remember: Rome wasn't built in a day, but they weren't using AI either! 🏛️", emoji: "🤔" },
  { text: "Your app is being built with love, care, and lots of compute power ❤️", emoji: "💖" },
  { text: "Aligning divs that don't want to be aligned... Classic Monday!", emoji: "😤" },
  { text: "Today's special: Fresh components with a side of responsive design! 🍽️", emoji: "👩‍🍳" },
  { text: "The AI has entered the zone! Pure concentration! Pure excellence!", emoji: "🎯" },
  { text: "Fun fact: An octopus has 3 hearts! Your app will only need 1 good design ❤️", emoji: "🐙" },
  { text: "There are only 10 types of people: those who understand binary and those who don't!", emoji: "🤓" },
  { text: "Every pixel is being placed with purpose! Every line of code matters!", emoji: "🎨" },
  { text: "Take a deep breath... Relax... Your app is in good hands! 🙌", emoji: "😌" },
];

// Clean code to remove any text before HTML and after closing tag
const cleanHtmlCode = (rawCode: string): string => {
  if (!rawCode) return '';

  let code = rawCode.trim();

  // Remove markdown code blocks if present
  code = code.replace(/```html\s*/gi, '').replace(/```\s*/g, '');

  // Find the start of actual HTML content
  const doctypeIndex = code.indexOf('<!DOCTYPE');
  const htmlOpenIndex = code.indexOf('<html');
  const headIndex = code.indexOf('<head');
  const bodyIndex = code.indexOf('<body');

  // Find the earliest valid HTML start
  let startIndex = -1;
  if (doctypeIndex !== -1) startIndex = doctypeIndex;
  else if (htmlOpenIndex !== -1) startIndex = htmlOpenIndex;
  else if (headIndex !== -1) startIndex = headIndex;
  else if (bodyIndex !== -1) startIndex = bodyIndex;

  // If we found HTML start after position 0, strip everything before it
  if (startIndex > 0) {
    code = code.slice(startIndex);
  }

  // Find the end of HTML content and strip anything after
  const closingHtmlIndex = code.lastIndexOf('</html>');
  if (closingHtmlIndex !== -1) {
    code = code.slice(0, closingHtmlIndex + 7);
  }

  return code.trim();
};

/**
 * Inject console capture and error handling into HTML code
 * This allows us to capture console.log, errors, etc. from the sandbox
 */
const injectSandboxBridge = (html: string): string => {
  const bridgeScript = `
<script>
(function() {
  // Suppress known production warnings from CDN libraries
  var _suppressPatterns = [
    'cdn.tailwindcss.com should not be used in production',
    'cdn.tailwindcss.com',
    'tailwindcss.com/docs/installation'
  ];
  function _isSuppressed(args) {
    var msg = args.map(function(a) { return String(a); }).join(' ');
    return _suppressPatterns.some(function(p) { return msg.indexOf(p) !== -1; });
  }

  // Capture console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };
  
  const sendToParent = (type, args) => {
    try {
      parent.postMessage({
        type: 'sandbox-console',
        data: { type, args: args.map(a => String(a)), timestamp: Date.now() }
      }, '*');
    } catch (e) {}
  };
  
  console.log = (...args) => { originalConsole.log(...args); sendToParent('log', args); };
  console.warn = (...args) => { if (!_isSuppressed(args)) { originalConsole.warn(...args); sendToParent('warn', args); } };
  console.error = (...args) => { originalConsole.error(...args); sendToParent('error', args); };
  console.info = (...args) => { originalConsole.info(...args); sendToParent('info', args); };
  
  // Capture uncaught errors
  window.onerror = (msg, url, line, col, error) => {
    sendToParent('error', [\`Error: \${msg} at line \${line}:\${col}\`]);
    return false;
  };
  
  // Capture unhandled promise rejections
  window.onunhandledrejection = (e) => {
    sendToParent('error', [\`Unhandled Promise: \${e.reason}\`]);
  };
  
  // Prevent link navigation - keep everything inside the sandbox
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (link && link.href) {
      var href = link.getAttribute('href') || '';
      // Allow anchor links (href="#section")
      if (href.startsWith('#')) return;
      // Block all other navigation (absolute URLs, relative paths, etc.)
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  
  // Notify parent that sandbox is ready
  parent.postMessage({ type: 'sandbox-ready' }, '*');
})();
</script>`;

  // Insert bridge script right after <head> or at the start of <body>
  if (html.includes('<head>')) {
    return html.replace('<head>', '<head>' + bridgeScript);
  } else if (html.includes('<head ')) {
    return html.replace(/<head\s[^>]*>/, (match) => match + bridgeScript);
  } else if (html.includes('<body>')) {
    return html.replace('<body>', '<body>' + bridgeScript);
  } else if (html.includes('<body ')) {
    return html.replace(/<body\s[^>]*>/, (match) => match + bridgeScript);
  } else {
    // Fallback: prepend to code
    return bridgeScript + html;
  }
};

const Preview: React.FC<PreviewProps> = ({ code, isBuilding, buildMessage, onOpenEditor, onOpenSandbox, isDarkMode = true, previewUrl }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [commentaryIndex, setCommentaryIndex] = useState(() => Math.floor(Math.random() * BUILD_COMMENTARY.length));

  // Rotate fun commentary every 4 seconds while building
  useEffect(() => {
    if (!isBuilding) return;
    setCommentaryIndex(Math.floor(Math.random() * BUILD_COMMENTARY.length));
    const interval = setInterval(() => {
      setCommentaryIndex(prev => (prev + 1) % BUILD_COMMENTARY.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isBuilding]);

  // Clean the code before rendering
  const cleanedCode = useMemo(() => cleanHtmlCode(code), [code]);

  // Create sandboxed HTML with bridge injected
  const sandboxedHtml = useMemo(() => {
    if (!cleanedCode) return '';
    return injectSandboxBridge(cleanedCode);
  }, [cleanedCode]);

  // Listen for messages from sandbox
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'sandbox-console') {
        setConsoleMessages(prev => [...prev.slice(-99), event.data.data]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Clear console when code changes
  useEffect(() => {
    setConsoleMessages([]);
    // Force iframe refresh by changing key
    setIframeKey(prev => prev + 1);
  }, [cleanedCode]);

  const handleRefresh = useCallback(() => {
    setConsoleMessages([]);
    setIframeKey(prev => prev + 1);
  }, []);

  if (!code) {
    // Show building animation when agent is generating from chat
    if (isBuilding) {
      return (
        <div className={`flex flex-col items-center justify-center h-full ${isDarkMode ? 'bg-black/40 border-cyan-500/30' : 'bg-gray-50 border-cyan-400/30'} border-2 border-dashed rounded-lg m-4 relative overflow-hidden`}>
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`absolute rounded-full ${i % 3 === 0 ? 'w-1 h-1 bg-cyan-500/40' : i % 3 === 1 ? 'w-1.5 h-1.5 bg-purple-500/30' : 'w-1 h-1 bg-pink-500/20'}`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 3}s`
                }}
              />
            ))}
          </div>

          {/* Building animation spinner */}
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-purple-500/20 rounded-full"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-cyan-400 border-r-purple-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-b-pink-500 border-l-emerald-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl animate-bounce" style={{ animationDuration: '0.8s' }}>{BUILD_COMMENTARY[commentaryIndex].emoji}</span>
            </div>
          </div>

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-full">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Nova is Building</span>
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></span>
          </div>

          {/* Build progress message */}
          <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4 animate-pulse">
            {buildMessage || 'Creating your app...'}
          </p>

          {/* Fun rotating commentary with speech bubble */}
          <div className="relative max-w-xs mx-4">
            <div className={`relative ${isDarkMode ? 'bg-gradient-to-r from-gray-800/60 to-gray-900/60 border-gray-700/50' : 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200'} rounded-2xl p-4 border shadow-lg`}>
              <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 ${isDarkMode ? 'bg-gray-800/60 border-l border-t border-gray-700/50' : 'bg-gray-100 border-l border-t border-gray-200'} rotate-45`}></div>
              <p className={`text-sm leading-relaxed text-center transition-opacity duration-500 ${isDarkMode ? 'text-canvas-text' : 'text-gray-600'}`}>
                {BUILD_COMMENTARY[commentaryIndex].text}
              </p>
            </div>
          </div>

          {/* Animated progress bar */}
          <div className={`mt-6 w-48 h-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full"
              style={{ animation: 'progressPulse 2s ease-in-out infinite', width: '60%' }}
            />
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                style={{
                  animation: 'bounce 1s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
              50% { transform: translateY(-15px) scale(1.3); opacity: 0.6; }
            }
            @keyframes progressPulse {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(50%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      );
    }

    return (
      <div className={`relative flex flex-col items-center justify-center h-full ${isDarkMode ? 'text-canvas-muted-deep bg-black/40 border-gray-800' : 'text-canvas-muted bg-gray-50 border-gray-300'} border-2 border-dashed rounded-lg m-4 overflow-hidden`}>
        <style>{`
          .maula-rainbow-art {
            background: linear-gradient(
              135deg,
              #ff006680, #ff4d0080, #ff990080,
              #ffcc0080, #66ff0080, #00ff6680,
              #00ffcc80, #0099ff80, #0033ff80,
              #6600ff80, #cc00ff80, #ff006680
            );
            background-size: 400% 400%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: rainbowShift 8s ease infinite;
          }
          @keyframes rainbowShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        {/* ASCII Art Background — Skull + MAULA braille art (auto-scales to fit) */}
        <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden p-4" aria-hidden="true">
          <pre className="font-mono whitespace-pre leading-none maula-rainbow-art" style={{ fontSize: 'min(1.6vw, 1.8vh)', lineHeight: '1.15' }}>{`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⣶⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢰⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣶⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢻⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⣧⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣿⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣼⣿⣧⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⣿⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣄⠈⠙⢿⣷⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣴⠾⠋⢸⠀⠄⠀⡏⠙⠳⣦⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣴⡿⠟⠉⢀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣦⣀⠈⠙⠛⠷⣦⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠠⠀⡇⠀⠀⠀⠀⠀⠀⠀⢀⣀⣠⣤⣤⡶⠟⠛⠁⢀⣤⣾⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠿⢶⣤⣤⣄⣀⣈⠉⠉⠛⠻⣷⣦⡄⠀⠀⢸⠀⠐⠀⡇⠀⠀⢀⣤⣶⠿⠛⠋⠉⢉⣀⣠⣤⣤⣶⠾⠛⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠱⣦⣤⣀⣀⠈⠉⠙⠛⠛⠛⠳⢤⠈⢻⣿⠄⠀⢸⠀⢈⠀⡇⠀⠀⣾⣿⠃⣠⠖⠛⠛⠛⠋⠉⠉⢀⣀⣤⣤⠖⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠿⠻⠟⠿⠛⠶⢦⣄⠀⢁⣾⡟⠀⠀⢸⠀⠂⠀⡇⠀⠀⠹⣿⡆⠀⢠⡤⠶⠾⠛⠿⠻⠟⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠢⣤⣤⣤⡤⠤⠤⣤⡈⠀⣾⡏⠀⠀⠀⢸⠀⡐⠀⡇⠀⠀⠀⠘⣿⡆⢁⣠⠤⠤⠤⣤⣤⣤⠴⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢁⣀⣀⣀⣀⡀⠈⣿⠅⠀⠀⠀⢸⠀⢀⠀⡇⠀⠀⠀⠀⣿⡇⠀⣀⣀⣀⣀⡈⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠉⣉⡀⠹⡇⠀⠀⠀⢸⠀⠂⠀⡇⠀⠀⠀⢀⡿⢀⣈⡉⠉⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠆⠙⠄⠀⠀⢸⠀⠐⠀⡇⠀⠀⠀⠈⠠⠞⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠌⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⡀⠄⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⣂⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣤⣄⠀⢀⡘⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⣿⢻⡿⢠⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣶⣶⡄⢠⣶⣶⡄⠀⣶⣶⣶⡄⠀⢰⣶⣦⢰⣶⣶⠀⣶⣶⡦⠀⠀⠀⢠⣿⡿⠃⠀⣰⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⡿⣿⡿⢻⣿⠀⠀⣼⣏⣿⣧⠀⠀⣿⡇⠀⣿⡇⠀⢸⣿⠀⠀⠀⢠⣿⡿⠁⠀⣼⣿⠏⣴⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣧⠙⢡⣼⣯⡄⣼⣿⡍⣽⣿⣤⠀⣿⣧⣤⣿⡇⠀⣼⣿⣤⣼⣷⣿⣿⡅⠀⣼⣿⡏⠀⠘⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠛⠁⠘⠛⠛⠃⠛⠛⠃⠛⠛⠛⠀⠉⠛⠛⠋⠁⠈⠛⠛⠛⠛⠋⠘⢿⣿⣿⡿⠟⠀⠀⠀⠹⣿⡷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
`}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${isDarkMode ? 'bg-canvas-card' : 'bg-white'} shadow-sm overflow-hidden flex flex-col`}>
      <div className={`flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-black/60 border-gray-800 text-canvas-muted-deep' : 'bg-gray-100 border-gray-200 text-canvas-muted'} border-b text-xs`}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
        </div>
        <div className={`flex-1 text-center font-mono ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} opacity-80 truncate tracking-wider text-[10px] ${previewUrl ? 'lowercase' : 'uppercase'}`}>
          {previewUrl || 'appview.sanbayfusion.com'}
        </div>

        {/* Editor & Sandbox Buttons - Only show when there's code */}
        {cleanedCode && (
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-canvas-muted hover:text-emerald-400 bg-black/40 hover:bg-emerald-500/10 border-gray-700 hover:border-emerald-500/30' : 'text-canvas-muted-deep hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 border-gray-300 hover:border-emerald-400/30'} border rounded-lg transition-all`}
              title="Refresh Preview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Console Toggle */}
            <button
              onClick={() => setShowConsole(!showConsole)}
              className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg border ${showConsole
                ? isDarkMode ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' : 'text-cyan-600 bg-cyan-50 border-cyan-400/30'
                : isDarkMode ? 'text-canvas-muted hover:text-cyan-400 bg-black/40 hover:bg-cyan-500/10 border-gray-700 hover:border-cyan-500/30' : 'text-canvas-muted-deep hover:text-cyan-600 bg-gray-50 hover:bg-cyan-50 border-gray-300 hover:border-cyan-400/30'
                }`}
              title="Toggle Console"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {consoleMessages.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[8px] bg-cyan-500/20 rounded-full">{consoleMessages.length}</span>
              )}
            </button>

            {/* Open in Editor (VS Code style) */}
            {onOpenEditor && (
              <button
                onClick={onOpenEditor}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-canvas-muted hover:text-cyan-400 bg-black/40 hover:bg-cyan-500/10 border-gray-700 hover:border-cyan-500/30' : 'text-canvas-muted-deep hover:text-cyan-600 bg-gray-50 hover:bg-cyan-50 border-gray-300 hover:border-cyan-400/30'} border rounded-lg transition-all`}
                title="Open in Editor"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Editor
              </button>
            )}

            {/* Open in Sandbox (CodeSandbox style) */}
            {onOpenSandbox && (
              <button
                onClick={onOpenSandbox}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-canvas-muted hover:text-purple-400 bg-black/40 hover:bg-purple-500/10 border-gray-700 hover:border-purple-500/30' : 'text-canvas-muted-deep hover:text-purple-600 bg-gray-50 hover:bg-purple-50 border-gray-300 hover:border-purple-400/30'} border rounded-lg transition-all`}
                title="Open in CodeSandbox"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 6l10.455-6L22.91 6 23 17.95 12.455 24 2 18V6zm2.088 2.481v4.757l3.345 1.86v3.516l3.972 2.296v-8.272L4.088 8.481zm16.739 0l-7.317 4.157v8.272l3.972-2.296V15.1l3.345-1.861V8.48zM5.134 6.601l7.303 4.144 7.32-4.18-3.871-2.197-3.41 1.945-3.43-1.968L5.133 6.6z" />
                </svg>
                Sandbox
              </button>
            )}
          </div>
        )}
      </div>

      {/* Preview iframe with srcdoc (secure sandbox) */}
      <div className="flex-1 relative">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          title="App Preview"
          className="w-full h-full border-none bg-white"
          srcDoc={sandboxedHtml}
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
        />
      </div>

      {/* Console Panel */}
      {showConsole && (
        <div className={`h-40 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t flex flex-col`}>
          <div className={`flex items-center justify-between px-3 py-1.5 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-b`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'}`}>Console</span>
            <button
              onClick={() => setConsoleMessages([])}
              className={`text-[10px] ${isDarkMode ? 'text-canvas-muted-deep hover:text-canvas-text' : 'text-canvas-muted hover:text-gray-600'} transition-colors`}
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
            {consoleMessages.length === 0 ? (
              <div className="text-canvas-muted-deep text-center py-4">No console output</div>
            ) : (
              consoleMessages.map((msg, i) => (
                <div key={i} className={`px-2 py-1 rounded ${msg.type === 'error' ? 'bg-primary-500/10 text-primary-400' :
                  msg.type === 'warn' ? 'bg-yellow-500/10 text-yellow-400' :
                    msg.type === 'info' ? 'bg-blue-500/10 text-blue-400' :
                      isDarkMode ? 'bg-gray-800 text-canvas-text' : 'bg-gray-100 text-gray-600'
                  }`}>
                  <span className="opacity-50 mr-2">[{msg.type}]</span>
                  {msg.args.join(' ')}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Preview;
