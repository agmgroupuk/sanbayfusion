/**
 * AITestWriter — AI-powered test generation
 * Generates unit/integration tests for selected code
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TestTube2,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Play,
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
} from 'lucide-react';

type TestFramework = 'jest' | 'vitest' | 'mocha' | 'playwright';
type TestType = 'unit' | 'integration' | 'e2e';

export interface GeneratedTest {
  id: string;
  name: string;
  code: string;
  type: TestType;
  framework: TestFramework;
  status?: 'pass' | 'fail' | 'pending' | 'running';
  duration?: number;
}

interface AITestWriterProps {
  selectedCode?: string;
  selectedFile?: string;
  tests: GeneratedTest[];
  onGenerate: (code: string, framework: TestFramework, type: TestType) => void;
  onRunTest: (id: string) => void;
  onRunAll: () => void;
  onCopyTest: (code: string) => void;
  onAddToProject: (test: GeneratedTest) => void;
  isGenerating?: boolean;
  className?: string;
}

const frameworkLabels: Record<TestFramework, string> = {
  jest: 'Jest',
  vitest: 'Vitest',
  mocha: 'Mocha',
  playwright: 'Playwright',
};

const typeLabels: Record<TestType, string> = {
  unit: 'Unit Tests',
  integration: 'Integration Tests',
  e2e: 'E2E Tests',
};

const statusConfig = {
  pass: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  fail: { icon: XCircle, color: 'text-primary-400', bg: 'bg-primary-500/10' },
  pending: { icon: Clock, color: 'text-canvas-muted', bg: 'bg-gray-500/10' },
  running: { icon: Loader2, color: 'text-primary-400', bg: 'bg-primary-500/10' },
};

const AITestWriter: React.FC<AITestWriterProps> = ({
  selectedCode,
  selectedFile,
  tests,
  onGenerate,
  onRunTest,
  onRunAll,
  onCopyTest,
  onAddToProject,
  isGenerating = false,
  className = '',
}) => {
  const [framework, setFramework] = useState<TestFramework>('vitest');
  const [testType, setTestType] = useState<TestType>('unit');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, code: string) => {
    onCopyTest(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const passCount = tests.filter((t) => t.status === 'pass').length;
  const failCount = tests.filter((t) => t.status === 'fail').length;

  return (
    <div className={`flex flex-col bg-canvas-card rounded-xl border border-canvas-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-canvas-card border-b border-canvas-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <TestTube2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm text-gray-200 font-medium">AI Test Writer</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {tests.length > 0 && (
                <>
                  {passCount > 0 && (
                    <span className="text-[10px] text-emerald-400">
                      {passCount} passed
                    </span>
                  )}
                  {failCount > 0 && (
                    <span className="text-[10px] text-primary-400">
                      {failCount} failed
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {tests.length > 0 && (
            <button
              onClick={onRunAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <Play className="w-3 h-3" />
              Run All
            </button>
          )}
        </div>
      </div>

      {/* Config */}
      <div className="px-4 py-2 border-b border-canvas-border space-y-2">
        {/* Framework selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-canvas-muted-deep w-16 shrink-0">Framework:</span>
          <div className="flex gap-0.5 flex-1">
            {(Object.keys(frameworkLabels) as TestFramework[]).map((fw) => (
              <button
                key={fw}
                onClick={() => setFramework(fw)}
                className={`flex-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  framework === fw
                    ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                    : 'text-canvas-muted-deep hover:text-canvas-text border border-transparent'
                }`}
              >
                {frameworkLabels[fw]}
              </button>
            ))}
          </div>
        </div>

        {/* Test type selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-canvas-muted-deep w-16 shrink-0">Type:</span>
          <div className="flex gap-0.5 flex-1">
            {(Object.keys(typeLabels) as TestType[]).map((tt) => (
              <button
                key={tt}
                onClick={() => setTestType(tt)}
                className={`flex-1 px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-all ${
                  testType === tt
                    ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                    : 'text-canvas-muted-deep hover:text-canvas-text border border-transparent'
                }`}
              >
                {tt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      {selectedCode && (
        <div className="px-4 py-3 border-b border-canvas-border">
          <button
            onClick={() => onGenerate(selectedCode, framework, testType)}
            disabled={isGenerating}
            className="w-full py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating Tests...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate Tests
              </>
            )}
          </button>
          {selectedFile && (
            <p className="text-[10px] text-gray-600 mt-1 text-center">
              for {selectedFile}
            </p>
          )}
        </div>
      )}

      {/* Generated tests */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {tests.length === 0 && !selectedCode ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600 gap-2">
            <TestTube2 className="w-8 h-8 opacity-20" />
            <span className="text-xs">Select code to generate tests</span>
          </div>
        ) : (
          tests.map((test, i) => {
            const isExpanded = expandedId === test.id;
            const status = test.status ? statusConfig[test.status] : null;
            const StatusIcon = status?.icon;

            return (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div
                  className="px-4 py-2.5 hover:bg-white/[0.02] cursor-pointer group"
                  onClick={() => setExpandedId(isExpanded ? null : test.id)}
                >
                  <div className="flex items-center gap-2">
                    {StatusIcon && (
                      <StatusIcon
                        className={`w-3.5 h-3.5 ${status.color} ${
                          test.status === 'running' ? 'animate-spin' : ''
                        }`}
                      />
                    )}
                    {!status && <TestTube2 className="w-3.5 h-3.5 text-canvas-muted-deep" />}

                    <span className="text-xs text-canvas-text flex-1 truncate">{test.name}</span>

                    {test.duration !== undefined && (
                      <span className="text-[10px] text-gray-600 font-mono">
                        {test.duration}ms
                      </span>
                    )}

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRunTest(test.id);
                        }}
                        className="p-0.5 text-canvas-muted-deep hover:text-emerald-400 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(test.id, test.code);
                        }}
                        className="p-0.5 text-canvas-muted-deep hover:text-canvas-text transition-colors"
                      >
                        {copiedId === test.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToProject(test);
                        }}
                        className="p-0.5 text-canvas-muted-deep hover:text-primary-400 transition-colors"
                        title="Add to project"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-600" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <pre className="mx-4 mb-2 p-3 text-[11px] text-canvas-muted font-mono bg-white/[0.02] rounded-lg border border-canvas-border overflow-x-auto">
                        {test.code}
                      </pre>
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

export default AITestWriter;
