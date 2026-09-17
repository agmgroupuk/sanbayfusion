/**
 * ConsolePanel — Browser console output (log, warn, error, info)
 * Gorgeous virtual console with syntax highlighting and filtering
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Terminal,
  Trash2,
  Filter,
  ChevronRight,
  Search,
  X,
  Ban,
} from 'lucide-react';

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

export interface ConsoleEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  source?: string;
  line?: number;
  count?: number;
  stack?: string;
}

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear: () => void;
  className?: string;
}

const levelConfig: Record<
  LogLevel,
  { icon: React.FC<any>; color: string; bg: string; borderColor: string }
> = {
  log: {
    icon: ChevronRight,
    color: 'text-canvas-text',
    bg: 'bg-transparent',
    borderColor: 'border-transparent',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/[0.03]',
    borderColor: 'border-blue-500/10',
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/[0.03]',
    borderColor: 'border-amber-500/10',
  },
  error: {
    icon: AlertCircle,
    color: 'text-primary-400',
    bg: 'bg-primary-500/[0.03]',
    borderColor: 'border-primary-500/10',
  },
  debug: {
    icon: Terminal,
    color: 'text-violet-400',
    bg: 'bg-violet-500/[0.03]',
    borderColor: 'border-violet-500/10',
  },
};

const ConsolePanel: React.FC<ConsolePanelProps> = ({ entries, onClear, className = '' }) => {
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filteredEntries = entries.filter((entry) => {
    if (filter !== 'all' && entry.level !== filter) return false;
    if (searchQuery && !entry.message.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const counts = entries.reduce(
    (acc, e) => {
      acc[e.level] = (acc[e.level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const filters: { key: LogLevel | 'all'; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: entries.length },
    { key: 'error', label: 'Errors', count: counts.error },
    { key: 'warn', label: 'Warnings', count: counts.warn },
    { key: 'info', label: 'Info', count: counts.info },
    { key: 'log', label: 'Logs', count: counts.log },
    { key: 'debug', label: 'Debug', count: counts.debug },
  ];

  return (
    <div className={`flex flex-col h-full bg-canvas-card ${className}`}>
      {/* Toolbar */}
      <div className="h-8 bg-canvas-card border-b border-canvas-border flex items-center px-2 gap-1 shrink-0">
        {/* Filter pills */}
        <div className="flex items-center gap-0.5">
          {filters.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                filter === key
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'text-canvas-muted-deep hover:text-canvas-text border border-transparent'
              }`}
            >
              {label}
              {count ? (
                <span className={`ml-1 ${filter === key ? 'text-violet-400' : 'text-gray-600'}`}>
                  {count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search toggle */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`p-1 rounded transition-colors ${
            showSearch ? 'text-violet-400 bg-violet-500/10' : 'text-canvas-muted-deep hover:text-canvas-text'
          }`}
        >
          <Search className="w-3 h-3" />
        </button>

        {/* Clear */}
        <button
          onClick={onClear}
          className="p-1 text-canvas-muted-deep hover:text-canvas-text transition-colors"
          title="Clear console"
        >
          <Ban className="w-3 h-3" />
        </button>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 32, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-canvas-card border-b border-canvas-border px-2 flex items-center gap-2 overflow-hidden"
          >
            <Search className="w-3 h-3 text-canvas-muted-deep" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter output..."
              className="flex-1 bg-transparent text-xs text-canvas-text outline-none placeholder-gray-600"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-canvas-muted-deep hover:text-canvas-text">
                <X className="w-3 h-3" />
              </button>
            )}
            <span className="text-[10px] text-gray-600">
              {filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Console entries */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-5"
      >
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
            <Terminal className="w-6 h-6 opacity-40" />
            <span className="text-xs">No console output</span>
          </div>
        ) : (
          filteredEntries.map((entry, i) => {
            const config = levelConfig[entry.level];
            const Icon = config.icon;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.2) }}
                className={`flex items-start px-2 py-0.5 border-b ${config.bg} ${config.borderColor} hover:bg-white/[0.02] group`}
              >
                <Icon className={`w-3 h-3 mt-1 mr-2 shrink-0 ${config.color}`} />

                <span className={`flex-1 ${config.color} whitespace-pre-wrap break-all`}>
                  {entry.message}
                </span>

                {entry.count && entry.count > 1 && (
                  <span className="ml-2 px-1.5 py-0 rounded-full bg-violet-500/20 text-violet-400 text-[9px] font-semibold shrink-0">
                    {entry.count}
                  </span>
                )}

                <span className="ml-2 text-gray-600 text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatTimestamp(entry.timestamp)}
                </span>

                {entry.source && (
                  <span className="ml-2 text-gray-600 text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-violet-400 cursor-pointer">
                    {entry.source}
                    {entry.line ? `:${entry.line}` : ''}
                  </span>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;
