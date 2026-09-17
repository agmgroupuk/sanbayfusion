
import React, { useState, useEffect } from 'react';

const Footer: React.FC = () => {
  const [currentTime, setCurrentTime] = useState('--:--:--');

  useEffect(() => {
    // Set real time immediately on client mount (avoids hydration mismatch)
    setCurrentTime(new Date().toLocaleTimeString([], { hour12: false }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="bg-gradient-to-t from-[#0a0a0a] to-[#0d0d0d] border-t border-gray-800/50 p-2 text-[10px] flex justify-between items-center z-50 px-4">
      <div className="text-gray-600 tracking-wide">Maula AI Studio</div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
          <span className="text-emerald-400/80">Connected</span>
        </div>
        <span className="text-purple-400/60 tabular-nums">{currentTime}</span>
      </div>
    </footer>
  );
};

export default Footer;
