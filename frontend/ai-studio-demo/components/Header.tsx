
import React from 'react';
import { Columns, Menu, Trash2, ExternalLink, Lock, ChevronRight, Settings } from 'lucide-react';

interface HeaderProps {
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleNav: () => void;
  onToggleFiles?: () => void;
  onClear: () => void;
  onLock: () => void;
  leftOpen: boolean;
  rightOpen: boolean;
  fileCount?: number;
}

const Header: React.FC<HeaderProps> = ({
  onToggleLeft,
  onToggleRight,
  onToggleNav,
  onToggleFiles,
  onClear,
  onLock,
  leftOpen,
  rightOpen,
  fileCount = 0
}) => {
  return (
    <header className="bg-[#111]/90 backdrop-blur-md border-b border-gray-700 p-3 flex items-center justify-between flex-shrink-0 z-50">
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onToggleLeft}
          className={`text-gray-400 hover:text-white hover-glow p-1 transition-colors ${leftOpen ? 'text-green-400' : ''}`}
        >
          <Columns size={20} />
        </button>

        <button
          onClick={onToggleNav}
          className="text-green-400 hover:text-white p-1 transition-colors"
        >
          <Menu size={24} />
        </button>

        <button
          onClick={onClear}
          className="text-red-400 hover:text-red-300 p-1 transition-colors"
        >
          <Trash2 size={20} />
        </button>

        <button
          onClick={() => window.open('https://sanbayfusion.com/home', '_blank')}
          className="text-cyan-400 hover:text-white p-1 transition-colors"
          title="Open Maula AI Website"
        >
          <ExternalLink size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onLock}
          className="hidden md:block bg-gray-800/80 hover:bg-gray-700/80 text-red-400 p-2 rounded-full transition-colors"
        >
          <Lock size={18} />
        </button>

        <button
          onClick={onToggleRight}
          className={`hidden md:block text-gray-400 hover:text-white hover-glow p-1 transition-colors ${rightOpen ? 'text-cyan-400' : ''}`}
        >
          <ChevronRight size={24} className={rightOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>
    </header>
  );
};

export default Header;
