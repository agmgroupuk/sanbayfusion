import React from 'react';

interface OverlayProps {
  active: boolean;
  onActivate: () => void;
  agentName?: string;
}

const Overlay: React.FC<OverlayProps> = ({ active, onActivate, agentName = 'Neural Companion' }) => {
  // Create a friendly greeting based on agent name
  const getButtonText = () => {
    if (!agentName || agentName === 'Neural Companion') {
      return 'ACTIVATE SYSTEM';
    }
    return `Meet ${agentName}`;
  };

  return (
    <div
      className={`fixed inset-0 bg-[#080808] z-[150] flex flex-col overflow-hidden transition-all duration-[1200ms] will-change-transform ${active ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.7, 0, 0.3, 1)' }}
    >
      {/* Visual shutter bottom edge shadow/glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/20 shadow-[0_5px_15px_rgba(16,185,129,0.3)]"></div>

      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(16,185,129,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.2)_1px,transparent_1px)] bg-[length:40px_40px]"></div>

      <div className="flex-1 overflow-hidden flex flex-col items-center justify-center relative z-10 px-2 sm:px-8 md:px-16 py-2 sm:py-4 min-h-0 h-full max-h-screen">
        <div className="w-full max-w-[100vw] mb-4 sm:mb-6 flex justify-center overflow-hidden flex-shrink min-h-0 px-2 sm:px-6">
          <pre
            className="font-mono select-none whitespace-pre inline-block leading-tight w-full text-center"
            style={{
              fontSize: 'clamp(3px, 1.1vw, 12px)',
              letterSpacing: 'clamp(0.02em, 0.1vw, 0.1em)',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 25%, #8b5cf6 50%, #ec4899 75%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.4)) drop-shadow(0 0 20px rgba(6,182,212,0.15)) drop-shadow(2px 4px 6px rgba(0,0,0,0.8))',
            }}
          >

{`   ▄▄▄▄███▄▄▄▄      ▄████████ ███    █▄   ▄█          ▄████████         ▄████████  ▄█  
 ▄██▀▀▀███▀▀▀██▄   ███    ███ ███    ███ ███         ███    ███        ███    ███ ███  
 ███   ███   ███   ███    ███ ███    ███ ███         ███    ███        ███    ███ ███▌ 
 ███   ███   ███   ███    ███ ███    ███ ███         ███    ███        ███    ███ ███▌ 
 ███   ███   ███ ▀███████████ ███    ███ ███       ▀███████████      ▀███████████ ███▌ 
 ███   ███   ███   ███    ███ ███    ███ ███         ███    ███        ███    ███ ███  
 ███   ███   ███   ███    ███ ███    ███ ███▌    ▄   ███    ███        ███    ███ ███  
  ▀█   ███   █▀    ███    █▀  ████████▀  █████▄▄██   ███    █▀         ███    █▀  █▀   
                                         ▀                                             `}

          </pre>
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-200 text-center tracking-tight flex-shrink-0" style={{ textShadow: '0 0 30px rgba(16,185,129,0.2)' }}>
          <span className="text-green-400 glow-green">One Last</span>
          <span className="text-cyan-400 glow-cyan ml-3 sm:ml-4">AI</span>
        </h1>
        <p className="text-gray-500 mt-3 sm:mt-4 italic font-mono text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.3em] sm:tracking-[0.5em] animate-pulse flex-shrink-0">
          AI Digital Friend Zone
        </p>

        <div className="mt-5 sm:mt-8 relative flex-shrink-0">
          <button
            onClick={onActivate}
            className="relative group bg-black/40 overflow-hidden border border-emerald-500/50 px-10 sm:px-16 py-4 sm:py-5 rounded-sm transition-all hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] active:scale-95"
          >
            <div className="absolute inset-0 bg-emerald-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative text-emerald-400 font-bold tracking-[0.2em] sm:tracking-[0.3em] group-hover:text-white transition-colors text-sm sm:text-base uppercase">
              {getButtonText()}
            </span>
          </button>

          {/* Decorative bracket lines for button */}
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-900/40"></div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-900/40"></div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-3 sm:gap-4 flex-shrink-0">
          <a
            href="https://sanbayfusion.com/home"
            className="group bg-black/30 border border-gray-700/50 px-4 sm:px-6 py-2.5 sm:py-3 rounded-sm transition-all hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-95"
          >
            <span className="text-gray-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.15em] group-hover:text-emerald-400 transition-colors">🏠 Home</span>
          </a>
          <a
            href="https://sanbayfusion.com/agents"
            className="group bg-black/30 border border-gray-700/50 px-4 sm:px-6 py-2.5 sm:py-3 rounded-sm transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] active:scale-95"
          >
            <span className="text-gray-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.15em] group-hover:text-cyan-400 transition-colors">🤖 Agents</span>
          </a>
          <a
            href="https://sanbayfusion.com/lab"
            className="group bg-black/30 border border-gray-700/50 px-4 sm:px-6 py-2.5 sm:py-3 rounded-sm transition-all hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] active:scale-95"
          >
            <span className="text-gray-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.15em] group-hover:text-amber-400 transition-colors">🧪 Lab</span>
          </a>
          <a
            href="https://sanbayfusion.com/tools"
            className="group bg-black/30 border border-gray-700/50 px-4 sm:px-6 py-2.5 sm:py-3 rounded-sm transition-all hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.1)] active:scale-95"
          >
            <span className="text-gray-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.15em] group-hover:text-pink-400 transition-colors">🛠️ Tools</span>
          </a>
          <a
            href="https://spaces.sanbayfusion.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-black/30 border border-gray-700/50 px-4 sm:px-6 py-2.5 sm:py-3 rounded-sm transition-all hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)] active:scale-95"
          >
            <span className="text-gray-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.15em] group-hover:text-purple-400 transition-colors">🚀 AI Spaces</span>
          </a>
        </div>

        <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-4 sm:gap-16 text-[8px] sm:text-[10px] text-gray-600 font-mono uppercase tracking-widest flex-shrink-0">
          <div className="text-center group">
            <div className="text-emerald-900 group-hover:text-emerald-500 transition-colors mb-1">SECURE_LINK</div>
            <div className="font-bold">[OK]</div>
          </div>
          <div className="text-center group">
            <div className="text-emerald-900 group-hover:text-emerald-500 transition-colors mb-1">CORE_LOAD</div>
            <div className="font-bold">[READY]</div>
          </div>
          <div className="text-center group">
            <div className="text-emerald-900 group-hover:text-emerald-500 transition-colors mb-1">UPLINK_UP</div>
            <div className="font-bold text-cyan-500">[ACTIVE]</div>
          </div>
        </div>

        {/* Sub-labeling at the bottom */}
        <div className="mt-3 sm:mt-4 text-[7px] sm:text-[8px] text-gray-800 font-mono uppercase tracking-[0.3em] sm:tracking-[1em] opacity-30 flex-shrink-0">
          Authorized Access Only // Terminal ID: 0xFF2A
        </div>
      </div>
    </div>
  );
};

export default Overlay;
