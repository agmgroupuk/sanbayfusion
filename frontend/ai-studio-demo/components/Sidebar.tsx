
import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, MoreVertical, Terminal, Share2, Copy, Download, Trash2, X, Edit2, Check, AlertTriangle } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ sessions, onSelect, onCreate, onDelete, onRename, isOpen }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Filter sessions by search query
  const filteredSessions = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    // Search in session name
    if (s.name.toLowerCase().includes(query)) return true;
    // Search in messages
    return s.messages.some(m => m.text.toLowerCase().includes(query));
  });

  const startRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditingName(session.name);
    setActiveMenu(null);
  };

  const saveRename = (id: string) => {
    if (editingName.trim() && onRename) {
      onRename(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleAction = (e: React.MouseEvent, id: string, action: string) => {
    e.stopPropagation();
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    switch (action) {
      case 'share':
        navigator.clipboard.writeText(`NEURAL_PROTOCOL_UPLINK_${id}`);
        alert("Session Uplink ID copied to clipboard.");
        break;
      case 'copy':
        navigator.clipboard.writeText(JSON.stringify(session, null, 2));
        alert("Full Session Log (JSON) copied.");
        break;
      case 'download':
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.name}_DATA_BUNDLE.json`;
        a.click();
        break;
      case 'delete':
        setDeleteConfirmId(id);
        break;
    }
    setActiveMenu(null);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  return (
    <aside className={`absolute top-0 left-0 h-full w-[85%] sm:w-64 md:w-72 bg-[#0a0a0a]/98 backdrop-blur-xl border-r border-gray-800/50 p-4 sm:p-6 transition-transform duration-500 ease-out z-[100] flex flex-col shadow-[20px_0_60px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 mb-6">
        <Terminal size={18} className="text-green-500" />
        <h2 className="text-green-400 font-bold glow-green uppercase tracking-tighter text-sm font-mono">
          SESSION_VAULT
        </h2>
      </div>
      
      <div className="flex space-x-2 mb-6">
        <button 
          onClick={onCreate}
          className="flex-shrink-0 bg-green-500/10 hover:bg-green-500/20 text-green-400 p-2 rounded border border-green-500/30 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]"
        >
          <Plus size={18} />
        </button>
        <div className="relative flex-grow">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-black/60 text-gray-400 border border-gray-800 rounded focus:outline-none focus:border-green-500/50 font-mono transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Search results indicator */}
      {searchQuery && (
        <div className="mb-3 px-2 py-1.5 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400 font-mono">
          Found {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-1 relative">
        {filteredSessions.map(s => (
          <div key={s.id} className="relative group">
            <button
              onClick={() => !editingId && onSelect(s.id)}
              className={`w-full text-left flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${s.active ? 'bg-green-500/10 border-green-500/40 text-white shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]' : 'border-gray-900 text-gray-600 hover:border-gray-800 hover:bg-gray-800/20 hover:text-gray-400'}`}
            >
              <div className="flex flex-col gap-1 overflow-hidden flex-grow">
                {editingId === s.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(s.id);
                        if (e.key === 'Escape') cancelRename();
                      }}
                      className="flex-grow text-[11px] font-bold font-mono uppercase tracking-wider bg-black/60 border border-green-500/50 rounded px-2 py-1 text-green-400 focus:outline-none"
                    />
                    <button 
                      onClick={() => saveRename(s.id)}
                      className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                    >
                      <Check size={12} />
                    </button>
                    <button 
                      onClick={cancelRename}
                      className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold font-mono truncate uppercase tracking-wider">{s.name}</span>
                )}
                <div className="flex items-center gap-2">
                  <span className={`w-1 h-1 rounded-full ${s.active ? 'bg-green-500 animate-pulse' : 'bg-gray-800'}`}></span>
                  <span className="text-[8px] opacity-60 uppercase font-mono">{s.messages.length} pkts</span>
                </div>
              </div>
              {!editingId && (
                <div 
                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === s.id ? null : s.id); }}
                  className="p-1 hover:bg-white/5 rounded transition-colors"
                >
                  <MoreVertical size={14} className="text-gray-700 hover:text-gray-400" />
                </div>
              )}
            </button>

            {/* Session Actions Dropdown */}
            {activeMenu === s.id && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#0d0d0d] border border-gray-800 rounded-md shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 border-b border-gray-800 flex justify-between items-center bg-black/40">
                  <span className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Protocol Actions</span>
                  <button onClick={() => setActiveMenu(null)} className="text-gray-600 hover:text-white"><X size={10}/></button>
                </div>
                <div className="p-1">
                  <button onClick={(e) => startRename(e, s)} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-gray-400 hover:bg-blue-500/10 hover:text-blue-400 rounded transition-colors uppercase font-mono">
                    <Edit2 size={12} /> Rename Session
                  </button>
                  <button onClick={(e) => handleAction(e, s.id, 'share')} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400 rounded transition-colors uppercase font-mono">
                    <Share2 size={12} /> Share Uplink
                  </button>
                  <button onClick={(e) => handleAction(e, s.id, 'copy')} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400 rounded transition-colors uppercase font-mono">
                    <Copy size={12} /> Copy Manifest
                  </button>
                  <button onClick={(e) => handleAction(e, s.id, 'download')} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-gray-400 hover:bg-purple-500/10 hover:text-purple-400 rounded transition-colors uppercase font-mono">
                    <Download size={12} /> Sync Bundle (ZIP)
                  </button>
                  <button onClick={(e) => handleAction(e, s.id, 'delete')} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-red-900 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors uppercase font-mono mt-1 border-t border-gray-800/50 pt-2">
                    <Trash2 size={12} /> Purge Protocol
                  </button>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId === s.id && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="w-80 bg-[#111] border border-red-500/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-red-500/10 to-transparent">
                    <div className="flex items-center gap-3 text-red-400">
                      <AlertTriangle size={20} />
                      <h3 className="font-bold text-sm">Confirm Delete</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-400 text-sm mb-4">
                      Are you sure you want to delete <span className="text-white font-mono">"{s.name}"</span>? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => confirmDelete(s.id)}
                        className="flex-1 px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-900">
        <div className="flex justify-between items-center opacity-30">
            <span className="text-[8px] font-mono">SECURE_FS</span>
            <span className="text-[8px] font-mono uppercase">Node_Protocol_v3</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
