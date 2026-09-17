/**
 * HistoryPanel — Project generation/edit history with timeline
 * Gorgeous timeline with version snapshots and restore capability
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Code2,
  Palette,
  Bug,
  Zap,
  FileText,
  GitCommit,
  Star,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react';

type HistoryAction =
  | 'generate'
  | 'edit'
  | 'fix'
  | 'style'
  | 'refactor'
  | 'deploy'
  | 'custom';

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  title: string;
  description?: string;
  prompt?: string;
  timestamp: number;
  filesChanged: string[];
  isBookmarked?: boolean;
  snapshot?: string; // serialized project state
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onPreview: (entry: HistoryEntry) => void;
  onBookmark: (id: string) => void;
  className?: string;
}

const actionConfig: Record<
  HistoryAction,
  { icon: React.FC<any>; color: string; gradient: string }
> = {
  generate: {
    icon: Sparkles,
    color: 'text-violet-400',
    gradient: 'from-violet-500 to-purple-500',
  },
  edit: {
    icon: Code2,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-500',
  },
  fix: {
    icon: Bug,
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-500',
  },
  style: {
    icon: Palette,
    color: 'text-pink-400',
    gradient: 'from-pink-500 to-primary-500',
  },
  refactor: {
    icon: Zap,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-500',
  },
  deploy: {
    icon: GitCommit,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500 to-blue-500',
  },
  custom: {
    icon: FileText,
    color: 'text-canvas-muted',
    gradient: 'from-gray-500 to-gray-600',
  },
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  entries,
  onRestore,
  onPreview,
  onBookmark,
  className = '',
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'bookmarked'>('all');

  const filtered = filter === 'bookmarked' ? entries.filter((e) => e.isBookmarked) : entries;

  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group by date
  const groupedByDate = filtered.reduce(
    (acc, entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    },
    {} as Record<string, HistoryEntry[]>
  );

  return (
    <div className={`flex flex-col h-full bg-canvas-card ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-canvas-border flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs text-canvas-text font-medium">History</span>
        <span className="text-[10px] text-gray-600">({entries.length})</span>
        <div className="flex-1" />
      </div>

      {/* Filter */}
      <div className="px-2 py-1 border-b border-canvas-border flex gap-0.5">
        {(['all', 'bookmarked'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-medium capitalize transition-all ${
              filter === f ? 'bg-white/[0.06] text-white' : 'text-canvas-muted-deep hover:text-canvas-text'
            }`}
          >
            {f === 'bookmarked' && <Bookmark className="w-3 h-3" />}
            {f}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
            <Clock className="w-6 h-6 opacity-40" />
            <span className="text-xs">
              {filter === 'bookmarked' ? 'No bookmarked entries' : 'No history yet'}
            </span>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, dateEntries]) => (
            <div key={date}>
              {/* Date header */}
              <div className="px-3 py-1.5 text-[10px] text-gray-600 font-medium sticky top-0 bg-canvas-card/90 backdrop-blur-sm border-b border-canvas-border z-10">
                {date}
              </div>

              {dateEntries.map((entry, i) => {
                const config = actionConfig[entry.action];
                const Icon = config.icon;
                const isExpanded = expandedId === entry.id;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative"
                  >
                    {/* Timeline connector */}
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-white/[0.04]" />

                    <div
                      className="flex items-start px-3 py-2 hover:bg-white/[0.02] cursor-pointer group"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 mr-3 mt-0.5">
                        <div
                          className={`w-4 h-4 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <Icon className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-canvas-text font-medium truncate">
                            {entry.title}
                          </span>
                          {entry.isBookmarked && (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-600">
                            {formatTime(entry.timestamp)}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {entry.filesChanged.length} file
                            {entry.filesChanged.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookmark(entry.id);
                          }}
                          className={`p-0.5 transition-colors ${
                            entry.isBookmarked
                              ? 'text-amber-400'
                              : 'text-canvas-muted-deep hover:text-amber-400'
                          }`}
                        >
                          <Bookmark className={`w-3 h-3 ${entry.isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(entry);
                          }}
                          className="p-0.5 text-canvas-muted-deep hover:text-canvas-text transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestore(entry);
                          }}
                          className="p-0.5 text-canvas-muted-deep hover:text-violet-400 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-10 mr-3 mb-2 p-2 bg-white/[0.02] rounded-lg border border-canvas-border space-y-2">
                            {entry.prompt && (
                              <div>
                                <span className="text-[10px] text-canvas-muted-deep uppercase tracking-wider">
                                  Prompt
                                </span>
                                <p className="text-[11px] text-canvas-muted mt-0.5 line-clamp-3">
                                  {entry.prompt}
                                </p>
                              </div>
                            )}

                            {entry.description && (
                              <div>
                                <span className="text-[10px] text-canvas-muted-deep uppercase tracking-wider">
                                  Description
                                </span>
                                <p className="text-[11px] text-canvas-muted mt-0.5">
                                  {entry.description}
                                </p>
                              </div>
                            )}

                            <div>
                              <span className="text-[10px] text-canvas-muted-deep uppercase tracking-wider">
                                Files Changed
                              </span>
                              <div className="mt-0.5 space-y-0.5">
                                {entry.filesChanged.map((file) => (
                                  <div
                                    key={file}
                                    className="text-[11px] text-canvas-muted-deep font-mono flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3 text-gray-600" />
                                    {file}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => onRestore(entry)}
                              className="w-full py-1.5 rounded-lg text-[11px] font-medium bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-violet-300 border border-violet-500/20 hover:border-violet-500/40 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restore this version
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
