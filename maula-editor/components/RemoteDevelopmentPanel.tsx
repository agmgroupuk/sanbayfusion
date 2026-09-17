import { createLogger } from '../services/logger';
const log = createLogger('RemoteDevelopmentPanel');
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import remoteDevelopmentService, {
  RemoteConnection,
  DockerContainer,
  DockerImage,
  DockerVolume,
  NotebookDocument,
  DatabaseConnection,
  QueryResult,
  WorkspaceDetection,
} from '../services/remoteDevelopment';

type TabType = 'connections' | 'docker' | 'notebooks' | 'database';
type DockerSubTab = 'containers' | 'images' | 'volumes';

export const RemoteDevelopmentPanel: React.FC = () => {
  const { theme, files } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  const [activeTab, setActiveTab] = useState<TabType>('connections');
  const [dockerSubTab, setDockerSubTab] = useState<DockerSubTab>('containers');
  const [connections, setConnections] = useState<RemoteConnection[]>([]);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [volumes, setVolumes] = useState<DockerVolume[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookDocument[]>([]);
  const [dbConnections, setDbConnections] = useState<DatabaseConnection[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<NotebookDocument | null>(null);
  const [selectedDb, setSelectedDb] = useState<DatabaseConnection | null>(null);
  const [queryText, setQueryText] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [containerLogs, setContainerLogs] = useState<string[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [detection, setDetection] = useState<WorkspaceDetection>(remoteDevelopmentService.getWorkspaceDetection());

  // New connection form
  const [showNewConn, setShowNewConn] = useState(false);
  const [newConnType, setNewConnType] = useState<'ssh' | 'wsl'>('ssh');
  const [newConnName, setNewConnName] = useState('');
  const [newConnHost, setNewConnHost] = useState('');
  const [newConnPort, setNewConnPort] = useState('22');
  const [newConnUser, setNewConnUser] = useState('');

  // New DB connection form
  const [showNewDb, setShowNewDb] = useState(false);
  const [newDbType, setNewDbType] = useState<'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis'>('postgresql');
  const [newDbName, setNewDbName] = useState('');
  const [newDbHost, setNewDbHost] = useState('localhost');
  const [newDbPort, setNewDbPort] = useState('5432');
  const [newDbDatabase, setNewDbDatabase] = useState('');
  const [newDbUser, setNewDbUser] = useState('');

  useEffect(() => {
    remoteDevelopmentService.setWorkspaceFiles(files);
    setDetection(remoteDevelopmentService.getWorkspaceDetection());
  }, [files]);

  useEffect(() => {
    setConnections(remoteDevelopmentService.getConnections());
    setNotebooks(remoteDevelopmentService.getNotebooks());
    setDbConnections(remoteDevelopmentService.getDatabaseConnections());
    loadDockerData();

    const unsubscribe = remoteDevelopmentService.on('*', (event) => {
      switch (event.type) {
        case 'connectionStatusChanged':
        case 'connectionCreated':
        case 'connectionDeleted':
          setConnections([...remoteDevelopmentService.getConnections()]);
          break;
        case 'containerStatusChanged':
        case 'containerCreated':
        case 'containerRemoved':
          loadDockerData();
          break;
        case 'databaseStatusChanged':
        case 'databaseConnectionCreated':
        case 'databaseConnectionDeleted':
          setDbConnections([...remoteDevelopmentService.getDatabaseConnections()]);
          break;
        case 'notebookCreated':
        case 'notebookDeleted':
          setNotebooks([...remoteDevelopmentService.getNotebooks()]);
          break;
        case 'workspaceScanned':
          setDetection(remoteDevelopmentService.getWorkspaceDetection());
          break;
      }
    });

    return unsubscribe;
  }, []);

  const loadDockerData = async () => {
    const [c, i, v] = await Promise.all([
      remoteDevelopmentService.listContainers(),
      remoteDevelopmentService.listImages(),
      remoteDevelopmentService.listVolumes(),
    ]);
    setContainers(c);
    setImages(i);
    setVolumes(v);
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'connections', label: 'Remote', icon: '🔗' },
    { id: 'docker', label: 'Docker', icon: '🐳' },
    { id: 'notebooks', label: 'Notebooks', icon: '📓' },
    { id: 'database', label: 'Database', icon: '🗄️' },
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
      case 'connected': case 'running': return 'bg-green-500';
      case 'connecting': case 'starting': return 'bg-yellow-500 animate-pulse';
      case 'error': case 'dead': return 'bg-red-500';
      default: return isDark ? 'bg-gray-500' : 'bg-gray-400';
    }
  };

  const handleConnect = async (id: string) => {
    try { await remoteDevelopmentService.connect(id); } catch (e) { log.error(e); }
  };
  const handleDisconnect = async (id: string) => {
    try { await remoteDevelopmentService.disconnect(id); } catch (e) { log.error(e); }
  };
  const handleDeleteConnection = (id: string) => remoteDevelopmentService.deleteConnection(id);

  const handleStartContainer = async (id: string) => {
    try { await remoteDevelopmentService.startContainer(id); } catch (e) { log.error(e); }
  };
  const handleStopContainer = async (id: string) => {
    try { await remoteDevelopmentService.stopContainer(id); } catch (e) { log.error(e); }
  };
  const handleViewLogs = async (id: string) => {
    setSelectedContainerId(id);
    const logs = await remoteDevelopmentService.getContainerLogs(id);
    setContainerLogs(logs);
  };

  const handleCreateNotebook = async () => {
    await remoteDevelopmentService.createNotebook(`Notebook_${Date.now()}`, 'python');
  };

  const handleExecuteCell = async (notebookId: string, cellId: string) => {
    try {
      await remoteDevelopmentService.executeCell(notebookId, cellId);
      setNotebooks([...remoteDevelopmentService.getNotebooks()]);
      const nb = remoteDevelopmentService.getNotebooks().find(n => n.id === notebookId);
      if (nb) setSelectedNotebook({ ...nb });
    } catch (e) { log.error(e); }
  };

  const handleConnectDb = async (id: string) => {
    try { await remoteDevelopmentService.connectDatabase(id); } catch (e) { log.error(e); }
  };

  const handleExecuteQuery = async () => {
    if (!selectedDb || selectedDb.status !== 'connected' || !queryText.trim()) return;
    setIsExecutingQuery(true);
    try {
      const result = await remoteDevelopmentService.executeQuery(selectedDb.id, queryText);
      setQueryResult(result);
    } catch (e: any) {
      setQueryResult({ columns: [], rows: [], rowCount: 0, executionTime: 0, error: e.message });
    }
    setIsExecutingQuery(false);
  };

  const handleAddConnection = () => {
    if (!newConnName.trim()) return;
    if (newConnType === 'ssh') {
      remoteDevelopmentService.createConnection({
        type: 'ssh',
        name: newConnName,
        config: {
          host: newConnHost || 'localhost',
          port: parseInt(newConnPort) || 22,
          username: newConnUser || 'root',
          authMethod: 'key',
          forwardAgent: false,
          keepAliveInterval: 60,
        },
      });
    } else {
      remoteDevelopmentService.createConnection({
        type: 'wsl',
        name: newConnName,
        config: {
          distribution: newConnHost || 'Ubuntu',
          mountPoint: '/mnt/c',
          networkingMode: 'nat',
          features: { systemd: true, gui: false, nested: false },
        },
      });
    }
    setShowNewConn(false);
    setNewConnName('');
    setNewConnHost('');
    setNewConnPort('22');
    setNewConnUser('');
  };

  const handleAddDb = async () => {
    if (!newDbName.trim()) return;
    const defaultPorts: Record<string, number> = {
      postgresql: 5432, mysql: 3306, sqlite: 0, mongodb: 27017, redis: 6379,
    };
    await remoteDevelopmentService.createDatabaseConnection({
      name: newDbName,
      type: newDbType,
      host: newDbHost || 'localhost',
      port: parseInt(newDbPort) || defaultPorts[newDbType] || 5432,
      database: newDbDatabase || 'mydb',
      username: newDbUser || 'root',
      ssl: false,
    });
    setShowNewDb(false);
    setNewDbName('');
    setNewDbHost('localhost');
    setNewDbPort('5432');
    setNewDbDatabase('');
    setNewDbUser('');
  };

  // Theme classes
  const bgPrimary = isDark ? 'bg-[#1e1e1e]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-[#252526]' : 'bg-gray-50';
  const bgHover = isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-100';
  const bgInput = isDark ? 'bg-[#3c3c3c]' : 'bg-white border border-gray-300';
  const bgCard = isDark ? 'bg-[#252526]' : 'bg-gray-50 border border-gray-200';
  const bgSelected = isDark ? 'bg-[#094771]' : 'bg-blue-100';
  const border = isDark ? 'border-[#3c3c3c]' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-500';
  const bgTerminal = isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100';

  return (
    <div className={`h-full flex flex-col ${bgPrimary} ${textPrimary}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${bgSecondary} border-b ${border}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🔗</span>
          <span className="font-medium text-sm">Remote Development</span>
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
        {/* ── Connections Tab ── */}
        {activeTab === 'connections' && (
          <div className="flex-1 flex flex-col">
            {/* Workspace Detection Banner */}
            {(detection.hasDockerfile || detection.hasDockerCompose || detection.hasDevContainer) && (
              <div className={`px-3 py-2 border-b ${border} ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <div className="text-xs font-medium text-blue-400 mb-1">Workspace Detected</div>
                <div className={`text-xs ${textMuted} space-y-0.5`}>
                  {detection.dockerfiles.map(f => <div key={f}>🐳 {f}</div>)}
                  {detection.composeFiles.map(f => <div key={f}>📦 {f}</div>)}
                  {detection.hasDevContainer && <div>📂 .devcontainer config found</div>}
                </div>
              </div>
            )}

            {/* Add Connection */}
            <div className={`p-2 border-b ${border} ${bgSecondary}`}>
              <button
                onClick={() => setShowNewConn(!showNewConn)}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
              >
                + New Connection
              </button>
            </div>

            {/* New Connection Form */}
            {showNewConn && (
              <div className={`p-3 border-b ${border} ${bgSecondary} space-y-2`}>
                <div className="flex gap-2">
                  <select
                    value={newConnType}
                    onChange={(e) => setNewConnType(e.target.value as any)}
                    className={`flex-1 ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`}
                  >
                    <option value="ssh">SSH</option>
                    <option value="wsl">WSL</option>
                  </select>
                </div>
                <input
                  value={newConnName}
                  onChange={(e) => setNewConnName(e.target.value)}
                  placeholder="Connection name"
                  className={`w-full ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`}
                />
                <input
                  value={newConnHost}
                  onChange={(e) => setNewConnHost(e.target.value)}
                  placeholder={newConnType === 'ssh' ? 'Host (e.g. example.com)' : 'Distribution (e.g. Ubuntu-22.04)'}
                  className={`w-full ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`}
                />
                {newConnType === 'ssh' && (
                  <div className="flex gap-2">
                    <input
                      value={newConnPort}
                      onChange={(e) => setNewConnPort(e.target.value)}
                      placeholder="Port"
                      className={`w-20 ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`}
                    />
                    <input
                      value={newConnUser}
                      onChange={(e) => setNewConnUser(e.target.value)}
                      placeholder="Username"
                      className={`flex-1 ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleAddConnection} className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs">
                    Add
                  </button>
                  <button onClick={() => setShowNewConn(false)} className={`px-3 py-1.5 ${isDark ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c]' : 'bg-gray-200 hover:bg-gray-300'} rounded text-xs`}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Connections List */}
            {connections.length > 0 ? (
              <div className={`divide-y ${isDark ? 'divide-[#3c3c3c]' : 'divide-gray-200'}`}>
                {connections.map(conn => (
                  <div key={conn.id} className={`px-3 py-2 ${bgHover}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusDot(conn.status)}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${textPrimary} truncate`}>{conn.name}</div>
                        <div className={`text-xs ${textMuted}`}>
                          {conn.type.toUpperCase()} • {conn.status}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {conn.status === 'disconnected' ? (
                          <button onClick={() => handleConnect(conn.id)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs">
                            Connect
                          </button>
                        ) : conn.status === 'connected' ? (
                          <button onClick={() => handleDisconnect(conn.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs">
                            Disconnect
                          </button>
                        ) : (
                          <span className="text-xs text-yellow-400 animate-pulse">Connecting...</span>
                        )}
                        <button
                          onClick={() => handleDeleteConnection(conn.id)}
                          className={`px-1.5 py-1 ${isDark ? 'hover:bg-[#3c3c3c]' : 'hover:bg-gray-200'} rounded text-xs ${textMuted}`}
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    {conn.stats && (
                      <div className={`mt-1 flex gap-3 text-[10px] ${textMuted}`}>
                        <span>Latency: {conn.stats.latency}ms</span>
                        <span>↓{formatBytes(conn.stats.bytesIn)} ↑{formatBytes(conn.stats.bytesOut)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-6 text-center ${textMuted}`}>
                <div className="text-3xl mb-3">🔗</div>
                <div className="text-sm font-medium mb-1">No Remote Connections</div>
                <div className="text-xs">Click "New Connection" to add an SSH or WSL connection.</div>
              </div>
            )}
          </div>
        )}

        {/* ── Docker Tab ── */}
        {activeTab === 'docker' && (
          <div className="flex flex-col h-full">
            {/* Docker Sub-tabs */}
            <div className={`flex border-b ${border} ${bgSecondary}`}>
              {(['containers', 'images', 'volumes'] as DockerSubTab[]).map(st => (
                <button
                  key={st}
                  onClick={() => setDockerSubTab(st)}
                  className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${
                    dockerSubTab === st
                      ? `${textPrimary} border-b-2 border-blue-500`
                      : `${textSecondary} ${bgHover}`
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Containers */}
            {dockerSubTab === 'containers' && (
              <div className="flex-1 overflow-auto">
                {containers.length > 0 ? (
                  containers.map(container => (
                    <div key={container.id} className={`px-3 py-2 border-b ${border} ${bgHover}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusDot(container.status)}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${textPrimary} truncate`}>{container.name}</div>
                          <div className={`text-xs ${textMuted}`}>{container.image}</div>
                        </div>
                        <div className="flex gap-1">
                          {container.status === 'running' ? (
                            <>
                              <button onClick={() => handleStopContainer(container.id)} className={`p-1 hover:bg-red-600/30 rounded`} title="Stop">⏹</button>
                              <button onClick={() => handleViewLogs(container.id)} className={`p-1 ${isDark ? 'hover:bg-[#3c3c3c]' : 'hover:bg-gray-200'} rounded`} title="Logs">📋</button>
                            </>
                          ) : (
                            <button onClick={() => handleStartContainer(container.id)} className="p-1 hover:bg-green-600/30 rounded" title="Start">▶</button>
                          )}
                        </div>
                      </div>
                      {container.stats && (
                        <div className={`mt-1 flex gap-4 text-[10px] ${textMuted}`}>
                          <span>CPU: {container.stats.cpuPercent.toFixed(1)}%</span>
                          <span>MEM: {formatBytes(container.stats.memoryUsage)}</span>
                          <span>NET: ↓{formatBytes(container.stats.networkRx)} ↑{formatBytes(container.stats.networkTx)}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={`p-6 text-center ${textMuted}`}>
                    <div className="text-3xl mb-3">🐳</div>
                    <div className="text-sm font-medium mb-1">No Containers</div>
                    <div className="text-xs">
                      {detection.hasDockerfile
                        ? 'Dockerfile detected in workspace. Connect to Docker daemon to manage containers.'
                        : 'No Docker configuration detected in workspace.'}
                    </div>
                  </div>
                )}

                {/* Container Logs */}
                {selectedContainerId && containerLogs.length > 0 && (
                  <div className={`h-32 border-t ${border} ${bgTerminal}`}>
                    <div className={`px-2 py-1 text-xs ${textSecondary} border-b ${border} flex justify-between`}>
                      <span>Logs</span>
                      <button onClick={() => { setSelectedContainerId(null); setContainerLogs([]); }} className={`${textMuted} hover:${textPrimary}`}>✕</button>
                    </div>
                    <div className={`p-2 overflow-auto h-24 font-mono text-[10px] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {containerLogs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Images */}
            {dockerSubTab === 'images' && (
              <div className="flex-1 overflow-auto">
                {images.length > 0 ? (
                  images.map(image => (
                    <div key={image.id} className={`px-3 py-2 border-b ${border} ${bgHover}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-sm ${textPrimary}`}>{image.repository}:{image.tag}</div>
                          <div className={`text-xs ${textMuted}`}>{image.id.slice(0, 20)}...</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs ${textSecondary}`}>{formatBytes(image.size)}</div>
                          <div className={`text-[10px] ${textMuted}`}>{image.layers} layers</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`p-6 text-center ${textMuted}`}>
                    <div className="text-3xl mb-3">📦</div>
                    <div className="text-sm font-medium mb-1">No Images</div>
                    <div className="text-xs">Connect to Docker daemon to view available images.</div>
                  </div>
                )}
              </div>
            )}

            {/* Volumes */}
            {dockerSubTab === 'volumes' && (
              <div className="flex-1 overflow-auto">
                {volumes.length > 0 ? (
                  volumes.map(volume => (
                    <div key={volume.name} className={`px-3 py-2 border-b ${border} ${bgHover}`}>
                      <div className={`text-sm ${textPrimary}`}>{volume.name}</div>
                      <div className={`text-xs ${textMuted}`}>{volume.mountpoint}</div>
                      {volume.size && <div className={`text-xs ${textSecondary}`}>{formatBytes(volume.size)}</div>}
                    </div>
                  ))
                ) : (
                  <div className={`p-6 text-center ${textMuted}`}>
                    <div className="text-3xl mb-3">💾</div>
                    <div className="text-sm font-medium mb-1">No Volumes</div>
                    <div className="text-xs">Connect to Docker daemon to view volumes.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Notebooks Tab ── */}
        {activeTab === 'notebooks' && (
          <div className="flex-1 flex flex-col">
            <div className={`p-2 border-b ${border} ${bgSecondary}`}>
              <button
                onClick={handleCreateNotebook}
                className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium"
              >
                + New Notebook
              </button>
            </div>

            {selectedNotebook ? (
              <div className="flex-1 overflow-auto">
                <div className={`p-2 border-b ${border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedNotebook(null)} className={`${textSecondary} hover:${textPrimary}`}>←</button>
                    <span className={`text-sm ${textPrimary}`}>{selectedNotebook.name}</span>
                  </div>
                  <span className="text-xs text-green-400">● {selectedNotebook.language}</span>
                </div>
                <div className="p-2 space-y-2">
                  {selectedNotebook.cells.map(cell => (
                    <div key={cell.id} className={`${bgCard} rounded overflow-hidden`}>
                      <div className={`flex items-center justify-between px-2 py-1 ${isDark ? 'bg-[#2d2d2d]' : 'bg-gray-100'} text-[10px]`}>
                        <span className={cell.type === 'code' ? 'text-blue-400' : 'text-green-400'}>
                          [{cell.type === 'code' ? cell.executionCount || ' ' : 'md'}]
                        </span>
                        {cell.type === 'code' && (
                          <button
                            onClick={() => handleExecuteCell(selectedNotebook.id, cell.id)}
                            disabled={cell.executionState === 'running'}
                            className="px-2 py-0.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded"
                          >
                            {cell.executionState === 'running' ? '⏳' : '▶'} Run
                          </button>
                        )}
                      </div>
                      <div className="p-2">
                        <pre className={`text-xs font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap`}>
                          {cell.source || '# Empty cell'}
                        </pre>
                      </div>
                      {cell.outputs.length > 0 && (
                        <div className={`border-t ${border} p-2 ${bgTerminal}`}>
                          {cell.outputs.map((output, i) => (
                            <div key={i} className="text-xs">
                              {output.type === 'stream' && (
                                <pre className={isDark ? 'text-gray-300' : 'text-gray-700'}>{output.text}</pre>
                              )}
                              {output.type === 'error' && (
                                <pre className="text-red-400">{output.traceback?.join('\n')}</pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                {notebooks.length > 0 ? (
                  <div className={`divide-y ${isDark ? 'divide-[#3c3c3c]' : 'divide-gray-200'}`}>
                    {notebooks.map(notebook => (
                      <div
                        key={notebook.id}
                        onClick={() => setSelectedNotebook(notebook)}
                        className={`px-3 py-2 cursor-pointer ${bgHover}`}
                      >
                        <div className="flex items-center gap-2">
                          <span>📓</span>
                          <div className="flex-1">
                            <div className={`text-sm ${textPrimary}`}>{notebook.name}</div>
                            <div className={`text-xs ${textMuted}`}>{notebook.cells.length} cells • {notebook.language}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`p-6 text-center ${textMuted}`}>
                    <div className="text-3xl mb-3">📓</div>
                    <div className="text-sm font-medium mb-1">No Notebooks</div>
                    <div className="text-xs">Click "New Notebook" to create an interactive notebook.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Database Tab ── */}
        {activeTab === 'database' && (
          <div className="flex-1 flex flex-col">
            <div className={`p-2 border-b ${border} ${bgSecondary}`}>
              <button
                onClick={() => setShowNewDb(!showNewDb)}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
              >
                + New Database Connection
              </button>
            </div>

            {/* New DB Form */}
            {showNewDb && (
              <div className={`p-3 border-b ${border} ${bgSecondary} space-y-2`}>
                <select
                  value={newDbType}
                  onChange={(e) => {
                    const t = e.target.value as any;
                    setNewDbType(t);
                    const ports: Record<string, string> = { postgresql: '5432', mysql: '3306', sqlite: '0', mongodb: '27017', redis: '6379' };
                    setNewDbPort(ports[t] || '5432');
                  }}
                  className={`w-full ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`}
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                  <option value="mongodb">MongoDB</option>
                  <option value="redis">Redis</option>
                </select>
                <input value={newDbName} onChange={(e) => setNewDbName(e.target.value)} placeholder="Connection name" className={`w-full ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`} />
                <div className="flex gap-2">
                  <input value={newDbHost} onChange={(e) => setNewDbHost(e.target.value)} placeholder="Host" className={`flex-1 ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`} />
                  <input value={newDbPort} onChange={(e) => setNewDbPort(e.target.value)} placeholder="Port" className={`w-16 ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`} />
                </div>
                <input value={newDbDatabase} onChange={(e) => setNewDbDatabase(e.target.value)} placeholder="Database name" className={`w-full ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`} />
                <input value={newDbUser} onChange={(e) => setNewDbUser(e.target.value)} placeholder="Username" className={`w-full ${bgInput} ${textPrimary} text-xs px-2 py-1.5 rounded`} />
                <div className="flex gap-2">
                  <button onClick={handleAddDb} className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs">Add</button>
                  <button onClick={() => setShowNewDb(false)} className={`px-3 py-1.5 ${isDark ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c]' : 'bg-gray-200 hover:bg-gray-300'} rounded text-xs`}>Cancel</button>
                </div>
              </div>
            )}

            {/* Prisma Detection */}
            {detection.hasPrismaSchema && (
              <div className={`px-3 py-2 border-b ${border} ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                <div className="text-xs text-purple-400 flex items-center gap-1">
                  <span>🔮</span> Prisma schema detected in workspace
                </div>
              </div>
            )}

            {/* DB Connections List */}
            {dbConnections.length > 0 ? (
              <div className={`flex-none max-h-40 overflow-auto border-b ${border}`}>
                {dbConnections.map(db => (
                  <div
                    key={db.id}
                    onClick={() => setSelectedDb(db)}
                    className={`px-3 py-2 cursor-pointer ${bgHover} ${selectedDb?.id === db.id ? bgSelected : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusDot(db.status)}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${textPrimary} truncate`}>{db.name}</div>
                        <div className={`text-xs ${textMuted}`}>{db.type} • {db.host}:{db.port}</div>
                      </div>
                      {db.status === 'disconnected' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConnectDb(db.id); }}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                        >
                          Connect
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); remoteDevelopmentService.deleteDatabaseConnection(db.id); if (selectedDb?.id === db.id) setSelectedDb(null); }}
                        className={`px-1.5 py-1 ${isDark ? 'hover:bg-[#3c3c3c]' : 'hover:bg-gray-200'} rounded text-xs ${textMuted}`}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showNewDb ? (
              <div className={`p-6 text-center ${textMuted}`}>
                <div className="text-3xl mb-3">🗄️</div>
                <div className="text-sm font-medium mb-1">No Database Connections</div>
                <div className="text-xs">Click "New Database Connection" to get started.</div>
              </div>
            ) : null}

            {/* Database Explorer */}
            {selectedDb?.status === 'connected' && selectedDb.tables && selectedDb.tables.length > 0 && (
              <div className={`flex-none max-h-40 overflow-auto border-b ${border} ${bgSecondary}`}>
                <div className={`px-2 py-1 text-xs ${textSecondary} sticky top-0 ${bgSecondary}`}>Tables</div>
                {selectedDb.tables.map(table => (
                  <details key={table.name} className="group">
                    <summary className={`px-3 py-1 cursor-pointer ${bgHover} text-sm ${textPrimary} flex items-center gap-2`}>
                      <span className={`${textMuted} group-open:rotate-90 transition-transform`}>▶</span>
                      🗃️ {table.name}
                      <span className={`text-xs ${textMuted} ml-auto`}>{table.rowCount} rows</span>
                    </summary>
                    <div className="pl-6 py-1 space-y-0.5">
                      {table.columns.map(col => (
                        <div key={col.name} className={`px-2 py-0.5 text-xs flex items-center gap-2`}>
                          <span className={col.isPrimaryKey ? 'text-yellow-400' : col.isForeignKey ? 'text-blue-400' : textMuted}>
                            {col.isPrimaryKey ? '🔑' : col.isForeignKey ? '🔗' : '○'}
                          </span>
                          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{col.name}</span>
                          <span className={textMuted}>{col.type}</span>
                          {col.nullable && <span className={textMuted}>null</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}

            {/* Query Editor */}
            {selectedDb && selectedDb.status === 'connected' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className={`p-2 border-b ${border} flex items-center justify-between ${bgSecondary}`}>
                  <span className={`text-xs ${textSecondary}`}>Query Editor</span>
                  <button
                    onClick={handleExecuteQuery}
                    disabled={isExecutingQuery || !queryText.trim()}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs flex items-center gap-1"
                  >
                    {isExecutingQuery ? '⏳' : '▶'} Execute
                  </button>
                </div>
                <textarea
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  className={`flex-none h-20 w-full ${bgPrimary} ${textPrimary} text-xs font-mono p-2 resize-none border-b ${border} focus:outline-none`}
                  placeholder="Enter SQL query..."
                />

                {/* Query Results */}
                {queryResult && (
                  <div className="flex-1 overflow-auto">
                    {queryResult.error ? (
                      <div className="p-3 text-xs text-orange-400">{queryResult.error}</div>
                    ) : (
                      <>
                        <div className={`px-2 py-1 text-xs ${textMuted} border-b ${border} sticky top-0 ${bgSecondary}`}>
                          {queryResult.rowCount} rows • {queryResult.executionTime}ms
                        </div>
                        {queryResult.rows.length > 0 && (
                          <div className="overflow-auto">
                            <table className="w-full text-xs">
                              <thead className={`${bgSecondary} sticky top-0`}>
                                <tr>
                                  {queryResult.columns.map(col => (
                                    <th key={col} className={`px-2 py-1 text-left ${textSecondary} border-b ${border}`}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.rows.map((row, i) => (
                                  <tr key={i} className={bgHover}>
                                    {row.map((cell, j) => (
                                      <td key={j} className={`px-2 py-1 ${isDark ? 'text-gray-300' : 'text-gray-700'} border-b ${border}`}>{String(cell)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-3 py-1 ${bgSecondary} border-t ${border} text-xs ${textMuted}`}>
        <div className="flex items-center gap-3">
          <span>🔗 {connections.filter(c => c.status === 'connected').length} connected</span>
          <span>🐳 {containers.filter(c => c.status === 'running').length} running</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🗄 {dbConnections.filter(d => d.status === 'connected').length} DB</span>
        </div>
      </div>
    </div>
  );
};

export default RemoteDevelopmentPanel;
