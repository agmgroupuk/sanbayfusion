import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import electronService, { WindowStateInfo, ProcessInfo } from '../services/electron';
import wasmTextEngine, { RenderMetrics } from '../services/wasmTextEngine';
import lspService, { LanguageServer } from '../services/lspService';
import cliService, { CLITool } from '../services/cliTools';

type TabType = 'electron' | 'wasm' | 'lsp' | 'cli' | 'protocols';

export const TechStackPanel: React.FC = () => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  const [activeTab, setActiveTab] = useState<TabType>('electron');
  const [windowState, setWindowState] = useState<WindowStateInfo>(electronService.getWindowState());
  const [processes, setProcesses] = useState<ProcessInfo[]>(electronService.getProcesses());
  const [renderMetrics, setRenderMetrics] = useState<RenderMetrics | null>(null);
  const [languageServers, setLanguageServers] = useState<LanguageServer[]>(lspService.getServers());
  const [cliTools, setCliTools] = useState<CLITool[]>(cliService.getTools());
  const [selectedServer, setSelectedServer] = useState<LanguageServer | null>(null);
  const [selectedTool, setSelectedTool] = useState<CLITool | null>(null);
  const [commandOutput, setCommandOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const unsubscribeElectron = electronService.on('*', (event) => {
      if (event.type.includes('window')) {
        setWindowState(electronService.getWindowState());
      }
      setProcesses(electronService.getProcesses());
    });

    const unsubscribeLsp = lspService.on('*', () => {
      setLanguageServers([...lspService.getServers()]);
    });

    const unsubscribeCli = cliService.on('*', () => {
      setCliTools([...cliService.getTools()]);
    });

    testWasmEngine();

    return () => {
      unsubscribeElectron();
      unsubscribeLsp();
      unsubscribeCli();
    };
  }, []);

  const testWasmEngine = async () => {
    const buffer = wasmTextEngine.createBuffer('test-buffer', 'Sample text for performance testing.\nLine 2\nLine 3');
    if (buffer) {
      const metrics = wasmTextEngine.render(buffer.id, { startLine: 0, endLine: 3, viewportWidth: 800 });
      setRenderMetrics(metrics);
    }
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'electron', label: 'Electron', icon: '⚡' },
    { id: 'wasm', label: 'WebAssembly', icon: '🔧' },
    { id: 'lsp', label: 'LSP', icon: '📡' },
    { id: 'cli', label: 'CLI Tools', icon: '💻' },
    { id: 'protocols', label: 'Protocols', icon: '🔌' },
  ];

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

  const getStatusDot = (status: string): string => {
    switch (status) {
      case 'running': case 'connected': case 'available': return 'bg-green-500';
      case 'starting': case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'stopped': case 'disconnected': case 'unavailable': return 'bg-red-400';
      default: return isDark ? 'bg-gray-500' : 'bg-gray-400';
    }
  };

  const handleStartServer = async (serverId: string) => {
    await lspService.startServer(serverId);
    setLanguageServers([...lspService.getServers()]);
  };

  const handleStopServer = async (serverId: string) => {
    await lspService.stopServer(serverId);
    setLanguageServers([...lspService.getServers()]);
  };

  const handleExecuteCommand = async (toolId: string, commandId: string) => {
    setIsExecuting(true);
    setCommandOutput('');
    try {
      const result = await cliService.executeCommand(toolId, commandId, []);
      setCommandOutput(result.output.join('\n'));
    } catch (error: any) {
      setCommandOutput(`Error: ${error.message}`);
    }
    setIsExecuting(false);
  };

  const handleInstallTool = async (toolId: string) => {
    await cliService.installTool(toolId);
    setCliTools([...cliService.getTools()]);
  };

  // Theme classes
  const bgPrimary = isDark ? 'bg-[#1e1e1e]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-[#252526]' : 'bg-gray-50';
  const bgCard = isDark ? 'bg-[#252526]' : 'bg-gray-50 border border-gray-200';
  const bgHover = isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-100';
  const bgBtn = isDark ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c]' : 'bg-gray-200 hover:bg-gray-300';
  const bgSelected = isDark ? 'bg-[#094771]' : 'bg-blue-100';
  const bgTerminal = isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100';
  const bgBar = isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200';
  const border = isDark ? 'border-[#3c3c3c]' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-500';

  return (
    <div className={`h-full flex flex-col ${bgPrimary} ${textPrimary}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${bgSecondary} border-b ${border}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🛠</span>
          <span className="font-medium text-sm">Tech Stack</span>
        </div>
        <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
          <span>TypeScript + Rust + WASM</span>
        </div>
      </div>

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
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {/* Electron Tab */}
        {activeTab === 'electron' && (
          <div className="p-3 space-y-4">
            {/* Window State */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-3 flex items-center gap-2`}>
                <span>🪟</span> Window State
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className={textMuted}>Size</div>
                  <div className={textPrimary}>{windowState.width} × {windowState.height}</div>
                </div>
                <div>
                  <div className={textMuted}>Position</div>
                  <div className={textPrimary}>({windowState.x}, {windowState.y})</div>
                </div>
                <div>
                  <div className={textMuted}>State</div>
                  <div className={textPrimary}>
                    {windowState.isMaximized ? 'Maximized' :
                     windowState.isMinimized ? 'Minimized' :
                     windowState.isFullScreen ? 'Fullscreen' : 'Normal'}
                  </div>
                </div>
                <div>
                  <div className={textMuted}>Focused</div>
                  <div className={windowState.isFocused ? 'text-green-400' : textMuted}>
                    {windowState.isFocused ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => electronService.minimizeWindow()} className={`px-2 py-1 ${bgBtn} rounded text-xs`}>Minimize</button>
                <button onClick={() => electronService.maximizeWindow()} className={`px-2 py-1 ${bgBtn} rounded text-xs`}>Maximize</button>
                <button onClick={() => electronService.toggleFullScreen()} className={`px-2 py-1 ${bgBtn} rounded text-xs`}>Fullscreen</button>
              </div>
            </div>

            {/* Processes */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-3 flex items-center gap-2`}>
                <span>⚙️</span> Processes
              </h3>
              <div className="space-y-2">
                {processes.map(proc => (
                  <div key={proc.pid} className={`flex items-center justify-between p-2 ${bgPrimary} rounded`}>
                    <div>
                      <div className={`text-xs ${textPrimary}`}>{proc.type}</div>
                      <div className={`text-[10px] ${textMuted}`}>PID: {proc.pid}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className={textSecondary}>CPU: {proc.cpu.toFixed(1)}%</div>
                      <div className={textSecondary}>MEM: {formatBytes(proc.memory)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IPC Stats */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-3 flex items-center gap-2`}>
                <span>📨</span> IPC Communication
              </h3>
              {(() => {
                const isElectron = typeof window !== 'undefined' && (window as any).process?.type === 'renderer';
                if (!isElectron) {
                  return (
                    <div className={`text-xs ${textMuted} text-center py-3`}>
                      Running in browser mode — IPC not available
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className={`p-2 ${bgPrimary} rounded text-center`}>
                      <div className="text-xl font-bold text-blue-400">—</div>
                      <div className={textMuted}>Messages</div>
                    </div>
                    <div className={`p-2 ${bgPrimary} rounded text-center`}>
                      <div className="text-xl font-bold text-green-400">—</div>
                      <div className={textMuted}>Avg Latency</div>
                    </div>
                    <div className={`p-2 ${bgPrimary} rounded text-center`}>
                      <div className="text-xl font-bold text-purple-400">—</div>
                      <div className={textMuted}>Channels</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* WebAssembly Tab */}
        {activeTab === 'wasm' && (
          <div className="p-3 space-y-4">
            {/* WASM Status */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-3 flex items-center gap-2`}>
                <span>🔧</span> WebAssembly Text Engine
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${wasmTextEngine.isReady() ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                <span className={`text-xs ${wasmTextEngine.isReady() ? 'text-green-400' : 'text-yellow-400'}`}>
                  {wasmTextEngine.isReady() ? 'Ready' : 'Initializing...'}
                </span>
              </div>
              <div className={`text-xs ${textSecondary} space-y-1`}>
                <div>• Text buffer operations via WebAssembly</div>
                <div>• Line access via rope data structure</div>
                <div>• Accelerated text search</div>
                <div>• Shared memory with JavaScript runtime</div>
              </div>
            </div>

            {/* Render Metrics */}
            {renderMetrics && (
              <div className={`${bgCard} rounded-lg p-3`}>
                <h3 className={`text-sm font-medium ${textPrimary} mb-3 flex items-center gap-2`}>
                  <span>📊</span> Render Performance
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className={textMuted}>Parse Time</div>
                    <div className={textPrimary}>{renderMetrics.parseTime.toFixed(2)}ms</div>
                  </div>
                  <div>
                    <div className={textMuted}>Layout Time</div>
                    <div className={textPrimary}>{renderMetrics.layoutTime.toFixed(2)}ms</div>
                  </div>
                  <div>
                    <div className={textMuted}>Render Time</div>
                    <div className={textPrimary}>{renderMetrics.renderTime.toFixed(2)}ms</div>
                  </div>
                  <div>
                    <div className={textMuted}>Total Time</div>
                    <div className="text-green-400">{renderMetrics.totalTime.toFixed(2)}ms</div>
                  </div>
                  <div>
                    <div className={textMuted}>Lines Rendered</div>
                    <div className={textPrimary}>{renderMetrics.linesRendered}</div>
                  </div>
                  <div>
                    <div className={textMuted}>Characters</div>
                    <div className={textPrimary}>{renderMetrics.charactersRendered}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Memory Usage */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-3 flex items-center gap-2`}>
                <span>💾</span> WASM Memory
              </h3>
              {(() => {
                const mem = wasmTextEngine.getMemoryUsage();
                if (!mem || mem.total === 0) {
                  return <div className={`text-xs ${textMuted} text-center py-3`}>WASM engine not initialized</div>;
                }
                const usedMB = (mem.used / 1048576).toFixed(1);
                const totalMB = (mem.total / 1048576).toFixed(1);
                const freeMB = ((mem.total - mem.used) / 1048576).toFixed(1);
                const pct = Math.round((mem.used / mem.total) * 100);
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={textSecondary}>Allocated</span>
                      <span className={textPrimary}>{totalMB} MB</span>
                    </div>
                    <div className={`h-2 ${bgBar} rounded-full overflow-hidden`}>
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className={`flex justify-between text-[10px] ${textMuted}`}>
                      <span>{usedMB} MB used</span>
                      <span>{freeMB} MB free</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Buffers */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-3 flex items-center gap-2`}>
                <span>📝</span> Active Buffers
              </h3>
              <div className="space-y-1">
                {wasmTextEngine.getBuffers().map(buffer => (
                  <div key={buffer.id} className={`flex items-center justify-between p-2 ${bgPrimary} rounded text-xs`}>
                    <span className={`${textPrimary} truncate`}>{buffer.id}</span>
                    <span className={textSecondary}>{buffer.lineCount} lines</span>
                  </div>
                ))}
                {wasmTextEngine.getBuffers().length === 0 && (
                  <div className={`text-xs ${textMuted} text-center py-2`}>No active buffers</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LSP Tab */}
        {activeTab === 'lsp' && (
          <div className="flex flex-col h-full">
            {/* Server List */}
            <div className="flex-1 overflow-auto">
              <div className={`p-2 border-b ${border} ${bgSecondary}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={textSecondary}>
                    {languageServers.filter(s => s.status === 'running').length} running
                  </span>
                  <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded">
                    + Add Server
                  </button>
                </div>
              </div>
              <div className={`divide-y ${isDark ? 'divide-[#3c3c3c]' : 'divide-gray-200'}`}>
                {languageServers.map(server => (
                  <div
                    key={server.id}
                    onClick={() => setSelectedServer(server)}
                    className={`px-3 py-2 cursor-pointer ${bgHover} ${selectedServer?.id === server.id ? bgSelected : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusDot(server.status)}`} />
                      <div className="flex-1">
                        <div className={`text-sm ${textPrimary}`}>{server.name}</div>
                        <div className={`text-xs ${textMuted}`}>{server.languages.join(', ')}</div>
                      </div>
                      <div className="flex gap-1">
                        {server.status === 'stopped' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartServer(server.id); }}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                          >
                            Start
                          </button>
                        ) : server.status === 'running' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStopServer(server.id); }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                          >
                            Stop
                          </button>
                        ) : (
                          <span className="text-xs text-yellow-400 animate-pulse">Starting...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Server Details */}
            {selectedServer && (
              <div className={`h-48 border-t ${border} ${bgSecondary} overflow-auto p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${textPrimary}`}>{selectedServer.name}</span>
                  <button onClick={() => setSelectedServer(null)} className={`${textSecondary} hover:${textPrimary}`}>✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className={textMuted}>Command:</span>
                    <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'} ml-1`}>{selectedServer.command}</span>
                  </div>
                  <div>
                    <span className={textMuted}>Port:</span>
                    <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'} ml-1`}>{selectedServer.port || 'stdio'}</span>
                  </div>
                </div>
                <div className={`text-xs ${textSecondary} mb-1`}>Capabilities:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(selectedServer.capabilities).map(([key, value]) => (
                    value && (
                      <span key={key} className={`px-1.5 py-0.5 ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'} rounded text-[10px]`}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CLI Tools Tab */}
        {activeTab === 'cli' && (
          <div className="flex flex-col h-full">
            {/* Tools List */}
            <div className={`flex-none max-h-48 overflow-auto border-b ${border}`}>
              {cliTools.map(tool => (
                <div
                  key={tool.id}
                  onClick={() => setSelectedTool(tool)}
                  className={`px-3 py-2 cursor-pointer ${bgHover} border-b ${border} ${selectedTool?.id === tool.id ? bgSelected : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(tool.status)}`} />
                    <div className="flex-1">
                      <div className={`text-sm ${textPrimary}`}>{tool.name}</div>
                      <div className={`text-xs ${textMuted}`}>{tool.category} • v{tool.version}</div>
                    </div>
                    {tool.status === 'unavailable' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleInstallTool(tool.id); }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                      >
                        Install
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Commands */}
            {selectedTool && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className={`p-2 ${bgSecondary} border-b ${border}`}>
                  <div className={`text-sm font-medium ${textPrimary}`}>{selectedTool.name} Commands</div>
                </div>
                <div className="flex-1 overflow-auto">
                  {selectedTool.commands.map(cmd => (
                    <div key={cmd.id} className={`px-3 py-2 border-b ${border} ${bgHover}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-xs ${textPrimary} font-mono`}>{cmd.command}</div>
                          <div className={`text-[10px] ${textMuted}`}>{cmd.description}</div>
                        </div>
                        <button
                          onClick={() => handleExecuteCommand(selectedTool.id, cmd.id)}
                          disabled={isExecuting || selectedTool.status !== 'available'}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs"
                        >
                          {isExecuting ? '⏳' : '▶'} Run
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Output */}
                {commandOutput && (
                  <div className={`h-32 border-t ${border} ${bgTerminal} overflow-auto`}>
                    <div className={`px-2 py-1 text-xs ${textSecondary} border-b ${border} sticky top-0 ${bgTerminal}`}>
                      Output
                    </div>
                    <pre className={`p-2 text-xs font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap`}>
                      {commandOutput}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {!selectedTool && (
              <div className={`flex-1 flex items-center justify-center ${textMuted} text-sm`}>
                Select a tool to view commands
              </div>
            )}
          </div>
        )}

        {/* Protocols Tab */}
        {activeTab === 'protocols' && (
          <div className="p-3 space-y-4">
            {/* LSP Protocol */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-2 flex items-center gap-2`}>
                <span className="text-blue-400">📡</span> Language Server Protocol (LSP)
              </h3>
              <div className={`text-xs ${textSecondary} mb-3`}>Standard protocol for language intelligence features</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Completion', 'Hover', 'Go to Definition', 'Find References',
                  'Rename', 'Diagnostics', 'Code Actions', 'Formatting'].map(feature => (
                  <div key={feature} className="flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DAP Protocol */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-2 flex items-center gap-2`}>
                <span className="text-orange-400">🐛</span> Debug Adapter Protocol (DAP)
              </h3>
              <div className={`text-xs ${textSecondary} mb-3`}>Unified debugging interface for all languages</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Breakpoints', 'Step Debugging', 'Variable Inspection', 'Call Stack',
                  'Watch Expressions', 'Conditional Breaks', 'Exception Handling', 'Multi-thread'].map(feature => (
                  <div key={feature} className="flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Build Protocol */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-2 flex items-center gap-2`}>
                <span className="text-purple-400">🔨</span> Build Server Protocol (BSP)
              </h3>
              <div className={`text-xs ${textSecondary} mb-3`}>Standardized build tool communication</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Compile', 'Test', 'Run', 'Clean',
                  'Dependencies', 'Resources', 'Scala Support', 'Java Support'].map(feature => (
                  <div key={feature} className="flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture */}
            <div className={`${bgCard} rounded-lg p-3`}>
              <h3 className={`text-sm font-medium ${textPrimary} mb-2 flex items-center gap-2`}>
                <span className="text-cyan-400">🏗️</span> Architecture
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-20 ${textMuted}`}>Frontend</span>
                  <span className={`px-2 py-0.5 ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'} rounded`}>React</span>
                  <span className={`px-2 py-0.5 ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'} rounded`}>TypeScript</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-20 ${textMuted}`}>Runtime</span>
                  <span className={`px-2 py-0.5 ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'} rounded`}>Electron</span>
                  <span className={`px-2 py-0.5 ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'} rounded`}>Node.js</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-20 ${textMuted}`}>Performance</span>
                  <span className={`px-2 py-0.5 ${isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'} rounded`}>Rust</span>
                  <span className={`px-2 py-0.5 ${isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'} rounded`}>WebAssembly</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-20 ${textMuted}`}>Rendering</span>
                  <span className={`px-2 py-0.5 ${isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'} rounded`}>Canvas</span>
                  <span className={`px-2 py-0.5 ${isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'} rounded`}>WebGL</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-3 py-1 ${bgSecondary} border-t ${border} text-xs ${textMuted}`}>
        <div className="flex items-center gap-3">
          <span>⚡ {typeof window !== 'undefined' && (window as any).process?.type === 'renderer' ? `Electron ${(window as any).process?.versions?.electron || '?'}` : 'Browser Mode'}</span>
          <span>🔧 WASM {wasmTextEngine.isReady() ? 'Ready' : 'Loading'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📡 {languageServers.filter(s => s.status === 'running').length} LSP</span>
        </div>
      </div>
    </div>
  );
};

export default TechStackPanel;
