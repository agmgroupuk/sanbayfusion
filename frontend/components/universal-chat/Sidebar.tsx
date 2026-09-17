
import React, { useState } from 'react';
import { Search, Plus, MoreVertical, MessageSquare, Share2, Copy, Download, Trash2, X } from 'lucide-react';
import { ChatSession, SettingsState } from './types';

interface SidebarProps {
  sessions: ChatSession[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  currentSettings?: SettingsState;
  onUpdateSettings?: (settings: SettingsState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sessions, onSelect, onCreate, onDelete, isOpen, currentSettings, onUpdateSettings }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleAction = async (e: React.MouseEvent, id: string, action: string) => {
    e.stopPropagation();
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    switch (action) {
      case 'share':
        navigator.clipboard.writeText(window.location.href + '?chat=' + id);
        { const { toast: t } = await import('./components/Toast'); t.success('Copied', 'Chat link copied to clipboard.'); }
        break;
      case 'copy':
        navigator.clipboard.writeText(JSON.stringify(session.messages, null, 2));
        { const { toast: t } = await import('./components/Toast'); t.success('Copied', 'Chat history copied to clipboard.'); }
        break;
      case 'download':
        const data = {
          name: session.name,
          messages: session.messages,
          exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_${session.name.replace(/\s+/g, '_')}.json`;
        a.click();
        break;
      case 'delete':
        if (confirm(`Delete "${session.name}"?`)) {
          onDelete(id);
        }
        break;
    }
    setActiveMenu(null);
  };

  return (
    <aside className={`absolute top-0 left-0 h-full w-[85%] sm:w-72 md:w-80 bg-[#0a0a0a] border-r border-gray-800/50 transition-transform duration-500 ease-out z-[100] flex flex-col shadow-[20px_0_60px_rgba(0,0,0,0.5),0_0_30px_rgba(168,85,247,0.05)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 bg-gradient-to-b from-[#111] to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare size={20} className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
          <h2 className="text-white font-semibold text-lg">Chats</h2>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 hover:from-purple-500/20 hover:to-cyan-500/20 text-purple-300 py-2.5 rounded-lg border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
        >
          <Plus size={18} />
          <span className="text-sm font-medium">New Chat</span>
        </button>
      </div>

      {/* AI Model Info */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3 p-3 bg-[#151515] rounded-lg border border-gray-800">
          <span className="text-xl">🧠</span>
          <div className="text-left">
            <div className="text-sm text-gray-200 font-medium">Maula AI</div>
            <div className="text-[10px] text-gray-500">Powered by Maula AI</div>
          </div>
          <div className="ml-auto px-2 py-0.5 bg-emerald-500/20 rounded text-[9px] text-emerald-400 font-bold">ACTIVE</div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#151515] text-gray-400 border border-gray-800 rounded-lg focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-grow overflow-y-auto px-4 space-y-2 custom-scrollbar">
        {sessions.map(s => (
          <div key={s.id} className="relative group">
            <button
              onClick={() => onSelect(s.id)}
              className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${s.active
                  ? 'bg-gradient-to-r from-purple-500/10 to-cyan-500/5 border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                  : 'border-transparent text-gray-400 hover:bg-gray-800/30 hover:text-gray-200 hover:border-gray-700/50'
                }`}
            >
              <div className="flex flex-col gap-0.5 overflow-hidden flex-grow">
                <span className="text-sm font-medium truncate">{s.name}</span>
                <span className="text-[11px] text-gray-600">{s.messages.length} messages</span>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === s.id ? null : s.id); }}
                className="p-1.5 hover:bg-white/5 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical size={14} className="text-gray-500" />
              </div>
            </button>

            {activeMenu === s.id && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#151515] border border-gray-800 rounded-lg shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-1">
                  <button onClick={(e) => handleAction(e, s.id, 'share')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800/50 hover:text-white rounded transition-colors">
                    <Share2 size={14} /> Share
                  </button>
                  <button onClick={(e) => handleAction(e, s.id, 'copy')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800/50 hover:text-white rounded transition-colors">
                    <Copy size={14} /> Copy
                  </button>
                  <button onClick={(e) => handleAction(e, s.id, 'download')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800/50 hover:text-white rounded transition-colors">
                    <Download size={14} /> Download
                  </button>
                  <div className="my-1 border-t border-gray-800"></div>
                  <button onClick={(e) => handleAction(e, s.id, 'delete')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded transition-colors">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-[11px] text-gray-600 text-center">
          Maula AI Studio
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
