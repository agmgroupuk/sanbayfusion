
import React, { useEffect, useState, useRef } from 'react';

interface OverlayProps {
  active: boolean;
  onActivate: () => void;
  agentName?: string;
}

// Glass-style SVG icons (outline/skeleton style)
const GLASS_ICONS = {
  home: (color: string) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  agents: (color: string) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <circle cx="9" cy="10" r="2"/>
      <circle cx="15" cy="10" r="2"/>
      <path d="M9 16h6"/>
    </svg>
  ),
  canvas: (color: string) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      <path d="M2 2l7.586 7.586"/>
      <circle cx="11" cy="11" r="2"/>
    </svg>
  ),
  studio: (color: string) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  tools: (color: string) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  labs: (color: string) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6v5l4 9H5l4-9V3z"/>
      <path d="M10 3v5"/>
      <path d="M14 3v5"/>
      <circle cx="8" cy="15" r="1"/>
      <circle cx="12" cy="13" r="1"/>
      <circle cx="15" cy="16" r="1"/>
    </svg>
  ),
};

// Quick nav items - 6 buttons with consistent labels
const NAV_ITEMS = [
  { label: 'HOME PAGE', iconKey: 'home', href: 'https://sanbayfusion.com/home' },
  { label: '18 AGENTS', iconKey: 'agents', href: 'https://sanbayfusion.com/agents' },
  { label: 'CANVAS APP', iconKey: 'canvas', href: 'https://canvas.sanbayfusion.com' },
  { label: 'STUDIO APP', iconKey: 'studio', href: 'https://studio.sanbayfusion.com' },
  { label: 'ALL TOOLS', iconKey: 'tools', href: 'https://sanbayfusion.com/tools' },
  { label: 'AI LABS', iconKey: 'labs', href: 'https://sanbayfusion.com/lab' },
];

const Overlay: React.FC<OverlayProps> = ({ active, onActivate, agentName = 'Neural Companion' }) => {
  const [bootPhase, setBootPhase] = useState(0);
  const [systemReady, setSystemReady] = useState(false);
  const [borderRotation, setBorderRotation] = useState(0);
  const [activeButtonIndex, setActiveButtonIndex] = useState(0);
  const [activeLetterIndex, setActiveLetterIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Colors for forward and reverse direction
  const FORWARD_COLOR = '#ef4444'; // Red
  const REVERSE_COLOR = '#3b82f6'; // Blue

  // Boot sequence
  useEffect(() => {
    if (active) {
      const phases = [100, 300, 500, 800, 1200, 1600, 2000];
      phases.forEach((delay, i) => {
        setTimeout(() => setBootPhase(i + 1), delay);
      });
      setTimeout(() => setSystemReady(true), 2200);
    } else {
      setBootPhase(0);
      setSystemReady(false);
    }
  }, [active]);

  // Border rotation animation - continuous spin (slowed down)
  useEffect(() => {
    if (!active) return;
    const rotationInterval = setInterval(() => {
      setBorderRotation((prev) => (prev + 2) % 360);
    }, 30); // Slower smooth rotation
    return () => clearInterval(rotationInterval);
  }, [active]);

  // Letter-by-letter sequence animation
  useEffect(() => {
    if (!active) return;
    
    const letterInterval = setInterval(() => {
      setActiveLetterIndex((prevLetter) => {
        const currentLabel = NAV_ITEMS[activeButtonIndex].label;
        
        // If we've shown all letters in current button
        if (prevLetter >= currentLabel.length - 1) {
          // Move to next/previous button based on direction
          setActiveButtonIndex((prevButton) => {
            if (direction === 'forward') {
              if (prevButton >= NAV_ITEMS.length - 1) {
                // Reached end, switch to reverse
                setDirection('reverse');
                return NAV_ITEMS.length - 1;
              }
              return prevButton + 1;
            } else {
              if (prevButton <= 0) {
                // Reached start, switch to forward
                setDirection('forward');
                return 0;
              }
              return prevButton - 1;
            }
          });
          return 0; // Reset letter index
        }
        return prevLetter + 1;
      });
    }, 300); // Slower letter change speed
    
    return () => clearInterval(letterInterval);
  }, [active, activeButtonIndex, direction]);

  // Particle/star field animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(3, 3, 4, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${p.alpha})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animationId);
  }, [active]);

  const getButtonText = () => {
    if (!agentName || agentName === 'Neural Companion') {
      return '⚡ INITIALIZE SYSTEM';
    }
    return `⚡ ENGAGE ${agentName.toUpperCase()}`;
  };

  const ASCII_LOGO = `     #####   ##    ##         ##      ##### /    ##       ##### /             ##                   ##              #####  # 
  ######  /#### #####      /####   ######  /  #####    ######  /           /####                /####           ######  /   
 /#   /  /  ##### #####   /  ###  /#   /  /     ##### /#   /  /           /  ###               /  ###          /#   /  /    
/    /  /   # ##  # ##       /## /    /  ##     # ## /    /  /               /##                  /##         /    /  /     
    /  /    #     #         /  ##    /  ###     #        /  /               /  ##                /  ##            /  /      
   ## ##    #     #         /  ##   ##   ##     #       ## ##               /  ##                /  ##           ## ##      
   ## ##    #     #        /    ##  ##   ##     #       ## ##              /    ##              /    ##          ## ##      
   ## ##    #     #        /    ##  ##   ##     #       ## ##              /    ##              /    ##        /### ##      
   ## ##    #     #       /      ## ##   ##     #       ## ##             /      ##            /      ##      / ### ##      
   ## ##    #     ##      /######## ##   ##     #       ## ##             /########            /########         ## ##      
   #  ##    #     ##     /        ## ##  ##     #       #  ##            /        ##          /        ##   ##   ## ##      
      /     #      ##    #        ##  ## #      #          /             #        ##          #        ##  ###   #  /       
  /##/      #      ##   /####      ##  ###      /      /##/           / /####      ##        /####      ##  ###    /        
 /  #####           ## /   ####    ## / #######/      /  ############/ /   ####    ## /     /   ####    ## / #####/         
/     ##              /     ##      #/    ####       /     #########  /     ##      #/     /     ##      #/    ###          
#                     #                              #                #                    #                                
 ##                    ##                             ##               ##                   ##`;

  return (
    <div
      className={`fixed inset-0 bg-[#030304] z-[150] flex flex-col overflow-hidden transition-all duration-[1200ms] will-change-transform ${
        active ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.7, 0, 0.3, 1)' }}
    >
      {/* Particle Canvas Background */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(34,211,238,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.3)_1px,transparent_1px)] bg-[length:50px_50px] animate-grid-scroll" />

      {/* Scan Line Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-scan-line" />
      </div>

      {/* Clean Edge Borders */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/40 to-transparent" />
      <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/40 to-transparent" />





      {/* MAIN CENTER CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-between relative z-10 px-4 py-6 sm:py-8">
        
        {/* ASCII Logo with Glitch Effect */}
        <div className={`order-1 w-full mb-1 flex justify-center overflow-hidden transition-all duration-700 ${bootPhase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          <pre 
            className="text-[5px] xs:text-[6px] sm:text-[8px] md:text-[10px] lg:text-[13px] xl:text-[15px] leading-tight font-mono select-none whitespace-pre animate-rainbow-ascii"
            style={{ 
              letterSpacing: '0.05em',
            }}
          >
            {ASCII_LOGO}
          </pre>
        </div>

        {/* Tagline with Typewriter Effect - smaller */}
        <div className={`order-1 h-5 overflow-hidden transition-all duration-500 ${bootPhase >= 5 ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-gray-400 font-mono text-[10px] sm:text-sm uppercase tracking-[0.3em] animate-typewriter">
            Your AI Crew Awaits
          </p>
        </div>

        {/* Quick Navigation Bar - Mobile: OPEN top, 2+2+2 rows / Desktop: 3+OPEN+3 full-width row */}
        <div className={`order-2 my-4 w-full flex flex-col items-center gap-2 sm:gap-3 transition-all duration-700 ${bootPhase >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* OPEN Button - Always on top for mobile, hidden on desktop (shown inline) */}
          <button
            onClick={onActivate}
            className={`sm:hidden relative group overflow-hidden px-6 py-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${systemReady ? 'opacity-100' : 'opacity-50'}`}
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(16,185,129,0.15) 100%)',
              border: '2px solid rgba(34,211,238,0.6)',
              boxShadow: '0 0 20px rgba(34,211,238,0.3), inset 0 0 20px rgba(34,211,238,0.1)',
            }}
          >
            <div className="absolute inset-0 rounded-lg animate-border-glow" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <span className="relative text-cyan-400 font-bold tracking-[0.15em] group-hover:text-white transition-colors text-sm uppercase flex items-center gap-2">
              <span className="animate-bounce-horizontal">❯</span>
              <span>OPEN</span>
              <span className="animate-bounce-horizontal-reverse">❮</span>
            </span>
          </button>
          
          {/* Mobile Row 1: First 2 buttons */}
          <div className="flex sm:hidden justify-center items-center gap-3">
            {NAV_ITEMS.slice(0, 2).map((item, index) => {
              const isActiveButton = index === activeButtonIndex;
              const currentColor = direction === 'forward' ? FORWARD_COLOR : REVERSE_COLOR;
              const dimColor = '#2a2a3a';
              const isIconLit = direction === 'forward' 
                ? index <= activeButtonIndex 
                : index >= activeButtonIndex;
              
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative py-2 rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 overflow-hidden text-center"
                  style={{ 
                    background: 'rgba(10, 10, 15, 0.8)',
                    width: '95px',
                    minWidth: '95px',
                  }}
                >
                  {isActiveButton && (
                    <div 
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: `conic-gradient(from ${borderRotation}deg, ${currentColor} 0deg, ${currentColor} 90deg, transparent 90deg, transparent 360deg)`,
                        padding: '2px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                      }}
                    />
                  )}
                  {!isActiveButton && (
                    <div className="absolute inset-0 rounded-lg" style={{ border: `2px solid ${isIconLit ? currentColor + '60' : dimColor}` }} />
                  )}
                  <span className="relative flex items-center justify-center gap-1.5 transition-colors font-semibold">
                    <span className="relative overflow-hidden flex items-center justify-center" style={{ opacity: isIconLit ? 1 : 0.4 }}>
                      {GLASS_ICONS[item.iconKey as keyof typeof GLASS_ICONS](isIconLit ? currentColor : dimColor)}
                      {isActiveButton && (
                        <span className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent 0%, ${currentColor}40 50%, transparent 100%)`, animation: 'iconShimmer 1.5s ease-in-out infinite' }} />
                      )}
                    </span>
                    <span className="text-[7px] font-mono tracking-wider flex">
                      {item.label.split('').map((letter, letterIdx) => {
                        const isActiveLetter = isActiveButton ? letterIdx <= activeLetterIndex : isIconLit;
                        return (
                          <span key={letterIdx} style={{ color: isActiveLetter ? currentColor : dimColor, textShadow: isActiveLetter ? `0 0 10px ${currentColor}` : 'none', transition: 'all 0.1s ease' }}>{letter}</span>
                        );
                      })}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
          
          {/* Mobile Row 2: Next 2 buttons */}
          <div className="flex sm:hidden justify-center items-center gap-3">
            {NAV_ITEMS.slice(2, 4).map((item, index) => {
              const actualIndex = index + 2;
              const isActiveButton = actualIndex === activeButtonIndex;
              const currentColor = direction === 'forward' ? FORWARD_COLOR : REVERSE_COLOR;
              const dimColor = '#2a2a3a';
              const isIconLit = direction === 'forward' 
                ? actualIndex <= activeButtonIndex 
                : actualIndex >= activeButtonIndex;
              
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative py-2 rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 overflow-hidden text-center"
                  style={{ 
                    background: 'rgba(10, 10, 15, 0.8)',
                    width: '95px',
                    minWidth: '95px',
                  }}
                >
                  {isActiveButton && (
                    <div 
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: `conic-gradient(from ${borderRotation}deg, ${currentColor} 0deg, ${currentColor} 90deg, transparent 90deg, transparent 360deg)`,
                        padding: '2px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                      }}
                    />
                  )}
                  {!isActiveButton && (
                    <div className="absolute inset-0 rounded-lg" style={{ border: `2px solid ${isIconLit ? currentColor + '60' : dimColor}` }} />
                  )}
                  <span className="relative flex items-center justify-center gap-1.5 transition-colors font-semibold">
                    <span className="relative overflow-hidden flex items-center justify-center" style={{ opacity: isIconLit ? 1 : 0.4 }}>
                      {GLASS_ICONS[item.iconKey as keyof typeof GLASS_ICONS](isIconLit ? currentColor : dimColor)}
                      {isActiveButton && (
                        <span className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent 0%, ${currentColor}40 50%, transparent 100%)`, animation: 'iconShimmer 1.5s ease-in-out infinite' }} />
                      )}
                    </span>
                    <span className="text-[7px] font-mono tracking-wider flex">
                      {item.label.split('').map((letter, letterIdx) => {
                        const isActiveLetter = isActiveButton ? letterIdx <= activeLetterIndex : isIconLit;
                        return (
                          <span key={letterIdx} style={{ color: isActiveLetter ? currentColor : dimColor, textShadow: isActiveLetter ? `0 0 10px ${currentColor}` : 'none', transition: 'all 0.1s ease' }}>{letter}</span>
                        );
                      })}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
          
          {/* Mobile Row 3: Last 2 buttons */}
          <div className="flex sm:hidden justify-center items-center gap-3">
            {NAV_ITEMS.slice(4, 6).map((item, index) => {
              const actualIndex = index + 4;
              const isActiveButton = actualIndex === activeButtonIndex;
              const currentColor = direction === 'forward' ? FORWARD_COLOR : REVERSE_COLOR;
              const dimColor = '#2a2a3a';
              const isIconLit = direction === 'forward' 
                ? actualIndex <= activeButtonIndex 
                : actualIndex >= activeButtonIndex;
              
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative py-2 rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 overflow-hidden text-center"
                  style={{ 
                    background: 'rgba(10, 10, 15, 0.8)',
                    width: '95px',
                    minWidth: '95px',
                  }}
                >
                  {isActiveButton && (
                    <div 
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: `conic-gradient(from ${borderRotation}deg, ${currentColor} 0deg, ${currentColor} 90deg, transparent 90deg, transparent 360deg)`,
                        padding: '2px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                      }}
                    />
                  )}
                  {!isActiveButton && (
                    <div className="absolute inset-0 rounded-lg" style={{ border: `2px solid ${isIconLit ? currentColor + '60' : dimColor}` }} />
                  )}
                  <span className="relative flex items-center justify-center gap-1.5 transition-colors font-semibold">
                    <span className="relative overflow-hidden flex items-center justify-center" style={{ opacity: isIconLit ? 1 : 0.4 }}>
                      {GLASS_ICONS[item.iconKey as keyof typeof GLASS_ICONS](isIconLit ? currentColor : dimColor)}
                      {isActiveButton && (
                        <span className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent 0%, ${currentColor}40 50%, transparent 100%)`, animation: 'iconShimmer 1.5s ease-in-out infinite' }} />
                      )}
                    </span>
                    <span className="text-[7px] font-mono tracking-wider flex">
                      {item.label.split('').map((letter, letterIdx) => {
                        const isActiveLetter = isActiveButton ? letterIdx <= activeLetterIndex : isIconLit;
                        return (
                          <span key={letterIdx} style={{ color: isActiveLetter ? currentColor : dimColor, textShadow: isActiveLetter ? `0 0 10px ${currentColor}` : 'none', transition: 'all 0.1s ease' }}>{letter}</span>
                        );
                      })}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
          
          {/* Desktop row: First 3 buttons + OPEN + Last 3 buttons (full screen width) */}
          <div className="hidden sm:flex justify-stretch items-stretch gap-3 w-full px-4 sm:px-6 lg:px-10 min-h-[80px] sm:min-h-[100px] lg:min-h-[120px]">
            {NAV_ITEMS.slice(0, 3).map((item, index) => {
              const isActiveButton = index === activeButtonIndex;
              const currentColor = direction === 'forward' ? FORWARD_COLOR : REVERSE_COLOR;
              const dimColor = '#2a2a3a';
              const isIconLit = direction === 'forward' 
                ? index <= activeButtonIndex 
                : index >= activeButtonIndex;
              
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative py-4 sm:py-6 rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 overflow-hidden text-center flex-1"
                  style={{ 
                    background: 'rgba(10, 10, 15, 0.8)',
                  }}
                >
                  {isActiveButton && (
                    <div 
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: `conic-gradient(from ${borderRotation}deg, ${currentColor} 0deg, ${currentColor} 90deg, transparent 90deg, transparent 360deg)`,
                        padding: '2px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                      }}
                    />
                  )}
                  {!isActiveButton && (
                    <div className="absolute inset-0 rounded-lg" style={{ border: `2px solid ${isIconLit ? currentColor + '60' : dimColor}` }} />
                  )}
                  <span className="relative flex items-center justify-center gap-2 transition-colors font-semibold">
                    <span className="relative overflow-hidden flex items-center justify-center" style={{ opacity: isIconLit ? 1 : 0.4 }}>
                      {GLASS_ICONS[item.iconKey as keyof typeof GLASS_ICONS](isIconLit ? currentColor : dimColor)}
                      {isActiveButton && (
                        <span className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent 0%, ${currentColor}40 50%, transparent 100%)`, animation: 'iconShimmer 1.5s ease-in-out infinite' }} />
                      )}
                    </span>
                    <span className="text-[9px] sm:text-[11px] lg:text-[13px] font-mono tracking-wider flex">
                      {item.label.split('').map((letter, letterIdx) => {
                        const isActiveLetter = isActiveButton ? letterIdx <= activeLetterIndex : isIconLit;
                        return (
                          <span key={letterIdx} style={{ color: isActiveLetter ? currentColor : dimColor, textShadow: isActiveLetter ? `0 0 10px ${currentColor}` : 'none', transition: 'all 0.1s ease' }}>{letter}</span>
                        );
                      })}
                    </span>
                  </span>
                </a>
              );
            })}
            
            {/* Center OPEN Button - Desktop only (inline, full-width flex) */}
            <button
              onClick={onActivate}
              className={`hidden sm:flex relative group overflow-hidden py-4 sm:py-6 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 flex-1 items-center justify-center ${systemReady ? 'opacity-100' : 'opacity-50'}`}
              style={{
                background: 'linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(16,185,129,0.15) 100%)',
                border: '2px solid rgba(34,211,238,0.6)',
                boxShadow: '0 0 20px rgba(34,211,238,0.3), inset 0 0 20px rgba(34,211,238,0.1)',
              }}
            >
              <div className="absolute inset-0 rounded-lg animate-border-glow" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative text-cyan-400 font-bold tracking-[0.2em] group-hover:text-white transition-colors text-base lg:text-lg uppercase flex items-center gap-3">
                <span className="animate-bounce-horizontal">❯</span>
                <span>OPEN</span>
                <span className="animate-bounce-horizontal-reverse">❮</span>
              </span>
            </button>
            
            {/* Desktop only: Last 3 buttons inline */}
            {NAV_ITEMS.slice(3, 6).map((item, index) => {
              const actualIndex = index + 3;
              const isActiveButton = actualIndex === activeButtonIndex;
              const currentColor = direction === 'forward' ? FORWARD_COLOR : REVERSE_COLOR;
              const dimColor = '#2a2a3a';
              const isIconLit = direction === 'forward' 
                ? actualIndex <= activeButtonIndex 
                : actualIndex >= activeButtonIndex;
              
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex group relative py-4 sm:py-6 rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 overflow-hidden text-center flex-1"
                  style={{ 
                    background: 'rgba(10, 10, 15, 0.8)',
                  }}
                >
                  {isActiveButton && (
                    <div 
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: `conic-gradient(from ${borderRotation}deg, ${currentColor} 0deg, ${currentColor} 90deg, transparent 90deg, transparent 360deg)`,
                        padding: '2px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                      }}
                    />
                  )}
                  {!isActiveButton && (
                    <div className="absolute inset-0 rounded-lg" style={{ border: `2px solid ${isIconLit ? currentColor + '60' : dimColor}` }} />
                  )}
                  <span className="relative flex items-center justify-center gap-2 transition-colors font-semibold w-full">
                    <span className="relative overflow-hidden flex items-center justify-center" style={{ opacity: isIconLit ? 1 : 0.4 }}>
                      {GLASS_ICONS[item.iconKey as keyof typeof GLASS_ICONS](isIconLit ? currentColor : dimColor)}
                      {isActiveButton && (
                        <span className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent 0%, ${currentColor}40 50%, transparent 100%)`, animation: 'iconShimmer 1.5s ease-in-out infinite' }} />
                      )}
                    </span>
                    <span className="text-[11px] lg:text-[13px] font-mono tracking-wider flex">
                      {item.label.split('').map((letter, letterIdx) => {
                        const isActiveLetter = isActiveButton ? letterIdx <= activeLetterIndex : isIconLit;
                        return (
                          <span key={letterIdx} style={{ color: isActiveLetter ? currentColor : dimColor, textShadow: isActiveLetter ? `0 0 10px ${currentColor}` : 'none', transition: 'all 0.1s ease' }}>{letter}</span>
                        );
                      })}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Bottom Status Bar with One Last AI brand */}
        <div className={`order-4 mt-2 flex flex-col items-center gap-1.5 transition-all duration-500 ${bootPhase >= 6 ? 'opacity-100' : 'opacity-0'}`}>
          {/* Brand Name - smaller footer version */}
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold text-sm tracking-wider">One Last</span>
            <span className="text-emerald-400 font-bold text-sm tracking-wider">AI</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-8 text-[7px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span>SECURE</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-cyan-500" />
              <span>NEURAL</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
              <span>QUANTUM</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes scan-line {
          0% { top: -2px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 4s linear infinite;
        }
        
        @keyframes grid-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        .animate-grid-scroll {
          animation: grid-scroll 20s linear infinite;
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
        
        @keyframes glitch-text {
          0%, 100% { transform: translate(0); filter: hue-rotate(0deg); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(1px, -1px); filter: hue-rotate(10deg); }
          60% { transform: translate(-1px, -1px); }
          80% { transform: translate(1px, 1px); filter: hue-rotate(-10deg); }
        }
        .animate-glitch-text {
          animation: glitch-text 5s ease-in-out infinite;
        }

        @keyframes rainbow-ascii {
          0%   { color: #ff3b30; text-shadow: 0 0 10px rgba(255,59,48,0.7), 0 0 22px rgba(255,59,48,0.45); transform: translate(0); }
          14%  { color: #ff9500; text-shadow: 0 0 10px rgba(255,149,0,0.7), 0 0 22px rgba(255,149,0,0.45); }
          28%  { color: #ffcc00; text-shadow: 0 0 10px rgba(255,204,0,0.7), 0 0 22px rgba(255,204,0,0.45); transform: translate(-1px, 1px); }
          42%  { color: #34c759; text-shadow: 0 0 10px rgba(52,199,89,0.7), 0 0 22px rgba(52,199,89,0.45); }
          56%  { color: #22d3ee; text-shadow: 0 0 10px rgba(34,211,238,0.8), 0 0 22px rgba(34,211,238,0.5); transform: translate(1px, -1px); }
          70%  { color: #5e5ce6; text-shadow: 0 0 10px rgba(94,92,230,0.7), 0 0 22px rgba(94,92,230,0.45); }
          84%  { color: #af52de; text-shadow: 0 0 10px rgba(175,82,222,0.75), 0 0 22px rgba(175,82,222,0.5); }
          100% { color: #ff2d92; text-shadow: 0 0 10px rgba(255,45,146,0.75), 0 0 22px rgba(255,45,146,0.5); transform: translate(0); }
        }
        .animate-rainbow-ascii {
          animation: rainbow-ascii 6s linear infinite;
          will-change: color, text-shadow, transform;
        }
        
        @keyframes hologram {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-hologram {
          animation: hologram 3s ease-in-out infinite;
        }
        
        @keyframes hologram-blur {
          0%, 100% { opacity: 0.3; transform: translate(0, 0); }
          25% { opacity: 0.5; transform: translate(2px, -1px); }
          50% { opacity: 0.2; transform: translate(-1px, 2px); }
          75% { opacity: 0.4; transform: translate(1px, 1px); }
        }
        .animate-hologram-blur {
          animation: hologram-blur 4s ease-in-out infinite;
        }
        
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        .animate-typewriter {
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid rgba(34, 211, 238, 0.5);
          animation: typewriter 2s steps(20) forwards, blink 0.8s step-end infinite;
        }
        
        @keyframes blink {
          50% { border-color: transparent; }
        }
        
        @keyframes border-glow {
          0%, 100% { box-shadow: inset 0 0 5px rgba(34, 211, 238, 0.3); }
          50% { box-shadow: inset 0 0 20px rgba(34, 211, 238, 0.5); }
        }
        .animate-border-glow {
          animation: border-glow 2s ease-in-out infinite;
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .animate-bounce-horizontal {
          animation: bounce-horizontal 0.8s ease-in-out infinite;
        }
        
        @keyframes bounce-horizontal-reverse {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-4px); }
        }
        .animate-bounce-horizontal-reverse {
          animation: bounce-horizontal-reverse 0.8s ease-in-out infinite;
        }
        
        @keyframes iconShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default Overlay;
