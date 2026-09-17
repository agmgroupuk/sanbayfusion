/**
 * AIRefactor — AI-powered code refactoring suggestions
 * Displays refactoring opportunities with diff preview
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Sparkles,
  Check,
  X,
  Loader2,
  ArrowRight,
  Code2,
  Zap,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

type RefactorType = 'extract' | 'rename' | 'simplify' | 'optimize' | 'modernize' | 'pattern';

export interface RefactorSuggestion {
  id: string;
  type: RefactorType;
  title: string;
  description: string;
  file: string;
  lineRange: [number, number];
  originalCode: string;
  refactoredCode: string;
  impact: 'high' | 'medium' | 'low';
}

interface AIRefactorProps {
  suggestions: RefactorSuggestion[];
  onApply: (id: string) => Promise<void>;
  onDismiss: (id: string) => void;
  onRefresh: () => void;
  onNavigate: (file: string, line: number) => void;
  isAnalyzing?: boolean;
  className?: string;
}

const typeConfig: Record<RefactorType, { icon: React.FC<any>; color: string; label: string }> = {
  extract: { icon: Code2, color: 'text-blue-400', label: 'Extract' },
  rename: { icon: FileText, color: 'text-amber-400', label: 'Rename' },
  simplify: { icon: Sparkles, color: 'text-primary-400', label: 'Simplify' },
  optimize: { icon: Zap, color: 'text-emerald-400', label: 'Optimize' },
  modernize: { icon: ArrowRight, color: 'text-cyan-400', label: 'Modernize' },
  pattern: { icon: Wand2, color: 'text-pink-400', label: 'Pattern' },
};

const impactColor: Record<string, string> = {
  high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-gray-500/10 text-canvas-muted border-gray-500/20',
};

const AIRefactor: React.FC<AIRefactorProps> = ({
  suggestions,
  onApply,
  onDismiss,
  onRefresh,
  onNavigate,
  isAnalyzing = false,
  className = '',
}) => {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const handleApply = async (id: string) => {
    setApplyingId(id);
    try {
      await onApply(id);
      setAppliedIds((prev) => new Set([...prev, id]));
    } finally {
      setApplyingId(null);
    }
  };

  const active = suggestions.filter((s) => !appliedIds.has(s.id));

  return (
    <div className={`flex flex-col bg-canvas-card rounded-xl border border-canvas-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-canvas-card border-b border-canvas-border flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600/20 to-primary-500/20 flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-primary-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm text-gray-200 font-medium">AI Refactor</h3>
          <span className="text-[10px] text-canvas-muted-deep">
            {active.length} suggestion{active.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isAnalyzing}
          className="p-1.5 text-canvas-muted-deep hover:text-canvas-text transition-colors"
        >
          {isAnalyzing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Suggestions */}
      <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600 gap-2">
            <Sparkles className="w-8 h-8 text-primary-400/20" />
            <span className="text-xs text-canvas-muted-deep">No refactoring suggestions</span>
            <button
              onClick={onRefresh}
              className="text-[10px] text-primary-400 hover:text-primary-300"
            >
              Analyze code
            </button>
          </div>
        ) : (
          active.map((suggestion, i) => {
            const config = typeConfig[suggestion.type];
            const Icon = config.icon;
            const isExpanded = expandedId === suggestion.id;
            const isApplying = applyingId === suggestion.id;

            return (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div
                  className="px-4 py-3 hover:bg-white/[0.02] cursor-pointer group"
                  onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`w-3.5 h-3.5 mt-0.5 ${config.color} shrink-0`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-200 font-medium">
                          {suggestion.title}
                        </span>
                        <span
                          className={`px-1.5 py-0 rounded text-[9px] font-semibold border ${impactColor[suggestion.impact]}`}
                        >
                          {suggestion.impact}
                        </span>
                      </div>
                      <p className="text-[11px] text-canvas-muted-deep mt-0.5 line-clamp-1">
                        {suggestion.description}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(suggestion.file, suggestion.lineRange[0]);
                        }}
                        className="text-[10px] text-gray-600 hover:text-primary-400 font-mono mt-0.5 flex items-center gap-0.5"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        {suggestion.file}:{suggestion.lineRange[0]}-{suggestion.lineRange[1]}
                      </button>
                    </div>

                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-600" />
                    )}
                  </div>
                </div>

                {/* Code diff preview */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-4 mb-3 space-y-2">
                        {/* Before */}
                        <div className="rounded-lg border border-primary-500/10 overflow-hidden">
                          <div className="px-2 py-1 bg-primary-500/[0.05] text-[10px] text-primary-400 flex items-center gap-1">
                            <span className="font-medium">Before</span>
                          </div>
                          <pre className="p-2 text-[11px] text-canvas-muted font-mono bg-primary-500/[0.02] overflow-x-auto">
                            {suggestion.originalCode}
                          </pre>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center">
                          <ArrowRight className="w-4 h-4 text-gray-600 rotate-90" />
                        </div>

                        {/* After */}
                        <div className="rounded-lg border border-emerald-500/10 overflow-hidden">
                          <div className="px-2 py-1 bg-emerald-500/[0.05] text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="font-medium">After</span>
                          </div>
                          <pre className="p-2 text-[11px] text-canvas-muted font-mono bg-emerald-500/[0.02] overflow-x-auto">
                            {suggestion.refactoredCode}
                          </pre>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleApply(suggestion.id)}
                            disabled={isApplying}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                          >
                            {isApplying ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Apply Refactor
                          </button>
                          <button
                            onClick={() => onDismiss(suggestion.id)}
                            className="px-3 py-1.5 rounded-lg text-xs text-canvas-muted-deep hover:text-canvas-text bg-white/[0.04] hover:bg-white/[0.06] transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AIRefactor;
