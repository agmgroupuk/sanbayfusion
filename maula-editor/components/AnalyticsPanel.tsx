import { createLogger } from '../services/logger';
const log = createLogger('AnalyticsPanel');
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import analyticsService, {
  AnalyticsDashboard,
  ErrorReport,
  CrashLog,
  ExtensionAnalytics,
  RefactoringAnalysis,
} from '../services/analytics';

type TabType = 'overview' | 'errors' | 'crashes' | 'extensions' | 'performance' | 'refactoring';

// Sub-component: Core Web Vitals using real Performance API
const WebVitalsCard: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [vitals, setVitals] = useState<{ name: string; value: number; unit: string; threshold: number }[]>([]);

  useEffect(() => {
    const measured: typeof vitals = [];

    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      measured.push({ name: 'TTFB', value: Math.round(nav.responseStart - nav.requestStart), unit: 'ms', threshold: 500 });
    }

    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      const lcp = lcpEntries[lcpEntries.length - 1] as any;
      measured.push({ name: 'LCP', value: Math.round(lcp.startTime) / 1000, unit: 's', threshold: 2.5 });
    }

    const clsEntries = performance.getEntriesByType('layout-shift') as any[];
    if (clsEntries.length > 0) {
      const cls = clsEntries.reduce((sum: number, e: any) => sum + (e.hadRecentInput ? 0 : e.value), 0);
      measured.push({ name: 'CLS', value: parseFloat(cls.toFixed(3)), unit: '', threshold: 0.1 });
    }

    const fidEntries = performance.getEntriesByType('first-input') as any[];
    if (fidEntries.length > 0) {
      measured.push({ name: 'FID', value: Math.round(fidEntries[0].processingStart - fidEntries[0].startTime), unit: 'ms', threshold: 100 });
    }

    setVitals(measured);
  }, []);

  const bgCard = isDark ? 'bg-[#252526]' : 'bg-gray-50 border border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-500';
  const bgBar = isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200';

  if (vitals.length === 0) {
    return (
      <div className={`${bgCard} rounded-lg p-3`}>
        <div className={`text-sm font-medium ${textPrimary} mb-2`}>Core Web Vitals</div>
        <div className={`text-xs ${textMuted} text-center py-4`}>No web vitals data collected yet</div>
      </div>
    );
  }

  return (
    <div className={`${bgCard} rounded-lg p-3`}>
      <div className={`text-sm font-medium ${textPrimary} mb-2`}>Core Web Vitals</div>
      <div className="space-y-2">
        {vitals.map(metric => {
          const good = metric.value <= metric.threshold;
          return (
            <div key={metric.name} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${good ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} w-12`}>{metric.name}</span>
              <div className={`flex-1 h-1.5 ${bgBar} rounded-full overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${good ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, (metric.value / metric.threshold) * 100)}%` }}
                />
              </div>
              <span className={`text-xs ${textPrimary} w-16 text-right`}>
                {metric.value}{metric.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sub-component: Memory Usage using real performance.memory API
const MemoryUsageCard: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [mem, setMem] = useState<{ used: number; total: number; percent: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const perf = performance as any;
      if (perf.memory) {
        const used = perf.memory.usedJSHeapSize;
        const total = perf.memory.jsHeapSizeLimit;
        setMem({ used, total, percent: Math.round((used / total) * 100) });
      }
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  const fmtBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const bgCard = isDark ? 'bg-[#252526]' : 'bg-gray-50 border border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-500';
  const bgBar = isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200';

  if (!mem) {
    return (
      <div className={`${bgCard} rounded-lg p-3`}>
        <div className={`text-sm font-medium ${textPrimary} mb-2`}>Memory Usage</div>
        <div className={`text-xs ${textMuted} text-center py-4`}>Memory API not available in this browser</div>
      </div>
    );
  }

  const free = mem.total - mem.used;
  return (
    <div className={`${bgCard} rounded-lg p-3`}>
      <div className={`text-sm font-medium ${textPrimary} mb-2`}>Memory Usage</div>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle cx="40" cy="40" r="35" fill="none" stroke={isDark ? '#3c3c3c' : '#e5e7eb'} strokeWidth="8" />
            <circle cx="40" cy="40" r="35" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray={`${mem.percent * 2.2} ${100 * 2.2}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${textPrimary}`}>{mem.percent}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className={textMuted}>Used</span>
            <span className={textPrimary}>{fmtBytes(mem.used)}</span>
          </div>
          <div className="flex justify-between">
            <span className={textMuted}>Free</span>
            <span className={textPrimary}>{fmtBytes(free)}</span>
          </div>
          <div className="flex justify-between">
            <span className={textMuted}>Total</span>
            <span className={textPrimary}>{fmtBytes(mem.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AnalyticsPanel: React.FC = () => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dashboard, setDashboard] = useState<AnalyticsDashboard>(analyticsService.getDashboard());
  const [errors, setErrors] = useState<ErrorReport[]>(analyticsService.getErrors());
  const [crashes, setCrashes] = useState<CrashLog[]>(analyticsService.getCrashes());
  const [extensionAnalytics, setExtensionAnalytics] = useState<ExtensionAnalytics[]>(analyticsService.getExtensionAnalytics());
  const [refactoringAnalysis, setRefactoringAnalysis] = useState<RefactoringAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [consentGiven, setConsentGiven] = useState(analyticsService.getConsent());
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const [selectedCrash, setSelectedCrash] = useState<CrashLog | null>(null);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    const unsubscribe = analyticsService.on('*', (event) => {
      switch (event.type) {
        case 'error':
        case 'errorUpdated':
          setErrors([...analyticsService.getErrors()]);
          break;
        case 'crash':
          setCrashes([...analyticsService.getCrashes()]);
          break;
        case 'extensionAnalytics':
          setExtensionAnalytics([...analyticsService.getExtensionAnalytics()]);
          break;
      }
      setDashboard(analyticsService.getDashboard());
    });

    return unsubscribe;
  }, []);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'errors', label: 'Errors', icon: '🔴' },
    { id: 'crashes', label: 'Crashes', icon: '💥' },
    { id: 'extensions', label: 'Extensions', icon: '🧩' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'refactoring', label: 'AI Refactor', icon: '🔧' },
  ];

  const handleAnalyzeCode = async () => {
    setIsAnalyzing(true);
    try {
      const { useStore } = await import('../store/useStore');
      const state = useStore.getState();
      const activeFile = state.openFiles?.find((f: any) => f.active);
      const code = activeFile?.content || '';
      const filePath = activeFile?.path || 'untitled';
      const lang = activeFile?.language || 'typescript';

      if (!code.trim()) {
        setRefactoringAnalysis(null);
        setIsAnalyzing(false);
        return;
      }

      const analysis = await analyticsService.analyzeCodeForRefactoring(code, lang, filePath);
      setRefactoringAnalysis(analysis);
    } catch (err) {
      log.error('Code analysis failed:', err);
    }
    setIsAnalyzing(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 60) {
      const hours = Math.floor(mins / 60);
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      default: return 'text-green-400 bg-green-900/30';
    }
  };

  // Theme classes
  const bgPrimary = isDark ? 'bg-[#1e1e1e]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-[#252526]' : 'bg-gray-50';
  const bgCard = isDark ? 'bg-[#252526]' : 'bg-gray-50 border border-gray-200';
  const bgHover = isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-100';
  const bgInput = isDark ? 'bg-[#3c3c3c]' : 'bg-white border border-gray-300';
  const bgSelected = isDark ? 'bg-[#094771]' : 'bg-blue-100';
  const bgBar = isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200';
  const bgTerminal = isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100';
  const border = isDark ? 'border-[#3c3c3c]' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-500';

  const renderMiniChart = (data: { date: string; count?: number; value?: number }[], color: string) => {
    const values = data.map(d => d.count ?? d.value ?? 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return (
      <div className="flex items-end gap-1 h-12">
        {values.map((value, i) => (
          <div
            key={i}
            className={`w-2 rounded-t ${color}`}
            style={{ height: `${((value - min) / range) * 100}%`, minHeight: '4px' }}
            title={`${data[i].date}: ${value}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col ${bgPrimary} ${textPrimary}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${bgSecondary} border-b ${border}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="font-medium text-sm">Analytics & Telemetry</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as any)}
            className={`${bgInput} ${textPrimary} text-xs px-2 py-1 rounded`}
          >
            <option value="day">Last 24h</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Consent Banner */}
      {!consentGiven && (
        <div className={`${isDark ? 'bg-blue-900/30 border-blue-500/30' : 'bg-blue-50 border-blue-200'} border-b px-3 py-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              🔒 Help improve the IDE by sharing anonymous usage data
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { analyticsService.setConsent(true); setConsentGiven(true); }}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
              >
                Accept
              </button>
              <button
                onClick={() => setConsentGiven(true)}
                className={`px-2 py-0.5 ${isDark ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c]' : 'bg-gray-200 hover:bg-gray-300'} rounded text-xs`}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex border-b ${border} ${bgSecondary} overflow-x-auto debug-tabs-scroll`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? `${textPrimary} border-b-2 border-blue-500 ${bgPrimary}`
                : `${textSecondary} ${bgHover}`
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'errors' && errors.filter(e => !e.resolved).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white rounded-full text-[10px]">
                {errors.filter(e => !e.resolved).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-3 space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`${bgCard} rounded-lg p-3`}>
                <div className={`text-xs ${textSecondary} mb-1`}>Active Users</div>
                <div className={`text-2xl font-bold ${textPrimary}`}>{formatNumber(dashboard.overview.activeUsers)}</div>
                <div className={`text-xs ${textMuted}`}>Current session</div>
              </div>
              <div className={`${bgCard} rounded-lg p-3`}>
                <div className={`text-xs ${textSecondary} mb-1`}>Sessions</div>
                <div className={`text-2xl font-bold ${textPrimary}`}>{formatNumber(dashboard.overview.totalSessions)}</div>
                {renderMiniChart(dashboard.trends.sessions, 'bg-blue-500')}
              </div>
              <div className={`${bgCard} rounded-lg p-3`}>
                <div className={`text-xs ${textSecondary} mb-1`}>Avg Session</div>
                <div className={`text-2xl font-bold ${textPrimary}`}>{formatDuration(dashboard.overview.avgSessionDuration)}</div>
                <div className={`text-xs ${textMuted}`}>Per user</div>
              </div>
              <div className={`${bgCard} rounded-lg p-3`}>
                <div className={`text-xs ${textSecondary} mb-1`}>Crash-Free Rate</div>
                <div className="text-2xl font-bold text-green-400">{dashboard.overview.crashFreeRate.toFixed(1)}%</div>
                <div className={`h-1.5 ${bgBar} rounded-full mt-2 overflow-hidden`}>
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${dashboard.overview.crashFreeRate}%` }} />
                </div>
              </div>
            </div>

            {/* Error Rate */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${textPrimary}`}>Error Rate</span>
                <span className={`text-sm ${dashboard.overview.errorRate > 5 ? 'text-red-400' : 'text-green-400'}`}>
                  {dashboard.overview.errorRate.toFixed(2)}%
                </span>
              </div>
              {renderMiniChart(dashboard.trends.errors, 'bg-red-500')}
            </div>

            {/* Top Features */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <div className={`text-sm font-medium ${textPrimary} mb-2`}>Top Features</div>
              {dashboard.topFeatures.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.topFeatures.slice(0, 5).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feature.feature}</div>
                        <div className={`h-1.5 ${bgBar} rounded-full overflow-hidden mt-1`}>
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(feature.usage / dashboard.topFeatures[0].usage) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs ${textMuted}`}>{feature.usage}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-xs ${textMuted} text-center py-2`}>No feature data collected yet</div>
              )}
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div className="flex flex-col h-full">
            <div className={`p-2 border-b ${border} ${bgSecondary}`}>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-400">{errors.filter(e => !e.resolved).length} unresolved</span>
                <span className={textMuted}>•</span>
                <span className={textSecondary}>{errors.length} total</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {errors.length > 0 ? (
                <div className={`divide-y ${isDark ? 'divide-[#3c3c3c]' : 'divide-gray-200'}`}>
                  {errors.map(error => (
                    <div
                      key={error.id}
                      onClick={() => setSelectedError(error)}
                      className={`px-3 py-2 cursor-pointer ${bgHover} ${selectedError?.id === error.id ? bgSelected : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 w-2 h-2 rounded-full ${error.resolved ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${textPrimary} truncate`}>{error.message}</div>
                          <div className={`flex items-center gap-2 mt-1 text-xs ${textMuted}`}>
                            <span>{error.type}</span>
                            <span>•</span>
                            <span>{error.occurrences}x</span>
                            <span>•</span>
                            <span>{error.affectedUsers} users</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 text-center ${textMuted} text-sm`}>🎉 No errors recorded</div>
              )}
            </div>

            {/* Error Details */}
            {selectedError && (
              <div className={`h-48 border-t ${border} ${bgSecondary} overflow-auto`}>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${textPrimary}`}>{selectedError.type}</span>
                    <button onClick={() => setSelectedError(null)} className={`${textSecondary} hover:${textPrimary}`}>✕</button>
                  </div>
                  <div className="text-xs text-red-400 mb-2">{selectedError.message}</div>
                  {selectedError.stack && (
                    <pre className={`text-xs ${textMuted} font-mono ${bgTerminal} p-2 rounded overflow-auto max-h-24`}>
                      {selectedError.stack}
                    </pre>
                  )}
                  <div className={`flex gap-4 mt-2 text-xs ${textMuted}`}>
                    <span>First: {selectedError.firstOccurrence.toLocaleString()}</span>
                    <span>Last: {selectedError.lastOccurrence.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Crashes Tab */}
        {activeTab === 'crashes' && (
          <div className="flex flex-col h-full">
            <div className={`p-2 border-b ${border} ${bgSecondary}`}>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-yellow-400">💥 {crashes.length} crash logs</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {crashes.length > 0 ? (
                <div className={`divide-y ${isDark ? 'divide-[#3c3c3c]' : 'divide-gray-200'}`}>
                  {crashes.map(crash => (
                    <div
                      key={crash.id}
                      onClick={() => setSelectedCrash(crash)}
                      className={`px-3 py-2 cursor-pointer ${bgHover} ${selectedCrash?.id === crash.id ? bgSelected : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${getSeverityColor(crash.severity)}`}>
                          {crash.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${textPrimary}`}>{crash.title}</div>
                          <div className={`text-xs ${textMuted} mt-0.5`}>{crash.type}</div>
                        </div>
                        <span className={`text-xs ${textMuted}`}>{crash.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 text-center ${textMuted} text-sm`}>✨ No crashes recorded</div>
              )}
            </div>

            {/* Crash Details */}
            {selectedCrash && (
              <div className={`h-56 border-t ${border} ${bgSecondary} overflow-auto`}>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${textPrimary}`}>{selectedCrash.title}</span>
                    <button onClick={() => setSelectedCrash(null)} className={`${textSecondary} hover:${textPrimary}`}>✕</button>
                  </div>
                  <div className={`text-xs ${textSecondary} mb-2`}>{selectedCrash.description}</div>

                  {selectedCrash.memoryUsage && (
                    <div className={`mb-2 p-2 ${bgTerminal} rounded`}>
                      <div className={`text-xs ${textMuted} mb-1`}>Memory Usage</div>
                      <div className={`text-xs ${textPrimary}`}>
                        {formatBytes(selectedCrash.memoryUsage.usedJSHeapSize)} / {formatBytes(selectedCrash.memoryUsage.jsHeapSizeLimit)}
                      </div>
                    </div>
                  )}

                  <div className={`text-xs ${textMuted} mb-1`}>Breadcrumbs</div>
                  <div className="space-y-1 max-h-20 overflow-auto">
                    {selectedCrash.breadcrumbs.slice(-5).map((bc, i) => (
                      <div key={i} className="text-xs flex items-center gap-2">
                        <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>{bc.timestamp.toLocaleTimeString()}</span>
                        <span className={bc.level === 'error' ? 'text-red-400' : textSecondary}>
                          [{bc.category}] {bc.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extensions Tab */}
        {activeTab === 'extensions' && (
          <div className="p-3 space-y-2">
            {extensionAnalytics.length > 0 ? (
              extensionAnalytics.map(ext => (
                <div key={ext.extensionId} className={`${bgCard} rounded-lg p-3`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className={`text-sm font-medium ${textPrimary}`}>{ext.name}</div>
                      <div className={`text-xs ${textMuted}`}>v{ext.version}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs ${textSecondary}`}>{ext.activations} activations</div>
                      <div className="flex items-center gap-1 text-xs">
                        {'⭐'.repeat(Math.round(ext.rating))}
                        <span className={textMuted}>{ext.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className={textMuted}>Load Time</div>
                      <div className={textPrimary}>{ext.loadTime.toFixed(0)}ms</div>
                    </div>
                    <div>
                      <div className={textMuted}>Memory</div>
                      <div className={textPrimary}>{ext.memoryUsage.toFixed(1)}MB</div>
                    </div>
                    <div>
                      <div className={textMuted}>Errors</div>
                      <div className={ext.errors > 0 ? 'text-red-400' : 'text-green-400'}>{ext.errors}</div>
                    </div>
                  </div>

                  {Object.keys(ext.commands).length > 0 && (
                    <div className={`mt-2 pt-2 border-t ${border}`}>
                      <div className={`text-xs ${textMuted} mb-1`}>Commands</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(ext.commands).map(([cmd, count]) => (
                          <span key={cmd} className={`px-1.5 py-0.5 ${isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'} rounded text-[10px]`}>
                            {cmd}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className={`p-6 text-center ${textMuted}`}>
                <div className="text-3xl mb-3">🧩</div>
                <div className="text-sm font-medium mb-1">No Extension Data</div>
                <div className="text-xs">Extension analytics will appear as extensions are used.</div>
              </div>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="p-3 space-y-4">
            <div className={`${bgCard} rounded-lg p-3`}>
              <div className={`text-sm font-medium ${textPrimary} mb-2`}>Response Time</div>
              {renderMiniChart(dashboard.trends.performance, 'bg-green-500')}
              {(() => {
                const perfValues = dashboard.trends.performance.map(d => d.value).filter(v => v > 0);
                if (perfValues.length === 0) return <div className={`mt-2 text-xs ${textMuted}`}>No data yet</div>;
                const sorted = [...perfValues].sort((a, b) => a - b);
                const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
                const p95 = sorted[Math.floor(sorted.length * 0.95)] || avg;
                const p99 = sorted[Math.floor(sorted.length * 0.99)] || p95;
                const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`;
                return (
                  <div className={`flex justify-between mt-2 text-xs ${textMuted}`}>
                    <span>Avg: {fmt(avg)}</span>
                    <span>p95: {fmt(p95)}</span>
                    <span>p99: {fmt(p99)}</span>
                  </div>
                );
              })()}
            </div>

            <WebVitalsCard isDark={isDark} />
            <MemoryUsageCard isDark={isDark} />
          </div>
        )}

        {/* AI Refactoring Tab */}
        {activeTab === 'refactoring' && (
          <div className="p-3 space-y-4">
            <div className={`${bgCard} rounded-lg p-3`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className={`text-sm font-medium ${textPrimary}`}>AI Code Analysis</div>
                  <div className={`text-xs ${textMuted}`}>Powered by machine learning</div>
                </div>
                <button
                  onClick={handleAnalyzeCode}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-medium flex items-center gap-1"
                >
                  {isAnalyzing ? (
                    <><span className="animate-spin">⏳</span> Analyzing...</>
                  ) : (
                    <>🔍 Analyze Code</>
                  )}
                </button>
              </div>

              {refactoringAnalysis && (
                <div className="space-y-3">
                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2 ${bgTerminal} rounded`}>
                      <div className={`text-xs ${textMuted}`}>Code Quality</div>
                      <div className={`text-lg font-bold ${
                        refactoringAnalysis.codeQualityScore >= 70 ? 'text-green-400' :
                        refactoringAnalysis.codeQualityScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {refactoringAnalysis.codeQualityScore}%
                      </div>
                    </div>
                    <div className={`p-2 ${bgTerminal} rounded`}>
                      <div className={`text-xs ${textMuted}`}>Technical Debt</div>
                      <div className="text-lg font-bold text-orange-400">{refactoringAnalysis.technicalDebt}m</div>
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div>
                    <div className={`text-xs ${textSecondary} mb-2`}>
                      {refactoringAnalysis.suggestions.length} suggestions found
                    </div>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {refactoringAnalysis.suggestions.map(suggestion => (
                        <div key={suggestion.id} className={`p-2 ${bgTerminal} rounded`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${textPrimary}`}>{suggestion.title}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${getImpactColor(suggestion.impact)}`}>
                                  {suggestion.impact}
                                </span>
                              </div>
                              <div className={`text-xs ${textMuted} mt-0.5`}>{suggestion.description}</div>
                            </div>
                            <div className={`text-xs ${textMuted} whitespace-nowrap`}>L{suggestion.startLine}</div>
                          </div>
                          <div className={`mt-2 p-1.5 ${bgCard} rounded text-[10px] font-mono ${textSecondary} overflow-x-auto`}>
                            {suggestion.originalCode.slice(0, 100)}...
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-blue-400">{suggestion.category}</span>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className={textMuted}>Confidence:</span>
                              <span className="text-green-400">{(suggestion.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!refactoringAnalysis && !isAnalyzing && (
                <div className={`text-center py-8 ${textMuted} text-sm`}>
                  Click "Analyze Code" to get AI-powered refactoring suggestions
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-3 py-1 ${bgSecondary} border-t ${border} text-xs ${textMuted}`}>
        <div className="flex items-center gap-2">
          <span>Session: {analyticsService.getSession().id.slice(0, 12)}...</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => analyticsService.clearData()}
            className={`hover:${textPrimary}`}
          >
            Clear Data
          </button>
          <span>•</span>
          <button
            onClick={() => {
              const data = analyticsService.exportData();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'analytics-export.json';
              a.click();
            }}
            className={`hover:${textPrimary}`}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
