
import React from 'react';
import RainCanvas from './RainCanvas';

interface OverlayProps {
  active: boolean;
  onActivate: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ active, onActivate }) => {
  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] will-change-transform ${active ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
      style={{ backgroundColor: '#020408', backgroundImage: 'url(/storm-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center center', backgroundRepeat: 'no-repeat' }}
    >
      {/* Animated CSS */}
      <style>{`
        @keyframes ov-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes ov-glow-pulse {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.08); }
        }
        @keyframes ov-fadein {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ov-breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes ov-drop-ripple {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.3; }
          100% { transform: scale(0.8); opacity: 0.6; }
        }
        @keyframes launchPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(249,115,22,0.3), 0 0 40px rgba(249,115,22,0.1), inset 0 0 15px rgba(249,115,22,0.05); }
          50% { box-shadow: 0 0 25px rgba(249,115,22,0.6), 0 0 60px rgba(249,115,22,0.25), inset 0 0 25px rgba(249,115,22,0.1); }
        }
        @keyframes launchBorder {
          0%, 100% { border-color: rgba(249,115,22,0.4); }
          50% { border-color: rgba(249,115,22,0.9); }
        }
        @keyframes launchText {
          0%, 100% { text-shadow: 0 0 8px rgba(249,115,22,0.4); }
          50% { text-shadow: 0 0 20px rgba(249,115,22,0.8), 0 0 40px rgba(249,115,22,0.3); }
        }
        @keyframes sweepLight {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(300%) skewX(-15deg); }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .ov-stagger-1 { animation: ov-fadein 0.8s ease-out 0.2s both; }
        .ov-stagger-2 { animation: ov-fadein 0.8s ease-out 0.4s both; }
        .ov-stagger-3 { animation: ov-fadein 0.8s ease-out 0.6s both; }
        .ov-stagger-4 { animation: ov-fadein 0.8s ease-out 0.8s both; }
        .ov-stagger-5 { animation: ov-fadein 0.8s ease-out 1.0s both; }
        .ov-stagger-6 { animation: ov-fadein 0.8s ease-out 1.2s both; }
      `}</style>

      {/* Rain effect — heavy mode for big prominent drops */}
      <RainCanvas isActive={active} intensity="heavy" />



      {/* Main content — above rain */}
      <div className="max-w-2xl w-full flex flex-col items-center relative z-[10]" style={{ background: 'none', backdropFilter: 'none' }}>

        {/* ASCII Art */}
        <div className="w-full overflow-hidden mb-5 flex justify-center ov-stagger-1">
          <pre className="text-[7px] sm:text-[9px] md:text-[11px] lg:text-[13px] leading-tight text-center font-mono select-none whitespace-pre"
            style={{ color: '#fb923c', textShadow: '0 0 20px rgba(249,115,22,0.5), 0 0 50px rgba(249,115,22,0.2), 0 0 100px rgba(249,115,22,0.1)', background: 'none', border: 'none', padding: 0 }}>
            {` ███▄ ▄███▓ ▄▄▄       █    ██  ██▓    ▄▄▄          ▄▄▄       ██▓
▓██▒▀█▀ ██▒▒████▄     ██  ▓██▒▓██▒   ▒████▄       ▒████▄    ▓██▒
▓██    ▓██░▒██  ▀█▄  ▓██  ▒██░▒██░   ▒██  ▀█▄     ▒██  ▀█▄  ▒██▒
▒██    ▒██ ░██▄▄▄▄██ ▓▓█  ░██░▒██░   ░██▄▄▄▄██    ░██▄▄▄▄██ ░██░
▒██▒   ░██▒ ▓█   ▓██▒▒▒█████▓ ░██████▒▓█   ▓██▒    ▓█   ▓██▒░██░
░ ▒░   ░  ░ ▒▒   ▓▒█░░▒▓▒ ▒ ▒ ░ ▒░▓  ░▒▒   ▓▒█░    ▒▒   ▓▒█░░▓  
░  ░      ░  ▒   ▒▒ ░░░▒░ ░ ░ ░ ░ ▒  ░ ▒   ▒▒ ░     ▒   ▒▒ ░ ▒ ░
░      ░     ░   ▒    ░░░ ░ ░   ░ ░    ░   ▒        ░   ▒    ▒ ░
       ░         ░  ░   ░         ░  ░     ░  ░         ░  ░ ░`}
          </pre>
        </div>

        {/* Subtitle: Maula Editor */}
        <div className="ov-stagger-1 mb-6">
          <span className="text-[11px] sm:text-sm font-mono uppercase tracking-[0.5em] text-gray-500 font-bold">Maula Editor</span>
        </div>

        {/* Title */}
        <div className="ov-stagger-2 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #f97316, #fb923c, #fbbf24)' }}>One Last</span>
            <span className="bg-clip-text text-transparent ml-3" style={{ backgroundImage: 'linear-gradient(135deg, #a855f7, #c084fc, #e879f9)' }}>AI</span>
          </h1>
          <div className="mt-3 h-[2px] mx-auto w-40 sm:w-56" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.6), rgba(168,85,247,0.5), transparent)' }} />
        </div>

        {/* Tagline */}
        <p className="ov-stagger-3 text-gray-400 mt-4 font-mono text-[10px] sm:text-xs uppercase tracking-[0.4em]">
          AI Digital Friend Zone
        </p>

        {/* Launch button */}
        <div className="mt-8 mb-5 ov-stagger-4 flex flex-col items-center">
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute -inset-1 rounded-md bg-orange-500/10" style={{ animation: 'launchPulse 2.5s ease-in-out infinite' }} />
            {/* Corner accents */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-orange-400" style={{ animation: 'cornerPulse 2s ease-in-out infinite' }} />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-orange-400" style={{ animation: 'cornerPulse 2s ease-in-out infinite 0.5s' }} />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-orange-400" style={{ animation: 'cornerPulse 2s ease-in-out infinite 1s' }} />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-orange-400" style={{ animation: 'cornerPulse 2s ease-in-out infinite 1.5s' }} />

            <button
              onClick={onActivate}
              className="relative overflow-hidden border-2 rounded-md px-6 py-2.5 bg-black/50 text-orange-400 font-bold font-mono text-xs tracking-[0.25em] uppercase transition-all hover:text-white hover:bg-orange-500/20 active:scale-95 cursor-pointer"
              style={{
                animation: 'launchBorder 2.5s ease-in-out infinite, launchText 2.5s ease-in-out infinite',
              }}
            >
              {/* Sweeping light effect */}
              <div
                className="absolute inset-0 w-[30%] bg-gradient-to-r from-transparent via-orange-400/20 to-transparent pointer-events-none"
                style={{ animation: 'sweepLight 3s ease-in-out infinite' }}
              />
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-sm">💻</span>
                Open Maula
              </span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2.5 ov-stagger-5">
          {[
            { label: 'Canvas Studio', icon: '🎨', href: 'https://studio.sanbayfusion.com', color: 'border-cyan-500/40 text-cyan-400 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]' },
            { label: 'AI Space', icon: '🚀', href: 'https://canvas.sanbayfusion.com', color: 'border-violet-500/40 text-violet-400 hover:border-violet-400 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]' },
            { label: 'Tools', icon: '🔧', href: 'https://sanbayfusion.com/tools', color: 'border-amber-500/40 text-amber-400 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
            { label: 'AI Lab', icon: '🧪', href: 'https://sanbayfusion.com/lab', color: 'border-emerald-500/40 text-emerald-400 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
            { label: 'Agents', icon: '🤖', href: 'https://sanbayfusion.com/agents', color: 'border-pink-500/40 text-pink-400 hover:border-pink-400 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]' },
          ].map((nav) => (
            <a
              key={nav.label}
              href={nav.href}
              className={`flex items-center gap-2 px-4 py-2 bg-black/30 border rounded-sm font-mono text-xs font-bold tracking-[0.15em] uppercase transition-all hover:bg-black/50 active:scale-95 ${nav.color}`}
            >
              <span>{nav.icon}</span>
              {nav.label}
            </a>
          ))}
        </div>

        {/* Status indicators */}
        <div className="mt-10 flex items-center gap-6 sm:gap-10 ov-stagger-6">
          {[
            { label: 'AI ENGINE', status: 'OK', color: '#22c55e' },
            { label: 'CODE SYS', status: 'READY', color: '#f97316' },
            { label: 'DEPLOY', status: 'ACTIVE', color: '#a855f7' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-gray-500">{s.label}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}, 0 0 20px ${s.color}40`, animation: 'ov-breathe 2.5s ease-in-out infinite' }} />
                <span className="text-[9px] sm:text-[10px] font-mono font-bold" style={{ color: s.color }}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] z-[10]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.25), rgba(168,85,247,0.25), transparent)' }} />
      <div className="absolute bottom-4 text-[8px] text-gray-600 font-mono uppercase tracking-[0.6em] z-[10]">
        OneLast AI  ·  Maula Editor v2.0
      </div>
    </div>
  );
};

export default Overlay;
