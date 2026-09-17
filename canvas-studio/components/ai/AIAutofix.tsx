/**
 * AIAutofix — AI-powered error detection & auto-fix
 * Shows errors with one-click AI fix capability
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  AlertCircle,
  AlertTriangle,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
  ArrowRight,
  Zap,
  X,
} from 'lucide-react';

export interface CodeError {
  id: string;
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  fixable: boolean;
  suggestedFix?: string;
}

interface AIAutofixProps {
  errors: CodeError[];
  onFix: (errorId: string) => Promise<void>;
  onFixAll: () => Promise<void>;
  onNavigate: (file: string, line: number) => void;
  isAnalyzing?: boolean;
  className?: string;
}

const AIAutofix: React.FC<AIAutofixProps> = ({
  errors,
  onFix,
  onFixAll,
  onNavigate,
  isAnalyzing = false,
  className = '',
}) => {
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixingAll, setFixingAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set());

  const fixableErrors = errors.filter((e) => e.fixable && !fixedIds.has(e.id));
  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  const handleFix = async (id: string) => {
    setFixingId(id);
    try {
      await onFix(id);
      setFixedIds((prev) => new Set([...prev, id]));
    } finally {
      setFixingId(null);
    }
  };

  const handleFixAll = async () => {
    setFixingAll(true);
    try {
      await onFixAll();
      setFixedIds(new Set(errors.filter((e) => e.fixable).map((e) => e.id)));
    } finally {
      setFixingAll(false);
    }
  };

  return (
    <div className={`flex flex-col bg-canvas-card rounded-xl border border-canvas-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-canvas-card border-b border-canvas-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm text-gray-200 font-medium">AI Autofix</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {errorCount > 0 && (
                <span className="text-[10px] text-primary-400 flex items-center gap-0.5">
                  <AlertCircle className="w-2.5 h-2.5" /> {errorCount} error{errorCount !== 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> {warningCount} warning{warningCount !== 1 ? 's' : ''}
                </span>
              )}
              {isAnalyzing && (
                <span className="text-[10px] text-violet-400 flex items-center gap-0.5">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Analyzing...
                </span>
              )}
            </div>
          </div>

          {fixableErrors.length > 0 && (
            <button
              onClick={handleFixAll}
              disabled={fixingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-500 to-cyan-500 text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {fixingAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Fix All ({fixableErrors.length})
            </button>
          )}
        </div>
      </div>

      {/* Error list */}
      <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600 gap-2">
            <Check className="w-8 h-8 text-emerald-400/30" />
            <span className="text-xs text-canvas-muted-deep">No issues found</span>
            <span className="text-[10px] text-gray-600">Your code looks clean ✨</span>
          </div>
        ) : (
          errors.map((error, i) => {
            const isFixed = fixedIds.has(error.id);
            const isFixing = fixingId === error.id;
            const isExpanded = expandedId === error.id;

            return (
              <motion.div
                key={error.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isFixed ? 0.4 : 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`${isFixed ? 'bg-emerald-500/[0.02]' : ''}`}
              >
                <div
                  className="px-4 py-2.5 hover:bg-white/[0.02] cursor-pointer group"
                  onClick={() => setExpandedId(isExpanded ? null : error.id)}
                >
                  <div className="flex items-start gap-2">
                    {error.severity === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-primary-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs ${
                          isFixed ? 'text-canvas-muted-deep line-through' : 'text-canvas-text'
                        }`}
                      >
                        {error.message}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(error.file, error.line);
                        }}
                        className="text-[10px] text-gray-600 hover:text-violet-400 font-mono mt-0.5 flex items-center gap-0.5"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        {error.file}:{error.line}:{error.column}
                      </button>
                    </div>

                    {isFixed ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : error.fixable ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFix(error.id);
                        }}
                        disabled={isFixing}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        {isFixing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        Fix
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Suggested fix preview */}
                <AnimatePresence>
                  {isExpanded && error.suggestedFix && !isFixed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-4 mb-2 p-2 bg-white/[0.02] rounded-lg border border-canvas-border">
                        <div className="flex items-center gap-1 mb-1">
                          <Sparkles className="w-3 h-3 text-violet-400" />
                          <span className="text-[10px] text-violet-400 font-medium">
                            Suggested Fix
                          </span>
                        </div>
                        <pre className="text-[11px] text-canvas-muted font-mono whitespace-pre-wrap">
                          {error.suggestedFix}
                        </pre>
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

export default AIAutofix;
