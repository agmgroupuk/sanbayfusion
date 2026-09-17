/**
 * EnvironmentVars — Environment variable management panel
 * Secure env vars editor with masking, add/edit/delete
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  Lock,
  AlertTriangle,
  X,
  Upload,
} from 'lucide-react';

export interface EnvVariable {
  key: string;
  value: string;
  isSecret: boolean;
  description?: string;
}

interface EnvironmentVarsProps {
  variables: EnvVariable[];
  onChange: (vars: EnvVariable[]) => void;
  className?: string;
}

const EnvironmentVars: React.FC<EnvironmentVarsProps> = ({ variables, onChange, className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newIsSecret, setNewIsSecret] = useState(true);

  const filtered = variables.filter((v) =>
    v.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyValue = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  }, []);

  const handleAdd = () => {
    if (!newKey.trim()) return;
    if (variables.some((v) => v.key === newKey.trim())) return;

    onChange([...variables, { key: newKey.trim(), value: newValue, isSecret: newIsSecret }]);
    setNewKey('');
    setNewValue('');
    setNewIsSecret(true);
    setShowAddForm(false);
  };

  const handleDelete = (key: string) => {
    onChange(variables.filter((v) => v.key !== key));
  };

  const handleUpdate = (key: string, field: 'key' | 'value', value: string) => {
    onChange(
      variables.map((v) => (v.key === key ? { ...v, [field]: value } : v))
    );
  };

  const maskValue = (val: string) => '•'.repeat(Math.min(val.length, 20));

  return (
    <div className={`flex flex-col h-full bg-canvas-card ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-canvas-border flex items-center gap-2">
        <Key className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs text-canvas-text font-medium">Environment Variables</span>
        <span className="text-[10px] text-gray-600">({variables.length})</span>
        <div className="flex-1" />
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1 text-canvas-muted-deep hover:text-violet-400 transition-colors"
          title="Add variable"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-canvas-border">
        <div className="flex items-center bg-white/[0.04] border border-canvas-border rounded-lg px-2 py-1 gap-1.5">
          <Search className="w-3 h-3 text-canvas-muted-deep" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variables..."
            className="flex-1 bg-transparent text-xs text-canvas-text outline-none placeholder-gray-600"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X className="w-3 h-3 text-canvas-muted-deep" />
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-canvas-border overflow-hidden"
          >
            <div className="p-3 space-y-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="VARIABLE_NAME"
                className="w-full bg-white/[0.04] border border-canvas-border rounded-lg px-3 py-1.5 text-xs text-canvas-text font-mono placeholder-gray-600 outline-none focus:border-violet-500/30"
              />
              <input
                type={newIsSecret ? 'password' : 'text'}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value..."
                className="w-full bg-white/[0.04] border border-canvas-border rounded-lg px-3 py-1.5 text-xs text-canvas-text font-mono placeholder-gray-600 outline-none focus:border-violet-500/30"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsSecret}
                    onChange={(e) => setNewIsSecret(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      newIsSecret
                        ? 'bg-violet-500/20 border-violet-500/40'
                        : 'bg-white/[0.04] border-canvas-border'
                    }`}
                  >
                    {newIsSecret && <Check className="w-2.5 h-2.5 text-violet-400" />}
                  </div>
                  <Lock className="w-3 h-3 text-canvas-muted-deep" />
                  <span className="text-[10px] text-canvas-muted-deep">Secret</span>
                </label>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1 rounded-lg text-[10px] text-canvas-muted hover:text-gray-200 bg-white/[0.04] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!newKey.trim()}
                    className="px-3 py-1 rounded-lg text-[10px] font-medium bg-gradient-to-r from-violet-500 to-cyan-500 text-white disabled:opacity-30 transition-opacity"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Variables list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2 p-4">
            <Key className="w-6 h-6 opacity-40" />
            <span className="text-xs">
              {searchQuery ? 'No matching variables' : 'No environment variables'}
            </span>
            {!searchQuery && (
              <button
                onClick={() => setShowAddForm(true)}
                className="text-[10px] text-violet-400 hover:text-violet-300"
              >
                Add your first variable
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((variable) => {
              const isRevealed = revealedKeys.has(variable.key);
              const isCopied = copiedKey === variable.key;

              return (
                <motion.div
                  key={variable.key}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-canvas-border px-3 py-2 hover:bg-white/[0.02] group"
                >
                  <div className="flex items-center gap-2">
                    {variable.isSecret ? (
                      <Lock className="w-3 h-3 text-amber-500/60 shrink-0" />
                    ) : (
                      <Key className="w-3 h-3 text-canvas-muted-deep shrink-0" />
                    )}

                    <span className="text-xs text-violet-400 font-mono font-medium flex-1 truncate">
                      {variable.key}
                    </span>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {variable.isSecret && (
                        <button
                          onClick={() => toggleReveal(variable.key)}
                          className="p-0.5 text-canvas-muted-deep hover:text-canvas-text transition-colors"
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => copyValue(variable.key, variable.value)}
                        className="p-0.5 text-canvas-muted-deep hover:text-canvas-text transition-colors"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(variable.key)}
                        className="p-0.5 text-canvas-muted-deep hover:text-primary-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 ml-5">
                    <span className="text-[11px] text-canvas-muted-deep font-mono">
                      {variable.isSecret && !isRevealed
                        ? maskValue(variable.value)
                        : variable.value || '(empty)'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer warning */}
      <div className="px-3 py-1.5 bg-amber-500/[0.03] border-t border-amber-500/10 flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3 text-amber-500/60 shrink-0" />
        <span className="text-[10px] text-amber-500/60">
          Secrets are encrypted at rest
        </span>
      </div>
    </div>
  );
};

export default EnvironmentVars;
